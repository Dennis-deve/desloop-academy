import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Database, Transaction } from './db.js';
import type { PilotConfig } from './config.js';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const hexHash = (value: string) => createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
export const cookieNames = (config: PilotConfig) =>
  config.cookieSecure
    ? { session: '__Host-desloop_pilot_sid', csrf: '__Host-desloop_pilot_csrf' }
    : { session: 'desloop_pilot_sid', csrf: 'desloop_pilot_csrf' };
const SESSION_SECONDS = 12 * 60 * 60;

export interface PilotUser {
  id: string;
  email: string;
  displayName: string;
  role: 'learner' | 'reviewer';
}
export interface Authenticated {
  user: PilotUser;
  sessionHash: string;
}

export async function issueSession(
  client: Transaction,
  reply: FastifyReply,
  config: PilotConfig,
  user: PilotUser,
) {
  const session = randomToken();
  const csrf = randomToken();
  await client.query(
    "INSERT INTO pilot.sessions(token_hash,csrf_hash,user_id,expires_at) VALUES($1,$2,$3,now() + interval '12 hours')",
    [hexHash(session), hexHash(csrf), user.id],
  );
  const names = cookieNames(config);
  const options = {
    path: '/',
    secure: config.cookieSecure,
    sameSite: 'strict' as const,
    maxAge: SESSION_SECONDS,
  };
  reply.setCookie(names.session, session, { ...options, httpOnly: true });
  reply.setCookie(names.csrf, csrf, { ...options, httpOnly: false });
}
export function clearSessionCookies(reply: FastifyReply, config: PilotConfig) {
  for (const name of Object.values(cookieNames(config)))
    reply.clearCookie(name, { path: '/', secure: config.cookieSecure, sameSite: 'strict' });
}

export async function requireUser(
  request: FastifyRequest,
  db: Database,
  config: PilotConfig,
  role?: PilotUser['role'],
): Promise<Authenticated> {
  const token = request.cookies[cookieNames(config).session];
  if (!token || token.length > 128)
    throw new ApiError(401, 'AUTH_REQUIRED', 'Sign in to the private pilot.');
  const hash = hexHash(token);
  const found = await db.query<{
    id: string;
    email: string;
    display_name: string;
    role: PilotUser['role'];
    csrf_hash: string;
  }>(
    `SELECT u.id,u.email,u.display_name,u.role,s.csrf_hash FROM pilot.sessions s
     JOIN pilot.users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status='active'`,
    [hash],
  );
  const row = found.rows[0];
  if (!row) throw new ApiError(401, 'AUTH_REQUIRED', 'Your session has ended. Sign in again.');
  if (role && row.role !== role)
    throw new ApiError(403, 'ROLE_DENIED', 'Your pilot account does not have this role.');
  return {
    user: { id: row.id, email: row.email, displayName: row.display_name, role: row.role },
    sessionHash: hash,
  };
}

export async function requireMutation(
  request: FastifyRequest,
  db: Database,
  config: PilotConfig,
  role?: PilotUser['role'],
) {
  if (request.headers.origin !== config.appOrigin)
    throw new ApiError(
      403,
      'BAD_ORIGIN',
      'This request must come from the configured application origin.',
    );
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json'))
    throw new ApiError(415, 'JSON_REQUIRED', 'Use a JSON request.');
  const auth = await requireUser(request, db, config, role);
  const names = cookieNames(config);
  const token = request.headers['x-csrf-token'];
  if (typeof token !== 'string' || !token || token !== request.cookies[names.csrf])
    throw new ApiError(403, 'CSRF_DENIED', 'Refresh the pilot page and try again.');
  const row = await db.query<{ csrf_hash: string }>(
    'SELECT csrf_hash FROM pilot.sessions WHERE token_hash=$1',
    [auth.sessionHash],
  );
  const expected = Buffer.from(row.rows[0]?.csrf_hash ?? '', 'hex');
  const received = Buffer.from(hexHash(token), 'hex');
  if (expected.length !== received.length || !timingSafeEqual(expected, received))
    throw new ApiError(403, 'CSRF_DENIED', 'Refresh the pilot page and try again.');
  return auth;
}

/** Auth endpoints have no session yet; Origin, JSON and same-site cookies still apply. */
export function requireAuthOrigin(request: FastifyRequest, config: PilotConfig) {
  if (request.headers.origin !== config.appOrigin)
    throw new ApiError(403, 'BAD_ORIGIN', 'Use the configured app to sign in.');
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json'))
    throw new ApiError(415, 'JSON_REQUIRED', 'Use a JSON request.');
}

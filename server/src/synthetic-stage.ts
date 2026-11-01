import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PilotConfig } from './config.js';

/** Only the health probe is public on an enabled synthetic-stage API. */
export function isSyntheticStageProtectedPath(rawUrl: string): boolean {
  let path: string;
  try {
    path = new URL(rawUrl, 'http://internal.invalid').pathname;
    // Conservative boundary: an encoded path is never considered public.
    // It may be normalized again by the edge/router, including double encoding.
    if (path.includes('%') || path.includes('\\')) return true;
  } catch {
    return true;
  }
  if (path === '/api/health') return false;
  return /^\/(?:api|pilot)(?:\/|$)/.test(path);
}

function validAccessCredential(request: FastifyRequest, secret: string): boolean {
  const header = request.headers.authorization;
  if (!header || header.length > 256 || !/^Basic [A-Za-z0-9+/]+={0,2}$/.test(header)) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const separator = decoded.indexOf(':');
  if (separator < 0 || decoded.slice(0, separator) !== 'desloop-review') return false;
  const supplied = decoded.slice(separator + 1);
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  const candidate = createHash('sha256').update(supplied).digest();
  const expected = createHash('sha256').update(secret).digest();
  return timingSafeEqual(candidate, expected);
}

/**
 * Temporary synthetic-only outer gate, separate from the real adult session.
 * This does not turn Render's public web service into a private network. Its
 * 256-bit credential belongs only in an operator password manager / Render env.
 */
export function registerSyntheticStageGate(app: FastifyInstance, config: PilotConfig): void {
  if (!config.syntheticStageGateEnabled) return;
  const secret = config.syntheticStageGateSecret;
  if (!secret) throw new Error('Synthetic stage access key is required');
  const host = new URL(config.appOrigin).host;
  app.addHook('onRequest', async (request, reply) => {
    if (!isSyntheticStageProtectedPath(request.url)) return;
    reply.header('Cache-Control', 'no-store');
    // Never grant access to an alternate Host/origin, even if the Basic secret is known.
    if (request.headers.host !== host) {
      reply.code(421).send({ error: 'WRONG_HOST', message: 'This private route is unavailable on that host.' });
      return;
    }
    if (validAccessCredential(request, secret)) return;
    reply.header('WWW-Authenticate', 'Basic realm="Desloop synthetic adult review", charset="UTF-8"');
    reply.code(401).send({ error: 'STAGE_ACCESS_REQUIRED', message: 'Operator access is required before the adult pilot.' });
  });
}

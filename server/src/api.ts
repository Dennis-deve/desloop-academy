import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Fastify, { type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { hash, verify } from '@node-rs/argon2';
import { z, type ZodType } from 'zod';
import type { PilotConfig } from './config.js';
import type { Database } from './db.js';
import { appendAudit, inTransaction, verifyRelease } from './db.js';
import { loadCatalog, type PilotCatalog } from './catalog.js';
import { PilotProgression } from './progression.js';
import { loadEngineCatalog } from './engine/catalog.js';
import { verifyEngineRelease } from './engine/migrate.js';
import { LearningEngine } from './engine/service.js';
import { SandboxService } from './engine/sandbox.js';
import { verifyGuardianHold } from './guardian/readiness.js';
import { isAvailableClientPath } from './public-routes.js';
import { registerAIRoutes } from './ai/routes.js';
import type { AIProviders } from './ai/gateway.js';
import {
  ApiError,
  clearSessionCookies,
  hexHash,
  issueSession,
  requireAuthOrigin,
  requireMutation,
  requireUser,
  type PilotUser,
} from './security.js';

const passwordOptions = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 };
const email = z
  .string()
  .email()
  .max(254)
  .transform((value) => value.trim().toLowerCase());
const registration = z
  .object({
    invitation: z.string().min(32).max(128),
    name: z.string().trim().min(2).max(120),
    password: z.string().min(12).max(128),
    adultAttested: z.literal(true),
  })
  .strict();
const login = z.object({ email, password: z.string().min(1).max(128) }).strict();
const uuid = z.string().uuid();
const lesson = z
  .object({
    practice: z.string().trim().min(15).max(5000),
    answerIndex: z.number().int().min(0).max(5),
    responseMode: z.enum(['typed', 'dictated-or-described']),
    requestId: uuid,
  })
  .strict();
const quiz = z
  .object({ answers: z.array(z.number().int().min(0).max(5)).length(5), requestId: uuid })
  .strict();
const project = z
  .object({
    artefact: z.string().trim().min(40).max(5000),
    reflection: z.string().trim().min(20).max(5000),
    responseMode: z.enum(['typed', 'dictated-or-described']),
    safetyAttested: z.literal(true),
    requestId: uuid,
  })
  .strict();
const review = z
  .object({
    decision: z.enum(['approved', 'revision_requested']),
    rubric: z.record(z.number().int().min(0).max(100)),
    safetyApproved: z.boolean(),
    feedback: z.string().trim().min(10).max(3000),
  })
  .strict();
const v2Lesson = z
  .object({
    practice: z.string().trim().min(15).max(5000),
    answerIndex: z.number().int().min(0).max(5),
    requestId: uuid,
  })
  .strict();
const v2Review = review.extend({ requestId: uuid }).strict();
const v2Project = z
  .object({
    artefact: z.string().trim().min(40).max(5000),
    reflection: z.string().trim().min(20).max(5000),
    safetyAttested: z.literal(true),
    requestId: uuid,
  })
  .strict();
const sandboxCreate = z
  .object({
    scope: z.enum(['GUIDED', 'PLAYGROUND']),
    title: z.string().trim().min(1).max(120),
    courseId: z
      .string()
      .regex(/^course-\d{2}$/)
      .optional(),
    lessonId: z
      .string()
      .regex(/^c\d{2}-l\d+$/)
      .optional(),
    requestId: uuid,
  })
  .strict();
const sandboxRevision = z.object({ document: z.record(z.unknown()), requestId: uuid }).strict();
const sandboxRun = z
  .object({ revisionNo: z.number().int().min(1).max(100), requestId: uuid })
  .strict();
const idParams = z.object({ courseId: z.string().regex(/^course-\d{2}$/) });
function parse<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new ApiError(
      422,
      'INVALID_INPUT',
      parsed.error.issues
        .map((issue) => issue.path.join('.') || 'request')
        .slice(0, 4)
        .join(', ') + ' is invalid.',
    );
  return parsed.data;
}

export async function buildApi(
  config: PilotConfig,
  db?: Database,
  catalog: PilotCatalog = loadCatalog(),
  logRequests = false,
  aiOptions: { providers?: AIProviders; cacheSecret?: string } = {},
) {
  const app = Fastify({
    logger: !logRequests
      ? false
      : {
          redact: [
            'req.headers.cookie',
            'req.headers.authorization',
            'req.body.password',
            'req.body.invitation',
            'req.body.input', // Private synthetic AI requests must not enter application logs.
            'req.body.decisionReference',
            'res.headers.set-cookie',
          ],
        },
    bodyLimit: 32 * 1024,
    trustProxy: false, // Do not trust arbitrary forwarded IPs. Configure a verified Railway proxy boundary before scaling rate limits.
  });
  await app.register(cookie);
  await app.register(helmet, {
    contentSecurityPolicy: config.isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
            fontSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
          },
        }
      : false,
  });
  await app.register(rateLimit, { global: false });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError)
      return reply.code(error.statusCode).send({ error: error.code, message: error.message });
    request.log.error({ err: error }, 'pilot request failed');
    const possibleStatus = (error as { statusCode?: unknown }).statusCode;
    const status =
      typeof possibleStatus === 'number' && possibleStatus >= 400 && possibleStatus < 500
        ? possibleStatus
        : 500;
    return reply.code(status).send({
      error: status === 500 ? 'SERVER_ERROR' : status === 429 ? 'RATE_LIMITED' : 'BAD_REQUEST',
      message:
        status === 500
          ? 'The pilot service could not complete this request.'
          : status === 429
            ? 'Too many requests. Please wait before trying again.'
            : 'Check this request and try again.',
    });
  });

  app.get('/api/health', async () => {
    if (config.enabled && db) await db.query('SELECT 1');
    return { ok: true, mode: config.enabled ? 'adult-internal-pilot' : 'inactive' };
  });
  app.get('/api/pilot/status', async () => ({
    enabled: config.enabled,
    engineV2Enabled: config.engineV2Enabled,
    audience: 'invited adults and internal reviewers only',
    curriculum: 'unreviewed internal draft; no official credit',
    contentVersion: catalog.version,
  }));
  if (config.enabled) {
    if (!db) throw new Error('An enabled pilot requires a database');
    await verifyRelease(db, catalog); // Fail startup closed if the draft file changes without a new version/migration.
    const progression = new PilotProgression(db, catalog);
    const dummyHash = await hash('unused dummy password; never an account', passwordOptions);

    app.post(
      '/api/pilot/auth/register',
      {
        config: {
          rateLimit: { max: config.localE2eAuthLimit ? 100 : 5, timeWindow: '15 minutes' },
        },
      },
      async (request, reply) => {
        requireAuthOrigin(request, config);
        const body = parse(registration, request.body);
        const tokenHash = hexHash(body.invitation);
        const user = await inTransaction(db, async (client) => {
          const invite = await client.query<{ id: string; email: string; role: PilotUser['role'] }>(
            `
          SELECT id,email,role FROM pilot.invitations WHERE token_hash=$1 AND used_at IS NULL AND expires_at > now() FOR UPDATE`,
            [tokenHash],
          );
          const row = invite.rows[0];
          if (!row)
            throw new ApiError(
              403,
              'INVITATION_INVALID',
              'This invitation is unavailable or expired. Request a new one from the pilot operator.',
            );
          const encrypted = await hash(body.password, passwordOptions);
          let created;
          try {
            created = await client.query<{ id: string }>(
              `
            INSERT INTO pilot.users(email,display_name,password_hash,role,adult_attested_at)
            VALUES($1,$2,$3,$4,now()) RETURNING id`,
              [row.email, body.name, encrypted, row.role],
            );
          } catch (error) {
            if ((error as { code?: string }).code === '23505')
              throw new ApiError(
                409,
                'INVITATION_USED',
                'An account already exists for this invitation.',
              );
            throw error;
          }
          const account: PilotUser = {
            id: created.rows[0].id,
            email: row.email,
            displayName: body.name,
            role: row.role,
          };
          await client.query('UPDATE pilot.invitations SET used_at=now() WHERE id=$1', [row.id]);
          await issueSession(client, reply, config, account);
          await appendAudit(client, account.id, 'pilot.account.registered', account.id, {
            role: account.role,
          });
          return account;
        });
        return reply.code(201).send({ user, audience: 'adult-internal-pilot' });
      },
    );
    app.post(
      '/api/pilot/auth/login',
      {
        config: {
          rateLimit: { max: config.localE2eAuthLimit ? 100 : 8, timeWindow: '15 minutes' },
        },
      },
      async (request, reply) => {
        requireAuthOrigin(request, config);
        const body = parse(login, request.body);
        const result = await db.query<{
          id: string;
          email: string;
          display_name: string;
          role: PilotUser['role'];
          password_hash: string;
          status: string;
        }>(
          'SELECT id,email,display_name,role,password_hash,status FROM pilot.users WHERE email=$1',
          [body.email],
        );
        const row = result.rows[0];
        const valid = await verify(row?.password_hash ?? dummyHash, body.password).catch(
          () => false,
        );
        if (!row || row.status !== 'active' || !valid)
          throw new ApiError(401, 'SIGN_IN_FAILED', 'Email or password was not recognised.');
        const user: PilotUser = {
          id: row.id,
          email: row.email,
          displayName: row.display_name,
          role: row.role,
        };
        await inTransaction(db, async (client) => {
          await issueSession(client, reply, config, user);
          await appendAudit(client, user.id, 'pilot.session.started', user.id);
        });
        return { user, audience: 'adult-internal-pilot' };
      },
    );
    app.get('/api/pilot/me', async (request) => {
      const auth = await requireUser(request, db, config);
      return { user: auth.user, audience: 'adult-internal-pilot' };
    });
    app.post('/api/pilot/auth/logout', async (request, reply) => {
      const auth = await requireMutation(request, db, config);
      await inTransaction(db, async (client) => {
        await client.query('UPDATE pilot.sessions SET revoked_at=now() WHERE token_hash=$1', [
          auth.sessionHash,
        ]);
        await appendAudit(client, auth.user.id, 'pilot.session.ended', auth.user.id);
      });
      clearSessionCookies(reply, config);
      return { signedOut: true };
    });
    app.get('/api/pilot/pathway', async (request) => {
      const auth = await requireUser(request, db, config, 'learner');
      return progression.pathway(auth.user.id);
    });
    app.get('/api/pilot/courses/:courseId', async (request) => {
      const auth = await requireUser(request, db, config, 'learner');
      const { courseId } = parse(idParams, request.params);
      return progression.courseDetail(auth.user.id, courseId);
    });
    app.post('/api/pilot/courses/:courseId/lessons/:lessonId', async (request) => {
      const auth = await requireMutation(request, db, config, 'learner');
      const { courseId } = parse(idParams, request.params);
      const { lessonId } = parse(
        z.object({ lessonId: z.string().regex(/^c\d{2}-l\d+$/) }),
        request.params,
      );
      return progression.lesson(auth.user.id, courseId, lessonId, parse(lesson, request.body));
    });
    app.post('/api/pilot/courses/:courseId/quiz', async (request) => {
      const auth = await requireMutation(request, db, config, 'learner');
      const { courseId } = parse(idParams, request.params);
      return progression.quiz(auth.user.id, courseId, parse(quiz, request.body));
    });
    app.post('/api/pilot/courses/:courseId/project', async (request, reply) => {
      const auth = await requireMutation(request, db, config, 'learner');
      const { courseId } = parse(idParams, request.params);
      return reply
        .code(201)
        .send(await progression.submit(auth.user.id, courseId, parse(project, request.body)));
    });
    app.get('/api/pilot/reviews', async (request) => {
      const auth = await requireUser(request, db, config, 'reviewer');
      return { queue: await progression.reviews(auth.user.id) };
    });
    app.post('/api/pilot/reviews/:submissionId', async (request) => {
      const auth = await requireMutation(request, db, config, 'reviewer');
      const { submissionId } = parse(z.object({ submissionId: uuid }), request.params);
      return progression.review(auth.user.id, submissionId, parse(review, request.body));
    });
    if (config.engineV2Enabled) {
      await verifyGuardianHold(db); // A missing/altered safeguarding hold blocks the adult engine.
      const engineCatalog = loadEngineCatalog();
      const releaseId = await verifyEngineRelease(db, engineCatalog); // Fail startup closed on drift.
      app.get('/api/pilot/guardian-readiness', async (request) => {
        await requireUser(request, db, config, 'reviewer');
        return verifyGuardianHold(db);
      });
      const engine = new LearningEngine(db, engineCatalog, releaseId);
      const studio = new SandboxService(db, engineCatalog, releaseId, engine);
      app.get('/api/pilot/engine/pathway', async (request) => {
        const auth = await requireUser(request, db, config, 'learner');
        return engine.pathway(auth.user.id);
      });
      app.get('/api/pilot/engine/courses/:courseId', async (request) => {
        const auth = await requireUser(request, db, config, 'learner');
        const { courseId } = parse(idParams, request.params);
        return engine.courseDetail(auth.user.id, courseId);
      });
      app.post('/api/pilot/engine/courses/:courseId/lessons/:lessonId', async (request) => {
        const auth = await requireMutation(request, db, config, 'learner');
        const { courseId, lessonId } = parse(
          z.object({
            courseId: idParams.shape.courseId,
            lessonId: z.string().regex(/^c\d{2}-l\d+$/),
          }),
          request.params,
        );
        return engine.lesson(auth.user.id, courseId, lessonId, parse(v2Lesson, request.body));
      });
      app.post('/api/pilot/engine/courses/:courseId/quiz', async (request) => {
        const auth = await requireMutation(request, db, config, 'learner');
        const { courseId } = parse(idParams, request.params);
        return engine.quiz(auth.user.id, courseId, parse(quiz, request.body));
      });
      app.post('/api/pilot/engine/courses/:courseId/project', async (request, reply) => {
        const auth = await requireMutation(request, db, config, 'learner');
        const { courseId } = parse(idParams, request.params);
        return reply
          .code(201)
          .send(await engine.submit(auth.user.id, courseId, parse(v2Project, request.body)));
      });
      app.get('/api/pilot/engine/reviews', async (request) => {
        const auth = await requireUser(request, db, config, 'reviewer');
        return { queue: await engine.reviewQueue(auth.user.id) };
      });
      app.post('/api/pilot/engine/reviews/:submissionId', async (request) => {
        const auth = await requireMutation(request, db, config, 'reviewer');
        const { submissionId } = parse(z.object({ submissionId: uuid }), request.params);
        return engine.review(auth.user.id, submissionId, parse(v2Review, request.body));
      });
      app.get('/api/pilot/engine/studio', async (request) => {
        const auth = await requireUser(request, db, config, 'learner');
        return studio.list(auth.user.id);
      });
      app.post('/api/pilot/engine/studio', async (request, reply) => {
        const auth = await requireMutation(request, db, config, 'learner');
        return reply
          .code(201)
          .send(await studio.create(auth.user.id, parse(sandboxCreate, request.body)));
      });
      app.get('/api/pilot/engine/studio/projects/:projectId', async (request) => {
        const auth = await requireUser(request, db, config, 'learner');
        const { projectId } = parse(z.object({ projectId: uuid }), request.params);
        return studio.project(auth.user.id, projectId);
      });
      app.post('/api/pilot/engine/studio/projects/:projectId/revisions', async (request, reply) => {
        const auth = await requireMutation(request, db, config, 'learner');
        const { projectId } = parse(z.object({ projectId: uuid }), request.params);
        return reply
          .code(201)
          .send(await studio.save(auth.user.id, projectId, parse(sandboxRevision, request.body)));
      });
      app.post('/api/pilot/engine/studio/projects/:projectId/run', async (request) => {
        const auth = await requireMutation(request, db, config, 'learner');
        const { projectId } = parse(z.object({ projectId: uuid }), request.params);
        return studio.run(auth.user.id, projectId, parse(sandboxRun, request.body));
      });
      app.get('/api/pilot/engine/studio/guided/:courseId/:lessonId/brief', async (request) => {
        const auth = await requireUser(request, db, config, 'learner');
        const { courseId, lessonId } = parse(
          z.object({
            courseId: idParams.shape.courseId,
            lessonId: z.string().regex(/^c\d{2}-l\d+$/),
          }),
          request.params,
        );
        return studio.guidedBrief(auth.user.id, courseId, lessonId);
      });
    }
  }
  if (config.aiGatewayEnabled) {
    if (!config.enabled || !db) throw new Error('AI gateway requires the private adult database');
    await registerAIRoutes(app,db,config,aiOptions);
  }

  const dir = resolve(process.cwd(), config.staticDir);
  if (existsSync(resolve(dir, 'index.html'))) {
    await app.register(fastifyStatic, { root: dir, prefix: '/', wildcard: false, index: false });
    app.setNotFoundHandler((request: FastifyRequest, reply) => {
      if (
        request.url.startsWith('/api/') ||
        request.method !== 'GET' ||
        !request.headers.accept?.includes('text/html')
      )
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'No such endpoint.' });
      // Unknown and decommissioned simulated routes still render an honest client
      // unavailable message, but must not receive a successful HTTP status.
      const privateAdminPath = config.aiGatewayEnabled && config.aiAdminUiEnabled &&
        new URL(request.url, 'http://internal.invalid').pathname === '/pilot/ai/admin';
      return reply.code(isAvailableClientPath(request.url) || privateAdminPath ? 200 : 404).type('text/html').sendFile('index.html');
    });
  }
  return app;
}

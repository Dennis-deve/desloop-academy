import type { FastifyInstance } from 'fastify';
import { z, type ZodType } from 'zod';
import type { PilotConfig } from '../config.js';
import type { Database } from '../db.js';
import { ApiError, requireMutation, requireUser } from '../security.js';
import { MAX_SOURCE_PNG_BYTES } from './contract.js';
import { verifyProjectCore } from './migrate.js';
import { ProjectCore } from './store.js';
import { verifyGuardianHold } from '../guardian/readiness.js';

const uuid = z.string().uuid();
const projectId = z.object({ projectId: uuid }).strict();
const assetId = projectId.extend({ assetId: uuid }).strict();
const revisionId = projectId.extend({ revisionNo: z.coerce.number().int().min(1).max(50) }).strict();
const create = z.object({
  title: z.string().trim().min(1).max(120),
  document: z.unknown(),
  requestId: uuid,
}).strict();
const save = z.object({
  baseRevisionNo: z.number().int().min(1).max(49),
  document: z.unknown(),
  assetIds: z.array(uuid).max(8).default([]),
  requestId: uuid,
}).strict();
const upload = z.object({
  dataBase64: z.string().min(1).max(Math.ceil(MAX_SOURCE_PNG_BYTES / 3) * 4),
  expectedSha256: z.string().regex(/^[0-9a-f]{64}$/),
  requestId: uuid,
}).strict();
const prefix = '/api/pilot/project-core/v1';

function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ApiError(
      422, 'INVALID_INPUT',
      result.error.issues.map((issue) => issue.path.join('.') || 'request').slice(0, 4).join(', ') + ' is invalid.',
    );
  return result.data;
}

/** Only called with an explicitly enabled local adult pilot and verified additive schema. */
export async function registerProjectCoreRoutes(app: FastifyInstance, db: Database, config: PilotConfig) {
  await verifyGuardianHold(db);
  await verifyProjectCore(db);
  const core = new ProjectCore(db);
  const privateReply = <T extends { header: (name: string, value: string) => T }>(reply: T) =>
    reply.header('Cache-Control', 'private, no-store');

  app.get(`${prefix}/projects`, async (request, reply) => {
    const { user } = await requireUser(request, db, config, 'learner');
    return privateReply(reply).send(await core.list(user.id));
  });
  app.post(`${prefix}/projects`, { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const { user } = await requireMutation(request, db, config, 'learner');
      const result = await core.create(user.id, parse(create, request.body));
      return privateReply(reply).code(result.repeated ? 200 : 201).send(result);
    });
  app.get(`${prefix}/projects/:projectId`, async (request, reply) => {
    const { user } = await requireUser(request, db, config, 'learner');
    const { projectId: id } = parse(projectId, request.params);
    return privateReply(reply).send(await core.get(user.id, id));
  });
  app.get(`${prefix}/projects/:projectId/revisions/:revisionNo`, async (request, reply) => {
    const { user } = await requireUser(request, db, config, 'learner');
    const { projectId: id, revisionNo } = parse(revisionId, request.params);
    return privateReply(reply).send(await core.get(user.id, id, revisionNo));
  });
  app.post(`${prefix}/projects/:projectId/revisions`,
    { config: { rateLimit: { max: 120, timeWindow: '15 minutes' } } },
    async (request, reply) => {
      const { user } = await requireMutation(request, db, config, 'learner');
      const { projectId: id } = parse(projectId, request.params);
      const result = await core.save(user.id, id, parse(save, request.body));
      return privateReply(reply).code(result.repeated ? 200 : 201).send(result);
    });
  app.post(`${prefix}/projects/:projectId/assets`,
    {
      bodyLimit: 144 * 1024,
      config: { rateLimit: { max: 25, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      const { user } = await requireMutation(request, db, config, 'learner');
      const { projectId: id } = parse(projectId, request.params);
      const result = await core.uploadPng(user.id, id, parse(upload, request.body));
      return privateReply(reply).code(result.repeated ? 200 : 201).send(result);
    });
  app.get(`${prefix}/projects/:projectId/assets/:assetId`, async (request, reply) => {
    const { user } = await requireUser(request, db, config, 'learner');
    const { projectId: id, assetId: imageId } = parse(assetId, request.params);
    const file = await core.getPng(user.id, id, imageId);
    return privateReply(reply)
      .header('Content-Disposition', 'attachment; filename="project-image.png"')
      .type('image/png')
      .send(file);
  });
}

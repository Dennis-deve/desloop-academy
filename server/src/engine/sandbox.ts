import type { PoolClient } from 'pg';
import { appendAudit, inTransaction, type Database } from '../db.js';
import { ApiError } from '../security.js';
import {
  ENGINE_POLICY_VERSION,
  GUIDED_LESSON,
  VISUAL_CRITERIA,
  VISUAL_EVALUATOR_VERSION,
  type EngineCatalog,
} from './catalog.js';
import { LearningEngine } from './service.js';
import { evaluateVisual, visualDocumentSchema, visualHash, type VisualDocument } from './visual.js';

type ProjectRow = {
  id: string;
  owner_id: string;
  scope: 'GUIDED' | 'PLAYGROUND';
  tool_kind: string;
  title: string;
  release_id: string | null;
  course_id: string | null;
  module_id: string | null;
  lesson_id: string | null;
  created_at: Date;
};
type RevisionRow = {
  project_id: string;
  revision_no: number;
  content: VisualDocument;
  content_sha256: string;
  created_at: Date;
};
type RunRow = {
  id: string;
  project_id: string;
  revision_no: number;
  passed: boolean;
  checks: { id: string; label: string; passed: boolean }[];
  created_at: Date;
};

/** Adult-only declarative block sandbox. No arbitrary code is run by the browser or API. */
export class SandboxService {
  constructor(
    private db: Database,
    private catalog: EngineCatalog,
    private releaseId: string,
    private engine: LearningEngine,
  ) {}

  private async ownerProject(client: PoolClient, learnerId: string, id: string) {
    const found = await client.query<ProjectRow>(
      'SELECT * FROM learning.sandbox_projects WHERE id=$1 AND owner_id=$2',
      [id, learnerId],
    );
    if (!found.rows[0])
      throw new ApiError(404, 'PROJECT_UNKNOWN', 'No private project belongs to this account.');
    return found.rows[0];
  }
  async list(learnerId: string) {
    await this.engine.requirePlaygroundAccess(this.db, learnerId);
    const found = await this.db.query<
      ProjectRow & { latest_revision: number | null; last_passed: boolean | null }
    >(
      `SELECT p.*,v.revision_no AS latest_revision,r.passed AS last_passed
       FROM learning.sandbox_projects p
       LEFT JOIN LATERAL (SELECT revision_no FROM learning.sandbox_revisions
         WHERE project_id=p.id ORDER BY revision_no DESC LIMIT 1) v ON true
       LEFT JOIN LATERAL (SELECT passed FROM learning.sandbox_runs
         WHERE project_id=p.id AND revision_no=v.revision_no ORDER BY created_at DESC LIMIT 1) r ON true
       WHERE p.owner_id=$1 ORDER BY p.created_at DESC LIMIT 50`,
      [learnerId],
    );
    return {
      projects: found.rows.map((row) => ({
        id: row.id,
        scope: row.scope,
        toolKind: row.tool_kind,
        title: row.title,
        courseId: row.course_id,
        lessonId: row.lesson_id,
        latestRevision: row.latest_revision,
        passed: row.last_passed,
        createdAt: row.created_at,
      })),
    };
  }
  async project(learnerId: string, id: string) {
    await this.engine.requirePlaygroundAccess(this.db, learnerId);
    const project = await this.db.query<ProjectRow>(
      'SELECT * FROM learning.sandbox_projects WHERE id=$1 AND owner_id=$2',
      [id, learnerId],
    );
    const row = project.rows[0];
    if (!row)
      throw new ApiError(404, 'PROJECT_UNKNOWN', 'No private project belongs to this account.');
    const latest = await this.db.query<RevisionRow>(
      `SELECT project_id,revision_no,content,content_sha256,created_at
       FROM learning.sandbox_revisions WHERE project_id=$1 ORDER BY revision_no DESC LIMIT 1`,
      [id],
    );
    const run =
      row.scope === 'GUIDED'
        ? await this.db.query<RunRow>(
            'SELECT id,project_id,revision_no,passed,checks,created_at FROM learning.sandbox_runs WHERE project_id=$1 ORDER BY created_at DESC LIMIT 1',
            [id],
          )
        : null;
    return {
      project: {
        id: row.id,
        title: row.title,
        scope: row.scope,
        toolKind: row.tool_kind,
        courseId: row.course_id,
        lessonId: row.lesson_id,
        visibility: 'private' as const,
      },
      latest: latest.rows[0]
        ? {
            revisionNo: latest.rows[0].revision_no,
            document: latest.rows[0].content,
            createdAt: latest.rows[0].created_at,
          }
        : null,
      lastRun: run?.rows[0] ?? null,
    };
  }
  async create(
    learnerId: string,
    input: {
      scope: 'GUIDED' | 'PLAYGROUND';
      title: string;
      courseId?: string;
      lessonId?: string;
      requestId: string;
    },
  ) {
    return inTransaction(this.db, async (client) => {
      await client.query('SELECT id FROM pilot.users WHERE id=$1 FOR UPDATE', [learnerId]);
      await this.engine.requirePlaygroundAccess(client, learnerId);
      const replay = await client.query<ProjectRow & { request_id: string }>(
        'SELECT * FROM learning.sandbox_projects WHERE owner_id=$1 AND request_id=$2',
        [learnerId, input.requestId],
      );
      if (replay.rows[0]) {
        const row = replay.rows[0];
        if (
          row.scope !== input.scope ||
          row.course_id !== (input.courseId ?? null) ||
          row.lesson_id !== (input.lessonId ?? null) ||
          (row.scope === 'PLAYGROUND' && row.title !== input.title.trim())
        )
          throw new ApiError(
            409,
            'REQUEST_REUSED',
            'This request ID belongs to a different project.',
          );
        return { id: row.id, scope: row.scope, repeated: true };
      }
      let moduleId: string | null = null;
      if (input.scope === 'GUIDED') {
        const context = await this.engine.requireGuidedAccess(
          client,
          learnerId,
          input.courseId ?? '',
          input.lessonId ?? '',
        );
        moduleId = context.moduleId;
        const prior = await client.query<{ id: string }>(
          `SELECT id FROM learning.sandbox_projects WHERE owner_id=$1 AND scope='GUIDED'
           AND release_id=$2 AND course_id=$3 AND module_id=$4 AND lesson_id=$5`,
          [learnerId, this.releaseId, input.courseId, moduleId, input.lessonId],
        );
        if (prior.rows[0]) return { id: prior.rows[0].id, scope: input.scope, repeated: true };
      } else {
        if (input.courseId || input.lessonId)
          throw new ApiError(
            422,
            'SCOPE_INVALID',
            'Free practice must not include a course or lesson.',
          );
        const count = await client.query<{ count: string }>(
          "SELECT count(*) FROM learning.sandbox_projects WHERE owner_id=$1 AND scope='PLAYGROUND'",
          [learnerId],
        );
        if (Number(count.rows[0].count) >= 20)
          throw new ApiError(
            429,
            'PROJECT_LIMIT',
            'Free practice is limited to 20 private projects per learner.',
          );
      }
      const title = input.title.trim();
      if (title.length < 1 || title.length > 120)
        throw new ApiError(422, 'TITLE_INVALID', 'Use a short, non-identifying project title.');
      const added = await client.query<{ id: string }>(
        `INSERT INTO learning.sandbox_projects
         (owner_id,scope,tool_kind,release_id,course_id,module_id,lesson_id,title,request_id)
         VALUES($1,$2,'VISUAL',$3,$4,$5,$6,$7,$8) RETURNING id`,
        [
          learnerId,
          input.scope,
          input.scope === 'GUIDED' ? this.releaseId : null,
          input.scope === 'GUIDED' ? input.courseId : null,
          moduleId,
          input.scope === 'GUIDED' ? input.lessonId : null,
          title,
          input.requestId,
        ],
      );
      await appendAudit(client, learnerId, 'learning.sandbox.created', added.rows[0].id, {
        scope: input.scope,
        toolKind: 'VISUAL',
        releaseId: input.scope === 'GUIDED' ? this.releaseId : null,
      });
      return { id: added.rows[0].id, scope: input.scope, repeated: false };
    });
  }
  async save(
    learnerId: string,
    projectId: string,
    input: { document: unknown; requestId: string },
  ) {
    let document: VisualDocument;
    try {
      document = visualDocumentSchema.parse(input.document);
    } catch {
      throw new ApiError(
        422,
        'VISUAL_INVALID',
        'Only the supported, bounded visual blocks can be saved.',
      );
    }
    const contentSha = visualHash(document);
    if (Buffer.byteLength(JSON.stringify(document), 'utf8') > 16384)
      throw new ApiError(
        413,
        'PROJECT_TOO_LARGE',
        'Visual content exceeds the private storage limit.',
      );
    return inTransaction(this.db, async (client) => {
      await client.query('SELECT id FROM pilot.users WHERE id=$1 FOR UPDATE', [learnerId]);
      const project = await this.ownerProject(client, learnerId, projectId);
      const replay = await client.query<RevisionRow & { request_id: string }>(
        'SELECT * FROM learning.sandbox_revisions WHERE owner_id=$1 AND request_id=$2',
        [learnerId, input.requestId],
      );
      if (replay.rows[0]) {
        if (replay.rows[0].project_id !== projectId || replay.rows[0].content_sha256 !== contentSha)
          throw new ApiError(409, 'REQUEST_REUSED', 'This request ID belongs to another revision.');
        return { revisionNo: replay.rows[0].revision_no, repeated: true };
      }
      await this.engine.requirePlaygroundAccess(client, learnerId);
      if (project.scope === 'GUIDED')
        await this.engine.requireGuidedAccess(
          client,
          learnerId,
          project.course_id ?? '',
          project.lesson_id ?? '',
        );
      const count = await client.query<{ revision_no: number }>(
        'SELECT revision_no FROM learning.sandbox_revisions WHERE project_id=$1 ORDER BY revision_no DESC LIMIT 1',
        [projectId],
      );
      const next = (count.rows[0]?.revision_no ?? 0) + 1;
      if (next > 100)
        throw new ApiError(429, 'REVISION_LIMIT', 'This project reached its 100-revision limit.');
      await client.query(
        `INSERT INTO learning.sandbox_revisions
         (project_id,owner_id,revision_no,content,content_sha256,request_id)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [projectId, learnerId, next, JSON.stringify(document), contentSha, input.requestId],
      );
      await appendAudit(client, learnerId, 'learning.sandbox.saved', projectId, {
        scope: project.scope,
        revisionNo: next,
        sha256: contentSha,
      });
      return { revisionNo: next, repeated: false };
    });
  }
  async run(
    learnerId: string,
    projectId: string,
    input: { revisionNo: number; requestId: string },
  ) {
    return inTransaction(this.db, async (client) => {
      await client.query('SELECT id FROM pilot.users WHERE id=$1 FOR UPDATE', [learnerId]);
      const project = await this.ownerProject(client, learnerId, projectId);
      if (project.scope !== 'GUIDED' || project.tool_kind !== 'VISUAL')
        throw new ApiError(422, 'SCOPE_INVALID', 'Free practice cannot create graded results.');
      const replay = await client.query<RunRow & { request_id: string }>(
        'SELECT * FROM learning.sandbox_runs WHERE owner_id=$1 AND request_id=$2',
        [learnerId, input.requestId],
      );
      if (replay.rows[0]) {
        if (
          replay.rows[0].project_id !== projectId ||
          replay.rows[0].revision_no !== input.revisionNo
        )
          throw new ApiError(409, 'REQUEST_REUSED', 'This request ID belongs to another run.');
        return {
          passed: replay.rows[0].passed,
          checks: replay.rows[0].checks,
          trace: [],
          runId: replay.rows[0].id,
          repeated: true,
        };
      }
      await this.engine.requireGuidedAccess(
        client,
        learnerId,
        project.course_id ?? '',
        project.lesson_id ?? '',
      );
      if (
        project.course_id !== GUIDED_LESSON.courseId ||
        project.module_id !== GUIDED_LESSON.moduleId ||
        project.lesson_id !== GUIDED_LESSON.lessonId ||
        project.release_id !== this.releaseId
      )
        throw new ApiError(
          409,
          'LESSON_MISMATCH',
          'This project belongs to another lesson or release.',
        );
      const latest = await client.query<RevisionRow>(
        `SELECT project_id,revision_no,content,content_sha256,created_at FROM learning.sandbox_revisions
         WHERE project_id=$1 ORDER BY revision_no DESC LIMIT 1`,
        [projectId],
      );
      const revision = latest.rows[0];
      if (!revision || revision.revision_no !== input.revisionNo)
        throw new ApiError(
          409,
          'STALE_REVISION',
          'Run the latest saved revision; unsaved edits cannot be graded.',
        );
      let document: VisualDocument;
      try {
        document = visualDocumentSchema.parse(revision.content);
      } catch {
        throw new ApiError(409, 'EVIDENCE_INVALID', 'Saved visual content is invalid.');
      }
      if (visualHash(document) !== revision.content_sha256)
        throw new ApiError(409, 'HASH_MISMATCH', 'The immutable project revision changed.');
      const result = evaluateVisual(document);
      const stored = await client.query<{ id: string }>(
        `INSERT INTO learning.sandbox_runs
         (project_id,owner_id,release_id,course_id,module_id,lesson_id,
          revision_no,revision_sha256,evaluator_version,passed,checks,request_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [
          projectId,
          learnerId,
          this.releaseId,
          GUIDED_LESSON.courseId,
          GUIDED_LESSON.moduleId,
          GUIDED_LESSON.lessonId,
          revision.revision_no,
          revision.content_sha256,
          VISUAL_EVALUATOR_VERSION,
          result.passed,
          JSON.stringify(result.checks),
          input.requestId,
        ],
      );
      await this.engine.onGuidedResult(client, learnerId, result.passed);
      await appendAudit(client, learnerId, 'learning.sandbox.graded', stored.rows[0].id, {
        projectId,
        revisionNo: revision.revision_no,
        passed: result.passed,
        evaluatorVersion: VISUAL_EVALUATOR_VERSION,
        policyVersion: ENGINE_POLICY_VERSION,
      });
      return { ...result, runId: stored.rows[0].id, repeated: false };
    });
  }
  async guidedBrief(learnerId: string, courseId: string, lessonId: string) {
    await this.engine.requireGuidedAccess(this.db, learnerId, courseId, lessonId);
    return {
      courseId,
      lessonId,
      toolKind: 'VISUAL' as const,
      criteria: VISUAL_CRITERIA,
      contentVersion: this.catalog.version,
      evaluatorVersion: VISUAL_EVALUATOR_VERSION,
      note: 'Server-checked internal draft practice; passing this guided activity and the lesson check are required in Course 08.',
    };
  }
}

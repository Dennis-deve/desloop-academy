import type { PoolClient } from 'pg';
import { appendAudit, inTransaction, type Database } from '../db.js';
import { ApiError } from '../security.js';
import {
  checkedAssetIds,
  MAX_ASSETS,
  MAX_PROJECTS,
  MAX_REVISIONS,
  normalizeDocument,
  normalizePng,
  PROJECT_FORMAT,
  revisionDigest,
  sha256,
  type AssetDigest,
  type JsonObject,
} from './contract.js';

type ProjectRow = {
  id: string;
  title: string;
  format: string;
  latest_revision_no: number;
  created_at: Date;
  updated_at: Date;
};
type RevisionRow = {
  project_id: string;
  revision_no: number;
  parent_revision_no: number;
  document: JsonObject;
  content_sha256: string;
  created_at: Date;
};
type AssetRow = {
  id: string;
  project_id: string;
  content: Buffer;
  content_sha256: string;
  source_sha256: string;
  width: number;
  height: number;
  created_at: Date;
};
const unknownProject = () =>
  new ApiError(404, 'PROJECT_UNKNOWN', 'No private project belongs to this account.');
const unknownAsset = () =>
  new ApiError(404, 'ASSET_UNKNOWN', 'No private asset belongs to this project and account.');

/** No editor, credit, publish or cross-account authority. All writes require a real adult learner session. */
export class ProjectCore {
  constructor(private db: Database) {}

  private async lockLearner(client: PoolClient, ownerId: string) {
    const found = await client.query(
      "SELECT id FROM pilot.users WHERE id=$1 AND role='learner' AND status='active' FOR UPDATE",
      [ownerId],
    );
    if (!found.rows[0])
      throw new ApiError(403, 'ACCOUNT_INACTIVE', 'An active adult learner is required.');
  }

  private async ownerProject(client: PoolClient, ownerId: string, id: string) {
    const found = await client.query<ProjectRow>(
      'SELECT id,title,format,latest_revision_no,created_at,updated_at FROM project_core.projects WHERE id=$1 AND owner_id=$2 FOR UPDATE',
      [id, ownerId],
    );
    if (!found.rows[0]) throw unknownProject();
    return found.rows[0];
  }

  async list(ownerId: string) {
    const rows = await this.db.query<ProjectRow>(
      `SELECT id,title,format,latest_revision_no,created_at,updated_at
       FROM project_core.projects WHERE owner_id=$1 ORDER BY created_at DESC,id LIMIT $2`,
      [ownerId, MAX_PROJECTS],
    );
    return {
      projects: rows.rows.map((row) => ({
        id: row.id,
        title: row.title,
        format: row.format,
        latestRevisionNo: row.latest_revision_no,
        visibility: 'private' as const,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    };
  }

  async create(ownerId: string, input: { title: string; document: unknown; requestId: string }) {
    const { document, canonical } = normalizeDocument(input.document);
    const digest = revisionDigest(canonical, []);
    return inTransaction(this.db, async (client) => {
      await this.lockLearner(client, ownerId);
      const prior = await client.query<ProjectRow & { initial_sha256: string }>(
        `SELECT p.id,p.title,p.format,p.latest_revision_no,p.created_at,p.updated_at,
          r.content_sha256 AS initial_sha256 FROM project_core.projects p
         JOIN project_core.revisions r ON r.project_id=p.id AND r.revision_no=1
         WHERE p.owner_id=$1 AND p.request_id=$2`,
        [ownerId, input.requestId],
      );
      if (prior.rows[0]) {
        if (prior.rows[0].title !== input.title || prior.rows[0].initial_sha256 !== digest)
          throw new ApiError(409, 'REQUEST_REUSED', 'This request ID belongs to different content.');
        return {
          id: prior.rows[0].id,
          title: prior.rows[0].title,
          format: PROJECT_FORMAT,
          latestRevisionNo: 1, // replay of initial creation, not a claim about the current revision
          contentSha256: digest,
          repeated: true,
        };
      }
      const count = await client.query<{ count: string }>(
        'SELECT count(*) FROM project_core.projects WHERE owner_id=$1',
        [ownerId],
      );
      if (Number(count.rows[0].count) >= MAX_PROJECTS)
        throw new ApiError(429, 'PROJECT_LIMIT', 'This account reached its private project limit.');
      const created = await client.query<{ id: string }>(
        `INSERT INTO project_core.projects(owner_id,title,request_id)
         VALUES($1,$2,$3) RETURNING id`,
        [ownerId, input.title, input.requestId],
      );
      const id = created.rows[0].id;
      await client.query(
        `INSERT INTO project_core.revisions
         (project_id,owner_id,revision_no,parent_revision_no,document,content_sha256,request_id)
         VALUES($1,$2,1,0,$3,$4,$5)`,
        [id, ownerId, JSON.stringify(document), digest, input.requestId],
      );
      await appendAudit(client, ownerId, 'project_core.project.created', id, {
        revisionNo: 1, contentSha256: digest,
      });
      return {
        id, title: input.title, format: PROJECT_FORMAT, latestRevisionNo: 1,
        contentSha256: digest, repeated: false,
      };
    });
  }

  private async manifest(client: PoolClient, ownerId: string, projectId: string, assetIds: string[]) {
    if (!assetIds.length) return [] as AssetDigest[];
    const found = await client.query<{ id: string; content_sha256: string }>(
      `SELECT id,content_sha256 FROM project_core.assets
       WHERE owner_id=$1 AND project_id=$2 AND id=ANY($3::uuid[]) ORDER BY id`,
      [ownerId, projectId, assetIds],
    );
    if (found.rows.length !== assetIds.length)
      throw new ApiError(422, 'ASSET_MANIFEST_INVALID', 'Every image must belong to this private project.');
    return found.rows.map((row) => ({ id: row.id, sha256: row.content_sha256 }));
  }

  async save(ownerId: string, projectId: string, input: {
    baseRevisionNo: number; document: unknown; assetIds: string[]; requestId: string;
  }) {
    const { document, canonical } = normalizeDocument(input.document);
    const assetIds = checkedAssetIds(input.assetIds);
    return inTransaction(this.db, async (client) => {
      await this.lockLearner(client, ownerId);
      const project = await this.ownerProject(client, ownerId, projectId);
      const assets = await this.manifest(client, ownerId, projectId, assetIds);
      const digest = revisionDigest(canonical, assets);
      const replay = await client.query<RevisionRow>(
        `SELECT project_id,revision_no,parent_revision_no,document,content_sha256,created_at
         FROM project_core.revisions WHERE owner_id=$1 AND request_id=$2`,
        [ownerId, input.requestId],
      );
      if (replay.rows[0]) {
        const row = replay.rows[0];
        if (row.project_id !== projectId || row.parent_revision_no !== input.baseRevisionNo ||
            row.content_sha256 !== digest)
          throw new ApiError(409, 'REQUEST_REUSED', 'This request ID belongs to a different revision.');
        return { projectId, revisionNo: row.revision_no, contentSha256: digest, repeated: true };
      }
      if (project.latest_revision_no !== input.baseRevisionNo)
        throw new ApiError(409, 'REVISION_CONFLICT', 'Reload and compare the latest saved revision.');
      if (project.latest_revision_no >= MAX_REVISIONS)
        throw new ApiError(429, 'REVISION_LIMIT', 'This project reached its private revision limit.');
      const next = project.latest_revision_no + 1;
      await client.query(
        `INSERT INTO project_core.revisions
         (project_id,owner_id,revision_no,parent_revision_no,document,content_sha256,request_id)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [projectId, ownerId, next, input.baseRevisionNo, JSON.stringify(document), digest, input.requestId],
      );
      for (const assetId of assetIds)
        await client.query(
          `INSERT INTO project_core.revision_assets(project_id,owner_id,revision_no,asset_id)
           VALUES($1,$2,$3,$4)`,
          [projectId, ownerId, next, assetId],
        );
      await client.query(
        `UPDATE project_core.projects SET latest_revision_no=$3,updated_at=now()
         WHERE id=$1 AND owner_id=$2 AND latest_revision_no=$4`,
        [projectId, ownerId, next, input.baseRevisionNo],
      );
      await appendAudit(client, ownerId, 'project_core.revision.saved', projectId, {
        revisionNo: next, contentSha256: digest, assetCount: assetIds.length,
      });
      return { projectId, revisionNo: next, contentSha256: digest, repeated: false };
    });
  }

  async uploadPng(ownerId: string, projectId: string, input: {
    dataBase64: string; expectedSha256: string; requestId: string;
  }) {
    const file = normalizePng(input.dataBase64, input.expectedSha256);
    return inTransaction(this.db, async (client) => {
      await this.lockLearner(client, ownerId);
      await this.ownerProject(client, ownerId, projectId);
      const replay = await client.query<AssetRow>(
        `SELECT id,project_id,source_sha256,content_sha256,content,width,height,created_at
         FROM project_core.assets WHERE owner_id=$1 AND request_id=$2`,
        [ownerId, input.requestId],
      );
      if (replay.rows[0]) {
        const row = replay.rows[0];
        if (row.project_id !== projectId || row.source_sha256 !== file.sourceSha256 ||
            row.content_sha256 !== file.contentSha256)
          throw new ApiError(409, 'REQUEST_REUSED', 'This request ID belongs to another image.');
        return {
          id: row.id, mediaType: 'image/png' as const, sha256: row.content_sha256,
          width: row.width, height: row.height, byteLength: row.content.length, repeated: true,
        };
      }
      const count = await client.query<{ count: string }>(
        'SELECT count(*) FROM project_core.assets WHERE project_id=$1 AND owner_id=$2',
        [projectId, ownerId],
      );
      if (Number(count.rows[0].count) >= MAX_ASSETS)
        throw new ApiError(429, 'ASSET_LIMIT', 'This project reached its private image limit.');
      const saved = await client.query<{ id: string }>(
        `INSERT INTO project_core.assets
         (project_id,owner_id,content,content_sha256,source_sha256,width,height,request_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [projectId, ownerId, file.content, file.contentSha256, file.sourceSha256,
          file.width, file.height, input.requestId],
      );
      await appendAudit(client, ownerId, 'project_core.asset.created', projectId, {
        assetId: saved.rows[0].id, sha256: file.contentSha256,
        byteLength: file.content.length,
      });
      return {
        id: saved.rows[0].id, mediaType: 'image/png' as const, sha256: file.contentSha256,
        width: file.width, height: file.height, byteLength: file.content.length, repeated: false,
      };
    });
  }

  private async loadRevision(ownerId: string, projectId: string, revisionNo: number) {
    const row = await this.db.query<RevisionRow>(
      `SELECT r.project_id,r.revision_no,r.parent_revision_no,r.document,r.content_sha256,r.created_at
       FROM project_core.revisions r
       JOIN project_core.projects p ON p.id=r.project_id AND p.owner_id=r.owner_id
       WHERE r.project_id=$1 AND p.owner_id=$2 AND r.revision_no=$3`,
      [projectId, ownerId, revisionNo],
    );
    if (!row.rows[0]) throw unknownProject();
    const files = await this.db.query<AssetRow>(
      `SELECT a.id,a.project_id,a.content_sha256,a.content,a.width,a.height,a.created_at
       FROM project_core.revision_assets ra
       JOIN project_core.assets a ON a.id=ra.asset_id AND a.project_id=ra.project_id
       WHERE ra.project_id=$1 AND ra.owner_id=$2 AND ra.revision_no=$3 ORDER BY a.id`,
      [projectId, ownerId, revisionNo],
    );
    let canonical: string;
    try {
      canonical = normalizeDocument(row.rows[0].document).canonical;
    } catch {
      throw new ApiError(409, 'INTEGRITY_FAILURE', 'Stored project evidence did not validate.');
    }
    for (const asset of files.rows)
      if (sha256(asset.content) !== asset.content_sha256)
        throw new ApiError(409, 'INTEGRITY_FAILURE', 'Stored image evidence did not match its digest.');
    const digest = revisionDigest(
      canonical, files.rows.map((asset) => ({ id: asset.id, sha256: asset.content_sha256 })),
    );
    if (digest !== row.rows[0].content_sha256)
      throw new ApiError(409, 'INTEGRITY_FAILURE', 'Stored project evidence did not match its digest.');
    return {
      revisionNo: row.rows[0].revision_no,
      parentRevisionNo: row.rows[0].parent_revision_no,
      document: row.rows[0].document,
      contentSha256: digest,
      assets: files.rows.map((asset) => ({
        id: asset.id, sha256: asset.content_sha256, mediaType: 'image/png' as const,
        width: asset.width, height: asset.height, byteLength: asset.content.length,
      })),
      createdAt: row.rows[0].created_at,
    };
  }

  async get(ownerId: string, id: string, revisionNo?: number) {
    const project = await this.db.query<ProjectRow>(
      `SELECT id,title,format,latest_revision_no,created_at,updated_at
       FROM project_core.projects WHERE id=$1 AND owner_id=$2`,
      [id, ownerId],
    );
    const row = project.rows[0];
    if (!row) throw unknownProject();
    const revision = await this.loadRevision(ownerId, id, revisionNo ?? row.latest_revision_no);
    return {
      project: {
        id: row.id, title: row.title, format: row.format,
        visibility: 'private' as const, latestRevisionNo: row.latest_revision_no,
        createdAt: row.created_at, updatedAt: row.updated_at,
      },
      revision,
      authority: 'storage-only; never course completion or assessed credit' as const,
    };
  }

  async getPng(ownerId: string, projectId: string, assetId: string) {
    const found = await this.db.query<AssetRow>(
      `SELECT a.id,a.project_id,a.content,a.content_sha256,a.width,a.height,a.created_at
       FROM project_core.assets a JOIN project_core.projects p ON p.id=a.project_id AND p.owner_id=a.owner_id
       WHERE a.id=$1 AND a.project_id=$2 AND a.owner_id=$3`,
      [assetId, projectId, ownerId],
    );
    const row = found.rows[0];
    if (!row) throw unknownAsset();
    if (sha256(row.content) !== row.content_sha256)
      throw new ApiError(409, 'INTEGRITY_FAILURE', 'Stored image evidence did not match its digest.');
    return row.content;
  }
}

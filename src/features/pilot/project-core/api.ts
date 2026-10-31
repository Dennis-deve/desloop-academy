import { pilotRequest } from '../api';

export interface ProjectSummary {
  id: string;
  title: string;
  format: 'JSON_V1';
  latestRevisionNo: number;
  visibility: 'private';
  createdAt: string;
  updatedAt: string;
}
export interface PrivateRevision {
  revisionNo: number;
  parentRevisionNo: number;
  document: Record<string, unknown>;
  contentSha256: string;
  assets: {
    id: string;
    sha256: string;
    mediaType: 'image/png';
    width: number;
    height: number;
    byteLength: number;
  }[];
  createdAt: string;
}
export interface ProjectDetail {
  project: ProjectSummary;
  revision: PrivateRevision;
  authority: 'storage-only; never course completion or assessed credit';
}

const base = '/project-core/v1/projects';
const projectPath = (id: string) => `${base}/${encodeURIComponent(id)}`;
/** Browser requests are same-origin, credentialed and CSRF-protected by pilotRequest. */
export const projectCoreApi = {
  projects: () => pilotRequest<{ projects: ProjectSummary[] }>(base),
  create: (title: string, document: Record<string, unknown>, requestId: string) =>
    pilotRequest<{ id: string; latestRevisionNo: number; contentSha256: string; repeated: boolean }>(
      base, { title, document, requestId },
    ),
  project: (id: string, revisionNo?: number) =>
    pilotRequest<ProjectDetail>(
      revisionNo === undefined ? projectPath(id) : `${projectPath(id)}/revisions/${revisionNo}`,
    ),
  save: (
    id: string,
    baseRevisionNo: number,
    document: Record<string, unknown>,
    assetIds: string[],
    requestId: string,
  ) => pilotRequest<{ projectId: string; revisionNo: number; contentSha256: string; repeated: boolean }>(
    `${projectPath(id)}/revisions`, { baseRevisionNo, document, assetIds, requestId },
  ),
};

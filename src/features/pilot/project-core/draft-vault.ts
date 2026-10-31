import type { ProjectDetail } from './api';

export type ProjectSaveIntent = {
  baseRevisionNo: number;
  document: Record<string, unknown>;
  assetIds: string[];
  requestId: string;
};
export interface PrivateProjectDraft {
  /** A server-returned base, held only in memory so a newer revision can be compared. */
  base: ProjectDetail;
  text: string;
  /** An unknown or in-flight outcome must be retried with precisely these original bytes. */
  uncertainSave: ProjectSaveIntent | null;
  needsReopen: boolean;
}
export interface ProjectDraftVault {
  setOwner: (ownerId: string | null) => void;
  read: (ownerId: string, projectId: string) => PrivateProjectDraft | null;
  write: (ownerId: string, projectId: string, draft: PrivateProjectDraft) => void;
  forget: (ownerId: string, projectId: string) => void;
  hasUnsaved: (ownerId: string) => boolean;
}

/** Mounted adult pilot only. This never writes browser storage, cookies or a server record. */
export function createProjectDraftVault(): ProjectDraftVault {
  let activeOwner: string | null = null;
  const drafts = new Map<string, PrivateProjectDraft>();
  return {
    setOwner(nextOwner) {
      if (nextOwner !== activeOwner) {
        drafts.clear();
        activeOwner = nextOwner;
      }
    },
    read(ownerId, projectId) {
      return ownerId === activeOwner ? drafts.get(projectId) ?? null : null;
    },
    write(ownerId, projectId, draft) {
      if (ownerId === activeOwner && draft.base.project.id === projectId)
        drafts.set(projectId, draft);
    },
    forget(ownerId, projectId) {
      if (ownerId === activeOwner) drafts.delete(projectId);
    },
    hasUnsaved(ownerId) {
      return ownerId === activeOwner && drafts.size > 0;
    },
  };
}

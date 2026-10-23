export type PilotRole = 'learner' | 'reviewer';
export type PilotCourseState = 'locked' | 'current' | 'review' | 'revision' | 'completed';
export interface PilotUser {
  id: string;
  displayName: string;
  email: string;
  role: PilotRole;
}
export interface PilotStatus {
  enabled: boolean;
  engineV2Enabled: boolean;
  audience: string;
  curriculum: string;
  contentVersion: string;
}
export interface PilotPathway {
  mode: 'adult-internal-draft';
  contentVersion: string;
  policyVersion: string;
  completedCount: number;
  currentCourseId: string | null;
  courses: {
    id: string;
    number: number;
    title: string;
    stage: string;
    version: string;
    state: PilotCourseState;
  }[];
}
interface PilotLesson {
  id: string;
  title: string;
  objective: string;
  explanation: string;
  workedExample: string;
  guidedPractice: string;
  independentPractice: string;
  check: { question: string; options: string[]; safetyCritical: boolean };
}
export interface PilotCourseDetail {
  course: {
    id: string;
    number: number;
    title: string;
    stage: string;
    version: string;
    purpose: string;
    project: { brief: string; requiredEvidence: string[] };
    modules: { id: string; title: string; lessons: PilotLesson[] }[];
    quiz: { question: string; options: string[]; safetyCritical: boolean }[];
  };
  state: PilotCourseState;
  completedLessons: string[];
  quiz: { score: number; criticalPassed: boolean; attemptedAt: string } | null;
  project: {
    id: string;
    status: 'submitted' | 'revision_requested' | 'approved';
    iteration: number;
    feedback: string | null;
  } | null;
}
export interface PilotQueueItem {
  id: string;
  course_id: string;
  courseTitle: string;
  version: string;
  learner_name: string;
  artefact: string;
  reflection: string;
  iteration: number;
  submitted_at: string;
  rubricDimensions: string[];
}
export class PilotApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function csrf() {
  const key = document.cookie
    .split('; ')
    .find(
      (item) =>
        item.startsWith('__Host-desloop_pilot_csrf=') || item.startsWith('desloop_pilot_csrf='),
    );
  return key ? decodeURIComponent(key.split('=').slice(1).join('=')) : null;
}
async function request<T>(path: string, body?: object): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    if (!path.startsWith('/auth/register') && !path.startsWith('/auth/login')) {
      const token = csrf();
      if (!token)
        throw new PilotApiError(
          403,
          'CSRF_DENIED',
          'Refresh the pilot page to renew your session.',
        );
      headers['X-CSRF-Token'] = token;
    }
  }
  let response: Response;
  try {
    response = await fetch(`/api/pilot${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new PilotApiError(
      0,
      'NOT_CONNECTED',
      'The private pilot API could not be reached. No account or work has been saved; check your connection and try again.',
    );
  }
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = result as { error?: string; message?: string } | null;
    throw new PilotApiError(
      response.status,
      error?.error ?? 'UNAVAILABLE',
      error?.message ?? 'The private pilot API could not complete this request.',
    );
  }
  return result as T;
}
/** Same-origin pilot credentials and CSRF also protect the opt-in draft-2 engine. */
export { request as pilotRequest };
export const pilotApi = {
  status: () => request<PilotStatus>('/status'),
  me: () => request<{ user: PilotUser }>('/me'),
  aiAdminAccess: () => request<{allowed:boolean}>('/ai/admin/access'),
  login: (email: string, password: string) =>
    request<{ user: PilotUser }>('/auth/login', { email, password }),
  register: (invitation: string, name: string, password: string, adultAttested: boolean) =>
    request<{ user: PilotUser }>('/auth/register', { invitation, name, password, adultAttested }),
  logout: () => request<{ signedOut: boolean }>('/auth/logout', {}),
  pathway: () => request<PilotPathway>('/pathway'),
  course: (courseId: string) =>
    request<PilotCourseDetail>(`/courses/${encodeURIComponent(courseId)}`),
  lesson: (
    courseId: string,
    lessonId: string,
    body: {
      practice: string;
      answerIndex: number;
      responseMode: 'typed' | 'dictated-or-described';
      requestId: string;
    },
  ) =>
    request<{ completed: boolean; repeated: boolean; explanation: string | null }>(
      `/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`,
      body,
    ),
  quiz: (courseId: string, answers: number[], requestId: string) =>
    request<{
      score: number;
      criticalPassed: boolean;
      passed: boolean;
      missed: { index: number; explanation: string; safetyCritical: boolean }[];
    }>(`/courses/${encodeURIComponent(courseId)}/quiz`, { answers, requestId }),
  project: (
    courseId: string,
    body: {
      artefact: string;
      reflection: string;
      responseMode: 'typed' | 'dictated-or-described';
      safetyAttested: boolean;
      requestId: string;
    },
  ) =>
    request<{ submissionId: string; status: string; repeated: boolean }>(
      `/courses/${encodeURIComponent(courseId)}/project`,
      body,
    ),
  reviews: () => request<{ queue: PilotQueueItem[] }>('/reviews'),
  review: (
    submissionId: string,
    body: {
      decision: 'approved' | 'revision_requested';
      rubric: Record<string, number>;
      safetyApproved: boolean;
      feedback: string;
    },
  ) =>
    request<{
      completed: boolean;
      decision: string;
      projectScore: number;
      overallScore: number;
      nextCourseId: string | null;
    }>(`/reviews/${encodeURIComponent(submissionId)}`, body),
};

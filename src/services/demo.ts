import { courses, paths, demoSeed } from '@/mocks/catalog';
import type { AiTutorService, AuthService, CatalogService, DemoStateRepository } from './contracts';
import type { DemoSession, DemoState, Role } from '@/types';

const STORE_KEY = 'desloop-academy-demo-v1';
const SESSION_KEY = 'desloop-academy-session-v1';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const cloneSeed = (): DemoState => JSON.parse(JSON.stringify(demoSeed)) as DemoState;

export const demoRepository: DemoStateRepository = {
  load() {
    try {
      const value = localStorage.getItem(STORE_KEY);
      if (!value) return cloneSeed();
      const parsed = JSON.parse(value) as Partial<DemoState>;
      return {
        ...cloneSeed(),
        ...parsed,
        preferences: { ...demoSeed.preferences, ...parsed.preferences },
        // Earlier demo snapshots predate the required pathway. Preserve old sample work
        // while hydrating missing curriculum fields independently.
        schoolClasses: (parsed.schoolClasses ?? demoSeed.schoolClasses).map((item) => ({
          ...item,
          // Migrate earlier sample assignments into planning references, never learner passes.
          assignedCourseId:
            (
              {
                'digital-confidence': 'course-01',
                'safe-online': 'course-05',
                'creative-coding': 'course-08',
              } as Record<string, string>
            )[item.assignedCourseId ?? ''] ?? item.assignedCourseId,
        })),
        curriculum: {
          ...demoSeed.curriculum,
          ...parsed.curriculum,
          lessonWork: { ...demoSeed.curriculum.lessonWork, ...parsed.curriculum?.lessonWork },
          lessonDrafts: { ...demoSeed.curriculum.lessonDrafts, ...parsed.curriculum?.lessonDrafts },
          lessonAttempts: {
            ...demoSeed.curriculum.lessonAttempts,
            ...parsed.curriculum?.lessonAttempts,
          },
          quizzes: { ...demoSeed.curriculum.quizzes, ...parsed.curriculum?.quizzes },
          evidence: { ...demoSeed.curriculum.evidence, ...parsed.curriculum?.evidence },
          completions: { ...demoSeed.curriculum.completions, ...parsed.curriculum?.completions },
        },
      };
    } catch {
      return cloneSeed();
    }
  },
  save(state) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      /* Storage may be unavailable; in-memory state still works. */
    }
  },
  reset() {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* Ignore unavailable storage. */
    }
  },
};

function saveSession(session: DemoSession | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* Session lasts in memory only. */
  }
}

export const demoAuthService: AuthService = {
  current() {
    try {
      const value = sessionStorage.getItem(SESSION_KEY);
      if (!value) return null;
      const parsed = JSON.parse(value) as DemoSession;
      return parsed.demo === true && typeof parsed.role === 'string' ? parsed : null;
    } catch {
      return null;
    }
  },
  async signIn(email, _password) {
    await wait(450);
    const session: DemoSession = {
      name: email
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
      email,
      role: 'learner',
      demo: true,
    };
    saveSession(session);
    return session;
  },
  async register(name, email, _password) {
    await wait(450);
    const session: DemoSession = { name, email, role: 'learner', demo: true };
    saveSession(session);
    return session;
  },
  enterDemo(role) {
    const session: DemoSession = {
      name: 'Alex Morgan',
      email: 'demo@local.invalid',
      role,
      demo: true,
    };
    saveSession(session);
    return session;
  },
  switchDemoRole(role: Role) {
    const session = this.current() ?? {
      name: 'Alex Morgan',
      email: 'demo@local.invalid',
      role,
      demo: true as const,
    };
    const next = { ...session, role };
    saveSession(next);
    return next;
  },
  updateDemoName(name) {
    const session = this.current() ?? {
      name: 'Alex Morgan',
      email: 'demo@local.invalid',
      role: 'learner' as const,
      demo: true as const,
    };
    const next = { ...session, name };
    saveSession(next);
    return next;
  },
  signOut() {
    saveSession(null);
  },
};

export const demoCatalogService: CatalogService = {
  async listCourses() {
    await wait(240);
    return courses;
  },
  async getCourse(slug) {
    await wait(160);
    return courses.find((course) => course.slug === slug) ?? null;
  },
  async listPaths() {
    await wait(200);
    return paths;
  },
};

export const demoAiService: AiTutorService = {
  async respond({ question, mode, context }) {
    await wait(850);
    if (question.trim().length < 3)
      throw new Error('Add a little more detail so the studio can respond.');
    const topic = context ? `In your ${context} lesson, ` : 'For this topic, ';
    const replies: Record<typeof mode, { content: string; followUp: string }> = {
      explain: {
        content: `${topic}begin with what you already know. Break “${question.trim().slice(0, 72)}” into one small idea, then find a real-world example. A useful next step is to explain the idea in your own words and check what still feels unclear.`,
        followUp: 'Which part would you like to unpack first?',
      },
      example: {
        content: `Here is a practice example: imagine you are teaching a friend about “${question.trim().slice(0, 60)}”. Show them one everyday situation where it matters, walk through the first step, then invite them to try a second example themselves.`,
        followUp: 'Can you think of your own example?',
      },
      hint: {
        content: `A hint rather than the whole answer: identify what you know already, then ask what the very next small decision should be. For “${question.trim().slice(0, 60)}”, try writing the goal in one sentence before choosing a method.`,
        followUp: 'What have you tried so far?',
      },
      try: {
        content: `Your turn first. Try a short answer or sketch a first attempt for “${question.trim().slice(0, 60)}”. It does not need to be perfect. Share your attempt and I can help you inspect one step at a time.`,
        followUp: 'What is your first attempt?',
      },
      check: {
        content: `Quick check: explain your thinking about “${question.trim().slice(0, 60)}” in two sentences. What evidence would show that your answer works? Compare your reasoning with the lesson objectives, and verify any important factual claims.`,
        followUp: 'What answer would you give, and why?',
      },
      challenge: {
        content: `Ready for a stretch? Apply “${question.trim().slice(0, 60)}” to a different setting. Add one constraint—less time, fewer tools, or a new audience—and explain what you would change.`,
        followUp: 'Which constraint will you choose?',
      },
      debug: {
        content: `Debug together: describe what you expected, what actually happened, and the smallest step where they differ. For “${question.trim().slice(0, 60)}”, test one assumption at a time rather than changing everything at once.`,
        followUp: 'What was the first surprising result?',
      },
      summary: {
        content: `To summarise “${question.trim().slice(0, 60)}”, write down three things: the main idea, one example, and one question you still have. Revisit the lesson to check your summary against its objectives.`,
        followUp: 'What is the main idea in your own words?',
      },
    };
    return { ...replies[mode], demo: true };
  },
};

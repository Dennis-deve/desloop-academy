import { createRoot } from 'react-dom/client';
import { LearningLoopDashboard } from '@/features/pilot/learning-loop/LearningLoopDashboard';

// Deliberately no sign-in simulation, seeded learner, invented activity, AI,
// network access or private app API. The same UI is connected server-side in /pilot.
createRoot(document.getElementById('root')!).render(<LearningLoopDashboard mode="review" />);

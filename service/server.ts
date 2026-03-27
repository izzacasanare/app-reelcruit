import { Hono } from 'hono';
import { registerJobRoutes } from './handlers/jobs.handler.ts';
import { registerCandidateRoutes } from './handlers/candidates.handler.ts';
import { registerInterviewRoutes } from './handlers/interviews.handler.ts';

const app = new Hono();

registerJobRoutes(app);
registerCandidateRoutes(app);
registerInterviewRoutes(app);

// Coming soon:
// registerResponseRoutes(app);
// registerReviewRoutes(app);

export default app;

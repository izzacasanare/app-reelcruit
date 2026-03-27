import { Hono } from 'hono';
import { registerJobRoutes } from './handlers/jobs.handler.ts';
import { registerCandidateRoutes } from './handlers/candidates.handler.ts';

const app = new Hono();

registerJobRoutes(app);
registerCandidateRoutes(app);

// Coming soon:
// registerInterviewRoutes(app);
// registerResponseRoutes(app);
// registerReviewRoutes(app);

export default app;

import { Hono } from 'hono';
import { registerJobRoutes } from './handlers/jobs.handler.ts';

const app = new Hono();

registerJobRoutes(app);

// More route groups will be registered here as features are built:
// registerCandidateRoutes(app);
// registerInterviewRoutes(app);
// registerResponseRoutes(app);
// registerReviewRoutes(app);

export default app;

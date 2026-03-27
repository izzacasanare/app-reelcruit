import type { Hono } from 'hono';
import * as responsesDomain from '../domain/responses.domain.ts';
import * as jobsDomain from '../domain/jobs.domain.ts';
import { db } from '../db.ts';
import { responses } from '../schema.ts';
import { eq } from 'drizzle-orm';
import { db } from '../db.ts';
import { reviews } from '../schema.ts';

export function registerReviewRoutes(app: Hono) {

  // GET /api/review/:jobId — full candidate list with responses for review dashboard
  app.get('/api/review/:jobId', async (c) => {
    const jobId = c.req.param('jobId');
    const job = await jobsDomain.getJob(jobId);
    if (!job) return c.json({ error: 'Job not found' }, 404);

    const results = await responsesDomain.getResponsesForJob(jobId);
    return c.json({ job, results });
  });

  // POST /api/review/:jobId/score/:responseId — transcribe + AI score
  app.post('/api/review/:jobId/score/:responseId', async (c) => {
    const { jobId, responseId } = c.req.param();
    const body = await c.req.json();
    if (!body.questionText) return c.json({ error: 'questionText is required' }, 400);

    const job = await jobsDomain.getJob(jobId);
    if (!job) return c.json({ error: 'Job not found' }, 404);

    // transcribeAndScore handles fetching the blob, transcribing, then scoring
    const result = await responsesDomain.transcribeAndScore(
      responseId,
      job.title,
      body.questionText,
    );
    if (!result) return c.json({ error: 'Response not found' }, 404);
    return c.json(result);
  });

  // POST /api/review/:jobId/satisfaction — hiring manager rates AI accuracy
  app.post('/api/review/:jobId/satisfaction', async (c) => {
    const body = await c.req.json();
    if (!body.candidateId || !body.score) {
      return c.json({ error: 'candidateId and score are required' }, 400);
    }

    const [created] = await db.insert(reviews).values({
      jobId:             c.req.param('jobId'),
      candidateId:       body.candidateId,
      satisfactionScore: Math.min(5, Math.max(1, body.score)),
      notes:             body.notes ?? null,
    }).returning();

    return c.json(created, 201);
  });
}

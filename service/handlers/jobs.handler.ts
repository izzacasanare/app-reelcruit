import type { Hono } from 'hono';
import * as jobsDomain from '../domain/jobs.domain.ts';

export function registerJobRoutes(app: Hono) {

  // GET /api/jobs
  app.get('/api/jobs', async (c) => {
    const jobs = await jobsDomain.listJobs();
    return c.json({ jobs });
  });

  // GET /api/jobs/:id
  app.get('/api/jobs/:id', async (c) => {
    const job = await jobsDomain.getJob(c.req.param('id'));
    if (!job) return c.json({ error: 'Job not found' }, 404);
    return c.json(job);
  });

  // POST /api/jobs/generate-questions
  app.post('/api/jobs/generate-questions', async (c) => {
    const body = await c.req.json();
    if (!body.title || !body.description) {
      return c.json({ error: 'title and description are required' }, 400);
    }
    const questions = await jobsDomain.generateQuestions(body.title, body.description);
    return c.json({ questions });
  });

  // POST /api/jobs
  app.post('/api/jobs', async (c) => {
    const body = await c.req.json();
    if (!body.title || !body.description) {
      return c.json({ error: 'title and description are required' }, 400);
    }
    const job = await jobsDomain.createJob({
      title:       body.title,
      description: body.description,
      questions:   Array.isArray(body.questions) ? body.questions : [],
    });
    return c.json(job, 201);
  });

  // PUT /api/jobs/:id
  app.put('/api/jobs/:id', async (c) => {
    const body = await c.req.json();
    const job = await jobsDomain.updateJob(c.req.param('id'), body);
    if (!job) return c.json({ error: 'Job not found' }, 404);
    return c.json(job);
  });

  // DELETE /api/jobs/:id
  app.delete('/api/jobs/:id', async (c) => {
    const deleted = await jobsDomain.deleteJob(c.req.param('id'));
    if (!deleted) return c.json({ error: 'Job not found' }, 404);
    return c.json({ deleted: true, id: deleted.id });
  });
}

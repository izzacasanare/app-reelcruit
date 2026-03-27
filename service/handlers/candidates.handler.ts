import type { Hono } from 'hono';
import * as candidatesDomain from '../domain/candidates.domain.ts';

export function registerCandidateRoutes(app: Hono) {

  // GET /api/jobs/:jobId/candidates
  app.get('/api/jobs/:jobId/candidates', async (c) => {
    const candidates = await candidatesDomain.listCandidatesByJob(c.req.param('jobId'));
    return c.json({ candidates });
  });

  // GET /api/candidates/by-token/:token
  app.get('/api/candidates/by-token/:token', async (c) => {
    const candidate = await candidatesDomain.getCandidateByToken(c.req.param('token'));
    if (!candidate) return c.json({ error: 'Invalid interview link' }, 404);
    return c.json(candidate);
  });

  // POST /api/jobs/:jobId/candidates
  app.post('/api/jobs/:jobId/candidates', async (c) => {
    const body = await c.req.json();
    if (!body.name || !body.email) {
      return c.json({ error: 'name and email are required' }, 400);
    }
    const candidate = await candidatesDomain.createCandidate({
      jobId: c.req.param('jobId'),
      name:  body.name,
      email: body.email,
    });
    return c.json(candidate, 201);
  });

  // DELETE /api/candidates/:id
  app.delete('/api/candidates/:id', async (c) => {
    const deleted = await candidatesDomain.deleteCandidate(c.req.param('id'));
    if (!deleted) return c.json({ error: 'Candidate not found' }, 404);
    return c.json({ deleted: true, id: deleted.id });
  });
}

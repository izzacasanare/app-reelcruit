import type { Hono } from 'hono';
import * as interviewsDomain from '../domain/interviews.domain.ts';
import * as candidatesDomain from '../domain/candidates.domain.ts';
import * as jobsDomain from '../domain/jobs.domain.ts';

export function registerInterviewRoutes(app: Hono) {

  // GET /api/interview/:token — load everything a candidate needs to start
  app.get('/api/interview/:token', async (c) => {
    const candidate = await candidatesDomain.getCandidateByToken(c.req.param('token'));
    if (!candidate) return c.json({ error: 'Invalid or expired interview link' }, 404);

    const job = await jobsDomain.getJob(candidate.jobId);
    if (!job) return c.json({ error: 'Job not found' }, 404);

    return c.json({
      candidate: {
        id:     candidate.id,
        name:   candidate.name,
        status: candidate.status,
      },
      job: {
        id:        job.id,
        title:     job.title,
        questions: job.questions,
      },
    });
  });

  // POST /api/interview/:token/start
  app.post('/api/interview/:token/start', async (c) => {
    const candidate = await candidatesDomain.getCandidateByToken(c.req.param('token'));
    if (!candidate) return c.json({ error: 'Invalid interview link' }, 404);

    const existing = await interviewsDomain.getInterviewByCandidate(candidate.id);
    if (existing) return c.json(existing);

    const interview = await interviewsDomain.startInterview(candidate.id);
    return c.json(interview, 201);
  });

  // POST /api/interview/:token/response — save one video response
  app.post('/api/interview/:token/response', async (c) => {
    const candidate = await candidatesDomain.getCandidateByToken(c.req.param('token'));
    if (!candidate) return c.json({ error: 'Invalid interview link' }, 404);

    const body = await c.req.json();
    if (body.questionIndex === undefined || !body.questionText || !body.videoBlob) {
      return c.json({ error: 'questionIndex, questionText, and videoBlob are required' }, 400);
    }

    const interview = await interviewsDomain.getInterviewByCandidate(candidate.id);
    if (!interview) return c.json({ error: 'Interview not started' }, 400);

    const response = await interviewsDomain.saveResponse({
      interviewId:   interview.id,
      questionIndex: body.questionIndex,
      questionText:  body.questionText,
      videoBlob:     body.videoBlob,
    });

    return c.json(response, 201);
  });

  // POST /api/interview/:token/complete
  app.post('/api/interview/:token/complete', async (c) => {
    const candidate = await candidatesDomain.getCandidateByToken(c.req.param('token'));
    if (!candidate) return c.json({ error: 'Invalid interview link' }, 404);

    const interview = await interviewsDomain.getInterviewByCandidate(candidate.id);
    if (!interview) return c.json({ error: 'Interview not started' }, 400);

    const completed = await interviewsDomain.completeInterview(interview.id, candidate.id);
    return c.json(completed);
  });
}

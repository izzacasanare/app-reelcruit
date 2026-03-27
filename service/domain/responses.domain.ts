import { db } from '../db.ts';
import { responses, interviews, candidates } from '../schema.ts';
import { eq } from 'drizzle-orm';

export async function getResponsesForCandidate(candidateId: string) {
  const interview = await db.select().from(interviews).where(eq(interviews.candidateId, candidateId));
  if (!interview[0]) return [];
  return db.select().from(responses).where(eq(responses.interviewId, interview[0].id));
}

export async function scoreResponse(responseId: string, jobTitle: string, questionText: string, transcript: string) {
  const prompt = `You are an expert technical recruiter evaluating a candidate's video interview response for an MSP (Managed Service Provider).

Job title: ${jobTitle}
Question asked: ${questionText}
Candidate's response transcript: ${transcript}

Evaluate this response and return ONLY a JSON object with no preamble or markdown:
{
  "score": <integer 1-10>,
  "summary": "<2-3 sentence summary of what the candidate said and how strong their answer was>"
}

Scoring guide:
- 9-10: Exceptional — specific examples, deep knowledge, clear communication
- 7-8: Strong — good answer, relevant experience, minor gaps
- 5-6: Average — adequate but vague, lacks specifics
- 3-4: Weak — off-topic, unclear, or missing key points
- 1-2: Very poor — no relevant content`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  const text = data.content?.[0]?.text ?? '{}';

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    const score   = Math.min(10, Math.max(1, Math.round(parsed.score)));
    const summary = parsed.summary ?? '';

    await db.update(responses).set({ aiScore: score, aiSummary: summary }).where(eq(responses.id, responseId));
    return { score, summary };
  } catch {
    return { score: 5, summary: 'Could not generate summary for this response.' };
  }
}

export async function getResponsesForJob(jobId: string) {
  const jobCandidates = await db.select().from(candidates).where(eq(candidates.jobId, jobId));
  const results = [];

  for (const candidate of jobCandidates) {
    const interview = await db.select().from(interviews).where(eq(interviews.candidateId, candidate.id));
    if (!interview[0]) continue;

    const candidateResponses = await db.select().from(responses).where(eq(responses.interviewId, interview[0].id));
    results.push({ candidate, interview: interview[0], responses: candidateResponses });
  }

  return results;
}

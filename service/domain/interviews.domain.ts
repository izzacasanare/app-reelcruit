import { db } from '../db.ts';
import { interviews, responses, candidates } from '../schema.ts';
import { eq } from 'drizzle-orm';

export async function startInterview(candidateId: string) {
  const [created] = await db.insert(interviews).values({
    candidateId,
  }).returning();

  await db.update(candidates)
    .set({ status: 'in_progress' })
    .where(eq(candidates.id, candidateId));

  return created;
}

export async function getInterview(id: string) {
  const [interview] = await db.select().from(interviews).where(eq(interviews.id, id));
  return interview ?? null;
}

export async function getInterviewByCandidate(candidateId: string) {
  const [interview] = await db.select().from(interviews).where(eq(interviews.candidateId, candidateId));
  return interview ?? null;
}

export async function saveResponse(data: {
  interviewId: string;
  questionIndex: number;
  questionText: string;
  videoBlob: string;
}) {
  const [created] = await db.insert(responses).values({
    interviewId:   data.interviewId,
    questionIndex: data.questionIndex,
    questionText:  data.questionText,
    videoBlob:     data.videoBlob,
  }).returning();
  return created;
}

export async function completeInterview(interviewId: string, candidateId: string) {
  const [updated] = await db.update(interviews)
    .set({ completedAt: new Date() })
    .where(eq(interviews.id, interviewId))
    .returning();

  await db.update(candidates)
    .set({ status: 'completed' })
    .where(eq(candidates.id, candidateId));

  return updated ?? null;
}

export async function getResponsesByInterview(interviewId: string) {
  return db.select().from(responses).where(eq(responses.interviewId, interviewId));
}

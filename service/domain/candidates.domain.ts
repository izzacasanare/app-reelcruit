import { db } from '../db.ts';
import { candidates } from '../schema.ts';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

export async function listCandidatesByJob(jobId: string) {
  return db.select().from(candidates).where(eq(candidates.jobId, jobId));
}

export async function getCandidate(id: string) {
  const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
  return candidate ?? null;
}

export async function getCandidateByToken(token: string) {
  const [candidate] = await db.select().from(candidates).where(eq(candidates.linkToken, token));
  return candidate ?? null;
}

export async function createCandidate(data: { jobId: string; name: string; email: string }) {
  const linkToken = crypto.randomUUID().replace(/-/g, '');
  const [created] = await db.insert(candidates).values({
    jobId:     data.jobId,
    name:      data.name,
    email:     data.email,
    linkToken,
    status:    'pending',
  }).returning();
  return created;
}

export async function updateCandidateStatus(id: string, status: string) {
  const [updated] = await db.update(candidates).set({ status }).where(eq(candidates.id, id)).returning();
  return updated ?? null;
}

export async function deleteCandidate(id: string) {
  const [deleted] = await db.delete(candidates).where(eq(candidates.id, id)).returning();
  return deleted ?? null;
}

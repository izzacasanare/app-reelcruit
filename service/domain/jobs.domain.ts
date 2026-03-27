import { db } from '../db.ts';
import { jobs } from '../schema.ts';
import { eq } from 'drizzle-orm';
import type { NewJob } from '../schema.ts';

// --- AI Question Generation ---
export async function generateQuestions(title: string, description: string): Promise<string[]> {
  const prompt = `You are an expert technical recruiter for MSPs (Managed Service Providers).

Generate exactly 5 screening interview questions for the following role. The questions should:
- Be specific to the role and reveal real competency
- Be open-ended (not yes/no)
- Be answerable in 2–3 minutes via video
- Mix technical skill questions with situational/behavioural ones
- Be appropriate for a first-round async video screen

Role: ${title}
Description: ${description}

Respond ONLY with a JSON array of 5 question strings. No preamble, no markdown, no explanation.
Example format: ["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  const text = data.content?.[0]?.text ?? '[]';

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {
    // fallback questions if parsing fails
  }

  return [
    `Tell me about your experience relevant to the ${title} role.`,
    'Describe a time you had to troubleshoot a complex technical issue under pressure.',
    'How do you prioritise when multiple clients need urgent help at the same time?',
    'What tools or systems are you most comfortable working with, and why?',
    'Where do you see yourself growing in this type of role over the next year?',
  ];
}

// --- CRUD ---
export async function listJobs() {
  return db.select().from(jobs).orderBy(jobs.createdAt);
}

export async function getJob(id: string) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
  return job ?? null;
}

export async function createJob(data: { title: string; description: string; questions: string[] }) {
  const [created] = await db.insert(jobs).values({
    title:       data.title,
    description: data.description,
    questions:   data.questions,
  }).returning();
  return created;
}

export async function updateJob(id: string, data: { title?: string; description?: string; questions?: string[] }) {
  const [updated] = await db.update(jobs).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(jobs.id, id)).returning();
  return updated ?? null;
}

export async function deleteJob(id: string) {
  const [deleted] = await db.delete(jobs).where(eq(jobs.id, id)).returning();
  return deleted ?? null;
}

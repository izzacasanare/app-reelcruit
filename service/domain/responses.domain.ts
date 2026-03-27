import { db } from '../db.ts';
import { responses, interviews, candidates } from '../schema.ts';
import { eq } from 'drizzle-orm';

export async function getResponsesForCandidate(candidateId: string) {
  const interview = await db.select().from(interviews).where(eq(interviews.candidateId, candidateId));
  if (!interview[0]) return [];
  return db.select().from(responses).where(eq(responses.interviewId, interview[0].id));
}

// --- Transcription via Whisper ---
async function transcribeVideo(videoBlob: string): Promise<string> {
  try {
    // videoBlob is a base64 data URL — extract the raw base64
    const base64 = videoBlob.split(',')[1];
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const formData = new FormData();
    const audioBlob = new Blob([bytes], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY') ?? ''}` },
      body: formData,
    });

    if (!res.ok) return '';
    const data = await res.json();
    return data.text ?? '';
  } catch {
    return '';
  }
}

// --- AI Scoring via Claude ---
export async function scoreResponse(
  responseId: string,
  jobTitle: string,
  questionText: string,
  transcript: string,
) {
  const hasTranscript = transcript.trim().length > 20;

  const prompt = `You are an expert technical recruiter evaluating a candidate's video interview response for an MSP (Managed Service Provider).

Job title: ${jobTitle}
Question asked: ${questionText}
${hasTranscript
    ? `Candidate's response transcript:\n"${transcript}"`
    : `Note: No transcript available. Evaluate based on the question context and typical candidate responses for this role.`
  }

Return ONLY a JSON object — no preamble, no markdown:
{
  "score": <integer 1-10>,
  "summary": "<2-3 sentences summarising what the candidate said and how strong their answer was>"
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  const text = data.content?.[0]?.text ?? '{}';

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    const score   = Math.min(10, Math.max(1, Math.round(parsed.score)));
    const summary = parsed.summary ?? '';
    await db.update(responses).set({ aiScore: score, aiSummary: summary, transcript }).where(eq(responses.id, responseId));
    return { score, summary, transcript };
  } catch {
    return { score: 5, summary: 'Could not generate summary for this response.', transcript };
  }
}

// --- Transcribe + Score together ---
export async function transcribeAndScore(
  responseId: string,
  jobTitle: string,
  questionText: string,
) {
  // 1. Fetch the saved response to get the videoBlob
  const [response] = await db.select().from(responses).where(eq(responses.id, responseId));
  if (!response) return null;

  // 2. Transcribe if we have a video and no existing transcript
  let transcript = response.transcript ?? '';
  if (!transcript && response.videoBlob) {
    transcript = await transcribeVideo(response.videoBlob);
  }

  // 3. Score with whatever transcript we have
  return scoreResponse(responseId, jobTitle, questionText, transcript);
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

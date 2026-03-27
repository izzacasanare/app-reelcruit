import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Spinner, Badge,
  Card, CardContent,
  Empty, EmptyHeader, EmptyTitle,
} from '@mspbots/ui';
import { ArrowLeft, Play, Star, ChevronDown, ChevronUp, Wand2, Users } from 'lucide-react';

type ResponseRow = {
  id: string;
  questionIndex: number;
  questionText: string;
  videoBlob: string | null;
  transcript: string | null;
  aiScore: number | null;
  aiSummary: string | null;
};

type CandidateResult = {
  candidate: { id: string; name: string; email: string; status: string };
  interview:  { id: string; completedAt: string | null };
  responses:  ResponseRow[];
};

type Job = { id: string; title: string; questions: string[] };

function scoreColor(score: number | null): string {
  if (!score) return 'var(--color-text-secondary)';
  if (score >= 8) return '#0F6E56';
  if (score >= 5) return '#854F0B';
  return '#A32D2D';
}

function scoreBg(score: number | null): string {
  if (!score) return 'var(--color-background-secondary)';
  if (score >= 8) return '#E1F5EE';
  if (score >= 5) return '#FAEEDA';
  return '#FCEBEB';
}

function avgScore(responses: ResponseRow[]): number | null {
  const scored = responses.filter(r => r.aiScore !== null);
  if (!scored.length) return null;
  return Math.round(scored.reduce((s, r) => s + r.aiScore!, 0) / scored.length);
}

export default function ReviewDashboard() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [satisfaction, setSatisfaction] = useState<Record<string, number>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => { fetchReview(); }, [jobId]);

  async function fetchReview() {
    setLoading(true);
    const res = await $fetch(`/api/review/${jobId}`);
    const data = await res.json();
    setJob(data.job);
    setResults(data.results ?? []);
    setLoading(false);
  }

  async function scoreAllResponses(candidateId: string, responses: ResponseRow[]) {
    setScoringId(candidateId);
    for (const r of responses) {
      if (r.aiScore !== null) continue;
      const transcript = r.transcript ?? '[No transcript available — score based on question context]';
      await $fetch(`/api/review/${jobId}/score/${r.id}`, {
        method: 'POST',
        body: JSON.stringify({ questionText: r.questionText, transcript }),
        headers: { 'Content-Type': 'application/json' },
      });
    }
    setScoringId(null);
    fetchReview();
  }

  async function submitSatisfaction(candidateId: string, score: number) {
    setSatisfaction(s => ({ ...s, [candidateId]: score }));
    await $fetch(`/api/review/${jobId}/satisfaction`, {
      method: 'POST',
      body: JSON.stringify({ candidateId, score }),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  function playVideo(responseId: string, blobData: string) {
    setPlayingVideo(responseId);
    const vid = videoRefs.current[responseId];
    if (vid && blobData) {
      vid.src = blobData;
      vid.play();
    }
  }

  const completed = results.filter(r => r.candidate.status === 'completed');

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <Spinner />
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/jobs/${jobId}`)} style={{ marginBottom: 12, paddingLeft: 0 }}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} />Back to job
        </Button>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>{job?.title}</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Review candidate responses
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '2rem' }}>
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '1rem' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Total candidates</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{results.length}</div>
        </div>
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '1rem' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Completed interviews</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: '#0F6E56' }}>{completed.length}</div>
        </div>
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '1rem' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Completion rate</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>
            {results.length > 0 ? Math.round((completed.length / results.length) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* No completed candidates */}
      {completed.length === 0 && (
        <Empty>
          <EmptyHeader>
            <Users size={28} />
            <EmptyTitle>No completed interviews yet</EmptyTitle>
          </EmptyHeader>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Candidates will appear here once they complete their async interview.
          </p>
        </Empty>
      )}

      {/* Candidate list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {completed.map(({ candidate, responses: resps }) => {
          const avg = avgScore(resps);
          const isExpanded = expandedCandidate === candidate.id;
          const isScoring = scoringId === candidate.id;
          const hasScores = resps.some(r => r.aiScore !== null);
          const allScored = resps.length > 0 && resps.every(r => r.aiScore !== null);

          return (
            <Card key={candidate.id}>
              {/* Candidate header row */}
              <CardContent style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-background-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: 'var(--color-text-info)', flexShrink: 0 }}>
                      {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{candidate.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{candidate.email}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {avg !== null && (
                      <div style={{ background: scoreBg(avg), borderRadius: 'var(--border-radius-md)', padding: '4px 12px', fontSize: 13, fontWeight: 500, color: scoreColor(avg) }}>
                        {avg}/10
                      </div>
                    )}
                    {!allScored && (
                      <Button variant="outline" size="sm" onClick={() => scoreAllResponses(candidate.id, resps)} disabled={isScoring}>
                        {isScoring
                          ? <><Spinner size={13} style={{ marginRight: 4 }} />Scoring...</>
                          : <><Wand2 size={13} style={{ marginRight: 4 }} />AI score</>
                        }
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setExpandedCandidate(isExpanded ? null : candidate.id)}>
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </Button>
                  </div>
                </div>

                {/* Expanded responses */}
                {isExpanded && (
                  <div style={{ marginTop: 16, borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {resps
                      .sort((a, b) => a.questionIndex - b.questionIndex)
                      .map(r => (
                        <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                            Q{r.questionIndex + 1}
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.5 }}>
                            {r.questionText}
                          </p>

                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            {/* Video player */}
                            {r.videoBlob && (
                              <div style={{ flexShrink: 0 }}>
                                {playingVideo === r.id ? (
                                  <video
                                    ref={el => videoRefs.current[r.id] = el}
                                    controls
                                    style={{ width: 240, borderRadius: 8, background: '#000' }}
                                  />
                                ) : (
                                  <button
                                    onClick={() => playVideo(r.id, r.videoBlob!)}
                                    style={{ width: 240, height: 135, borderRadius: 8, background: '#1a1a1a', border: '0.5px solid var(--color-border-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                                  >
                                    <Play size={24} />
                                    <span style={{ fontSize: 12 }}>Play response</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* AI summary + score */}
                            <div style={{ flex: 1, minWidth: 180 }}>
                              {r.aiScore !== null && (
                                <>
                                  <div style={{ display: 'inline-flex', background: scoreBg(r.aiScore), borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 500, color: scoreColor(r.aiScore), marginBottom: 8 }}>
                                    Score: {r.aiScore}/10
                                  </div>
                                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                    {r.aiSummary}
                                  </p>
                                </>
                              )}
                              {r.aiScore === null && (
                                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                                  Click "AI score" to generate a summary for this response.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                    {/* Satisfaction rating */}
                    {allScored && (
                      <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Rate AI accuracy:</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={() => submitSatisfaction(candidate.id, star)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                            >
                              <Star
                                size={18}
                                fill={(satisfaction[candidate.id] ?? 0) >= star ? '#EF9F27' : 'none'}
                                stroke={(satisfaction[candidate.id] ?? 0) >= star ? '#EF9F27' : 'var(--color-border-secondary)'}
                              />
                            </button>
                          ))}
                        </div>
                        {satisfaction[candidate.id] && (
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Thanks for the feedback</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

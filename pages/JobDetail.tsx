import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Input, Spinner, Badge,
  Card, CardHeader, CardTitle, CardContent,
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Field, FieldLabel, FieldContent,
  Empty, EmptyHeader, EmptyTitle,
} from '@mspbots/ui';
import { ArrowLeft, Copy, Check, Plus, Trash2, Users, ListChecks } from 'lucide-react';

type Job = {
  id: string;
  title: string;
  description: string;
  questions: string[];
  createdAt: string;
};

type Candidate = {
  id: string;
  name: string;
  email: string;
  linkToken: string;
  status: string;
  createdAt: string;
};

const STATUS_COLOR: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
  pending:     'secondary',
  in_progress: 'warning',
  completed:   'success',
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add candidate dialog
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, [id]);

  async function fetchAll() {
    setLoading(true);
    const [jobRes, candRes] = await Promise.all([
      $fetch(`/api/jobs/${id}`),
      $fetch(`/api/jobs/${id}/candidates`),
    ]);
    const jobData = await jobRes.json();
    const candData = await candRes.json();
    setJob(jobData);
    setCandidates(candData.candidates ?? []);
    setLoading(false);
  }

  async function handleAddCandidate() {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    await $fetch(`/api/jobs/${id}/candidates`, {
      method: 'POST',
      body: JSON.stringify({ name, email }),
      headers: { 'Content-Type': 'application/json' },
    });
    setSaving(false);
    setOpen(false);
    setName('');
    setEmail('');
    fetchAll();
  }

  async function handleDelete(candidateId: string) {
    await $fetch(`/api/candidates/${candidateId}`, { method: 'DELETE' });
    fetchAll();
  }

  function getInterviewUrl(token: string) {
    return `${window.location.origin}/interview/${token}`;
  }

  async function copyLink(token: string, candidateId: string) {
    await navigator.clipboard.writeText(getInterviewUrl(token));
    setCopiedId(candidateId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const completed = candidates.filter(c => c.status === 'completed').length;
  const pending   = candidates.filter(c => c.status === 'pending').length;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <Spinner />
    </div>
  );

  if (!job) return (
    <div style={{ padding: '2rem' }}>
      <p style={{ color: 'var(--color-text-secondary)' }}>Job not found.</p>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')} style={{ marginBottom: 12, paddingLeft: 0 }}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} />Back to jobs
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>{job.title}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Created {new Date(job.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={14} style={{ marginRight: 6 }} />Add candidate</Button>
            </DialogTrigger>
            <DialogContent style={{ maxWidth: 440 }}>
              <DialogHeader>
                <DialogTitle>Add a candidate</DialogTitle>
              </DialogHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field>
                  <FieldLabel>Full name</FieldLabel>
                  <FieldContent>
                    <Input
                      placeholder="Jane Smith"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <FieldContent>
                    <Input
                      type="email"
                      placeholder="jane@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </FieldContent>
                </Field>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleAddCandidate} disabled={!name.trim() || !email.trim() || saving}>
                  {saving ? <Spinner size={14} style={{ marginRight: 6 }} /> : null}
                  {saving ? 'Adding...' : 'Add & generate link'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '2rem' }}>
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '1rem', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Total candidates</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{candidates.length}</div>
        </div>
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '1rem', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Completed</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--color-text-success)' }}>{completed}</div>
        </div>
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '1rem', flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Awaiting response</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{pending}</div>
        </div>
      </div>

      {/* Questions */}
      <Card style={{ marginBottom: '2rem' }}>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
            <ListChecks size={16} />Interview questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {job.questions.map((q, i) => (
              <li key={i} style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>{q}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Candidates */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} />Candidates
        </h2>

        {candidates.length === 0 && (
          <Empty>
            <EmptyHeader>
              <Users size={28} />
              <EmptyTitle>No candidates yet</EmptyTitle>
            </EmptyHeader>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Add a candidate to generate their unique interview link.
            </p>
          </Empty>
        )}

        {candidates.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {candidates.map(candidate => (
              <Card key={candidate.id}>
                <CardContent style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{candidate.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{candidate.email}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Badge variant={STATUS_COLOR[candidate.status] ?? 'secondary'}>
                        {candidate.status.replace('_', ' ')}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(candidate.linkToken, candidate.id)}
                      >
                        {copiedId === candidate.id
                          ? <><Check size={13} style={{ marginRight: 4 }} />Copied</>
                          : <><Copy size={13} style={{ marginRight: 4 }} />Copy link</>
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(candidate.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

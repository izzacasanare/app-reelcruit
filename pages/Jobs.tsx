import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Input, Textarea, Spinner,
  Card, CardHeader, CardTitle, CardContent,
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Field, FieldLabel, FieldContent,
  Badge, Empty, EmptyHeader, EmptyTitle,
} from '@mspbots/ui';
import { Plus, Briefcase, ChevronRight, Trash2, Wand2 } from 'lucide-react';

type Question = string;
type Job = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
};

export default function Jobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Create job dialog state
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'form' | 'questions'>('form');

  useEffect(() => { fetchJobs(); }, []);

  async function fetchJobs() {
    setLoading(true);
    const res = await $fetch('/api/jobs');
    const data = await res.json();
    setJobs(data.jobs ?? []);
    setLoading(false);
  }

  async function handleGenerateQuestions() {
    if (!title.trim() || !description.trim()) return;
    setGenerating(true);
    const res = await $fetch('/api/jobs/generate-questions', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setGenerating(false);
    setStep('questions');
  }

  async function handleSaveJob() {
    setSaving(true);
    await $fetch('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ title, description, questions }),
      headers: { 'Content-Type': 'application/json' },
    });
    setSaving(false);
    setOpen(false);
    resetForm();
    fetchJobs();
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await $fetch(`/api/jobs/${id}`, { method: 'DELETE' });
    fetchJobs();
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setQuestions([]);
    setStep('form');
  }

  function updateQuestion(i: number, val: string) {
    setQuestions(q => q.map((v, idx) => idx === i ? val : v));
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Jobs</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Create a job to start screening candidates with async video interviews.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus size={16} style={{ marginRight: 6 }} />New job</Button>
          </DialogTrigger>
          <DialogContent style={{ maxWidth: 560 }}>
            <DialogHeader>
              <DialogTitle>{step === 'form' ? 'Create a job' : 'Review questions'}</DialogTitle>
            </DialogHeader>

            {step === 'form' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field>
                  <FieldLabel>Job title</FieldLabel>
                  <FieldContent>
                    <Input
                      placeholder="e.g. IT Support Technician Level 1"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Job description</FieldLabel>
                  <FieldContent>
                    <Textarea
                      placeholder="Describe the role, key responsibilities, required skills..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={5}
                    />
                  </FieldContent>
                </Field>
              </div>
            )}

            {step === 'questions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  AI generated these questions for <strong>{title}</strong>. Edit any before saving.
                </p>
                {questions.map((q, i) => (
                  <Field key={i}>
                    <FieldLabel>Question {i + 1}</FieldLabel>
                    <FieldContent>
                      <Textarea
                        value={q}
                        onChange={e => updateQuestion(i, e.target.value)}
                        rows={2}
                      />
                    </FieldContent>
                  </Field>
                ))}
              </div>
            )}

            <DialogFooter>
              {step === 'form' && (
                <>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleGenerateQuestions} disabled={!title.trim() || !description.trim() || generating}>
                    {generating ? <Spinner size={14} style={{ marginRight: 6 }} /> : <Wand2 size={14} style={{ marginRight: 6 }} />}
                    {generating ? 'Generating...' : 'Generate questions'}
                  </Button>
                </>
              )}
              {step === 'questions' && (
                <>
                  <Button variant="outline" onClick={() => setStep('form')}>Back</Button>
                  <Button onClick={handleSaveJob} disabled={saving}>
                    {saving ? <Spinner size={14} style={{ marginRight: 6 }} /> : null}
                    {saving ? 'Saving...' : 'Save job'}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Spinner />
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <Empty>
          <EmptyHeader>
            <Briefcase size={32} />
            <EmptyTitle>No jobs yet</EmptyTitle>
          </EmptyHeader>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Create your first job to start screening candidates.
          </p>
        </Empty>
      )}

      {!loading && jobs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map(job => (
            <Card
              key={job.id}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/jobs/${job.id}`)}
            >
              <CardHeader style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <CardTitle style={{ fontSize: 16 }}>{job.title}</CardTitle>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {(job.questions as string[]).length} questions · Created {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge variant="secondary">{(job.questions as string[]).length} questions</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => handleDelete(job.id, e)}
                  >
                    <Trash2 size={14} />
                  </Button>
                  <ChevronRight size={16} style={{ color: 'var(--color-text-secondary)' }} />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

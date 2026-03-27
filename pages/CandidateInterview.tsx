import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Spinner } from '@mspbots/ui';
import { Video, Mic, StopCircle, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';

type InterviewData = {
  candidate: { id: string; name: string; status: string };
  job: { id: string; title: string; questions: string[] };
};

type Stage =
  | 'loading'
  | 'error'
  | 'already_done'
  | 'welcome'
  | 'camera_check'
  | 'question'
  | 'saving'
  | 'done';

export default function CandidateInterview() {
  const { token } = useParams<{ token: string }>();

  const [stage, setStage] = useState<Stage>('loading');
  const [data, setData] = useState<InterviewData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [savingMsg, setSavingMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadInterview();
    return () => stopStream();
  }, []);

  async function loadInterview() {
    try {
      const res = await $fetch(`/api/interview/${token}`);
      if (!res.ok) { setErrorMsg('This interview link is invalid or has expired.'); setStage('error'); return; }
      const d: InterviewData = await res.json();
      if (d.candidate.status === 'completed') { setStage('already_done'); return; }
      setData(d);
      setStage('welcome');
    } catch {
      setErrorMsg('Could not load your interview. Please check your connection and try again.');
      setStage('error');
    }
  }

  async function startInterview() {
    await $fetch(`/api/interview/${token}/start`, { method: 'POST' });
    setStage('camera_check');
    startCamera();
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; }
    } catch {
      setErrorMsg('Could not access your camera or microphone. Please allow access and refresh.');
      setStage('error');
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function beginQuestion() {
    setStage('question');
    setTimeLeft(120);
    if (!streamRef.current) startCamera();
    setTimeout(() => startRecording(), 500);
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp8,opus' });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start(1000);
    mediaRecorderRef.current = mr;
    setRecording(true);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { stopRecording(); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
    setTimeout(() => saveResponse(), 800);
  }

  async function saveResponse() {
    setStage('saving');
    setSavingMsg('Saving your response...');

    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    const base64 = await blobToBase64(blob);
    const questions = data!.job.questions as string[];

    await $fetch(`/api/interview/${token}/response`, {
      method: 'POST',
      body: JSON.stringify({
        questionIndex,
        questionText: questions[questionIndex],
        videoBlob: base64,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const isLast = questionIndex >= questions.length - 1;

    if (isLast) {
      setSavingMsg('Finishing up your interview...');
      await $fetch(`/api/interview/${token}/complete`, { method: 'POST' });
      stopStream();
      setStage('done');
    } else {
      setQuestionIndex(i => i + 1);
      setStage('question');
      setTimeLeft(120);
      setTimeout(() => startRecording(), 500);
    }
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function formatTime(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  const questions = data?.job.questions as string[] ?? [];
  const progress = questions.length > 0 ? ((questionIndex) / questions.length) * 100 : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      color: '#fff',
    }}>

      {/* Loading */}
      {stage === 'loading' && (
        <div style={{ textAlign: 'center' }}>
          <Spinner />
          <p style={{ marginTop: 12, color: '#888', fontSize: 14 }}>Loading your interview...</p>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && (
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <AlertCircle size={40} style={{ color: '#E24B4A', marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6 }}>{errorMsg}</p>
        </div>
      )}

      {/* Already done */}
      {stage === 'already_done' && (
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <CheckCircle size={40} style={{ color: '#1D9E75', marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Interview already completed</h2>
          <p style={{ color: '#888', fontSize: 14 }}>You've already submitted your responses for this role. Thank you!</p>
        </div>
      )}

      {/* Welcome */}
      {stage === 'welcome' && data && (
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Video size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 8 }}>Hi {data.candidate.name}</h1>
          <p style={{ color: '#888', fontSize: 15, marginBottom: 4 }}>You're interviewing for</p>
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 500, marginBottom: 24 }}>{data.job.title}</p>
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '1.25rem', marginBottom: 28, textAlign: 'left' }}>
            <p style={{ fontSize: 13, color: '#aaa', marginBottom: 12 }}>Here's how it works:</p>
            {[
              `You'll answer ${questions.length} questions on video`,
              'Each question has up to 2 minutes — take your time',
              'Recording starts automatically when each question appears',
              'You can stop early when you\'re done answering',
            ].map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13, color: '#ccc', alignItems: 'flex-start' }}>
                <span style={{ color: '#1D9E75', fontWeight: 500, flexShrink: 0 }}>{i + 1}.</span>
                {tip}
              </div>
            ))}
          </div>
          <Button onClick={startInterview} style={{ background: '#1D9E75', color: '#fff', border: 'none', padding: '10px 28px', fontSize: 15, borderRadius: 8 }}>
            Start interview <ChevronRight size={16} style={{ marginLeft: 4 }} />
          </Button>
        </div>
      )}

      {/* Camera check */}
      {stage === 'camera_check' && (
        <div style={{ textAlign: 'center', maxWidth: 560, width: '100%' }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 6 }}>Camera check</h2>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>Make sure you're well lit and your audio is working.</p>
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#1a1a1a', marginBottom: 20, aspectRatio: '16/9' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          </div>
          <Button onClick={beginQuestion} style={{ background: '#1D9E75', color: '#fff', border: 'none', padding: '10px 28px', fontSize: 15, borderRadius: 8 }}>
            Looks good — start <ChevronRight size={16} style={{ marginLeft: 4 }} />
          </Button>
        </div>
      )}

      {/* Question + Recording */}
      {stage === 'question' && data && (
        <div style={{ maxWidth: 600, width: '100%' }}>
          {/* Progress */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 6 }}>
              <span>Question {questionIndex + 1} of {questions.length}</span>
              <span style={{ color: timeLeft < 30 ? '#E24B4A' : '#888' }}>{formatTime(timeLeft)}</span>
            </div>
            <div style={{ height: 3, background: '#222', borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${progress + (1 / questions.length) * 100}%`, background: '#1D9E75', borderRadius: 99, transition: 'width 0.3s' }} />
            </div>
          </div>

          {/* Video feed */}
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#1a1a1a', marginBottom: 20, aspectRatio: '16/9' }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            {recording && (
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(226,75,74,0.9)', borderRadius: 99, padding: '4px 10px', fontSize: 12, fontWeight: 500 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }} />
                REC
              </div>
            )}
          </div>

          {/* Question card */}
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Question {questionIndex + 1}</p>
            <p style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.6, color: '#fff' }}>{questions[questionIndex]}</p>
          </div>

          {/* Stop button */}
          {recording && (
            <div style={{ textAlign: 'center' }}>
              <Button onClick={stopRecording} style={{ background: 'transparent', border: '1px solid #444', color: '#ccc', padding: '9px 24px', borderRadius: 8, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <StopCircle size={15} />
                Done answering
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Saving */}
      {stage === 'saving' && (
        <div style={{ textAlign: 'center' }}>
          <Spinner />
          <p style={{ marginTop: 12, color: '#888', fontSize: 14 }}>{savingMsg}</p>
        </div>
      )}

      {/* Done */}
      {stage === 'done' && (
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <CheckCircle size={48} style={{ color: '#1D9E75', marginBottom: 20 }} />
          <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 10 }}>Interview complete</h1>
          <p style={{ color: '#888', fontSize: 15, lineHeight: 1.7 }}>
            Thank you for completing your interview. The hiring team will review your responses and be in touch soon.
          </p>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}

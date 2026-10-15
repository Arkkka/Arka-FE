import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { AiSummaryDto, GameMetrics } from '@/schemas/index.ts';
import { Button, buttonClassName } from '@/components/index.ts';
import { AiSummaryPanels } from '@/components/AiSummaryPanels';
import { GameResultChart } from '@/components/GameResultChart';
import { ResultStats } from '@/components/ResultStats';
import { GAME_MODES } from '@/constants/game-modes.ts';
import { goNoGoTargetAudioUrl, type GoNoGoStimulus } from '@/constants/go-no-go-stimuli.ts';
import { gameModeFromSlug, ROUTES } from '@/constants/routes.ts';
import {
  GoNoGoBoard,
  MotorGripBoard,
  SequenceBoard,
  type EncouragementState,
  type SessionSnapshot,
} from './GameFlow.tsx';
import { playCountdownTone, playStartTone, resumeGameAudio, SEQUENCE_TILES } from './GameTutorial.tsx';

type DemoStage = 'countdown' | 'playing' | 'paused' | 'finished';
type GripSample = { elapsedSecond: number; gripPercent: number; kilograms: number };
type GoOutcome = { level: 1 | 2; outcome: 'HIT' | 'MISS' | 'FALSE_POSITIVE'; reactionMs: number | null };

const MOTOR_GRIP_PROFILE = [38, 52, 64, 73, 81, 87, 91, 94, 97, 100, 100, 98, 95, 92, 94, 97, 100, 100, 98, 95, 92, 94, 96, 93, 90, 87, 84, 80, 74, 68] as const;
const GO_NO_GO_REACTIONS = [742, 681, 705, 634, 658, 612, 589, 621, 574, 603] as const;
const SEQUENCE_RESPONSE_DELAY_MS = 520;
const SEQUENCE_RESPONSE_STEP_MS = 430;

function longestTargetHold(samples: readonly GripSample[], targetKilograms: number): number {
  let longest = 0;
  let current = 0;
  for (const sample of samples) {
    current = sample.kilograms >= targetKilograms ? current + 1_000 : 0;
    longest = Math.max(longest, current);
  }
  return Math.min(longest, 5_000);
}

function primeHtmlAudio(src: string): void {
  const audio = new Audio(src);
  audio.volume = 0;
  void audio.play().then(() => {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }).catch(() => undefined);
}

function Countdown({ value }: { value: number }) {
  return (
    <section aria-live="polite" className="grid min-h-[32rem] place-items-center text-center">
      <div><p className="landing-eyebrow">Peserta Demo</p><p className="m-0 text-[8rem] leading-none font-black text-accent">{value}</p><h1 className="mt-5 mb-0 text-4xl font-black">Bersiap</h1><p className="mt-3 mb-0 text-lg text-muted">Permainan belum dimulai.</p></div>
    </section>
  );
}

function previewSummary(metrics: GameMetrics, score: number): AiSummaryDto {
  if (metrics.mode === 'MOTOR_GRIP') return { status: 'READY', participant: { summaryText: `Anda menyelesaikan latihan genggaman dengan skor ${score}. Beban tertinggi mencapai ${metrics.peakKilograms.toFixed(2)} kilogram.`, observations: [`Beban rata-rata ${metrics.averageKilograms.toFixed(2)} kilogram.`, `Tahanan terpanjang ${(metrics.continuousHoldMs / 1000).toFixed(1)} detik.`, metrics.targetCompleted ? 'Target kekuatan berhasil tercapai.' : 'Target kekuatan belum tercapai pada sesi ini.'] }, clinician: { summaryText: `Preview Motor Grip menghasilkan skor ${score} dengan puncak ${metrics.peakKilograms.toFixed(2)} kg dan rata-rata ${metrics.averageKilograms.toFixed(2)} kg.`, observations: [`Durasi sesi ${(metrics.sessionElapsedMs / 1000).toFixed(1)} detik.`, `Waktu pada atau di atas target ${(metrics.timeAtOrAboveTargetMs / 1000).toFixed(1)} detik.`, 'Data ini berasal dari input simulasi, bukan sensor IoT.'] } };
  if (metrics.mode === 'GO_NO_GO') return { status: 'READY', participant: { summaryText: `Anda menyelesaikan latihan perhatian dengan skor ${score} dan akurasi ${Math.round(metrics.accuracyPercent)} persen.`, observations: [`Respons benar ${metrics.hits} kali.`, `Target terlewat ${metrics.misses} kali.`, `Genggaman keliru ${metrics.falsePositives} kali.`] }, clinician: { summaryText: `Preview Go-No-Go menghasilkan akurasi ${Math.round(metrics.accuracyPercent)}% pada ${metrics.totalTrials} soal.`, observations: [`Hit ${metrics.hits}, miss ${metrics.misses}, false positive ${metrics.falsePositives}.`, `Rata-rata reaksi ${metrics.meanHitReactionMs === null ? 'belum tersedia' : `${Math.round(metrics.meanHitReactionMs)} ms`}.`, 'Data ini berasal dari input simulasi, bukan sensor IoT.'] } };
  return { status: 'READY', participant: { summaryText: `Anda menyelesaikan latihan memori dengan skor ${score} hingga urutan ${metrics.maxSequenceLength} warna.`, observations: [`Level selesai ${metrics.completedLevels}.`, `Percobaan salah ${metrics.wrongAttempts}.`, `Kehabisan waktu ${metrics.timedOutAttempts} kali.`] }, clinician: { summaryText: `Preview Sequence Memory mencapai rentang maksimum ${metrics.maxSequenceLength} dengan ${metrics.completedLevels} level selesai.`, observations: [`Percobaan salah ${metrics.wrongAttempts}.`, `Rata-rata respons pertama ${metrics.meanFirstResponseMs === null ? 'belum tersedia' : `${Math.round(metrics.meanFirstResponseMs)} ms`}.`, 'Data ini berasal dari respons simulasi otomatis, bukan perangkat IoT.'] } };
}

function PreviewResult({ metrics, onReplay, score }: { metrics: GameMetrics; onReplay: () => void; score: number }) {
  const summary = previewSummary(metrics, score);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-white text-ink">
      <section aria-labelledby="preview-result-title" className="mx-auto grid min-h-full w-full max-w-[78rem] gap-3 px-4 py-5 sm:px-6 lg:px-8">
        <header><p className="landing-eyebrow">Preview selesai</p><h1 className="m-0 text-3xl font-black tracking-[-0.05em] sm:text-4xl" id="preview-result-title">Hasil sesi Peserta Demo</h1><p className="mt-1 mb-0 text-sm font-bold text-muted">Hasil simulasi ini tidak disimpan dan bukan diagnosis atau rekomendasi terapi.</p></header>
        <div><ResultStats metrics={metrics} score={score} /><GameResultChart metrics={metrics} /><div className="mt-3"><AiSummaryPanels summary={summary} /></div></div>
        <div className="flex flex-wrap gap-2 pb-8"><Button onClick={onReplay}><RotateCcw aria-hidden className="size-5" />Main lagi</Button><Link className={buttonClassName('secondary')} to={ROUTES.progressBoard}>Lihat Progress Board</Link><Link className={buttonClassName('quiet')} to={ROUTES.dashboard}>Kembali ke dashboard</Link></div>
      </section>
    </div>
  );
}

function PlayingShell({ children, onFinish, onPause, title }: { children: ReactNode; onFinish: () => void; onPause: () => void; title: string }) {
  return (
    <section aria-labelledby="game-title" className="grid h-full min-h-0 grid-rows-[auto_1fr]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-divider pb-3"><div><p className="m-0 text-sm font-black text-muted">Peserta Demo · Simulasi otomatis</p><h1 className="mt-1 mb-0 text-3xl font-black" id="game-title">{title}</h1></div><div className="flex flex-wrap items-center gap-2"><Button onClick={onPause} variant="secondary"><Pause aria-hidden className="size-5" />Jeda</Button><button className={buttonClassName('danger')} onClick={onFinish} type="button">Akhiri sesi</button></div></div>
      <div className="min-h-0 overflow-hidden pt-4">{children}</div>
    </section>
  );
}

function Paused({ onFinish, onResume, title }: { onFinish: () => void; onResume: () => void; title: string }) {
  return (
    <section aria-labelledby="game-title" className="grid h-full min-h-0 grid-rows-[auto_1fr]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-divider pb-3"><div><p className="m-0 text-sm font-black text-muted">Peserta Demo · Preview tanpa IoT</p><h1 className="mt-1 mb-0 text-3xl font-black" id="game-title">{title}</h1></div><div className="flex gap-2"><Button onClick={onResume} variant="secondary"><Play aria-hidden className="size-5" />Lanjutkan</Button><button className={buttonClassName('danger')} onClick={onFinish} type="button">Akhiri sesi</button></div></div>
      <div className="mt-7 grid min-h-96 place-items-center rounded-md border-2 border-divider text-center"><div><Pause aria-hidden className="mx-auto size-12 text-muted" /><h2 className="mt-4 mb-0 text-4xl font-black">Dijeda</h2><p className="mt-3 mb-0 text-lg text-muted">Waktu dan penilaian berhenti.</p></div></div>
    </section>
  );
}

function MotorGripPreview() {
  const [stage, setStage] = useState<DemoStage>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [grip, setGrip] = useState(0);
  const [samples, setSamples] = useState<GripSample[]>([]);
  const gripRef = useRef(0);
  const encouragementAudioRef = useRef<HTMLAudioElement | null>(null);
  const encouragementStateRef = useRef<EncouragementState>({ started: false, halfway: false, finalFive: false, lastPromptSecond: -10, lastCueSrc: null });
  const selected = GAME_MODES[0];

  useEffect(() => {
    const audio = new Audio();
    encouragementAudioRef.current = audio;
    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      encouragementAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (stage !== 'countdown') return;
    const timer = window.setTimeout(() => {
      if (countdown > 1) {
        const next = countdown - 1;
        setCountdown(next);
        playCountdownTone(next);
      } else {
        playStartTone();
        setStage('playing');
      }
    }, 1_000);
    return () => window.clearTimeout(timer);
  }, [countdown, stage]);

  useEffect(() => {
    if (stage !== 'playing') return;
    const timer = window.setInterval(() => {
      setElapsedMs((current) => {
        const next = Math.min(30_000, current + 100);
        const sampleIndex = Math.min(MOTOR_GRIP_PROFILE.length - 1, Math.floor(next / 1_000));
        const targetGrip = MOTOR_GRIP_PROFILE[sampleIndex]!;
        const nextGrip = Math.round((gripRef.current + Math.sign(targetGrip - gripRef.current) * Math.min(4, Math.abs(targetGrip - gripRef.current))) * 10) / 10;
        gripRef.current = nextGrip;
        setGrip(nextGrip);
        if (Math.floor(next / 1_000) > Math.floor(current / 1_000)) {
          setSamples((currentSamples) => [...currentSamples, { elapsedSecond: Math.floor(next / 1_000), gripPercent: targetGrip, kilograms: targetGrip / 20 }]);
        }
        if (next >= 30_000) setStage('finished');
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'playing') encouragementAudioRef.current?.pause();
  }, [stage]);

  function start() {
    resumeGameAudio();
    primeHtmlAudio('/audio/game-mode1/encouragement/started-1.m4a');
    encouragementStateRef.current = { started: false, halfway: false, finalFive: false, lastPromptSecond: -10, lastCueSrc: null };
    gripRef.current = 0;
    setElapsedMs(0);
    setGrip(0);
    setSamples([]);
    setCountdown(3);
    playCountdownTone(3);
    setStage('countdown');
  }

  const kilograms = grip / 20;
  const averageKilograms = samples.length > 0 ? samples.reduce((total, sample) => total + sample.kilograms, 0) / samples.length : 0;
  const peakKilograms = Math.max(0, ...samples.map((sample) => sample.kilograms));
  const motorScore = Math.round((Math.min(1, averageKilograms / 5) * 0.7 + Math.min(1, peakKilograms / 5) * 0.3) * 1000);
  const motorMetrics: Extract<GameMetrics, { mode: 'MOTOR_GRIP' }> = { mode: 'MOTOR_GRIP', fruitVariant: 'ORANGE', targetKilograms: 5, peakGripPercent: Math.max(0, ...samples.map((sample) => sample.gripPercent)), peakKilograms, averageKilograms, continuousHoldMs: longestTargetHold(samples, 5), timeAtOrAboveTargetMs: samples.filter((sample) => sample.kilograms >= 5).length * 1_000, targetCompleted: peakKilograms >= 5, sessionElapsedMs: elapsedMs, gripSamples: samples };
  const snapshot: SessionSnapshot = {
    status: 'PLAYING', mode: 'MOTOR_GRIP', displayName: 'Peserta Demo', countdown: null, result: null, message: 'Permainan berlangsung',
    visual: { mode: 'MOTOR_GRIP', gripPercent: grip, kilograms, holdProgressMs: kilograms >= 3 ? Math.min(elapsedMs, 5_000) : 0, activeElapsedMs: elapsedMs, remainingMs: 30_000 - elapsedMs, gripSamples: samples, fruitVariant: 'ORANGE', targetKilograms: 5, averageKilograms: samples.length ? samples.reduce((total, sample) => total + sample.kilograms, 0) / samples.length : kilograms, timeAtOrAboveTargetMs: samples.filter((sample) => sample.kilograms >= 5).length * 1_000, message: 'Simulasi genggaman otomatis' },
  };

  if (stage === 'countdown') return <Countdown value={countdown} />;
  if (stage === 'finished') return <PreviewResult metrics={motorMetrics} onReplay={start} score={motorScore} />;
  if (stage === 'paused') return <Paused onFinish={() => setStage('finished')} onResume={() => setStage('playing')} title={selected.title} />;

  return <PlayingShell onFinish={() => setStage('finished')} onPause={() => setStage('paused')} title={selected.title}><MotorGripBoard encouragementAudioRef={encouragementAudioRef} encouragementStateRef={encouragementStateRef} fruit="ORANGE" snapshot={snapshot} /></PlayingShell>;
}

type Candidate = { stimulus: GoNoGoStimulus; assetIndex: number; targetAppearance: 1 | 2 | null };
type Question = { target: GoNoGoStimulus; targetAssetIndex: number; candidates: readonly Candidate[] };
type GoPhase = 'TARGET_PREVIEW' | 'NEXT_QUESTION' | 'CANDIDATE_GAP' | 'STIMULUS';

const GO_QUESTIONS: readonly Question[] = [
  { target: 'WAYANG', targetAssetIndex: 0, candidates: [{ stimulus: 'BATIK', assetIndex: 0, targetAppearance: null }, { stimulus: 'WAYANG', assetIndex: 2, targetAppearance: 1 }, { stimulus: 'CANDI', assetIndex: 1, targetAppearance: null }, { stimulus: 'WAYANG', assetIndex: 1, targetAppearance: 2 }] },
  { target: 'CANDI', targetAssetIndex: 0, candidates: [{ stimulus: 'MONAS', assetIndex: 1, targetAppearance: null }, { stimulus: 'CANDI', assetIndex: 2, targetAppearance: 1 }, { stimulus: 'ANGKLUNG', assetIndex: 0, targetAppearance: null }, { stimulus: 'CANDI', assetIndex: 3, targetAppearance: 2 }] },
  { target: 'BATIK', targetAssetIndex: 1, candidates: [{ stimulus: 'WAYANG', assetIndex: 3, targetAppearance: null }, { stimulus: 'BATIK', assetIndex: 2, targetAppearance: 1 }, { stimulus: 'MONAS', assetIndex: 2, targetAppearance: null }, { stimulus: 'BATIK', assetIndex: 0, targetAppearance: 2 }] },
  { target: 'ANGKLUNG', targetAssetIndex: 2, candidates: [{ stimulus: 'CANDI', assetIndex: 3, targetAppearance: null }, { stimulus: 'ANGKLUNG', assetIndex: 0, targetAppearance: 1 }, { stimulus: 'WAYANG', assetIndex: 0, targetAppearance: null }, { stimulus: 'ANGKLUNG', assetIndex: 3, targetAppearance: 2 }] },
  { target: 'MONAS', targetAssetIndex: 0, candidates: [{ stimulus: 'BATIK', assetIndex: 3, targetAppearance: null }, { stimulus: 'MONAS', assetIndex: 2, targetAppearance: 1 }, { stimulus: 'ANGKLUNG', assetIndex: 1, targetAppearance: null }, { stimulus: 'MONAS', assetIndex: 1, targetAppearance: 2 }] },
  { target: 'WAYANG', targetAssetIndex: 1, candidates: [{ stimulus: 'CANDI', assetIndex: 0, targetAppearance: null }, { stimulus: 'WAYANG', assetIndex: 3, targetAppearance: 1 }, { stimulus: 'BATIK', assetIndex: 1, targetAppearance: null }, { stimulus: 'WAYANG', assetIndex: 0, targetAppearance: 2 }] },
  { target: 'BATIK', targetAssetIndex: 3, candidates: [{ stimulus: 'ANGKLUNG', assetIndex: 2, targetAppearance: null }, { stimulus: 'BATIK', assetIndex: 0, targetAppearance: 1 }, { stimulus: 'MONAS', assetIndex: 3, targetAppearance: null }, { stimulus: 'BATIK', assetIndex: 2, targetAppearance: 2 }] },
  { target: 'CANDI', targetAssetIndex: 1, candidates: [{ stimulus: 'WAYANG', assetIndex: 2, targetAppearance: null }, { stimulus: 'CANDI', assetIndex: 3, targetAppearance: 1 }, { stimulus: 'ANGKLUNG', assetIndex: 3, targetAppearance: null }, { stimulus: 'CANDI', assetIndex: 0, targetAppearance: 2 }] },
  { target: 'MONAS', targetAssetIndex: 2, candidates: [{ stimulus: 'BATIK', assetIndex: 1, targetAppearance: null }, { stimulus: 'MONAS', assetIndex: 0, targetAppearance: 1 }, { stimulus: 'WAYANG', assetIndex: 1, targetAppearance: null }, { stimulus: 'MONAS', assetIndex: 3, targetAppearance: 2 }] },
  { target: 'ANGKLUNG', targetAssetIndex: 0, candidates: [{ stimulus: 'CANDI', assetIndex: 2, targetAppearance: null }, { stimulus: 'ANGKLUNG', assetIndex: 3, targetAppearance: 1 }, { stimulus: 'BATIK', assetIndex: 2, targetAppearance: null }, { stimulus: 'ANGKLUNG', assetIndex: 1, targetAppearance: 2 }] },
];

function GoNoGoPreview() {
  const [stage, setStage] = useState<DemoStage>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [goPhase, setGoPhase] = useState<GoPhase>('TARGET_PREVIEW');
  const [correctTrials, setCorrectTrials] = useState(0);
  const [outcomes, setOutcomes] = useState<GoOutcome[]>([]);
  const [audioElements] = useState(() => ({ target: new Audio(goNoGoTargetAudioUrl(GO_QUESTIONS[0]!.target)), transition: new Audio('/audio/game-mode2/targets/next-question.m4a') }));
  const selected = GAME_MODES[1];
  const question = GO_QUESTIONS[questionIndex]!;
  const candidate = question.candidates[candidateIndex]!;

  const finishQuestion = useCallback((outcome?: GoOutcome) => {
    if (outcome) setOutcomes((current) => [...current, outcome]);
    if (questionIndex >= GO_QUESTIONS.length - 1) {
      setStage('finished');
      return;
    }
    setQuestionIndex((current) => current + 1);
    setCandidateIndex(0);
    setGoPhase('NEXT_QUESTION');
  }, [questionIndex]);

  useEffect(() => {
    if (stage !== 'countdown') return;
    const timer = window.setTimeout(() => {
      if (countdown > 1) setCountdown((current) => current - 1);
      else setStage('playing');
    }, 1_000);
    return () => window.clearTimeout(timer);
  }, [countdown, stage]);

  useEffect(() => {
    if (stage !== 'playing') return;
    const timer = window.setInterval(() => setElapsedMs((current) => Math.min(180_000, current + 100)), 100);
    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'playing') return;
    const delay = goPhase === 'TARGET_PREVIEW' ? 3_000 : goPhase === 'NEXT_QUESTION' ? 2_600 : goPhase === 'CANDIDATE_GAP' ? 500 : questionIndex < 5 ? 3_000 : 2_000;
    const timer = window.setTimeout(() => {
      if (goPhase === 'TARGET_PREVIEW') setGoPhase('CANDIDATE_GAP');
      else if (goPhase === 'NEXT_QUESTION') setGoPhase('TARGET_PREVIEW');
      else if (goPhase === 'CANDIDATE_GAP') {
        setGoPhase('STIMULUS');
      } else if (candidateIndex < question.candidates.length - 1) {
        setCandidateIndex((current) => current + 1);
      } else finishQuestion({ level: questionIndex < 5 ? 1 : 2, outcome: 'MISS', reactionMs: null });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [candidateIndex, finishQuestion, goPhase, question.candidates.length, questionIndex, stage]);

  function start() {
    void resumeGameAudio();
    for (const audio of Object.values(audioElements)) {
      audio.preload = 'auto';
      audio.volume = 0;
      void audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1;
      }).catch(() => { audio.volume = 1; });
    }
    setElapsedMs(0);
    setQuestionIndex(0);
    setCandidateIndex(0);
    setCorrectTrials(0);
    setOutcomes([]);
    setGoPhase('TARGET_PREVIEW');
    setCountdown(3);
    setStage('countdown');
  }

  useEffect(() => {
    if (stage !== 'playing' || goPhase !== 'STIMULUS' || candidate.stimulus !== question.target || questionIndex === 6) return;
    const reactionMs = GO_NO_GO_REACTIONS[questionIndex]!;
    const timer = window.setTimeout(() => {
      setCorrectTrials((current) => current + 1);
      finishQuestion({ level: questionIndex < 5 ? 1 : 2, outcome: 'HIT', reactionMs });
    }, reactionMs);
    return () => window.clearTimeout(timer);
  }, [candidate.stimulus, finishQuestion, goPhase, question.target, questionIndex, stage]);

  const hits = outcomes.filter((outcome) => outcome.outcome === 'HIT').length;
  const misses = outcomes.filter((outcome) => outcome.outcome === 'MISS').length;
  const falsePositives = outcomes.filter((outcome) => outcome.outcome === 'FALSE_POSITIVE').length;
  const hitReactionTimes = outcomes.flatMap((outcome) => outcome.reactionMs === null ? [] : [outcome.reactionMs]);
  const meanHitReactionMs = hitReactionTimes.length > 0 ? hitReactionTimes.reduce((total, value) => total + value, 0) / hitReactionTimes.length : null;
  const accuracyPercent = outcomes.length > 0 ? hits / outcomes.length * 100 : 0;
  const levelBreakdown = ([1, 2] as const).map((level) => {
    const levelOutcomes = outcomes.filter((outcome) => outcome.level === level);
    const levelHits = levelOutcomes.filter((outcome) => outcome.outcome === 'HIT').length;
    const levelMisses = levelOutcomes.filter((outcome) => outcome.outcome === 'MISS').length;
    const levelFalsePositives = levelOutcomes.filter((outcome) => outcome.outcome === 'FALSE_POSITIVE').length;
    const reactions = levelOutcomes.flatMap((outcome) => outcome.reactionMs === null ? [] : [outcome.reactionMs]);
    return { level, stimulusDurationMs: level === 1 ? 3_000 : 2_000, totalTrials: levelOutcomes.length, hits: levelHits, misses: levelMisses, falsePositives: levelFalsePositives, correctRejections: 0, accuracyPercent: levelOutcomes.length > 0 ? levelHits / levelOutcomes.length * 100 : 0, meanHitReactionMs: reactions.length > 0 ? reactions.reduce((total, value) => total + value, 0) / reactions.length : null };
  });
  const goNoGoMetrics: Extract<GameMetrics, { mode: 'GO_NO_GO' }> = { mode: 'GO_NO_GO', totalTrials: outcomes.length, targetTrials: outcomes.length, nonTargetTrials: 0, hits, misses, falsePositives, correctRejections: 0, accuracyPercent, meanHitReactionMs, levelBreakdown };
  const goNoGoScore = Math.round(accuracyPercent * 10);
  const visualPhase = goPhase === 'TARGET_PREVIEW' ? 'TARGET_PREVIEW' : goPhase === 'STIMULUS' ? 'STIMULUS' : 'TRANSITION';
  const snapshot: SessionSnapshot = {
    status: 'PLAYING', mode: 'GO_NO_GO', displayName: 'Peserta Demo', countdown: null, result: null, message: 'Permainan berlangsung',
    visual: { mode: 'GO_NO_GO', trialNumber: questionIndex + 1, questionNumber: questionIndex + 1, totalQuestions: 10, level: questionIndex < 5 ? 1 : 2, levelTrialNumber: questionIndex % 5 + 1, levelQuestionNumber: questionIndex % 5 + 1, levelTrialCount: 5, totalLevels: 2, targetStimulus: question.target, targetAssetIndex: question.targetAssetIndex, stimulus: visualPhase === 'TARGET_PREVIEW' ? question.target : visualPhase === 'STIMULUS' ? candidate.stimulus : null, assetIndex: visualPhase === 'TARGET_PREVIEW' ? question.targetAssetIndex : visualPhase === 'STIMULUS' ? candidate.assetIndex : null, candidateIndex: visualPhase === 'STIMULUS' || goPhase === 'CANDIDATE_GAP' ? candidateIndex : null, candidateNumber: visualPhase === 'STIMULUS' || goPhase === 'CANDIDATE_GAP' ? candidateIndex + 1 : null, targetAppearance: visualPhase === 'STIMULUS' ? candidate.targetAppearance : null, phase: visualPhase, activeElapsedMs: elapsedMs, remainingMs: 180_000 - elapsedMs, feedback: null, correctTrials },
  };

  if (stage === 'countdown') return <Countdown value={countdown} />;
  if (stage === 'finished') return <PreviewResult metrics={goNoGoMetrics} onReplay={start} score={goNoGoScore} />;
  if (stage === 'paused') return <Paused onFinish={() => setStage('finished')} onResume={() => setStage('playing')} title={selected.title} />;

  return <PlayingShell onFinish={() => setStage('finished')} onPause={() => setStage('paused')} title={selected.title}><GoNoGoBoard audioElements={audioElements} snapshot={snapshot} /></PlayingShell>;
}

type SequenceCode = (typeof SEQUENCE_TILES)[number]['code'];
type SequencePhase = 'EXAMPLE' | 'RESPONSE' | 'FEEDBACK';

const SEQUENCE_LEVELS: readonly (readonly SequenceCode[])[] = [
  ['RED'],
  ['RED', 'BLUE'],
  ['RED', 'BLUE', 'GREEN'],
  ['RED', 'BLUE', 'GREEN', 'YELLOW'],
  ['RED', 'BLUE', 'GREEN', 'YELLOW', 'BLUE'],
  ['RED', 'BLUE', 'GREEN', 'YELLOW', 'BLUE', 'RED'],
];

function SequenceMemoryPreview() {
  const [stage, setStage] = useState<DemoStage>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [levelIndex, setLevelIndex] = useState(0);
  const [phase, setPhase] = useState<SequencePhase>('EXAMPLE');
  const [cueIndex, setCueIndex] = useState<number | null>(null);
  const [responseIndex, setResponseIndex] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [feedback, setFeedback] = useState<'CORRECT' | 'REPEAT' | null>(null);
  const [completedLevels, setCompletedLevels] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [timedOutAttempts, setTimedOutAttempts] = useState(0);
  const [latencies, setLatencies] = useState<{ level: number; latencyMs: number }[]>([]);
  const [attemptNumber, setAttemptNumber] = useState(0);
  const responseStartedAtRef = useRef(0);
  const firstResponseLatencyRef = useRef<number | null>(null);
  const selected = GAME_MODES[2];
  const sequence = SEQUENCE_LEVELS[levelIndex]!;

  const beginExample = useCallback(() => {
    setPhase('EXAMPLE');
    setCueIndex(null);
    setResponseIndex(0);
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (stage !== 'countdown') return;
    const timer = window.setTimeout(() => {
      if (countdown > 1) {
        const next = countdown - 1;
        setCountdown(next);
        playCountdownTone(next);
      } else {
        playStartTone();
        setStage('playing');
        beginExample();
      }
    }, 1_000);
    return () => window.clearTimeout(timer);
  }, [beginExample, countdown, stage]);

  useEffect(() => {
    if (stage !== 'playing' || phase !== 'EXAMPLE') return;
    const timers: number[] = [];
    setCueIndex(null);
    sequence.forEach((_, index) => {
      const startsAt = 1_200 + index * 2_350;
      timers.push(window.setTimeout(() => setCueIndex(index), startsAt));
      timers.push(window.setTimeout(() => setCueIndex(null), startsAt + 2_000));
    });
    const exampleDuration = 1_200 + sequence.length * 2_000 + Math.max(0, sequence.length - 1) * 350;
    timers.push(window.setTimeout(() => {
      responseStartedAtRef.current = performance.now();
      firstResponseLatencyRef.current = null;
      setPhase('RESPONSE');
    }, exampleDuration));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [attemptNumber, levelIndex, phase, sequence, stage]);

  useEffect(() => {
    if (stage !== 'playing' || phase !== 'FEEDBACK') return;
    const timer = window.setTimeout(() => {
      if (feedback === 'REPEAT') {
        setAttemptNumber((current) => current + 1);
        beginExample();
      }
    }, 750);
    return () => window.clearTimeout(timer);
  }, [beginExample, feedback, phase, stage]);

  useEffect(() => {
    if (stage !== 'playing' || phase !== 'RESPONSE') return;
    const timer = window.setTimeout(() => {
      const nextAttempts = remainingAttempts - 1;
      setTimedOutAttempts((current) => current + 1);
      setRemainingAttempts(nextAttempts);
      if (nextAttempts <= 0) {
        setStage('finished');
        return;
      }
      setFeedback('REPEAT');
      setPhase('FEEDBACK');
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [phase, remainingAttempts, stage]);

  function start() {
    void resumeGameAudio();
    setLevelIndex(0);
    setCompletedLevels(0);
    setWrongAttempts(0);
    setTimedOutAttempts(0);
    setLatencies([]);
    setAttemptNumber(0);
    setRemainingAttempts(3);
    setResponseIndex(0);
    setFeedback(null);
    setCountdown(3);
    playCountdownTone(3);
    setStage('countdown');
  }

  function press(code: SequenceCode) {
    if (stage !== 'playing' || phase !== 'RESPONSE') return;
    if (responseIndex === 0 && firstResponseLatencyRef.current === null) firstResponseLatencyRef.current = Math.max(0, performance.now() - responseStartedAtRef.current);
    if (code !== sequence[responseIndex]) {
      const nextAttempts = remainingAttempts - 1;
      setWrongAttempts((current) => current + 1);
      setRemainingAttempts(nextAttempts);
      if (nextAttempts <= 0) {
        setStage('finished');
        return;
      }
      setFeedback('REPEAT');
      setPhase('FEEDBACK');
      return;
    }
    const nextResponseIndex = responseIndex + 1;
    if (nextResponseIndex < sequence.length) {
      setResponseIndex(nextResponseIndex);
      setFeedback('CORRECT');
      return;
    }
    const latencyMs = firstResponseLatencyRef.current ?? Math.max(0, performance.now() - responseStartedAtRef.current);
    setLatencies((current) => [...current, { level: sequence.length, latencyMs }]);
    setCompletedLevels((current) => current + 1);
    if (levelIndex >= SEQUENCE_LEVELS.length - 1) {
      setStage('finished');
      return;
    }
    setLevelIndex((current) => current + 1);
    setRemainingAttempts(3);
    setAttemptNumber(0);
    beginExample();
  }

  useEffect(() => {
    if (stage !== 'playing' || phase !== 'RESPONSE') return;
    const expectedCode = sequence[responseIndex]!;
    const shouldMiss = levelIndex === 3 && responseIndex === 1 && wrongAttempts === 0;
    const responseCode = shouldMiss ? SEQUENCE_TILES.find((tile) => tile.code !== expectedCode)!.code : expectedCode;
    const timer = window.setTimeout(() => press(responseCode), responseIndex === 0 ? SEQUENCE_RESPONSE_DELAY_MS : SEQUENCE_RESPONSE_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [levelIndex, phase, responseIndex, sequence, stage, wrongAttempts]);

  const sequenceMetrics: Extract<GameMetrics, { mode: 'SEQUENCE_MEMORY' }> = { mode: 'SEQUENCE_MEMORY', maxSequenceLength: completedLevels > 0 ? SEQUENCE_LEVELS[Math.min(completedLevels - 1, SEQUENCE_LEVELS.length - 1)]!.length : 0, completedLevels, wrongAttempts, timedOutAttempts, multiButtonAttempts: 0, meanFirstResponseMs: latencies.length > 0 ? latencies.reduce((total, item) => total + item.latencyMs, 0) / latencies.length : null, meanInterButtonMs: null, levelLatencies: latencies, completionReason: completedLevels >= SEQUENCE_LEVELS.length ? 'LEVEL_CAP_REACHED' : 'LIVES_EXHAUSTED' };
  const sequenceScore = Math.max(0, Math.min(1000, 125 * sequenceMetrics.maxSequenceLength + 20 * completedLevels - 50 * wrongAttempts - 25 * timedOutAttempts));
  const activeItem = phase === 'EXAMPLE' && cueIndex !== null ? sequence[cueIndex] ?? null : null;
  const snapshot: SessionSnapshot = { status: 'PLAYING', mode: 'SEQUENCE_MEMORY', displayName: 'Peserta Demo', countdown: null, result: null, message: 'Permainan berlangsung', visual: { mode: 'SEQUENCE_MEMORY', phase, activeItem, activeIndex: cueIndex, cueId: activeItem && cueIndex !== null ? `${levelIndex}:${attemptNumber}:${cueIndex}` : null, sequenceLength: sequence.length, responseIndex, remainingAttempts, errorIndex: feedback === 'REPEAT' ? responseIndex : null, feedback } };

  if (stage === 'countdown') return <Countdown value={countdown} />;
  if (stage === 'finished') return <PreviewResult metrics={sequenceMetrics} onReplay={start} score={sequenceScore} />;
  if (stage === 'paused') return <Paused onFinish={() => setStage('finished')} onResume={() => setStage('playing')} title={selected.title} />;

  return <PlayingShell onFinish={() => setStage('finished')} onPause={() => setStage('paused')} title={selected.title}><SequenceBoard snapshot={snapshot} /></PlayingShell>;
}

export function GamePreviewPage() {
  const { mode: modeSlug } = useParams();
  const mode = gameModeFromSlug(modeSlug);
  if (!mode) return <Navigate replace to={ROUTES.dashboard} />;
  return <div className="relative min-h-dvh w-full overflow-x-hidden bg-white px-4 py-3 text-ink sm:px-8 lg:px-12"><main className="min-h-[calc(100dvh-1.5rem)] outline-none" id="preview-main" tabIndex={-1}>{mode === 'MOTOR_GRIP' ? <MotorGripPreview /> : mode === 'GO_NO_GO' ? <GoNoGoPreview /> : <SequenceMemoryPreview />}</main></div>;
}

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { m } from 'framer-motion';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Gamepad2, Hand, Pause, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { AppServerMessage, GameMode } from '@/schemas/index.ts';
import { Button, buttonClassName } from '@/components/index.ts';
import { AiSummaryPanels } from '@/components/AiSummaryPanels';
import { GameResultChart } from '@/components/GameResultChart';
import { ResultStats } from '@/components/ResultStats';
import { SqueezableFruit, type FruitVariant } from '@/components/SqueezableFruit';
import { messageOf } from '@/config/api-client.ts';
import { GAME_MODES } from '@/constants/game-modes.ts';
import { goNoGoStimulusAssetAt, goNoGoTargetAudioUrl, preloadGoNoGoImages, type GoNoGoStimulus } from '@/constants/go-no-go-stimuli.ts';
import { ROUTES } from '@/constants/routes.ts';
import { useCancelPreparationMutation, useCreateGameSessionMutation, useCreatePreparationMutation, useGameSessionQuery } from '@/hooks/games';
import { useSessionSocket, useSetupSocket } from '@/hooks/realtime';
import {
  GameParticipantEntry,
  GameTutorial,
  playCountdownTone,
  playSequenceTone,
  playStartTone,
  resumeGameAudio,
  SEQUENCE_TILES,
  type GameParticipantIdentity,
} from './GameTutorial.tsx';

export type SessionSnapshot = Extract<AppServerMessage, { type: 'session.snapshot' }>['payload'];
type SetupSnapshot = Extract<AppServerMessage, { type: 'setup.snapshot' }>['payload'];

type GripSample = { elapsedSecond: number; gripPercent: number; kilograms: number };

function playTurnCue(): void {
  const audio = new Audio('/turn.m4a');
  const stopCue = window.setTimeout(() => {
    audio.pause();
    audio.currentTime = 0;
  }, 2_500);
  audio.addEventListener('ended', () => window.clearTimeout(stopCue), { once: true });
  void audio.play().catch(() => window.clearTimeout(stopCue));
}

function formatCountdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function SessionCountdown({ remainingMs, totalMs }: { remainingMs: number; totalMs: number }) {
  const urgent = remainingMs <= 10_000;
  return <div className={`inline-flex min-w-36 items-center gap-3 rounded-md px-4 py-3 text-left ${urgent ? 'bg-danger-soft text-danger' : 'bg-ink text-white'}`} role="timer"><Clock3 aria-hidden className="size-7" /><span><span className="block text-xs font-black tracking-[0.1em] uppercase">Sisa waktu</span><strong className="block text-3xl leading-none tabular-nums">{formatCountdown(remainingMs)}</strong></span><span aria-hidden className="h-12 w-1 overflow-hidden rounded-full bg-white/25"><span className="block w-full origin-bottom bg-current transition-transform duration-100" style={{ height: '100%', transform: `scaleY(${Math.max(0, Math.min(remainingMs / totalMs, 1))})` }} /></span></div>;
}

function GripLineChart({ samples, compact = false }: { samples: readonly GripSample[]; compact?: boolean }) {
  const width = 640;
  const height = compact ? 150 : 250;
  const left = 46;
  const right = 18;
  const top = 24;
  const bottom = 34;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxKilograms = Math.max(5, Math.ceil(Math.max(0, ...samples.map((sample) => sample.kilograms))));
  const ticks = Array.from({ length: 6 }, (_, index) => maxKilograms * index / 5);
  const points = samples.map((sample) => ({ ...sample, x: left + ((sample.elapsedSecond - 1) / 29) * plotWidth, y: top + plotHeight - (sample.kilograms / maxKilograms) * plotHeight }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  return (
    <>
      <svg aria-label="Grafik kekuatan genggaman dalam kilogram setiap detik" className="h-auto w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
        {ticks.map((kg) => {
          const y = top + plotHeight - (kg / maxKilograms) * plotHeight;
          return <g key={kg}><line stroke="#dbe8f2" strokeWidth="1.5" x1={left} x2={left + plotWidth} y1={y} y2={y} />{!compact && <text fill="#625f54" fontSize="13" fontWeight="700" textAnchor="end" x={left - 8} y={y + 4}>{kg} kg</text>}</g>;
        })}
        {line && <polyline fill="none" points={line} stroke="#d67b1f" strokeLinecap="round" strokeLinejoin="round" strokeWidth={compact ? 5 : 4} />}
        {points.map((point) => <circle cx={point.x} cy={point.y} fill="white" key={point.elapsedSecond} r={compact ? 3 : 4} stroke="#d67b1f" strokeWidth="2" />)}
        <text fill="#625f54" fontSize="13" fontWeight="700" x={left} y={height - 8}>1 dtk</text>
        <text fill="#625f54" fontSize="13" fontWeight="700" textAnchor="end" x={left + plotWidth} y={height - 8}>30 dtk</text>
      </svg>
      <table className="sr-only"><caption>Data berat genggaman setiap detik</caption><thead><tr><th>Detik</th><th>Kilogram</th></tr></thead><tbody>{samples.map((sample) => <tr key={sample.elapsedSecond}><td>{sample.elapsedSecond}</td><td>{sample.kilograms.toFixed(2)}</td></tr>)}</tbody></table>
    </>
  );
}

export function SequenceBoard({ snapshot }: { snapshot: SessionSnapshot }) {
  const visual = snapshot.visual?.mode === 'SEQUENCE_MEMORY' ? snapshot.visual : null;
  const activeTile = SEQUENCE_TILES.find((tile) => tile.code === visual?.activeItem);
  const lastCueId = useRef<string | null>(null);
  const previousPhase = useRef<'EXAMPLE' | 'RESPONSE' | 'FEEDBACK' | null>(null);
  const remainingInputs = visual?.phase === 'RESPONSE'
    ? Math.max(0, visual.sequenceLength - visual.responseIndex)
    : visual?.sequenceLength ?? 0;
  const instruction = visual?.feedback === 'ONE_BUTTON'
    ? 'Tekan satu tombol saja.'
    : visual?.feedback === 'REPEAT'
      ? 'Mari lihat urutannya lagi.'
      : visual?.phase === 'RESPONSE' && visual.responseIndex > 0
        ? 'Benar, lanjutkan ke tombol berikutnya.'
        : visual?.phase === 'RESPONSE'
          ? 'Sekarang ikuti urutannya.'
          : 'Perhatikan urutannya.';

  useEffect(() => {
    if (!visual?.cueId || !activeTile || lastCueId.current === visual.cueId) return;
    lastCueId.current = visual.cueId;
    playSequenceTone(activeTile.frequency, 260);
  }, [activeTile, visual?.cueId]);

  useEffect(() => {
    const phase = visual?.phase ?? null;
    if (phase === 'RESPONSE' && previousPhase.current !== 'RESPONSE') playTurnCue();
    previousPhase.current = phase;
  }, [visual?.phase]);

  const idleBackground = `conic-gradient(from -45deg, ${SEQUENCE_TILES.map((tile, index) => `${tile.color} ${index * 25}% ${(index + 1) * 25}%`).join(', ')})`;
  const buttonLabel = activeTile ? `Warna ${activeTile.label}` : visual?.phase === 'RESPONSE' ? 'Tekan tombol fisik sesuai urutan' : 'Tombol empat warna';

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="m-0 text-2xl font-black">{instruction}</p><div className="flex flex-wrap gap-2">{visual?.phase === 'RESPONSE' && <span className="rounded-full bg-[#e5f3fc] px-4 py-2 text-sm font-black text-[#286aa9]">Sisa tombol {remainingInputs}</span>}<span className="rounded-full bg-brand-soft px-4 py-2 text-sm font-black">Sisa kesempatan {visual?.remainingAttempts ?? 3}</span></div></div>
      <div className="mt-10 grid place-items-center text-center">
        <div className="relative grid size-64 place-items-center sm:size-80">
          {activeTile && <><span aria-hidden className="absolute inset-5 animate-ping rounded-full opacity-20" style={{ backgroundColor: activeTile.color }} /><span aria-hidden className="absolute inset-1 rounded-full opacity-25 blur-2xl" style={{ backgroundColor: activeTile.color }} /></>}
          <m.div animate={{ scale: activeTile ? 1.05 : 1, y: activeTile ? -4 : 0 }} aria-label={buttonLabel} className={`relative size-52 rounded-full border-[12px] border-[#080808] sm:size-64 ${activeTile ? '' : 'saturate-[0.7] brightness-[0.72]'}`} role="img" style={{ background: activeTile ? `radial-gradient(circle at 34% 27%, white 0 4%, ${activeTile.color} 8% 58%, color-mix(in srgb, ${activeTile.color}, black 35%) 100%)` : idleBackground, boxShadow: activeTile ? `0 0 0 7px ${activeTile.color}55,0 0 38px ${activeTile.color},inset 0 -22px 26px rgba(0,0,0,.28),0 10px 0 #050505` : 'inset 0 -22px 26px rgba(0,0,0,.28),0 10px 0 #050505' }} transition={{ duration: 0.14 }}><span aria-hidden className="absolute inset-x-10 top-5 h-8 rotate-[-12deg] rounded-full bg-white/28 blur-[1px]" /></m.div>
        </div>
        <p className="mt-2 mb-0 text-2xl font-black">{activeTile ? activeTile.label : visual?.phase === 'RESPONSE' ? 'Tekan tombol fisik sesuai urutan' : 'Bersiap melihat warna'}</p>
        <p className="mt-2 mb-0 max-w-md font-bold text-muted">{visual?.phase === 'RESPONSE' ? `Lepaskan lalu tekan tombol ${Math.min(visual.responseIndex + 1, visual.sequenceLength)} dari ${visual.sequenceLength}.` : 'Satu tombol akan menyala bergantian dalam empat warna.'}</p>
      </div>
    </div>
  );
}

const ENCOURAGEMENT_CUES = {
  started: [
    { src: '/audio/game-mode1/encouragement/started-1.m4a', text: 'Wah, genggaman Anda sudah sekuat Gatotkaca!' },
    { src: '/audio/game-mode1/encouragement/started-2.m4a', text: 'Mantap! Buahnya mulai menyerah.' },
    { src: '/audio/game-mode1/encouragement/started-3.m4a', text: 'Wih, baru mulai sudah kuat sekali!' },
  ],
  halfway: [
    { src: '/audio/game-mode1/encouragement/halfway-1.m4a', text: 'Setengah jalan! Bima pasti ikut bangga.' },
    { src: '/audio/game-mode1/encouragement/halfway-2.m4a', text: 'Hebat! Buahnya tinggal pasrah.' },
    { src: '/audio/game-mode1/encouragement/halfway-3.m4a', text: 'Lanjutkan! Tenaganya masih penuh.' },
  ],
  finalFive: [
    { src: '/audio/game-mode1/encouragement/final-five-1.m4a', text: 'Lima detik lagi! Jangan kasih kendor.' },
    { src: '/audio/game-mode1/encouragement/final-five-2.m4a', text: 'Sedikit lagi! Jurus pamungkas!' },
    { src: '/audio/game-mode1/encouragement/final-five-3.m4a', text: 'Ayo, tahan! Buahnya hampir jadi jus.' },
  ],
  holdAgain: [
    { src: '/audio/game-mode1/encouragement/hold-again-1.m4a', text: 'Ayo, tahan lagi. Gatotkaca belum menyerah!' },
    { src: '/audio/game-mode1/encouragement/hold-again-2.m4a', text: 'Waduh, buahnya mau kabur. Genggam lagi!' },
    { src: '/audio/game-mode1/encouragement/hold-again-3.m4a', text: 'Tenaganya turun sedikit. Ayo naik lagi!' },
    { src: '/audio/game-mode1/encouragement/hold-again-4.m4a', text: 'Ayo kuatkan lagi. Anggap saja sedang meremas kerupuk!' },
    { src: '/audio/game-mode1/encouragement/hold-again-5.m4a', text: 'Jangan kalah sama buah. Genggam lagi!' },
  ],
} as const;

type EncouragementCue = { readonly src: string; readonly text: string };

export interface EncouragementState {
  started: boolean;
  halfway: boolean;
  finalFive: boolean;
  lastPromptSecond: number;
  lastCueSrc: string | null;
}

function randomCue(cues: readonly EncouragementCue[], previousSrc: string | null): EncouragementCue {
  const available = cues.length > 1 ? cues.filter((cue) => cue.src !== previousSrc) : cues;
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return available[random[0]! % available.length]!;
}

function playEncouragement(audio: HTMLAudioElement, src: string): void {
  audio.pause();
  audio.currentTime = 0;
  audio.src = src;
  void audio.play().catch(() => undefined);
}

export function MotorGripBoard({ encouragementAudioRef, encouragementStateRef, fruit, snapshot }: { encouragementAudioRef: MutableRefObject<HTMLAudioElement | null>; encouragementStateRef: MutableRefObject<EncouragementState>; fruit: FruitVariant; snapshot: SessionSnapshot }) {
  const visual = snapshot.visual?.mode === 'MOTOR_GRIP' ? snapshot.visual : null;
  const encouragementState = encouragementStateRef.current;
  const kilograms = visual?.kilograms ?? 0;
  const grip = Math.round(Math.min(100, kilograms / 5 * 100));
  const samples = visual?.gripSamples ?? [];
  const peakKilograms = Math.max(kilograms, ...samples.map((sample) => sample.kilograms));
  const fillLabel = peakKilograms < 2 ? '¼ gelas' : peakKilograms < 3 ? '½ gelas' : peakKilograms < 4 ? '¾ gelas' : peakKilograms <= 5 ? 'Penuh' : 'Luber';
  const averageKilograms = samples.length > 0 ? samples.reduce((sum, sample) => sum + sample.kilograms, 0) / samples.length : kilograms;
  const estimatedScore = Math.round((Math.min(1, averageKilograms / 5) * 0.7 + Math.min(1, peakKilograms / 5) * 0.3) * 1000);

  function triggerCue(audio: HTMLAudioElement, cues: readonly EncouragementCue[]) {
    const cue = randomCue(cues, encouragementState.lastCueSrc);
    encouragementState.lastCueSrc = cue.src;
    playEncouragement(audio, cue.src);
  }

  useEffect(() => {
    const audio = encouragementAudioRef.current;
    if (!audio) return;
    if (!encouragementState.started && grip >= 30) {
      encouragementState.started = true;
      triggerCue(audio, ENCOURAGEMENT_CUES.started);
    }
    if (!encouragementState.halfway && (visual?.activeElapsedMs ?? 0) >= 15_000) {
      encouragementState.halfway = true;
      triggerCue(audio, ENCOURAGEMENT_CUES.halfway);
    }
    if (!encouragementState.finalFive && (visual?.remainingMs ?? 30_000) <= 5_000) {
      encouragementState.finalFive = true;
      triggerCue(audio, ENCOURAGEMENT_CUES.finalFive);
    }
  }, [encouragementAudioRef, encouragementState, grip, visual?.activeElapsedMs, visual?.remainingMs]);

  useEffect(() => {
    const audio = encouragementAudioRef.current;
    const latest = samples.at(-1);
    const previous = samples.at(-2);
    if (!audio || !latest || !previous || latest.elapsedSecond - encouragementState.lastPromptSecond < 8) return;
    if (previous.kilograms < 0.8 || previous.kilograms - latest.kilograms < 0.35) return;
    encouragementState.lastPromptSecond = latest.elapsedSecond;
    triggerCue(audio, ENCOURAGEMENT_CUES.holdAgain);
  }, [encouragementAudioRef, encouragementState, samples]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4"><SessionCountdown remainingMs={visual?.remainingMs ?? 30_000} totalMs={30_000} /><div className="grid grid-cols-2 gap-3"><div className="rounded-md bg-[#fff4e7] px-5 py-3 text-right"><span className="block text-sm font-black text-muted">Isi gelas</span><strong className="text-3xl text-[#a94f12]">{fillLabel}</strong></div><div className="rounded-md bg-[#fff4e7] px-5 py-3 text-right"><span className="block text-sm font-black text-muted">Beban saat ini</span><strong className="text-3xl tabular-nums text-[#a94f12]">{kilograms.toFixed(2)} kg</strong></div></div></div>
      <div className="mt-5 grid items-stretch gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="grid min-h-[28rem] place-items-center p-6 text-center"><SqueezableFruit fruit="ORANGE" kilograms={peakKilograms} showLabel={false} squeezePercent={grip} /></div>
        <div className="grid gap-5"><div className="rounded-md border-2 border-divider bg-white p-5"><div className="flex items-end justify-between gap-4"><span className="font-black text-muted">Kekuatan relatif</span><strong className="text-4xl">{grip}%</strong></div><div aria-hidden className="relative mt-4 h-4 rounded-full bg-divider"><div className="absolute inset-y-0 left-0 transition-[width] duration-100" style={{ width: `${grip}%` }}><div className="size-full rounded-full bg-gradient-to-r from-[#f1c232] via-[#ee8f2a] to-[#dc4c3f]" /><span className="absolute top-1/2 right-0 size-7 translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#d67b1f] shadow-[0_2px_0_rgba(23,23,17,0.22)]" /></div></div></div><div className="rounded-md border-2 border-divider bg-white p-5"><div className="flex items-end justify-between gap-4"><span className="font-black text-muted">Perkiraan poin kekuatan</span><strong className="text-3xl">{estimatedScore}</strong></div><p className="mt-2 mb-0 text-sm font-bold text-muted">Dihitung dari kekuatan rata-rata dan puncak selama 30 detik.</p></div><div className="rounded-md border-2 border-divider bg-white p-4"><div className="flex items-center justify-between gap-3"><span className="font-black">Grafik genggaman langsung</span><span className="text-sm font-bold text-muted">kg per detik</span></div><div className="mt-2"><GripLineChart compact samples={samples} /></div></div></div>
      </div>
    </div>
  );
}

const NEXT_QUESTION_AUDIO_GAP_MS = 500;

export function GoNoGoBoard({ audioElements, snapshot }: { audioElements?: { target: HTMLAudioElement; transition: HTMLAudioElement }; snapshot: SessionSnapshot }) {
  const visual = snapshot.visual?.mode === 'GO_NO_GO' ? snapshot.visual : null;
  const targetAudioRef = useRef<HTMLAudioElement | null>(null);
  const transitionAudioRef = useRef<HTMLAudioElement | null>(null);
  const transitionQuestionRef = useRef<number | null>(null);
  const isTargetPreview = visual?.phase === 'TARGET_PREVIEW';
  const stimulus = (isTargetPreview ? visual?.targetStimulus : visual?.phase === 'STIMULUS' ? visual.stimulus : null) as GoNoGoStimulus | null | undefined;
  const assetIndex = isTargetPreview ? visual?.targetAssetIndex : visual?.phase === 'STIMULUS' ? visual.assetIndex : null;
  const asset = stimulus && assetIndex !== null && assetIndex !== undefined
    ? goNoGoStimulusAssetAt(stimulus, assetIndex)
    : null;
  const timer = <SessionCountdown remainingMs={visual?.remainingMs ?? 180_000} totalMs={180_000} />;

  useEffect(() => {
    void preloadGoNoGoImages();
  }, []);

  useEffect(() => {
    const audio = audioElements?.target ?? new Audio();
    const transitionAudio = audioElements?.transition ?? new Audio('/audio/game-mode2/targets/next-question.m4a');
    audio.preload = 'auto';
    transitionAudio.preload = 'auto';
    targetAudioRef.current = audio;
    transitionAudioRef.current = transitionAudio;
    return () => {
      audio.pause();
      transitionAudio.pause();
      if (!audioElements) {
        audio.removeAttribute('src');
        audio.load();
        transitionAudio.removeAttribute('src');
        transitionAudio.load();
      }
      targetAudioRef.current = null;
      transitionAudioRef.current = null;
    };
  }, [audioElements]);

  useEffect(() => {
    const audio = targetAudioRef.current;
    const transitionAudio = transitionAudioRef.current;
    if (!audio || !transitionAudio || !visual) return;
    let gapTimer: number | undefined;
    const playTarget = () => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = goNoGoTargetAudioUrl(visual.targetStimulus);
      void audio.play().catch(() => undefined);
    };
    const scheduleTarget = () => {
      gapTimer = window.setTimeout(playTarget, NEXT_QUESTION_AUDIO_GAP_MS);
    };

    if (visual.phase === 'TRANSITION' && visual.questionNumber > 1 && visual.candidateIndex === null) {
      audio.pause();
      audio.currentTime = 0;
      if (transitionQuestionRef.current !== visual.questionNumber) {
        transitionQuestionRef.current = visual.questionNumber;
        transitionAudio.currentTime = 0;
        void transitionAudio.play().catch(() => undefined);
      }
    } else if (visual.phase === 'TARGET_PREVIEW') {
      if (transitionQuestionRef.current === visual.questionNumber && !transitionAudio.paused && !transitionAudio.ended) {
        transitionAudio.addEventListener('ended', scheduleTarget, { once: true });
      } else if (transitionQuestionRef.current === visual.questionNumber) {
        scheduleTarget();
      } else {
        playTarget();
      }
    } else if (visual.phase !== 'TRANSITION' || visual.candidateIndex === null) {
      audio.pause();
      audio.currentTime = 0;
    }

    return () => {
      transitionAudio.removeEventListener('ended', scheduleTarget);
      if (gapTimer !== undefined) window.clearTimeout(gapTimer);
    };
  }, [visual?.candidateIndex, visual?.phase, visual?.questionNumber, visual?.targetStimulus]);

  if (isTargetPreview) {
    return (
      <div className="mx-auto w-full max-w-5xl p-6 sm:p-8">
        <div className="flex justify-start">{timer}</div>
        <div className="grid min-h-[27rem] place-items-center text-center">
          {asset && <img alt={asset.alt} className="mx-auto aspect-[4/5] w-full max-w-sm object-contain sm:max-w-md" key={`${visual.questionNumber}-${stimulus}-${assetIndex}`} src={asset.src} />}
          <p className="mt-5 mb-0 text-3xl font-black">Perhatikan</p>
        </div>
      </div>
    );
  }

  if (visual?.phase === 'STIMULUS') {
    return (
      <div className="mx-auto w-full max-w-5xl p-6 sm:p-8">
        <div className="flex justify-start">{timer}</div>
        <div className="grid min-h-[27rem] place-items-center text-center">
          {asset && <img alt={asset.alt} className="mx-auto aspect-[4/5] w-full max-w-sm object-contain sm:max-w-md" key={`${visual.level}-${visual.questionNumber}-${stimulus}-${assetIndex}`} src={asset.src} />}
        </div>
      </div>
    );
  }

  return <div className="mx-auto w-full max-w-5xl p-6 sm:p-8"><div className="flex justify-start">{timer}</div><div className="grid min-h-[27rem] place-items-center text-center">{visual?.candidateIndex === null && <p className="m-0 text-3xl font-black">Soal selanjutnya</p>}</div></div>;
}

function GameBoard({ encouragementAudioRef, encouragementStateRef, fruit, mode, snapshot }: { encouragementAudioRef: MutableRefObject<HTMLAudioElement | null>; encouragementStateRef: MutableRefObject<EncouragementState>; fruit: FruitVariant; mode: GameMode; snapshot: SessionSnapshot }) {
  if (mode === 'MOTOR_GRIP') return <MotorGripBoard encouragementAudioRef={encouragementAudioRef} encouragementStateRef={encouragementStateRef} fruit={fruit} snapshot={snapshot} />;
  if (mode === 'GO_NO_GO') return <GoNoGoBoard snapshot={snapshot} />;
  return <SequenceBoard snapshot={snapshot} />;
}

function GameResult({ displayName, onReplay, result }: { displayName: string; onReplay: () => void; result?: SessionSnapshot['result'] }) {
  if (!result) return null;
  const metrics = result.metrics;
  return (
    <section aria-labelledby="result-title" className="mx-auto grid w-full max-w-[78rem] gap-3 py-5">
      <header><p className="landing-eyebrow">Sesi tersimpan</p><h1 className="m-0 text-3xl font-black tracking-[-0.05em] sm:text-4xl" id="result-title">Hasil sesi {displayName}</h1><p className="mt-1 mb-0 text-sm font-bold text-muted">Hasil permainan ini bukan diagnosis atau rekomendasi terapi.</p></header>
      <div><ResultStats metrics={metrics} score={result.score} /><GameResultChart metrics={metrics} /><div className="mt-3"><AiSummaryPanels summary={result.aiSummary} /></div></div>
      <div className="flex flex-wrap gap-2"><Button onClick={onReplay}>Main lagi</Button><Link className={buttonClassName('secondary')} to={ROUTES.progressBoard}>Lihat Progress Board</Link><Link className={buttonClassName('quiet')} to={ROUTES.dashboard}>Kembali ke dashboard</Link></div>
    </section>
  );
}

function SetupPanel({ mode, snapshot, canStart, fruit, showAllChecked = false }: { mode: GameMode; snapshot: SetupSnapshot | null; canStart: boolean; fruit: FruitVariant; showAllChecked?: boolean }) {
  if (mode === 'SEQUENCE_MEMORY') return <div className="bg-gradient-to-br from-[#22221f] via-[#11110f] to-[#28261e] p-6 sm:p-8"><div className="mx-auto grid max-w-lg grid-cols-2 gap-5 sm:gap-7">{SEQUENCE_TILES.map((tile) => { const checked = showAllChecked || snapshot?.checkedButton === tile.code; return <div className="grid place-items-center gap-3 rounded-md border border-white/10 bg-white/5 p-4" key={tile.code}><span className="relative block aspect-square w-full max-w-24">{checked && <span className="absolute inset-1 animate-ping rounded-full opacity-40" style={{ backgroundColor: tile.color }} />}<span className={`relative block size-full rounded-full border-8 border-[#080808] transition ${checked ? 'scale-105 brightness-125' : 'brightness-75'}`} style={{ backgroundColor: tile.color }} /></span><span className="text-center"><strong className="block text-base text-white">{tile.label}</strong><span className="mt-1 block text-xs font-bold text-white/60">{tile.icon}</span></span></div>; })}</div></div>;
  if (mode === 'GO_NO_GO') return <div className="grid min-h-80 place-items-center bg-white p-8 text-center"><div><span className="mx-auto grid size-20 place-items-center rounded-full bg-[#e5f3fc]"><Hand aria-hidden className="size-10 text-[#3b628b]" /></span><h3 className="mt-5 mb-0 text-4xl font-black">{canStart ? 'Alat siap' : snapshot?.instruction ?? 'Genggam alat satu kali.'}</h3>{canStart && <p className="mt-3 mb-0 text-lg font-bold text-muted">Permainan segera dimulai.</p>}</div></div>;
  return <div className="grid min-h-80 place-items-center p-8 text-center"><div><SqueezableFruit fruit={fruit} showLabel={false} squeezePercent={canStart ? 45 : 10} /><h3 className="mt-5 mb-0 text-4xl font-black">{canStart ? 'Alat siap' : snapshot?.instruction ?? 'Genggam alat satu kali.'}</h3>{canStart && <p className="mt-3 mb-0 text-lg font-bold text-muted">Permainan segera dimulai.</p>}</div></div>;
}

type DemoPairingPhase = 'CONNECTING' | 'CHECKING' | 'READY';

function DemoPairing({ fruit, mode, onBack, participantName, phase }: { fruit: FruitVariant; mode: GameMode; onBack: () => void; participantName: string; phase: DemoPairingPhase }) {
  const selected = GAME_MODES.find((item) => item.mode === mode)!;
  const ready = phase === 'READY';
  const statusLabel = phase === 'CONNECTING' ? 'Menghubungkan' : phase === 'CHECKING' ? 'Memeriksa alat' : 'Siap';
  const instruction = mode === 'SEQUENCE_MEMORY' ? 'Empat tombol fisik sedang diperiksa.' : 'Sensor genggaman sedang diperiksa.';
  return (
    <section aria-labelledby="setup-title" className="relative mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-[78rem] flex-col justify-center py-20 sm:py-16">
      <Button className="absolute top-3 left-0" onClick={onBack} variant="quiet"><ArrowLeft aria-hidden className="size-5" />Kembali</Button>
      <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div><p className="landing-eyebrow">Persiapan untuk {participantName}</p><h1 className="m-0 text-4xl font-black tracking-[-0.05em] sm:text-5xl" id="setup-title">Hubungkan {selected.device.toLowerCase()}</h1><p className="mt-4 mb-0 max-w-xl text-lg leading-8 text-muted">Perangkat akan dipasangkan dan diperiksa otomatis sebelum permainan dimulai.</p><div className="mt-7 rounded-md border-2 border-divider bg-white/90 p-5"><p className="m-0 text-sm font-black tracking-[0.08em] text-muted uppercase">Perangkat yang digunakan</p><div className="mt-4 flex items-center gap-4"><span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-soft"><Gamepad2 className="size-6" /></span><div><h2 className="m-0 text-xl font-black">{selected.device}</h2><p className="mt-1 mb-0 text-sm font-bold text-muted">{selected.title}</p></div></div></div></div>
        <div className="overflow-hidden rounded-lg border-2 border-ink bg-white/95 shadow-[0_7px_0_#b7c8d8]" role="status" aria-live="polite"><div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-divider px-5 py-4 sm:px-6"><div><p className="m-0 text-sm font-black tracking-[0.08em] text-muted uppercase">Pemeriksaan alat</p><p className="mt-1 mb-0 font-bold text-muted">{ready ? 'Alat diperiksa otomatis.' : instruction}</p></div><span className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-black ${ready ? 'bg-brand-soft text-success' : 'bg-divider text-muted'}`}>{ready ? <CheckCircle2 aria-hidden className="size-5" /> : <span aria-hidden className="size-2 animate-pulse rounded-full bg-accent" />}{statusLabel}</span></div><SetupPanel canStart={ready} fruit={fruit} mode={mode} showAllChecked={ready} snapshot={null} /></div>
      </div>
    </section>
  );
}

export type GameFlowStage = 'participant' | 'tutorial' | 'setup' | 'session' | 'result';

interface GameFlowProps {
  csrfToken: string;
  mode: GameMode;
  onStageChange: (stage: GameFlowStage) => void;
}

export function GameFlow({ csrfToken, mode, onStageChange }: GameFlowProps) {
  const navigate = useNavigate();
  const selected = GAME_MODES.find((item) => item.mode === mode)!;
  const [stage, setStageState] = useState<GameFlowStage>('participant');
  const setStage = useCallback((next: GameFlowStage) => { setStageState(next); onStageChange(next); }, [onStageChange]);
  const [participant, setParticipant] = useState<GameParticipantIdentity | null>(null);
  const [fruit, setFruit] = useState<FruitVariant>('ORANGE');
  const [demoPairingPhase, setDemoPairingPhase] = useState<DemoPairingPhase | null>(null);
  const participantName = participant?.displayName ?? '';
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [pauseCommand, setPauseCommand] = useState<'PAUSE' | 'RESUME' | null>(null);
  const [abortDialogOpen, setAbortDialogOpen] = useState(false);
  const sessionAttemptRef = useRef<{ preparationId: string; idempotencyKey: string } | null>(null);
  const sessionStartingRef = useRef(false);
  const sessionRecoveryRef = useRef<string | null>(null);
  const countdownToneRef = useRef<number | null>(null);
  const abortButtonRef = useRef<HTMLButtonElement>(null);
  const abortDialogRef = useRef<HTMLDialogElement>(null);
  const encouragementAudioRef = useRef<HTMLAudioElement | null>(null);
  const encouragementStateRef = useRef<EncouragementState>({ started: false, halfway: false, finalFive: false, lastPromptSecond: -10, lastCueSrc: null });
  const preparation = useCreatePreparationMutation(csrfToken);
  const cancelPreparation = useCancelPreparationMutation(csrfToken);
  const createSession = useCreateGameSessionMutation(csrfToken);
  const persistedSession = useGameSessionQuery(sessionId ?? undefined, { pollWhileActive: true, pollWhileSaving: true, retry: true });
  const setupSocket = useSetupSocket(preparation.data?.setupId ?? null);
  const sessionSocket = useSessionSocket(sessionId);
  const setupSnapshot = setupSocket.message?.type === 'setup.snapshot' ? setupSocket.message.payload : null;
  const sessionSnapshot = sessionSocket.message?.type === 'session.snapshot' ? sessionSocket.message.payload : null;
  const activeFruit = sessionSnapshot?.visual?.mode === 'MOTOR_GRIP'
    ? sessionSnapshot.visual.fruitVariant
    : preparation.data?.fruitVariant ?? fruit;
  const canStart = setupSnapshot?.canStart ?? preparation.data?.canStart ?? false;
  const persistedStatus = persistedSession.data?.status;
  const realtimeStatus = sessionSnapshot?.status;
  const durableTerminal = persistedStatus && ['ABORTED', 'INTERRUPTED', 'COMPLETED', 'SAVING', 'SAVED', 'SAVE_FAILED'].includes(persistedStatus);
  const durableAhead =
    (persistedStatus === 'COUNTDOWN' && realtimeStatus === 'BINDING') ||
    (persistedStatus === 'PLAYING' && (realtimeStatus === 'BINDING' || realtimeStatus === 'COUNTDOWN')) ||
    persistedStatus === 'PAUSED';
  const status = durableTerminal || durableAhead
    ? persistedStatus
    : realtimeStatus ?? (persistedStatus && persistedStatus !== 'BINDING' ? persistedStatus : createSession.data?.status ?? 'BINDING');
  const setupTerminal = setupSnapshot?.state === 'CANCELLED' || setupSnapshot?.state === 'EXPIRED';
  const setupFailed = setupSocket.status === 'FAILED' || setupSocket.protocolError !== null;
  const setupStatusLabel = createSession.isPending
    ? 'Memulai sesi'
    : canStart
      ? 'Siap'
      : setupSnapshot?.state === 'CALIBRATING'
        ? 'Menunggu genggaman'
        : 'Menghubungkan';

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

  const startDemoPairing = useCallback(() => {
    void resumeGameAudio();
    setDemoPairingPhase('CONNECTING');
    setStage('setup');
  }, [setStage]);

  useEffect(() => {
    if (stage !== 'setup' || !demoPairingPhase) return;
    const delay = demoPairingPhase === 'CONNECTING' ? 1_400 : demoPairingPhase === 'CHECKING' ? 1_600 : 1_200;
    const timer = window.setTimeout(() => {
      if (demoPairingPhase === 'CONNECTING') setDemoPairingPhase('CHECKING');
      else if (demoPairingPhase === 'CHECKING') setDemoPairingPhase('READY');
      else navigate(ROUTES.preview(mode), { replace: true });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [demoPairingPhase, mode, navigate, stage]);

  const startPreparation = useCallback(() => {
    if (!csrfToken || preparation.isPending || !participant) return;
    setStage('setup');
    sessionAttemptRef.current = null;
    sessionStartingRef.current = false;
    createSession.reset();
    preparation.reset();
    preparation.mutate({ mode, displayName: participant.displayName, participantReference: participant.participantReference, privacyAcknowledged: true });
  }, [createSession, csrfToken, mode, participant, preparation, setStage]);

  const startSession = useCallback(async () => {
    const current = preparation.data;
    if (!current || sessionStartingRef.current) return;
    const existing = sessionAttemptRef.current;
    const attempt = existing?.preparationId === current.preparationId ? existing : { preparationId: current.preparationId, idempotencyKey: crypto.randomUUID() };
    sessionAttemptRef.current = attempt;
    sessionStartingRef.current = true;
    try {
      const created = await createSession.mutateAsync(attempt);
      setSessionId(created.sessionId);
      preparation.reset();
      sessionAttemptRef.current = null;
      setStage('session');
    } catch {
      return;
    } finally {
      sessionStartingRef.current = false;
    }
  }, [createSession, preparation, setStage]);

  useEffect(() => { if (stage === 'setup' && canStart && !createSession.isError) void startSession(); }, [canStart, createSession.isError, stage, startSession]);
  useEffect(() => {
    if (sessionSnapshot?.status === 'SAVED' && stage !== 'result') setStage('result');
  }, [sessionSnapshot?.status, setStage, stage]);

  async function backToTutorial() {
    if (createSession.isPending || cancelPreparation.isPending || sessionStartingRef.current) return;
    const current = preparation.data;
    if (current && !setupTerminal) {
      try {
        await cancelPreparation.mutateAsync(current.preparationId);
      } catch {
        return;
      }
    }
    setupSocket.close();
    preparation.reset();
    cancelPreparation.reset();
    createSession.reset();
    sessionAttemptRef.current = null;
    sessionStartingRef.current = false;
    setStage('tutorial');
  }

  function retrySetup() {
    if (createSession.isError && preparation.data && !setupTerminal) { createSession.reset(); void startSession(); return; }
    if (preparation.data && setupFailed && !setupTerminal) { setupSocket.reconnect(); return; }
    startPreparation();
  }

  useEffect(() => {
    if (status !== 'COUNTDOWN') { setCountdown(3); return; }
    setCountdown(sessionSnapshot?.countdown ?? 3);
    const timer = window.setInterval(() => setCountdown((value) => Math.max(1, value - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [sessionSnapshot?.countdown, status]);

  useEffect(() => {
    if (status === 'COUNTDOWN' && countdown > 0 && countdownToneRef.current !== countdown) { countdownToneRef.current = countdown; if (mode !== 'GO_NO_GO') playCountdownTone(countdown); return; }
    if (status === 'PLAYING' && countdownToneRef.current !== 0) { countdownToneRef.current = 0; if (mode !== 'GO_NO_GO') playStartTone(); }
    if (status !== 'COUNTDOWN' && status !== 'PLAYING') countdownToneRef.current = null;
  }, [countdown, mode, status]);

  useEffect(() => { const dialog = abortDialogRef.current; if (!dialog) return; if (abortDialogOpen && !dialog.open) dialog.showModal(); if (!abortDialogOpen && dialog.open) dialog.close(); }, [abortDialogOpen]);
  useEffect(() => { if ((pauseCommand === 'PAUSE' && status === 'PAUSED') || (pauseCommand === 'RESUME' && status === 'PLAYING')) setPauseCommand(null); }, [pauseCommand, status]);
  useEffect(() => {
    if (status !== 'PLAYING') encouragementAudioRef.current?.pause();
  }, [status]);

  function togglePause() { const command = status === 'PAUSED' ? 'RESUME' : 'PAUSE'; setPauseCommand(command); if (!sessionSocket.sendCommand(command)) setPauseCommand(null); }
  function closeAbortDialog() { setAbortDialogOpen(false); requestAnimationFrame(() => abortButtonRef.current?.focus()); }
  function confirmAbort() { setAbortDialogOpen(false); if (sessionSocket.sendCommand('ABORT')) navigate(ROUTES.dashboard, { replace: true }); else sessionSocket.reconnect(); }

  useEffect(() => {
    if (!sessionId) return;
    const websocketStatus = sessionSnapshot?.status ?? null;
    const durableStatus = persistedSession.data?.status ?? null;
    const needsRecovery = sessionSocket.status !== 'OPEN' && durableStatus !== null && durableStatus !== 'BINDING' && durableStatus !== websocketStatus;
    const recoveryKey = `${sessionId}:${durableStatus ?? 'countdown-expired'}:${websocketStatus ?? 'none'}`;
    if (!needsRecovery || sessionRecoveryRef.current === recoveryKey) return;
    sessionRecoveryRef.current = recoveryKey;
    sessionSocket.reconnect();
    void persistedSession.refetch();
  }, [persistedSession.data?.status, persistedSession.refetch, sessionId, sessionSnapshot?.status, sessionSocket]);

  function reset() {
    encouragementAudioRef.current?.pause();
    encouragementStateRef.current = { started: false, halfway: false, finalFive: false, lastPromptSecond: -10, lastCueSrc: null };
    sessionSocket.close(); preparation.reset(); createSession.reset(); sessionAttemptRef.current = null; sessionStartingRef.current = false; sessionRecoveryRef.current = null; setSessionId(null); setFruit('ORANGE'); setStage('participant');
  }

  function replay() {
    encouragementAudioRef.current?.pause();
    encouragementStateRef.current = { started: false, halfway: false, finalFive: false, lastPromptSecond: -10, lastCueSrc: null };
    sessionSocket.close();
    setupSocket.close();
    setSessionId(null);
    setPauseCommand(null);
    setCountdown(3);
    sessionRecoveryRef.current = null;
    startPreparation();
  }

  if (stage === 'participant') return <GameParticipantEntry csrfToken={csrfToken} mode={mode} onContinue={(identity) => { setParticipant(identity); setFruit('ORANGE'); setDemoPairingPhase(null); setStage('tutorial'); }} />;
  if (stage === 'tutorial') return <GameTutorial fruit={fruit} mode={mode} onBack={() => setStage('participant')} onReady={startDemoPairing} participantName={participantName} />;
  if (stage === 'setup' && demoPairingPhase) return <DemoPairing fruit={fruit} mode={mode} onBack={() => { setDemoPairingPhase(null); setStage('tutorial'); }} participantName={participantName} phase={demoPairingPhase} />;

  if (stage === 'setup') return (
    <section className="relative mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-[78rem] flex-col justify-center py-20 sm:py-16" aria-labelledby="setup-title">
      <Button className="absolute top-3 left-0" disabled={createSession.isPending || cancelPreparation.isPending || sessionStartingRef.current} onClick={() => void backToTutorial()} variant="quiet"><ArrowLeft aria-hidden className="size-5" />Kembali</Button>
      <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16"><div><p className="landing-eyebrow">Persiapan untuk {participantName}</p><h1 className="m-0 text-4xl font-black tracking-[-0.05em] sm:text-5xl" id="setup-title">Siapkan {selected.device.toLowerCase()}</h1><p className="mt-4 mb-0 max-w-xl text-lg leading-8 text-muted">{mode === 'SEQUENCE_MEMORY' ? 'Tekan tombol yang menyala. Permainan akan mulai otomatis.' : 'Genggam alat sekali. Permainan akan mulai otomatis.'}</p><div className="mt-7 rounded-md border-2 border-divider bg-white/90 p-5"><p className="m-0 text-sm font-black tracking-[0.08em] text-muted uppercase">Perangkat yang digunakan</p><div className="mt-4 flex items-center gap-4"><span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-soft"><Gamepad2 className="size-6" /></span><div><h2 className="m-0 text-xl font-black">{preparation.data?.device.label ?? selected.device}</h2><p className="mt-1 mb-0 text-sm font-bold text-muted">{selected.title}</p></div></div></div></div>
        {preparation.isPending ? <div className="flex min-h-[30rem] flex-col items-center justify-center gap-4 rounded-lg border-2 border-divider bg-white/90 p-8 text-center text-muted shadow-[0_6px_0_#dbe8f2]" role="status"><span className="grid size-16 place-items-center rounded-full bg-brand-soft"><Gamepad2 aria-hidden className="size-8 animate-pulse" /></span><p className="m-0 text-xl font-black">Menyiapkan perangkat…</p></div> : preparation.isError || setupTerminal || setupFailed || createSession.isError ? <div className="flex min-h-[30rem] flex-col items-center justify-center gap-4 rounded-lg border-2 border-divider bg-white/90 p-8 text-center text-muted shadow-[0_6px_0_#dbe8f2]" role="alert"><span className="grid size-16 place-items-center rounded-full bg-danger-soft"><AlertTriangle aria-hidden className="size-8 text-danger" /></span><p className="m-0 max-w-md text-lg font-bold">{preparation.isError ? messageOf(preparation.error) : createSession.isError ? messageOf(createSession.error) : setupTerminal ? 'Persiapan perangkat berakhir. Coba lagi.' : 'Perangkat belum terhubung. Coba lagi.'}</p><Button disabled={preparation.isPending || createSession.isPending} onClick={retrySetup} variant="secondary">Coba lagi</Button></div> : <div className="overflow-hidden rounded-lg border-2 border-ink bg-white/95 shadow-[0_7px_0_#b7c8d8]"><div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-divider px-5 py-4 sm:px-6"><div><p className="m-0 text-sm font-black tracking-[0.08em] text-muted uppercase">Pemeriksaan alat</p><p className="mt-1 mb-0 font-bold text-muted">Alat diperiksa otomatis.</p></div><span className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-black ${canStart ? 'bg-brand-soft text-success' : 'bg-divider text-muted'}`}>{canStart ? <CheckCircle2 aria-hidden className="size-5" /> : <span aria-hidden className="size-2 animate-pulse rounded-full bg-accent" />}{setupStatusLabel}</span></div><SetupPanel canStart={canStart} fruit={activeFruit} mode={mode} snapshot={setupSnapshot} /><p className="m-0 border-t-2 border-divider bg-white px-5 py-4 text-center font-black text-muted sm:px-6">{canStart ? 'Perangkat siap. Permainan segera dimulai.' : setupSnapshot?.instruction ?? 'Ikuti petunjuk untuk menyelesaikan pemeriksaan.'}</p></div>}
      </div>
    </section>
  );

  const savedResult = persistedSession.data?.result ?? sessionSnapshot?.result;
  if (status === 'SAVED' && savedResult) return <GameResult displayName={sessionSnapshot?.displayName ?? participantName} onReplay={replay} result={savedResult} />;
  if (['ABORTED', 'INTERRUPTED', 'SAVE_FAILED'].includes(status)) return <section className="mx-auto grid min-h-[32rem] max-w-2xl place-items-center text-center" aria-labelledby="terminal-title"><div><AlertTriangle aria-hidden className="mx-auto size-12 text-muted" /><h1 className="mt-5 mb-0 text-4xl font-black" id="terminal-title">{status === 'ABORTED' ? 'Sesi diakhiri' : status === 'INTERRUPTED' ? 'Koneksi alat terputus' : 'Hasil belum dapat disimpan'}</h1><p className="mt-4 mb-0 text-lg leading-8 text-muted">{sessionSnapshot?.message ?? 'Sesi berhenti. Pastikan perangkat tetap terhubung lalu coba lagi.'}</p><Button className="mt-7" onClick={reset}>Kembali ke awal</Button></div></section>;
  if (status === 'COMPLETED' || status === 'SAVING') return <section className="grid min-h-96 place-items-center text-center" aria-live="polite"><div><CheckCircle2 aria-hidden className="mx-auto size-12 text-success" /><h1 className="mt-5 mb-0 text-4xl font-black">Permainan selesai</h1><p className="mt-3 mb-0 text-lg font-bold text-muted">Menyimpan hasil…</p></div></section>;
  if (status === 'BINDING' || status === 'COUNTDOWN') return <section className="grid min-h-[32rem] place-items-center text-center" aria-live="polite"><div><p className="landing-eyebrow">{participantName}</p>{status === 'COUNTDOWN' ? <><p className="m-0 text-[8rem] leading-none font-black text-accent">{countdown}</p><h1 className="mt-5 mb-0 text-4xl font-black">Bersiap</h1><p className="mt-3 mb-0 text-lg text-muted">Permainan belum dimulai.</p></> : <><Gamepad2 aria-hidden className="mx-auto size-14 text-muted" /><h1 className="mt-5 mb-0 text-4xl font-black">Menyiapkan permainan</h1><p className="mt-3 mb-0 text-lg text-muted">{sessionSnapshot?.message ?? 'Perangkat dan aplikasi sedang dikonfirmasi.'}</p></>}</div></section>;

  return (
    <section aria-labelledby="game-title" className="grid h-full min-h-0 grid-rows-[auto_1fr]"><div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-divider pb-3"><div><p className="m-0 text-sm font-black text-muted">{participantName}</p><h1 className="mt-1 mb-0 text-3xl font-black" id="game-title">{selected.title}</h1></div><div className="flex flex-wrap items-center gap-2"><Button disabled={pauseCommand !== null} onClick={togglePause} variant="secondary">{status === 'PAUSED' ? <Play aria-hidden className="size-5" /> : <Pause aria-hidden className="size-5" />}{pauseCommand === 'PAUSE' ? 'Menjeda…' : pauseCommand === 'RESUME' ? 'Melanjutkan…' : status === 'PAUSED' ? 'Lanjutkan' : 'Jeda'}</Button><button className={buttonClassName('danger')} onClick={() => setAbortDialogOpen(true)} ref={abortButtonRef} type="button">Akhiri sesi</button></div></div>{sessionSocket.protocolError && <p className="mt-4 mb-0 text-base font-bold text-muted" role="status">{sessionSocket.protocolError}</p>}{status === 'PAUSED' ? <div className="mt-7 grid min-h-96 place-items-center rounded-md border-2 border-divider text-center"><div><Pause aria-hidden className="mx-auto size-12 text-muted" /><h2 className="mt-4 mb-0 text-4xl font-black">Dijeda</h2><p className="mt-3 mb-0 text-lg text-muted">Waktu dan penilaian berhenti.</p></div></div> : sessionSnapshot ? <div className="min-h-0 overflow-hidden pt-4"><GameBoard encouragementAudioRef={encouragementAudioRef} encouragementStateRef={encouragementStateRef} fruit={activeFruit} mode={mode} snapshot={sessionSnapshot} /></div> : null}<dialog aria-describedby="abort-session-description" aria-labelledby="abort-session-title" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-md border-2 border-divider bg-white p-0 text-ink backdrop:bg-ink/60" onCancel={(event) => { event.preventDefault(); closeAbortDialog(); }} ref={abortDialogRef} role="alertdialog"><div className="p-6 sm:p-8"><h2 className="m-0 text-3xl font-black tracking-[-0.04em]" id="abort-session-title">Akhiri sesi?</h2><p className="mt-4 mb-0 text-lg leading-8 text-muted" id="abort-session-description">Sesi akan dihentikan dan tidak dihitung sebagai permainan selesai.</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><Button onClick={closeAbortDialog} variant="secondary">Lanjut bermain</Button><Button onClick={confirmAbort} variant="danger">Ya, akhiri sesi</Button></div></div></dialog></section>
  );
}

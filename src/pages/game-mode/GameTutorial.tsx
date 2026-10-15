import { useDeferredValue, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Mars, Pause, Play, RotateCcw, Search, UserPlus, Venus } from 'lucide-react';
import type { GameMode, ParticipantDto } from '@/schemas/index.ts';
import { arkoKoala, perasJerukStepFour, perasJerukStepOne, perasJerukStepThree, perasJerukStepTwo, searchReference } from '@/assets/index.ts';
import { Button, Field } from '@/components/index.ts';
import type { FruitVariant } from '@/components/SqueezableFruit';
import { messageOf } from '@/config/api-client.ts';
import { GAME_MODES } from '@/constants/game-modes.ts';
import { tutorials } from '@/constants/tutorials.ts';
import { goNoGoStimulusAssetAt, preloadGoNoGoImages, type GoNoGoStimulus } from '@/constants/go-no-go-stimuli.ts';
import { useCreateParticipantMutation, useParticipantSearchQuery } from '@/hooks/participants';

export const SEQUENCE_TILES = [
  { code: 'GREEN', label: 'Hijau', icon: 'Wayang', color: '#399267', frequency: 494 },
  { code: 'BLUE', label: 'Biru', icon: 'Candi', color: '#3b628b', frequency: 587 },
  { code: 'YELLOW', label: 'Kuning', icon: 'Angklung', color: '#e7b82c', frequency: 659 },
  { code: 'RED', label: 'Merah', icon: 'Batik', color: '#dc4c3f', frequency: 392 },
] as const;

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return null;
  sharedAudioContext ??= new AudioContextClass();
  return sharedAudioContext;
}

export async function resumeGameAudio(): Promise<void> {
  const context = getAudioContext();
  if (context?.state === 'suspended') await context.resume();
}

export function playSequenceTone(frequency: number, durationMs = 220): void {
  const context = getAudioContext();
  if (!context) return;
  const play = () => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + durationMs / 1000 + 0.02);
  };
  if (context.state === 'suspended') void context.resume().then(play);
  else play();
}

export function playCountdownTone(value: number): void {
  playSequenceTone(value === 1 ? 784 : 587, 140);
}

export function playStartTone(): void {
  playSequenceTone(1_046, 280);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function activeCue(progress: number, cues: readonly (readonly [string, number, number])[]): string | null {
  return cues.find(([, start, end]) => progress >= start && progress < end)?.[0] ?? null;
}

function sequenceTutorialTile(step: number, progress: number): string | null {
  if (step === 0) {
    return activeCue(progress, [
      ['RED', 0.4, 0.51],
      ['YELLOW', 0.53, 0.64],
      ['BLUE', 0.66, 0.77],
      ['GREEN', 0.79, 0.92],
    ]);
  }
  if (step === 1) {
    return activeCue(progress, [
      ['RED', 0.36, 0.49],
      ['BLUE', 0.56, 0.69],
      ['GREEN', 0.76, 0.89],
    ]);
  }
  if (step === 2) {
    return activeCue(progress, [
      ['RED', 0.48, 0.59],
      ['YELLOW', 0.64, 0.75],
      ['BLUE', 0.8, 0.91],
    ]);
  }
  if (step === 3) {
    return activeCue(progress, [
      ['RED', 0.5, 0.63],
      ['BLUE', 0.72, 0.85],
    ]);
  }
  if (step === 4) {
    return activeCue(progress, [
      ['RED', 0.56, 0.67],
      ['BLUE', 0.72, 0.83],
      ['GREEN', 0.86, 0.97],
    ]);
  }
  return null;
}

export function SequenceConsole({ activeCode, phase }: { activeCode: string | null; phase: 'INTRO' | 'WATCH' | 'RESPOND' | 'READY' }) {
  const status = phase === 'INTRO' ? 'Kenali tombol' : phase === 'RESPOND' ? 'Giliran Anda' : phase === 'READY' ? 'Siap bermain' : 'Perhatikan urutan';
  return (
    <div className="relative w-full max-w-2xl px-5 pt-8 pb-12" role="img" aria-label={`Konsol Ding Dong Dong. ${status}`}>
      <span aria-hidden className="absolute top-0 left-1/2 h-12 w-20 -translate-x-1/2 rounded-t-[2rem] border-4 border-[#353535] bg-[#151515] shadow-[inset_0_5px_0_#454545]" />
      <div className="relative rounded-[2.2rem] border-[7px] border-[#090909] bg-gradient-to-br from-[#383834] via-[#161614] to-[#080808] p-5 shadow-[0_13px_0_#050505,0_20px_30px_rgba(23,23,17,0.28),inset_0_2px_0_#696960] sm:p-7">
        {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'right-4 bottom-4'].map((position) => <span aria-hidden className={`absolute size-4 rounded-full border-2 border-[#77766d] bg-[#20201e] shadow-[inset_1px_1px_0_#aaa89b] ${position}`} key={position}><span className="absolute top-1/2 left-0.5 right-0.5 h-px -translate-y-1/2 rotate-45 bg-[#8f8d82]" /></span>)}
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-5 sm:gap-7">
          {SEQUENCE_TILES.map((tile) => {
            const active = tile.code === activeCode;
            const pressed = active && phase === 'RESPOND';
            return (
              <div className={`relative grid min-h-44 place-items-center rounded-2xl border-2 p-4 transition-colors ${active ? 'border-white/35 bg-white/9' : 'border-white/8 bg-white/3'}`} key={tile.code}>
                <span aria-hidden className={`absolute inset-2 rounded-xl border ${active ? 'border-white/20' : 'border-white/5'}`} />
                <m.span animate={{ scale: pressed ? 0.92 : active ? 1.05 : 1, y: pressed ? 6 : 0 }} className="relative block size-24 rounded-full border-[9px] border-[#050505] sm:size-28" style={{ background: `radial-gradient(circle at 34% 27%, white 0 4%, ${tile.color} 8% 55%, color-mix(in srgb, ${tile.color}, black 35%) 100%)`, boxShadow: active ? `0 0 0 6px ${tile.color}55,0 0 30px ${tile.color},inset 0 -12px 18px rgba(0,0,0,.28)` : '0 7px 0 #020202,inset 0 -12px 18px rgba(0,0,0,.3)' }} transition={{ duration: 0.13 }}>
                  {active && <><span aria-hidden className="absolute -inset-4 animate-ping rounded-full border-4 opacity-35" style={{ borderColor: tile.color }} /><span aria-hidden className="absolute inset-x-5 top-3 h-5 rotate-[-12deg] rounded-full bg-white/28 blur-[1px]" /></>}
                </m.span>
                <span className="relative mt-2 text-center"><strong className="block text-lg font-black text-white">{tile.label}</strong></span>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex items-end justify-between gap-5 px-3">
          <div><p className="m-0 text-[0.62rem] font-black tracking-[0.14em] text-white/35 uppercase">Speaker</p><div className="mt-2 grid grid-cols-6 gap-1.5">{Array.from({ length: 18 }).map((_, index) => <span aria-hidden className="size-1.5 rounded-full bg-black shadow-[inset_0_1px_0_#555]" key={index} />)}</div></div>
          <div className="flex items-center gap-2"><span className="text-[0.62rem] font-black tracking-[0.14em] text-white/35 uppercase">Power</span><span aria-hidden className="h-5 w-9 rounded-full border-2 border-[#050505] bg-[#222] p-0.5"><span className="block ml-auto size-3 rounded-full bg-[#55d58b] shadow-[0_0_7px_#55d58b]" /></span></div>
        </div>
      </div>
      <span aria-hidden className="absolute bottom-2 left-1/2 h-12 w-5 -translate-x-1/2 rounded-b-xl bg-[#111] shadow-[inset_5px_0_0_#333]" />
      <span aria-hidden className="absolute right-[42%] bottom-0 h-5 w-16 rounded-full border-4 border-[#111] border-t-transparent" />
    </div>
  );
}

function TutorialVisual({ fruit, mode, step, progress }: { fruit: FruitVariant; mode: GameMode; step: number; progress: number }) {
  if (mode === 'SEQUENCE_MEMORY') {
    return <SequenceConsole activeCode={sequenceTutorialTile(step, progress)} phase={step === 0 ? 'INTRO' : step === 3 ? 'RESPOND' : step === 5 ? 'READY' : 'WATCH'} />;
  }
  if (mode === 'GO_NO_GO') {
    const sequence: readonly { stimulus: GoNoGoStimulus; assetIndex: number }[] = step === 1
      ? [{ stimulus: 'WAYANG', assetIndex: progress < 0.5 ? 0 : 1 }]
      : step === 2
        ? [
            { stimulus: 'BATIK', assetIndex: 1 },
            { stimulus: 'CANDI', assetIndex: 0 },
            { stimulus: 'WAYANG', assetIndex: 1 },
          ]
        : step === 3
          ? [
              { stimulus: 'BATIK', assetIndex: 0 },
              { stimulus: 'WAYANG', assetIndex: 0 },
            ]
          : step === 4
            ? [
                { stimulus: 'WAYANG', assetIndex: 0 },
                { stimulus: 'ANGKLUNG', assetIndex: 2 },
                { stimulus: 'WAYANG', assetIndex: 0 },
              ]
            : [{ stimulus: 'WAYANG', assetIndex: 0 }];
    const selectedAsset = sequence[Math.min(Math.floor(progress * sequence.length), sequence.length - 1)]!;
    const asset = goNoGoStimulusAssetAt(selectedAsset.stimulus, selectedAsset.assetIndex);
    const label = step === 0 ? 'Perhatikan' : step === 1 ? 'Jenis gambar harus sama' : step === 5 ? '5 soal per level' : 'Perhatikan gambar';
    return (
      <div className="grid w-full max-w-xl place-items-center gap-2 p-2 text-center sm:gap-4 sm:p-4">
        <img alt={asset.alt} className="h-auto max-h-[min(42vh,22rem)] w-full max-w-[min(18rem,42vw)] object-contain" src={asset.src} />
        <p className="m-0 text-xl font-black sm:text-2xl">{label}</p>
      </div>
    );
  }
  const grip = step === 0
    ? 10
    : step === 1
      ? 15 + progress * 55
      : step === 2
        ? 25 + progress * 75
        : step === 3
          ? 75
          : step === 4
            ? 70 * (1 - progress)
            : 30 + progress * 35;
  const gripIllustrations = [perasJerukStepOne, perasJerukStepTwo, perasJerukStepThree, perasJerukStepFour] as const;
  return (
    <div className="grid w-full max-w-xl place-items-center gap-5 p-4 text-center sm:p-6">
      <img alt="Ilustrasi langkah Peras Jeruk" className="max-h-64 w-full object-contain" src={gripIllustrations[Math.min(step, gripIllustrations.length - 1)]} />
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between gap-4"><span className="text-sm font-black tracking-[0.08em] text-muted uppercase">Tekanan</span><strong className="text-2xl tabular-nums">{Math.round(grip)}%</strong></div>
        <div className="relative mt-3 h-3 rounded-full bg-divider"><div className="absolute inset-y-0 left-0 transition-[width] duration-100" style={{ width: `${grip}%` }}><div className="size-full rounded-full bg-gradient-to-r from-[#f1c232] via-[#ee8f2a] to-[#dc4c3f]" /><span aria-hidden className="absolute top-1/2 right-0 size-6 translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#d67b1f] shadow-[0_2px_0_rgba(23,23,17,0.22)]" /></div></div>
      </div>
    </div>
  );
}

interface GameTutorialProps {
  fruit: FruitVariant;
  mode: GameMode;
  participantName: string;
  onBack: () => void;
  onReady: () => void;
}

export function GameTutorial({ fruit, mode, participantName, onBack, onReady }: GameTutorialProps) {
  const reduceMotion = useReducedMotion();
  const audioRef = useRef<HTMLAudioElement>(null);
  const frameRef = useRef<number | null>(null);
  const autoAdvanceRef = useRef<number | null>(null);
  const tutorialStateRef = useRef({ step: 0, isPlaying: false });
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [imagesReady, setImagesReady] = useState(mode !== 'GO_NO_GO');
  const [imageError, setImageError] = useState(false);
  const definition = tutorials[mode];
  const selected = GAME_MODES.find((item) => item.mode === mode)!;
  const current = definition.steps[step]!;
  tutorialStateRef.current = { step, isPlaying };

  function stopFrame() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }

  function stopAutoAdvance() {
    if (autoAdvanceRef.current !== null) window.clearInterval(autoAdvanceRef.current);
    autoAdvanceRef.current = null;
    setAutoAdvanceSeconds(null);
  }

  function updateProgress() {
    const audio = audioRef.current;
    if (!audio) return;
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    setProgress(duration > 0 ? Math.min(audio.currentTime / duration, 1) : 0);
    if (!audio.paused && !audio.ended) frameRef.current = requestAnimationFrame(updateProgress);
  }

  async function playNarration() {
    const audio = audioRef.current;
    if (!audio || !current.audioSrc) return;
    setAudioError(false);
    try {
      await audio.play();
      setNeedsGesture(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setNeedsGesture(true);
      } else if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setAudioError(true);
      }
    }
  }

  function pauseNarration() {
    audioRef.current?.pause();
  }

  function replayNarration() {
    const audio = audioRef.current;
    if (!audio) return;
    stopAutoAdvance();
    audio.currentTime = 0;
    setProgress(0);
    void playNarration();
  }

  function stopNarration() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    stopFrame();
  }

  useEffect(() => {
    if (mode !== 'GO_NO_GO') return;
    let active = true;
    void preloadGoNoGoImages()
      .then(() => {
        if (active) setImagesReady(true);
      })
      .catch(() => {
        if (active) setImageError(true);
      });
    return () => {
      active = false;
    };
  }, [mode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    stopFrame();
    audio.pause();
    audio.removeAttribute('src');
    if (current.audioSrc) {
      audio.src = current.audioSrc;
      audio.load();
    }
    setProgress(0);
    setIsPlaying(false);
    setNeedsGesture(false);
    setAudioError(false);

    const handlePlay = () => {
      setIsPlaying(true);
      stopFrame();
      frameRef.current = requestAnimationFrame(updateProgress);
    };
    const handlePause = () => {
      setIsPlaying(false);
      stopFrame();
      updateProgress();
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(1);
      stopFrame();
      stopAutoAdvance();
      if (step < definition.steps.length - 1) {
        setAutoAdvanceSeconds(3);
        autoAdvanceRef.current = window.setInterval(() => {
          setAutoAdvanceSeconds((seconds) => {
            if (seconds === null) return null;
            if (seconds <= 1) {
              if (autoAdvanceRef.current !== null) window.clearInterval(autoAdvanceRef.current);
              autoAdvanceRef.current = null;
              setStep((currentStep) => Math.min(currentStep + 1, definition.steps.length - 1));
              return null;
            }
            return seconds - 1;
          });
        }, 1_000);
      }
    };
    const handleError = () => {
      setAudioError(true);
      setIsPlaying(false);
      stopFrame();
    };
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    void playNarration();

    return () => {
      audio.pause();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      stopFrame();
      stopAutoAdvance();
    };
  }, [current.audioSrc]);

  function changeStep(next: number) {
    if (next < 0 || next >= definition.steps.length) return;
    stopAutoAdvance();
    stopNarration();
    setStep(next);
  }

  function leaveTutorial(action: () => void) {
    stopAutoAdvance();
    stopNarration();
    action();
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.altKey || event.metaKey || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.matches('input, textarea, select, button, a, [role="button"]'))) return;
      const state = tutorialStateRef.current;
      if (event.code === 'Space') {
        event.preventDefault();
        if (state.isPlaying) pauseNarration();
        else void playNarration();
        return;
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        replayNarration();
        return;
      }
      if (event.key === 'ArrowLeft' && state.step > 0) {
        event.preventDefault();
        changeStep(state.step - 1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (state.step < definition.steps.length - 1) changeStep(state.step + 1);
        else leaveTutorial(onReady);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [definition.steps.length, onReady]);

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-[88rem] flex-col overflow-hidden" aria-labelledby="tutorial-title">
      <audio aria-label={`Panduan suara langkah ${step + 1}`} lang={definition.audioLanguage} preload="auto" ref={audioRef} />
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-5">
        <div><p className="landing-eyebrow">Tutorial untuk {participantName}</p><h1 className="m-0 text-4xl font-black tracking-[-0.05em] sm:text-5xl" id="tutorial-title">{selected.title}</h1><p className="mt-3 mb-0 text-lg font-bold text-muted">{definition.instruction}</p></div>
        <div className="flex items-center gap-4"><p aria-label={`Langkah ${step + 1} dari ${definition.steps.length}`} className="m-0 text-2xl font-black text-accent">{step + 1}/{definition.steps.length}</p><Button onClick={() => leaveTutorial(onReady)} variant="quiet">Lewati tutorial</Button></div>
      </header>

      <div className={`grid min-h-0 flex-1 items-center gap-6 py-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 ${mode === 'GO_NO_GO' ? 'overflow-hidden sm:py-6' : 'overflow-y-auto py-8'}`}>
        <AnimatePresence initial={false} mode="wait">
          <m.div animate={{ opacity: 1, scale: 1, y: 0 }} className="grid w-full place-items-center" exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.98, y: reduceMotion ? 0 : -10 }} initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.98, y: reduceMotion ? 0 : 14 }} key={`${mode}-${step}`} transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}>
            <TutorialVisual fruit={fruit} mode={mode} progress={progress} step={step} />
          </m.div>
        </AnimatePresence>
        <AnimatePresence initial={false} mode="wait">
          <m.div animate={{ opacity: 1, x: 0 }} className="max-w-xl" exit={{ opacity: 0, x: reduceMotion ? 0 : -18 }} initial={{ opacity: 0, x: reduceMotion ? 0 : 18 }} key={current.title} transition={{ duration: reduceMotion ? 0 : 0.26 }}>
            <p className="m-0 text-sm font-black tracking-[0.1em] text-accent uppercase">Langkah {step + 1}</p>
            <h2 className="mt-3 mb-0 text-4xl font-black tracking-[-0.04em]">{current.title}</h2>
            <p className="mt-5 mb-0 text-xl leading-9">{current.instruction}</p>
            {current.caption && <p className="mt-4 mb-0 text-base leading-7 text-muted">{current.caption}</p>}
            {current.audioSrc && <div aria-label={`Progres panduan suara ${Math.round(progress * 100)} persen`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.round(progress * 100)} className="mt-7 h-2 overflow-hidden rounded-full bg-divider" role="progressbar"><div className="h-full origin-left bg-accent transition-transform duration-100" style={{ transform: `scaleX(${progress})` }} /></div>}
            {autoAdvanceSeconds !== null && <div className="mt-4 flex items-center gap-3" role="status"><span className="grid size-9 place-items-center rounded-full bg-brand-soft text-lg font-black text-accent">{autoAdvanceSeconds}</span><span className="font-bold text-muted">Langkah berikutnya segera dimulai…</span></div>}
            {audioError && <p className="mt-3 mb-0 text-sm font-bold text-danger" role="alert">Panduan suara belum dapat diputar. Anda tetap dapat membaca petunjuk di layar.</p>}
          </m.div>
        </AnimatePresence>
        {mode === 'GO_NO_GO' && (!imagesReady || imageError) && <div className="lg:col-span-2">{!imagesReady && !imageError && <p className="m-0 text-sm font-bold text-muted" role="status">Menyiapkan gambar permainan…</p>}{imageError && <p className="m-0 text-sm font-bold text-danger" role="alert">Gambar permainan belum dapat dimuat. Periksa koneksi lalu muat ulang halaman.</p>}</div>}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 pb-2">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => leaveTutorial(onBack)} variant="quiet"><ChevronLeft aria-hidden className="size-5" />Kembali ke nama peserta</Button>
          {current.audioSrc && <Button onClick={isPlaying ? pauseNarration : () => void playNarration()} variant="secondary">{isPlaying ? <Pause aria-hidden className="size-5" /> : <Play aria-hidden className="size-5" />}{isPlaying ? 'Jeda' : needsGesture ? 'Putar panduan' : 'Putar'}</Button>}
          {current.audioSrc && <Button onClick={replayNarration} variant="quiet"><RotateCcw aria-hidden className="size-5" />Ulangi</Button>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={step === 0} onClick={() => changeStep(step - 1)} variant="quiet"><ChevronLeft aria-hidden className="size-5" />Sebelumnya</Button>
          {step < definition.steps.length - 1 ? <Button onClick={() => changeStep(step + 1)} variant="secondary">Berikutnya<ChevronRight aria-hidden className="size-5" /></Button> : <Button disabled={!imagesReady || imageError} onClick={() => leaveTutorial(onReady)}>Mulai bermain<ChevronRight aria-hidden className="size-5" /></Button>}
        </div>
      </footer>
    </section>
  );
}

export interface GameParticipantIdentity {
  displayName: string;
  participantReference: string;
}

interface GameParticipantEntryProps {
  csrfToken: string;
  mode: GameMode;
  onContinue: (participant: GameParticipantIdentity) => void;
}

export function GameParticipantEntry({ csrfToken, mode, onContinue }: GameParticipantEntryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [name, setName] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantDto | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>('');
  const [error, setError] = useState('');
  const deferredName = useDeferredValue(name);
  const searchInput = deferredName.trim();
  const search = useParticipantSearchQuery(searchInput);
  const createParticipant = useCreateParticipantMutation(csrfToken);
  const suggestions = search.data ?? [];
  const searchSettled = searchInput === name.trim();
  const hasName = name.trim().length > 0;
  const isSearching = hasName && !selectedParticipant && (!searchSettled || search.isFetching);
  const showSuggestions = dropdownOpen && !selectedParticipant && searchSettled && !search.isFetching && suggestions.length > 0;
  const isNewParticipant = hasName && !selectedParticipant && searchSettled && !search.isFetching && suggestions.length === 0;
  const selectedMode = GAME_MODES.find((item) => item.mode === mode)!;

  function choose(participant: ParticipantDto) {
    setName(participant.displayName);
    setSelectedParticipant(participant);
    setGender('');
    setDropdownOpen(false);
    setError('');
    inputRef.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = name.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      setError('Masukkan nama peserta.');
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    if (!selectedParticipant && (!searchSettled || search.isFetching)) {
      setError('Tunggu pencarian peserta selesai.');
      return;
    }
    const existing = selectedParticipant?.displayName.toLocaleLowerCase('id-ID') === normalized.toLocaleLowerCase('id-ID')
      ? selectedParticipant
      : suggestions.find((participant) => participant.displayName.toLocaleLowerCase('id-ID') === normalized.toLocaleLowerCase('id-ID'));
    if (existing) {
      onContinue({ displayName: existing.displayName, participantReference: existing.participantReference });
      return;
    }
    if (!gender) {
      setError('Pilih jenis kelamin peserta baru.');
      return;
    }
    try {
      const participant = await createParticipant.mutateAsync({ displayName: normalized, gender });
      onContinue({ displayName: participant.displayName, participantReference: participant.participantReference });
    } catch (creationError) {
      setError(messageOf(creationError));
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  return (
    <section className="mx-auto max-w-2xl" aria-labelledby="participant-title">
      <div className="mb-6 flex items-center gap-4 rounded-md bg-accent-soft p-4"><img alt="Arko" className="size-16 object-contain" src={arkoKoala} /><div><p className="m-0 text-sm font-black tracking-[0.08em] text-accent uppercase">{selectedMode.title}</p><p className="mt-1 mb-0 font-bold text-ink-soft">Arko akan menemani sesi ini.</p></div></div>
      <h1 className="m-0 text-4xl font-black tracking-[-0.05em] sm:text-5xl" id="participant-title">Siapa yang akan bermain?</h1>
      <p className="mt-4 mb-0 text-lg leading-8 text-muted">Cari peserta yang sudah ada. Jika namanya belum terdaftar, profil baru akan dibuat otomatis.</p>
      <form className="mt-8 grid gap-5 rounded-md border-2 border-divider p-6 sm:p-8" noValidate onSubmit={submit}>
        <div className="relative">
          <Field aria-autocomplete="list" aria-controls={listId} aria-expanded={showSuggestions} autoComplete="off" autoFocus error={error} hint={error ? undefined : selectedParticipant ? undefined : 'Ketik nama peserta.'} inputRef={inputRef} label="Cari atau tambah peserta" maxLength={100} name="participantName" onChange={(event) => { setName(event.target.value); setSelectedParticipant(null); setGender(''); setDropdownOpen(true); if (error) setError(''); }} placeholder="Contoh: Andrian" required role="combobox" trailing={<img alt="" aria-hidden className="mr-3 size-6 object-contain" src={searchReference} />} value={name} />
          {isSearching && <p className="mt-2 mb-0 flex items-center gap-2 text-sm font-bold text-muted" role="status"><Search aria-hidden className="size-4 animate-pulse" />Mencari peserta…</p>}
          {showSuggestions && <div className="absolute inset-x-0 top-[5.6rem] z-20 max-h-64 overflow-y-auto overscroll-contain rounded-sm border-2 border-ink bg-white p-1 shadow-[0_5px_0_#b7c8d8]"><p className="sticky top-0 z-10 m-0 bg-white px-3 py-2 text-xs font-black tracking-[0.08em] text-muted uppercase">Peserta ditemukan</p><ul className="m-0 list-none p-0" id={listId} role="listbox">{suggestions.map((participant) => <li className="border-b-2 border-divider last:border-b-0" key={participant.participantId} role="option"><button className="flex min-h-12 w-full items-center px-3 text-left font-bold hover:bg-divider focus-visible:bg-divider" onClick={() => choose(participant)} type="button">{participant.displayName}</button></li>)}</ul></div>}
          {isNewParticipant && <p className="mt-2 mb-0 flex items-center gap-2 text-sm font-bold text-muted"><UserPlus aria-hidden className="size-4" />Peserta baru. Profil akan dibuat saat melanjutkan.</p>}
          {selectedParticipant && <p className="mt-2 mb-0 flex items-center gap-2 text-sm font-bold text-success"><Check aria-hidden className="size-4" />Peserta dipilih: {selectedParticipant.displayName}</p>}
        </div>
        <AnimatePresence initial={false}>{isNewParticipant && <m.fieldset animate={{ height: 'auto', opacity: 1, y: 0 }} className="m-0 overflow-hidden border-0 p-0" exit={{ height: 0, opacity: 0, y: -10 }} initial={{ height: 0, opacity: 0, y: -10 }} transition={{ duration: 0.25 }}><legend className="mb-3 text-sm font-black">Jenis kelamin peserta baru</legend><div className="grid grid-cols-2 gap-3">{([['MALE', 'Laki-laki', Mars], ['FEMALE', 'Perempuan', Venus]] as const).map(([value, label, Icon]) => <button aria-pressed={gender === value} className={`flex min-h-14 items-center justify-center gap-2 rounded-sm border-2 px-4 font-black transition ${gender === value ? 'border-ink bg-brand-soft text-ink shadow-[0_3px_0_#171711]' : 'border-divider bg-white text-muted hover:border-ink'}`} key={value} onClick={() => { setGender(value); if (error) setError(''); }} type="button"><Icon aria-hidden className="size-5" />{label}</button>)}</div></m.fieldset>}</AnimatePresence>
        <Button disabled={createParticipant.isPending || isSearching || (isNewParticipant && !gender)} type="submit">{createParticipant.isPending ? 'Membuat peserta…' : isNewParticipant ? 'Buat peserta dan lanjut' : 'Lanjut ke tutorial'}</Button>
      </form>
    </section>
  );
}

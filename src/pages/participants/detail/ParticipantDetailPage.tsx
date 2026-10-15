import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Camera, Clock3, FileDown, ImageOff, Mars, Pencil, Venus } from 'lucide-react';
import { m, useReducedMotion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import type { GameMode, HistoryPageDto, ParticipantDetailDto } from '@/schemas/index.ts';
import { clipboardEmoji } from '@/assets/index.ts';
import { AccountHeader, Button, DatePicker, Field, buttonClassName } from '@/components/index.ts';
import { SummaryLoading } from '@/components/AiSummaryPanels';
import { FruitIcon } from '@/components/SqueezableFruit';
import { messageOf } from '@/config/api-client.ts';
import { API_ENDPOINTS, apiUrl } from '@/constants/api.ts';
import { GAME_MODES } from '@/constants/game-modes.ts';
import { ROUTES } from '@/constants/routes.ts';
import { useAccountPage } from '@/hooks/auth';
import { useUpdateParticipantMutation } from '@/hooks/participants';
import { useParticipantHistoryPreviewQuery, useParticipantQuery } from '@/hooks/participants';
import { validateAvatarFile } from '@/lib/avatar.ts';
import { AvatarCropDialog } from '@/pages/profile/AvatarCropDialog';

function initials(name: string) {
  return name.trim().split(/\s+/u).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toLocaleUpperCase('id-ID');
}

function ScoreTrendChart({ history }: { history: HistoryPageDto['items'] }) {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<GameMode>('MOTOR_GRIP');
  const width = 680;
  const height = 280;
  const left = 42;
  const right = 24;
  const top = 30;
  const bottom = 44;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const selected = GAME_MODES.find((item) => item.mode === mode)!;
  const data = history.filter((item) => item.mode === mode && item.score !== null && item.completedAt).slice(0, 7).reverse();
  const points = data.map((item, index) => ({ ...item, score: item.score ?? 0, x: left + (index / Math.max(data.length - 1, 1)) * plotWidth, y: top + plotHeight - ((item.score ?? 0) / 1000) * plotHeight }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const average = data.length ? Math.round(data.reduce((sum, item) => sum + (item.score ?? 0), 0) / data.length) : null;
  return (
    <div>
      <div aria-label="Pilih mode tren skor" className="flex max-w-full gap-2 overflow-x-auto pb-1" role="tablist">{GAME_MODES.map((game) => <button aria-controls="score-trend-panel" aria-selected={mode === game.mode} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-0 px-4 text-sm font-black transition ${mode === game.mode ? 'text-white shadow-[0_3px_0_rgba(23,23,17,0.18)]' : 'bg-canvas text-ink hover:bg-divider'}`} key={game.mode} onClick={() => setMode(game.mode)} role="tab" style={mode === game.mode ? { backgroundColor: game.color } : undefined} type="button"><img alt="" aria-hidden className="size-5" src={game.emoji} />{game.title}</button>)}</div>
      <div className="mt-4" id="score-trend-panel" role="tabpanel">
        {data.length === 0 ? <div className="grid min-h-64 place-items-center text-center text-muted"><div><p className="m-0 text-lg font-black">Belum ada tren {selected.title}</p><p className="mt-2 mb-0">Grafik akan tampil setelah permainan tersimpan.</p></div></div> : <><div className="overflow-x-auto"><svg aria-label={`Tren skor terbaru ${selected.title}`} className="h-auto min-w-[34rem] w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
          {[0, 0.5, 1].map((ratio) => { const y = top + plotHeight * ratio; return <g key={ratio}><line stroke="#dbe8f2" strokeWidth="2" x1={left} x2={left + plotWidth} y1={y} y2={y} /><text fill="#625f54" fontSize="12" fontWeight="700" textAnchor="end" x={left - 8} y={y + 4}>{Math.round(1000 * (1 - ratio))}</text></g>; })}
          {points.length > 1 && <m.polyline animate={{ pathLength: 1, opacity: 1 }} fill="none" initial={reduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }} points={line} stroke={selected.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" transition={{ duration: 0.8, ease: 'easeOut' }} />}{points.map((point, index) => <m.g animate={{ opacity: 1, scale: 1 }} initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }} key={point.sessionId} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} transition={{ delay: reduceMotion ? 0 : 0.12 * index, duration: 0.3 }}><circle cx={point.x} cy={point.y} fill="white" r="6" stroke={selected.color} strokeWidth="4" /><text fill="#171711" fontSize="12" fontWeight="800" textAnchor="middle" x={point.x} y={point.y - 13}>{point.score}</text></m.g>)}
        </svg></div><div className="mt-2 rounded-sm bg-canvas/70 p-3"><span className="flex items-center gap-2 font-black"><span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: selected.color }} /><img alt="" aria-hidden className="size-6" src={selected.emoji} />{selected.title}</span><span className="mt-2 block text-sm font-bold text-muted">Rata-rata {average}</span></div></>}
      </div>
    </div>
  );
}

function SessionDistribution({ summaries }: { summaries: ParticipantDetailDto['modeSummaries'] }) {
  const reduceMotion = useReducedMotion();
  const total = summaries.reduce((sum, item) => sum + item.savedSessionsTotal, 0);
  let offset = 0;
  const segments = summaries.map((summary, index) => {
    const value = total === 0 ? 0 : summary.savedSessionsTotal / total;
    const segment = { ...summary, value, offset, color: GAME_MODES[index]!.color };
    offset += value;
    return segment;
  });
  const gradient = total === 0 ? '#dbe8f2 0 100%' : segments.map((segment) => `${segment.color} ${segment.offset * 100}% ${(segment.offset + segment.value) * 100}%`).join(', ');
  return (
    <div className="flex h-full flex-col">
      <m.div animate={{ opacity: 1, rotate: 0, scale: 1 }} className="mx-auto grid size-44 place-items-center rounded-full" initial={reduceMotion ? { opacity: 1, rotate: 0, scale: 1 } : { opacity: 0, rotate: -35, scale: 0.75 }} style={{ background: `conic-gradient(${gradient})` }} transition={{ duration: 0.65, ease: 'easeOut' }}><div className="grid size-28 place-items-center rounded-full bg-white text-center"><span><strong className="block text-4xl">{total}</strong><span className="text-sm font-bold text-muted">permainan</span></span></div></m.div>
      <ul className="mt-6 grid list-none gap-3 p-0">{segments.map((segment) => { const game = GAME_MODES.find((item) => item.mode === segment.mode)!; return <li className="flex items-center justify-between gap-4" key={segment.mode}><span className="flex items-center gap-3 font-bold"><span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: segment.color }} /><img alt="" aria-hidden className="size-6" src={game.emoji} />{game.title}</span><strong>{segment.savedSessionsTotal}</strong></li>; })}</ul>
    </div>
  );
}

function ModeSummaryCard({ summary }: { summary: ParticipantDetailDto['modeSummaries'][number] }) {
  const game = GAME_MODES.find((item) => item.mode === summary.mode)!;
  const averageScore = summary.overallMetrics?.averageScore;
  return (
    <article className="flex min-h-44 flex-col rounded-md bg-canvas/70 p-5">
      <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full" style={{ backgroundColor: game.softColor }}>{summary.mode === 'MOTOR_GRIP' ? <FruitIcon className="size-9" fruit="ORANGE" /> : <img alt="" aria-hidden className="size-7" src={game.emoji} />}</span><div><h3 className="m-0 text-xl font-black">{game.title}</h3><p className="mt-1 mb-0 text-sm font-bold text-muted">{summary.savedSessionsTotal} permainan tersimpan</p></div></div>
      {summary.latestSession ? <div className="mt-auto grid grid-cols-2 gap-4 pt-5"><div><span className="text-sm font-bold text-muted">Rata-rata skor</span><strong className="mt-1 block text-2xl">{averageScore ?? '—'}</strong></div><div><span className="text-sm font-bold text-muted">Skor terbaru</span><strong className="mt-1 block text-2xl">{summary.latestSession.score}</strong></div></div> : <div className="grid flex-1 place-items-center text-center text-muted"><p className="m-0 font-bold">Belum ada data permainan.</p></div>}
    </article>
  );
}

function OverallModePanel({ summary }: { summary: ParticipantDetailDto['modeSummaries'][number] | undefined }) {
  const reduceMotion = useReducedMotion();
  if (!summary) return null;
  const game = GAME_MODES.find((item) => item.mode === summary.mode)!;
  const metrics = summary.overallMetrics;
  if (!metrics) return <div className="grid min-h-80 place-items-center text-center text-muted"><div><img alt="" aria-hidden className="mx-auto size-12" src={game.emoji} /><p className="mt-4 mb-0 text-lg font-black">Belum ada statistik {game.title}</p><p className="mt-2 mb-0">Statistik overall akan tampil setelah permainan pertama tersimpan.</p></div></div>;
  if (metrics.mode === 'MOTOR_GRIP') {
    const bars = [{ label: 'Beban rata-rata', value: metrics.averageKilograms, display: `${metrics.averageKilograms.toFixed(2)} kg` }, { label: 'Beban puncak rata-rata', value: metrics.averagePeakKilograms, display: `${metrics.averagePeakKilograms.toFixed(2)} kg` }];
    return <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center"><div className="grid grid-cols-2 gap-3"><div className="border-l-4 border-divider py-1 pl-4"><span className="text-sm font-bold text-muted">Rata-rata skor</span><strong className="mt-2 block text-3xl">{metrics.averageScore}</strong></div><div className="border-l-4 border-divider py-1 pl-4"><span className="text-sm font-bold text-muted">Tahanan terpanjang</span><strong className="mt-2 block text-3xl">{(metrics.averageContinuousHoldMs / 1000).toFixed(1)} dtk</strong></div><div className="col-span-2 border-l-4 border-divider py-1 pl-4"><span className="text-sm font-bold text-muted">Jumlah permainan</span><strong className="mt-2 block text-3xl">{summary.savedSessionsTotal}</strong></div></div><div className="grid gap-7">{bars.map((item) => <div key={item.label}><div className="flex items-end justify-between gap-4"><span className="font-black">{item.label}</span><strong className="text-2xl">{item.display}</strong></div><div className="mt-3 h-7 overflow-hidden rounded-full bg-divider"><m.div animate={{ width: `${(item.value / 5) * 100}%` }} className="h-full rounded-full" initial={{ width: reduceMotion ? `${(item.value / 5) * 100}%` : 0 }} style={{ backgroundColor: game.color }} transition={{ duration: 0.85, ease: 'easeOut' }} /></div></div>)}</div></div>;
  }
  if (metrics.mode === 'GO_NO_GO') {
    const responses = [{ label: 'Jawaban benar', value: metrics.totalHits + metrics.totalCorrectRejections, color: game.color }, { label: 'Terlewat', value: metrics.totalMisses, color: '#e7b82c' }, { label: 'Jawaban keliru', value: metrics.totalFalsePositives, color: '#dc4c3f' }];
    let offset = 0;
    const segments = responses.map((item) => { const ratio = metrics.totalTrials === 0 ? 0 : item.value / metrics.totalTrials; const result = { ...item, offset, ratio }; offset += ratio; return result; });
    const gradient = segments.map((item) => `${item.color} ${item.offset * 100}% ${(item.offset + item.ratio) * 100}%`).join(', ');
    return <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center"><div className="grid grid-cols-2 gap-3"><div className="border-l-4 border-divider py-1 pl-4"><span className="text-sm font-bold text-muted">Akurasi overall</span><strong className="mt-2 block text-3xl">{Math.round(metrics.averageAccuracyPercent)}%</strong></div><div className="border-l-4 border-divider py-1 pl-4"><span className="text-sm font-bold text-muted">Waktu reaksi</span><strong className="mt-2 block text-3xl">{metrics.averageReactionMs === null ? '—' : `${Math.round(metrics.averageReactionMs)} ms`}</strong></div><div className="border-l-4 border-divider py-1 pl-4"><span className="text-sm font-bold text-muted">Rata-rata skor</span><strong className="mt-2 block text-3xl">{metrics.averageScore}</strong></div><div className="border-l-4 border-divider py-1 pl-4"><span className="text-sm font-bold text-muted">Jumlah permainan</span><strong className="mt-2 block text-3xl">{summary.savedSessionsTotal}</strong></div></div><div className="grid items-center gap-7 sm:grid-cols-[auto_1fr]"><m.div animate={{ opacity: 1, rotate: 0, scale: 1 }} aria-label={`Komposisi ${metrics.totalTrials} respons`} className="mx-auto grid size-48 place-items-center rounded-full" initial={reduceMotion ? { opacity: 1, rotate: 0, scale: 1 } : { opacity: 0, rotate: -30, scale: 0.75 }} role="img" style={{ background: `conic-gradient(${gradient})` }} transition={{ duration: 0.7 }}><div className="grid size-30 place-items-center rounded-full bg-white text-center"><span><strong className="block text-3xl">{metrics.totalTrials}</strong><span className="text-sm font-bold text-muted">respons</span></span></div></m.div><ul className="m-0 grid list-none gap-3 p-0">{responses.map((item) => <li className="flex items-center justify-between gap-4" key={item.label}><span className="flex items-center gap-3 font-bold"><span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span><strong>{item.value}</strong></li>)}</ul></div></div>;
  }
  const width = 720;
  const height = 280;
  const left = 62;
  const right = 30;
  const top = 38;
  const bottom = 48;
  const maxLatency = Math.max(...metrics.levelLatencies.map((item) => item.latencyMs), 1);
  const points = metrics.levelLatencies.map((point, index) => ({ ...point, x: left + (index / Math.max(metrics.levelLatencies.length - 1, 1)) * (width - left - right), y: top + (height - top - bottom) - (point.latencyMs / maxLatency) * (height - top - bottom) }));
  return <div className="grid gap-7"><div className="grid gap-3 sm:grid-cols-4"><div className="border-l-4 border-divider py-1 pl-4"><span className="text-sm font-bold text-muted">Memory span</span><strong className="mt-2 block text-3xl">{metrics.averageMemorySpan.toFixed(1)}</strong></div><div className="border-l-4 border-divider py-1 pl-4"><span className="text-sm font-bold text-muted">Rata-rata skor</span><strong className="mt-2 block text-3xl">{metrics.averageScore}</strong></div><div className="border-l-4 border-divider py-1 pl-4"><span className="text-sm font-bold text-muted">Respons pertama</span><strong className="mt-2 block text-3xl">{metrics.averageFirstResponseMs === null ? '—' : `${Math.round(metrics.averageFirstResponseMs)} ms`}</strong></div><div className="border-l-4 border-divider py-1 pl-4"><span className="text-sm font-bold text-muted">Jumlah permainan</span><strong className="mt-2 block text-3xl">{summary.savedSessionsTotal}</strong></div></div>{points.length > 0 ? <div className="overflow-x-auto"><svg aria-label="Rata-rata latensi overall per level" className="h-auto min-w-[36rem] w-full" role="img" viewBox={`0 0 ${width} ${height}`}>{[0, 0.5, 1].map((ratio) => { const y = top + (height - top - bottom) * ratio; return <g key={ratio}><line stroke="#dbe8f2" strokeWidth="2" x1={left} x2={width - right} y1={y} y2={y} /><text fill="#625f54" fontSize="12" fontWeight="700" textAnchor="end" x={left - 10} y={y + 4}>{Math.round(maxLatency * (1 - ratio))} ms</text></g>; })}{points.length > 1 && <m.polyline animate={{ pathLength: 1, opacity: 1 }} fill="none" initial={reduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }} points={points.map((point) => `${point.x},${point.y}`).join(' ')} stroke={game.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" transition={{ duration: 0.9, ease: 'easeOut' }} />}{points.map((point, index) => <m.g animate={{ opacity: 1, scale: 1 }} initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }} key={point.level} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} transition={{ delay: index * 0.12 }}><circle cx={point.x} cy={point.y} fill="white" r="7" stroke={game.color} strokeWidth="4" /><text fill="#171711" fontSize="13" fontWeight="800" textAnchor="middle" x={point.x} y={point.y - 15}>{Math.round(point.latencyMs)} ms</text><text fill="#625f54" fontSize="12" fontWeight="700" textAnchor="middle" x={point.x} y={height - 14}>Level {point.level}</text></m.g>)}</svg></div> : <div className="grid min-h-56 place-items-center text-center text-muted"><div><p className="m-0 font-black">Latensi per level belum tersedia</p><p className="mt-2 mb-0">Data ini akan dihitung dari permainan baru.</p></div></div>}</div>;
}

function AggregateSummaryTabs({ participantId, summary }: { participantId: string; summary: NonNullable<ParticipantDetailDto['aggregateSummary']> }) {
  const [audience, setAudience] = useState<'participant' | 'clinician'>('participant');
  const pending = ['DETERMINISTIC', 'PENDING', 'PROCESSING'].includes(summary.source);
  const pendingTooLong = Date.now() - new Date(summary.updatedAt).getTime() >= 10 * 60 * 1_000;
  if (pending && !pendingTooLong) return <div className="mt-5"><SummaryLoading overall /></div>;
  const fallbackContent = audience === 'participant'
    ? 'Ringkasan otomatis belum tersedia. Statistik seluruh permainan Anda tetap dapat dilihat pada bagian perkembangan di bawah.'
    : 'Ringkasan otomatis belum tersedia. Gunakan statistik per mode dan riwayat sesi sebagai sumber utama untuk peninjauan peserta.';
  const content = (audience === 'participant' ? summary.participantSummary : summary.clinicianSummary) || fallbackContent;
  return (
    <div className="mt-5 overflow-hidden rounded-md border-2 border-divider bg-white">
      <div aria-label="Pilih ringkasan keseluruhan" className="flex gap-2 border-b-2 border-divider px-5 pt-4" role="tablist">{([['participant', 'Peserta'], ['clinician', 'Dokter']] as const).map(([value, label]) => <button aria-controls="aggregate-summary-panel" aria-selected={audience === value} className={`min-h-11 border-0 border-b-4 bg-transparent px-4 text-sm font-black ${audience === value ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'}`} key={value} onClick={() => setAudience(value)} role="tab" type="button">{label}</button>)}</div>
      <article className="p-5 sm:p-6" id="aggregate-summary-panel" role="tabpanel"><p className="m-0 text-base leading-8 font-bold">{content}</p><div className="mt-5 flex justify-end"><a className={buttonClassName('secondary')} href={apiUrl(API_ENDPOINTS.participants.report(participantId, audience))}><FileDown aria-hidden className="size-5" />Unduh PDF {audience === 'participant' ? 'peserta' : 'dokter'}</a></div></article>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-label="Memuat profil peserta" className="mt-8 animate-pulse" role="status">
      <div className="flex items-center gap-4"><span className="size-16 rounded-full bg-brand-soft" /><div><span className="block h-11 w-64 rounded-sm bg-divider" /><span className="mt-3 block h-5 w-28 rounded-sm bg-divider/70" /></div></div>
      <div className="mt-10 h-9 w-56 rounded-sm bg-divider" />
      <div className="mt-5 grid gap-4 lg:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div className="h-56 rounded-md border-2 border-divider bg-white p-5" key={index}><span className="block size-12 rounded-full bg-brand-soft" /><span className="mt-5 block h-7 w-36 rounded-sm bg-divider" /><span className="mt-5 block h-5 w-full rounded-sm bg-divider/70" /></div>)}</div>
      <div className="mt-10 grid gap-4 lg:grid-cols-[1.6fr_0.8fr]"><div className="h-96 rounded-md bg-divider/40" /><div className="h-96 rounded-md bg-divider/40" /></div>
    </div>
  );
}

export function ParticipantDetailPage() {
  const { participantId } = useParams();
  const { session, signOut } = useAccountPage();
  const participant = useParticipantQuery(participantId);
  const history = useParticipantHistoryPreviewQuery(participantId);
  const updateParticipant = useUpdateParticipantMutation(participantId, session.data?.csrfToken ?? '');
  const imageRef = useRef<HTMLInputElement>(null);
  const [overallMode, setOverallMode] = useState<GameMode>('SEQUENCE_MEMORY');
  const [editOpen, setEditOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>('');
  const [image, setImage] = useState<string | null>(null);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!participant.data) return;
    setName(participant.data.displayName);
    setDateOfBirth(participant.data.dateOfBirth ?? '');
    setGender(participant.data.gender ?? '');
    setImage(participant.data.image);
  }, [participant.data]);

  async function saveParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = name.trim().replace(/\s+/gu, ' ');
    if (!normalized) {
      setEditError('Nama peserta wajib diisi.');
      return;
    }
    setEditError('');
    try {
      await updateParticipant.mutateAsync({ displayName: normalized, image, dateOfBirth: dateOfBirth || null, gender: gender || null });
      setEditOpen(false);
    } catch (error) {
      setEditError(messageOf(error));
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-white text-ink">
      <div aria-hidden className="landing-glow landing-glow-soft -top-36 -right-40 size-[34rem]" />
      <AccountHeader isSigningOut={signOut.isPending} onSignOut={() => session.data && signOut.mutate(session.data)} user={session.data} />
      <main className="relative mx-auto w-full max-w-[72rem] px-4 py-8 outline-none sm:px-6 lg:px-8 lg:py-12" tabIndex={-1}>
        <Link className="group inline-flex min-h-11 items-center gap-2 font-black no-underline" to={ROUTES.progressBoard}><ArrowLeft aria-hidden className="size-5" /><span className="relative after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:bg-ink after:transition-transform group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100">Kembali ke Progress Board</span></Link>
        {participant.isPending ? <ProfileSkeleton /> : participant.isError || !participant.data ? <div className="mt-8 grid min-h-56 place-items-center text-muted" role="status">Profil peserta tidak tersedia.</div> : (
          <>
            <section className="mt-8"><p className="landing-eyebrow">Profil peserta</p><div className="flex flex-wrap items-center justify-between gap-5"><div className="flex min-w-0 items-center gap-4"><button aria-expanded={avatarOpen} aria-label="Ubah foto peserta" className="group relative size-18 shrink-0 overflow-hidden rounded-full border-0 bg-brand-soft p-0" onClick={() => setAvatarOpen(true)} type="button">{participant.data.image ? <img alt={`Foto ${participant.data.displayName}`} className="size-full object-cover" src={participant.data.image} /> : <span className="grid size-full place-items-center text-xl font-black">{initials(participant.data.displayName) || <img alt="" aria-hidden className="size-9" src={clipboardEmoji} />}</span>}<span aria-hidden className="absolute inset-0 grid place-items-center bg-ink/0 text-white opacity-0 transition-[background-color,opacity] group-hover:bg-ink/60 group-hover:opacity-100 group-focus-visible:bg-ink/60 group-focus-visible:opacity-100"><Camera className="size-6" /></span></button><div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><h1 className="m-0 truncate text-4xl font-black tracking-[-0.05em] sm:text-5xl">{participant.data.displayName}</h1><button aria-label="Edit peserta" className="grid size-10 shrink-0 place-items-center rounded-full border-0 bg-transparent text-muted transition hover:bg-divider hover:text-ink" onClick={() => { setName(participant.data.displayName); setDateOfBirth(participant.data.dateOfBirth ?? ''); setGender(participant.data.gender ?? ''); setEditError(''); setEditOpen(true); }} type="button"><Pencil aria-hidden className="size-5" /></button></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-bold text-muted"><span>{participant.data.status === 'ACTIVE' ? 'Peserta aktif' : 'Peserta nonaktif'}</span>{participant.data.gender && <span>{participant.data.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}</span>}{participant.data.dateOfBirth && <span>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${participant.data.dateOfBirth}T00:00:00.000Z`))}</span>}</div></div></div>{participantId && <Link className={buttonClassName('secondary')} to={ROUTES.participantHistory(participantId)}><Clock3 aria-hidden className="size-5" />Lihat history</Link>}</div><input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { validateAvatarFile(file); setCropFile(file); setEditError(''); } catch (error) { setEditError(error instanceof Error ? error.message : 'Foto belum dapat diproses.'); } }} ref={imageRef} type="file" />{editError && !editOpen && <p className="mt-3 mb-0 font-bold text-danger" role="alert">{editError}</p>}</section>

            <section aria-labelledby="mode-summary-title" className="mt-10"><h2 className="m-0 text-3xl font-black" id="mode-summary-title">Ringkasan per mode</h2><p className="mt-2 mb-0 text-lg text-muted">Perbandingan cepat dari seluruh permainan peserta.</p><div className="mt-5 grid gap-4 md:grid-cols-3">{participant.data.modeSummaries.map((summary) => <ModeSummaryCard key={summary.mode} summary={summary} />)}</div></section>

            {participant.data.aggregateSummary && participantId && <section aria-labelledby="aggregate-summary-title" className="mt-10"><h2 className="m-0 text-3xl font-black" id="aggregate-summary-title">Ringkasan keseluruhan</h2><AggregateSummaryTabs participantId={participantId} summary={participant.data.aggregateSummary} /></section>}

            <section aria-labelledby="statistics-title" className="mt-10"><h2 className="m-0 text-3xl font-black" id="statistics-title">Statistik perkembangan</h2><p className="mt-2 mb-0 text-lg text-muted">Visual ringkas dari permainan yang sudah tersimpan.</p><div className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_0.8fr]"><article className="rounded-md border-2 border-divider bg-white p-5 sm:p-6"><div><p className="m-0 text-sm font-black tracking-[0.08em] text-muted uppercase">Perkembangan keseluruhan</p><h3 className="mt-2 mb-0 text-2xl font-black">Tren skor per mode</h3><p className="mt-2 mb-0 text-sm font-bold text-muted">Pilih mode untuk melihat tren skor permainan secara terpisah.</p></div><div className="mt-5">{history.isPending ? <div className="h-64 animate-pulse rounded-sm bg-divider/40" /> : <ScoreTrendChart history={history.data?.items ?? []} />}</div></article><article className="rounded-md border-2 border-divider bg-white p-5 sm:p-6"><p className="m-0 text-sm font-black tracking-[0.08em] text-muted uppercase">Komposisi</p><h3 className="mt-2 mb-0 text-2xl font-black">Permainan per mode</h3><div className="mt-6"><SessionDistribution summaries={participant.data.modeSummaries} /></div></article></div><div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="landing-eyebrow">Analisis per permainan</p><h3 className="m-0 text-3xl font-black">Detail statistik overall</h3><p className="mt-2 mb-0 text-lg text-muted">Pilih mode untuk melihat metrik keseluruhan secara mendalam.</p></div><div aria-label="Pilih statistik mode" className="flex max-w-full gap-2 overflow-x-auto pb-1" role="tablist">{GAME_MODES.map((game) => <button aria-selected={overallMode === game.mode} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-0 px-4 text-sm font-black transition ${overallMode === game.mode ? 'text-white shadow-[0_3px_0_rgba(23,23,17,0.18)]' : 'bg-canvas hover:bg-divider'}`} key={game.mode} onClick={() => setOverallMode(game.mode)} role="tab" style={overallMode === game.mode ? { backgroundColor: game.color } : undefined} type="button"><img alt="" aria-hidden className="size-5" src={game.emoji} />{game.title}</button>)}</div></div><article className="mt-5 rounded-lg border-2 border-divider bg-white p-5 sm:p-7"><div className="mb-7 flex items-center gap-3">{(() => { const game = GAME_MODES.find((item) => item.mode === overallMode)!; return <><span className="grid size-12 place-items-center rounded-full" style={{ backgroundColor: game.softColor }}><img alt="" aria-hidden className="size-7" src={game.emoji} /></span><div><p className="m-0 text-sm font-black tracking-[0.08em] text-muted uppercase">Overall permainan</p><h3 className="mt-1 mb-0 text-2xl font-black">{game.title}</h3></div></>; })()}</div><OverallModePanel summary={participant.data.modeSummaries.find((summary) => summary.mode === overallMode)} /></article></section>

            <section aria-labelledby="recent-history-title" className="mt-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="m-0 text-3xl font-black" id="recent-history-title">Permainan terbaru</h2><p className="mt-2 mb-0 text-lg text-muted">Buka satu permainan untuk melihat detail hasilnya.</p></div>{participantId && <Link className="font-black underline decoration-2 underline-offset-4" to={ROUTES.participantHistory(participantId)}>Lihat semua history</Link>}</div>{history.isPending ? <div aria-label="Memuat permainan terbaru" className="mt-5 grid gap-3" role="status">{Array.from({ length: 3 }, (_, index) => <div className="h-20 animate-pulse rounded-md border-2 border-divider bg-divider/30" key={index} />)}</div> : history.data?.items.length ? <div className="mt-5 grid gap-3">{history.data.items.slice(0, 3).map((item) => { const mode = GAME_MODES.find((entry) => entry.mode === item.mode); return <Link className="flex flex-wrap items-center justify-between gap-4 rounded-md border-2 border-divider bg-white p-4 text-ink no-underline transition hover:border-ink" key={item.sessionId} to={ROUTES.session(item.sessionId)}><span className="flex items-center gap-3">{mode && <img alt="" aria-hidden className="size-9" src={mode.emoji} />}<span><strong className="block text-lg">{mode?.title ?? item.mode}</strong><span className="mt-1 block text-sm font-bold text-muted">{item.completedAt ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(item.completedAt)) : 'Permainan belum selesai'}</span></span></span><strong>{item.score === null ? '—' : `${item.score} poin`}</strong></Link>; })}</div> : <div className="mt-8 grid min-h-28 place-items-center text-center text-muted" role="status"><div><Clock3 aria-hidden className="mx-auto size-9" /><p className="mt-3 mb-0 font-bold">Belum ada permainan tersimpan.</p></div></div>}</section>
          </>
        )}
      </main>
      {editOpen && (
        <div aria-labelledby="edit-participant-title" aria-modal="true" className="fixed inset-0 z-[90] grid place-items-center bg-ink/65 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditOpen(false); }} role="dialog">
          <form className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 text-ink shadow-[0_8px_0_rgba(23,23,17,0.28)] sm:p-8" noValidate onSubmit={saveParticipant}>
            <div><h2 className="m-0 text-2xl font-black" id="edit-participant-title">Edit peserta</h2><p className="mt-1 mb-0 text-muted">Perbarui identitas dasar peserta.</p></div>
            <div className="mt-7 grid gap-5"><Field autoFocus error={editError} label="Nama peserta" maxLength={100} name="participantDisplayName" onChange={(event) => { setName(event.target.value); setEditError(''); }} required value={name} /><DatePicker label="Tanggal lahir" max={new Date().toISOString().slice(0, 10)} name="participantDateOfBirth" onChange={setDateOfBirth} value={dateOfBirth} /><fieldset className="m-0 border-0 p-0"><legend className="mb-2 font-black">Gender</legend><div className="grid grid-cols-2 gap-3"><label className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-sm border-2 font-black transition ${gender === 'MALE' ? 'border-[#3b628b] bg-[#3b628b] text-white' : 'border-divider hover:border-[#3b628b]'}`}><input checked={gender === 'MALE'} className="sr-only" name="participantGender" onChange={() => setGender('MALE')} type="radio" /><Mars aria-hidden className="size-5" />Laki-laki</label><label className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-sm border-2 font-black transition ${gender === 'FEMALE' ? 'border-[#d94f91] bg-[#d94f91] text-white' : 'border-divider hover:border-[#d94f91]'}`}><input checked={gender === 'FEMALE'} className="sr-only" name="participantGender" onChange={() => setGender('FEMALE')} type="radio" /><Venus aria-hidden className="size-5" />Perempuan</label></div></fieldset></div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2"><Button disabled={updateParticipant.isPending} onClick={() => setEditOpen(false)} variant="secondary">Batal</Button><Button disabled={updateParticipant.isPending} type="submit">{updateParticipant.isPending ? 'Menyimpan…' : 'Simpan'}</Button></div>
          </form>
        </div>
      )}
      {avatarOpen && (
        <div aria-labelledby="participant-avatar-title" aria-modal="true" className="fixed inset-0 z-[90] grid place-items-center bg-ink/65 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setAvatarOpen(false); }} role="dialog">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 text-ink shadow-[0_8px_0_rgba(23,23,17,0.28)] sm:p-8">
            <div className="flex items-center gap-4"><span className="grid size-14 place-items-center rounded-full bg-brand-soft"><Camera aria-hidden className="size-7" /></span><div><h2 className="m-0 text-2xl font-black" id="participant-avatar-title">Foto peserta</h2><p className="mt-1 mb-0 text-muted">Pilih tindakan untuk foto profil.</p></div></div>
            {editError && <p className="mt-5 mb-0 font-bold text-danger" role="alert">{editError}</p>}
            <div className="mt-7 grid gap-3"><Button className="w-full" onClick={() => { setAvatarOpen(false); imageRef.current?.click(); }}><Camera aria-hidden className="size-5" />Pilih foto baru</Button>{image && <Button className="w-full" disabled={updateParticipant.isPending} onClick={async () => { setEditError(''); try { await updateParticipant.mutateAsync({ image: null }); setImage(null); setAvatarOpen(false); } catch (error) { setEditError(messageOf(error)); } }} variant="danger"><ImageOff aria-hidden className="size-5" />{updateParticipant.isPending ? 'Menghapus…' : 'Hapus foto'}</Button>}<Button className="w-full" onClick={() => setAvatarOpen(false)} variant="quiet">Batal</Button></div>
          </div>
        </div>
      )}
      {cropFile && <AvatarCropDialog file={cropFile} onCancel={() => setCropFile(null)} onComplete={async (nextImage) => { setCropFile(null); setEditError(''); try { await updateParticipant.mutateAsync({ image: nextImage }); setImage(nextImage); } catch (error) { setEditError(messageOf(error)); } }} />}
    </div>
  );
}

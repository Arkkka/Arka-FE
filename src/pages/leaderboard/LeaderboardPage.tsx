import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardProgressDto } from '@/schemas/index.ts';
import { heartHandsEmoji } from '@/assets/index.ts';
import { AccountHeader, Field, Pagination } from '@/components/index.ts';
import { GAME_MODES } from '@/constants/game-modes.ts';
import { ROUTES } from '@/constants/routes.ts';
import { useAccountPage } from '@/hooks/auth';
import { useDashboardProgressQuery } from '@/hooks/dashboard';

const PAGE_SIZE = 10;
type ParticipantProgress = DashboardProgressDto['participants'][number];

function progressLabel(status: ParticipantProgress['progress']['status']) {
  if (status === 'IMPROVED') return 'Skor meningkat';
  if (status === 'LOWER') return 'Perlu ditinjau';
  if (status === 'MAINTAINED') return 'Performa stabil';
  return 'Mulai berkembang';
}

function achievementLabel(status: ParticipantProgress['achievementStatus']) {
  if (status === 'IMPROVED') return 'Pencapaian terbaru';
  if (status === 'CONSISTENT') return 'Konsisten berlatih';
  if (status === 'FIRST_SESSION') return 'Langkah pertama';
  if (status === 'CONTINUING') return 'Terus berkembang';
  return 'Siap memulai';
}

function ProgressCardSkeleton() {
  return (
    <article aria-hidden className="grid animate-pulse overflow-hidden rounded-md border-2 border-divider bg-white sm:grid-cols-[1fr_16rem]">
      <div className="p-5 sm:p-6"><div className="flex items-center gap-4"><span className="size-13 rounded-full bg-brand-soft" /><div className="flex-1"><span className="block h-7 w-44 max-w-full rounded-sm bg-divider" /><span className="mt-2 block h-5 w-32 rounded-sm bg-divider/70" /></div></div><span className="mt-6 block h-3 max-w-md rounded-full bg-divider" /></div>
      <div className="grid gap-3 border-t-2 border-divider bg-canvas/60 p-5 sm:border-t-0 sm:border-l-2 sm:p-6"><span className="h-5 w-32 rounded-sm bg-divider" /><span className="h-6 w-36 rounded-sm bg-divider" /><span className="h-5 w-24 rounded-sm bg-divider" /></div>
    </article>
  );
}

function ProgressCard({ participant }: { participant: ParticipantProgress }) {
  const lastMode = participant.lastSession ? GAME_MODES.find((mode) => mode.mode === participant.lastSession?.mode) : null;
  return (
    <Link className="group grid overflow-hidden rounded-md border-2 border-divider bg-white text-ink no-underline transition hover:-translate-y-0.5 hover:border-ink hover:shadow-[0_5px_0_#b7c8d8] sm:grid-cols-[1fr_auto]" to={ROUTES.participant(participant.participantId)}>
      <div className="p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-13 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-soft">{participant.image ? <img alt={`Foto ${participant.displayName}`} className="size-full object-cover" src={participant.image} /> : <span aria-hidden className="text-base font-black">{participant.displayName.trim().split(/\s+/u).map((part) => part[0]).slice(0, 2).join('').toLocaleUpperCase('id-ID')}</span>}</span>
          <div className="min-w-0"><h2 className="m-0 truncate text-2xl font-black">{participant.displayName}</h2><p className="mt-1 mb-0 font-black text-accent">{achievementLabel(participant.achievementStatus)}</p><p className="mt-1 mb-0 text-sm font-bold text-muted">{participant.gender ? (participant.gender === 'MALE' ? 'Laki-laki' : 'Perempuan') : 'Gender belum diisi'}{participant.dateOfBirth ? ` · ${new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${participant.dateOfBirth}T00:00:00.000Z`))}` : ''}</p></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-divider/60 px-3 py-2 text-sm font-black">{progressLabel(participant.progress.status)}</span>
        </div>
        <div className="mt-5 max-w-md">
          <div className="flex items-center justify-between gap-4 text-sm font-black"><span className="inline-flex items-center gap-2"><img alt="" aria-hidden className="size-5" src={heartHandsEmoji} />Aktivitas 4 pekan</span><span>{participant.activeWeeksLast4}/4 aktif</span></div>
          <div aria-label={`${participant.activeWeeksLast4} dari 4 pekan aktif`} className="mt-3 grid grid-cols-4 gap-2" role="img">{Array.from({ length: 4 }, (_, index) => <span className={`h-3 rounded-full ${index < participant.activeWeeksLast4 ? 'bg-brand shadow-[0_2px_0_#203b61]' : 'bg-divider'}`} key={index} />)}</div>
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-[1fr_auto] items-center gap-4 border-t-2 border-divider bg-canvas/60 p-5 sm:w-64 sm:grid-cols-1 sm:grid-rows-[1.5rem_2rem_1.5rem] sm:items-start sm:border-t-0 sm:border-l-2 sm:p-6">
        <span className="flex h-6 items-center gap-2 text-sm font-black text-muted">{lastMode && <img alt="" aria-hidden className="size-6" src={lastMode.emoji} />}{lastMode ? 'Aktivitas terakhir' : 'Belum mulai latihan'}</span>
        <strong className="block self-center">{participant.lastSession ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(participant.lastSession.completedAt)) : 'Siap untuk sesi pertama'}</strong>
        <span className="font-black text-accent sm:self-end">Buka detail <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">→</span></span>
      </div>
    </Link>
  );
}

export function ProgressBoardPage() {
  const { session, signOut } = useAccountPage();
  const progress = useDashboardProgressQuery(Boolean(session.data));
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase('id-ID'));
  const filtered = useMemo(
    () => (progress.data?.participants ?? []).filter((participant) => participant.displayName.toLocaleLowerCase('id-ID').includes(deferredQuery)),
    [deferredQuery, progress.data?.participants],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const participants = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstResult = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastResult = Math.min(page * PAGE_SIZE, filtered.length);

  useEffect(() => setPage(1), [deferredQuery]);
  useEffect(() => setPage((current) => Math.min(current, pageCount)), [pageCount]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-white text-ink">
      <div aria-hidden className="landing-glow landing-glow-soft -top-40 -left-44 size-[34rem]" />
      <AccountHeader isSigningOut={signOut.isPending} onSignOut={() => session.data && signOut.mutate(session.data)} user={session.data} />
      <main className="relative mx-auto w-full max-w-[70rem] px-4 py-8 outline-none sm:px-6 lg:px-8 lg:py-12" id="progress-main" tabIndex={-1}>
        <Link className="group inline-flex min-h-11 items-center gap-2 font-black no-underline" to={ROUTES.dashboard}><ArrowLeft aria-hidden className="size-5" /><span className="relative after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:bg-ink after:transition-transform group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100">Kembali ke dashboard</span></Link>
        <section className="mt-8">
          <p className="landing-eyebrow">Pemantauan rehabilitasi</p>
          <h1 className="m-0 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Progress Board</h1>
          <p className="mt-4 mb-0 max-w-3xl text-lg leading-8 text-muted">Cari peserta dan buka ringkasan perkembangan pribadinya.</p>
          <div className="mt-7 max-w-xl"><Field label="Cari peserta" name="progressSearch" onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama peserta" trailing={<Search aria-hidden className="mr-3 size-5 text-muted" />} type="search" value={query} /></div>

          {progress.isPending && !progress.data ? (
            <div aria-label="Memuat perkembangan peserta" className="mt-8 grid gap-4" role="status">{Array.from({ length: 5 }, (_, index) => <ProgressCardSkeleton key={index} />)}</div>
          ) : progress.isError ? (
            <div className="mt-8 grid min-h-44 place-items-center text-muted" role="status">Data perkembangan belum tersedia.</div>
          ) : participants.length > 0 ? (
            <div className="mt-8 grid gap-4">{participants.map((participant) => <ProgressCard key={participant.participantId} participant={participant} />)}</div>
          ) : (
            <div className="mt-8 grid min-h-44 place-items-center text-center text-muted" role="status">Peserta tidak ditemukan.</div>
          )}

          {!progress.isPending && !progress.isError && filtered.length > 0 && <Pagination itemLabel={`peserta · ${firstResult}–${lastResult} tampil`} onPageChange={setPage} page={page} totalItems={filtered.length} totalPages={pageCount} />}
        </section>
      </main>
    </div>
  );
}

export { ProgressBoardPage as LeaderboardPage };

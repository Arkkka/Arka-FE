import { useId, useState } from 'react';
import { ArrowLeft, Crown, Medal } from 'lucide-react';
import { m, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { DashboardLeaderboardDto, GameMode } from '@/schemas/index.ts';
import { AccountHeader } from '@/components/index.ts';
import { GAME_MODES } from '@/constants/game-modes.ts';
import { ROUTES } from '@/constants/routes.ts';
import { useAccountPage } from '@/hooks/auth';
import { useDashboardLeaderboardQuery } from '@/hooks/dashboard';

type LeaderboardEntry = DashboardLeaderboardDto['entries'][number];

const PLACEMENT = {
  1: { height: 'h-36 sm:h-44', color: 'from-[#f4d35e] to-[#d9a900]', order: 'order-2', label: 'Juara 1' },
  2: { height: 'h-28 sm:h-34', color: 'from-[#f3f3f1] to-[#c9c8c2]', order: 'order-1', label: 'Juara 2' },
  3: { height: 'h-24 sm:h-28', color: 'from-[#e2b184] to-[#b9753c]', order: 'order-3', label: 'Juara 3' },
} as const;

function BackToDashboard() {
  return (
    <Link className="group inline-flex min-h-11 items-center gap-2 font-black no-underline" to={ROUTES.dashboard}>
      <ArrowLeft aria-hidden className="size-5" />
      <span className="relative after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:bg-ink after:transition-transform group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100">Kembali ke dashboard</span>
    </Link>
  );
}

function PodiumPlace({ entry, rank }: { entry: LeaderboardEntry | undefined; rank: 1 | 2 | 3 }) {
  const reduceMotion = useReducedMotion();
  const placement = PLACEMENT[rank];
  const content = (
    <>
      {rank === 1 && <m.span animate={reduceMotion ? { opacity: 1, scale: 1, y: 0, rotate: 0 } : { opacity: 1, scale: 1, y: [0, -5, 0], rotate: [-5, 5, -5] }} aria-hidden className="mb-2 text-[#d9a900]" initial={reduceMotion ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.5, y: 14 }} transition={reduceMotion ? { duration: 0 } : { opacity: { duration: 0.3, delay: 0.75 }, scale: { duration: 0.45, delay: 0.75, type: 'spring' }, y: { duration: 2.2, delay: 1.25, repeat: Infinity, ease: 'easeInOut' }, rotate: { duration: 2.2, delay: 1.25, repeat: Infinity, ease: 'easeInOut' } }}><Crown className="size-9 fill-[#f4d35e]" strokeWidth={2.5} /></m.span>}
      <span className={`mb-3 grid size-12 place-items-center rounded-full text-xl font-black transition ${entry ? 'bg-brand-soft group-hover:-translate-y-1' : 'bg-canvas text-muted'}`}>{entry ? entry.displayName.slice(0, 1).toLocaleUpperCase('id-ID') : '—'}</span>
      <strong className="mb-1 min-h-6 max-w-full truncate px-2 text-center text-sm sm:text-base">{entry?.displayName ?? ''}</strong>
      <span className="mb-3 min-h-4 text-xs font-bold text-muted">{entry ? `${entry.score} poin` : ''}</span>
      <span className={`relative flex w-full flex-col items-center justify-start rounded-t-md bg-gradient-to-b pt-4 text-ink shadow-[inset_0_2px_0_rgba(255,255,255,0.35)] ${placement.height} ${placement.color}`}>
        <strong className="text-4xl leading-none">{rank}</strong>
        <span className="mt-2 text-xs font-black tracking-[0.08em] uppercase">{placement.label}</span>
      </span>
    </>
  );
  return (
    <m.div animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex min-w-0 flex-1 ${placement.order}`} initial={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 90, scale: rank === 1 ? 0.88 : 0.94 }} transition={{ delay: reduceMotion ? 0 : rank === 1 ? 0.28 : rank === 2 ? 0.08 : 0.16, duration: rank === 1 ? 0.72 : 0.58, ease: [0.16, 1, 0.3, 1] }}>
      {entry ? <Link aria-label={`${placement.label}, ${entry.displayName}, rata-rata ${entry.score} poin`} className="group flex min-w-0 flex-1 flex-col items-center justify-end text-ink no-underline" to={ROUTES.participant(entry.participantId)}>{content}</Link> : <div aria-label={`${placement.label} belum terisi`} className="flex min-w-0 flex-1 flex-col items-center justify-end">{content}</div>}
    </m.div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div aria-label="Memuat leaderboard" className="animate-pulse" role="status">
      <div className="grid gap-3 md:hidden">{Array.from({ length: 3 }, (_, index) => <div className="grid h-16 grid-cols-[2.75rem_1fr_3rem] items-center gap-3 rounded-md bg-canvas p-3" key={index}><span className="size-11 rounded-full bg-divider" /><span className="h-5 rounded-sm bg-divider" /><span className="h-5 rounded-sm bg-divider" /></div>)}</div>
      <div className="mx-auto hidden h-80 max-w-2xl items-end gap-4 md:flex"><div className="flex flex-1 flex-col items-center"><span className="mb-3 size-12 rounded-full bg-divider" /><span className="mb-3 h-5 w-24 rounded-sm bg-divider" /><span className="h-34 w-full rounded-t-md bg-divider/70" /></div><div className="flex flex-1 flex-col items-center"><span className="mb-3 size-12 rounded-full bg-[#f9e8a3]" /><span className="mb-3 h-5 w-24 rounded-sm bg-divider" /><span className="h-44 w-full rounded-t-md bg-[#f9e8a3]" /></div><div className="flex flex-1 flex-col items-center"><span className="mb-3 size-12 rounded-full bg-divider" /><span className="mb-3 h-5 w-24 rounded-sm bg-divider" /><span className="h-28 w-full rounded-t-md bg-divider/70" /></div></div>
      <div className="mx-auto mt-10 grid max-w-3xl gap-2">{Array.from({ length: 4 }, (_, index) => <div className="h-16 rounded-md bg-canvas" key={index} />)}</div>
    </div>
  );
}

export function RankingsPage() {
  const { session, signOut } = useAccountPage();
  const [mode, setMode] = useState<GameMode>('SEQUENCE_MEMORY');
  const panelId = useId();
  const leaderboard = useDashboardLeaderboardQuery(mode, Boolean(session.data));
  const entries = leaderboard.data?.entries ?? [];
  const podium = entries.filter((entry) => entry.rank <= 3);
  const remaining = entries.filter((entry) => entry.rank > 3);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-white text-ink">
      <div aria-hidden className="landing-glow landing-glow-soft -top-36 -right-40 size-[34rem]" />
      <AccountHeader isSigningOut={signOut.isPending} onSignOut={() => session.data && signOut.mutate(session.data)} user={session.data} />
      <main className="relative mx-auto w-full max-w-[76rem] px-4 py-8 outline-none sm:px-6 lg:px-8 lg:py-12" tabIndex={-1}>
        <BackToDashboard />
        <section className="mt-8">
          <p className="landing-eyebrow">Pencapaian peserta</p>
          <h1 className="m-0 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Leaderboard</h1>
          <p className="mt-4 mb-0 max-w-3xl text-lg leading-8 text-muted">Peringkat berdasarkan rata-rata skor keseluruhan setiap peserta pada mode yang dipilih.</p>

          <div className="mt-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="m-0 text-xs font-black tracking-[0.1em] text-accent uppercase">Top 10 keseluruhan</p><h2 className="mt-1 mb-0 text-2xl font-black">Pilih mode permainan</h2></div>
              <div aria-label="Pilih mode leaderboard" className="flex max-w-full gap-2 overflow-x-auto pb-1" role="tablist">
                {GAME_MODES.map((item) => <button aria-controls={panelId} aria-selected={mode === item.mode} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-0 px-4 text-sm font-black transition ${mode === item.mode ? 'text-white shadow-[0_3px_0_rgba(23,23,17,0.18)]' : 'bg-canvas text-ink hover:bg-divider'}`} id={`${panelId}-${item.mode}`} key={item.mode} onClick={() => setMode(item.mode)} role="tab" style={mode === item.mode ? { backgroundColor: item.color } : undefined} type="button"><img alt="" aria-hidden className="size-5" src={item.emoji} />{item.title}</button>)}
              </div>
            </div>

            <div aria-labelledby={`${panelId}-${mode}`} className="pt-8" id={panelId} role="tabpanel">
              {leaderboard.isPending ? (
                <LeaderboardSkeleton />
              ) : leaderboard.isError ? (
                <div className="grid min-h-64 place-items-center text-muted" role="status">Leaderboard belum tersedia.</div>
              ) : (
                <div>
                  <div className="grid gap-3 md:hidden">{([1, 2, 3] as const).map((rank) => { const entry = podium.find((item) => item.rank === rank); return <m.div animate={{ opacity: 1, x: 0 }} className="grid min-h-16 grid-cols-[2.75rem_1fr_auto] items-center gap-3 rounded-md bg-canvas p-3" initial={{ opacity: 0, x: -24 }} key={`${mode}-mobile-${rank}`} transition={{ delay: rank * 0.1 }}><span className="relative"><span className={`grid size-11 place-items-center rounded-full font-black ${rank === 1 ? 'bg-[#f4d35e] text-ink' : 'bg-divider'}`}>{rank}</span>{rank === 1 && <m.span animate={{ y: [0, -3, 0], rotate: [-5, 5, -5] }} aria-hidden className="absolute -top-5 left-1/2 -translate-x-1/2 text-[#d9a900]" transition={{ delay: 0.5, duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}><Crown className="size-6 fill-[#f4d35e]" /></m.span>}</span><span className="min-w-0"><strong className="block truncate">{entry?.displayName ?? ''}</strong><span className="mt-1 block text-xs font-bold text-muted">{PLACEMENT[rank].label}</span></span><strong>{entry ? entry.score : '—'}</strong></m.div>; })}</div><div className="mx-auto hidden min-h-80 max-w-2xl items-end gap-4 md:flex">{([1, 2, 3] as const).map((rank) => <PodiumPlace entry={podium.find((entry) => entry.rank === rank)} key={`${mode}-${rank}`} rank={rank} />)}</div>
                  <div className="mx-auto mt-10 max-w-3xl">
                    <div className="mb-3 flex items-center justify-between px-3 text-xs font-black tracking-[0.08em] text-muted uppercase"><span>Peringkat 4–10</span><span>Rata-rata</span></div>
                    {remaining.length > 0 ? (
                      <ol className="m-0 grid list-none gap-2 p-0">
                        {remaining.map((entry) => (
                          <li key={entry.participantId}>
                            <Link className="group grid min-h-16 grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-md bg-canvas px-3 text-ink no-underline transition hover:bg-divider" to={ROUTES.participant(entry.participantId)}>
                              <span className="grid size-9 place-items-center rounded-full bg-divider font-black text-muted">{entry.rank}</span>
                              <span className="min-w-0"><strong className="block truncate">{entry.displayName}</strong><span className="mt-1 block text-xs font-bold text-muted">{entry.sessionsTotal} permainan tersimpan</span></span>
                              <strong className="text-xl text-brand">{entry.score}</strong>
                            </Link>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <div className="grid min-h-40 place-items-center text-center text-muted" role="status"><div><Medal aria-hidden className="mx-auto size-10" /><p className="mt-3 mb-0 font-bold">Belum ada peringkat lainnya.</p></div></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

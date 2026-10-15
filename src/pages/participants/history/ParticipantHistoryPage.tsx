import { useState } from 'react';
import { ArrowLeft, Clock3 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import type { GameMode } from '@/schemas/index.ts';
import { AccountHeader, Pagination } from '@/components/index.ts';
import { GAME_MODES } from '@/constants/game-modes.ts';
import { ROUTES } from '@/constants/routes.ts';
import { useAccountPage } from '@/hooks/auth';
import { useParticipantHistoryQuery, useParticipantQuery } from '@/hooks/participants';

export function ParticipantHistoryPage() {
  const { participantId } = useParams();
  const { session, signOut } = useAccountPage();
  const [mode, setMode] = useState<GameMode | ''>('');
  const [page, setPage] = useState(0);
  const participant = useParticipantQuery(participantId);
  const history = useParticipantHistoryQuery(participantId, mode);
  const current = history.data?.pages[page];
  const totalPages = current?.totalPages ?? history.data?.pages[0]?.totalPages ?? 0;
  const totalItems = current?.totalItems ?? history.data?.pages[0]?.totalItems ?? 0;

  function selectMode(next: GameMode | '') {
    setMode(next);
    setPage(0);
  }

  async function goToPage(nextPage: number) {
    const targetIndex = nextPage - 1;
    if (targetIndex < 0 || targetIndex >= Math.max(totalPages, 1)) return;
    if (history.data?.pages[targetIndex]) {
      setPage(targetIndex);
      return;
    }
    let loadedPages = history.data?.pages.length ?? 0;
    while (loadedPages <= targetIndex && history.hasNextPage) {
      const result = await history.fetchNextPage();
      loadedPages = result.data?.pages.length ?? loadedPages;
    }
    if (loadedPages > targetIndex) setPage(targetIndex);
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-white text-ink">
      <div aria-hidden className="landing-glow landing-glow-soft -top-40 -left-44 size-[34rem]" />
      <AccountHeader isSigningOut={signOut.isPending} onSignOut={() => session.data && signOut.mutate(session.data)} user={session.data} />
      <main className="relative mx-auto w-full max-w-[70rem] px-4 py-8 outline-none sm:px-6 lg:px-8 lg:py-12" tabIndex={-1}>
        <Link className="group inline-flex min-h-11 items-center gap-2 font-black no-underline" to={participantId ? ROUTES.participant(participantId) : ROUTES.progressBoard}><ArrowLeft aria-hidden className="size-5" /><span className="relative after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:bg-ink after:transition-transform group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100">Kembali ke profil</span></Link>
        <section className="mt-8">
          <p className="landing-eyebrow">History peserta</p>
          <h1 className="m-0 text-4xl font-black tracking-[-0.05em] sm:text-5xl">{participant.data?.displayName ?? 'Riwayat permainan'}</h1>
          <div aria-label="Filter mode" className="mt-6 flex max-w-full gap-2 overflow-x-auto pb-2" role="group">
            <button className={`min-h-11 shrink-0 rounded-full border-2 px-4 font-black transition ${mode === '' ? 'border-ink bg-ink text-white' : 'border-divider bg-white hover:border-ink'}`} onClick={() => selectMode('')} type="button">Semua</button>
            {GAME_MODES.map((item) => <button className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 font-black transition ${mode === item.mode ? 'border-ink bg-ink text-white' : 'border-divider bg-white hover:border-ink'}`} key={item.mode} onClick={() => selectMode(item.mode)} type="button"><img alt="" aria-hidden className="size-5" src={item.emoji} />{item.title}</button>)}
          </div>

          {history.isPending && !current ? (
            <div aria-label="Memuat history" className="mt-8 grid gap-3" role="status">{Array.from({ length: 6 }, (_, index) => <div className="h-20 animate-pulse rounded-md border-2 border-divider bg-divider/30" key={index} />)}</div>
          ) : current?.items.length ? (
            <div className="mt-8 grid gap-3">
              {current.items.map((item) => {
                const game = GAME_MODES.find((entry) => entry.mode === item.mode);
                return (
                  <Link className="group flex min-h-20 flex-wrap items-center justify-between gap-4 rounded-md border-2 border-divider bg-white p-4 text-ink no-underline transition hover:border-ink hover:shadow-[0_4px_0_#b7c8d8]" key={item.sessionId} to={ROUTES.session(item.sessionId)}>
                    <span className="flex min-w-0 items-center gap-3">{game && <img alt="" aria-hidden className="size-10 shrink-0" src={game.emoji} />}<span className="min-w-0"><strong className="block truncate text-lg">{game?.title ?? item.mode}</strong><span className="mt-1 block text-sm font-bold text-muted">{item.completedAt ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.completedAt)) : 'Permainan belum selesai'}</span></span></span>
                    <span className="flex shrink-0 items-center gap-5"><span className="text-right"><strong className="block text-xl">{item.score === null ? '—' : item.score}</strong><span className="text-xs font-bold text-muted">poin</span></span><span aria-hidden className="transition-transform group-hover:translate-x-1">→</span></span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-14 grid min-h-40 place-items-center text-center text-muted" role="status"><div><Clock3 aria-hidden className="mx-auto size-10" /><p className="mt-4 mb-0 text-lg font-black">Belum ada history permainan.</p><p className="mt-2 mb-0">Hasil yang tersimpan akan muncul di sini.</p></div></div>
          )}

          {current?.items.length ? <Pagination itemLabel="permainan" loading={history.isFetchingNextPage} onPageChange={goToPage} page={page + 1} totalItems={totalItems} totalPages={totalPages} /> : null}
        </section>
      </main>
    </div>
  );
}

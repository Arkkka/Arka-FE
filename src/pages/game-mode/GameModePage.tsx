import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AccountHeader } from '@/components/index.ts';
import { gameModeFromSlug, ROUTES } from '@/constants/routes.ts';
import { useAccountPage } from '@/hooks/auth';
import { GameFlow, type GameFlowStage } from './GameFlow.tsx';

export function GameModePage() {
  const { mode: modeSlug } = useParams();
  const mode = gameModeFromSlug(modeSlug);
  const { session, signOut } = useAccountPage();
  const [stage, setStage] = useState<GameFlowStage>('participant');

  if (!mode) return <Navigate replace to={ROUTES.dashboard} />;
  const immersive = stage === 'tutorial' || stage === 'setup' || stage === 'session' || stage === 'result';
  const viewportStage = stage === 'tutorial' || stage === 'session';

  return (
    <div className={`relative min-h-dvh bg-white text-ink ${stage === 'result' ? 'overflow-x-hidden' : 'overflow-hidden'}`}>
      {(stage === 'participant' || stage === 'setup') && <div aria-hidden className="landing-glow landing-glow-soft -top-36 -right-40 size-[34rem]" />}
      {stage === 'setup' && <div aria-hidden className="landing-glow landing-glow-brand -bottom-48 -left-52 size-[36rem] opacity-45" />}
      {!immersive && <a className="skip-link" href="#game-mode-main">Lewati ke konten utama</a>}
      {!immersive && <AccountHeader isSigningOut={signOut.isPending} onSignOut={() => session.data && signOut.mutate(session.data)} user={session.data} />}
      <main className={viewportStage ? 'relative h-dvh w-full overflow-hidden px-4 py-3 outline-none sm:px-8 lg:px-12' : immersive ? 'relative min-h-dvh w-full px-4 py-5 outline-none sm:px-8 lg:px-12' : 'relative mx-auto w-full max-w-[78rem] px-4 py-8 outline-none sm:px-6 lg:px-8 lg:py-12'} id="game-mode-main" tabIndex={-1}>
        {!immersive && <Link className="group inline-flex min-h-11 items-center gap-2 font-black no-underline" to={ROUTES.dashboard}><ArrowLeft aria-hidden className="size-5" /><span className="relative after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:bg-ink after:transition-transform group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100">Kembali ke dashboard</span></Link>}
        <div className={viewportStage ? 'h-full min-h-0' : immersive ? '' : 'mt-8'}><GameFlow csrfToken={session.data?.csrfToken ?? ''} mode={mode} onStageChange={setStage} /></div>
      </main>
    </div>
  );
}

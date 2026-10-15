import { useEffect } from 'react';
import { ArrowRight, BarChart3, CalendarDays, UsersRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { m, useReducedMotion } from 'framer-motion';
import type { DashboardActivityDto } from '@/schemas/index.ts';
import { arkoKoala, hiKoala, papanReference } from '@/assets/index.ts';
import { AccountHeader, Button } from '@/components/index.ts';
import { messageOf } from '@/config';
import { GAME_MODES } from '@/constants/game-modes.ts';
import { ROUTES } from '@/constants/routes.ts';
import { useDashboardActivityQuery } from '@/hooks/dashboard';
import { useSessionQuery, useSignOutMutation } from '@/hooks/auth';

const EMPTY_MODES: DashboardActivityDto['modes'] = GAME_MODES.map((mode) => ({
  mode: mode.mode,
  savedSessions: 0,
  sessionsLast7Days: 0,
  latestSavedAt: null,
  latestRuleVersion: null,
}));

function emptyDailySeries(): DashboardActivityDto['dailySavedSessions'] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => ({
    date: new Date(today.getTime() - (6 - index) * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    savedSessions: 0,
  }));
}

function dayLabel(date: string): string {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00.000Z`),
  );
}

function ActivityLineChart({ series }: { series: DashboardActivityDto['dailySavedSessions'] }) {
  const width = 720;
  const height = 260;
  const left = 34;
  const right = 34;
  const top = 40;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(...series.map((day) => day.savedSessions), 1);
  const points = series.map((day, index) => ({
    ...day,
    x: left + (index / Math.max(series.length - 1, 1)) * plotWidth,
    y: top + plotHeight - (day.savedSessions / maxValue) * plotHeight,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${left},${top + plotHeight} ${line} ${left + plotWidth},${top + plotHeight}`;
  const total = series.reduce((sum, day) => sum + day.savedSessions, 0);

  return (
    <div className="overflow-hidden rounded-md border-2 border-divider bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-sm font-black tracking-[0.08em] text-muted uppercase">7 hari terakhir</p>
          <h3 className="mt-2 mb-0 text-2xl font-black">Aktivitas sesi harian</h3>
        </div>
        <p className="m-0 text-right"><strong className="block text-3xl font-black">{total}</strong><span className="text-sm font-bold text-muted">sesi selesai</span></p>
      </div>
      <div className="mt-5 overflow-x-auto">
        <svg
          aria-label={`Grafik garis sesi harian tujuh hari terakhir. Total ${total} sesi.`}
          className="h-auto min-w-[34rem] w-full"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, 0.5, 1].map((ratio) => {
            const y = top + plotHeight * ratio;
            return <line key={ratio} stroke="#dbe8f2" strokeWidth="2" x1={left} x2={left + plotWidth} y1={y} y2={y} />;
          })}
          <defs>
            <linearGradient id="activity-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2c5282" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#2c5282" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon fill="url(#activity-area)" points={area} />
          <polyline fill="none" points={line} stroke="#2c5282" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
          {points.map((point) => (
            <g key={point.date}>
              <circle cx={point.x} cy={point.y} fill="#2c5282" r="7" stroke="#2c5282" strokeWidth="3" />
              <text fill="#171711" fontSize="14" fontWeight="800" textAnchor="middle" x={point.x} y={point.y - 15}>{point.savedSessions}</text>
              <text fill="#625f54" fontSize="14" fontWeight="700" textAnchor="middle" x={point.x} y={height - 12}>{dayLabel(point.date)}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function ModeBreakdown({ modes }: { modes: DashboardActivityDto['modes'] }) {
  const maxValue = Math.max(...modes.map((mode) => mode.sessionsLast7Days), 1);

  return (
    <div className="rounded-md border-2 border-divider bg-white p-5 sm:p-6">
      <p className="m-0 text-sm font-black tracking-[0.08em] text-muted uppercase">Per mode</p>
      <h3 className="mt-2 mb-0 text-2xl font-black">Sesi minggu ini</h3>
      <div className="mt-7 grid gap-6">
        {modes.map((entry) => {
          const mode = GAME_MODES.find((item) => item.mode === entry.mode)!;
          const width = entry.sessionsLast7Days === 0
            ? 0
            : Math.max((entry.sessionsLast7Days / maxValue) * 100, 8);
          return (
            <div key={entry.mode}>
              <div className="flex items-center justify-between gap-4">
                <span className="flex min-w-0 items-center gap-3 font-black">
                  <img alt="" aria-hidden className="size-9 shrink-0" src={mode.emoji} />
                  <span className="truncate">{mode.title}</span>
                </span>
                <strong className="text-2xl">{entry.sessionsLast7Days}</strong>
              </div>
              <div aria-hidden className="mt-3 h-3 overflow-hidden rounded-full bg-divider">
                <div className="h-full rounded-full bg-brand" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const session = useSessionQuery();
  const signOut = useSignOutMutation();
  const activity = useDashboardActivityQuery(Boolean(session.data));
  const activityData = activity.data;
  const modes = activityData?.modes ?? EMPTY_MODES;
  const dailySeries = activityData?.dailySavedSessions ?? emptyDailySeries();

  useEffect(() => {
    if (signOut.isSuccess) navigate(ROUTES.landing, { replace: true });
  }, [navigate, signOut.isSuccess]);

  const institution = session.data?.institution.name ?? 'Institusi Arka';
  const metrics = [
    { label: 'Peserta aktif', value: activityData?.activeParticipants ?? 0, icon: UsersRound },
    { label: 'Total sesi', value: activityData?.savedSessionsTotal ?? 0, icon: BarChart3 },
    { label: '7 hari terakhir', value: activityData?.savedSessionsLast7Days ?? 0, icon: CalendarDays },
  ];

  return (
    <div className="relative min-h-dvh overflow-hidden bg-white text-ink">
      <div aria-hidden className="landing-glow landing-glow-soft -top-36 -right-40 size-[34rem]" />
      <a className="skip-link" href="#dashboard-main">Lewati ke konten utama</a>
      <AccountHeader
        isSigningOut={signOut.isPending}
        onSignOut={() => {
          if (session.data) signOut.mutate(session.data);
        }}
        user={session.data}
      />
      {signOut.isError && (
        <p className="mx-auto w-full max-w-[78rem] px-4 pt-4 text-base font-bold text-danger sm:px-6 lg:px-8" role="alert">{messageOf(signOut.error)}</p>
      )}

      <main className="relative mx-auto w-full max-w-[78rem] px-4 py-8 outline-none sm:px-6 lg:px-8 lg:py-12" id="dashboard-main" tabIndex={-1}>
        <m.section
          animate={{ opacity: 1, y: 0 }}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.35 }}
        >
          <p className="landing-eyebrow">Dashboard caregiver</p>
          <h1 className="m-0 max-w-3xl text-4xl font-black tracking-[-0.05em] sm:text-5xl">Selamat datang, {institution}</h1>
          <p className="mt-3 mb-0 max-w-2xl text-lg leading-8 text-muted">Mulai latihan dan pantau aktivitas rehabilitasi dari satu tempat.</p>
        </m.section>

        <section className="reference-panel mt-8 overflow-hidden rounded-lg p-5 sm:p-6" aria-label="Sapaan dashboard">
          <div className="flex flex-wrap items-center gap-5 sm:gap-8">
            <img alt="Arko" className="size-20 object-contain sm:size-24" src={arkoKoala} />
            <div>
              <p className="m-0 text-sm font-black tracking-[0.08em] text-accent uppercase">Selamat datang</p>
              <p className="mt-2 mb-0 max-w-2xl text-lg font-bold leading-8 text-ink-soft">Halo! Ini Arko, guider personalmu untuk sesi-sesi latihanmu. Yuk, pilih permainan di bawah.</p>
            </div>
          </div>
        </section>

        <section className="mt-8" aria-label="Mode latihan">
          <div className="grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
            {GAME_MODES.map((mode) => (
              <article className="reference-card flex h-full flex-col overflow-hidden" key={mode.mode}>
                <div className="grid h-40 place-items-center bg-gradient-to-br from-[#f5f6f8] via-white to-[#f1f3f6] p-4"><img alt="" aria-hidden className="max-h-32 w-full object-contain" src={mode.illustration} /></div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-3"><img alt="" aria-hidden className="size-11" src={mode.emoji} /><h3 className="m-0 text-2xl font-black">{mode.title}</h3></div>
                  <p className="mt-3 mb-0 flex-1 text-base leading-7 text-muted">{mode.detail}</p>
                  <p className="mt-4 mb-0 text-sm font-black text-muted">{mode.device}</p>
                  <Button className="mt-5 w-full" onClick={() => navigate(ROUTES.participantEntry(mode.mode))}>Buka mode</Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="activity-title">
          <div>
            <p className="landing-eyebrow">Pemantauan</p>
            <h2 className="m-0 text-3xl font-black tracking-[-0.04em]" id="activity-title">Aktivitas institusi</h2>
            <p className="mt-2 mb-0 text-lg text-muted">Ringkasan sesi yang berhasil disimpan.</p>
          </div>
          {activity.isError && <p className="mt-4 mb-0 flex items-center gap-2 text-base font-semibold text-muted" role="status"><BarChart3 aria-hidden className="size-5" />Data terbaru belum tersedia. Grafik menampilkan nilai kosong.</p>}
          <div className="mt-6 flex gap-4 overflow-x-auto pb-1">
            {metrics.map(({ label, value, icon: Icon }) => (
              <div className="flex min-w-56 flex-1 items-center gap-4 rounded-md border-2 border-divider p-5" key={label}>
                <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-divider/70"><Icon className="size-5" /></span>
                <div><p className="m-0 text-sm font-bold text-muted">{label}</p><p className="mt-1 mb-0 text-3xl font-black">{value}</p></div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.65fr_0.85fr]">
            <ActivityLineChart series={dailySeries} />
            <ModeBreakdown modes={modes} />
          </div>
        </section>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Link className="group grid gap-5 rounded-md border-2 border-ink bg-ink p-6 text-white no-underline transition hover:-translate-y-0.5 hover:bg-ink-soft hover:shadow-[0_5px_0_#b7c8d8] sm:grid-cols-[auto_1fr_auto] sm:items-center" to={ROUTES.progressBoard}>
            <span aria-hidden className="grid size-14 place-items-center rounded-full bg-brand-soft"><img alt="" className="size-10 object-contain" src={papanReference} /></span>
            <span><strong className="block text-2xl font-black">Buka Progress Board</strong><span className="mt-1 block text-base leading-7 text-white/75">Pantau konsistensi dan perkembangan setiap peserta.</span></span>
            <ArrowRight aria-hidden className="size-7 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link className="group grid gap-5 rounded-md border-2 border-divider bg-brand-soft p-6 text-ink no-underline transition hover:-translate-y-0.5 hover:border-ink hover:shadow-[0_5px_0_#b7c8d8] sm:grid-cols-[auto_1fr_auto] sm:items-center" to={ROUTES.rankings}>
            <span aria-hidden className="grid size-14 place-items-center rounded-full bg-white"><img alt="" className="size-10 object-contain" src={hiKoala} /></span>
            <span><strong className="block text-2xl font-black">Buka Leaderboard</strong><span className="mt-1 block text-base leading-7 text-muted">Lihat Top 10 peserta pada setiap mode permainan.</span></span>
            <ArrowRight aria-hidden className="size-7 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </main>
    </div>
  );
}

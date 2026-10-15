import { useGSAP } from '@gsap/react';
import { m, useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  athletesTrainingIllustration,
  clipboardEmoji,
  eyesEmoji,
  feelingHappyIllustration,
  heartHandsEmoji,
  heroMorningWorkoutIllustration,
  mindfulnessIllustration,
  musicalNotesEmoji,
  remindersIllustration,
  retroVideoGameIllustration,
  satelliteAntennaEmoji,
  shareResultsIllustration,
  tangerineEmoji,
  workingTogetherIllustration,
} from '@/assets/index.ts';
import { ROUTES } from '@/constants/routes.ts';
import { MarketingFooter, MarketingHeader } from '@/components/marketing-shell';
import { PublicSmoothScroll } from '@/components/PublicSmoothScroll';
import { buttonClassName } from '@/components/ui/button';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const BENEFITS = [
  {
    icon: heartHandsEmoji,
    title: 'Selalu didampingi',
    detail: 'Pengasuh membantu selama latihan.',
  },
  {
    icon: satelliteAntennaEmoji,
    title: 'Alat siap digunakan',
    detail: 'Latihan dimulai saat alat sudah siap.',
  },
  {
    icon: clipboardEmoji,
    title: 'Hasil tersimpan',
    detail: 'Catatan sesi dapat dilihat kembali.',
  },
] as const;

const GAMES = [
  {
    emoji: tangerineEmoji,
    illustration: athletesTrainingIllustration,
    title: 'Peras Jeruk',
    detail: 'Genggam alat dan tahan dengan nyaman.',
  },
  {
    emoji: eyesEmoji,
    illustration: mindfulnessIllustration,
    title: 'Go-No-Go',
    detail: 'Genggam saat gambar Wayang muncul.',
  },
  {
    emoji: musicalNotesEmoji,
    illustration: retroVideoGameIllustration,
    title: 'Ding Dong Dong',
    detail: 'Ingat lalu ikuti urutan empat tombol.',
  },
] as const;

const SESSION_SUPPORT = [
  {
    illustration: remindersIllustration,
    title: 'Tutorial jelas',
    detail: 'Lihat contoh sebelum mulai.',
  },
  {
    illustration: shareResultsIllustration,
    title: 'Hasil tercatat',
    detail: 'Data sesi tersimpan otomatis.',
  },
  {
    illustration: feelingHappyIllustration,
    title: 'Tetap menyenangkan',
    detail: 'Latihan berlangsung tanpa hukuman.',
  },
] as const;

const STAGGER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const REVEAL = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

interface LandingContentProps {
  accountEmail: string;
  accountImage: string | null;
  accountName: string;
  institutionName: string;
  isSignedIn: boolean;
  isSigningOut: boolean;
  onSignOut: () => void;
  signOutError: string;
}

export function LandingContent({
  accountEmail,
  accountImage,
  accountName,
  institutionName,
  isSignedIn,
  isSigningOut,
  onSignOut,
  signOutError,
}: LandingContentProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const hidden = reduceMotion ? 'visible' : 'hidden';

  useGSAP(() => {
    if (reduceMotion) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.to('[data-gsap-hero-art]', {
        yPercent: 9,
        ease: 'none',
        scrollTrigger: {
          trigger: '[data-gsap-hero]',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.7,
        },
      });
      gsap.utils.toArray<HTMLElement>('[data-gsap-float]').forEach((element, index) => {
        gsap.to(element, {
          y: index % 2 === 0 ? 34 : -34,
          rotation: index % 2 === 0 ? 3 : -3,
          ease: 'none',
          scrollTrigger: {
            trigger: element.closest('section') ?? element,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.9,
          },
        });
      });
    });
    return () => media.revert();
  }, { dependencies: [reduceMotion], scope: containerRef, revertOnUpdate: true });

  return (
    <PublicSmoothScroll>
      <div className="min-h-dvh bg-white text-ink" ref={containerRef}>
      <a className="skip-link" href="#konten-utama">
        Lewati ke konten utama
      </a>

      <MarketingHeader
        accountEmail={accountEmail}
        accountImage={accountImage}
        accountName={accountName}
        institutionName={institutionName}
        isSignedIn={isSignedIn}
        isSigningOut={isSigningOut}
        onSignOut={onSignOut}
      />
      <p
        aria-live="polite"
        className="mx-auto w-full max-w-[72rem] px-5 pt-3 text-base font-bold leading-6 text-danger empty:hidden sm:px-8"
        role="status"
      >
        {signOutError}
      </p>

      <main className="outline-none" id="konten-utama" tabIndex={-1}>
        <section className="relative isolate overflow-hidden bg-white" data-gsap-hero>
          <div
            aria-hidden
            className="landing-glow landing-glow-yellow -top-24 -left-24 size-96"
            data-gsap-float
          />
          <div
            aria-hidden
            className="landing-glow landing-glow-soft right-0 bottom-0 size-72"
            data-gsap-float
          />
          <div className="relative z-10 mx-auto grid min-h-[38rem] w-full max-w-[72rem] items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-18">
            <m.div
              animate="visible"
              className="text-center lg:text-left"
              initial={hidden}
              variants={REVEAL}
            >
              <h1 className="m-0 text-4xl font-black leading-[1.05] tracking-[-0.055em] sm:text-5xl lg:text-6xl">
                Bergerak dan mengingat jadi <span className="text-primary-display">lebih menyenangkan</span>
              </h1>
              <p className="mt-5 mb-0 text-lg font-semibold leading-8 text-ink-soft">
                Latihan sederhana untuk lansia bersama pendamping.
              </p>

              {isSignedIn ? (
                <a className={buttonClassName('dark', 'mt-8')} href="#latihan">
                  Lihat latihan
                  <ArrowRight aria-hidden className="size-5" />
                </a>
              ) : (
                <Link className={buttonClassName('dark', 'mt-8')} to={ROUTES.register}>
                  Mulai sekarang
                  <ArrowRight aria-hidden className="size-5" />
                </Link>
              )}
            </m.div>

            <m.img
              alt="Dua orang melakukan latihan pagi bersama"
              data-gsap-hero-art
              animate="visible"
              initial={hidden}
              className="mx-auto max-h-[30rem] w-full object-contain"
              fetchPriority="high"
              src={heroMorningWorkoutIllustration}
              transition={{ delay: reduceMotion ? 0 : 0.12 }}
              variants={REVEAL}
            />
          </div>
        </section>

        <section
          className="relative isolate overflow-hidden px-5 py-16 sm:px-8 lg:py-22"
          id="manfaat"
        >
          <div aria-hidden className="landing-ring -right-24 top-16 size-72" data-gsap-float />
          <div className="relative z-10 mx-auto w-full max-w-[72rem]">
            <m.div
              className="mx-auto max-w-2xl text-center"
              initial={hidden}
              variants={REVEAL}
              viewport={{ once: true, amount: 0.4 }}
              whileInView="visible"
            >
              <h2 className="landing-heading">
                Semua latihan dalam <span className="text-primary-display">satu tempat</span>
              </h2>
              <p className="mt-4 mb-0 text-lg font-semibold leading-8 text-muted">
                Mudah digunakan oleh pendamping dan peserta.
              </p>
            </m.div>

            <m.div
              className="mt-12 grid gap-5 md:grid-cols-3"
              initial={hidden}
              variants={STAGGER}
              viewport={{ once: true, amount: 0.2 }}
              whileInView="visible"
            >
              {BENEFITS.map(({ detail, icon, title }) => (
                <m.article
                  className="rounded-3xl border-2 border-divider bg-white p-6 text-center shadow-[0_5px_0_#b7c8d8]"
                  variants={REVEAL}
                  key={title}
                >
                  <img alt="" aria-hidden className="mx-auto size-18" src={icon} />
                  <h3 className="mt-5 mb-0 text-xl font-black">{title}</h3>
                  <p className="mt-2 mb-0 text-lg font-semibold leading-7 text-muted">{detail}</p>
                </m.article>
              ))}
            </m.div>
          </div>
        </section>

        <section
          className="relative isolate overflow-hidden bg-white px-5 py-16 sm:px-8 lg:py-22"
          id="latihan"
        >
          <div aria-hidden className="landing-glow landing-glow-soft -left-32 top-20 size-96" data-gsap-float />
          <div className="relative z-10 mx-auto w-full max-w-[72rem]">
            <m.div
              className="mx-auto max-w-2xl text-center"
              initial={hidden}
              variants={REVEAL}
              viewport={{ once: true, amount: 0.4 }}
              whileInView="visible"
            >
              <p className="landing-eyebrow">Pilihan latihan</p>
              <h2 className="landing-heading">Tiga permainan sederhana</h2>
            </m.div>

            <m.div
              className="mt-12 grid gap-6 lg:grid-cols-3"
              initial={hidden}
              variants={STAGGER}
              viewport={{ once: true, amount: 0.15 }}
              whileInView="visible"
            >
              {GAMES.map(({ detail, emoji, illustration, title }) => (
                <m.article
                  className="overflow-hidden rounded-[2rem] border-2 border-divider bg-white shadow-[0_6px_0_#b7c8d8]"
                  key={title}
                  variants={REVEAL}
                >
                  <div className="grid h-56 place-items-center bg-white p-6">
                    <img
                      alt=""
                      aria-hidden
                      className="max-h-44 w-full object-contain"
                      src={illustration}
                    />
                  </div>
                  <div className="p-6 text-center">
                    <img alt="" aria-hidden className="mx-auto size-14" src={emoji} />
                    <h3 className="mt-4 mb-0 text-2xl font-black tracking-[-0.03em]">{title}</h3>
                    <p className="mt-3 mb-0 text-lg font-semibold leading-7 text-muted">{detail}</p>
                  </div>
                </m.article>
              ))}
            </m.div>
          </div>
        </section>

        <section
          className="relative isolate overflow-hidden px-5 py-16 sm:px-8 lg:py-22"
          id="cara-kerja"
        >
          <div
            aria-hidden
            className="landing-glow landing-glow-yellow -right-28 bottom-0 size-96"
            data-gsap-float
          />
          <m.div
            className="relative z-10 mx-auto grid w-full max-w-[72rem] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]"
            initial={hidden}
            variants={REVEAL}
            viewport={{ once: true, amount: 0.2 }}
            whileInView="visible"
          >
            <img
              alt="Pendamping dan peserta mengikuti latihan bersama"
              className="mx-auto max-h-[30rem] w-full object-contain"
              loading="lazy"
              src={workingTogetherIllustration}
            />

            <div>
              <p className="landing-eyebrow">Cara kerja</p>
              <h2 className="landing-heading">Pendamping mengatur. Peserta tinggal mengikuti.</h2>
              <ol className="mt-9 grid list-none gap-4 p-0">
                {['Pilih latihan', 'Ikuti tutorial', 'Mulai saat alat siap'].map((step, index) => (
                  <li
                    className="flex items-center gap-4 rounded-2xl border-2 border-divider bg-white p-4 text-xl font-black shadow-[0_4px_0_#b7c8d8]"
                    key={step}
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </m.div>
        </section>

        <section className="bg-white px-5 py-16 sm:px-8 lg:py-22">
          <div className="mx-auto w-full max-w-[72rem]">
            <m.div
              className="mx-auto max-w-2xl text-center"
              initial={hidden}
              variants={REVEAL}
              viewport={{ once: true, amount: 0.4 }}
              whileInView="visible"
            >
              <h2 className="landing-heading">Setiap sesi terasa jelas</h2>
            </m.div>

            <m.div
              className="mt-12 grid gap-5 md:grid-cols-3"
              initial={hidden}
              variants={STAGGER}
              viewport={{ once: true, amount: 0.2 }}
              whileInView="visible"
            >
              {SESSION_SUPPORT.map(({ detail, illustration, title }) => (
                <m.article
                  className="rounded-[2rem] border-2 border-divider bg-white p-6 text-center shadow-[0_5px_0_#b7c8d8]"
                  key={title}
                  variants={REVEAL}
                >
                  <img
                    alt=""
                    aria-hidden
                    className="mx-auto h-40 w-full object-contain"
                    loading="lazy"
                    src={illustration}
                  />
                  <h3 className="mt-5 mb-0 text-xl font-black">{title}</h3>
                  <p className="mt-2 mb-0 text-lg font-semibold leading-7 text-muted">{detail}</p>
                </m.article>
              ))}
            </m.div>
          </div>
        </section>
      </main>

        <MarketingFooter />
      </div>
    </PublicSmoothScroll>
  );
}

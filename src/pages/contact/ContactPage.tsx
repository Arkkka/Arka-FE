import { m, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  clipboardEmoji,
  contactUsIllustration,
  heartHandsEmoji,
  satelliteAntennaEmoji,
} from '@/assets/index.ts';
import { buttonClassName } from '@/components/index.ts';
import { ROUTES } from '@/constants/routes.ts';

interface ContactOption {
  icon: string;
  title: string;
  detail: string;
  action?: string;
  to?: string;
}

const CONTACT_OPTIONS: readonly ContactOption[] = [
  {
    icon: clipboardEmoji,
    title: 'Bantuan akun dan penggunaan',
    detail: 'Baca jawaban tentang masuk, peserta, latihan, dan hasil sesi.',
    action: 'Buka FAQ',
    to: ROUTES.faq,
  },
  {
    icon: satelliteAntennaEmoji,
    title: 'Bantuan alat institusi',
    detail: 'Hubungi penanggung jawab Arka di fasilitas Anda untuk pemeriksaan alat dan jaringan.',
  },
  {
    icon: heartHandsEmoji,
    title: 'Kerja sama pilot',
    detail: 'Daftarkan institusi untuk memulai pembicaraan mengenai penggunaan Arka di fasilitas Anda.',
    action: 'Daftarkan institusi',
    to: ROUTES.register,
  },
];

export function ContactPage() {
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 };

  return (
    <>
      <section className="relative isolate overflow-hidden px-5 py-14 sm:px-8 lg:py-20">
        <div aria-hidden className="landing-glow landing-glow-yellow -right-20 top-0 size-96" />
        <div className="relative z-10 mx-auto grid w-full max-w-[72rem] items-center gap-12 lg:grid-cols-2">
          <m.img
            alt="Seseorang menghubungi layanan bantuan"
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-h-[27rem] w-full object-contain"
            initial={initial}
            src={contactUsIllustration}
            transition={{ duration: 0.45 }}
          />
          <m.div
            animate={{ opacity: 1, y: 0 }}
            initial={initial}
            transition={{ delay: reduceMotion ? 0 : 0.1, duration: 0.45 }}
          >
            <p className="landing-eyebrow">Kontak</p>
            <h1 className="m-0 max-w-xl text-4xl font-black leading-[1.08] tracking-[-0.05em] text-ink sm:text-5xl">
              Kami membantu Anda menemukan jalur yang tepat.
            </h1>
            <p className="mt-5 mb-0 max-w-xl text-lg font-semibold leading-8 text-muted">
              Pilih kebutuhan Anda. Kanal bantuan resmi akan ditampilkan setelah ditetapkan pengelola Arka.
            </p>
          </m.div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:pb-28">
        <div className="mx-auto grid w-full max-w-[72rem] gap-6 md:grid-cols-3">
          {CONTACT_OPTIONS.map(({ action, detail, icon, title, to }, index) => (
            <m.article
              className="flex flex-col rounded-md border-2 border-divider bg-white p-6 shadow-[0_5px_0_#b7c8d8]"
              initial={initial}
              key={title}
              transition={{ delay: reduceMotion ? 0 : index * 0.08, duration: 0.4 }}
              viewport={{ once: true, amount: 0.25 }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <img alt="" aria-hidden className="size-16" src={icon} />
              <h2 className="mt-6 mb-0 text-2xl font-black tracking-[-0.03em] text-ink">{title}</h2>
              <p className="mt-3 mb-0 text-lg leading-8 text-muted">{detail}</p>
              {action && to && (
                <Link className={buttonClassName('primary', 'mt-7 w-full')} to={to}>
                  {action}
                </Link>
              )}
            </m.article>
          ))}
        </div>
      </section>
    </>
  );
}

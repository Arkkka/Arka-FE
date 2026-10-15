import { m, useReducedMotion } from 'framer-motion';
import {
  clipboardEmoji,
  heartHandsEmoji,
  stretchingReference,
  tangerineEmoji,
} from '@/assets/index.ts';

const MISSIONS = [
  {
    icon: heartHandsEmoji,
    title: 'Selalu bersama pendamping',
    detail: 'Setiap sesi memberi pendamping kendali untuk memulai, menjeda, atau mengakhiri latihan.',
  },
  {
    icon: tangerineEmoji,
    title: 'Gerakan yang mudah diikuti',
    detail: 'Instruksi dibuat singkat, besar, dan dilakukan melalui alat fisik yang telah disiapkan.',
  },
  {
    icon: clipboardEmoji,
    title: 'Catatan yang mudah dipahami',
    detail: 'Hasil disajikan sebagai fakta permainan, tanpa diagnosis atau perbandingan antar peserta.',
  },
] as const;

export function MissionPage() {
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 };

  return (
    <>
      <section className="relative isolate overflow-hidden px-5 py-14 sm:px-8 lg:py-20">
        <div aria-hidden className="landing-glow landing-glow-brand -top-28 -left-28 size-96" />
        <div className="relative z-10 mx-auto grid w-full max-w-[72rem] items-center gap-10 lg:grid-cols-2">
          <m.div animate={{ opacity: 1, y: 0 }} initial={initial} transition={{ duration: 0.45 }}>
            <p className="landing-eyebrow">Misi kami</p>
            <h1 className="m-0 max-w-2xl text-4xl font-black leading-[1.08] tracking-[-0.05em] text-ink sm:text-5xl">
              Membuat latihan terasa lebih jelas, aman, dan menyenangkan.
            </h1>
            <p className="mt-5 mb-0 max-w-xl text-lg font-semibold leading-8 text-muted">
              Arka membantu fasilitas mendampingi latihan motorik dan kognitif lansia melalui alur sederhana dan perangkat yang terhubung.
            </p>
          </m.div>
          <m.img
            alt="Koala melakukan peregangan"
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-h-[27rem] w-full object-contain"
            initial={initial}
            src={stretchingReference}
            transition={{ delay: reduceMotion ? 0 : 0.1, duration: 0.45 }}
          />
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:pb-28">
        <div className="mx-auto w-full max-w-[72rem]">
          <m.h2
            className="m-0 text-center text-3xl font-black tracking-[-0.04em] text-ink sm:text-4xl"
            initial={initial}
            viewport={{ once: true, amount: 0.4 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Prinsip yang kami bawa ke setiap sesi
          </m.h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {MISSIONS.map(({ detail, icon, title }, index) => (
              <m.article
                className="rounded-md border-2 border-divider bg-white p-6 shadow-[0_5px_0_#b7c8d8]"
                initial={initial}
                key={title}
                transition={{ delay: reduceMotion ? 0 : index * 0.08, duration: 0.4 }}
                viewport={{ once: true, amount: 0.25 }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <img alt="" aria-hidden className="size-16" src={icon} />
                <h3 className="mt-6 mb-0 text-2xl font-black tracking-[-0.03em] text-ink">{title}</h3>
                <p className="mt-3 mb-0 text-lg leading-8 text-muted">{detail}</p>
              </m.article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

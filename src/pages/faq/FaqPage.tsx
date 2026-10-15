import { m, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { faqIllustration } from '@/assets/index.ts';

const QUESTIONS = [
  {
    question: 'Siapa yang menggunakan Arka?',
    answer:
      'Arka digunakan oleh pendamping atau pengasuh di institusi. Peserta mengikuti latihan bersama pendamping dan tidak perlu membuat akun sendiri.',
  },
  {
    question: 'Apakah Arka dapat digunakan tanpa pendamping?',
    answer:
      'Tidak. Setiap sesi dirancang untuk selalu didampingi agar peserta memahami instruksi, merasa nyaman, dan dapat berhenti kapan saja.',
  },
  {
    question: 'Latihan apa saja yang tersedia?',
    answer:
      'Arka menyediakan Peras Jeruk untuk latihan genggaman, Go-No-Go untuk perhatian, dan Ding Dong Dong untuk mengingat urutan tombol.',
  },
  {
    question: 'Apa yang perlu disiapkan sebelum latihan?',
    answer:
      'Pendamping perlu masuk dengan akun institusi, memilih latihan, memasukkan data peserta, mengikuti tutorial, dan memastikan alat dinyatakan siap.',
  },
  {
    question: 'Apakah hasil Arka merupakan diagnosis?',
    answer:
      'Bukan. Hasil Arka adalah catatan permainan dan latihan. Hasil tidak menggantikan pemeriksaan atau penilaian tenaga kesehatan.',
  },
  {
    question: 'Apa yang terjadi jika alat terputus?',
    answer:
      'Sesi dihentikan untuk menjaga keamanan dan tidak dianggap selesai. Pendamping dapat memulai persiapan baru setelah alat kembali siap.',
  },
  {
    question: 'Apakah Google dapat digunakan untuk masuk?',
    answer:
      'Ya, jika pengelola Arka telah mengaktifkan Google pada lingkungan institusi. Email dan kata sandi tetap tersedia sebagai pilihan utama.',
  },
] as const;

export function FaqPage() {
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 };

  return (
    <>
      <section className="relative isolate overflow-hidden px-5 py-14 sm:px-8 lg:py-20">
        <div aria-hidden className="landing-glow landing-glow-yellow -top-32 -right-24 size-96" />
        <div className="relative z-10 mx-auto grid w-full max-w-[72rem] items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <m.div animate={{ opacity: 1, y: 0 }} initial={initial} transition={{ duration: 0.45 }}>
            <p className="landing-eyebrow">Pusat bantuan</p>
            <h1 className="m-0 max-w-xl text-4xl font-black leading-[1.08] tracking-[-0.05em] text-ink sm:text-5xl">
              Ada yang ingin ditanyakan?
            </h1>
            <p className="mt-5 mb-0 max-w-xl text-lg font-semibold leading-8 text-muted">
              Temukan jawaban singkat tentang akun, alat, latihan, dan hasil sesi Arka.
            </p>
          </m.div>
          <m.img
            alt="Seseorang melihat daftar pertanyaan dan jawaban"
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-h-[24rem] w-full object-contain"
            initial={initial}
            src={faqIllustration}
            transition={{ delay: reduceMotion ? 0 : 0.1, duration: 0.45 }}
          />
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:pb-28">
        <div className="mx-auto max-w-3xl">
          <m.h2
            className="m-0 text-3xl font-black tracking-[-0.04em] text-ink"
            initial={initial}
            viewport={{ once: true, amount: 0.4 }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Pertanyaan yang sering diajukan
          </m.h2>
          <div className="mt-8 grid gap-4">
            {QUESTIONS.map(({ answer, question }, index) => (
              <m.details
                className="group rounded-md border-2 border-divider bg-white shadow-[0_4px_0_#b7c8d8]"
                initial={initial}
                key={question}
                transition={{ delay: reduceMotion ? 0 : index * 0.05, duration: 0.35 }}
                viewport={{ once: true, amount: 0.2 }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-lg font-black text-ink focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-brand-ink">
                  {question}
                  <ChevronDown
                    aria-hidden
                    className="size-6 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <p className="m-0 border-t-2 border-divider px-5 py-5 text-lg leading-8 text-muted">
                  {answer}
                </p>
              </m.details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

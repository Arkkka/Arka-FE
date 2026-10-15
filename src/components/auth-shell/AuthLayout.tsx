import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Brand } from '@/components/brand';
import { hiKoala } from '@/assets';

interface AuthLayoutProps {
  children: ReactNode;
  footer: ReactNode;
  photo: string;
  photoAlt: string;
  subtitle: string;
  title: string;
  visualSide: 'left' | 'right';
  visualText: string;
  visualTitle: string;
}

export default function AuthLayout({
  children,
  footer,
  photo,
  photoAlt,
  subtitle,
  title,
  visualSide,
  visualText,
  visualTitle,
}: AuthLayoutProps) {
  const reduceMotion = useReducedMotion();

  const imagePanel = (
    <aside className="relative hidden min-h-dvh overflow-hidden bg-ink lg:block">
      <m.img
        alt={photoAlt}
        animate={{ opacity: 1, scale: 1 }}
        className="size-full object-cover"
        initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.02 }}
        src={photo}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-brand/20 via-transparent to-brand/15" />
      <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
        <h2 className="m-0 max-w-xl text-4xl font-black leading-[1.05] tracking-[-0.05em] xl:text-5xl">
          {visualTitle}
        </h2>
        <p className="mt-4 mb-0 max-w-lg text-lg font-semibold leading-8 text-white/85">
          {visualText}
        </p>
      </div>
    </aside>
  );

  const formPanel = (
    <section className="flex min-h-dvh flex-col bg-white px-5 py-4 sm:px-10 sm:py-5 lg:px-14 xl:px-20">
      <Brand compact />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-3">
        <div className="mb-5">
          <h1 className="m-0 font-sans text-4xl font-black tracking-[-0.045em] text-ink">
            {title}
          </h1>
          <p className="mt-3 mb-0 max-w-prose text-base font-medium leading-7 text-muted">
            {subtitle}
          </p>
        </div>
        <div id="auth-form">{children}</div>
        <div className="mt-4 border-t-2 border-divider pt-4 text-center text-base font-semibold leading-6 text-muted">
          {footer}
        </div>
        <img alt="" aria-hidden className="mx-auto mt-6 size-20 object-contain opacity-85" src={hiKoala} />
      </div>
    </section>
  );

  return (
    <div className="min-h-dvh bg-white">
      <a className="skip-link" href="#auth-form">
        Lewati ke formulir
      </a>
      <main className="min-h-dvh bg-white outline-none" tabIndex={-1}>
        <div className="grid min-h-dvh lg:grid-cols-2">
          {visualSide === 'left' && imagePanel}
          {formPanel}
          {visualSide === 'right' && imagePanel}
        </div>
      </main>
    </div>
  );
}

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { healthcareTeamPhoto } from '@/assets';
import { ROUTES } from '@/constants';
import AuthLayout from './AuthLayout.tsx';

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return (
    <AuthLayout
      footer={
        <p className="m-0">
          Sudah memiliki akun?{' '}
          <Link className="font-black text-accent underline underline-offset-4" to={ROUTES.login}>
            Masuk
          </Link>
        </p>
      }
      photo={healthcareTeamPhoto}
      photoAlt="Tim tenaga kesehatan berdiskusi bersama"
      subtitle="Buat satu akun untuk mengelola latihan di institusi Anda."
      title="Daftarkan institusi"
      visualSide="left"
      visualText="Siapkan akun pendamping dan mulai latihan dengan alur yang jelas."
      visualTitle="Mulai pendampingan dalam satu akun."
    >
      {children}
    </AuthLayout>
  );
}

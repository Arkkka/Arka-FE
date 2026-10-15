import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { seniorExercisePhoto } from '@/assets';
import { ROUTES } from '@/constants';
import AuthLayout from './AuthLayout.tsx';

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <AuthLayout
      footer={
        <p className="m-0">
          Belum memiliki akun?{' '}
          <Link className="font-black text-accent underline underline-offset-4" to={ROUTES.register}>
            Daftar
          </Link>
        </p>
      }
      photo={seniorExercisePhoto}
      photoAlt="Pendamping membantu lansia melakukan latihan"
      subtitle="Masuk dengan akun institusi untuk melanjutkan sesi latihan."
      title="Selamat datang kembali"
      visualSide="right"
      visualText="Kelola latihan peserta dan lihat hasil sesi dalam satu tempat."
      visualTitle="Dampingi setiap langkah dengan lebih mudah."
    >
      {children}
    </AuthLayout>
  );
}

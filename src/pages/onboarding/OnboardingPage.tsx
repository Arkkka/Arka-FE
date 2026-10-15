import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { healthcareTeamPhoto } from '@/assets/index.ts';
import { useInstitutionOnboarding } from '@/hooks/auth';
import { AuthLayout, Button, Field } from '@/components/index.ts';
import { messageOf } from '@/config/api-client.ts';
import { ROUTES } from '@/constants/routes.ts';

export function OnboardingPage() {
  const navigate = useNavigate();
  const fieldRef = useRef<HTMLInputElement>(null);
  const [institutionName, setInstitutionName] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const { onboarding, complete } = useInstitutionOnboarding(institutionName);

  useEffect(() => {
    if (onboarding.data && !onboarding.data.required) {
      navigate(ROUTES.dashboard, { replace: true });
    }
  }, [navigate, onboarding.data]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = institutionName.trim().replace(/\s+/gu, ' ');
    if (normalized.length < 2 || normalized.length > 120) {
      setFieldError('Nama institusi harus terdiri dari 2–120 karakter.');
      requestAnimationFrame(() => fieldRef.current?.focus());
      return;
    }
    setFieldError('');
    setFormError('');
    try {
      await complete.mutateAsync();
      navigate(ROUTES.dashboard, { replace: true });
    } catch (error) {
      setFormError(messageOf(error));
    }
  }

  if (onboarding.isPending || (onboarding.data && !onboarding.data.required)) {
    return (
      <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-white px-5 text-center" tabIndex={-1}>
        <div aria-hidden className="absolute -top-40 right-[-10rem] size-[30rem] rounded-full bg-[radial-gradient(circle,rgba(243,198,66,0.22),transparent_68%)]" />
        <div role="status">
          <span aria-hidden className="mx-auto block size-11 animate-spin rounded-full border-4 border-divider border-t-accent" />
          <h1 className="mt-6 mb-0 text-3xl font-black">Menyiapkan akun…</h1>
          <p className="mt-3 mb-0 text-base text-muted">Memeriksa data institusi Anda.</p>
        </div>
      </main>
    );
  }

  return (
    <AuthLayout
      footer={<p className="m-0">Data ini dapat diperbarui oleh pengelola institusi nanti.</p>}
      photo={healthcareTeamPhoto}
      photoAlt="Tim tenaga kesehatan berdiskusi bersama"
      subtitle="Satu langkah terakhir sebelum menggunakan Arka."
      title="Lengkapi institusi"
      visualSide="left"
      visualText="Nama institusi membantu Arka memisahkan peserta, alat, dan hasil sesi secara aman."
      visualTitle="Siapkan ruang latihan untuk tim Anda."
    >
      {onboarding.isError ? (
        <div className="grid gap-4" role="alert">
          <p className="m-0 text-lg font-bold leading-7 text-danger">
            Sesi pendaftaran tidak dapat dibaca. Silakan kembali dan daftar dengan Google lagi.
          </p>
          <Button onClick={() => navigate(ROUTES.register, { replace: true })} variant="secondary">
            Kembali ke pendaftaran
          </Button>
        </div>
      ) : (
        <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
          <div className="rounded-sm bg-brand-soft p-4">
            <p className="m-0 text-base font-bold text-ink">Akun Google</p>
            <p className="mt-1 mb-0 break-all text-base leading-6 text-muted">
              {onboarding.data?.user.email}
            </p>
          </div>
          <Field
            autoComplete="organization"
            error={fieldError}
            inputRef={fieldRef}
            label="Nama institusi"
            maxLength={120}
            name="institutionName"
            onChange={(event) => {
              setInstitutionName(event.target.value);
              if (fieldError) setFieldError('');
            }}
            placeholder="Contoh: Panti Sejahtera"
            required
            value={institutionName}
          />
          {formError && (
            <p aria-live="polite" className="m-0 text-base font-bold leading-6 text-danger" role="alert">
              {formError}
            </p>
          )}
          <Button className="w-full" disabled={complete.isPending} type="submit">
            {complete.isPending ? 'Menyimpan…' : 'Simpan dan lanjutkan'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

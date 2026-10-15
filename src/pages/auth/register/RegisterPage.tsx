import { useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import {
  Button,
  Field,
  GoogleAuthButton,
  PasswordVisibilityButton,
} from '@/components/index.ts';
import { messageOf } from '@/config/api-client.ts';
import { ROUTES } from '@/constants/routes.ts';
import { useAuthCapabilitiesQuery, useGoogleSignInMutation, useResendRegistrationOtpMutation, useSignUpMutation, useVerifyRegistrationEmailMutation } from '@/hooks/auth';

const RegisterFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nama institusi minimal 2 karakter.')
    .max(120, 'Nama institusi terlalu panjang.'),
  email: z
    .string()
    .trim()
    .min(1, 'Email wajib diisi.')
    .email('Format email belum sesuai.')
    .max(254, 'Email terlalu panjang.'),
  password: z
    .string()
    .min(8, 'Kata sandi minimal 8 karakter.')
    .max(128, 'Kata sandi terlalu panjang.'),
});

type FieldName = 'name' | 'email' | 'password' | 'otp';
type FieldErrors = Partial<Record<FieldName, string>>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const capabilities = useAuthCapabilitiesQuery();
  const signUp = useSignUpMutation();
  const verifyEmail = useVerifyRegistrationEmailMutation();
  const resendOtp = useResendRegistrationOtpMutation();
  const googleSignIn = useGoogleSignInMutation();
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const signUpInFlightRef = useRef(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState(() =>
    searchParams.has('oauthError')
      ? 'Pendaftaran dengan Google dibatalkan atau belum dapat diselesaikan.'
      : '',
  );

  const busy = signUp.isPending || verifyEmail.isPending || resendOtp.isPending || googleSignIn.isPending;
  const googleEnabled = capabilities.data?.socialProviders.google === true;

  function clearFieldError(field: FieldName) {
    if (!fieldErrors[field]) return;
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || signUpInFlightRef.current) return;

    const parsed = RegisterFormSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === 'name' || field === 'email' || field === 'password') && !next[field]) {
          next[field] = issue.message;
        }
      }
      setFieldErrors(next);
      setFormError('Periksa kembali data yang diisi.');
      requestAnimationFrame(() => {
        if (next.name) nameRef.current?.focus();
        else if (next.email) emailRef.current?.focus();
        else passwordRef.current?.focus();
      });
      return;
    }

    setFieldErrors({});
    setFormError('');
    signUpInFlightRef.current = true;
    try {
      await signUp.mutateAsync(parsed.data);
      setEmail(parsed.data.email);
      setPassword('');
      setVerificationPending(true);
      await resendOtp.mutateAsync(parsed.data.email);
      requestAnimationFrame(() => otpRef.current?.focus());
    } catch (error) {
      setFormError(messageOf(error));
    } finally {
      signUpInFlightRef.current = false;
    }
  }

  async function handleVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/u.test(otp)) {
      setFieldErrors({ otp: 'Masukkan enam digit kode verifikasi.' });
      setFormError('Periksa kembali kode verifikasi.');
      otpRef.current?.focus();
      return;
    }
    setFieldErrors({});
    setFormError('');
    try {
      await verifyEmail.mutateAsync({ email, otp });
      navigate(`${ROUTES.login}?verified=1`, { replace: true });
    } catch (error) {
      setFormError(messageOf(error));
    }
  }

  async function handleResendOtp() {
    if (busy) return;
    setFormError('');
    try {
      await resendOtp.mutateAsync(email);
      setOtp('');
      requestAnimationFrame(() => otpRef.current?.focus());
    } catch (error) {
      setFormError(messageOf(error));
    }
  }

  async function handleGoogle() {
    if (busy) return;
    setFormError('');
    try {
      const url = await googleSignIn.mutateAsync('register');
      window.location.assign(url);
    } catch (error) {
      setFormError(messageOf(error));
    }
  }

  return (
    <>
      {verificationPending ? (
        <form className="grid gap-4" noValidate onSubmit={handleVerification}>
          <p className="m-0 text-base leading-7 text-muted">
            Kode enam digit telah dikirim ke <strong className="text-ink">{email}</strong>. Kode berlaku selama lima menit.
          </p>
          <Field
            autoComplete="one-time-code"
            error={fieldErrors.otp}
            inputMode="numeric"
            inputRef={otpRef}
            label="Kode verifikasi"
            maxLength={6}
            name="otp"
            onChange={(event) => {
              setOtp(event.target.value.replace(/\D/gu, '').slice(0, 6));
              clearFieldError('otp');
            }}
            pattern="[0-9]{6}"
            placeholder="000000"
            required
            value={otp}
          />
          {formError && (
            <p aria-live="polite" className="m-0 text-base font-bold leading-6 text-danger" role="alert">
              {formError}
            </p>
          )}
          <Button className="w-full" disabled={busy} type="submit">
            {verifyEmail.isPending ? 'Memverifikasi…' : 'Verifikasi email'}
          </Button>
          <Button disabled={busy} onClick={() => void handleResendOtp()} type="button" variant="quiet">
            {resendOtp.isPending ? 'Mengirim…' : 'Kirim ulang kode'}
          </Button>
        </form>
      ) : (
      <form className="grid gap-3" noValidate onSubmit={handleSubmit}>
        <Field
          autoComplete="organization"
          error={fieldErrors.name}
          inputRef={nameRef}
          label="Nama institusi"
          maxLength={120}
          name="name"
          onChange={(event) => {
            setName(event.target.value);
            clearFieldError('name');
          }}
          placeholder="Contoh: Panti Sejahtera"
          required
          value={name}
        />
        <Field
          autoComplete="email"
          error={fieldErrors.email}
          inputRef={emailRef}
          label="Email institusi"
          maxLength={254}
          name="email"
          onChange={(event) => {
            setEmail(event.target.value);
            clearFieldError('email');
          }}
          placeholder="nama@institusi.id"
          required
          type="email"
          value={email}
        />
        <Field
          autoComplete="new-password"
          error={fieldErrors.password}
          hint="Gunakan minimal 8 karakter."
          inputRef={passwordRef}
          label="Kata sandi"
          maxLength={128}
          name="password"
          onChange={(event) => {
            setPassword(event.target.value);
            clearFieldError('password');
          }}
          placeholder="Buat kata sandi"
          required
          trailing={
            <PasswordVisibilityButton
              onToggle={() => setShowPassword((visible) => !visible)}
              visible={showPassword}
            />
          }
          type={showPassword ? 'text' : 'password'}
          value={password}
        />

        {formError && (
          <p aria-live="polite" className="m-0 text-base font-bold leading-6 text-danger" role="alert">
            {formError}
          </p>
        )}

        <Button className="w-full" disabled={busy} type="submit">
          {signUp.isPending ? 'Mendaftarkan…' : 'Daftar'}
        </Button>

        <div className="flex items-center gap-3 py-1 text-base font-bold text-muted">
          <span className="h-px flex-1 bg-divider" />
          atau
          <span className="h-px flex-1 bg-divider" />
        </div>
        <GoogleAuthButton
          disabled={busy || !googleEnabled}
          label="Daftar dengan Google"
          loading={googleSignIn.isPending}
          loadingLabel="Menghubungkan ke Google…"
          onClick={() => void handleGoogle()}
        />
        {capabilities.isError ? (
          <p className="m-0 text-center text-base font-semibold leading-6 text-danger" role="alert">
            Layanan pendaftaran sedang tidak tersedia. Coba lagi beberapa saat lagi.
          </p>
        ) : (
          !capabilities.isPending &&
          !googleEnabled && (
            <p className="m-0 text-center text-base font-semibold leading-6 text-muted">
              Pendaftaran Google belum diaktifkan oleh administrator.
            </p>
          )
        )}
      </form>
      )}
    </>
  );
}

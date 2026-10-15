import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Camera, CheckCircle2, ImageOff, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ChangePasswordRequestSchema,
  UpdateProfileRequestSchema,
  type ChangePasswordRequest,
} from '@/schemas/index.ts';
import { AccountHeader, Button, Field, PasswordVisibilityButton } from '@/components/index.ts';
import { messageOf } from '@/config/api-client.ts';
import { validateAvatarFile } from '@/lib/avatar.ts';
import { AvatarCropDialog } from './AvatarCropDialog.tsx';
import { ROUTES } from '@/constants/routes.ts';
import { useAccountPage, useChangePasswordMutation, useUpdateProfileMutation } from '@/hooks/auth';

type PasswordField = keyof ChangePasswordRequest;
type PasswordErrors = Partial<Record<PasswordField, string>>;
type ProfileField = 'name' | 'image' | 'institutionName';
type ProfileErrors = Partial<Record<ProfileField, string>>;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  return (parts.length > 1 ? `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}` : name.slice(0, 2)).toUpperCase();
}

export function ProfilePage() {
  const { session, signOut } = useAccountPage();
  const user = session.data;
  const updateProfile = useUpdateProfileMutation(user?.csrfToken ?? '');
  const changePassword = useChangePasswordMutation();
  const nameRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const institutionRef = useRef<HTMLInputElement>(null);
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [profileMessage, setProfileMessage] = useState('');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [passwordMessage, setPasswordMessage] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.user.name);
    setImage(user.user.image ?? '');
    setInstitutionName(user.institution.name);
    setCropFile(null);
  }, [user]);

  async function handleProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = UpdateProfileRequestSchema.safeParse({
      name,
      image: image.trim() || null,
      institutionName,
    });
    if (!parsed.success) {
      const errors: ProfileErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === 'name' || field === 'image' || field === 'institutionName') && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setProfileErrors(errors);
      setProfileMessage('Periksa kembali data profil.');
      requestAnimationFrame(() => {
        if (errors.name) nameRef.current?.focus();
        else if (errors.image) imageRef.current?.focus();
        else institutionRef.current?.focus();
      });
      return;
    }
    setProfileErrors({});
    setProfileMessage('');
    try {
      await updateProfile.mutateAsync(parsed.data);
      setProfileMessage('Profil berhasil diperbarui.');
    } catch (error) {
      setProfileMessage(messageOf(error));
    }
  }

  function clearPasswordError(field: PasswordField) {
    if (!passwordErrors[field]) return;
    setPasswordErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handlePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = ChangePasswordRequestSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!parsed.success) {
      const errors: PasswordErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === 'currentPassword' || field === 'newPassword' || field === 'confirmPassword') && !errors[field]) errors[field] = issue.message;
      }
      setPasswordErrors(errors);
      setPasswordMessage('Periksa kembali isian kata sandi.');
      requestAnimationFrame(() => {
        if (errors.currentPassword) currentPasswordRef.current?.focus();
        else if (errors.newPassword) newPasswordRef.current?.focus();
        else confirmPasswordRef.current?.focus();
      });
      return;
    }
    setPasswordErrors({});
    setPasswordMessage('');
    try {
      await changePassword.mutateAsync(parsed.data);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Kata sandi berhasil diperbarui. Sesi lain telah dikeluarkan.');
    } catch (error) {
      setPasswordMessage(messageOf(error));
    }
  }

  function clearProfileError(field: ProfileField) {
    if (!profileErrors[field]) return;
    setProfileErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  const profileChanged = user
    ? name.trim() !== user.user.name ||
      (image.trim() || null) !== user.user.image ||
      institutionName.trim() !== user.institution.name
    : false;
  const previewImage = image.trim() || null;

  return (
    <div className="min-h-dvh bg-white text-ink">
      <a className="skip-link" href="#profile-main">Lewati ke konten utama</a>
      <AccountHeader isSigningOut={signOut.isPending} onSignOut={() => user && signOut.mutate(user)} user={user} />
      <main className="mx-auto w-full max-w-[68rem] px-4 py-8 outline-none sm:px-6 lg:px-8 lg:py-12" id="profile-main" tabIndex={-1}>
        <Link className="group inline-flex min-h-11 items-center gap-2 font-black no-underline" to={ROUTES.dashboard}>
          <ArrowLeft aria-hidden className="size-5" />
          <span className="relative after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:bg-ink after:transition-transform group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100">Kembali ke dashboard</span>
        </Link>

        <section className="relative mt-7 overflow-hidden rounded-lg bg-gradient-to-br from-[#f4f6fb] via-white to-[#fff9e8] p-6 sm:p-8">
          <div aria-hidden className="absolute -top-24 right-[-4rem] size-64 rounded-full bg-[radial-gradient(circle,rgba(243,198,66,0.3),transparent_68%)]" />
          <div className="relative flex flex-wrap items-center gap-5">
            <div className="group relative size-24 shrink-0">
              <button
                aria-label="Ganti foto profil"
                className="relative block size-24 overflow-hidden rounded-full border-0 bg-transparent p-0 transition-transform hover:scale-[1.03] focus-visible:scale-[1.03]"
                aria-expanded={avatarMenuOpen}
                onClick={() => setAvatarMenuOpen((value) => !value)}
                type="button"
              >
                {previewImage ? (
                  <img alt={`Foto profil ${name || 'pengguna'}`} className="size-full object-cover" src={previewImage} />
                ) : (
                  <span aria-hidden className="grid size-full place-items-center bg-gradient-to-br from-brand to-[#ffdd7e] text-2xl font-black">{initials(name || 'A')}</span>
                )}
                <span aria-hidden className="absolute inset-0 grid place-items-center bg-ink/0 text-white opacity-0 transition-[background-color,opacity] group-hover:bg-ink/60 group-hover:opacity-100 group-focus-within:bg-ink/60 group-focus-within:opacity-100"><Camera className="size-7" /></span>
              </button>

              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  try {
                    validateAvatarFile(file);
                    setCropFile(file);
                    clearProfileError('image');
                  } catch (error) {
                    setProfileErrors((current) => ({ ...current, image: error instanceof Error ? error.message : 'Foto belum dapat diproses.' }));
                  }
                }}
                ref={imageRef}
                type="file"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="landing-eyebrow">Pengaturan akun</p>
              <h1 className="m-0 truncate text-4xl font-black tracking-[-0.05em] sm:text-5xl">{user?.user.name ?? 'Profil'}</h1>
              <p className="mt-2 mb-0 break-all text-base text-muted">{user?.user.email}</p>
              {profileErrors.image && <p className="mt-2 mb-0 text-sm font-bold text-danger" role="alert">{profileErrors.image}</p>}
            </div>
          </div>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <section className="rounded-md border-2 border-divider p-6" aria-labelledby="identity-title">
            <h2 className="m-0 text-2xl font-black" id="identity-title">Profil dan institusi</h2>
            <p className="mt-2 mb-0 text-base leading-7 text-muted">Email akun tidak dapat diubah dari halaman ini.</p>

            <form className="mt-6 grid gap-5" noValidate onSubmit={handleProfile}>
              <Field autoComplete="name" error={profileErrors.name} inputRef={nameRef} label="Nama pengguna" maxLength={100} name="name" onChange={(event) => { setName(event.target.value); clearProfileError('name'); setProfileMessage(''); }} required value={name} />
              <Field autoComplete="organization" error={profileErrors.institutionName} inputRef={institutionRef} label="Nama institusi" maxLength={120} name="institutionName" onChange={(event) => { setInstitutionName(event.target.value); clearProfileError('institutionName'); setProfileMessage(''); }} required value={institutionName} />
              {profileMessage && <p className={`m-0 flex items-start gap-2 text-base font-bold ${updateProfile.isError ? 'text-danger' : 'text-success'}`} role={updateProfile.isError ? 'alert' : 'status'}>{!updateProfile.isError && <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" />}{profileMessage}</p>}
              <Button disabled={!user || updateProfile.isPending || !profileChanged} type="submit">{updateProfile.isPending ? 'Menyimpan…' : 'Simpan perubahan'}</Button>
            </form>
          </section>

          <section className="rounded-md border-2 border-divider p-6" aria-labelledby="security-title">
            <div className="flex items-center gap-3"><ShieldCheck aria-hidden className="size-6 text-muted" /><h2 className="m-0 text-2xl font-black" id="security-title">Keamanan</h2></div>
            <p className="mt-3 mb-0 text-base leading-7 text-muted">Gunakan minimal 8 karakter. Setelah disimpan, sesi lain akan dikeluarkan.</p>
            <form className="mt-5 grid gap-4" noValidate onSubmit={handlePassword}>
              <Field autoComplete="current-password" error={passwordErrors.currentPassword} inputRef={currentPasswordRef} label="Kata sandi saat ini" maxLength={128} name="currentPassword" onChange={(event) => { setCurrentPassword(event.target.value); clearPasswordError('currentPassword'); setPasswordMessage(''); }} required trailing={<PasswordVisibilityButton onToggle={() => setShowCurrentPassword((value) => !value)} visible={showCurrentPassword} />} type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} />
              <Field autoComplete="new-password" error={passwordErrors.newPassword} inputRef={newPasswordRef} label="Kata sandi baru" maxLength={128} name="newPassword" onChange={(event) => { setNewPassword(event.target.value); clearPasswordError('newPassword'); setPasswordMessage(''); }} required trailing={<PasswordVisibilityButton onToggle={() => setShowNewPassword((value) => !value)} visible={showNewPassword} />} type={showNewPassword ? 'text' : 'password'} value={newPassword} />
              <Field autoComplete="new-password" error={passwordErrors.confirmPassword} inputRef={confirmPasswordRef} label="Ulangi kata sandi baru" maxLength={128} name="confirmPassword" onChange={(event) => { setConfirmPassword(event.target.value); clearPasswordError('confirmPassword'); setPasswordMessage(''); }} required trailing={<PasswordVisibilityButton onToggle={() => setShowConfirmPassword((value) => !value)} visible={showConfirmPassword} />} type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} />
              {passwordMessage && <p className={`m-0 flex items-start gap-2 text-base font-bold ${changePassword.isError ? 'text-danger' : 'text-success'}`} role={changePassword.isError ? 'alert' : 'status'}>{!changePassword.isError && <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" />}{passwordMessage}</p>}
              <Button disabled={changePassword.isPending} type="submit">{changePassword.isPending ? 'Mengubah…' : 'Ubah kata sandi'}</Button>
            </form>
          </section>
        </div>
      </main>
      {avatarMenuOpen && (
        <div aria-labelledby="avatar-menu-title" aria-modal="true" className="fixed inset-0 z-[90] grid place-items-center bg-ink/65 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setAvatarMenuOpen(false); }} role="dialog">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 text-ink shadow-[0_8px_0_rgba(23,23,17,0.28)] sm:p-8">
            <div className="flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-soft"><Camera aria-hidden className="size-7" /></span>
              <div><h2 className="m-0 text-2xl font-black" id="avatar-menu-title">Ubah foto profil</h2><p className="mt-1 mb-0 text-muted">Pilih tindakan untuk foto akun.</p></div>
            </div>
            <div className="mt-7 grid gap-3">
              <Button className="w-full" onClick={() => { setAvatarMenuOpen(false); imageRef.current?.click(); }}><Camera aria-hidden className="size-5" />Pilih foto baru</Button>
              {image && <Button className="w-full" disabled={updateProfile.isPending} onClick={async () => { setProfileErrors({}); setProfileMessage(''); try { await updateProfile.mutateAsync({ name: name.trim(), image: null, institutionName: institutionName.trim() }); setImage(''); setAvatarMenuOpen(false); setProfileMessage('Foto profil berhasil dihapus.'); } catch (error) { setProfileMessage(messageOf(error)); } }} variant="danger"><ImageOff aria-hidden className="size-5" />{updateProfile.isPending ? 'Menghapus…' : 'Hapus foto'}</Button>}
              <Button className="w-full" onClick={() => setAvatarMenuOpen(false)} variant="quiet">Batal</Button>
            </div>
          </div>
        </div>
      )}
      {cropFile && (
        <AvatarCropDialog
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onComplete={(nextImage) => {
            setImage(nextImage);
            setCropFile(null);
            clearProfileError('image');
            setProfileMessage('');
          }}
        />
      )}
    </div>
  );
}

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { messageOf } from '@/config/api-client.ts';
import { ROUTES } from '@/constants/routes.ts';
import { useSessionQuery, useSignOutMutation } from '@/hooks/auth';
import { cn } from '@/lib/utils.ts';
import { Brand } from '@/components/brand';
import { AccountMenu } from '@/components/account-menu';
import { PublicSmoothScroll } from '@/components/PublicSmoothScroll';
import { buttonClassName } from '@/components/ui/button';

const NAVIGATION = [
  { label: 'Home', to: ROUTES.landing },
  { label: 'Misi', to: ROUTES.mission },
  { label: 'FAQ', to: ROUTES.faq },
  { label: 'Kontak', to: ROUTES.contact },
] as const;

interface MarketingHeaderProps {
  accountEmail?: string;
  accountImage?: string | null;
  accountName?: string;
  institutionName?: string;
  isSignedIn?: boolean;
  isSigningOut?: boolean;
  onSignOut?: () => void;
}

export function MarketingHeader({
  accountEmail = '',
  accountImage = null,
  accountName = '',
  institutionName = '',
  isSignedIn = false,
  isSigningOut = false,
  onSignOut,
}: MarketingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnOutsideClick);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className="relative z-20 border-b-2 border-divider bg-white shadow-[0_3px_0_#b7c8d8]"
      ref={headerRef}
    >
      <div className="mx-auto flex min-h-18 w-full max-w-[72rem] items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <div className="min-w-0">
          <Brand compact />
        </div>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-3 md:flex">
          {NAVIGATION.map(({ label, to }) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  'inline-flex min-h-12 items-center border-b-[3px] px-3 text-base font-bold no-underline transition-colors duration-150',
                  isActive
                    ? 'border-brand text-ink'
                    : 'border-transparent text-muted hover:border-brand hover:text-ink',
                )
              }
              end={to === ROUTES.landing}
              key={to}
              to={to}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <AccountMenu
              email={accountEmail}
              image={accountImage}
              institutionName={institutionName}
              isSigningOut={isSigningOut}
              onSignOut={() => onSignOut?.()}
              userName={accountName}
            />
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link className={buttonClassName('quiet')} to={ROUTES.login}>
                Masuk
              </Link>
              <Link className={buttonClassName('primary')} to={ROUTES.register}>
                Daftar
              </Link>
            </div>
          )}

          <button
            aria-controls={menuId}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            className="grid size-12 place-items-center rounded-sm border-2 border-divider text-ink transition-colors hover:bg-brand-soft focus-visible:outline-4 md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            ref={menuButtonRef}
            type="button"
          >
            {menuOpen ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
          </button>
        </div>
      </div>

      <nav
        aria-label="Menu navigasi mobile"
        className={cn(
          'absolute inset-x-0 top-full border-t-2 border-divider bg-white px-5 py-3 shadow-[0_8px_16px_rgb(23_23_17_/_16%)] md:hidden',
          menuOpen ? 'block' : 'hidden',
        )}
        id={menuId}
      >
        <div className="grid gap-1">
          {NAVIGATION.map(({ label, to }) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  'inline-flex min-h-12 items-center rounded-sm px-4 text-lg font-bold no-underline',
                  isActive ? 'bg-brand-soft text-ink' : 'text-muted hover:bg-brand-soft hover:text-ink',
                )
              }
              end={to === ROUTES.landing}
              key={to}
              onClick={closeMenu}
              to={to}
            >
              {label}
            </NavLink>
          ))}
          {!isSignedIn && (
            <div className="mt-2 grid gap-2 border-t-2 border-divider pt-3">
              <Link className={buttonClassName('secondary', 'w-full')} onClick={closeMenu} to={ROUTES.login}>
                Masuk
              </Link>
              <Link className={buttonClassName('primary', 'w-full')} onClick={closeMenu} to={ROUTES.register}>
                Daftar
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mt-auto bg-ink px-5 py-10 text-white sm:px-8">
      <div className="mx-auto grid w-full max-w-[72rem] gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Brand compact transparentMark />
          <p className="mt-4 mb-0 max-w-md text-base leading-7 text-white/80">
            Latihan motorik dan kognitif yang didampingi, jelas, dan mudah diikuti.
          </p>
        </div>
        <div>
          <nav aria-label="Navigasi footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {NAVIGATION.map(({ label, to }) => (
              <Link
                className="inline-flex min-h-12 items-center text-base font-bold text-white underline-offset-4 hover:text-brand hover:underline"
                key={to}
                to={to}
              >
                {label}
              </Link>
            ))}
          </nav>
          <p className="mt-3 mb-0 text-base font-semibold text-white/70 sm:text-right">© 2026 Arka</p>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({ children }: { children: ReactNode }) {
  const session = useSessionQuery();
  const signOut = useSignOutMutation();
  const user = session.data;

  return (
    <PublicSmoothScroll>
      <div className="flex min-h-dvh flex-col bg-white text-ink">
        <a className="skip-link" href="#konten-utama">
          Lewati ke konten utama
        </a>
        <MarketingHeader
          accountEmail={user?.user.email ?? ''}
          accountImage={user?.user.image ?? null}
          accountName={user?.user.name ?? ''}
          institutionName={user?.institution.name ?? ''}
          isSignedIn={Boolean(user)}
          isSigningOut={signOut.isPending}
          onSignOut={() => {
            if (user) signOut.mutate(user);
          }}
        />
        {signOut.isError && (
          <p className="mx-auto w-full max-w-[72rem] px-5 pt-3 text-base font-bold leading-6 text-danger sm:px-8" role="alert">
            {messageOf(signOut.error)}
          </p>
        )}
        <main className="flex-1 outline-none" id="konten-utama" tabIndex={-1}>
          {children}
        </main>
        <MarketingFooter />
      </div>
    </PublicSmoothScroll>
  );
}

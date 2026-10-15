import type { MeDto } from '@/schemas';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { cn } from '@/lib';
import { Brand } from '@/components/brand';
import { AccountMenu } from '@/components/account-menu';

const NAVIGATION = [
  { label: 'Home', to: ROUTES.dashboard },
  { label: 'Progress Board', to: ROUTES.progressBoard },
  { label: 'Leaderboard', to: ROUTES.rankings },
] as const;

interface AccountHeaderProps {
  user: MeDto | undefined;
  isSigningOut: boolean;
  onSignOut: () => void;
}

export function AccountHeader({ user, isSigningOut, onSignOut }: AccountHeaderProps) {
  return (
    <header className="border-b-2 border-divider bg-white">
      <div className="mx-auto grid min-h-20 w-full max-w-[78rem] grid-cols-[1fr_auto] items-center gap-x-4 px-4 py-3 sm:px-6 md:grid-cols-[auto_1fr_auto] lg:px-8">
        <Brand compact transparentMark />
        <nav aria-label="Navigasi utama" className="order-3 col-span-2 mt-2 flex items-center justify-center gap-1 overflow-x-auto border-t-2 border-divider pt-2 md:order-none md:col-span-1 md:mt-0 md:gap-3 md:border-t-0 md:pt-0">
          {NAVIGATION.map(({ label, to }) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  'inline-flex min-h-11 shrink-0 items-center border-b-[3px] px-2 text-sm font-bold no-underline transition-colors sm:px-3 sm:text-base',
                  isActive ? 'border-brand text-ink' : 'border-transparent text-muted hover:border-brand hover:text-ink',
                )
              }
              end={to === ROUTES.dashboard}
              key={to}
              to={to}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        {user ? (
          <AccountMenu
            email={user.user.email}
            image={user.user.image}
            institutionName={user.institution.name}
            isSigningOut={isSigningOut}
            onSignOut={onSignOut}
            userName={user.user.name}
          />
        ) : (
          <span aria-hidden className="block size-12" />
        )}
      </div>
    </header>
  );
}

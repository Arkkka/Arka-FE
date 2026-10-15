import { LandingContent } from '@/components/index.ts';
import { messageOf } from '@/config/api-client.ts';
import { useSessionQuery, useSignOutMutation } from '@/hooks/auth';

export function LandingPage() {
  const session = useSessionQuery();
  const signOut = useSignOutMutation();
  const me = session.data;

  return (
    <LandingContent
      accountEmail={me?.user.email ?? ''}
      accountImage={me?.user.image ?? null}
      accountName={me?.user.name ?? ''}
      institutionName={me?.institution.name ?? ''}
      isSignedIn={Boolean(me)}
      isSigningOut={signOut.isPending}
      onSignOut={() => {
        if (me) signOut.mutate(me);
      }}
      signOutError={signOut.isError ? messageOf(signOut.error) : ''}
    />
  );
}

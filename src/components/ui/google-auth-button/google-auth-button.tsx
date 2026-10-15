import { Button } from '@/components/ui/button';
import { GoogleIcon } from '@/components/ui/google-icon';

interface GoogleAuthButtonProps {
  disabled: boolean;
  label: string;
  loadingLabel: string;
  loading: boolean;
  onClick: () => void;
}

export function GoogleAuthButton({
  disabled,
  label,
  loading,
  loadingLabel,
  onClick,
}: GoogleAuthButtonProps) {
  return (
    <Button
      aria-disabled={disabled}
      className="w-full"
      disabled={disabled}
      onClick={onClick}
      variant="secondary"
    >
      <GoogleIcon />
      {loading ? loadingLabel : label}
    </Button>
  );
}

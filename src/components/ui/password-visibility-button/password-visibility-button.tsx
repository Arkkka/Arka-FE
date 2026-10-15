import { Eye, EyeOff } from 'lucide-react';

interface PasswordVisibilityButtonProps {
  visible: boolean;
  onToggle: () => void;
}

export function PasswordVisibilityButton({ visible, onToggle }: PasswordVisibilityButtonProps) {
  return (
    <button
      aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
      aria-pressed={visible}
      className="grid size-12 place-items-center rounded-sm text-muted transition-colors hover:bg-brand-soft hover:text-ink"
      onClick={onToggle}
      type="button"
    >
      {visible ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
    </button>
  );
}

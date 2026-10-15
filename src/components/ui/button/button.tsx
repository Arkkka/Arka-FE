import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'dark' | 'light';

const variants: Record<ButtonVariant, string> = {
  primary:
    'border-action bg-action text-white shadow-[0_4px_0_#203b61] hover:bg-action-hover active:shadow-none',
  secondary:
    'border-divider bg-surface text-ink shadow-[0_4px_0_#b7c8d8] hover:border-brand active:shadow-none',
  quiet: 'border-transparent bg-transparent text-ink hover:bg-divider',
  danger:
    'border-danger bg-danger text-white shadow-[0_4px_0_#741813] hover:brightness-95 active:shadow-none',
  dark: 'border-ink bg-ink text-white shadow-[0_4px_0_#15253a] hover:bg-ink-soft active:shadow-none',
  light:
    'border-white bg-white text-ink shadow-[0_4px_0_#b7c8d8] hover:border-ink active:shadow-none',
};

export function buttonClassName(variant: ButtonVariant = 'primary', className?: string) {
  return cn(
    'inline-flex min-h-13 items-center justify-center gap-2 rounded-sm border-2 px-5 text-base font-black no-underline transition disabled:cursor-not-allowed disabled:opacity-55',
    variants[variant],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ className, type = 'button', variant = 'primary', ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} type={type} {...props} />;
}

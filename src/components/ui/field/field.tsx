import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/lib";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  error?: string | undefined;
  hint?: string | undefined;
  inputRef?: Ref<HTMLInputElement>;
  label: string;
  trailing?: ReactNode;
}

export function Field({
  className,
  error,
  hint,
  inputRef,
  label,
  trailing,
  ...props
}: FieldProps) {
  const id = useId();
  const descriptionId = error || hint ? `${id}-description` : undefined;

  return (
    <div className="grid gap-2">
      <label className="text-base font-bold text-ink" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          aria-describedby={descriptionId}
          aria-invalid={Boolean(error)}
          className={cn(
            "min-h-13 w-full rounded-sm border-2 border-border bg-surface px-4 text-base text-ink shadow-[0_3px_0_#b7c8d8] outline-none transition placeholder:text-muted hover:border-muted focus:border-brand-ink focus:ring-4 focus:ring-brand-soft",
            trailing && "pr-12",
            error && "border-danger",
            className,
          )}
          id={id}
          ref={inputRef}
          {...props}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-1 flex items-center">
            {trailing}
          </div>
        )}
      </div>
      {(error || hint) && (
        <p
          className={cn(
            "m-0 text-base leading-6 text-muted",
            error && "font-semibold text-danger",
          )}
          id={descriptionId}
          role={error ? "alert" : undefined}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

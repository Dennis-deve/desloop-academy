import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowRight,
  CircleHelp,
  Inbox,
  LoaderCircle,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motionRipple } from '@/components/motion/ripple';
import { motionSpotlight } from '@/components/motion/spotlight';

export type ButtonVariant = 'primary' | 'navy' | 'outline' | 'ghost' | 'white' | 'danger' | 'soft';
export function buttonStyles(
  variant: ButtonVariant = 'primary',
  size: 'sm' | 'md' | 'lg' = 'md',
  className?: string,
) {
  return cn(
    'motion-pressable inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
    {
      'bg-brand-600 text-white hover:bg-brand-700': variant === 'primary',
      'bg-ink-900 text-white hover:bg-ink-800': variant === 'navy',
      'border border-line bg-panel text-heading hover:bg-raised': variant === 'outline',
      'text-heading hover:bg-raised': variant === 'ghost',
      'bg-white text-ink-900 hover:bg-surface-100': variant === 'white',
      'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
      'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/20 dark:text-brand-100':
        variant === 'soft',
      'px-3.5 py-2 text-xs min-h-[36px]': size === 'sm',
      'px-4 py-2.5 text-sm min-h-[44px]': size === 'md',
      'px-6 py-3.5 text-sm min-h-[50px]': size === 'lg',
    },
    className,
  );
}
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, disabled, children, onPointerDown, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={buttonStyles(variant, size, className)}
      disabled={disabled || loading}
      onPointerDown={(event) => { onPointerDown?.(event); if (!event.defaultPrevented) motionRipple(event); }}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mx-auto w-full max-w-page px-5 sm:px-7 lg:px-10', className)} {...props} />
  );
}
export function Card({ className, onPointerMove, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('card-surface motion-spotlight', className)}
      onPointerMove={(event) => { onPointerMove?.(event); if (!event.defaultPrevented) motionSpotlight(event); }}
      {...props}
    />
  );
}
export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'purple';
  className?: string;
}) {
  const styles = {
    neutral: 'bg-raised text-body',
    blue: 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100',
    green: 'bg-mint-50 text-mint-700 dark:bg-mint-500/20 dark:text-mint-100',
    amber: 'bg-amber-50 text-[#80500c] dark:bg-amber-500/20 dark:text-amber-100',
    red: 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-200',
    purple: 'bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
  };
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold leading-5',
        styles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'text-[11px] font-extrabold uppercase tracking-[.18em] text-brand-600 dark:text-brand-200',
        className,
      )}
    >
      {children}
    </span>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-2 font-display text-3xl leading-tight text-heading sm:text-[38px]">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-sm leading-7 text-body sm:text-base">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-1 font-display text-[32px] leading-tight text-heading sm:text-[38px]">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-7 text-body">{description}</p>}
        {children}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}
export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className={className}>
      {label && (
        <div className="mb-2 flex justify-between text-xs font-semibold text-body">
          <span>{label}</span>
          <span>{safe}%</span>
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div className="progress-fill" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}
export function Field({
  label,
  id,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-xs font-extrabold text-heading">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-subdued">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn('field', className)} {...props} />;
  },
);
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subdued"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="field pl-10"
      />
    </div>
  );
}
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('card-surface flex flex-col items-center px-6 py-12 text-center', className)}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-raised p-3 text-brand-600">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-extrabold text-heading">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-body">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function InfoBox({
  title,
  children,
  tone = 'blue',
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title?: string;
  children: ReactNode;
  tone?: 'blue' | 'amber' | 'green';
}) {
  const styles = {
    blue: 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-100',
    amber:
      'border-amber-100 bg-amber-50 text-[#80500c] dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100',
    green:
      'border-mint-100 bg-mint-50 text-mint-700 dark:border-mint-500/40 dark:bg-mint-500/10 dark:text-mint-100',
  };
  return (
    <div
      className={cn('rounded-2xl border px-4 py-3 text-sm leading-6', styles[tone], className)}
      {...props}
    >
      {title && <strong className="mb-1 block font-extrabold">{title}</strong>}
      {children}
    </div>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const value = status.replace(/_/g, ' ');
  const tone = /complete|approved|confirmed|published|active|resolved/i.test(status)
    ? 'green'
    : /pending|review|draft|generating|invited/i.test(status)
      ? 'amber'
      : /reject|fail|reported|suspend/i.test(status)
        ? 'red'
        : 'blue';
  return (
    <Badge tone={tone} className="capitalize">
      {value}
    </Badge>
  );
}
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('shimmer rounded-xl', className)} />;
}
export function LoadingCards() {
  return (
    <div role="status" aria-label="Loading content" className="grid gap-5 md:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <Card key={item} className="overflow-hidden p-4">
          <Skeleton className="h-36" />
          <Skeleton className="mt-5 h-5 w-3/4" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </Card>
      ))}
    </div>
  );
}
export function ErrorState({
  onRetry,
  message = 'We could not load this right now.',
}: {
  onRetry: () => void;
  message?: string;
}) {
  return (
    <EmptyState
      icon={CircleHelp}
      title="Something did not load"
      description={message}
      action={
        <Button onClick={onRetry} variant="outline">
          Try again
        </Button>
      }
    />
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink-950/60 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-line bg-panel p-6 text-heading shadow-float sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-display text-2xl leading-tight">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-2 text-sm leading-6 text-body">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-subdued hover:bg-raised hover:text-heading"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          {children && <div className="mt-5">{children}</div>}
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
export function InlineLink({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 font-extrabold text-brand-600 dark:text-brand-200">
      {children}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
}

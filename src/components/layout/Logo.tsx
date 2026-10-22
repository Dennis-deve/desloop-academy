import { Link } from 'react-router-dom';
import { site } from '@/config/site';
import { cn } from '@/lib/utils';

/** The mark is a crop of the user-supplied Desloop identity, not a synthetic SVG. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={site.logoPath}
      alt=""
      aria-hidden="true"
      width={40}
      height={40}
      className={cn('h-10 w-10 shrink-0 rounded-xl bg-ink-950 object-cover', className)}
    />
  );
}

export function Logo({
  to = '/',
  light = false,
  compact = false,
  className,
}: {
  to?: string;
  light?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      aria-label={`${site.name} home`}
      className={cn('inline-flex shrink-0 items-center gap-2.5', className)}
    >
      <LogoMark className={compact ? 'h-9 w-9' : 'h-10 w-10'} />
      <span
        className={cn(
          'font-sans text-[17px] font-extrabold leading-[1.1] tracking-[-.06em]',
          light ? 'text-white' : 'text-heading',
        )}
      >
        <span className="block">{site.shortName}</span>
        <span className="block text-[10px] font-bold uppercase tracking-[.26em] opacity-65">
          Academy
        </span>
      </span>
    </Link>
  );
}

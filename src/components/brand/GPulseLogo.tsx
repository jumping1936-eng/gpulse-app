import type { ComponentPropsWithoutRef } from 'react';

type GPulseLogoProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'mark';
};

const sizeClasses = {
  sm: { mark: 'h-8 w-8 rounded-xl', wordmark: 'text-xl' },
  md: { mark: 'h-11 w-11 rounded-2xl', wordmark: 'text-3xl' },
  lg: { mark: 'h-16 w-16 rounded-[22px]', wordmark: 'text-4xl' },
};

/** Human-approved GPulse brand reconstruction; no historical asset is claimed. */
export default function GPulseLogo({ size = 'md', variant = 'full', className = '', ...props }: GPulseLogoProps) {
  const classes = sizeClasses[size];

  return (
    <div className={`inline-flex items-center gap-3 ${className}`.trim()} role="img" aria-label="GPulse" {...props}>
      <span className={`flex ${classes.mark} shrink-0 items-center justify-center bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 shadow-[0_0_28px_rgba(129,92,246,0.28)] ring-1 ring-white/15`} aria-hidden="true">
        <svg viewBox="0 0 32 32" className="h-[58%] w-[58%]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.5 16h5l3.2-7.2L16 23l3.3-7h9.2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.7" />
        </svg>
      </span>
      {variant === 'full' && (
        <span aria-hidden="true" className={`${classes.wordmark} bg-gradient-to-r from-violet-300 via-indigo-300 to-blue-300 bg-clip-text font-semibold tracking-[-0.045em] text-transparent drop-shadow-[0_0_18px_rgba(129,92,246,0.22)]`}>
          GPulse
        </span>
      )}
    </div>
  );
}

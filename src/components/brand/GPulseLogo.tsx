import type { ComponentPropsWithoutRef } from 'react';

type GPulseLogoProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'wordmark' | 'mark';
  glow?: 'none' | 'soft' | 'strong';
};

const sizeClasses = {
  sm: { mark: 'h-8 w-8 rounded-xl', wordmark: 'text-xl' },
  md: { mark: 'h-11 w-11 rounded-2xl', wordmark: 'text-3xl' },
  lg: { mark: 'h-16 w-16 rounded-[22px]', wordmark: 'text-4xl' },
};

/** Human-approved GPulse brand reconstruction; no historical asset is claimed. */
export default function GPulseLogo({ size = 'md', variant = 'full', glow = 'soft', className = '', ...props }: GPulseLogoProps) {
  const classes = sizeClasses[size];
  const glowClass = glow === 'strong'
    ? 'shadow-[0_0_30px_rgba(108,92,255,0.52)]'
    : glow === 'soft'
      ? 'shadow-[0_0_20px_rgba(86,104,255,0.28)]'
      : '';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`.trim()} role="img" aria-label="GPulse" {...props}>
      {variant !== 'wordmark' && (
        <span className={`flex ${classes.mark} ${glowClass} shrink-0 items-center justify-center overflow-hidden bg-[#080d2a] ring-1 ring-white/15`} aria-hidden="true">
          <svg viewBox="0 0 40 40" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gpulse-border" x1="4" y1="5" x2="35" y2="35" gradientUnits="userSpaceOnUse">
                <stop stopColor="#e879f9" /><stop offset=".43" stopColor="#6366f1" /><stop offset="1" stopColor="#38bdf8" />
              </linearGradient>
              <linearGradient id="gpulse-ribbon" x1="5" y1="13" x2="35" y2="27" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f0abfc" /><stop offset=".4" stopColor="#8b5cf6" /><stop offset=".72" stopColor="#3b82f6" /><stop offset="1" stopColor="#67e8f9" />
              </linearGradient>
            </defs>
            <rect x="2.25" y="2.25" width="35.5" height="35.5" rx="10.25" fill="#080d2a" stroke="url(#gpulse-border)" strokeWidth="1.5" />
            <path d="M5.5 23.2C9.7 23.2 10.9 13.2 15.1 13.2C19.2 13.2 20.4 25.7 24.6 25.7C28.7 25.7 29.7 17.8 34.5 17.8" stroke="url(#gpulse-ribbon)" strokeLinecap="round" strokeWidth="3.4" />
            <path d="M5.5 27.2C9.5 27.2 11.2 18.1 15.1 18.1C19 18.1 20.6 29.4 24.6 29.4C28.6 29.4 30.1 22.5 34.5 22.5" stroke="url(#gpulse-ribbon)" strokeLinecap="round" strokeOpacity=".45" strokeWidth="1.35" />
          </svg>
        </span>
      )}
      {variant !== 'mark' && (
        <span aria-hidden="true" className={`${classes.wordmark} bg-gradient-to-r from-fuchsia-300 via-indigo-300 to-cyan-300 bg-clip-text font-semibold tracking-[-0.05em] text-transparent ${glow === 'none' ? '' : 'drop-shadow-[0_0_16px_rgba(103,110,255,0.22)]'}`}>
          GPulse
        </span>
      )}
    </div>
  );
}

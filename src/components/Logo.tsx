interface Props {
  /** Kept for API compatibility; both render the mark + wordmark. */
  variant?: 'plaque' | 'emboss'
  size?: 'sm' | 'md' | 'lg'
}

const MARK = { sm: 34, md: 42, lg: 66 }
const WORD = { sm: '1.15rem', md: '1.4rem', lg: '2.1rem' }

/**
 * Logo is NEVER plain text: the real TripTales app mark (a coral rounded square
 * holding a cream open book crossed by a dark route line) next to the
 * "TripTales" wordmark in Assistant 800.
 *
 * The geometry below is the SAME artwork as `public/icon.svg`, kept in its
 * native 1024 viewBox and scaled down to the mark size — so the logo and the
 * installed app icon can never drift apart. `public/icon.svg` is the source of
 * truth; if it changes, mirror the paths here.
 */
export function BrandMark({ size = 42 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      aria-hidden
      style={{
        display: 'block',
        borderRadius: '22.65%',
        boxShadow: '0 9px 20px rgba(255, 107, 102, .25)',
      }}
    >
      <rect width="1024" height="1024" rx="232" fill="#e0716a" />
      <g fill="none" stroke="#fdf8f0" strokeWidth="30" strokeLinejoin="round" strokeLinecap="round">
        {/* left page */}
        <path d="M168 312 C300 232 442 252 506 296 L506 704 C442 662 300 646 168 722 Z" />
        {/* right page */}
        <path d="M856 312 C724 232 582 252 518 296 L518 704 C582 662 724 646 856 722 Z" />
      </g>
      {/* route line */}
      <path
        d="M256 636 C300 588 328 664 402 630 C476 596 512 616 592 560 C660 512 700 496 744 452"
        fill="none"
        stroke="#20243a"
        strokeWidth="36"
        strokeLinecap="round"
      />
      <circle cx="256" cy="636" r="32" fill="#20243a" />
      <circle cx="756" cy="442" r="36" fill="#fdf8f0" />
    </svg>
  )
}

export function Logo({ size = 'md' }: Props) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark size={MARK[size]} />
      <span className="wordmark" style={{ fontSize: WORD[size] }}>
        TripTales
      </span>
    </span>
  )
}

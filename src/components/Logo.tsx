interface Props {
  /** Kept for API compatibility; both render the mark + wordmark. */
  variant?: 'plaque' | 'emboss'
  size?: 'sm' | 'md' | 'lg'
}

const MARK = { sm: 34, md: 42, lg: 66 }
const WORD = { sm: '1.15rem', md: '1.4rem', lg: '2.1rem' }

/**
 * Logo is NEVER plain text: the real TripTales app mark (a coral rounded square
 * holding a cream open book, crossed by a dashed route that rises, dips and
 * lands on a waypoint pin) next to the "TripTales" wordmark in Assistant 800.
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
      {/* the route: rises, dips, then climbs to the pin — broken at the spine
          so it never touches the book's outlines */}
      <g
        fill="none"
        stroke="#20243a"
        strokeWidth="20"
        strokeLinecap="round"
        strokeDasharray="40 34"
      >
        <path d="M288 580 C330 562 368 448 412 448 C428 448 445 464 463 485" />
        <path d="M539 572 C546 577 553 580 560 580 C606 580 690 508 730 466" />
      </g>
      {/* start point */}
      <circle cx="288" cy="580" r="18" fill="#20243a" />
      {/* waypoint pin */}
      <path
        d="M730 466 c -29 -41 -52 -64 -52 -93 a 52 52 0 1 1 104 0 c 0 29 -23 52 -52 93 z"
        fill="#20243a"
      />
      <circle cx="730" cy="373" r="20" fill="#e0716a" />
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

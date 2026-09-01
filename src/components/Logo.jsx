import { BRAND } from '../config/brand';

export default function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="9" width="18" height="18" rx="5" fill="#0B1220" />
      <rect x="11" y="5" width="18" height="18" rx="5" fill={BRAND.color} />
    </svg>
  );
}

export function Wordmark({ tagline }) {
  return (
    <div className="wordmark">
      <span className="wordmark-text">{BRAND.name}</span>
      {tagline && <span className="wordmark-tagline">{tagline}</span>}
    </div>
  );
}

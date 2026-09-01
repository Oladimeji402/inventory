import { BRAND } from '../../config/brand';
import './BrandMark.css';

const MARK_PATH =
  'M17 8C17 5.79 14.76 4 12 4S7 5.79 7 8c0 1.86 1.28 3.46 3.14 4.07L13 13c1.29.46 2 1.38 2 2.5C15 17.43 13.65 19 12 19s-3-1.57-3-3.5';

export default function BrandMark({ href, showTagline = true, onClick }) {
  const inner = (
    <>
      <div className="lp-brand-mark">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d={MARK_PATH} stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
      <span className="lp-brand-name">{BRAND.name}</span>
      {showTagline && <span className="lp-brand-tag">{BRAND.tagline}</span>}
    </>
  );

  if (href) {
    return (
      <a className="lp-brand" href={href} onClick={onClick}>
        {inner}
      </a>
    );
  }

  return <div className="lp-brand">{inner}</div>;
}

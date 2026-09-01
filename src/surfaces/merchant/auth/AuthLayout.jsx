import BrandMark from '../../../shared/components/BrandMark';
import { appLinks } from '../../../config/surfaces';
import './Auth.css';

export default function AuthLayout({
  title,
  lead,
  visualTitle,
  visualCaption,
  imageSrc = '/images/auth/grocery.jpg',
  children
}) {
  return (
    <div className="auth-page">
      <header className="auth-topbar">
        <BrandMark href={appLinks.marketing()} showTagline={false} />
      </header>

      <div className="auth-shell">
        <div className="auth-split">
          <aside className="auth-visual">
            <div className="auth-visual-circle">
              <img src={imageSrc} alt="" />
            </div>
            <h2 className="auth-visual-title">{visualTitle}</h2>
            {visualCaption && <p className="auth-visual-caption">{visualCaption}</p>}
          </aside>

          <main className="auth-form-pane">
            <h1 className="auth-form-title">{title}</h1>
            {lead && <p className="auth-form-lead">{lead}</p>}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

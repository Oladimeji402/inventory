import { useLayoutEffect, useState } from 'react';
import LoadingScreen from '../../components/LoadingScreen';
import MerchantApp from '../../components/merchant/MerchantApp';
import { useMerchantAuth } from '../../hooks/useMerchantAuth';
import { appLinks } from '../../config/surfaces';
import { readIntendedSlug } from '../../lib/intendedSlug';
import { slugifyStoreName } from '../../lib/merchantConstants';
import ForgotPasswordPage from './auth/ForgotPasswordPage';
import LoginPage from './auth/LoginPage';
import OnboardingPage from './auth/OnboardingPage';
import SignupPage from './auth/SignupPage';

function currentPath() {
  if (typeof window === 'undefined') return '/login';
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

function authPage(path) {
  if (path === '/signup') return 'signup';
  if (path === '/forgot') return 'forgot';
  return 'login';
}

function replacePath(path) {
  if (typeof window === 'undefined') return;
  const next = path.startsWith('/') ? path : `/${path}`;
  if (window.location.pathname === next) return;
  window.history.replaceState({}, '', `${next}${window.location.search}`);
}

function slugFromQuery() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('slug') || '';
}

export default function MerchantRoot() {
  const auth = useMerchantAuth();
  const [path, setPath] = useState(currentPath);

  useLayoutEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useLayoutEffect(() => {
    if (auth.loading || (auth.session && !auth.membershipReady)) return;

    if (!auth.session) {
      if (path === '/dashboard' || path === '/onboarding' || path === '/') {
        replacePath('/login');
        setPath('/login');
      }
      return;
    }

    if (auth.needsOnboarding) {
      if (path !== '/onboarding') {
        replacePath('/onboarding');
        setPath('/onboarding');
      }
      return;
    }

    if (path !== '/dashboard') {
      replacePath('/dashboard');
      setPath('/dashboard');
    }
  }, [auth.loading, auth.session, auth.needsOnboarding, path]);

  if (auth.loading || (auth.session && !auth.membershipReady)) return <LoadingScreen />;

  const configError = auth.configured
    ? ''
    : 'Add VITE_SUPABASE_ANON_KEY to .env, then restart the dev server.';

  if (!auth.session) {
    const page = authPage(path);
    const intendedSlug = slugifyStoreName(slugFromQuery() || readIntendedSlug());
    if (page === 'signup') {
      return (
        <SignupPage
          onSubmit={auth.signUp}
          initialError={configError}
          intendedSlug={intendedSlug}
        />
      );
    }
    if (page === 'forgot') {
      return <ForgotPasswordPage onSubmit={auth.requestPasswordReset} />;
    }
    return <LoginPage onSubmit={auth.signIn} initialError={configError} />;
  }

  if (auth.needsOnboarding) {
    return (
      <OnboardingPage
        initialSlug={slugifyStoreName(
          slugFromQuery()
          || auth.user?.user_metadata?.intended_slug
          || readIntendedSlug()
        )}
        ownerName={auth.profile?.full_name || auth.user?.email}
        ownerMetadata={auth.user?.user_metadata}
        onCheckSlug={auth.checkSlug}
        onComplete={auth.completeOnboarding}
      />
    );
  }

  return (
    <MerchantApp
      tenant={auth.tenant}
      profile={auth.profile}
      membershipRole={auth.membershipRole}
      onRefreshTenant={auth.refreshTenant}
      onSignOut={auth.signOut}
      onOpenStorefront={() => {
        window.location.href = appLinks.shop();
      }}
      onExitToLanding={() => {
        window.location.href = appLinks.marketing();
      }}
    />
  );
}

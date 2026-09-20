import { useLayoutEffect, useState } from 'react';
import LoadingScreen from '../../components/LoadingScreen';
import RiderApp from '../../components/rider/RiderApp';
import { useRiderAuth } from '../../hooks/useRiderAuth';
import { appLinks, riderFullPath, riderLocalPath } from '../../config/surfaces';
import ForgotPasswordPage from './auth/ForgotPasswordPage';
import LoginPage from './auth/LoginPage';
import OnboardingPage from './auth/OnboardingPage';
import SignupPage from './auth/SignupPage';

function currentLocalPath() {
  if (typeof window === 'undefined') return '/login';
  return riderLocalPath(window.location.pathname);
}

function authPage(path) {
  if (path === '/signup') return 'signup';
  if (path === '/forgot') return 'forgot';
  return 'login';
}

function replaceLocalPath(localPath) {
  if (typeof window === 'undefined') return;
  const next = riderFullPath(localPath);
  if (window.location.pathname === next) return;
  window.history.replaceState({}, '', `${next}${window.location.search}`);
}

export default function RiderRoot() {
  const auth = useRiderAuth();
  const [path, setPath] = useState(currentLocalPath);

  useLayoutEffect(() => {
    const onPop = () => setPath(currentLocalPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useLayoutEffect(() => {
    if (auth.loading || (auth.session && !auth.riderReady)) return;

    if (!auth.session) {
      if (path === '/dashboard' || path === '/onboarding' || path === '/') {
        replaceLocalPath('/login');
        setPath('/login');
      }
      return;
    }

    if (auth.needsOnboarding) {
      if (path !== '/onboarding') {
        replaceLocalPath('/onboarding');
        setPath('/onboarding');
      }
      return;
    }

    if (path !== '/dashboard') {
      replaceLocalPath('/dashboard');
      setPath('/dashboard');
    }
  }, [auth.loading, auth.session, auth.needsOnboarding, path]);

  if (auth.loading || (auth.session && !auth.riderReady)) return <LoadingScreen />;

  const configError = auth.configured
    ? ''
    : 'Add VITE_SUPABASE_ANON_KEY to .env, then restart the dev server.';

  if (!auth.session) {
    const page = authPage(path);
    if (page === 'signup') {
      return <SignupPage onSubmit={auth.signUp} initialError={configError} />;
    }
    if (page === 'forgot') {
      return <ForgotPasswordPage onSubmit={auth.requestPasswordReset} />;
    }
    return <LoginPage onSubmit={auth.signIn} initialError={configError} />;
  }

  if (auth.needsOnboarding) {
    return (
      <OnboardingPage
        riderName={auth.profile?.full_name || auth.user?.email}
        onComplete={auth.completeOnboarding}
      />
    );
  }

  return (
    <RiderApp
      onExitToLanding={async () => {
        await auth.signOut();
        window.location.href = appLinks.riderLogin();
      }}
    />
  );
}

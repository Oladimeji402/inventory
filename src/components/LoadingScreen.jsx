import Logo from './Logo';

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <Logo size={40} />
      <p>Loading Counterpoint…</p>
    </div>
  );
}

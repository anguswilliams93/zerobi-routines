import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="login-page">
      <form action={login} className="login-card">
        <span className="login-brand" role="img" aria-label="Zerobi" />
        <div className="login-eyebrow">Dashboard</div>
        <h1 className="login-title">Sign in</h1>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          required
          autoFocus
          className="login-input"
        />
        <input type="hidden" name="next" value={next ?? "/"} />
        <button type="submit" className="login-btn">Enter</button>
        {error && <p className="login-err">Wrong password</p>}
      </form>
    </main>
  );
}

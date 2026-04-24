'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('mg_token');
    if (token) router.push('/dashboard');
  }, [router]);

  async function handleLogin() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || `Erro de autenticação (${res.status})`);
      }

      const data = (await res.json()) as { token: string };
      localStorage.setItem('mg_token', data.token);
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha de autenticação');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && login && password && !loading) handleLogin();
  }

  if (!mounted) return null;

  return (
    <main className="login-container">
      {/* Left panel — brand / copy */}
      <div className="login-left">
        <div className="login-logo">
          <div className="login-logo-dot" />
          MonitorGate
        </div>

        <div>
          <h1 className="login-tagline">
            Entenda como você usa<br />
            <em>o seu tempo.</em>
          </h1>
          <p className="login-left-desc">
            Monitoramento contínuo de aplicativos e sites, com análise por dia,
            mês e visão geral. Simples, preciso e sem distrações.
          </p>
        </div>

        <p className="login-copyright">MonitorGate © 2026</p>
      </div>

      {/* Right panel — form */}
      <div className="login-right">
        <div className="login-form-wrap">
          <h2 className="login-form-title">Entrar</h2>
          <p className="login-form-sub">Acesse seu painel de monitoramento</p>

          <div className="form-group">
            <label htmlFor="login">Usuário</label>
            <input
              id="login"
              type="text"
              placeholder="seu login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            className="login-button"
            onClick={handleLogin}
            disabled={!login || !password || loading}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="login-back">
            <Link href="/">← Voltar ao início</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

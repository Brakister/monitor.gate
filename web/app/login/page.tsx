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
    if (token) {
      router.push('/dashboard');
    }
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

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && login && password && !loading) {
      handleLogin();
    }
  }

  if (!mounted) return null;

  return (
    <main className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>MonitorGate</h1>
          <p>Monitoramento de Atividades</p>
        </div>

        <div className="login-form">
          <div className="form-group">
            <label htmlFor="login">Usuário</label>
            <input
              id="login"
              type="text"
              placeholder="Seu login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            className="login-button"
            onClick={handleLogin}
            disabled={!login || !password || loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>

        <div className="login-footer">
          <p className="muted">
            MonitorGate © 2026 • <Link href="/">Voltar</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

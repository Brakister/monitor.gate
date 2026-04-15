'use client';

import { useMemo, useState } from 'react';
import Charts from '@/components/Charts';

type ApiStats = {
  totalMs: number;
  averageDailyMs: number;
  timeline: {
    id: string;
    appName: string;
    processName: string;
    windowTitle: string;
    urlDomain: string | null;
    durationMs: number;
    startUtc: string;
    endUtc: string;
  }[];
  byDay: { date: string; durationMs: number }[];
  apps: { name: string; durationMs: number }[];
  sites: { name: string; durationMs: number }[];
};

const now = new Date();
const defaultDay = now.toISOString().slice(0, 10);
const defaultMonth = now.toISOString().slice(0, 7);

const fmtHours = (ms: number) => `${(ms / 3_600_000).toFixed(2)} h`;

export default function DashboardPage() {
  const [token, setToken] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [day, setDay] = useState(defaultDay);
  const [month, setMonth] = useState(defaultMonth);
  const [mode, setMode] = useState<'day' | 'month' | 'general'>('day');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [error, setError] = useState('');

  const queryString = useMemo(() => {
    if (mode === 'day') return `day=${day}`;
    if (mode === 'month') return `month=${month}`;
    return '';
  }, [mode, day, month]);

  async function loadStats() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/stats${queryString ? `?${queryString}` : ''}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Erro ${res.status}`);
      }

      const data = (await res.json()) as ApiStats;
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  }

  async function doLogin() {
    setAuthLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ? `${payload.error} (${res.status})` : `Login falhou (${res.status})`);
      }

      const data = (await res.json()) as { token: string };
      setToken(data.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha de autenticação');
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <main className="container fade-in">
      <section className="card" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 34 }}>Dashboard de Atividades</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Visualizações diárias, mensais e gerais com ranking de apps e sites.
        </p>

        <div className="grid" style={{ marginTop: 14 }}>
          <input
            placeholder="Login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          <input
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
          <button className="secondary" onClick={doLogin} disabled={!login || !password || authLoading}>
            {authLoading ? 'Entrando...' : 'Entrar e gerar token'}
          </button>
          <input
            placeholder="JWT Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            type="password"
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className={mode === 'day' ? 'primary' : ''} onClick={() => setMode('day')}>
              Dia
            </button>
            <button className={mode === 'month' ? 'primary' : ''} onClick={() => setMode('month')}>
              Mês
            </button>
            <button className={mode === 'general' ? 'secondary' : ''} onClick={() => setMode('general')}>
              Geral
            </button>
          </div>
          {mode === 'day' && <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />}
          {mode === 'month' && <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />}
          <button className="primary" onClick={loadStats} disabled={!token || loading}>
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>

        {error && (
          <p style={{ color: 'var(--danger)', marginTop: 10 }}>
            {error}
          </p>
        )}
      </section>

      {stats && (
        <>
          <section className="grid grid-4" style={{ marginBottom: 16 }}>
            <article className="card">
              <p className="muted">Tempo total</p>
              <p className="metric">{fmtHours(stats.totalMs)}</p>
            </article>
            <article className="card">
              <p className="muted">Média diária</p>
              <p className="metric">{fmtHours(stats.averageDailyMs)}</p>
            </article>
            <article className="card">
              <p className="muted">Apps distintos</p>
              <p className="metric">{stats.apps.length}</p>
            </article>
            <article className="card">
              <p className="muted">Sites distintos</p>
              <p className="metric">{stats.sites.length}</p>
            </article>
          </section>

          <section className="grid grid-2" style={{ marginBottom: 16 }}>
            <Charts apps={stats.apps} sites={stats.sites} byDay={stats.byDay} />
          </section>

          <section className="card">
            <h3 style={{ marginBottom: 12 }}>Ranking Geral</h3>
            <div className="grid grid-2">
              <div>
                <p className="muted" style={{ marginBottom: 8 }}>Apps</p>
                {stats.apps.slice(0, 10).map((item, idx) => (
                  <p key={`${item.name}-${idx}`} style={{ marginBottom: 6 }}>
                    {idx + 1}. {item.name} - {fmtHours(item.durationMs)}
                  </p>
                ))}
              </div>
              <div>
                <p className="muted" style={{ marginBottom: 8 }}>Sites</p>
                {stats.sites.slice(0, 10).map((item, idx) => (
                  <p key={`${item.name}-${idx}`} style={{ marginBottom: 6 }}>
                    {idx + 1}. {item.name} - {fmtHours(item.durationMs)}
                  </p>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

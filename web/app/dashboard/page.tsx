'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Charts from '@/components/Charts';
import { formatDuration } from '@/lib/timeFormat';

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

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [day, setDay] = useState(defaultDay);
  const [month, setMonth] = useState(defaultMonth);
  const [mode, setMode] = useState<'day' | 'month' | 'general'>('day');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Verificar token ao montar
  useEffect(() => {
    setMounted(true);
    const savedToken = localStorage.getItem('mg_token');
    if (!savedToken) {
      router.push('/login');
    } else {
      setToken(savedToken);
    }
  }, [router]);

  const queryString = useMemo(() => {
    if (mode === 'day') return `day=${day}`;
    if (mode === 'month') return `month=${month}`;
    return '';
  }, [mode, day, month]);

  async function loadStats() {
    if (!token) return;

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

  function handleLogout() {
    localStorage.removeItem('mg_token');
    router.push('/login');
  }

  if (!mounted) return null;

  return (
    <main className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>Dashboard</h1>
            <p className="muted">Análise de uso de aplicativos e sites</p>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      {/* Controls */}
      <div className="dashboard-content">
        <section className="controls-section">
          <div className="tabs">
            <button
              className={`tab ${mode === 'day' ? 'active' : ''}`}
              onClick={() => {
                setMode('day');
                setStats(null);
              }}
            >
              Por Dia
            </button>
            <button
              className={`tab ${mode === 'month' ? 'active' : ''}`}
              onClick={() => {
                setMode('month');
                setStats(null);
              }}
            >
              Por Mês
            </button>
            <button
              className={`tab ${mode === 'general' ? 'active' : ''}`}
              onClick={() => {
                setMode('general');
                setStats(null);
              }}
            >
              Geral
            </button>
          </div>

          <div className="controls-group">
            {mode === 'day' && (
              <input
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="date-input"
              />
            )}
            {mode === 'month' && (
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="date-input"
              />
            )}
            <button
              className="refresh-button"
              onClick={loadStats}
              disabled={loading}
            >
              {loading ? '⟳ Carregando...' : '⟳ Atualizar'}
            </button>
          </div>
        </section>

        {error && (
          <div className="error-banner">
            <strong>Erro:</strong> {error}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <>
            <section className="stats-grid">
              <div className="stat-card">
                <p className="stat-label">Tempo Total</p>
                <p className="stat-value">{formatDuration(stats.totalMs)}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Média Diária</p>
                <p className="stat-value">{formatDuration(stats.averageDailyMs)}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Apps</p>
                <p className="stat-value">{stats.apps.length}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Sites</p>
                <p className="stat-value">{stats.sites.length}</p>
              </div>
            </section>

            {/* Charts Section */}
            <section className="charts-section">
              <Charts apps={stats.apps} sites={stats.sites} byDay={stats.byDay} />
            </section>

            {/* Rankings */}
            <section className="rankings-section">
              <div className="ranking-card">
                <h3>Top Apps</h3>
                <div className="ranking-list">
                  {stats.apps.length === 0 ? (
                    <p className="muted">Sem dados</p>
                  ) : (
                    stats.apps.slice(0, 10).map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="ranking-item">
                        <div className="ranking-info">
                          <span className="ranking-position">{idx + 1}</span>
                          <span className="ranking-name">{item.name}</span>
                        </div>
                        <span className="ranking-time">{formatDuration(item.durationMs)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="ranking-card">
                <h3>Top Sites</h3>
                <div className="ranking-list">
                  {stats.sites.length === 0 ? (
                    <p className="muted">Sem dados</p>
                  ) : (
                    stats.sites.slice(0, 10).map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="ranking-item">
                        <div className="ranking-info">
                          <span className="ranking-position">{idx + 1}</span>
                          <span className="ranking-name">{item.name}</span>
                        </div>
                        <span className="ranking-time">{formatDuration(item.durationMs)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {!stats && !loading && !error && (
          <div className="empty-state">
            <p>Selecione um período e clique em Atualizar para visualizar os dados</p>
          </div>
        )}
      </div>
    </main>
  );
}

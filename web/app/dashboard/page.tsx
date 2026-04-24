'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Charts from '@/components/Charts';
import { formatDuration } from '@/lib/timeFormat';

type ApiStats = {
  totalMs: number;
  averageDailyMs: number;
  sessionStartUtc: string | null;
  lastPostUtc: string | null;
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

function formatDateTime(value: string | null): string {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

type SyncState = { label: string; cls: 'online' | 'warn' | 'offline' };

function getSyncStatus(lastPostUtc: string | null): SyncState {
  if (!lastPostUtc) return { label: 'Sem dados', cls: 'offline' };
  const parsed = new Date(lastPostUtc);
  if (Number.isNaN(parsed.getTime())) return { label: 'Inválido', cls: 'offline' };
  const elapsed = Date.now() - parsed.getTime();
  if (elapsed <= 3 * 60_000)  return { label: '● Online',   cls: 'online' };
  if (elapsed <= 10 * 60_000) return { label: '● Atenção',  cls: 'warn' };
  return { label: '● Atrasado', cls: 'offline' };
}

function pageTitle(mode: 'day' | 'month' | 'general', day: string, month: string): string {
  if (mode === 'day') {
    const d = new Date(day + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (mode === 'month') {
    const [y, m] = month.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  return 'Visão geral';
}

function pageSubtitle(mode: 'day' | 'month' | 'general'): string {
  if (mode === 'day')     return 'uso de apps e sites · visão diária';
  if (mode === 'month')   return 'uso de apps e sites · visão mensal';
  return 'uso de apps e sites · todo o período';
}

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

  const sync = useMemo(() => getSyncStatus(stats?.lastPostUtc ?? null), [stats?.lastPostUtc]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('mg_token');
    if (!saved) {
      router.push('/login');
    } else {
      setToken(saved);
    }
  }, [router]);

  const queryString = useMemo(() => {
    if (mode === 'day')   return `day=${day}`;
    if (mode === 'month') return `month=${month}`;
    return '';
  }, [mode, day, month]);

  async function loadStats() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/stats${queryString ? `?${queryString}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      setStats((await res.json()) as ApiStats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m: 'day' | 'month' | 'general') {
    setMode(m);
    setStats(null);
    setError('');
  }

  function handleLogout() {
    localStorage.removeItem('mg_token');
    router.push('/login');
  }

  // Compute max duration for ranking bars
  const maxAppMs   = stats?.apps[0]?.durationMs  ?? 1;
  const maxSiteMs  = stats?.sites[0]?.durationMs ?? 1;

  if (!mounted) return null;

  return (
    <div className="dashboard-wrapper">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="dashboard-header">
        <div className="header-logo">
          <div className="header-logo-dot" />
          MonitorGate
        </div>

        <div className="header-right">
          {stats && (
            <div className="sync-pill">
              <div className={`sync-dot ${sync.cls}`} />
              {sync.cls === 'online'
                ? `Online · ${formatDateTime(stats.lastPostUtc)}`
                : `${sync.label} · ${formatDateTime(stats.lastPostUtc)}`}
            </div>
          )}
          <button className="logout-button" onClick={handleLogout}>Sair</button>
        </div>
      </header>

      <div className="dashboard-body">
        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside className="dashboard-sidebar">
          <p className="sidebar-section-label">Período</p>

          <button
            className={`sidebar-nav-item ${mode === 'day' ? 'active' : ''}`}
            onClick={() => switchMode('day')}
          >
            <svg className="sidebar-icon" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M1 5h12" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4.5 1v2M9.5 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Por dia
          </button>

          <button
            className={`sidebar-nav-item ${mode === 'month' ? 'active' : ''}`}
            onClick={() => switchMode('month')}
          >
            <svg className="sidebar-icon" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2v10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Por mês
          </button>

          <button
            className={`sidebar-nav-item ${mode === 'general' ? 'active' : ''}`}
            onClick={() => switchMode('general')}
          >
            <svg className="sidebar-icon" viewBox="0 0 14 14" fill="none">
              <path d="M1 10l3-4 3 2 3-5 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Geral
          </button>

          <hr className="sidebar-hr" />

          <div className="sidebar-filters">
            <span className="sidebar-filter-label">Filtro</span>

            {mode === 'day' && (
              <input
                type="date"
                className="date-input"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            )}
            {mode === 'month' && (
              <input
                type="month"
                className="date-input"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            )}

            <button
              className="refresh-button"
              onClick={loadStats}
              disabled={loading}
            >
              {loading ? 'Carregando…' : 'Atualizar'}
            </button>
          </div>

          {stats && (
            <div className="sidebar-meta">
              <p className="sidebar-meta-row">Último post</p>
              <p className="sidebar-meta-row value">{formatDateTime(stats.lastPostUtc)}</p>
              <p className="sidebar-meta-row">Sessão iniciada</p>
              <p className="sidebar-meta-row value">{formatDateTime(stats.sessionStartUtc)}</p>
            </div>
          )}
        </aside>

        {/* ── Main content ─────────────────────────────────────── */}
        <main className="dashboard-content">

          {/* Page head */}
          <div className="page-head">
            <div>
              <h1 className="page-title">{pageTitle(mode, day, month)}</h1>
              <p className="page-subtitle">{pageSubtitle(mode)}</p>
            </div>
            {stats && (
              <span className={`sync-badge ${sync.cls}`}>{sync.label}</span>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="error-banner">
              <strong>Erro:</strong> {error}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <>
              <div className="stats-row">
                <div className="stat-block">
                  <p className="stat-name">Tempo total</p>
                  <p className="stat-value">{formatDuration(stats.totalMs)}</p>
                </div>
                <div className="stat-block">
                  <p className="stat-name">Média diária</p>
                  <p className="stat-value">{formatDuration(stats.averageDailyMs)}</p>
                </div>
                <div className="stat-block">
                  <p className="stat-name">Apps</p>
                  <p className="stat-value">{stats.apps.length}</p>
                  {stats.apps[0] && (
                    <p className="stat-sub">mais: {stats.apps[0].name}</p>
                  )}
                </div>
                <div className="stat-block">
                  <p className="stat-name">Sites</p>
                  <p className="stat-value">{stats.sites.length}</p>
                  {stats.sites[0] && (
                    <p className="stat-sub">mais: {stats.sites[0].name}</p>
                  )}
                </div>
              </div>

              {/* Charts */}
              <div className="charts-section">
                <Charts apps={stats.apps} sites={stats.sites} byDay={stats.byDay} />
              </div>

              {/* Rankings */}
              <div className="rankings-section">
                {/* Apps ranking */}
                <div className="ranking-card">
                  <div className="ranking-card-head">
                    <span className="ranking-card-title">Apps</span>
                    <span className="ranking-card-count">{stats.apps.length} no total</span>
                  </div>
                  {stats.apps.length === 0 ? (
                    <p className="muted" style={{ padding: '20px' }}>Sem dados</p>
                  ) : (
                    stats.apps.map((item, idx) => (
                      <div key={`app-${item.name}-${idx}`} className="ranking-item">
                        <span className="ranking-position">{idx + 1}</span>
                        <div className="ranking-bar-wrap">
                          <div className="ranking-name">{item.name}</div>
                          <div className="ranking-bar-bg">
                            <div
                              className="ranking-bar-fill"
                              style={{ width: `${(item.durationMs / maxAppMs) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="ranking-time">{formatDuration(item.durationMs)}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Sites ranking */}
                <div className="ranking-card">
                  <div className="ranking-card-head">
                    <span className="ranking-card-title">Sites</span>
                    <span className="ranking-card-count">{stats.sites.length} no total</span>
                  </div>
                  {stats.sites.length === 0 ? (
                    <p className="muted" style={{ padding: '20px' }}>Sem dados</p>
                  ) : (
                    stats.sites.map((item, idx) => (
                      <div key={`site-${item.name}-${idx}`} className="ranking-item">
                        <span className="ranking-position">{idx + 1}</span>
                        <div className="ranking-bar-wrap">
                          <div className="ranking-name">{item.name}</div>
                          <div className="ranking-bar-bg">
                            <div
                              className="ranking-bar-fill"
                              style={{ width: `${(item.durationMs / maxSiteMs) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="ranking-time">{formatDuration(item.durationMs)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {!stats && !loading && !error && (
            <div className="empty-state">
              <p className="empty-state-title">Nenhum dado carregado</p>
              <p className="empty-state-sub">
                Selecione um período e clique em Atualizar
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

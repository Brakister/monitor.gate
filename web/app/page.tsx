import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="home-container">
      <div className="home-logo">
        <div className="home-logo-dot" />
        MonitorGate
      </div>
      <p className="home-desc">
        Monitoramento contínuo de aplicativos e sites, com análise por dia, mês e visão geral.
        Simples, preciso e sem distrações.
      </p>
      <Link href="/dashboard">
        <button className="home-cta">Abrir dashboard</button>
      </Link>
    </main>
  );
}

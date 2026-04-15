import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container fade-in">
      <section className="card" style={{ padding: 24 }}>
        <h1 style={{ fontSize: 42, lineHeight: 1.05 }}>MonitorGate</h1>
        <p className="muted" style={{ marginTop: 12, maxWidth: 680 }}>
          Plataforma de monitoramento contínuo de atividades com foco em desempenho, segurança e análise por dia,
          mês e visão geral.
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <Link href="/dashboard">
            <button className="primary">Abrir Dashboard</button>
          </Link>
        </div>
      </section>
    </main>
  );
}

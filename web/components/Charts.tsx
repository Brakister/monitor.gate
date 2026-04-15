'use client';

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type RankItem = {
  name: string;
  durationMs: number;
};

type Props = {
  apps: RankItem[];
  sites: RankItem[];
  byDay: { date: string; durationMs: number }[];
};

const toHours = (ms: number) => Math.round((ms / 3_600_000) * 100) / 100;

export default function Charts({ apps, sites, byDay }: Props) {
  const appData = {
    labels: apps.slice(0, 8).map((x) => x.name),
    datasets: [
      {
        label: 'Horas',
        data: apps.slice(0, 8).map((x) => toHours(x.durationMs)),
        backgroundColor: ['#ff7a18', '#ffa24c', '#0f9d8f', '#53c3b8', '#1f6feb', '#6ea8fe', '#d7263d', '#ff6f91']
      }
    ]
  };

  const siteData = {
    labels: sites.slice(0, 8).map((x) => x.name),
    datasets: [
      {
        data: sites.slice(0, 8).map((x) => toHours(x.durationMs)),
        backgroundColor: ['#0f9d8f', '#53c3b8', '#ff7a18', '#ffa24c', '#1f6feb', '#6ea8fe', '#f2c14e', '#d7263d']
      }
    ]
  };

  const timelineData = {
    labels: byDay.map((x) => x.date),
    datasets: [
      {
        label: 'Uso total por dia (h)',
        data: byDay.map((x) => toHours(x.durationMs)),
        backgroundColor: '#1f6feb'
      }
    ]
  };

  return (
    <>
      <div className="card">
        <h3>Apps Mais Usados</h3>
        <div style={{ marginTop: 12 }}>
          <Bar data={appData} options={{ responsive: true, maintainAspectRatio: false }} height={260} />
        </div>
      </div>
      <div className="card">
        <h3>Sites Mais Visitados</h3>
        <div style={{ marginTop: 12, maxWidth: 360 }}>
          <Doughnut data={siteData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
      </div>
      <div className="card">
        <h3>Timeline Diária</h3>
        <div style={{ marginTop: 12 }}>
          <Bar data={timelineData} options={{ responsive: true, maintainAspectRatio: false }} height={240} />
        </div>
      </div>
    </>
  );
}

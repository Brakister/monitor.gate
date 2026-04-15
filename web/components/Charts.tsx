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
import { formatDuration } from '@/lib/timeFormat';

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
        label: 'Tempo',
        data: apps.slice(0, 8).map((x) => toHours(x.durationMs)),
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  };

  const siteData = {
    labels: sites.slice(0, 8).map((x) => x.name),
    datasets: [
      {
        data: sites.slice(0, 8).map((x) => toHours(x.durationMs)),
        backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#0ea5e9', '#6366f1', '#8b5cf6']
      }
    ]
  };

  const timelineData = {
    labels: byDay.map((x) => {
      const date = new Date(x.date);
      return date.toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Tempo por dia',
        data: byDay.map((x) => toHours(x.durationMs)),
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  };

  return (
    <>
      <div className="chart-card">
        <h3>Apps Mais Usados</h3>
        <div className="chart-container">
          <Bar
            data={appData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: { display: true, text: 'Horas' }
                }
              }
            }}
            height={260}
          />
        </div>
      </div>

      <div className="chart-card">
        <h3>Sites Mais Visitados</h3>
        <div className="chart-container-donut">
          <Doughnut
            data={siteData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    padding: 16,
                    font: { size: 13 }
                  }
                }
              }
            }}
          />
        </div>
      </div>

      <div className="chart-card chart-card-full">
        <h3>Timeline</h3>
        <div className="chart-container">
          <Bar
            data={timelineData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: { display: true, text: 'Horas' }
                }
              }
            }}
            height={240}
          />
        </div>
      </div>
    </>
  );
}

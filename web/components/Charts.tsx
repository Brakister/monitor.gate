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

// Warm monochromatic palette matching --accent (#c8956a)
const donutPalette = [
  '#c8956a', // accent
  '#9e7252',
  '#7a5840',
  '#573f2f',
  '#3d2d21',
  '#2a1f17',
  '#1c1410',
  '#110d09'
];

// Shared chart options
const axisStyle = {
  color: 'rgba(122, 119, 111, 0.9)',
  font: { family: "'DM Mono', monospace", size: 11 }
} as const;

const gridStyle = { color: 'rgba(255, 255, 255, 0.05)' };

const tooltipStyle = {
  backgroundColor: '#1d1d1a',
  borderColor: 'rgba(255, 255, 255, 0.08)',
  borderWidth: 1,
  titleColor: '#d8d4cd',
  bodyColor: '#7a776f',
  titleFont: { family: "'DM Sans', sans-serif", size: 12 },
  bodyFont: { family: "'DM Mono', monospace", size: 11 },
  padding: 10,
  cornerRadius: 4
};

export default function Charts({ apps, sites, byDay }: Props) {
  /* ── Apps bar chart ──────────────────────────────────────────── */
  const appData = {
    labels: apps.slice(0, 10).map((x) => x.name),
    datasets: [
      {
        label: 'Horas',
        data: apps.slice(0, 10).map((x) => toHours(x.durationMs)),
        backgroundColor: 'rgba(200, 149, 106, 0.7)',
        hoverBackgroundColor: '#c8956a',
        borderRadius: 3,
        borderSkipped: false,
        borderWidth: 0
      }
    ]
  };

  /* ── Sites donut chart ───────────────────────────────────────── */
  const siteData = {
    labels: sites.slice(0, 8).map((x) => x.name),
    datasets: [
      {
        data: sites.slice(0, 8).map((x) => toHours(x.durationMs)),
        backgroundColor: donutPalette,
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };

  /* ── Timeline bar chart ──────────────────────────────────────── */
  const timelineData = {
    labels: byDay.map((x) => {
      const d = new Date(x.date);
      return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    }),
    datasets: [
      {
        label: 'Horas',
        data: byDay.map((x) => toHours(x.durationMs)),
        backgroundColor: 'rgba(200, 149, 106, 0.55)',
        hoverBackgroundColor: '#c8956a',
        borderRadius: 2,
        borderSkipped: false,
        borderWidth: 0
      }
    ]
  };

  return (
    <>
      {/* Apps */}
      <div className="chart-card">
        <div className="chart-head">
          <span className="chart-title">Apps mais usados</span>
          <span className="chart-period">top 10 · horas</span>
        </div>
        <div className="chart-container">
          <Bar
            data={appData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  ...tooltipStyle,
                  callbacks: {
                    label: (ctx) => ` ${ctx.raw}h`
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: gridStyle,
                  border: { display: false },
                  ticks: { ...axisStyle, callback: (v) => `${v}h` }
                },
                x: {
                  grid: { display: false },
                  border: { display: false },
                  ticks: { ...axisStyle, maxRotation: 30 }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Sites donut */}
      <div className="chart-card">
        <div className="chart-head">
          <span className="chart-title">Sites mais visitados</span>
          <span className="chart-period">top 8</span>
        </div>
        <div className="chart-container-donut">
          <Doughnut
            data={siteData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: '68%',
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    padding: 14,
                    boxWidth: 10,
                    boxHeight: 10,
                    borderRadius: 3,
                    font: { family: "'DM Mono', monospace", size: 11 },
                    color: 'rgba(122, 119, 111, 0.9)'
                  }
                },
                tooltip: {
                  ...tooltipStyle,
                  callbacks: {
                    label: (ctx) => ` ${ctx.raw}h`
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Timeline */}
      {byDay.length > 0 && (
        <div className="chart-card chart-card-full">
          <div className="chart-head">
            <span className="chart-title">Atividade por dia</span>
            <span className="chart-period">horas</span>
          </div>
          <div className="chart-container">
            <Bar
              data={timelineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    ...tooltipStyle,
                    callbacks: {
                      label: (ctx) => ` ${ctx.raw}h`
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: gridStyle,
                    border: { display: false },
                    ticks: { ...axisStyle, callback: (v) => `${v}h` }
                  },
                  x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { ...axisStyle, maxRotation: 0 }
                  }
                }
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

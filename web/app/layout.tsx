import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MonitorGate',
  description: 'Monitoramento de uso de aplicativos e navegação no Windows.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

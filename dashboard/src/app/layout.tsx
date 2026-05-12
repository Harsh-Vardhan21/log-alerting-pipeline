import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Log Alerting Pipeline — Dashboard',
  description: 'Real-time log monitoring dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

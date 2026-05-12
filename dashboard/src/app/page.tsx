'use client';

import { useEffect, useRef, useState } from 'react';

interface LogEntry {
  id: number;
  line: string;
}

interface Metrics {
  totalLogs: number;
  errorsDetected: number;
  alertsSent: number;
  lastScanSeconds: number;
}

interface AlertEntry {
  time: string;
  errors: number;
  severity: string;
  sentTo: string;
  status: string;
}

function getLogLineClass(line: string): string {
  if (line.includes('CRITICAL')) return 'bg-red-950 text-red-300 border-l-2 border-red-600';
  if (line.includes('ERROR')) return 'bg-red-900/40 text-red-300 border-l-2 border-red-500';
  if (line.includes('WARNING')) return 'bg-yellow-900/30 text-yellow-300 border-l-2 border-yellow-600';
  return 'text-gray-500';
}

function getScanStyle(line: string): { cls: string; prefix: string } {
  if (line.includes('Alert sent')) {
    return { cls: 'bg-green-900/40 text-green-300 border-l-2 border-green-500', prefix: '⚡ ' };
  }
  if (line.includes('suppressed')) {
    return { cls: 'bg-orange-900/30 text-orange-300 border-l-2 border-orange-600', prefix: '⏸ ' };
  }
  return { cls: 'bg-blue-900/20 text-blue-300 border-l-2 border-blue-700', prefix: '' };
}

function formatLastScan(seconds: number): string {
  if (seconds < 0) return 'Never';
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s ago`;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalLogs: 0,
    errorsDetected: 0,
    alertsSent: 0,
    lastScanSeconds: -1,
  });
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [logLines, setLogLines] = useState<LogEntry[]>([]);
  const [scanLines, setScanLines] = useState<LogEntry[]>([]);

  const logPanelRef = useRef<HTMLDivElement>(null);
  const scanPanelRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);
  const scanIdRef = useRef(0);
  const autoScrollLog = useRef(true);
  const autoScrollScan = useRef(true);

  // SSE: live log feed
  useEffect(() => {
    const es = new EventSource('/api/logs/stream');
    es.onmessage = (e: MessageEvent) => {
      const { line } = JSON.parse(e.data) as { line: string };
      setLogLines((prev) => {
        const next = [...prev, { id: logIdRef.current++, line }];
        return next.length > 100 ? next.slice(-100) : next;
      });
    };
    return () => es.close();
  }, []);

  // SSE: scanner activity
  useEffect(() => {
    const es = new EventSource('/api/scanner/stream');
    es.onmessage = (e: MessageEvent) => {
      const { line } = JSON.parse(e.data) as { line: string };
      setScanLines((prev) => {
        const next = [...prev, { id: scanIdRef.current++, line }];
        return next.length > 100 ? next.slice(-100) : next;
      });
    };
    return () => es.close();
  }, []);

  // Auto-scroll log panel
  useEffect(() => {
    if (autoScrollLog.current && logPanelRef.current) {
      logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight;
    }
  }, [logLines]);

  // Auto-scroll scanner panel
  useEffect(() => {
    if (autoScrollScan.current && scanPanelRef.current) {
      scanPanelRef.current.scrollTop = scanPanelRef.current.scrollHeight;
    }
  }, [scanLines]);

  // Metrics polling (every 10s)
  useEffect(() => {
    const fetchMetrics = () =>
      fetch('/api/metrics')
        .then((r) => r.json())
        .then((d: Metrics) => setMetrics(d))
        .catch(() => {});
    fetchMetrics();
    const id = setInterval(fetchMetrics, 10_000);
    return () => clearInterval(id);
  }, []);

  // Alerts polling (every 30s)
  useEffect(() => {
    const fetchAlerts = () =>
      fetch('/api/alerts')
        .then((r) => r.json())
        .then((d: AlertEntry[]) => setAlerts(d))
        .catch(() => {});
    fetchAlerts();
    const id = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 space-y-4">

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between bg-gray-900 rounded-xl px-5 py-4 border border-gray-800">
        <h1 className="text-lg font-bold tracking-tight">
          Log Alerting Pipeline &mdash; Dashboard
        </h1>
        <div className="flex items-center gap-3">
          <Badge color="green" pulse>Generator running</Badge>
          <Badge color="green" pulse>Monitor running</Badge>
          <Badge color="yellow">{metrics.alertsSent} alerts today</Badge>
        </div>
      </header>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Logs Generated"
          value={metrics.totalLogs.toLocaleString()}
          accent="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0121 9.414V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <MetricCard
          label="Errors Detected"
          value={metrics.errorsDetected.toLocaleString()}
          accent="red"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <MetricCard
          label="Alerts Sent Today"
          value={metrics.alertsSent.toLocaleString()}
          accent="yellow"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          }
        />
        <MetricCard
          label="Last Scan"
          value={formatLastScan(metrics.lastScanSeconds)}
          accent="purple"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
      </div>

      {/* ── Live panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Live log feed */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col h-96">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <h2 className="text-sm font-semibold text-gray-200">Live Log Feed</h2>
            </div>
            <span className="text-xs text-gray-500 tabular-nums">{logLines.length} lines</span>
          </div>
          <div
            ref={logPanelRef}
            className="log-panel flex-1 overflow-y-auto p-2 space-y-px"
            onScroll={(e) => {
              const el = e.currentTarget;
              autoScrollLog.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 60;
            }}
          >
            {logLines.length === 0 && (
              <p className="text-xs text-gray-600 p-2">Waiting for log data…</p>
            )}
            {logLines.map(({ id, line }) => (
              <div
                key={id}
                className={`font-mono text-xs px-2 py-0.5 rounded whitespace-pre-wrap break-all ${getLogLineClass(line)}`}
              >
                {line}
              </div>
            ))}
          </div>
        </div>

        {/* Scanner activity */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col h-96">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <h2 className="text-sm font-semibold text-gray-200">Scanner Activity</h2>
            </div>
            <span className="text-xs text-gray-500 tabular-nums">{scanLines.length} scans</span>
          </div>
          <div
            ref={scanPanelRef}
            className="log-panel flex-1 overflow-y-auto p-2 space-y-1"
            onScroll={(e) => {
              const el = e.currentTarget;
              autoScrollScan.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 60;
            }}
          >
            {scanLines.length === 0 && (
              <p className="text-xs text-gray-600 p-2">Waiting for scanner data…</p>
            )}
            {scanLines.map(({ id, line }) => {
              const { cls, prefix } = getScanStyle(line);
              return (
                <div key={id} className={`font-mono text-xs px-2 py-1 rounded ${cls}`}>
                  {prefix}{line}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Alert history table ── */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">Alert History</h2>
          <span className="text-xs text-gray-500">{alerts.length} total</span>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-10">No alerts recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-800">
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Errors Found</th>
                  <th className="px-4 py-3 text-left">Severity</th>
                  <th className="px-4 py-3 text-left">Sent To</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {[...alerts].reverse().map((alert, i) => (
                  <tr key={i} className="text-gray-300 hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{alert.time}</td>
                    <td className="px-4 py-3 tabular-nums">{alert.errors}</td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{alert.sentTo}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={alert.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Badge({
  children,
  color,
  pulse = false,
}: {
  children: React.ReactNode;
  color: 'green' | 'yellow';
  pulse?: boolean;
}) {
  const styles = {
    green: 'bg-green-950 text-green-400 border-green-800',
    yellow: 'bg-yellow-950 text-yellow-400 border-yellow-800',
  };
  const dotStyles = {
    green: 'bg-green-400',
    yellow: 'bg-yellow-400',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${styles[color]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[color]} ${pulse ? 'animate-pulse' : ''}`} />
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: 'blue' | 'red' | 'yellow' | 'purple';
  icon: React.ReactNode;
}) {
  const ring = {
    blue: 'border-blue-800/60 bg-blue-950/20',
    red: 'border-red-800/60 bg-red-950/20',
    yellow: 'border-yellow-800/60 bg-yellow-950/20',
    purple: 'border-purple-800/60 bg-purple-950/20',
  };
  const text = {
    blue: 'text-blue-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
  };
  return (
    <div className={`bg-gray-900 rounded-xl border p-5 ${ring[accent]}`}>
      <div className={`mb-3 ${text[accent]}`}>{icon}</div>
      <div className={`text-2xl font-bold tabular-nums mb-1 ${text[accent]}`}>{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    Critical: 'bg-red-950 text-red-400 border-red-800',
    High: 'bg-orange-950 text-orange-400 border-orange-800',
    Medium: 'bg-yellow-950 text-yellow-400 border-yellow-800',
    Low: 'bg-sky-950 text-sky-400 border-sky-800',
  };
  const cls = map[severity] ?? 'bg-gray-800 text-gray-400 border-gray-700';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'Delivered'
      ? 'bg-green-950 text-green-400 border-green-800'
      : 'bg-red-950 text-red-400 border-red-800';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {status}
    </span>
  );
}

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const LOGS_DIR = process.env.LOGS_DIR ?? path.join(process.cwd(), '..', 'logs');

export async function GET() {
  let totalLogs = 0;
  let errorsDetected = 0;
  let alertsSent = 0;
  let lastScanSeconds = -1;

  // Parse app.log for counts
  try {
    const content = fs.readFileSync(path.join(LOGS_DIR, 'app.log'), 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    totalLogs = lines.length;
    errorsDetected = lines.filter((l) => l.includes('ERROR') || l.includes('CRITICAL')).length;
  } catch { /* log file not yet created */ }

  // Count alerts from JSON array
  try {
    const raw = fs.readFileSync(path.join(LOGS_DIR, 'alerts.json'), 'utf-8').trim();
    const data: unknown = raw ? JSON.parse(raw) : [];
    alertsSent = Array.isArray(data) ? data.length : 0;
  } catch { /* file not yet created */ }

  // Derive last scan time from scanner.log
  try {
    const content = fs.readFileSync(path.join(LOGS_DIR, 'scanner.log'), 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    if (lines.length > 0) {
      const last = lines[lines.length - 1];
      const m = last.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/);
      if (m) {
        const lastTime = new Date(m[1]).getTime();
        lastScanSeconds = Math.floor((Date.now() - lastTime) / 1000);
      }
    }
  } catch { /* scanner.log not yet created */ }

  return NextResponse.json({ totalLogs, errorsDetected, alertsSent, lastScanSeconds });
}

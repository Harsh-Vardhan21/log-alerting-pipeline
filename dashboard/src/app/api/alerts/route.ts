import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const LOGS_DIR = process.env.LOGS_DIR ?? path.join(process.cwd(), '..', 'logs');

export async function GET() {
  try {
    const raw = fs.readFileSync(path.join(LOGS_DIR, 'alerts.json'), 'utf-8').trim();
    const data: unknown = raw ? JSON.parse(raw) : [];
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch {
    return NextResponse.json([]);
  }
}

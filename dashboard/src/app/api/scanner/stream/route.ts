import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const LOGS_DIR = process.env.LOGS_DIR ?? path.join(process.cwd(), '..', 'logs');

function waitOrAbort(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
  });
}

export async function GET(request: NextRequest) {
  const logFile = path.join(LOGS_DIR, 'scanner.log');
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ line })}\n\n`));
        } catch {
          // stream closed
        }
      };

      let lastSize = 0;

      // Send last 100 lines as initial backfill
      try {
        const content = fs.readFileSync(logFile, 'utf-8');
        const lines = content.split('\n').filter(Boolean);
        lines.slice(-100).forEach(send);
        lastSize = fs.statSync(logFile).size;
      } catch {
        lastSize = 0;
      }

      // Poll every 1 second for new bytes
      while (!request.signal.aborted) {
        await waitOrAbort(1000, request.signal);
        if (request.signal.aborted) break;

        try {
          const stat = fs.statSync(logFile);
          if (stat.size > lastSize) {
            const fd = fs.openSync(logFile, 'r');
            const buffer = Buffer.alloc(stat.size - lastSize);
            fs.readSync(fd, buffer, 0, buffer.length, lastSize);
            fs.closeSync(fd);
            lastSize = stat.size;
            buffer.toString('utf-8').split('\n').filter(Boolean).forEach(send);
          } else if (stat.size < lastSize) {
            lastSize = stat.size;
          }
        } catch {
          // file not available yet; retry next tick
        }
      }

      try { controller.close(); } catch { /* already closed */ }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

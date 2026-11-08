// Serves a program to the browser: a page with a terminal (xterm.js) talking to a WebSocket.
// Usage: bun examples/network/websocket.ts [program.ts]    then open http://localhost:3001
import { resolve } from 'node:path';

import type { ServerWebSocket } from 'bun';

import { run } from '../../packages/tui/src/index.ts'; // in your app: '@glyph-engine/tui'

const program = await import(resolve(process.argv[2] ?? 'programs/basics/keys.ts'));
const COLS = 100;
const ROWS = 30;

const page = `<!doctype html>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.css">
<script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.js"></script>
<body style="margin:0;background:#000"><div id="t"></div><script>
const term = new Terminal({ cols: ${COLS}, rows: ${ROWS} });
term.open(document.getElementById('t'));
term.focus();
const ws = new WebSocket('ws://' + location.host + '/ws');
ws.onmessage = (e) => term.write(e.data);
ws.onclose = () => term.write('\\r\\n[closed]');
term.onData((d) => ws.send(d));
</script>`;

type Session = { input?: ReadableStreamDefaultController<string>; abort: AbortController };

Bun.serve<Session, never>({
    port: 3001,
    fetch(req, server) {
        if (new URL(req.url).pathname === '/ws') return server.upgrade(req, { data: { abort: new AbortController() } }) ? undefined : new Response('upgrade failed', { status: 400 });
        return new Response(page, { headers: { 'content-type': 'text/html' } });
    },
    websocket: {
        open(ws: ServerWebSocket<Session>) {
            // A ReadableStream turns pushed messages into the AsyncIterable run() reads
            const input = new ReadableStream<string>({ start: (c) => void (ws.data.input = c) });
            run(
                program,
                { signal: ws.data.abort.signal }, // aborting stops the run
                {},
                {
                    write: (s) => void ws.send(s),
                    input,
                    size: () => ({ cols: COLS, rows: ROWS }),
                    ready: () => ws.getBufferedAmount() < 1 << 20,
                    onError: () => ws.close(),
                },
            ).catch(() => ws.close());
        },
        message: (ws, msg) => ws.data.input?.enqueue(String(msg)),
        close(ws) {
            ws.data.abort.abort();
            ws.data.input?.close();
        },
    },
});
console.log('http://localhost:3001');

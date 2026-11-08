// Serves a program over plain TCP; every connection gets its own run and userData (programs keep per-user state there).
// Usage: bun examples/network/tcp.ts [program.ts]    (default: programs/basics/keys.ts)
// Connect: stty raw -echo; nc localhost 2323; stty sane      (Ctrl+C reaches the program; close with Ctrl+D... or kill nc)
import { createServer } from 'node:net';
import { resolve } from 'node:path';

import { run } from '../../packages/tui/src/index.ts'; // in your app: '@glyph-engine/tui'

const program = await import(resolve(process.argv[2] ?? 'programs/basics/keys.ts'));

createServer((socket) => {
    const abort = new AbortController();
    socket.on('close', () => abort.abort());
    socket.on('error', () => {});
    run(
        program,
        {},
        {},
        {
            write: (s) => socket.write(s),
            input: socket,
            size: () => ({ cols: 80, rows: 24 }), // raw TCP doesn't carry the terminal size
            signal: abort.signal,
            ready: () => !socket.writableNeedDrain,
            onError: () => socket.destroy(),
        },
    ).catch(() => socket.destroy());
}).listen(2323, () => console.log('nc localhost 2323'));

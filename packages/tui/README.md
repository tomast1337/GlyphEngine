# @glyph-engine/tui

[GlyphEngine](https://github.com/tomast1337/GlyphEngine) in the terminal: `run()` draws with 24-bit colour, and the mouse is the cursor. Runs on [Bun](https://bun.com) and Node 22+, in a terminal with truecolor and mouse reporting. Re-exports `@glyph-engine/core`.

```
bun add @glyph-engine/tui   # or: npm install @glyph-engine/tui
```

```ts
import { run } from '@glyph-engine/tui';

await run({
    main(coord, context, cursor, out) {
        out.char = '#';
        out.color = 'red';
    },
});
```

Ctrl+C quits; other keys go to the program's `keyDown`. Programs that use browser modules (`camera`, `canvas`, `sort`…) only run on the web.

`parseKeys(text)` turns raw terminal input into keys with browser names (`'a'`, `'Enter'`, `'ArrowUp'`, plus `ctrlKey` / `altKey` / `shiftKey` / `metaKey`). It returns `{ keys, rest }`; `rest` is an escape sequence cut off at the end, to put in front of the next read.

## Over a network

Pass `run()` an `io` to draw over any stream instead of the local terminal: an SSH channel, a socket, a WebSocket. The process is left alone (no raw mode, no exit hook), and Ctrl+C is a key like any other. The alternate screen and mouse modes are still sent, for the remote terminal.

```ts
import { createServer } from 'node:net';

import { run } from '@glyph-engine/tui';

createServer((socket) => {
    const abort = new AbortController();
    socket.on('close', () => abort.abort());
    run(
        program,
        {},
        {},
        {
            write: (s) => socket.write(s),
            input: socket, // any AsyncIterable or ReadableStream of strings or bytes
            size: () => ({ cols: 80, rows: 24 }), // the remote terminal's size, if you know it
            signal: abort.signal, // stops the loop
            ready: () => !socket.writableNeedDrain, // skip frames while a slow reader catches up
            onError: () => socket.destroy(), // an error in a frame ends this connection, not the server
        },
    ).catch(() => socket.destroy()); // an error in the first frame
}).listen(2323);
```

Every `run()` of the same program shares its module variables (`let x` in the program file), so one user's keys would change what everyone sees. Keep per-connection state in `userData` instead: pass a new object to each `run()` (the third argument); every program function gets it as its last argument. `programs/basics/keys.ts` does this.

Try it with `stty raw -echo; nc localhost 2323; stty sane`. Over SSH no `io` is needed: `sshd` gives the program a terminal, so `ssh -t host bun program.ts` works as is. Runnable examples, TCP and WebSocket (a browser page with xterm.js): [`examples/network`](../../examples/network).

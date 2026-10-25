import { connect } from 'node:net';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const running = await new Promise(resolve => {
  const socket = connect({ host: '127.0.0.1', port: 3000 });
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('error', () => resolve(false));
});
if (running) {
  console.error('Stop the development server on port 3000 before resetting its cache.');
  process.exit(1);
}
await rm(fileURLToPath(new URL('../.next-dev/', import.meta.url)), { recursive: true, force: true });

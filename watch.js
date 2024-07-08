const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');
const { watch } = require('fs');
const path = require('path');

const cmd = (program, args) => {
  const spawnOptions = { 'shell': true };
  console.log('CMD:', program, args.flat(), spawnOptions);
  const p = spawn(program, args.flat(), spawnOptions);
  p.stdout.on('data', (data) => process.stdout.write(data));
  p.stderr.on('data', (data) => process.stderr.write(data));
  p.on('close', (code) => {
    if (code !== 0) {
      console.error(program, args, 'exited with', code);
    }
  });
  return p;
};

cmd('tsc', ['-w']);
cmd('http-server', ['-p', '6969', '-a', '127.0.0.1', '-s', '-c-1']);

const wss = new WebSocketServer({
  port: 6970,
});

const websockets = [];

wss.on('connection', (ws) => {
  websockets.push(ws);

  ws.on('close', () => {
    websockets.splice(websockets.indexOf(ws), 1);
  });
});

const COLD_RELOAD_FILES = ['index.html', 'index.js'];
COLD_RELOAD_FILES.forEach((file) =>
  watch(path.join(__dirname, file), { interval: 50 }, () => {
    websockets.forEach((socket) => socket.send('cold'));
  })
);

const HOT_RELOAD_FILES = ['game.js'];
HOT_RELOAD_FILES.forEach((file) =>
  watch(path.join(__dirname, file), { interval: 50 }, () => {
    websockets.forEach((socket) => socket.send('hot'));
  })
);

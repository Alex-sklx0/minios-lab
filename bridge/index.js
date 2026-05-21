const net = require('net');
const fs = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');
const { WebSocketServer } = require('ws');

const SOCK_PATH = process.env.SOCK_PATH || '/tmp/minios.sock';
const WS_PORT = parseInt(process.env.WS_PORT || '8080');

// Clean up stale socket file from a previous run
try { fs.unlinkSync(SOCK_PATH); } catch { /* not exist: ok */ }

const wss = new WebSocketServer({ port: WS_PORT });
console.log(`[bridge] WebSocket escuchando en ws://localhost:${WS_PORT}`);

// AF_UNIX server: scheduler (miniOS) connects here to stream events.
// Accepts multiple sequential connections (reconnects work automatically).
const server = net.createServer((client) => {
    console.log('[bridge] Scheduler conectado');

    const rl = readline.createInterface({ input: client });

    rl.on('line', (line) => {
        if (!line.trim()) return;

        const ts = new Date().toISOString().substring(11, 23);
        const clientCount = wss.clients.size;

        wss.clients.forEach(ws => {
            if (ws.readyState === 1) ws.send(line);
        });

        console.log(`[${ts}] → ${clientCount} dash(s): ${line.substring(0, 80)}`);
    });

    client.on('close', () => {
        console.log('[bridge] Scheduler desconectado');
        
        // Notificar a todos los dashboards que el scheduler se cerró
        const msg = JSON.stringify({
            type: 'SCHEDULER_STOPPED',
            ts: new Date().getTime() / 1000
        }) + '\n';
        
        wss.clients.forEach(ws => {
            if (ws.readyState === 1) ws.send(msg);
        });
        
        console.log('[bridge] Notificado a dashboards que scheduler se cerró');
        
        // Cerrar dashboard y bridge
        setTimeout(() => {
            console.log('[bridge] Cerrando dashboard en puerto 5173...');
            try {
                // Matar el proceso vite (dashboard)
                execSync("pkill -f 'vite' 2>/dev/null || true", { stdio: 'ignore' });
                console.log('[bridge] Dashboard cerrado');
            } catch (e) {
                console.log('[bridge] Dashboard ya estaba cerrado');
            }
            
            console.log('[bridge] Cerrando bridge...');
            process.exit(0);
        }, 100);
    });

    client.on('error', (err) => {
        console.error(`[bridge] Error en conexion del scheduler: ${err.message}`);
    });
});

server.on('error', (err) => {
    console.error(`[bridge] Error del servidor: ${err.message}`);
    process.exit(1);
});

server.listen(SOCK_PATH, () => {
    console.log(`[bridge] Socket Unix escuchando en ${SOCK_PATH}`);
    console.log('[bridge] Esperando scheduler (./minios → log on)...');
});

wss.on('connection', (ws) => {
    console.log(`[bridge] Dashboard conectado (total: ${wss.clients.size})`);
    ws.on('close', () => {
        console.log(`[bridge] Dashboard desconectado (total: ${wss.clients.size})`);
    });
});

process.on('SIGINT', () => {
    console.log('\n[bridge] Cerrando...');
    server.close();
    wss.close();
    try { fs.unlinkSync(SOCK_PATH); } catch {}
    process.exit(0);
});

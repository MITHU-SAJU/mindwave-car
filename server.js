const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');
const JSON_FILE = path.join(DATA_DIR, 'race_history.json');
const CSV_FILE = path.join(DATA_DIR, 'race_participants.csv');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(CSV_FILE)) {
  const csvHeader = 'Race ID,Player ID,Player Name,Best Lap,Laps Completed,Target Laps,Status,Timestamp,Time Logged\n';
  fs.writeFileSync(CSV_FILE, csvHeader, 'utf8');
}

if (!fs.existsSync(JSON_FILE)) {
  fs.writeFileSync(JSON_FILE, '[]', 'utf8');
}

// MIME types for static server
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  // CORS headers for multi-device tablet connections
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = reqUrl.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // API Route: Save participant to disk file (JSON & CSV)
  if (pathname === '/api/save-participant') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', message: 'API save-participant endpoint active. Send POST request with participant payload.' }));
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        if (!body || !body.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Empty body' }));
          return;
        }

        let entry;
        try {
          entry = JSON.parse(body);
        } catch (parseErr) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
          return;
        }

        if (!entry || typeof entry !== 'object') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid payload' }));
          return;
        }

        // Format fields with string conversions and fallbacks
        const raceId = String(entry.race_id || entry.raceId || `race_${Date.now()}`);
        const pId = String(entry.id !== undefined && entry.id !== null ? entry.id : (entry.playerId || '1'));
        const rawName = entry.name || entry.player_name || entry.driver_name;
        const pName = String(rawName || `Driver ${pId}`).trim() || `Driver ${pId}`;
        const bestLap = String(entry.best_lap || entry.fastest_lap_str || entry.bestLap || '--');
        const laps = parseInt(entry.laps, 10) || 0;
        const targetLaps = parseInt(entry.target_laps || entry.targetLaps, 10) || 8;
        const isWinner = !!(entry.is_winner || entry.isWinner);
        const status = String(entry.status || (isWinner ? '🏆 1st Place' : 'PARTICIPANT'));
        const timestamp = Number(entry.timestamp) || Date.now();
        const timeStr = String(entry.time_str || entry.timeStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        const recordObj = {
          entry_id: String(entry.entry_id || `${raceId}_${pId}`),
          race_id: raceId,
          id: pId,
          name: pName,
          best_lap: bestLap,
          laps: laps,
          target_laps: targetLaps,
          is_winner: isWinner,
          status: status,
          timestamp: timestamp,
          time_str: timeStr
        };

        // Read existing JSON history safely
        let history = [];
        try {
          if (fs.existsSync(JSON_FILE)) {
            const raw = fs.readFileSync(JSON_FILE, 'utf8');
            history = JSON.parse(raw);
            if (!Array.isArray(history)) history = [];
          }
        } catch (e) {
          history = [];
        }

        const existingIdx = history.findIndex(h => h && (h.entry_id === recordObj.entry_id || (h.race_id === recordObj.race_id && String(h.id) === recordObj.id)));
        if (existingIdx >= 0) {
          history[existingIdx] = recordObj;
        } else {
          history.unshift(recordObj);
        }

        if (history.length > 200) history = history.slice(0, 200);

        // Save JSON file on disk safely
        try {
          fs.writeFileSync(JSON_FILE, JSON.stringify(history, null, 2), 'utf8');
        } catch (jsonErr) {
          console.warn('[DISK SAVE WARNING] Unable to write JSON history file:', jsonErr.message);
        }

        // Append to CSV log file on disk safely (handles EBUSY file locks when opened in Excel on Windows)
        try {
          const csvLine = `"${recordObj.race_id}","${recordObj.id}","${recordObj.name.replace(/"/g, '""')}","${recordObj.best_lap.replace(/"/g, '""')}",${recordObj.laps},${recordObj.target_laps},"${recordObj.status.replace(/"/g, '""')}","${recordObj.timestamp}","${recordObj.time_str.replace(/"/g, '""')}"\n`;
          fs.appendFileSync(CSV_FILE, csvLine, 'utf8');
        } catch (csvErr) {
          console.warn('[DISK SAVE WARNING] Unable to append to CSV file (file may be open in Excel):', csvErr.message);
        }

        console.log(`[DISK FILE SAVED] Participant recorded: ${recordObj.name} (${recordObj.best_lap}) -> data/race_participants.csv`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: history.length, file: 'data/race_participants.csv' }));
      } catch (err) {
        console.error('Error saving participant to disk file:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API Route: Get history from disk file
  if (pathname === '/api/history') {
    try {
      if (fs.existsSync(JSON_FILE)) {
        const raw = fs.readFileSync(JSON_FILE, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(raw || '[]');
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('[]');
      }
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    }
    return;
  }

  // API Route: Clear history files from disk
  if (pathname === '/api/clear-history') {
    try {
      try {
        fs.writeFileSync(JSON_FILE, '[]', 'utf8');
      } catch (e) {}

      try {
        const csvHeader = 'Race ID,Player ID,Player Name,Best Lap,Laps Completed,Target Laps,Status,Timestamp,Time Logged\n';
        fs.writeFileSync(CSV_FILE, csvHeader, 'utf8');
      } catch (e) {}

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Static File Serving (prefer dist directory if built)
  const distDir = path.join(__dirname, 'dist');
  const baseDir = fs.existsSync(distDir) ? distDir : __dirname;
  
  let relPath = pathname === '/' ? 'index.html' : pathname;
  let filePath = path.join(baseDir, relPath);

  // If path doesn't exist and doesn't have an extension, serve index.html (SPA fallback)
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    filePath = path.join(baseDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html for SPA
        fs.readFile(path.join(baseDir, 'index.html'), (indexErr, indexContent) => {
          if (indexErr) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 File Not Found</h1>');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent, 'utf8');
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🧠🏎️ MINDWAVE RACING DISK STORAGE SERVER RUNNING!`);
  console.log(`👉 Local:   http://localhost:${PORT}`);
  console.log(`👉 LAN/Tab: http://0.0.0.0:${PORT}`);
  console.log(`📁 All player names & race data auto-saved on hard drive to:`);
  console.log(`   - ${CSV_FILE}`);
  console.log(`   - ${JSON_FILE}\n`);
});

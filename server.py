import http.server
import socketserver
import json
import csv
import os
import urllib.parse
from datetime import datetime

PORT = 8080
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
JSON_FILE = os.path.join(DATA_DIR, 'race_history.json')
CSV_FILE = os.path.join(DATA_DIR, 'race_participants.csv')

if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR, exist_ok=True)

if not os.path.exists(CSV_FILE):
    with open(CSV_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Race ID', 'Player ID', 'Player Name', 'Best Lap', 'Laps Completed', 'Target Laps', 'Status', 'Timestamp', 'Time Logged'])

if not os.path.exists(JSON_FILE):
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        pathname = parsed.path.rstrip('/') or '/'
        if pathname == '/api/history':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            try:
                if os.path.exists(JSON_FILE):
                    with open(JSON_FILE, 'r', encoding='utf-8') as f:
                        self.wfile.write(f.read().encode('utf-8'))
                else:
                    self.wfile.write(b'[]')
            except Exception:
                self.wfile.write(b'[]')
            return
        if pathname == '/api/save-participant':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"ok","message":"API save-participant endpoint active. Send POST request with participant payload."}')
            return
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        pathname = parsed.path.rstrip('/') or '/'
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ''

        if pathname == '/api/save-participant':
            try:
                if not body or not body.strip():
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(b'{"error":"Empty body"}')
                    return
                try:
                    entry = json.loads(body)
                except Exception:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(b'{"error":"Invalid JSON payload"}')
                    return

                race_id = str(entry.get('race_id') or entry.get('raceId') or f"race_{int(datetime.now().timestamp()*1000)}")
                p_id = str(entry.get('id') if entry.get('id') is not None else entry.get('playerId', '1'))
                raw_name = entry.get('name') or entry.get('player_name') or entry.get('driver_name')
                name = str(raw_name or f"Driver {p_id}").strip() or f"Driver {p_id}"
                best_lap = str(entry.get('best_lap') or entry.get('fastest_lap_str') or entry.get('bestLap') or '--')
                laps = int(entry.get('laps', 0))
                target_laps = int(entry.get('target_laps') or entry.get('targetLaps') or 8)
                is_winner = bool(entry.get('is_winner') or entry.get('isWinner'))
                status = str(entry.get('status') or ('🏆 1st Place' if is_winner else 'PARTICIPANT'))
                timestamp = int(entry.get('timestamp') or int(datetime.now().timestamp() * 1000))
                time_str = str(entry.get('time_str') or entry.get('timeStr') or datetime.now().strftime('%I:%M %p'))

                # Write to CSV file on disk safely
                try:
                    with open(CSV_FILE, 'a', newline='', encoding='utf-8') as f:
                        writer = csv.writer(f)
                        writer.writerow([race_id, p_id, name, best_lap, laps, target_laps, status, timestamp, time_str])
                except Exception as csv_err:
                    print(f"[DISK SAVE WARNING] Unable to write CSV (file may be open in Excel): {csv_err}")

                # Write to JSON file on disk safely
                history = []
                try:
                    if os.path.exists(JSON_FILE):
                        with open(JSON_FILE, 'r', encoding='utf-8') as f:
                            history = json.load(f)
                            if not isinstance(history, list):
                                history = []
                except Exception:
                    history = []

                entry_key = str(entry.get('entry_id') or f'{race_id}_{p_id}')
                record_obj = {
                    'entry_id': entry_key,
                    'race_id': race_id,
                    'id': p_id,
                    'name': name,
                    'best_lap': best_lap,
                    'laps': laps,
                    'target_laps': target_laps,
                    'is_winner': is_winner,
                    'status': status,
                    'timestamp': timestamp,
                    'time_str': time_str
                }

                updated = False
                for idx, item in enumerate(history):
                    if isinstance(item, dict) and (item.get('entry_id') == entry_key or (item.get('race_id') == race_id and str(item.get('id')) == p_id)):
                        history[idx] = record_obj
                        updated = True
                        break
                if not updated:
                    history.insert(0, record_obj)

                try:
                    with open(JSON_FILE, 'w', encoding='utf-8') as f:
                        json.dump(history[:200], f, indent=2)
                except Exception as json_err:
                    print(f"[DISK SAVE WARNING] Unable to write JSON: {json_err}")

                print(f"[DISK SAVED] Participant recorded: {name} ({best_lap}) -> data/race_participants.csv")

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            return

        if pathname == '/api/clear-history':
            try:
                try:
                    with open(JSON_FILE, 'w', encoding='utf-8') as f:
                        json.dump([], f)
                except Exception:
                    pass
                try:
                    with open(CSV_FILE, 'w', newline='', encoding='utf-8') as f:
                        writer = csv.writer(f)
                        writer.writerow(['Race ID', 'Player ID', 'Player Name', 'Best Lap', 'Laps Completed', 'Target Laps', 'Status', 'Timestamp', 'Time Logged'])
                except Exception:
                    pass
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"success":true}')
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    print(f"\n🧠🏎️ MINDWAVE RACING PYTHON DISK STORAGE SERVER RUNNING!")
    print(f"👉 Local:   http://localhost:{PORT}")
    print(f"👉 LAN/Tab: http://0.0.0.0:{PORT}")
    print(f"📁 Auto-saving CSV data on hard drive to: {CSV_FILE}\n")
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('0.0.0.0', PORT), CustomHTTPRequestHandler) as httpd:
        httpd.serve_forever()

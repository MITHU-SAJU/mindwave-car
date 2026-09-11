# 🧠🏎️ Mindwave Car Racing — React Bootstrap Leaderboard & Telemetry

A modern **React + React-Bootstrap** frontend application designed for 2-player car racing events, featuring an **Operator Control Panel**, **Public TV/Projector Display**, and real-time cross-tab synchronization.

---

## 🚀 How to Run the App

### Option 1: Node.js Production Server (Recommended)

1. Open PowerShell / Command Prompt in the project folder:
   ```powershell
   cd c:\projects\mindwave-car-race-leaderboard
   ```

2. Start the server:
   ```powershell
   npm start
   ```
   *(or `node server.js`)*

3. Open your browser and navigate to:
   - **Operator Control Screen**: [http://localhost:8080](http://localhost:8080)
   - **Public TV Leaderboard**: [http://localhost:8080?view=public](http://localhost:8080?view=public)

---

### Option 2: Vite Development Mode (With Hot Reloading)

1. Run the Vite dev server:
   ```powershell
   npm run dev
   ```

2. Open the dev URL provided in the terminal (usually [http://localhost:3000](http://localhost:3000)).

---

## 📺 Dual Screen Setup (Operator + TV Display)

You can run two browser tabs/windows simultaneously (e.g. on separate monitors or a TV projector):

1. **Tab 1 (Operator View)**: Open `http://localhost:8080`
   - Enter Player names and click **START RACE**.
   - Use the big **+ LAP** touch targets or hotkeys (`1`/`A` for Player 1, `2`/`L` for Player 2).
   - Click **END RACE** to conclude the race.

2. **Tab 2 (Public TV Display)**: Open `http://localhost:8080?view=public`
   - High-visibility screen designed for spectators/TVs.
   - Automatically updates in real time whenever the operator adds a lap or finishes a race.

---

## 📱 iPad / Tablet / LAN Access

To access the app from an iPad or phone on the same Wi-Fi network:

1. Find your laptop IP address by typing `ipconfig` in PowerShell (e.g. `192.168.1.40`).
2. Start the server (`npm start`).
3. On your iPad browser, open:
   `http://<YOUR_LAPTOP_IP>:8080` (e.g., `http://192.168.1.40:8080`).

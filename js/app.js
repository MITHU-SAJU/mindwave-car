/**
 * Mindwave Slot Car Racing — Single-Tab Application Logic & Controller
 */

class MindwaveApp {
  constructor() {
    this.timerInterval = null;
    this.renderedWinner = null;
    this.selectedSetupLaps = 8;

    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase();
    this.isLeaderboardView = (params.get('view') === 'leaderboard') || path.endsWith('leaderboard.html');

    this.init();
  }

  init() {
    this.bindEvents();
    this.bindKeyboardShortcuts();
    this.subscribeToState();
    this.startLiveTimer();

    // Initial render based on state
    this.render(window.raceStateManager.getState());
  }

  bindEvents() {
    // Setup Form & Laps Selector
    const formSetup = document.getElementById('setup-form');
    const inputLaps = document.getElementById('input-setup-laps');
    const lapOptBtns = document.querySelectorAll('.btn-lap-opt');

    lapOptBtns.forEach(btn => {
      btn.onclick = () => {
        lapOptBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const lapsVal = parseInt(btn.dataset.laps, 10);
        this.selectedSetupLaps = lapsVal;
        if (inputLaps) inputLaps.value = lapsVal;
      };
    });

    if (inputLaps) {
      inputLaps.oninput = () => {
        const val = parseInt(inputLaps.value, 10);
        if (!isNaN(val) && val > 0) {
          this.selectedSetupLaps = val;
          lapOptBtns.forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.laps, 10) === val);
          });
        }
      };
    }

    if (formSetup) {
      formSetup.onsubmit = (e) => {
        e.preventDefault();
        this.startRaceFromSetup();
      };
    }

    // Leaderboard & Race View Controls
    const btnResetRace = document.getElementById('btn-reset-race');
    const btnConfirmResetModal = document.getElementById('btn-confirm-reset-modal');
    const btnConfirmResetWinner = document.getElementById('btn-confirm-reset');
    const btnCancelReset = document.getElementById('btn-cancel-reset');

    const btnOpenConfig = document.getElementById('btn-open-config');
    const btnSaveConfig = document.getElementById('btn-save-config');
    const btnCancelConfig = document.getElementById('btn-cancel-config');

    const btnExportResults = document.getElementById('btn-export-results');
    const btnCloseWinnerModal = document.getElementById('btn-close-winner-modal');
    const btnToggleMute = document.getElementById('btn-toggle-mute');

    if (btnToggleMute) {
      btnToggleMute.onclick = () => {
        const isMuted = window.soundSynth.toggleMute();
        btnToggleMute.innerHTML = isMuted ? '🔇 Muted' : '🔊 Sound On';
      };
    }

    if (btnResetRace) {
      btnResetRace.onclick = () => {
        const modal = document.getElementById('confirm-reset-modal');
        if (modal) modal.classList.add('active');
      };
    }

    const performRaceReset = () => {
      const confirmModal = document.getElementById('confirm-reset-modal');
      if (confirmModal) confirmModal.classList.remove('active');
      const winnerOverlay = document.getElementById('winner-overlay');
      if (winnerOverlay) winnerOverlay.classList.remove('active');
      if (window.confettiEngine) window.confettiEngine.stop();
      this.renderedWinner = null;

      // Clear setup form and text input fields for next round
      const formSetup = document.getElementById('setup-form');
      if (formSetup) formSetup.reset();

      const p1Input = document.getElementById('input-setup-p1');
      const p2Input = document.getElementById('input-setup-p2');
      if (p1Input) { p1Input.value = ''; p1Input.setAttribute('value', ''); }
      if (p2Input) { p2Input.value = ''; p2Input.setAttribute('value', ''); }

      window.raceStateManager.resetRace();
    };

    if (btnConfirmResetModal) btnConfirmResetModal.onclick = performRaceReset;
    if (btnConfirmResetWinner) btnConfirmResetWinner.onclick = performRaceReset;

    if (btnCancelReset) {
      btnCancelReset.onclick = () => {
        const modal = document.getElementById('confirm-reset-modal');
        if (modal) modal.classList.remove('active');
      };
    }

    if (btnOpenConfig) {
      btnOpenConfig.onclick = () => {
        const state = window.raceStateManager.getState();
        const inputTargetLaps = document.getElementById('config-target-laps');
        const inputP1Name = document.getElementById('config-p1-name');
        const inputP2Name = document.getElementById('config-p2-name');

        if (inputTargetLaps) inputTargetLaps.value = state.target_laps || 8;
        if (inputP1Name) inputP1Name.value = (state.players['1'] && state.players['1'].name) ? state.players['1'].name : '';
        if (inputP2Name) inputP2Name.value = (state.players['2'] && state.players['2'].name) ? state.players['2'].name : '';

        document.getElementById('config-modal').classList.add('active');
      };
    }

    if (btnSaveConfig) {
      btnSaveConfig.onclick = () => {
        const state = window.raceStateManager.getState();
        const targetLaps = document.getElementById('config-target-laps').value;
        const p1Name = document.getElementById('config-p1-name').value;
        const p2Name = document.getElementById('config-p2-name').value;

        const updatedPlayers = JSON.parse(JSON.stringify(state.players));
        if (updatedPlayers['1']) updatedPlayers['1'].name = p1Name.trim();
        if (updatedPlayers['2']) updatedPlayers['2'].name = p2Name.trim();

        window.raceStateManager.updateConfig(targetLaps, updatedPlayers);
        document.getElementById('config-modal').classList.remove('active');
      };
    }

    if (btnCancelConfig) {
      btnCancelConfig.onclick = () => {
        document.getElementById('config-modal').classList.remove('active');
      };
    }

    if (btnExportResults) {
      btnExportResults.onclick = () => this.exportResultsCSV();
    }

    if (btnCloseWinnerModal) {
      btnCloseWinnerModal.onclick = () => {
        document.getElementById('winner-overlay').classList.remove('active');
      };
    }

    const btnOpenLeaderboardWin = document.getElementById('btn-open-leaderboard-win');
    if (btnOpenLeaderboardWin) {
      btnOpenLeaderboardWin.onclick = () => {
        window.open('leaderboard.html', '_blank');
      };
    }

    const btnFullscreenToggle = document.getElementById('btn-fullscreen-toggle');
    if (btnFullscreenToggle) {
      btnFullscreenToggle.onclick = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => console.log(err));
          btnFullscreenToggle.textContent = '✖ Exit Fullscreen';
        } else {
          document.exitFullscreen().catch(err => console.log(err));
          btnFullscreenToggle.textContent = '🖥️ Fullscreen';
        }
      };
    }

    const btnSwitchToController = document.getElementById('btn-switch-to-controller');
    if (btnSwitchToController) {
      btnSwitchToController.onclick = () => {
        window.location.href = 'index.html';
      };
    }

    const btnClearHistory = document.getElementById('btn-clear-history');
    if (btnClearHistory) {
      btnClearHistory.onclick = () => {
        if (confirm('Are you sure you want to clear the last 10 participants history?')) {
          window.raceStateManager.clearHistory();
        }
      };
    }
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore key events when user is typing in form inputs or modals
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const state = window.raceStateManager.getState();

      // Setup view shortcuts
      if (!state.started_at) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.startRaceFromSetup();
        }
        return;
      }

      // Race view hotkeys
      const key = e.key.toLowerCase();
      if (key === '1' || key === 'a') {
        e.preventDefault();
        this.triggerPlayerLap('1');
      } else if (key === '2' || key === 'l') {
        e.preventDefault();
        this.triggerPlayerLap('2');
      } else if (e.key === ' ' || key === 'b' || key === '3') {
        e.preventDefault();
        if (window.soundSynth && window.soundSynth.playBothLapsPing) {
          window.soundSynth.playBothLapsPing();
        }
        if (window.raceStateManager && window.raceStateManager.addBothLaps) {
          window.raceStateManager.addBothLaps();
        }
      }
    });
  }

  startRaceFromSetup() {
    const p1Input = document.getElementById('input-setup-p1');
    const p2Input = document.getElementById('input-setup-p2');
    const lapsInput = document.getElementById('input-setup-laps');

    const p1Name = p1Input ? p1Input.value.trim() : '';
    const p2Name = p2Input ? p2Input.value.trim() : '';
    const targetLaps = parseInt(lapsInput ? lapsInput.value : '8', 10) || 8;

    const state = window.raceStateManager.getState();
    const updatedPlayers = JSON.parse(JSON.stringify(state.players));

    if (!updatedPlayers['1']) {
      updatedPlayers['1'] = { id: '1', name: p1Name, laps: 0, lap_times: [], lap_timestamps: [], status: 'waiting' };
    } else {
      updatedPlayers['1'].name = p1Name;
    }

    if (!updatedPlayers['2']) {
      updatedPlayers['2'] = { id: '2', name: p2Name, laps: 0, lap_times: [], lap_timestamps: [], status: 'waiting' };
    } else {
      updatedPlayers['2'].name = p2Name;
    }

    window.raceStateManager.updateConfig(targetLaps, updatedPlayers);
    window.soundSynth.playStartBeep();
    window.raceStateManager.startRace();

    // Clear setup text inputs and reset form so the next round starts with empty fields
    const formSetup = document.getElementById('setup-form');
    if (formSetup) formSetup.reset();
    if (p1Input) { p1Input.value = ''; p1Input.setAttribute('value', ''); }
    if (p2Input) { p2Input.value = ''; p2Input.setAttribute('value', ''); }
  }

  triggerPlayerLap(playerId) {
    const state = window.raceStateManager.getState();
    const player = state.players[playerId];
    if (player && player.status !== 'finished') {
      const btn = document.getElementById(`btn-tap-p${playerId}`);
      if (btn) {
        btn.classList.remove('active-flash');
        void btn.offsetWidth;
        btn.classList.add('active-flash');
      }
      if ('vibrate' in navigator) navigator.vibrate(30);
      window.soundSynth.playLapPing(playerId);
      window.raceStateManager.addLap(playerId);
    }
  }

  subscribeToState() {
    window.raceStateManager.subscribe((state, eventMeta) => {
      this.render(state, eventMeta);
    });
  }

  startLiveTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      const state = window.raceStateManager.getState();
      this.updateTimers(state);
    }, 50);
  }

  updateTimers(state) {
    if (!state || !state.started_at) {
      const elHudTimer = document.getElementById('hud-timer-value');
      if (elHudTimer) elHudTimer.textContent = '00:00.00';
      const elLbTimer = document.getElementById('lb-timer-value');
      if (elLbTimer) elLbTimer.textContent = '00:00.00';
      return;
    }

    const now = state.ended_at || Date.now();
    const elapsedMs = Math.max(0, now - state.started_at);
    const formatted = this.formatDurationMs(elapsedMs);

    const elHudTimer = document.getElementById('hud-timer-value');
    if (elHudTimer) elHudTimer.textContent = formatted;
    const elLbTimer = document.getElementById('lb-timer-value');
    if (elLbTimer) elLbTimer.textContent = formatted;
  }

  formatDurationMs(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);

    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');
    const hStr = String(hundredths).padStart(2, '0');

    return `${mStr}:${sStr}.${hStr}`;
  }

  render(state, eventMeta) {
    const setupView = document.getElementById('setup-view');
    const raceView = document.getElementById('race-view');
    const leaderboardView = document.getElementById('leaderboard-view');

    if (this.isLeaderboardView) {
      if (setupView) setupView.classList.remove('active');
      if (raceView) raceView.classList.remove('active');
      if (leaderboardView) leaderboardView.classList.add('active');
      this.renderLeaderboardView(state, eventMeta);
      return;
    }

    if (leaderboardView) leaderboardView.classList.remove('active');

    // Switch between Setup View and Race View seamlessly
    if (!state.started_at) {
      if (setupView) setupView.classList.add('active');
      if (raceView) raceView.classList.remove('active');
      this.renderSetupView(state);
    } else {
      if (setupView) setupView.classList.remove('active');
      if (raceView) raceView.classList.add('active');
      this.renderRaceView(state, eventMeta);
    }
  }

  renderLeaderboardView(state, eventMeta) {
    const lbTargetBadge = document.getElementById('lb-target-laps');
    if (lbTargetBadge) lbTargetBadge.textContent = `${(state && state.target_laps) || 8} LAPS`;

    const lbGrid = document.getElementById('lb-grid');
    if (!lbGrid) return;
    lbGrid.innerHTML = '';

    const carIcons = { '1': '🏎️', '2': '⚡', '3': '🚀', '4': '🔥' };

    const playersObj = (state && state.players) ? state.players : {};
    const playersList = Object.values(playersObj).slice();

    // Sort players by position (laps desc, then last lap timestamp asc)
    playersList.sort((a, b) => {
      const aLaps = (a && typeof a.laps === 'number') ? a.laps : 0;
      const bLaps = (b && typeof b.laps === 'number') ? b.laps : 0;
      if (bLaps !== aLaps) return bLaps - aLaps;

      const stampsA = (a && Array.isArray(a.lap_timestamps)) ? a.lap_timestamps : [];
      const stampsB = (b && Array.isArray(b.lap_timestamps)) ? b.lap_timestamps : [];

      const lastA = stampsA.length > 0 ? stampsA[stampsA.length - 1] : Infinity;
      const lastB = stampsB.length > 0 ? stampsB[stampsB.length - 1] : Infinity;
      return lastA - lastB;
    });

    const rankBadges = ['🥇 1ST', '🥈 2ND', '🥉 3RD', '4TH'];

    playersList.forEach((p, index) => {
      if (!p) return;
      const target = (state && state.target_laps) ? state.target_laps : 8;
      const pLaps = (typeof p.laps === 'number') ? p.laps : 0;
      const pct = Math.min(100, Math.round((pLaps / target) * 100));

      const bestLapVal = (typeof p.best_lap === 'number') ? p.best_lap.toFixed(2) + 's' : '--';
      const lastLapVal = (typeof p.last_lap_time === 'number') ? p.last_lap_time.toFixed(2) + 's' : '--';

      const lapTimes = Array.isArray(p.lap_times) ? p.lap_times : [];
      let splitTimesHtml = '';
      if (lapTimes.length === 0) {
        splitTimesHtml = `<div style="color:var(--text-muted); text-align:center; padding:0.5rem; font-size:0.85rem;">Waiting for lap data...</div>`;
      } else {
        lapTimes.forEach((t, idx) => {
          const isBest = p.best_lap === t;
          const tStr = typeof t === 'number' ? t.toFixed(2) : t;
          splitTimesHtml += `
            <div class="split-item ${isBest ? 'best' : ''}">
              <span class="lap-num">L${idx + 1}</span>
              <span class="lap-time">${tStr}s ${isBest ? '⚡ BEST' : ''}</span>
            </div>
          `;
        });
      }

      const card = document.createElement('div');
      card.className = `player-hud-card p${p.id || '1'}-card`;

      if (eventMeta && eventMeta.type === 'LAP_ADDED' && eventMeta.playerId === p.id) {
        card.classList.add('flash-ping');
      }

      const pStatus = p.status || 'waiting';

      card.innerHTML = `
        <div class="player-hud-header">
          <div class="player-hud-identity">
            <span class="player-car-icon">${carIcons[p.id] || '🏎️'}</span>
            <div>
              <div style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted);">PLAYER ${p.id}</div>
              <div class="player-hud-name">${p.name && p.name.trim() !== '' ? this.escapeHtml(p.name) : '—'}</div>
            </div>
          </div>
          <div class="status-pill ${pStatus}" style="font-size:1rem; padding:0.4rem 1.2rem;">
            ${rankBadges[index] || `#${index + 1}`}
          </div>
        </div>

        <div class="hud-lap-counter-block" style="padding:1.5rem 2rem;">
          <div class="hud-lap-big-num" style="font-size:5.5rem;">${pLaps}</div>
          <div class="hud-lap-label-group">
            <span class="hud-lap-label" style="font-size:1rem;">TARGET LAPS</span>
            <span class="hud-lap-target" style="font-size:2.2rem;">/ ${target}</span>
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-track" style="height:26px;">
            <div class="progress-fill" style="width: ${pct}%;"></div>
          </div>
          <div class="progress-percent-label" style="font-size:0.95rem;">
            <span>RACE PROGRESS</span>
            <span>${pct}%</span>
          </div>
        </div>

        <div class="hud-telemetry-grid">
          <div class="telemetry-box" style="padding:1.2rem;">
            <span class="telemetry-label">LAST LAP</span>
            <span class="telemetry-val" style="font-size:1.8rem;">${lastLapVal}</span>
          </div>
          <div class="telemetry-box" style="padding:1.2rem;">
            <span class="telemetry-label">BEST LAP</span>
            <span class="telemetry-val best" style="font-size:1.8rem;">${bestLapVal}</span>
          </div>
        </div>

        <div class="split-history-card" style="max-height:180px;">
          <div class="split-history-title">Logged Lap Times</div>
          <div id="lb-split-list-p${p.id}" class="split-list">
            ${splitTimesHtml}
          </div>
        </div>
      `;

      lbGrid.appendChild(card);

      const splitListEl = document.getElementById(`lb-split-list-p${p.id}`);
      if (splitListEl) splitListEl.scrollTop = splitListEl.scrollHeight;
    });

    // Render Recent 10 Participants History Table
    const historyTbody = document.getElementById('lb-history-tbody');
    if (historyTbody) {
      const historyList = window.raceStateManager.getRecentParticipants(10);
      if (!historyList || historyList.length === 0) {
        historyTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1.25rem;">No completed race history logged yet. Complete a race to see the last 10 participants!</td></tr>`;
      } else {
        let html = '';
        historyList.forEach((item, index) => {
          html += `
            <tr class="${item.is_winner ? 'winner-row' : ''}">
              <td class="history-rank-col">#${index + 1}</td>
              <td style="font-weight:700;">${item.is_winner ? '🏆 ' : ''}${this.escapeHtml(item.name)}</td>
              <td style="color:var(--accent-gold); font-weight:700;">${item.best_lap}</td>
              <td>${item.laps} / ${item.target_laps} Laps</td>
              <td>${item.status}</td>
              <td style="color:var(--text-muted); font-size:0.85rem;">${item.time_str || '--'}</td>
            </tr>
          `;
        });
        historyTbody.innerHTML = html;
      }
    }

    // Check for Winner Screen Trigger
    if (state && state.winner && this.renderedWinner !== state.winner) {
      this.renderedWinner = state.winner;
      this.showWinnerScreen(state);
    } else if (state && !state.winner && this.renderedWinner) {
      this.renderedWinner = null;
      document.getElementById('winner-overlay').classList.remove('active');
      if (window.confettiEngine) window.confettiEngine.stop();
    }
  }

  renderSetupView(state) {
    const p1Input = document.getElementById('input-setup-p1');
    const p2Input = document.getElementById('input-setup-p2');
    const lapsInput = document.getElementById('input-setup-laps');

    if (p1Input && document.activeElement !== p1Input) {
      p1Input.value = (state.players && state.players['1'] && state.players['1'].name) ? state.players['1'].name : '';
    }
    if (p2Input && document.activeElement !== p2Input) {
      p2Input.value = (state.players && state.players['2'] && state.players['2'].name) ? state.players['2'].name : '';
    }
    if (lapsInput && document.activeElement !== lapsInput) {
      lapsInput.value = (state && state.target_laps) || 8;
    }
  }

  renderRaceView(state, eventMeta) {
    // Target laps badge
    const targetBadge = document.getElementById('hud-target-laps');
    if (targetBadge) targetBadge.textContent = `${state.target_laps} LAPS`;

    // Render Side-by-side Player Cards
    const hudGrid = document.getElementById('hud-grid');
    if (!hudGrid) return;

    hudGrid.innerHTML = '';

    const carIcons = { '1': '🏎️', '2': '⚡', '3': '🚀', '4': '🔥' };
    const hotkeys = { '1': 'Press 1 or A', '2': 'Press 2 or L' };

    Object.keys(state.players).forEach((id) => {
      const p = state.players[id];
      const target = state.target_laps || 8;
      const pct = Math.min(100, Math.round((p.laps / target) * 100));

      const card = document.createElement('div');
      card.className = `player-hud-card p${id}-card`;
      card.id = `player-card-${id}`;

      if (eventMeta && eventMeta.type === 'LAP_ADDED' && eventMeta.playerId === id) {
        card.classList.add('flash-ping');
      }

      const bestLapStr = p.best_lap !== null ? `${p.best_lap.toFixed(2)}s` : '--';
      const lastLapStr = p.last_lap_time !== null ? `${p.last_lap_time.toFixed(2)}s` : '--';
      const isFinished = p.status === 'finished';

      // Split items history markup
      let splitTimesHtml = '';
      if (p.lap_times.length === 0) {
        splitTimesHtml = `<div style="color:var(--text-muted); text-align:center; padding:0.5rem; font-size:0.85rem;">No laps logged yet</div>`;
      } else {
        p.lap_times.forEach((t, idx) => {
          const isBest = p.best_lap === t;
          splitTimesHtml += `
            <div class="split-item ${isBest ? 'best' : ''}">
              <span class="lap-num">L${idx + 1}</span>
              <span class="lap-time">${t.toFixed(2)}s ${isBest ? '⚡ BEST' : ''}</span>
            </div>
          `;
        });
      }

      card.innerHTML = `
        <div class="player-hud-header">
          <div class="player-hud-identity">
            <span class="player-car-icon">${carIcons[id] || '🏎️'}</span>
            <div>
              <div style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted);">PLAYER ${id}</div>
              <div class="player-hud-name">${p.name && p.name.trim() !== '' ? this.escapeHtml(p.name) : '—'}</div>
            </div>
          </div>
          <div class="status-pill ${p.status}">${p.status.toUpperCase()}</div>
        </div>

        <div class="hud-lap-counter-block">
          <div class="hud-lap-big-num">${p.laps}</div>
          <div class="hud-lap-label-group">
            <span class="hud-lap-label">TARGET</span>
            <span class="hud-lap-target">/ ${target}</span>
          </div>
        </div>

        <!-- Integrated Interactive Tap Button (+1 Lap) -->
        <div class="card-tap-section">
          <button id="btn-tap-p${id}" class="card-tap-button ${isFinished ? 'disabled' : ''}" ${isFinished ? 'disabled' : ''}>
            <div class="tap-main-text">${isFinished ? (state.winner === id ? '🏆 WINNER!' : 'FINISHED') : '+1 LAP'}</div>
            <div class="tap-hotkey-hint">${isFinished ? 'Race Complete' : hotkeys[id] || 'Tap anywhere'}</div>
          </button>
          <button id="btn-undo-p${id}" class="btn undo-btn card-undo-btn" ${p.laps === 0 ? 'disabled' : ''}>
            ↩ Undo Last Lap
          </button>
        </div>

        <div class="progress-bar-container">
          <div class="progress-track">
            <div class="progress-fill" style="width: ${pct}%;"></div>
          </div>
          <div class="progress-percent-label">
            <span>RACE PROGRESS</span>
            <span>${pct}%</span>
          </div>
        </div>

        <div class="hud-telemetry-grid">
          <div class="telemetry-box">
            <span class="telemetry-label">LAST LAP</span>
            <span class="telemetry-val">${lastLapStr}</span>
          </div>
          <div class="telemetry-box">
            <span class="telemetry-label">BEST LAP</span>
            <span class="telemetry-val best">${bestLapStr}</span>
          </div>
        </div>

        <div class="split-history-card">
          <div class="split-history-title">Logged Split Times</div>
          <div id="split-list-p${id}" class="split-list">
            ${splitTimesHtml}
          </div>
        </div>
      `;

      hudGrid.appendChild(card);

      // Scroll split list to bottom
      const splitListEl = document.getElementById(`split-list-p${id}`);
      if (splitListEl) splitListEl.scrollTop = splitListEl.scrollHeight;

      // Attach event listeners for tap button & undo button
      const btnTap = document.getElementById(`btn-tap-p${id}`);
      const btnUndo = document.getElementById(`btn-undo-p${id}`);

      if (btnTap && !isFinished) {
        const handleTap = (e) => {
          e.preventDefault();
          this.triggerPlayerLap(id);
        };
        btnTap.addEventListener('touchstart', handleTap, { passive: false });
        btnTap.addEventListener('click', handleTap);
      }

      if (btnUndo) {
        btnUndo.onclick = (e) => {
          e.preventDefault();
          window.soundSynth.playUndoBeep();
          window.raceStateManager.undoLap(id);
        };
      }
    });

    // Check for Winner Screen Trigger
    if (state.winner && this.renderedWinner !== state.winner) {
      this.renderedWinner = state.winner;
      this.showWinnerScreen(state);
    } else if (!state.winner && this.renderedWinner) {
      this.renderedWinner = null;
      document.getElementById('winner-overlay').classList.remove('active');
      if (window.confettiEngine) window.confettiEngine.stop();
    }
  }

  showWinnerScreen(state) {
    window.raceStateManager.recordRaceParticipants(state);

    const winnerPlayer = state.players[state.winner];
    if (!winnerPlayer) return;

    const overlay = document.getElementById('winner-overlay');
    const winnerNameEl = document.getElementById('winner-player-name');
    const resultsTableEl = document.getElementById('winner-results-matrix');

    if (winnerNameEl) {
      winnerNameEl.textContent = `${winnerPlayer.name} Wins!`;
    }

    if (resultsTableEl) {
      let tbodyHtml = '';
      const totalRaceTime = state.ended_at && state.started_at
        ? ((state.ended_at - state.started_at) / 1000).toFixed(2) + 's'
        : 'Completed';

      Object.values(state.players).forEach((p) => {
        const isWinner = p.id === state.winner;
        const avgLap = p.lap_times.length > 0
          ? (p.lap_times.reduce((a, b) => a + b, 0) / p.lap_times.length).toFixed(2) + 's'
          : '--';

        tbodyHtml += `
          <tr class="${isWinner ? 'winner-row' : ''}">
            <td>${isWinner ? '🏆 ' : ''}${this.escapeHtml(p.name)}</td>
            <td>${p.laps} / ${state.target_laps}</td>
            <td>${p.best_lap ? p.best_lap.toFixed(2) + 's' : '--'}</td>
            <td>${avgLap}</td>
            <td>${isWinner ? `🏆 1st Place (${totalRaceTime})` : '2nd Place'}</td>
          </tr>
        `;
      });

      resultsTableEl.innerHTML = tbodyHtml;
    }

    if (overlay) overlay.classList.add('active');

    window.soundSynth.playVictoryFanfare();
    if (window.confettiEngine) {
      window.confettiEngine.start();
    }
  }

  exportResultsCSV() {
    const state = window.raceStateManager.getState();
    let csv = 'Race ID,Target Laps,Player ID,Player Name,Status,Total Laps,Best Lap (s),Lap Number,Split Time (s),Lap Timestamp\n';

    Object.values(state.players).forEach((p) => {
      if (p.lap_times.length === 0) {
        csv += `"${state.race_id}",${state.target_laps},"${p.id}","${p.name}","${p.status}",0,,\n`;
      } else {
        p.lap_times.forEach((time, idx) => {
          const timestamp = p.lap_timestamps[idx] ? new Date(p.lap_timestamps[idx]).toISOString() : '';
          csv += `"${state.race_id}",${state.target_laps},"${p.id}","${p.name}","${p.status}",${p.laps},${p.best_lap || ''},${idx + 1},${time},"${timestamp}"\n`;
        });
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindwave_race_${state.race_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.mindwaveApp = new MindwaveApp();
});


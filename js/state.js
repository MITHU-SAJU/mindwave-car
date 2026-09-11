/**
 * Mindwave Slot Car Racing — Cross-Tab Shared State & Sync Manager
 * Uses localStorage as source of truth and BroadcastChannel API for instant updates
 */

class RaceStateManager {
  constructor() {
    this.STORAGE_KEY = 'mindwave_race_state';
    this.CHANNEL_NAME = 'mindwave_race_channel';

    this.channel = null;
    this.subscribers = [];
    this.state = this.getInitialState();

    this.initChannel();
  }

  getInitialState() {
    return {
      race_id: 'race_' + Date.now(),
      target_laps: 8,
      started_at: null,
      ended_at: null,
      players: {
        '1': {
          id: '1',
          name: '',
          laps: 0,
          lap_times: [],
          lap_timestamps: [],
          best_lap: null,
          last_lap_time: null,
          status: 'waiting'
        },
        '2': {
          id: '2',
          name: '',
          laps: 0,
          lap_times: [],
          lap_timestamps: [],
          best_lap: null,
          last_lap_time: null,
          status: 'waiting'
        }
      },
      winner: null,
      last_event: null
    };
  }

  initChannel() {
    // Setup BroadcastChannel API
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(this.CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        if (event && event.data) {
          this.state = event.data.state;
          this.notifySubscribers(event.data.eventMeta);
        }
      };
    }

    // Fallback/Complement: localStorage storage event listener
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.state = parsed;
          this.notifySubscribers(parsed.last_event);
        } catch (err) {
          console.error('Error parsing storage update:', err);
        }
      }
    });

    // Initial load on tab initialization
    this.loadState();
  }

  loadState() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.state = JSON.parse(stored);
      } else {
        this.saveState(this.state, { type: 'INIT' });
      }
    } catch (e) {
      console.error('Failed to read state from localStorage:', e);
      this.state = this.getInitialState();
    }

    return this.state;
  }


  saveState(newState, eventMeta = null) {
    this.state = newState;
    if (eventMeta) {
      this.state.last_event = eventMeta;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to write state to localStorage:', e);
    }

    if (this.channel) {
      try {
        this.channel.postMessage({
          state: this.state,
          eventMeta: eventMeta
        });
      } catch (e) {
        console.error('Failed to post BroadcastChannel message:', e);
      }
    }

    this.notifySubscribers(eventMeta);
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.subscribers.push(callback);
    }
  }

  notifySubscribers(eventMeta) {
    this.subscribers.forEach((cb) => {
      try {
        cb(this.state, eventMeta);
      } catch (err) {
        console.error('Subscriber callback error:', err);
      }
    });
  }

  getState() {
    return this.state;
  }

  // State Mutators
  startRace() {
    const state = JSON.parse(JSON.stringify(this.state));
    state.started_at = Date.now();
    state.ended_at = null;
    state.winner = null;

    Object.keys(state.players).forEach((id) => {
      state.players[id].status = 'racing';
      state.players[id].laps = 0;
      state.players[id].lap_times = [];
      state.players[id].lap_timestamps = [];
      state.players[id].best_lap = null;
      state.players[id].last_lap_time = null;
    });

    const eventMeta = { type: 'START_RACE', timestamp: state.started_at };
    this.saveState(state, eventMeta);
    this.recordRaceParticipants(state);
  }

  addLap(playerId) {
    const state = JSON.parse(JSON.stringify(this.state));
    const player = state.players[playerId];

    if (!player) return;

    // Auto-start race if not started yet
    if (!state.started_at) {
      state.started_at = Date.now();
      Object.keys(state.players).forEach((id) => {
        state.players[id].status = 'racing';
      });
    }

    if (player.status === 'finished') return;

    const now = Date.now();
    const lastTimestamp = player.lap_timestamps.length > 0
      ? player.lap_timestamps[player.lap_timestamps.length - 1]
      : state.started_at;

    const lapDurationSeconds = parseFloat(((now - lastTimestamp) / 1000).toFixed(2));

    player.laps += 1;
    player.lap_times.push(lapDurationSeconds);
    player.lap_timestamps.push(now);
    player.last_lap_time = lapDurationSeconds;

    if (player.best_lap === null || lapDurationSeconds < player.best_lap) {
      player.best_lap = lapDurationSeconds;
    }

    // Check if player completed race target
    if (player.laps >= state.target_laps) {
      player.status = 'finished';
      player.finished_at = now;

      // Set winner if first player to finish
      if (!state.winner) {
        state.winner = playerId;
      }

      // Check if all players finished
      const allFinished = Object.values(state.players).every(p => p.status === 'finished');
      if (allFinished) {
        state.ended_at = now;
      }
    }

    const eventMeta = {
      type: 'LAP_ADDED',
      playerId: playerId,
      lapNumber: player.laps,
      lapTime: lapDurationSeconds,
      timestamp: now
    };

    this.saveState(state, eventMeta);
    this.recordRaceParticipants(state);
  }

  addBothLaps() {
    const state = JSON.parse(JSON.stringify(this.state));

    if (!state.started_at) {
      state.started_at = Date.now();
      Object.keys(state.players).forEach((id) => {
        state.players[id].status = 'racing';
      });
    }

    const now = Date.now();
    let updated = false;

    Object.keys(state.players).forEach((playerId) => {
      const player = state.players[playerId];
      if (!player || player.status === 'finished') return;

      const lastTimestamp = player.lap_timestamps.length > 0
        ? player.lap_timestamps[player.lap_timestamps.length - 1]
        : state.started_at;

      const lapDurationSeconds = parseFloat(((now - lastTimestamp) / 1000).toFixed(2));

      player.laps += 1;
      player.lap_times.push(lapDurationSeconds);
      player.lap_timestamps.push(now);
      player.last_lap_time = lapDurationSeconds;

      if (player.best_lap === null || lapDurationSeconds < player.best_lap) {
        player.best_lap = lapDurationSeconds;
      }

      if (player.laps >= state.target_laps) {
        player.status = 'finished';
        player.finished_at = now;

        if (!state.winner) {
          state.winner = playerId;
        }

        const allFinished = Object.values(state.players).every(p => p.status === 'finished');
        if (allFinished) {
          state.ended_at = now;
        }
      }
      updated = true;
    });

    if (updated) {
      const eventMeta = {
        type: 'BOTH_LAPS_ADDED',
        timestamp: now
      };
      this.saveState(state, eventMeta);
      this.recordRaceParticipants(state);
    }
  }

  undoLap(playerId) {
    const state = JSON.parse(JSON.stringify(this.state));
    const player = state.players[playerId];

    if (!player || player.laps <= 0) return;

    player.laps -= 1;
    player.lap_times.pop();
    player.lap_timestamps.pop();

    if (player.lap_times.length > 0) {
      player.last_lap_time = player.lap_times[player.lap_times.length - 1];
      player.best_lap = Math.min(...player.lap_times);
    } else {
      player.last_lap_time = null;
      player.best_lap = null;
    }

    // If player was finished, flip back to racing
    if (player.status === 'finished') {
      player.status = 'racing';
      delete player.finished_at;

      // Reset winner if this player was recorded as winner
      if (state.winner === playerId) {
        // Re-evaluate if another player was finished earlier
        let earliestWinner = null;
        let earliestTime = Infinity;

        Object.values(state.players).forEach((p) => {
          if (p.status === 'finished' && p.finished_at && p.finished_at < earliestTime) {
            earliestTime = p.finished_at;
            earliestWinner = p.id;
          }
        });

        state.winner = earliestWinner;
      }

      state.ended_at = null;
    }

    const eventMeta = {
      type: 'LAP_UNDO',
      playerId: playerId,
      lapNumber: player.laps,
      timestamp: Date.now()
    };

    this.saveState(state, eventMeta);
  }

  resetRace() {
    // Record active race participants to permanent history BEFORE resetting active state
    if (this.state) {
      this.recordRaceParticipants(this.state);
    }

    const currentTarget = this.state.target_laps || 8;

    const newState = this.getInitialState();
    newState.target_laps = currentTarget;
    newState.race_id = 'race_' + Date.now();

    // Reset player names to empty strings for the next round
    Object.keys(newState.players).forEach((id) => {
      newState.players[id].name = '';
    });

    const eventMeta = { type: 'RESET_RACE', timestamp: Date.now() };
    this.saveState(newState, eventMeta);
  }

  updatePlayerName(playerId, name) {
    const state = JSON.parse(JSON.stringify(this.state));
    if (state.players[playerId]) {
      state.players[playerId].name = name ? name.trim() : '';
      this.saveState(state, { type: 'PLAYER_NAME_CHANGE', playerId: playerId });
      this.recordRaceParticipants(state);
    }
  }

  updateConfig(targetLaps, playersConfig) {
    const state = JSON.parse(JSON.stringify(this.state));
    state.target_laps = parseInt(targetLaps, 10) || 8;

    if (playersConfig && typeof playersConfig === 'object') {
      state.players = playersConfig;
    }

    this.saveState(state, { type: 'CONFIG_CHANGE', timestamp: Date.now() });
    this.recordRaceParticipants(state);
  }

  recordRaceParticipants(state) {
    try {
      if (!state || !state.players) return;
      const HISTORY_KEY = 'mindwave_race_history';
      const stored = localStorage.getItem(HISTORY_KEY);
      let history = stored ? JSON.parse(stored) : [];

      Object.values(state.players).forEach((p) => {
        const hasName = p.name && p.name.trim() !== '';
        const hasLaps = p.laps > 0;

        if (hasName || hasLaps) {
          const isWinner = (state.winner === p.id);
          const pName = hasName ? p.name.trim() : `Driver ${p.id}`;
          const entryKey = `${state.race_id}_${p.id}`;

          const existingIndex = history.findIndex(item => item.entry_id === entryKey || (item.race_id === state.race_id && item.id === p.id));

          const recordObj = {
            entry_id: entryKey,
            race_id: state.race_id,
            id: p.id,
            name: pName,
            best_lap: p.best_lap ? p.best_lap.toFixed(2) + 's' : '--',
            laps: p.laps,
            target_laps: state.target_laps || 8,
            is_winner: isWinner,
            status: isWinner ? '🏆 1st Place' : (p.status === 'finished' || hasLaps ? '2nd Place' : 'Registered'),
            timestamp: p.finished_at || Date.now(),
            time_str: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          if (existingIndex >= 0) {
            history[existingIndex] = recordObj;
          } else {
            history.unshift(recordObj);
          }

        }
      });

      if (history.length > 100) history = history.slice(0, 100);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to record race history:', e);
    }
  }

  getRecentParticipants(limit = 10) {
    try {
      const stored = localStorage.getItem('mindwave_race_history');
      const history = stored ? JSON.parse(stored) : [];
      return history.slice(0, limit);
    } catch (e) {
      console.error('Failed to read race history:', e);
      return [];
    }
  }

  clearHistory() {
    try {
      localStorage.removeItem('mindwave_race_history');
      this.saveState(this.state, { type: 'HISTORY_CLEARED' });
    } catch (e) {
      console.error('Failed to clear race history:', e);
    }
  }
}

window.raceStateManager = new RaceStateManager();

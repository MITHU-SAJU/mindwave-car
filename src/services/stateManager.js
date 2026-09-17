import { saveParticipantToDisk, clearRaceHistoryOnDisk } from './api';

class RaceStateManager {
  constructor() {
    this.STATE_KEY = 'mindwave_active_race_state';
    this.LEADERBOARD_KEY = 'mindwave_racing_leaderboard';
    this.CHANNEL_NAME = 'mindwave_racing_sync';

    this.channel = null;
    this.subscribers = [];
    this.state = this.getInitialState();

    this.initSync();
  }

  getInitialState() {
    return {
      race_id: 'race_' + Date.now(),
      status: 'setup', // 'setup' | 'vs' | 'racing' | 'finished'
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
          last_lap_time: null,
          best_lap: null
        },
        '2': {
          id: '2',
          name: '',
          laps: 0,
          lap_times: [],
          lap_timestamps: [],
          last_lap_time: null,
          best_lap: null
        }
      },
      winner_id: null,
      winner_summary: null
    };
  }

  initSync() {
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(this.CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        if (event && event.data) {
          if (event.data.state) {
            this.state = event.data.state;
          }
          this.notifySubscribers(event.data.eventMeta || { type: 'BROADCAST_EVENT' });
        }
      };
    }

    window.addEventListener('storage', (e) => {
      if (e.key === this.STATE_KEY && e.newValue) {
        try {
          this.state = JSON.parse(e.newValue);
          this.notifySubscribers(this.state.last_event || { type: 'STORAGE_EVENT' });
        } catch (err) {
          console.error('Storage sync error:', err);
        }
      } else if (e.key === this.LEADERBOARD_KEY) {
        this.notifySubscribers({ type: 'LEADERBOARD_UPDATED' });
      }
    });

    this.loadState();
  }

  loadState() {
    try {
      const stored = localStorage.getItem(this.STATE_KEY);
      if (stored) {
        this.state = JSON.parse(stored);
      } else {
        this.saveState(this.state, { type: 'INIT' });
      }
    } catch (e) {
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
      localStorage.setItem(this.STATE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed saving to localStorage:', e);
    }

    if (this.channel) {
      try {
        this.channel.postMessage({
          state: this.state,
          eventMeta: eventMeta
        });
      } catch (e) {}
    }

    this.notifySubscribers(eventMeta);
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.subscribers.push(callback);
      try {
        callback(this.state, { type: 'SUBSCRIBE' });
      } catch (e) {}
    }
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notifySubscribers(eventMeta) {
    this.subscribers.forEach((cb) => {
      try {
        cb(this.state, eventMeta);
      } catch (err) {}
    });
  }

  getState() {
    return this.state;
  }

  startSetup(p1Name, p2Name, targetLaps = 8) {
    const state = this.getInitialState();
    state.race_id = 'race_' + Date.now();
    state.status = 'vs';
    state.target_laps = parseInt(targetLaps, 10) || 8;
    state.players['1'].name = p1Name ? p1Name.trim() : 'Player 1';
    state.players['2'].name = p2Name ? p2Name.trim() : 'Player 2';

    const eventMeta = { type: 'SETUP_MATCHUP', timestamp: Date.now() };
    this.saveState(state, eventMeta);
  }

  launchRace() {
    const state = JSON.parse(JSON.stringify(this.state));
    state.status = 'racing';
    state.started_at = Date.now();

    const eventMeta = { type: 'START_RACE', timestamp: state.started_at };
    this.saveState(state, eventMeta);
  }

  startRace(p1Name, p2Name, targetLaps = 8) {
    const state = this.getInitialState();
    state.race_id = 'race_' + Date.now();
    state.status = 'racing';
    state.target_laps = parseInt(targetLaps, 10) || 8;
    state.started_at = Date.now();

    state.players['1'].name = p1Name ? p1Name.trim() : 'Player 1';
    state.players['2'].name = p2Name ? p2Name.trim() : 'Player 2';

    const eventMeta = { type: 'START_RACE', timestamp: state.started_at };
    this.saveState(state, eventMeta);
  }

  addLap(playerId) {
    if (this.state.status !== 'racing') return;

    const state = JSON.parse(JSON.stringify(this.state));
    const player = state.players[playerId];
    if (!player) return;

    const now = Date.now();
    const lastTimestamp = player.lap_timestamps.length > 0
      ? player.lap_timestamps[player.lap_timestamps.length - 1]
      : state.started_at;

    const lapDuration = parseFloat(((now - lastTimestamp) / 1000).toFixed(2));

    player.laps += 1;
    player.lap_times.push(lapDuration);
    player.lap_timestamps.push(now);
    player.last_lap_time = lapDuration;

    if (player.best_lap === null || lapDuration < player.best_lap) {
      player.best_lap = lapDuration;
    }

    const targetLaps = state.target_laps || 8;
    const raceFinished = player.laps >= targetLaps;

    const eventMeta = {
      type: 'LAP_ADDED',
      playerId: playerId,
      lapNumber: player.laps,
      lapTime: lapDuration,
      timestamp: now
    };

    this.saveState(state, eventMeta);

    if (raceFinished) {
      this.endRace();
    }
  }

  addBothLaps() {
    if (this.state.status !== 'racing') return;

    const state = JSON.parse(JSON.stringify(this.state));
    const now = Date.now();
    let updated = false;
    let raceFinished = false;
    const targetLaps = state.target_laps || 8;

    ['1', '2'].forEach((playerId) => {
      const player = state.players[playerId];
      if (!player) return;

      const lastTimestamp = player.lap_timestamps.length > 0
        ? player.lap_timestamps[player.lap_timestamps.length - 1]
        : state.started_at;

      const lapDuration = parseFloat(((now - lastTimestamp) / 1000).toFixed(2));

      player.laps += 1;
      player.lap_times.push(lapDuration);
      player.lap_timestamps.push(now);
      player.last_lap_time = lapDuration;

      if (player.best_lap === null || lapDuration < player.best_lap) {
        player.best_lap = lapDuration;
      }
      if (player.laps >= targetLaps) {
        raceFinished = true;
      }
      updated = true;
    });

    if (updated) {
      const eventMeta = {
        type: 'BOTH_LAPS_ADDED',
        timestamp: now
      };
      this.saveState(state, eventMeta);

      if (raceFinished) {
        this.endRace();
      }
    }
  }

  undoLap(playerId) {
    if (this.state.status !== 'racing') return;

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

    const eventMeta = { type: 'LAP_UNDO', playerId: playerId, timestamp: Date.now() };
    this.saveState(state, eventMeta);
  }

  endRace() {
    if (this.state.status !== 'racing') return;

    const state = JSON.parse(JSON.stringify(this.state));
    state.status = 'finished';
    state.ended_at = Date.now();

    const p1 = state.players['1'];
    const p2 = state.players['2'];

    // Determine Winner:
    // 1. Most Laps Completed
    // 2. If tied laps, Less Total Lap Time (faster overall race)
    // 3. If tied total time, Less Best Lap Duration (faster single lap)
    // 4. Earliest completion timestamp
    let winnerId = '1';
    let runnerUpId = '2';

    if (p2.laps > p1.laps) {
      winnerId = '2';
      runnerUpId = '1';
    } else if (p1.laps > p2.laps) {
      winnerId = '1';
      runnerUpId = '2';
    } else {
      // Equal Laps: Less time = Faster driver
      const p1TotalTime = p1.lap_times.reduce((sum, t) => sum + t, 0);
      const p2TotalTime = p2.lap_times.reduce((sum, t) => sum + t, 0);

      if (p2TotalTime < p1TotalTime) {
        winnerId = '2';
        runnerUpId = '1';
      } else if (p1TotalTime < p2TotalTime) {
        winnerId = '1';
        runnerUpId = '2';
      } else {
        // Equal total time: Compare fastest single lap (lower value is faster)
        const p1Best = p1.best_lap !== null ? p1.best_lap : Infinity;
        const p2Best = p2.best_lap !== null ? p2.best_lap : Infinity;

        if (p2Best < p1Best) {
          winnerId = '2';
          runnerUpId = '1';
        } else if (p1Best < p2Best) {
          winnerId = '1';
          runnerUpId = '2';
        } else {
          // Final timestamp fallback
          const p1Last = p1.lap_timestamps.length > 0 ? p1.lap_timestamps[p1.lap_timestamps.length - 1] : Infinity;
          const p2Last = p2.lap_timestamps.length > 0 ? p2.lap_timestamps[p2.lap_timestamps.length - 1] : Infinity;
          if (p2Last < p1Last) {
            winnerId = '2';
            runnerUpId = '1';
          }
        }
      }
    }

    state.winner_id = winnerId;

    const winner = state.players[winnerId];
    const runnerUp = state.players[runnerUpId];
    const rawDurationMs = state.ended_at - state.started_at;
    const winnerTotalMs = winner.lap_times.length > 0
      ? Math.round(winner.lap_times.reduce((sum, t) => sum + t, 0) * 1000)
      : rawDurationMs;

    state.winner_summary = {
      winner_id: winnerId,
      winner_name: winner.name,
      winner_laps: winner.laps,
      winner_best_lap: winner.best_lap,
      total_time_ms: winnerTotalMs,
      total_time_str: this.formatTime(winnerTotalMs),
      runner_up_name: runnerUp.name,
      runner_up_laps: runnerUp.laps,
      runner_up_best_lap: runnerUp.best_lap
    };

    // Save completed race to Leaderboard history in Supabase
    this.saveRaceToLeaderboard(state).then(() => {
      const eventMeta = { type: 'END_RACE', timestamp: state.ended_at };
      this.saveState(state, eventMeta);
    });
  }

  resetRace() {
    const newState = this.getInitialState();
    const eventMeta = { type: 'NEW_RACE', timestamp: Date.now() };
    this.saveState(newState, eventMeta);
  }

  // --- LOCATION MANAGEMENT & LEADERBOARD PERSISTENCE ---

  getLocationId() {
    return localStorage.getItem('mindwave_location_id') || 'location_1';
  }

  setLocationId(locationId) {
    const loc = locationId ? String(locationId).trim() : 'location_1';
    localStorage.setItem('mindwave_location_id', loc);
    this.notifySubscribers({ type: 'LOCATION_CHANGED', locationId: loc });
    return loc;
  }

  async saveRaceToLeaderboard(raceState) {
    try {
      const locationId = this.getLocationId();
      const sessionDurationMs = raceState.ended_at - raceState.started_at;

      for (const id of ['1', '2']) {
        const p = raceState.players[id];
        if (p && p.name) {
          const pTotalMs = p.lap_times.length > 0
            ? Math.round(p.lap_times.reduce((sum, t) => sum + t, 0) * 1000)
            : sessionDurationMs;

          const recordObj = {
            entry_id: `${raceState.race_id}_${id}`,
            race_id: raceState.race_id,
            location_id: locationId,
            player_name: p.name,
            laps: p.laps,
            total_time_ms: pTotalMs,
            total_time_str: this.formatTime(pTotalMs),
            fastest_lap: p.best_lap !== null ? p.best_lap : Infinity,
            fastest_lap_str: p.best_lap !== null ? `${p.best_lap.toFixed(2)}s` : '--',
            is_winner: raceState.winner_id === id,
            timestamp: raceState.ended_at
          };

          // Await direct save to Supabase Cloud Database
          await saveParticipantToDisk({
            ...recordObj,
            id: id,
            name: p.name,
            location_id: locationId,
            target_laps: raceState.target_laps,
            status: raceState.winner_id === id ? 'WINNER' : 'RUNNER-UP',
            time_str: recordObj.total_time_str
          });
        }
      }

      // Post update over BroadcastChannel for multi-screen sync
      if (this.channel) {
        try {
          this.channel.postMessage({
            state: this.state,
            eventMeta: { type: 'LEADERBOARD_UPDATED', timestamp: Date.now() }
          });
        } catch (e) {}
      }

      this.notifySubscribers({ type: 'LEADERBOARD_UPDATED' });
    } catch (e) {
      console.error('Failed saving leaderboard entry:', e);
    }
  }

  getLeaderboard(filterLocation = 'all') {
    try {
      const stored = localStorage.getItem(this.LEADERBOARD_KEY);
      let list = stored ? JSON.parse(stored) : [];

      if (filterLocation && filterLocation !== 'all') {
        list = list.filter(item => (item.location_id || 'location_1') === filterLocation);
      }

      // Ensure sorted order
      return list.sort((a, b) => {
        if (b.laps !== a.laps) return b.laps - a.laps;
        if (a.total_time_ms !== b.total_time_ms) return a.total_time_ms - b.total_time_ms;
        return a.fastest_lap - b.fastest_lap;
      });
    } catch (e) {
      return [];
    }
  }

  clearLeaderboard(locationId = 'all') {
    clearRaceHistoryOnDisk(locationId);

    if (locationId === 'all') {
      localStorage.removeItem(this.LEADERBOARD_KEY);
      localStorage.removeItem('mindwave_race_history');
    } else {
      const stored = localStorage.getItem(this.LEADERBOARD_KEY);
      if (stored) {
        const filtered = JSON.parse(stored).filter(item => (item.location_id || 'location_1') !== locationId);
        localStorage.setItem(this.LEADERBOARD_KEY, JSON.stringify(filtered));
      }
    }

    if (this.channel) {
      try {
        this.channel.postMessage({
          state: this.state,
          eventMeta: { type: 'CLEAR_LEADERBOARD', timestamp: Date.now() }
        });
      } catch (e) {}
    }
    this.notifySubscribers({ type: 'CLEAR_LEADERBOARD' });
  }

  clearHistory() {
    this.clearLeaderboard();
  }

  formatTime(ms) {
    if (!ms || ms < 0) return '00:00.00';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  }
}

export const raceStateManager = new RaceStateManager();

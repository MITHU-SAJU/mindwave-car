/**
 * LocalStorage Service for Race Leaderboard & Participant Storage (Frontend-Only)
 * All persistence is handled directly in browser localStorage.
 */

const LEADERBOARD_KEY = 'mindwave_racing_leaderboard';
const HISTORY_KEY = 'mindwave_race_history';

export async function saveParticipantToDisk(recordObj) {
  try {
    if (!recordObj) return { success: true };

    const stored = localStorage.getItem(LEADERBOARD_KEY) || localStorage.getItem(HISTORY_KEY);
    let history = stored ? JSON.parse(stored) : [];

    const entryId = recordObj.entry_id || `${recordObj.race_id}_${recordObj.id || recordObj.playerId || '1'}`;
    const existingIdx = history.findIndex(h => h && (h.entry_id === entryId || (h.race_id === recordObj.race_id && String(h.id) === String(recordObj.id))));

    if (existingIdx >= 0) {
      history[existingIdx] = { ...history[existingIdx], ...recordObj };
    } else {
      history.unshift(recordObj);
    }

    if (history.length > 200) history = history.slice(0, 200);

    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(history));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return { success: true, count: history.length };
  } catch (err) {
    console.error('Error saving participant to localStorage:', err);
    return null;
  }
}

export async function fetchRaceHistory() {
  try {
    const stored = localStorage.getItem(LEADERBOARD_KEY) || localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Error reading race history from localStorage:', err);
    return [];
  }
}

export async function clearRaceHistoryOnDisk() {
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
    localStorage.removeItem(HISTORY_KEY);
    return { success: true };
  } catch (err) {
    console.error('Error clearing race history from localStorage:', err);
    return null;
  }
}

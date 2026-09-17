/**
 * Hybrid Service for Race Leaderboard Storage (Supabase + LocalStorage Fallback)
 */

import { saveRaceRecordToSupabase, fetchRaceRecordsFromSupabase, clearRaceRecordsInSupabase, isSupabaseConfigured } from './supabase';

const LEADERBOARD_KEY = 'mindwave_racing_leaderboard';
const HISTORY_KEY = 'mindwave_race_history';

export async function saveParticipantToDisk(recordObj) {
  try {
    if (!recordObj) return { success: true };

    const locationId = recordObj.location_id || localStorage.getItem('mindwave_location_id') || 'location_1';
    const entryObj = { ...recordObj, location_id: locationId };

    // 1. Save to LocalStorage immediately
    const stored = localStorage.getItem(LEADERBOARD_KEY) || localStorage.getItem(HISTORY_KEY);
    let history = stored ? JSON.parse(stored) : [];

    const entryId = entryObj.entry_id || `${entryObj.race_id}_${entryObj.id || entryObj.playerId || '1'}`;
    const existingIdx = history.findIndex(h => h && (h.entry_id === entryId || (h.race_id === entryObj.race_id && String(h.id) === String(entryObj.id))));

    if (existingIdx >= 0) {
      history[existingIdx] = { ...history[existingIdx], ...entryObj };
    } else {
      history.unshift(entryObj);
    }

    if (history.length > 200) history = history.slice(0, 200);

    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(history));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    // 2. Save to Supabase Cloud Database if configured
    if (isSupabaseConfigured()) {
      saveRaceRecordToSupabase(entryObj).catch(err => {
        console.warn('[Supabase Sync Deferred]', err);
      });
    }

    return { success: true, count: history.length };
  } catch (err) {
    console.error('Error saving participant to storage:', err);
    return null;
  }
}

export async function fetchRaceHistory(locationId = 'all') {
  try {
    // Attempt fetching from Supabase first if configured
    if (isSupabaseConfigured()) {
      const supabaseData = await fetchRaceRecordsFromSupabase(locationId);
      if (supabaseData && Array.isArray(supabaseData)) {
        // Cache in localStorage for offline availability
        if (locationId === 'all') {
          localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(supabaseData));
        }
        return supabaseData;
      }
    }

    // LocalStorage fallback
    const stored = localStorage.getItem(LEADERBOARD_KEY) || localStorage.getItem(HISTORY_KEY);
    let history = stored ? JSON.parse(stored) : [];

    if (locationId && locationId !== 'all') {
      history = history.filter(item => (item.location_id || 'location_1') === locationId);
    }

    return history;
  } catch (err) {
    console.error('Error reading race history:', err);
    return [];
  }
}

export async function clearRaceHistoryOnDisk(locationId = 'all') {
  try {
    if (isSupabaseConfigured()) {
      await clearRaceRecordsInSupabase(locationId);
    }

    if (locationId === 'all') {
      localStorage.removeItem(LEADERBOARD_KEY);
      localStorage.removeItem(HISTORY_KEY);
    } else {
      const stored = localStorage.getItem(LEADERBOARD_KEY);
      if (stored) {
        const history = JSON.parse(stored).filter(item => (item.location_id || 'location_1') !== locationId);
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(history));
      }
    }

    return { success: true };
  } catch (err) {
    console.error('Error clearing race history:', err);
    return null;
  }
}


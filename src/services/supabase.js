import { createClient } from '@supabase/supabase-js';

// Default Supabase config keys in localStorage (allows setting credentials via Config Modal without code changes)
const SUPABASE_URL_KEY = 'mindwave_supabase_url';
const SUPABASE_KEY_KEY = 'mindwave_supabase_anon_key';

let supabaseClient = null;
let currentConfiguredUrl = '';
let currentConfiguredKey = '';

export function getSupabaseCredentials() {
  const url = import.meta.env?.VITE_SUPABASE_URL || localStorage.getItem(SUPABASE_URL_KEY) || '';
  const key = import.meta.env?.VITE_SUPABASE_ANON_KEY || localStorage.getItem(SUPABASE_KEY_KEY) || '';
  return { url, key };
}

export function saveSupabaseCredentials(url, key) {
  if (url) localStorage.setItem(SUPABASE_URL_KEY, url.trim());
  else localStorage.removeItem(SUPABASE_URL_KEY);

  if (key) localStorage.setItem(SUPABASE_KEY_KEY, key.trim());
  else localStorage.removeItem(SUPABASE_KEY_KEY);

  supabaseClient = null; // Reset client so it gets re-created
}

export function getSupabaseClient() {
  const { url, key } = getSupabaseCredentials();

  if (!url || !key) {
    return null;
  }

  if (!supabaseClient || currentConfiguredUrl !== url || currentConfiguredKey !== key) {
    try {
      supabaseClient = createClient(url, key);
      currentConfiguredUrl = url;
      currentConfiguredKey = key;
    } catch (err) {
      console.error('[Supabase Init Error]', err);
      supabaseClient = null;
    }
  }

  return supabaseClient;
}

export function isSupabaseConfigured() {
  return !!getSupabaseClient();
}

/**
 * Save race participant record to Supabase
 */
export async function saveRaceRecordToSupabase(recordObj) {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const entryId = recordObj.entry_id || `${recordObj.race_id}_${recordObj.id || recordObj.playerId || '1'}`;
    const locationId = recordObj.location_id || localStorage.getItem('mindwave_location_id') || 'location_1';

    const payload = {
      entry_id: entryId,
      location_id: locationId,
      race_id: recordObj.race_id || `race_${Date.now()}`,
      player_id: String(recordObj.id || recordObj.player_id || '1'),
      player_name: recordObj.player_name || recordObj.name || 'Driver',
      best_lap: String(recordObj.best_lap || recordObj.fastest_lap_str || '--'),
      laps: parseInt(recordObj.laps, 10) || 0,
      target_laps: parseInt(recordObj.target_laps || recordObj.targetLaps, 10) || 8,
      total_time_ms: parseInt(recordObj.total_time_ms, 10) || 0,
      total_time_str: String(recordObj.total_time_str || recordObj.time_str || '--'),
      fastest_lap_str: String(recordObj.fastest_lap_str || recordObj.best_lap || '--'),
      is_winner: !!(recordObj.is_winner || recordObj.isWinner),
      status: String(recordObj.status || (recordObj.is_winner ? '🏆 1st Place' : 'PARTICIPANT')),
      timestamp: Number(recordObj.timestamp) || Date.now()
    };

    const { data, error } = await client
      .from('race_history')
      .upsert(payload, { onConflict: 'entry_id' })
      .select();

    if (error) {
      console.warn('[Supabase Save Warning]', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[Supabase Save Error]', err);
    return null;
  }
}

/**
 * Fetch race history from Supabase with optional location filtering
 * @param {string} locationId - 'all', 'location_1', 'location_2', etc.
 */
export async function fetchRaceRecordsFromSupabase(locationId = 'all') {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client
      .from('race_history')
      .select('*')
      .order('timestamp', { ascending: false });

    if (locationId && locationId !== 'all') {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query.limit(200);

    if (error) {
      console.warn('[Supabase Fetch Warning]', error.message);
      return null;
    }

    return data || [];
  } catch (err) {
    console.error('[Supabase Fetch Error]', err);
    return null;
  }
}

/**
 * Clear race history in Supabase
 * @param {string} locationId - 'all', 'location_1', etc.
 */
export async function clearRaceRecordsInSupabase(locationId = 'all') {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client.from('race_history').delete();

    if (locationId && locationId !== 'all') {
      query = query.eq('location_id', locationId);
    } else {
      query = query.neq('entry_id', ''); // Delete all
    }

    const { data, error } = await query;
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[Supabase Clear Error]', err);
    return false;
  }
}

/**
 * Subscribe to Supabase realtime changes
 */
export function subscribeToSupabaseRealtime(callback) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel('public:race_history')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'race_history' }, (payload) => {
      if (callback) callback(payload);
    })
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

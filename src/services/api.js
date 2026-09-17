/**
 * Cloud Database Service for Race Leaderboard Storage (Supabase Direct Integration)
 */

import {
  saveRaceRecordToSupabase,
  fetchRaceRecordsFromSupabase,
  clearRaceRecordsInSupabase,
  updateRaceRecordInSupabase,
  deleteSingleRecordFromSupabase,
  isSupabaseConfigured
} from './supabase';

export async function saveParticipantToDisk(recordObj) {
  try {
    if (!recordObj) return { success: true };

    const locationId = recordObj.location_id || localStorage.getItem('mindwave_location_id') || 'location_1';
    const entryObj = { ...recordObj, location_id: locationId };

    if (isSupabaseConfigured()) {
      await saveRaceRecordToSupabase(entryObj);
    }

    return { success: true };
  } catch (err) {
    console.error('Error saving participant to cloud database:', err);
    return null;
  }
}

export async function fetchRaceHistory(locationId = 'all') {
  try {
    if (isSupabaseConfigured()) {
      const supabaseData = await fetchRaceRecordsFromSupabase(locationId);
      if (supabaseData && Array.isArray(supabaseData)) {
        return supabaseData;
      }
    }
    return [];
  } catch (err) {
    console.error('Error reading race history from Supabase:', err);
    return [];
  }
}

export async function updateParticipantRecord(entryId, updatedFields) {
  try {
    if (isSupabaseConfigured()) {
      const updated = await updateRaceRecordInSupabase(entryId, updatedFields);
      return { success: !!updated };
    }
    return { success: false };
  } catch (err) {
    console.error('Error updating participant record:', err);
    return { success: false };
  }
}

export async function deleteParticipantRecord(entryId) {
  try {
    if (isSupabaseConfigured()) {
      const deleted = await deleteSingleRecordFromSupabase(entryId);
      return { success: deleted };
    }
    return { success: false };
  } catch (err) {
    console.error('Error deleting participant record:', err);
    return { success: false };
  }
}

export async function clearRaceHistoryOnDisk(locationId = 'all') {
  try {
    if (isSupabaseConfigured()) {
      await clearRaceRecordsInSupabase(locationId);
    }
    return { success: true };
  } catch (err) {
    console.error('Error clearing race history:', err);
    return null;
  }
}



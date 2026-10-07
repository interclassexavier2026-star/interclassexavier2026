import { Team, Match } from '../types';

export interface SharedDataResponse {
  teams: Team[];
  matches: Match[];
  lastUpdated: number;
  subadmins?: any[];
}

const GLOBAL_CLOUD_OBJECT_ID = 'ff808181a09d98f701a1172368f61865';
const CLOUD_FALLBACK_URL = `https://api.restful-api.dev/objects/${GLOBAL_CLOUD_OBJECT_ID}`;

/**
 * Fetch latest shared tournament data from server JSON database or global cloud bin
 */
export async function fetchSharedTournamentData(): Promise<SharedDataResponse | null> {
  // 1. Try local Express / Vercel API endpoint
  try {
    const res = await fetch('/api/data', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (Array.isArray(data.teams) || typeof data.lastUpdated === 'number')) {
        return {
          teams: Array.isArray(data.teams) ? data.teams : [],
          matches: Array.isArray(data.matches) ? data.matches : [],
          lastUpdated: typeof data.lastUpdated === 'number' ? data.lastUpdated : 0,
          subadmins: data.subadmins,
        };
      }
    }
  } catch (err) {
    console.warn('/api/data fetch error, falling back to global cloud bin:', err);
  }

  // 2. Direct Cloud Bin Fallback (for static Vercel/GitHub Pages deployments)
  try {
    const cloudRes = await fetch(CLOUD_FALLBACK_URL, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (cloudRes.ok) {
      const json = await cloudRes.json();
      if (json && json.data) {
        return {
          teams: Array.isArray(json.data.teams) ? json.data.teams : [],
          matches: Array.isArray(json.data.matches) ? json.data.matches : [],
          lastUpdated: typeof json.data.lastUpdated === 'number' ? json.data.lastUpdated : 0,
          subadmins: json.data.subadmins,
        };
      }
    }
  } catch (err) {
    console.warn('Global cloud bin fetch error:', err);
  }

  return null;
}

/**
 * Save/Publish tournament data to server JSON database and Cloud Store so ALL visitors can see it
 */
export async function saveSharedTournamentData(
  teams: Team[],
  matches: Match[]
): Promise<{ success: boolean; lastUpdated?: number }> {
  const payload = {
    teams,
    matches,
    lastUpdated: Date.now(),
  };

  let savedLocally = false;

  // 1. Try local Express / Vercel API endpoint
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      savedLocally = true;
    }
  } catch (err) {
    console.warn('Could not save to /api/data, attempting direct cloud store:', err);
  }

  // 2. Direct Cloud Store Sync (Sanitized without bulky raw base64)
  try {
    const sanitizedTeams = teams.map((t) => {
      if (t.imageUrl && t.imageUrl.length > 50000) {
        const { imageUrl, ...rest } = t;
        return rest;
      }
      return t;
    });

    const cloudPayload = {
      name: 'Interclasse Data 2026',
      data: {
        teams: sanitizedTeams,
        matches,
        lastUpdated: payload.lastUpdated,
      },
    };

    const cloudRes = await fetch(CLOUD_FALLBACK_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cloudPayload),
    });

    if (cloudRes.ok || savedLocally) {
      return { success: true, lastUpdated: payload.lastUpdated };
    }
  } catch (err) {
    console.warn('Cloud store sync failed:', err);
  }

  return { success: savedLocally, lastUpdated: payload.lastUpdated };
}

/**
 * Explicitly delete a team on the server JSON
 */
export async function deleteSharedTeam(teamId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

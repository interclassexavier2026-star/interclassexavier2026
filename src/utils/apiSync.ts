import { Team, Match } from '../types';

export interface SharedDataResponse {
  teams: Team[];
  matches: Match[];
  lastUpdated: number;
  subadmins?: any[];
}

/**
 * Fetch latest shared tournament data from server JSON database
 */
export async function fetchSharedTournamentData(): Promise<SharedDataResponse | null> {
  try {
    const res = await fetch('/api/data', {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const data: SharedDataResponse = await res.json();
    return {
      teams: Array.isArray(data.teams) ? data.teams : [],
      matches: Array.isArray(data.matches) ? data.matches : [],
      lastUpdated: typeof data.lastUpdated === 'number' ? data.lastUpdated : 0,
      subadmins: data.subadmins,
    };
  } catch (err) {
    // API endpoint might be offline or running purely static
    return null;
  }
}

/**
 * Save/Publish tournament data to server JSON database so ALL visitors can see it
 */
export async function saveSharedTournamentData(
  teams: Team[],
  matches: Match[]
): Promise<{ success: boolean; lastUpdated?: number }> {
  try {
    const payload = {
      teams,
      matches,
      lastUpdated: Date.now(),
    };

    const res = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { success: false };
    }

    const result = await res.json();
    return { success: true, lastUpdated: result.lastUpdated || payload.lastUpdated };
  } catch (err) {
    console.warn('Could not save to /api/data:', err);
    return { success: false };
  }
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

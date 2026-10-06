import { Team, Match } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { getStoredTeams, setStoredTeams, getStoredMatches, setStoredMatches } from './storage';
import { getAllImagesFromIndexedDb, saveImageToIndexedDb } from './indexedDbStorage';

export const SUPABASE_SQL_SCHEMA = `-- Copie e cole este código no SQL Editor do seu projeto Supabase:

-- 1. Tabela de Equipes e Atletas
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  modality TEXT NOT NULL,
  captain TEXT,
  shirt_color TEXT,
  image_url TEXT,
  players JSONB,
  player_name TEXT,
  player_class TEXT,
  fouls INT DEFAULT 0,
  created_date TEXT
);

-- 2. Tabela de Confrontos e Resultados
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  modality TEXT NOT NULL,
  round_name TEXT,
  round_index INT,
  match_number INT,
  team_a_id TEXT,
  team_b_id TEXT,
  team_a_name TEXT,
  team_b_name TEXT,
  score_a INT,
  score_b INT,
  winner_id TEXT,
  loser_id TEXT,
  date TEXT,
  time TEXT,
  location TEXT,
  next_match_id TEXT,
  next_match_slot TEXT,
  source_match_a_id TEXT,
  source_match_b_id TEXT,
  source_label_a TEXT,
  source_label_b TEXT,
  penalty_winner_id TEXT
);

-- 3. Tabela de Mídia e Fotos (Base64)
CREATE TABLE IF NOT EXISTS media_images (
  id TEXT PRIMARY KEY,
  data_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabela de Credenciais de Administradores
CREATE TABLE IF NOT EXISTS app_subadmins (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'subadmin',
  name TEXT,
  allowed_modality TEXT
);

-- Inserir as credenciais oficiais dos administradores:
INSERT INTO app_subadmins (username, password, role, name, allowed_modality) VALUES
  ('adminfutsalxavier', '2026ADMININTERCLASSEFUTS@L', 'subadmin', 'Admin Futsal', 'futsal'),
  ('voleiadminxavier2026', 'acessarvolei2026xavierinterclasse', 'subadmin', 'Admin Vôlei', 'volei'),
  ('tenisdemesaxavieradmin', '26bolsonaropresidenteadmintenisd3MES4', 'subadmin', 'Admin Tênis de Mesa', 'tenis_mesa')
ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password;

-- Desabilitar RLS para acesso público simples (ou configure políticas conforme necessário):
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE media_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_subadmins DISABLE ROW LEVEL SECURITY;
`;

// Helper: Convert Team to Supabase Row
const teamToRow = (t: Team) => ({
  id: t.id,
  name: t.name,
  modality: t.modality,
  captain: t.captain || null,
  shirt_color: t.shirtColor || null,
  image_url: t.imageUrl || null,
  players: t.players || [],
  player_name: t.playerName || null,
  player_class: t.playerClass || null,
  fouls: t.fouls || 0,
  created_date: t.createdDate || new Date().toISOString(),
});

// Helper: Convert Supabase Row to Team
export const rowToTeam = (row: any): Team => ({
  id: row.id,
  name: row.name,
  modality: row.modality,
  captain: row.captain || undefined,
  shirtColor: row.shirt_color || '#0284c7',
  imageUrl: row.image_url || undefined,
  players: Array.isArray(row.players) ? row.players : [],
  playerName: row.player_name || undefined,
  playerClass: row.player_class || undefined,
  fouls: row.fouls || 0,
  createdDate: row.created_date || new Date().toISOString(),
});

// Helper: Convert Match to Supabase Row
const matchToRow = (m: Match) => ({
  id: m.id,
  modality: m.modality,
  round_name: m.roundName,
  round_index: m.roundIndex,
  match_number: m.matchNumber,
  team_a_id: m.teamAId || null,
  team_b_id: m.teamBId || null,
  team_a_name: m.teamAName || null,
  team_b_name: m.teamBName || null,
  score_a: m.scoreA !== undefined ? m.scoreA : null,
  score_b: m.scoreB !== undefined ? m.scoreB : null,
  winner_id: m.winnerId || null,
  loser_id: m.loserId || null,
  date: m.date || null,
  time: m.time || null,
  location: m.location || null,
  next_match_id: m.nextMatchId || null,
  next_match_slot: m.nextMatchSlot || null,
  source_match_a_id: m.sourceMatchAId || null,
  source_match_b_id: m.sourceMatchBId || null,
  source_label_a: m.sourceLabelA || null,
  source_label_b: m.sourceLabelB || null,
  penalty_winner_id: m.penaltyWinnerId || null,
});

// Helper: Convert Supabase Row to Match
export const rowToMatch = (row: any): Match => ({
  id: row.id,
  modality: row.modality,
  roundName: row.round_name,
  roundIndex: row.round_index,
  matchNumber: row.match_number,
  teamAId: row.team_a_id || undefined,
  teamBId: row.team_b_id || undefined,
  teamAName: row.team_a_name || undefined,
  teamBName: row.team_b_name || undefined,
  scoreA: row.score_a !== null && row.score_a !== undefined ? Number(row.score_a) : undefined,
  scoreB: row.score_b !== null && row.score_b !== undefined ? Number(row.score_b) : undefined,
  winnerId: row.winner_id || undefined,
  loserId: row.loser_id || undefined,
  date: row.date || undefined,
  time: row.time || undefined,
  location: row.location || undefined,
  nextMatchId: row.next_match_id || undefined,
  nextMatchSlot: row.next_match_slot || undefined,
  sourceMatchAId: row.source_match_a_id || undefined,
  sourceMatchBId: row.source_match_b_id || undefined,
  sourceLabelA: row.source_label_a || undefined,
  sourceLabelB: row.source_label_b || undefined,
  penaltyWinnerId: row.penalty_winner_id || undefined,
});

/**
 * Fetch all teams from Supabase
 */
export const supabaseFetchTeams = async (): Promise<Team[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('teams').select('*');
    if (error) {
      console.warn('Supabase teams query warning:', error.message);
      return null;
    }
    if (!data) return null;
    return data.map(rowToTeam);
  } catch (err) {
    console.error('Error fetching teams from Supabase:', err);
    return null;
  }
};

/**
 * Save single team to Supabase
 */
export const supabaseSaveTeam = async (team: Team): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = teamToRow(team);
    const { error } = await client.from('teams').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Supabase team save error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving team to Supabase:', err);
    return false;
  }
};

/**
 * Delete team from Supabase + cleanup match references & media_images
 */
export interface DeleteTeamResult {
  success: boolean;
  error?: string;
  isForeignKeyError?: boolean;
}

/**
 * Delete team from Supabase + cleanup media/storage + return explicit error status
 */
export const supabaseDeleteTeam = async (
  teamId: string,
  imageUrl?: string
): Promise<DeleteTeamResult> => {
  const client = getSupabaseClient();
  if (!client) return { success: true };

  try {
    // 1. Unbind team references from matches table in Supabase so FK constraints never block deletion
    try {
      await client.from('matches').update({ team_a_id: null, team_a_name: 'A definir' }).eq('team_a_id', teamId);
      await client.from('matches').update({ team_b_id: null, team_b_name: 'A definir' }).eq('team_b_id', teamId);
      await client.from('matches').update({ winner_id: null }).eq('winner_id', teamId);
      await client.from('matches').update({ loser_id: null }).eq('loser_id', teamId);
    } catch (fkErr) {
      console.warn('Supabase match unbind warning:', fkErr);
    }

    // 2. Storage image cleanup from bucket 'class-images' if present
    if (imageUrl) {
      try {
        const urlParts = imageUrl.split('/class-images/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1].split('?')[0];
          await client.storage.from('class-images').remove([filePath]);
        }
      } catch (stErr) {
        console.warn('Supabase class-images storage removal warning:', stErr);
      }
    }

    // 3. Delete media image row from media_images if exists
    try {
      await client.from('media_images').delete().eq('id', teamId);
    } catch (mediaErr) {
      console.warn('Supabase media_images delete warning:', mediaErr);
    }

    // 4. Explicit delete on 'teams' table
    const { error } = await client.from('teams').delete().eq('id', teamId);
    if (error) {
      console.error('Supabase team delete error:', error.message);
      const isFK =
        error.code === '23503' ||
        error.message?.toLowerCase().includes('foreign key') ||
        error.message?.toLowerCase().includes('violates foreign key constraint') ||
        error.message?.toLowerCase().includes('matches') ||
        error.message?.toLowerCase().includes('reference') ||
        error.message?.toLowerCase().includes('constraint');

      return {
        success: false,
        error: error.message,
        isForeignKeyError: isFK,
      };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting team from Supabase:', err);
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao conectar ao Supabase',
    };
  }
};

/**
 * Clear all teams from Supabase
 */
export const supabaseClearAllTeams = async (): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('teams').delete().neq('id', '___non_existent___');
    if (error) {
      console.error('Supabase clear teams error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error clearing teams from Supabase:', err);
    return false;
  }
};

/**
 * Purges all duplicate futsal_fem matches from Supabase database
 * except the official Ida and Volta match IDs.
 */
export const purgeDuplicateFutsalFemMatches = async (): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('matches')
      .delete()
      .eq('modality', 'futsal_fem')
      .neq('id', 'match_futsal_fem_ida_official')
      .neq('id', 'match_futsal_fem_volta_official');

    if (error) {
      console.warn('Purge duplicate futsal_fem matches warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error purging duplicate futsal_fem matches from Supabase:', err);
    return false;
  }
};

/**
 * Clear all matches from Supabase
 */
export const supabaseClearAllMatches = async (): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('matches').delete().neq('id', '___non_existent___');
    if (error) {
      console.error('Supabase clear matches error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error clearing matches from Supabase:', err);
    return false;
  }
};

/**
 * Fetch all matches from Supabase
 */
export const supabaseFetchMatches = async (): Promise<Match[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('matches').select('*');
    if (error) {
      console.warn('Supabase matches query warning:', error.message);
      return null;
    }
    if (!data) return null;
    return data.map(rowToMatch);
  } catch (err) {
    console.error('Error fetching matches from Supabase:', err);
    return null;
  }
};

/**
 * Save matches to Supabase
 */
export const supabaseSaveMatches = async (matches: Match[]): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client || matches.length === 0) return false;

  try {
    const rows = matches.map(matchToRow);
    const { error } = await client.from('matches').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Supabase matches save error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving matches to Supabase:', err);
    return false;
  }
};

/**
 * Save image to Supabase media_images table
 */
export const supabaseSaveImage = async (id: string, dataUrl: string): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client || !dataUrl) return false;

  try {
    const { error } = await client.from('media_images').upsert({ id, data_url: dataUrl }, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase image save warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving image to Supabase:', err);
    return false;
  }
};

/**
 * Fetch all images from Supabase
 */
export const supabaseFetchImages = async (): Promise<Record<string, string> | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('media_images').select('*');
    if (error || !data) return null;

    const result: Record<string, string> = {};
    data.forEach((row) => {
      if (row.id && row.data_url) {
        result[row.id] = row.data_url;
      }
    });
    return result;
  } catch (err) {
    console.error('Error fetching images from Supabase:', err);
    return null;
  }
};

/**
 * Push all local teams, matches, and images to Supabase (Full Initial Sync)
 */
export const syncAllLocalDataToSupabase = async (): Promise<{
  success: boolean;
  teamsSynced: number;
  matchesSynced: number;
  imagesSynced: number;
  error?: string;
}> => {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      teamsSynced: 0,
      matchesSynced: 0,
      imagesSynced: 0,
      error: 'Supabase não configurado. Insira a URL e Anon Key.',
    };
  }

  const teams = getStoredTeams();
  const matches = getStoredMatches();
  const images = await getAllImagesFromIndexedDb();

  let teamsSynced = 0;
  let matchesSynced = 0;
  let imagesSynced = 0;

  // 1. Sync Teams
  if (teams.length > 0) {
    const client = getSupabaseClient();
    if (client) {
      const rows = teams.map(teamToRow);
      const { error } = await client.from('teams').upsert(rows, { onConflict: 'id' });
      if (error) {
        return {
          success: false,
          teamsSynced: 0,
          matchesSynced: 0,
          imagesSynced: 0,
          error: `Erro ao enviar equipes para o Supabase: ${error.message}`,
        };
      }
      teamsSynced = teams.length;
    }
  }

  // 2. Sync Matches
  if (matches.length > 0) {
    const client = getSupabaseClient();
    if (client) {
      const rows = matches.map(matchToRow);
      const { error } = await client.from('matches').upsert(rows, { onConflict: 'id' });
      if (error) {
        return {
          success: false,
          teamsSynced,
          matchesSynced: 0,
          imagesSynced: 0,
          error: `Erro ao enviar partidas para o Supabase: ${error.message}`,
        };
      }
      matchesSynced = matches.length;
    }
  }

  // 3. Sync Images
  const client = getSupabaseClient();
  if (client && Object.keys(images).length > 0) {
    const imageRows = Object.entries(images).map(([id, dataUrl]) => ({
      id,
      data_url: dataUrl,
    }));
    const { error } = await client.from('media_images').upsert(imageRows, { onConflict: 'id' });
    if (!error) {
      imagesSynced = imageRows.length;
    }
  }

  return {
    success: true,
    teamsSynced,
    matchesSynced,
    imagesSynced,
  };
};

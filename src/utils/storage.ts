import { Team, Match, User, ModalityType } from '../types';
import { EMBLEM_PRESETS } from './emblems';

const STORAGE_KEYS = {
  USER: 'interclasse_user',
  TEAMS: 'interclasse_teams_v3',
  MATCHES: 'interclasse_matches_v2',
};

// Initial Seed Data for the Interclasse
const DEFAULT_TEAMS: Team[] = [
  // Futsal Masculino
  {
    id: 'team_fm_1',
    name: '3º Ano A',
    modality: 'futsal_masc',
    captain: 'Enzo Rodrigues',
    shirtColor: '#0284c7', // Sky Blue
    imageUrl: EMBLEM_PRESETS[0].url, // Águias
    players: ['Enzo Rodrigues (C)', 'Lucas Gabriel', 'Matheus Silva', 'Rafael Ramos', 'Guilherme Souza', 'Felipe Santos'],
    createdDate: new Date().toISOString(),
  },
  {
    id: 'team_fm_2',
    name: '3º Ano B',
    modality: 'futsal_masc',
    captain: 'Arthur Moreira',
    shirtColor: '#ea580c', // Orange
    imageUrl: EMBLEM_PRESETS[1].url, // Leões
    players: ['Arthur Moreira (C)', 'Pedro Henrique', 'Thiago Lima', 'Bruno Dias', 'Gustavo Nogueira', 'Leonardo Pires'],
    createdDate: new Date().toISOString(),
  },
  {
    id: 'team_fm_3',
    name: '2º Ano A',
    modality: 'futsal_masc',
    captain: 'Davi Lucca',
    shirtColor: '#16a34a', // Green
    imageUrl: EMBLEM_PRESETS[7].url, // Dragões
    players: ['Davi Lucca (C)', 'Henrique Alves', 'Samuel Rocha', 'Breno Carvalho', 'Igor Ferreira'],
    createdDate: new Date().toISOString(),
  },
  {
    id: 'team_fm_4',
    name: '1º Ano B',
    modality: 'futsal_masc',
    captain: 'Bernardo Costa',
    shirtColor: '#7c3aed', // Purple
    imageUrl: EMBLEM_PRESETS[8].url, // Spartanos
    players: ['Bernardo Costa (C)', 'Caio Martins', 'Vinicius Prado', 'Otavio Ribeiro', 'Daniel Moura'],
    createdDate: new Date().toISOString(),
  },

  // Futsal Feminino
  {
    id: 'team_ff_1',
    name: '3º Ano B',
    modality: 'futsal_fem',
    captain: 'Camila Fernandes',
    shirtColor: '#db2777', // Pink
    imageUrl: EMBLEM_PRESETS[5].url, // Fênix
    players: ['Camila Fernandes (C)', 'Julia Amaral', 'Isabela Lopes', 'Larissa Vieira', 'Gabriela Castro'],
    createdDate: new Date().toISOString(),
  },
  {
    id: 'team_ff_2',
    name: '2º Ano A',
    modality: 'futsal_fem',
    captain: 'Mariana Duarte',
    shirtColor: '#0284c7', // Sky Blue
    imageUrl: EMBLEM_PRESETS[3].url, // Tubarões
    players: ['Mariana Duarte (C)', 'Sofia Martins', 'Ana Clara Lima', 'Beatriz Pires', 'Manuela Gomes'],
    createdDate: new Date().toISOString(),
  },
  {
    id: 'team_ff_3',
    name: '1º Ano A',
    modality: 'futsal_fem',
    captain: 'Helena Ribeiro',
    shirtColor: '#f59e0b', // Amber
    imageUrl: EMBLEM_PRESETS[4].url, // Trovão
    players: ['Helena Ribeiro (C)', 'Laura Mendes', 'Alice Farias', 'Valentina Nunes', 'Livia Toledo'],
    createdDate: new Date().toISOString(),
  },
  {
    id: 'team_ff_4',
    name: '3º Ano A',
    modality: 'futsal_fem',
    captain: 'Luiza Fonseca',
    shirtColor: '#10b981', // Emerald
    imageUrl: EMBLEM_PRESETS[7].url, // Dragões
    players: ['Luiza Fonseca (C)', 'Yasmin Barbosa', 'Carolina Rios', 'Rafaela Borges', 'Rebeca Santana'],
    createdDate: new Date().toISOString(),
  },

  // Vôlei Misto
  {
    id: 'team_vm_1',
    name: '3º Ano A',
    modality: 'volei_misto',
    captain: 'Gabriel Lima',
    shirtColor: '#2563eb', // Royal Blue
    imageUrl: EMBLEM_PRESETS[6].url, // Guerreiros
    players: ['Gabriel Lima (C)', 'Ana Beatriz', 'Lucas Andrade', 'Fernanda Souza', 'Rodrigo Paiva', 'Leticia Silva'],
    createdDate: new Date().toISOString(),
  },
  {
    id: 'team_vm_2',
    name: '3º Ano B',
    modality: 'volei_misto',
    captain: 'Larissa Santos',
    shirtColor: '#d97706', // Amber-600
    imageUrl: EMBLEM_PRESETS[1].url, // Leões
    players: ['Larissa Santos (C)', 'Pedro Afonso', 'Mariana Neves', 'Joao Vitor', 'Clara Meireles', 'Nicolas Faria'],
    createdDate: new Date().toISOString(),
  },
  {
    id: 'team_vm_3',
    name: '2º Ano B',
    modality: 'volei_misto',
    captain: 'Matheus Ortiz',
    shirtColor: '#059669', // Emerald
    imageUrl: EMBLEM_PRESETS[7].url, // Dragões
    players: ['Matheus Ortiz (C)', 'Bianca Miranda', 'Felipe Prado', 'Lorena Silveira', 'Danilo Xavier', 'Jessica Couto'],
    createdDate: new Date().toISOString(),
  },
  {
    id: 'team_vm_4',
    name: '1º Ano A',
    modality: 'volei_misto',
    captain: 'Carolina Rezende',
    shirtColor: '#9333ea', // Purple
    imageUrl: EMBLEM_PRESETS[2].url, // Panteras
    players: ['Carolina Rezende (C)', 'Enzo Ferrari', 'Giovanna Lima', 'Arthur Bueno', 'Victoria Ramos', 'Tales Cunha'],
    createdDate: new Date().toISOString(),
  },

  // Tênis de Mesa Masculino (Atleta Individual)
  {
    id: 'player_tm_m1',
    name: 'Lucas Mendes',
    playerName: 'Lucas Mendes',
    playerClass: '3º Ano A',
    modality: 'tenis_mesa_masc',
    shirtColor: '#0284c7',
    imageUrl: EMBLEM_PRESETS[4].url,
    createdDate: new Date().toISOString(),
  },
  {
    id: 'player_tm_m2',
    name: 'Gabriel Barbosa',
    playerName: 'Gabriel Barbosa',
    playerClass: '3º Ano B',
    modality: 'tenis_mesa_masc',
    shirtColor: '#ea580c',
    imageUrl: EMBLEM_PRESETS[1].url,
    createdDate: new Date().toISOString(),
  },
  {
    id: 'player_tm_m3',
    name: 'Matheus Vieira',
    playerName: 'Matheus Vieira',
    playerClass: '2º Ano A',
    modality: 'tenis_mesa_masc',
    shirtColor: '#16a34a',
    imageUrl: EMBLEM_PRESETS[7].url,
    createdDate: new Date().toISOString(),
  },
  {
    id: 'player_tm_m4',
    name: 'Leonardo Toledo',
    playerName: 'Leonardo Toledo',
    playerClass: '1º Ano B',
    modality: 'tenis_mesa_masc',
    shirtColor: '#7c3aed',
    imageUrl: EMBLEM_PRESETS[8].url,
    createdDate: new Date().toISOString(),
  },

  // Tênis de Mesa Feminino (Atleta Individual)
  {
    id: 'player_tm_f1',
    name: 'Larissa Oliveira',
    playerName: 'Larissa Oliveira',
    playerClass: '3º Ano B',
    modality: 'tenis_mesa_fem',
    shirtColor: '#db2777',
    imageUrl: EMBLEM_PRESETS[5].url,
    createdDate: new Date().toISOString(),
  },
  {
    id: 'player_tm_f2',
    name: 'Beatriz Costa',
    playerName: 'Beatriz Costa',
    playerClass: '2º Ano A',
    modality: 'tenis_mesa_fem',
    shirtColor: '#0284c7',
    imageUrl: EMBLEM_PRESETS[3].url,
    createdDate: new Date().toISOString(),
  },
  {
    id: 'player_tm_f3',
    name: 'Sofia Rocha',
    playerName: 'Sofia Rocha',
    playerClass: '1º Ano B',
    modality: 'tenis_mesa_fem',
    shirtColor: '#f59e0b',
    imageUrl: EMBLEM_PRESETS[4].url,
    createdDate: new Date().toISOString(),
  },
  {
    id: 'player_tm_f4',
    name: 'Manuela Alencar',
    playerName: 'Manuela Alencar',
    playerClass: '3º Ano A',
    modality: 'tenis_mesa_fem',
    shirtColor: '#10b981',
    imageUrl: EMBLEM_PRESETS[7].url,
    createdDate: new Date().toISOString(),
  },
];

export const getStoredUser = (): User | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
};

export const getStoredTeams = (): Team[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TEAMS);
    if (!data) {
      // Check legacy teams key
      const legacyData = localStorage.getItem('interclasse_teams');
      if (legacyData) {
        const parsedLegacy: any[] = JSON.parse(legacyData);
        const upgraded: Team[] = parsedLegacy.map((t) => ({
          ...t,
          modality: t.modality === 'futsal' ? 'futsal_masc' : t.modality === 'volei' ? 'volei_misto' : t.modality,
          players: t.players || [],
        }));
        setStoredTeams(upgraded);
        return upgraded;
      }
      setStoredTeams(DEFAULT_TEAMS);
      return DEFAULT_TEAMS;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_TEAMS;
  }
};

export const setStoredTeams = (teams: Team[]) => {
  localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
};

export const getStoredMatches = (): Match[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MATCHES);
    if (!data) {
      // Generate initial brackets for default teams
      const allMatches: Match[] = [];
      const modalities: ModalityType[] = [
        'futsal_masc',
        'futsal_fem',
        'volei_misto',
        'tenis_mesa_masc',
        'tenis_mesa_fem',
      ];
      modalities.forEach((mod) => {
        const matchesForMod = generateAutomaticBracket(mod, DEFAULT_TEAMS);
        allMatches.push(...matchesForMod);
      });
      setStoredMatches(allMatches);
      return allMatches;
    }
    const parsed: Match[] = JSON.parse(data);
    return parsed;
  } catch {
    return [];
  }
};

export const setStoredMatches = (matches: Match[]) => {
  localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
};

// Automatic Tournament Bracket Generator with dynamic round capacity and BYE support
export const generateAutomaticBracket = (modality: ModalityType, teams: Team[]): Match[] => {
  const modalityTeams = teams.filter((t) => t.modality === modality);
  if (modalityTeams.length < 2) return [];

  const shuffled = [...modalityTeams].sort(() => Math.random() - 0.5);
  const N = shuffled.length;
  const timestamp = Date.now();

  const getDisplayName = (team?: Team) => {
    if (!team) return 'A definir';
    if (team.playerClass && team.playerName) {
      return `${team.playerName} (${team.playerClass})`;
    }
    return team.name;
  };

  // Find power of 2 bracket size C >= N
  let C = 2;
  while (C < N) {
    C *= 2;
  }

  // Calculate total rounds k = log2(C)
  const totalRounds = Math.round(Math.log2(C));

  // Function to name round given current round index r (1-indexed) and totalRounds k
  const getRoundName = (r: number, k: number): string => {
    const diff = k - r;
    if (diff === 0) return 'Grande Final';
    if (diff === 1) return 'Semifinal';
    if (diff === 2) return 'Quartas de Final';
    if (diff === 3) return 'Oitavas de Final';
    if (diff === 4) return '16 avos de Final';
    if (diff === 5) return '32 avos de Final';
    return `Fase ${r}`;
  };

  // Calculate BYEs and Round 1 match counts
  const round1MatchesCount = N - C / 2;
  const numByes = C - N;

  const round1Teams = shuffled.slice(0, 2 * round1MatchesCount);
  const byeTeams = shuffled.slice(2 * round1MatchesCount);

  // Store matches by round: roundsMatches[r-1] = Match[]
  const roundsMatches: Match[][] = [];

  // Generate blank match structure for all rounds
  for (let r = 1; r <= totalRounds; r++) {
    const numMatchesInRound = C / Math.pow(2, r);
    const currentRoundMatches: Match[] = [];

    for (let m = 0; m < numMatchesInRound; m++) {
      const matchId = `match_${modality}_r${r}_m${m}_${timestamp}`;
      const isLastRound = r === totalRounds;
      const nextMatchId = !isLastRound ? `match_${modality}_r${r + 1}_m${Math.floor(m / 2)}_${timestamp}` : undefined;
      const nextMatchSlot = !isLastRound ? (m % 2 === 0 ? 'A' : 'B') : undefined;

      const baseRoundName = getRoundName(r, totalRounds);
      const matchLabel = numMatchesInRound > 1 ? `${baseRoundName} ${m + 1}` : baseRoundName;

      currentRoundMatches.push({
        id: matchId,
        modality,
        roundName: matchLabel,
        roundIndex: r,
        matchNumber: m + 1,
        teamAName: 'A definir',
        teamBName: 'A definir',
        date: '14 de Outubro',
        time: `${8 + Math.floor(m / 2)}:${(m % 2) * 30 === 0 ? '00' : '30'}`,
        location: `Quadra / Mesa ${(m % 2) + 1}`,
        nextMatchId,
        nextMatchSlot,
      });
    }
    roundsMatches.push(currentRoundMatches);
  }

  // Populate Round 1 matches if round1MatchesCount > 0
  if (round1MatchesCount > 0) {
    for (let m = 0; m < round1MatchesCount; m++) {
      const teamA = round1Teams[m * 2];
      const teamB = round1Teams[m * 2 + 1];

      roundsMatches[0][m].teamAId = teamA?.id;
      roundsMatches[0][m].teamAName = getDisplayName(teamA);
      roundsMatches[0][m].teamBId = teamB?.id;
      roundsMatches[0][m].teamBName = getDisplayName(teamB);
    }
  }

  // Populate Round 2 (or Round 1 if N === C = 2) with BYE teams
  if (totalRounds === 1) {
    // Direct final with 2 teams
    roundsMatches[0][0].teamAId = shuffled[0]?.id;
    roundsMatches[0][0].teamAName = getDisplayName(shuffled[0]);
    roundsMatches[0][0].teamBId = shuffled[1]?.id;
    roundsMatches[0][0].teamBName = getDisplayName(shuffled[1]);
  } else {
    // Round 2 (index 1) receives slots:
    // First round1MatchesCount slots come from Round 1 winners ('A definir' until played)
    // Remaining slots come from byeTeams!
    const round2Matches = roundsMatches[1];
    let byeIndex = 0;

    for (let slotIndex = 0; slotIndex < C / 2; slotIndex++) {
      const targetMatchIndex = Math.floor(slotIndex / 2);
      const isSlotA = slotIndex % 2 === 0;

      if (slotIndex >= round1MatchesCount) {
        // This slot is a BYE team advancing directly
        const byeTeam = byeTeams[byeIndex++];
        if (byeTeam && round2Matches[targetMatchIndex]) {
          if (isSlotA) {
            round2Matches[targetMatchIndex].teamAId = byeTeam.id;
            round2Matches[targetMatchIndex].teamAName = getDisplayName(byeTeam);
          } else {
            round2Matches[targetMatchIndex].teamBId = byeTeam.id;
            round2Matches[targetMatchIndex].teamBName = getDisplayName(byeTeam);
          }
        }
      }
    }
  }

  // Flatten all matches
  const allGenerated: Match[] = [];
  roundsMatches.forEach((rm) => allGenerated.push(...rm));
  return allGenerated;
};

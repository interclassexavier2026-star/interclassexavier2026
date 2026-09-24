export type ModalityType =
  | 'futsal_masc'
  | 'futsal_fem'
  | 'volei_misto'
  | 'tenis_mesa_masc'
  | 'tenis_mesa_fem';

export type UserRole = 'admin' | 'subadmin' | 'guest';

export interface User {
  username: string;
  role: UserRole;
  name?: string;
  allowedModality?: 'futsal' | 'volei' | 'tenis_mesa';
  password?: string;
}

export interface Team {
  id: string;
  name: string; // Para equipes: nome da turma (ex: "3º Ano A"). Para Tênis de Mesa: Nome do Atleta
  modality: ModalityType;
  captain?: string; // Para Futsal e Vôlei
  shirtColor: string;
  imageUrl?: string; // Foto, escudo ou brasão da turma/atleta
  players?: string[]; // Campo para adicionar jogadores/elenco para Futsal e Vôlei
  playerName?: string; // Para Tênis de Mesa
  playerClass?: string; // Para Tênis de Mesa: Sala/Turma do aluno
  createdDate: string;
}

export interface Match {
  id: string;
  modality: ModalityType;
  roundName: string; // Ex: "Quartas de Final", "Semifinal", "Grande Final"
  roundIndex: number;
  matchNumber: number;
  teamAId?: string;
  teamBId?: string;
  teamAName?: string;
  teamBName?: string;
  scoreA?: number;
  scoreB?: number;
  winnerId?: string;
  loserId?: string;
  date?: string;
  time?: string;
  location?: string;
  nextMatchId?: string;
  nextMatchSlot?: 'A' | 'B';
  isBye?: boolean; // Se um time avançou direto sem oponente
}

import React, { useState, useRef } from 'react';
import { Match, ModalityType, User, Team } from '../types';
import { MODALITY_CONFIGS } from '../utils/constants';
import { getFutsalFemFinalSummary } from '../utils/futsalFemUtils';
import {
  Trophy,
  Zap,
  Sparkles,
  Crown,
  Flame,
  Star,
  Clock,
  Shirt,
  Swords,
  School,
  ChevronLeft,
  ChevronRight,
  Layers,
  MapPin,
  CheckCircle2,
  Search,
  Pencil,
} from 'lucide-react';

interface BracketSectionProps {
  matches: Match[];
  teams: Team[];
  activeModality: ModalityType;
  user: User | null;
  theme?: 'light' | 'dark';
  onUpdateMatchScore: (
    matchId: string,
    scoreA: number,
    scoreB: number,
    overrideTeamAId?: string,
    overrideTeamBId?: string,
    overrideTeamAName?: string,
    overrideTeamBName?: string,
    penaltyWinnerId?: string
  ) => void;
  onGenerateBracket: () => void;
  onSelectSection?: (section: string) => void;
}

export const canEditMatchScore = (user: User | null, matchModality: ModalityType): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'subadmin') {
    if (user.allowedModality === 'futsal' && (matchModality === 'futsal_masc' || matchModality === 'futsal_fem')) {
      return true;
    }
    if (user.allowedModality === 'volei' && matchModality === 'volei_misto') {
      return true;
    }
    if (user.allowedModality === 'tenis_mesa' && (matchModality === 'tenis_mesa_masc' || matchModality === 'tenis_mesa_fem')) {
      return true;
    }
  }
  return false;
};

export const BracketSection: React.FC<BracketSectionProps> = ({
  matches,
  teams,
  activeModality,
  user,
  theme = 'dark',
  onUpdateMatchScore,
  onGenerateBracket,
  onSelectSection,
}) => {
  const modalityConfig = MODALITY_CONFIGS[activeModality];
  const isDark = theme === 'dark';

  // Filters Embedded in Bracket
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Current modality matches before filters
  const modalityMatches = React.useMemo(() => {
    return matches.filter((m) => m.modality === activeModality);
  }, [matches, activeModality]);

  // Current modality teams
  const currentModalityTeams = React.useMemo(() => {
    return teams.filter((t) => t.modality === activeModality);
  }, [teams, activeModality]);

  // Unique rooms/classes for team modalities
  const roomOptions = React.useMemo(() => {
    const set = new Set<string>();
    currentModalityTeams.forEach((t) => {
      const room = t.playerClass || t.name;
      if (room) set.add(room.trim());
    });
    return Array.from(set).sort();
  }, [currentModalityTeams]);

  // Athlete options for individual modality (Tênis de Mesa)
  const athleteOptions = React.useMemo(() => {
    return currentModalityTeams
      .map((t) => ({
        id: t.id,
        name: t.playerName && t.playerClass ? `${t.playerName} (${t.playerClass})` : t.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentModalityTeams]);

  // Filtered matches based on mode and active selections
  const filteredMatches = React.useMemo(() => {
    let list = matches.filter((m) => m.modality === activeModality);
    list = list.filter((m) => !(m.isResetMatch && m.isActive === false));
    if (activeModality === 'futsal_masc') {
      list = list.filter((m) => !/16\s*avos/i.test(m.roundName || ''));
    }
    if (modalityConfig.isIndividual) {
      if (selectedTeamId) {
        list = list.filter(
          (m) => m.teamAId === selectedTeamId || m.teamBId === selectedTeamId
        );
      }
    } else {
      if (selectedRoom) {
        const matchingTeamIds = currentModalityTeams
          .filter((t) => (t.playerClass || t.name)?.trim() === selectedRoom.trim())
          .map((t) => t.id);
        list = list.filter(
          (m) =>
            (m.teamAId ? matchingTeamIds.includes(m.teamAId) : false) ||
            (m.teamBId ? matchingTeamIds.includes(m.teamBId) : false)
        );
      }
    }
    return list;
  }, [matches, activeModality, modalityConfig.isIndividual, selectedTeamId, selectedRoom, currentModalityTeams]);

  // Group matches by roundIndex
  const roundsMap = new Map<number, Match[]>();
  filteredMatches.forEach((m) => {
    const list = roundsMap.get(m.roundIndex) || [];
    list.push(m);
    roundsMap.set(m.roundIndex, list);
  });

  const sortedRoundIndices = Array.from(roundsMap.keys()).sort((a, b) => a - b);
  const maxRoundIndex = sortedRoundIndices.length > 0 ? Math.max(...sortedRoundIndices) : 1;

  // Helper to get normalized phase display name (ex: 32 avos, 16 avos, Oitavas, Quartas, Semifinal, Grande Final)
  const getPhaseDisplayName = (rIdx: number, sampleMatch?: Match): string => {
    if (sampleMatch?.roundName) {
      if (/32\s*avos/i.test(sampleMatch.roundName)) return '32 avos de Final';
      if (/16\s*avos/i.test(sampleMatch.roundName)) return '16 avos de Final';
      if (/oitavas/i.test(sampleMatch.roundName)) return 'Oitavas de Final';
      if (/quartas/i.test(sampleMatch.roundName)) return 'Quartas de Final';
      if (/semi/i.test(sampleMatch.roundName)) return 'Semifinal';
      if (/grande\s*final|final/i.test(sampleMatch.roundName)) return 'Grande Final';
    }
    const diff = maxRoundIndex - rIdx;
    if (diff === 0) return 'Grande Final';
    if (diff === 1) return 'Semifinal';
    if (diff === 2) return 'Quartas de Final';
    if (diff === 3) return 'Oitavas de Final';
    if (diff === 4) return '16 avos de Final';
    if (diff === 5) return '32 avos de Final';
    return `Fase ${rIdx}`;
  };

  // Double Elimination structured data grouping Winners, Losers and Grand Final
  const doubleEliminationData = React.useMemo(() => {
    if (activeModality !== 'tenis_mesa_fem') return null;

    const winners = filteredMatches.filter((m) => m.bracketType === 'winners');
    const winnersMap = new Map<number, Match[]>();
    winners.forEach((m) => {
      const list = winnersMap.get(m.roundIndex) || [];
      list.push(m);
      winnersMap.set(m.roundIndex, list);
    });
    const winnersIndices = Array.from(winnersMap.keys()).sort((a, b) => a - b);

    const losers = filteredMatches.filter((m) => m.bracketType === 'losers');
    const losersMap = new Map<number, Match[]>();
    losers.forEach((m) => {
      const list = losersMap.get(m.roundIndex) || [];
      list.push(m);
      losersMap.set(m.roundIndex, list);
    });
    const losersIndices = Array.from(losersMap.keys()).sort((a, b) => a - b);

    const grand = filteredMatches.filter((m) => m.bracketType === 'grand_final');
    const grandMap = new Map<number, Match[]>();
    grand.forEach((m) => {
      const list = grandMap.get(m.roundIndex) || [];
      list.push(m);
      grandMap.set(m.roundIndex, list);
    });
    const grandIndices = Array.from(grandMap.keys()).sort((a, b) => a - b);

    return {
      winners,
      winnersMap,
      winnersIndices,
      losers,
      losersMap,
      losersIndices,
      grand,
      grandMap,
      grandIndices,
    };
  }, [filteredMatches, activeModality]);

  // Selected phase state: 'all' or number (roundIndex) or 'winners' | 'losers' | 'grand_final'
  const [selectedPhase, setSelectedPhase] = useState<any>('all');

  // Futsal Feminino Ida e Volta Summary
  const futsalFemSummary = React.useMemo(() => {
    return getFutsalFemFinalSummary(teams, matches);
  }, [teams, matches]);

  // Reset filters and selected phase when modality changes
  React.useEffect(() => {
    setSelectedRoom('');
    setSelectedTeamId('');
    setSelectedPhase('all');
  }, [activeModality]);

  // Reference for horizontal scroll containers
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -380, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 380, behavior: 'smooth' });
    }
  };

  // Score Editor Modal State
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [editTeamAId, setEditTeamAId] = useState<string>('');
  const [editTeamBId, setEditTeamBId] = useState<string>('');
  const [penaltyWinnerId, setPenaltyWinnerId] = useState<string>('');

  const handleOpenScoreModal = (match: Match) => {
    if (!canEditMatchScore(user, match.modality)) return;
    if (match.isBye) return;
    setSelectedMatch(match);
    setScoreA(match.scoreA ?? 0);
    setScoreB(match.scoreB ?? 0);
    setEditTeamAId(match.teamAId || '');
    setEditTeamBId(match.teamBId || '');
    setPenaltyWinnerId(match.penaltyWinnerId || '');
  };

  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;

    // Resolve overridden team names
    const teamA = teams.find((t) => t.id === editTeamAId);
    const teamB = teams.find((t) => t.id === editTeamBId);

    const teamAName = teamA
      ? (teamA.playerName && teamA.playerClass ? `${teamA.playerName} (${teamA.playerClass})` : teamA.name)
      : (editTeamAId === 'BYE' ? 'BYE' : 'A definir');

    const teamBName = teamB
      ? (teamB.playerName && teamB.playerClass ? `${teamB.playerName} (${teamB.playerClass})` : teamB.name)
      : (editTeamBId === 'BYE' ? 'BYE' : 'A definir');

    // Only apply penaltyWinnerId if the score is actually tied
    const isTie = scoreA === scoreB;
    const finalPenaltyWinnerId = isTie ? penaltyWinnerId : undefined;

    onUpdateMatchScore(
      selectedMatch.id,
      scoreA,
      scoreB,
      editTeamAId || undefined,
      editTeamBId || undefined,
      teamAName,
      teamBName,
      finalPenaltyWinnerId
    );
    setSelectedMatch(null);
  };

  // Helper to extract clear Team / Athlete Info with prominent Foto and Sala
  const getTeamInfo = (teamId?: string, fallbackName?: string) => {
    if (teamId) {
      const found = teams.find((t) => t.id === teamId);
      if (found) {
        // Table Tennis athlete
        if (found.playerName) {
          return {
            name: found.playerName,
            sala: found.playerClass || 'Sala não inf.',
            captain: undefined,
            imageUrl: found.imageUrl,
            shirtColor: found.shirtColor || '#0284c7',
            isDefined: true,
          };
        }
        // Team with playerClass
        if (found.playerClass) {
          return {
            name: found.name,
            sala: found.playerClass,
            captain: found.captain,
            imageUrl: found.imageUrl,
            shirtColor: found.shirtColor || '#0284c7',
            isDefined: true,
          };
        }
        // Team with regular name (e.g. "3º Ano A")
        return {
          name: found.name,
          sala: found.name, // Sala evidente
          captain: found.captain,
          imageUrl: found.imageUrl,
          shirtColor: found.shirtColor || '#0284c7',
          isDefined: true,
        };
      }
    }

    const isPending =
      !fallbackName ||
      fallbackName.toLowerCase().startsWith('vencedor') ||
      fallbackName.toLowerCase().startsWith('a definir');

    return {
      name: isPending ? 'A DEFINIR' : fallbackName,
      sala: isPending ? 'Aguardando' : fallbackName,
      captain: undefined,
      imageUrl: undefined,
      shirtColor: '#475569',
      isDefined: !isPending,
    };
  };

  // Find Champion if Final is decided
  const championTeam = React.useMemo(() => {
    if (activeModality === 'tenis_mesa_fem') {
      const resetMatch = filteredMatches.find((m) => m.isResetMatch);
      if (resetMatch && resetMatch.isActive && resetMatch.winnerId) {
        return teams.find((t) => t.id === resetMatch.winnerId) || null;
      }
      const firstFinal = filteredMatches.find((m) => m.roundName.includes('Grande Final') && !m.isResetMatch);
      if (firstFinal && firstFinal.winnerId) {
        if (firstFinal.winnerId === firstFinal.teamAId) {
          return teams.find((t) => t.id === firstFinal.winnerId) || null;
        }
      }
      return null;
    }

    const finalMatch = filteredMatches.find(
      (m) => m.roundIndex === maxRoundIndex || m.roundName.includes('Grande Final')
    );
    return finalMatch && finalMatch.winnerId ? teams.find((t) => t.id === finalMatch.winnerId) : null;
  }, [filteredMatches, activeModality, maxRoundIndex, teams]);

  // Render individual match card with evident photo and classroom
  const renderMatchCardInLine = (match: Match, isFinal = false) => {
    const teamA = getTeamInfo(match.teamAId, match.teamAName);
    const teamB = getTeamInfo(match.teamBId, match.teamBName);

    const hasScores = match.scoreA !== undefined && match.scoreB !== undefined;
    const isTeamAWinner = Boolean(match.winnerId && match.winnerId === match.teamAId);
    const isTeamBWinner = Boolean(match.winnerId && match.winnerId === match.teamBId);
    const isTeamALoser = Boolean(match.loserId && match.loserId === match.teamAId);
    const isTeamBLoser = Boolean(match.loserId && match.loserId === match.teamBId);

    return (
      <div
        key={match.id}
        onClick={() => handleOpenScoreModal(match)}
        className={`w-[320px] sm:w-[360px] md:w-[380px] shrink-0 border-2 rounded-2xl p-4 shadow-lg relative overflow-hidden transition-all duration-300 flex flex-col justify-between ${
          isFinal
            ? isDark
              ? 'border-amber-400 bg-[#0d1428] shadow-amber-500/20 ring-2 ring-amber-400/40'
              : 'border-amber-500 bg-gradient-to-b from-amber-50/70 via-white to-sky-50/70 shadow-amber-500/20 ring-2 ring-amber-400/40'
            : isDark
            ? 'bg-[#0b1329] border-slate-800/80 hover:border-amber-400/80 hover:shadow-xl hover:shadow-amber-500/10'
            : 'bg-white border-slate-200 hover:border-sky-400 shadow-md hover:shadow-lg'
        } ${
          canEditMatchScore(user, match.modality) && !match.isBye
            ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
            : ''
        }`}
      >
        {/* Top Gold Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 opacity-90" />

        {/* Card Header: Phase & Edit Button */}
        <div
          className={`flex items-center justify-between text-[11px] font-black uppercase tracking-wider pb-3 mb-3 border-b ${
            isDark ? 'text-slate-400 border-slate-800/80' : 'text-slate-600 border-slate-100'
          }`}
        >
          <span className="flex items-center gap-1.5 text-amber-500 font-bold">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>{match.roundName}</span>
          </span>

          {match.isBye && (
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-md text-[9px] font-extrabold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              W.O.
            </span>
          )}

          {canEditMatchScore(user, match.modality) && !match.isBye && (
            <span className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-1 rounded shadow-md transition-colors">
              <Pencil className="w-3 h-3" />
              <span>EDITAR</span>
            </span>
          )}
        </div>

        {/* Duel Face-off Area */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center my-1">
          {/* Team A */}
          <div className="flex flex-col items-center text-center space-y-1.5 min-w-0">
            {/* Foto Evidente */}
            <div className="relative">
              {teamA.imageUrl ? (
                <img
                  src={teamA.imageUrl}
                  alt={teamA.name}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 shadow-md bg-white ${
                    isTeamAWinner
                      ? 'border-amber-400 ring-4 ring-amber-400/30'
                      : isTeamALoser
                      ? 'border-slate-700 opacity-60'
                      : isDark
                      ? 'border-slate-800'
                      : 'border-slate-200'
                  }`}
                />
              ) : (
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center text-white shadow-md ${
                    isTeamAWinner
                      ? 'border-amber-400 ring-4 ring-amber-400/30'
                      : isTeamALoser
                      ? 'border-slate-700 opacity-60'
                      : isDark
                      ? 'border-slate-800'
                      : 'border-slate-200'
                  }`}
                  style={{ backgroundColor: teamA.shirtColor }}
                >
                  <Shirt className="w-7 h-7 drop-shadow-md" />
                </div>
              )}

              {isTeamAWinner && (
                <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 p-1 rounded-full shadow-lg">
                  <Crown className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            {/* Sala Evidente - Star Badge */}
            <div className="w-full flex justify-center">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-sm max-w-full truncate">
                <Star className="w-2.5 h-2.5 text-slate-950 fill-current shrink-0" />
                <span className="truncate">SALA: {teamA.sala}</span>
              </span>
            </div>

            {/* Nome / Atleta */}
            <div className="w-full px-1">
              <p
                title={teamA.name}
                className={`text-xs sm:text-sm uppercase tracking-tight truncate ${
                  isTeamAWinner
                    ? 'font-black text-amber-400'
                    : isTeamALoser
                    ? 'text-slate-500 line-through font-semibold'
                    : isDark
                    ? 'font-black text-white'
                    : 'font-black text-slate-900'
                }`}
              >
                {teamA.name}
              </p>
            </div>
          </div>

          {/* Center VS / Scores */}
          <div className="flex flex-col items-center justify-center px-1">
            {match.isBye ? (
              <div className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 rounded px-2.5 py-1 text-[11px] font-black tracking-wider text-center">
                W.O
              </div>
            ) : hasScores ? (
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center gap-1.5 border rounded-lg px-3 py-1 shadow-inner bg-[#070d1e] border-slate-800`}
                >
                  <span
                    className={`text-xl sm:text-2xl font-black font-mono tracking-tighter text-amber-400`}
                  >
                    {match.scoreA}
                  </span>
                  <span className="text-xs text-slate-500 font-black">:</span>
                  <span
                    className={`text-xl sm:text-2xl font-black font-mono tracking-tighter text-amber-400`}
                  >
                    {match.scoreB}
                  </span>
                </div>
                {match.scoreA === match.scoreB && match.penaltyWinnerId && (
                  <span className="text-[8px] bg-amber-500 text-slate-950 font-black px-1 py-0.5 rounded-sm mt-1 uppercase text-center max-w-[90px] truncate">
                    Pên: {teams.find((t) => t.id === match.penaltyWinnerId)?.name || 'Venceu'}
                  </span>
                )}
              </div>
            ) : (
              <div
                className={`border rounded-full w-9 h-9 flex items-center justify-center font-black text-xs shadow-inner ${
                  isDark
                    ? 'bg-blue-950/80 border-blue-800 text-amber-400'
                    : 'bg-sky-100 border-sky-300 text-sky-900'
                }`}
              >
                VS
              </div>
            )}
          </div>

          {/* Team B */}
          <div className="flex flex-col items-center text-center space-y-1.5 min-w-0">
            {/* Foto Evidente */}
            <div className="relative">
              {teamB.imageUrl ? (
                <img
                  src={teamB.imageUrl}
                  alt={teamB.name}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 shadow-md bg-white ${
                    isTeamBWinner
                      ? 'border-amber-400 ring-4 ring-amber-400/30'
                      : isTeamBLoser
                      ? 'border-slate-700 opacity-60'
                      : isDark
                      ? 'border-slate-800'
                      : 'border-slate-200'
                  }`}
                />
              ) : (
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center text-white shadow-md ${
                    isTeamBWinner
                      ? 'border-amber-400 ring-4 ring-amber-400/30'
                      : isTeamBLoser
                      ? 'border-slate-700 opacity-60'
                      : isDark
                      ? 'border-slate-800'
                      : 'border-slate-200'
                  }`}
                  style={{ backgroundColor: teamB.shirtColor }}
                >
                  <Shirt className="w-7 h-7 drop-shadow-md" />
                </div>
              )}

              {isTeamBWinner && (
                <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 p-1 rounded-full shadow-lg">
                  <Crown className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            {/* Sala Evidente - Star Badge */}
            <div className="w-full flex justify-center">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-sm max-w-full truncate">
                <Star className="w-2.5 h-2.5 text-slate-950 fill-current shrink-0" />
                <span className="truncate">SALA: {teamB.sala}</span>
              </span>
            </div>

            {/* Nome / Atleta */}
            <div className="w-full px-1">
              <p
                title={teamB.name}
                className={`text-xs sm:text-sm uppercase tracking-tight truncate ${
                  isTeamBWinner
                    ? 'font-black text-amber-400'
                    : isTeamBLoser
                    ? 'text-slate-500 line-through font-semibold'
                    : isDark
                    ? 'font-black text-white'
                    : 'font-black text-slate-900'
                }`}
              >
                {teamB.name}
              </p>
            </div>
          </div>
        </div>

        {/* Bye Notice Banner */}
        {match.isBye && (
          <div className="mt-3 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300 border border-emerald-500/30 px-2 py-1 text-[10px] font-black text-center rounded-xl flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Classificado automaticamente para a próxima fase!</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      className={`py-5 sm:py-7 relative overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Background Subtle Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 relative z-10">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-sky-800/30">
          <div>
            <span className="text-xs font-black uppercase text-amber-500 dark:text-amber-400 tracking-widest flex items-center gap-2">
              <span className="text-base">{modalityConfig.icon}</span>
              {modalityConfig.label} • Chaveamento Mata-mata
            </span>
            <h2
              className={`text-2xl sm:text-3xl font-black font-display uppercase tracking-tight mt-0.5 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              CHAVEAMENTO DA COMPETIÇÃO
            </h2>
          </div>

          {user?.role === 'admin' && (
            <button
              onClick={onGenerateBracket}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black rounded-xl shadow-lg transition-all hover:scale-105 uppercase tracking-wider cursor-pointer"
            >
              {activeModality === 'futsal_fem' ? (
                <>
                  <Trophy className="w-4 h-4 text-slate-950" />
                  Configurar Final (Ida e Volta)
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Sorteio Aleatório / Reset
                </>
              )}
            </button>
          )}
        </div>

        {/* Empty State when NO matches at all are generated for this modality */}
        {modalityMatches.length === 0 ? (
          <div
            className={`text-center py-14 border-2 border-dashed rounded-3xl p-8 ${
              isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-white border-slate-200'
            }`}
          >
            <Trophy className="w-14 h-14 text-amber-500 mx-auto mb-3 animate-bounce" />
            <h3
              className={`text-xl font-black uppercase font-display ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Chaveamento não gerado
            </h3>
            <p
              className={`text-xs mt-2 max-w-md mx-auto ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {user?.role === 'admin'
                ? `Cadastre ao menos 2 participantes na aba "Equipes" e clique em "Sorteio Aleatório / Reset".`
                : 'Aguarde a organização sortear as partidas.'}
            </p>
          </div>
        ) : (
          /* Main Poster Board */
          <div
            className={`rounded-3xl p-4 sm:p-6 shadow-2xl border-2 relative overflow-hidden backdrop-blur-md transition-colors ${
              isDark
                ? 'bg-gradient-to-b from-blue-950/80 via-slate-900/95 to-slate-950/90 border-amber-400/40 text-white'
                : 'bg-white border-amber-400/50 text-slate-900 shadow-xl'
            }`}
          >
            {/* Embedded Search Filters */}
            <div className={`p-4 sm:p-5 mb-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
              isDark ? 'bg-slate-900/60 border-blue-900/50' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-400/10 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                  <Search className="w-5 h-5 animate-pulse" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 block">
                    {modalityConfig.isIndividual ? 'Localizar Atleta' : 'Localizar Turma'}
                  </span>
                  <h3 className={`text-sm font-black uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {modalityConfig.isIndividual ? 'Filtrar por Atleta' : 'Filtrar por Turma/Sala'}
                  </h3>
                </div>
              </div>

              {/* Selector Control */}
              <div className="w-full md:max-w-md flex items-center gap-2">
                {modalityConfig.isIndividual ? (
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-black uppercase border outline-none cursor-pointer transition-all ${
                      isDark
                        ? 'bg-slate-950 border-blue-900 text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                    }`}
                  >
                    <option value="">-- Todos os Atletas --</option>
                    {athleteOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-black uppercase border outline-none cursor-pointer transition-all ${
                      isDark
                        ? 'bg-slate-950 border-blue-900 text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                    }`}
                  >
                    <option value="">-- Todas as Turmas / Salas --</option>
                    {roomOptions.map((room) => (
                      <option key={room} value={room}>
                        SALA: {room}
                      </option>
                    ))}
                  </select>
                )}

                {(selectedTeamId || selectedRoom) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeamId('');
                      setSelectedRoom('');
                    }}
                    className={`px-3 py-2.5 text-xs font-bold uppercase rounded-xl transition-colors cursor-pointer border shrink-0 ${
                      isDark
                        ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Champion Banner if Final has a winner (Hidden if filtering is active for clean visual layout) */}
            {championTeam && !selectedTeamId && !selectedRoom && (
              <div className="max-w-md mx-auto mb-6 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 p-4 rounded-2xl shadow-xl border-2 border-yellow-200 text-center animate-fade-in">
                <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider mb-2">
                  <Crown className="w-5 h-5 text-slate-950 animate-bounce" />
                  <span>GRANDE CAMPEÃO DO TORNEIO!</span>
                </div>

                <div className="my-2 flex justify-center">
                  {championTeam.imageUrl ? (
                    <img
                      src={championTeam.imageUrl}
                      alt={championTeam.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-950 shadow-xl bg-white"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-2xl border-2 border-slate-950 flex items-center justify-center text-white shadow-xl"
                      style={{ backgroundColor: championTeam.shirtColor }}
                    >
                      <Shirt className="w-8 h-8 drop-shadow" />
                    </div>
                  )}
                </div>

                <span className="text-xl font-black font-display uppercase block tracking-tight">
                  {championTeam.playerName || championTeam.name}
                </span>

                <div className="mt-1 flex justify-center">
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-slate-950 text-amber-300 text-xs font-black uppercase tracking-wider shadow">
                    <School className="w-3.5 h-3.5" />
                    SALA: {championTeam.playerClass || championTeam.name}
                  </span>
                </div>
              </div>
            )}

            {/* If dynamic filters find no matches, show empty state with option to clear */}
            {filteredMatches.length === 0 ? (
              <div className={`text-center py-12 rounded-2xl border-2 border-dashed p-6 my-4 ${
                isDark ? 'bg-slate-950/40 border-blue-900/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <Search className="w-10 h-10 text-amber-500 mx-auto mb-2 animate-bounce" />
                <h4 className={`text-base font-black uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Nenhum confronto encontrado para esta seleção
                </h4>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Experimente limpar o filtro acima ou escolher outra opção para ver os confrontos correspondentes.
                </p>
              </div>
            ) : (
              <>
                {/* Phase Selector Bar - "Escolher o chaveamento de acordo com a fase que deseja" */}
                <div className={`space-y-3 mb-6 ${activeModality === 'futsal_fem' ? 'hidden' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-500 dark:text-amber-400">
                    Selecione a Fase Desejada:
                  </span>
                </div>
              </div>

              {/* Phase Switcher Buttons */}
              <div
                className={`p-1.5 rounded-2xl border flex items-center gap-1.5 overflow-x-auto scrollbar-thin ${
                  isDark ? 'bg-slate-950/80 border-blue-900/80' : 'bg-slate-100 border-slate-200'
                }`}
              >
                {activeModality === 'tenis_mesa_fem' ? (
                  <>
                    {/* Option: Todas as Chaves */}
                    <button
                      type="button"
                      onClick={() => setSelectedPhase('all')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                        selectedPhase === 'all'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-md scale-[1.02]'
                          : isDark
                          ? 'text-slate-300 hover:text-white hover:bg-slate-900'
                          : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Todas as Chaves</span>
                      <span
                        className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          selectedPhase === 'all'
                            ? 'bg-slate-950 text-amber-300'
                            : isDark
                            ? 'bg-blue-900/60 text-slate-300'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {filteredMatches.length}
                      </span>
                    </button>

                    {/* Option: Chave Superior */}
                    <button
                      type="button"
                      onClick={() => setSelectedPhase('winners')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                        selectedPhase === 'winners'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-md scale-[1.02]'
                          : isDark
                          ? 'text-slate-300 hover:text-white hover:bg-slate-900'
                          : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span>Chave Superior</span>
                      <span
                        className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          selectedPhase === 'winners'
                            ? 'bg-slate-950 text-amber-300'
                            : isDark
                            ? 'bg-blue-900/60 text-slate-300'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {filteredMatches.filter(m => m.bracketType === 'winners').length}
                      </span>
                    </button>

                    {/* Option: Repescagem */}
                    <button
                      type="button"
                      onClick={() => setSelectedPhase('losers')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                        selectedPhase === 'losers'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-md scale-[1.02]'
                          : isDark
                          ? 'text-slate-300 hover:text-white hover:bg-slate-900'
                          : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                      }`}
                    >
                      <Swords className="w-3.5 h-3.5 text-amber-500" />
                      <span>Repescagem</span>
                      <span
                        className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          selectedPhase === 'losers'
                            ? 'bg-slate-950 text-amber-300'
                            : isDark
                            ? 'bg-blue-900/60 text-slate-300'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {filteredMatches.filter(m => m.bracketType === 'losers').length}
                      </span>
                    </button>

                    {/* Option: Grande Final */}
                    <button
                      type="button"
                      onClick={() => setSelectedPhase('grand_final')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                        selectedPhase === 'grand_final'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-md scale-[1.02]'
                          : isDark
                          ? 'text-slate-300 hover:text-white hover:bg-slate-900'
                          : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      <span>Grande Final</span>
                      <span
                        className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          selectedPhase === 'grand_final'
                            ? 'bg-slate-950 text-amber-300'
                            : isDark
                            ? 'bg-blue-900/60 text-slate-300'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {filteredMatches.filter(m => m.bracketType === 'grand_final').length}
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Option: Todas as Fases */}
                    <button
                      type="button"
                      onClick={() => setSelectedPhase('all')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                        selectedPhase === 'all'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-md scale-[1.02]'
                          : isDark
                          ? 'text-slate-300 hover:text-white hover:bg-slate-900'
                          : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Todas as Fases</span>
                      <span
                        className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          selectedPhase === 'all'
                            ? 'bg-slate-950 text-amber-300'
                            : isDark
                            ? 'bg-blue-900/60 text-slate-300'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {filteredMatches.length}
                      </span>
                    </button>

                    {/* Individual Phases: 16 avos, Oitavas, Quartas, Semifinal, Final */}
                    {sortedRoundIndices.map((rIdx) => {
                      const matchesInRound = roundsMap.get(rIdx) || [];
                      const phaseTitle = getPhaseDisplayName(rIdx, matchesInRound[0]);
                      const isSelected = selectedPhase === rIdx;
                      const isFinal = rIdx === maxRoundIndex;

                      return (
                        <button
                          key={rIdx}
                          type="button"
                          onClick={() => setSelectedPhase(rIdx)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-md scale-[1.02]'
                              : isDark
                              ? 'text-slate-300 hover:text-white hover:bg-slate-900'
                              : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                          }`}
                        >
                          {isFinal ? (
                            <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span>{phaseTitle}</span>
                          <span
                            className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              isSelected
                                ? 'bg-slate-950 text-amber-300'
                                : isDark
                                ? 'bg-blue-900/60 text-slate-300'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {matchesInRound.length}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            {/* Line-Format Content Area - "em forma de linha com espaço predefinido" */}
            {activeModality === 'futsal_fem' ? (
              // Futsal Feminino Direct Final (Ida e Volta) View
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sky-900/30">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Trophy className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black font-display uppercase tracking-wide">
                        Grande Final: Decisão em Ida e Volta (Sem Fase de Grupos)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Disputa direta pelo título entre as duas únicas equipes finalistas em 2 partidas (Ida e Volta) com soma de gols agregados.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Aggregate Scoreboard Banner */}
                <div className={`p-5 rounded-3xl border-2 shadow-xl ${
                  isDark
                    ? 'bg-gradient-to-br from-slate-900 via-blue-950/70 to-slate-900 border-amber-400/40 text-white'
                    : 'bg-gradient-to-br from-sky-50 via-white to-amber-50/50 border-amber-300 text-slate-900'
                }`}>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Team A */}
                    <div className="flex items-center gap-3 flex-1 justify-end text-right">
                      <div>
                        <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                          Finalista 1
                        </span>
                        <h4 className="text-base sm:text-lg font-black uppercase font-display">
                          {futsalFemSummary.teamAName}
                        </h4>
                      </div>
                      {futsalFemSummary.teamA?.imageUrl ? (
                        <img
                          src={futsalFemSummary.teamA.imageUrl}
                          alt={futsalFemSummary.teamAName}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-white font-black"
                          style={{ backgroundColor: futsalFemSummary.teamA?.shirtColor || '#0284c7' }}
                        >
                          <Shirt className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Aggregate Score Center */}
                    <div className="flex flex-col items-center px-4 py-2 rounded-2xl bg-black/30 border border-amber-400/30">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                        Placar Agregado
                      </span>
                      <div className="text-3xl sm:text-4xl font-black font-display tracking-tight text-white flex items-center gap-2">
                        <span className={futsalFemSummary.teamAGoals > futsalFemSummary.teamBGoals ? 'text-emerald-400' : ''}>
                          {futsalFemSummary.teamAGoals}
                        </span>
                        <span className="text-slate-500 text-2xl font-light">x</span>
                        <span className={futsalFemSummary.teamBGoals > futsalFemSummary.teamAGoals ? 'text-emerald-400' : ''}>
                          {futsalFemSummary.teamBGoals}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {futsalFemSummary.isDecided
                          ? futsalFemSummary.decidedByPenalties
                            ? 'Decidido nos Pênaltis'
                            : 'Resultado Final'
                          : futsalFemSummary.isIdaFinished
                          ? 'Jogo de Ida Concluído'
                          : 'Aguardando Início'}
                      </span>
                    </div>

                    {/* Team B */}
                    <div className="flex items-center gap-3 flex-1 justify-start text-left">
                      {futsalFemSummary.teamB?.imageUrl ? (
                        <img
                          src={futsalFemSummary.teamB.imageUrl}
                          alt={futsalFemSummary.teamBName}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-white font-black"
                          style={{ backgroundColor: futsalFemSummary.teamB?.shirtColor || '#db2777' }}
                        >
                          <Shirt className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                          Finalista 2
                        </span>
                        <h4 className="text-base sm:text-lg font-black uppercase font-display">
                          {futsalFemSummary.teamBName}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Champion Announcement Banner if decided */}
                  {futsalFemSummary.isDecided && futsalFemSummary.winnerTeamName && (
                    <div className="mt-4 pt-3 border-t border-amber-400/30 flex items-center justify-center gap-2 text-amber-300 font-black text-sm uppercase tracking-wide animate-pulse">
                      <Trophy className="w-5 h-5 text-amber-400" />
                      <span>
                        🏆 Campeã do Futsal Feminino: {futsalFemSummary.winnerTeamName}
                        {futsalFemSummary.decidedByPenalties ? ' (Vitória nos Pênaltis)' : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Match Cards List (Jogo de Ida e Jogo de Volta) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  {filteredMatches.map((m) => renderMatchCardInLine(m, false))}
                </div>
              </div>
            ) : activeModality === 'tenis_mesa_fem' ? (
              // Double Elimination Custom View
              <div className="space-y-8">
                {/* Winners Bracket */}
                {(selectedPhase === 'all' || selectedPhase === 'winners') && doubleEliminationData && doubleEliminationData.winnersIndices.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-sky-900/30">
                      <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
                        <Crown className="w-5 h-5 text-sky-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black font-display uppercase tracking-wide">
                          Chave Superior (Winners Bracket)
                        </h3>
                        <p className="text-xs text-slate-400">
                          Disputada por atletas que ainda não perderam nenhuma partida.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {doubleEliminationData.winnersIndices.map((rIdx) => {
                        const currentMatches = doubleEliminationData.winnersMap.get(rIdx) || [];
                        const phaseTitle = currentMatches[0]?.roundName || `Fase ${rIdx}`;
                        return (
                          <div key={rIdx} className="space-y-3">
                            <div className="flex items-center justify-between pb-1.5 border-b border-sky-950/60">
                              <span className="text-xs font-black uppercase text-sky-400 tracking-wider">
                                {phaseTitle} ({currentMatches.length} {currentMatches.length === 1 ? 'confronto' : 'confrontos'})
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1 px-1">
                              {currentMatches.map((m) => renderMatchCardInLine(m, false))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Losers/Repescagem Bracket */}
                {(selectedPhase === 'all' || selectedPhase === 'losers') && doubleEliminationData && doubleEliminationData.losersIndices.length > 0 && (
                  <div className="space-y-6 pt-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-amber-950/40">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500">
                        <Swords className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black font-display uppercase tracking-wide">
                          Chave de Repescagem (Losers Bracket)
                        </h3>
                        <p className="text-xs text-slate-400">
                          Disputada por quem já perdeu uma partida. Quem perder aqui é eliminado definitivamente.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {doubleEliminationData.losersIndices.map((rIdx) => {
                        const currentMatches = doubleEliminationData.losersMap.get(rIdx) || [];
                        const phaseTitle = currentMatches[0]?.roundName || `Fase ${rIdx}`;
                        return (
                          <div key={rIdx} className="space-y-3">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                              <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                                {phaseTitle} ({currentMatches.length} {currentMatches.length === 1 ? 'confronto' : 'confrontos'})
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1 px-1">
                              {currentMatches.map((m) => renderMatchCardInLine(m, false))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Grande Final Bracket */}
                {(selectedPhase === 'all' || selectedPhase === 'grand_final') && doubleEliminationData && doubleEliminationData.grandIndices.length > 0 && (
                  <div className="space-y-6 pt-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-yellow-500/30">
                      <div className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 animate-pulse">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black font-display uppercase tracking-wide">
                          Grande Final (Grand Final)
                        </h3>
                        <p className="text-xs text-slate-400">
                          Confronto final entre o campeão da Chave Superior (invicto) e o campeão da Repescagem.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {doubleEliminationData.grandIndices.map((rIdx) => {
                        const currentMatches = doubleEliminationData.grandMap.get(rIdx) || [];
                        const phaseTitle = currentMatches[0]?.roundName || `Fase ${rIdx}`;
                        return (
                          <div key={rIdx} className="space-y-3">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                              <span className="text-xs font-black uppercase text-yellow-400 tracking-wider">
                                {phaseTitle}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1 px-1">
                              {currentMatches.map((m) => renderMatchCardInLine(m, true))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : selectedPhase !== 'all' ? (
              // Single Selected Phase in a Line
              <div className="space-y-3">
                {(() => {
                  const currentMatches = roundsMap.get(selectedPhase as number) || [];
                  const phaseTitle = getPhaseDisplayName(
                    selectedPhase as number,
                    currentMatches[0]
                  );
                  const isFinal = (selectedPhase as number) === maxRoundIndex;

                  return (
                    <div>
                      {/* Phase Header with Navigation Arrows */}
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-sky-900/30">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500">
                            {isFinal ? (
                              <Crown className="w-4 h-4" />
                            ) : (
                              <Swords className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide flex items-center gap-2">
                              <span>{phaseTitle}</span>
                              <span className="text-xs font-bold text-slate-400">
                                ({currentMatches.length}{' '}
                                {currentMatches.length === 1 ? 'confronto' : 'confrontos'})
                              </span>
                            </h3>
                          </div>
                        </div>
                      </div>

                      {/* Vertical Grid Container */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1 px-1">
                        {currentMatches.map((m) => renderMatchCardInLine(m, isFinal))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              // "Todas as Fases" - Each phase presented in its own dedicated horizontal line track
              <div className="space-y-8">
                {sortedRoundIndices.map((rIdx) => {
                  const currentMatches = roundsMap.get(rIdx) || [];
                  const phaseTitle = getPhaseDisplayName(rIdx, currentMatches[0]);
                  const isFinal = rIdx === maxRoundIndex;

                  return (
                    <div key={rIdx} className="space-y-3">
                      {/* Phase Line Header */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-sky-900/40">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                              isFinal
                                ? 'bg-amber-500 text-slate-950 font-display'
                                : isDark
                                ? 'bg-blue-950 border border-blue-800 text-amber-400'
                                : 'bg-sky-100 border border-sky-200 text-sky-900'
                            }`}
                          >
                            {isFinal ? (
                              <Trophy className="w-3.5 h-3.5" />
                            ) : (
                              <Swords className="w-3.5 h-3.5" />
                            )}
                            {phaseTitle}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            • {currentMatches.length}{' '}
                            {currentMatches.length === 1 ? 'confronto' : 'confrontos'}
                          </span>
                        </div>

                      </div>

                      {/* Vertical Grid Track for this Phase */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1 px-1">
                        {currentMatches.map((m) => renderMatchCardInLine(m, isFinal))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </>)}
          </div>
        )}

        {/* Modal Score Editor for Admin */}
        {selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-slate-900">
            <div className="bg-white border-2 border-amber-400 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-amber-400">
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
                    PAINEL DE ARBITRAGEM • SÚMULA
                  </span>
                  <h3 className="text-lg font-black font-display uppercase tracking-wide">
                    {selectedMatch.roundName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMatch(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveScore} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Team A Input */}
                  {(() => {
                    const infoA = getTeamInfo(selectedMatch.teamAId, selectedMatch.teamAName);
                    return (
                      <div className="space-y-3 text-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        {infoA.imageUrl ? (
                          <img
                            src={infoA.imageUrl}
                            alt={infoA.name}
                            className="w-12 h-12 rounded-xl object-cover mx-auto border shadow-sm"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto text-white"
                            style={{ backgroundColor: infoA.shirtColor }}
                          >
                            <Shirt className="w-6 h-6" />
                          </div>
                        )}
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 text-[10px] font-black uppercase">
                          SALA REGISTRADA: {infoA.sala}
                        </span>
                        
                        <div className="space-y-1 text-left">
                          <label className="block text-[10px] font-black uppercase text-slate-500">
                            Selecionar Participante A:
                          </label>
                          <select
                            value={editTeamAId}
                            onChange={(e) => setEditTeamAId(e.target.value)}
                            className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:border-sky-500 outline-none"
                          >
                            <option value="">A definir</option>
                            <option value="BYE">BYE (W.O.)</option>
                            {currentModalityTeams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.playerName && t.playerClass ? `${t.playerName} (${t.playerClass})` : t.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="pt-2">
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                            Gols / Sets / Pontos A:
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={scoreA}
                            onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                            className="w-20 text-center py-2 bg-white border-2 border-sky-500 rounded-2xl text-2xl font-black focus:ring-4 focus:ring-sky-200 outline-none mx-auto block shadow-inner"
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Team B Input */}
                  {(() => {
                    const infoB = getTeamInfo(selectedMatch.teamBId, selectedMatch.teamBName);
                    return (
                      <div className="space-y-3 text-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        {infoB.imageUrl ? (
                          <img
                            src={infoB.imageUrl}
                            alt={infoB.name}
                            className="w-12 h-12 rounded-xl object-cover mx-auto border shadow-sm"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto text-white"
                            style={{ backgroundColor: infoB.shirtColor }}
                          >
                            <Shirt className="w-6 h-6" />
                          </div>
                        )}
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 text-[10px] font-black uppercase">
                          SALA REGISTRADA: {infoB.sala}
                        </span>

                        <div className="space-y-1 text-left">
                          <label className="block text-[10px] font-black uppercase text-slate-500">
                            Selecionar Participante B:
                          </label>
                          <select
                            value={editTeamBId}
                            onChange={(e) => setEditTeamBId(e.target.value)}
                            className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:border-sky-500 outline-none"
                          >
                            <option value="">A definir</option>
                            <option value="BYE">BYE (W.O.)</option>
                            {currentModalityTeams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.playerName && t.playerClass ? `${t.playerName} (${t.playerClass})` : t.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="pt-2">
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                            Gols / Sets / Pontos B:
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={scoreB}
                            onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                            className="w-20 text-center py-2 bg-white border-2 border-sky-500 rounded-2xl text-2xl font-black focus:ring-4 focus:ring-sky-200 outline-none mx-auto block shadow-inner"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {selectedMatch.modality === 'futsal_fem' && (() => {
                  const idaMatch = matches.find(m => m.modality === 'futsal_fem' && m.roundName.includes('Ida'));
                  const isVolta = selectedMatch.roundName.includes('Volta');
                  let isTiedAggregate = false;
                  if (isVolta && idaMatch && idaMatch.scoreA !== undefined && idaMatch.scoreB !== undefined) {
                    const teamAGoals = scoreA + (idaMatch.teamBId === editTeamAId ? idaMatch.scoreB : idaMatch.scoreA);
                    const teamBGoals = scoreB + (idaMatch.teamAId === editTeamBId ? idaMatch.scoreA : idaMatch.scoreB);
                    isTiedAggregate = teamAGoals === teamBGoals;
                  }
                  const shouldShowPenalties = scoreA === scoreB || isTiedAggregate;

                  if (!shouldShowPenalties) return null;

                  return (
                    <div className="bg-amber-500/10 border border-amber-400 p-4 rounded-2xl space-y-2 text-left">
                      <label className="block text-xs font-black uppercase text-amber-600 dark:text-amber-400">
                        ⚽ {isTiedAggregate ? 'EMPATE NO PLACAR AGREGADO (IDA E VOLTA) - DECISÃO POR PÊNALTIS:' : 'EMPATE DETECTADO - DECISÃO POR PÊNALTIS:'}
                      </label>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {isTiedAggregate
                          ? 'O placar somado dos dois jogos terminou empatado. Selecione a equipe vencedora nos pênaltis para consagrar a campeã oficial.'
                          : 'De acordo com o regulamento do Futsal Feminino, selecione quem venceu a disputa de pênaltis.'}
                      </p>
                      <select
                        value={penaltyWinnerId}
                        onChange={(e) => setPenaltyWinnerId(e.target.value)}
                        className="w-full py-2 px-3 bg-white border-2 border-amber-400 rounded-xl text-xs font-bold outline-none"
                        required
                      >
                        <option value="">-- Selecionar Vencedora dos Pênaltis --</option>
                        {editTeamAId && (
                          <option value={editTeamAId}>
                            {teams.find(t => t.id === editTeamAId)?.name || 'Equipe A'} (Venceu nos Pênaltis)
                          </option>
                        )}
                        {editTeamBId && (
                          <option value={editTeamBId}>
                            {teams.find(t => t.id === editTeamBId)?.name || 'Equipe B'} (Venceu nos Pênaltis)
                          </option>
                        )}
                      </select>
                    </div>
                  );
                })()}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMatch(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs uppercase shadow-lg tracking-wider cursor-pointer"
                  >
                    Salvar Placar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

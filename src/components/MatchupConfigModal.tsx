import React, { useState } from 'react';
import { Match, Team, ModalityType } from '../types';
import { MODALITY_CONFIGS } from '../utils/constants';
import {
  Swords,
  Shuffle,
  Trophy,
  ArrowRight,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Flame,
  Crown,
  AlertCircle,
  Layers,
  Shirt,
} from 'lucide-react';

interface MatchupConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[];
  teams: Team[];
  activeModality: ModalityType;
  onSaveMatches: (updatedMatches: Match[]) => void;
  theme?: 'light' | 'dark';
}

export const MatchupConfigModal: React.FC<MatchupConfigModalProps> = ({
  isOpen,
  onClose,
  matches,
  teams,
  activeModality,
  onSaveMatches,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const modalityConfig = MODALITY_CONFIGS[activeModality];

  // Modality teams and matches
  const modalityTeams = React.useMemo(() => {
    return teams.filter((t) => t.modality === activeModality);
  }, [teams, activeModality]);

  const modalityMatches = React.useMemo(() => {
    return matches.filter((m) => m.modality === activeModality);
  }, [matches, activeModality]);

  // Group modality matches by roundIndex
  const roundsMap = React.useMemo(() => {
    const map = new Map<number, Match[]>();
    modalityMatches.forEach((m) => {
      const list = map.get(m.roundIndex) || [];
      list.push(m);
      map.set(m.roundIndex, list);
    });
    return map;
  }, [modalityMatches]);

  const roundIndices = React.useMemo(() => {
    return Array.from(roundsMap.keys()).sort((a, b) => a - b);
  }, [roundsMap]);

  // Local draft of matches
  const [draftMatches, setDraftMatches] = useState<Match[]>([]);
  const [activeTabRound, setActiveTabRound] = useState<number>(1);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize draft when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setDraftMatches(JSON.parse(JSON.stringify(modalityMatches)));
      if (roundIndices.length > 0) {
        setActiveTabRound(roundIndices[0]);
      }
      setSaveSuccess(false);
    }
  }, [isOpen, modalityMatches, roundIndices]);

  if (!isOpen) return null;

  const currentRoundMatches = draftMatches.filter((m) => m.roundIndex === activeTabRound);
  const isFirstRound = activeTabRound === roundIndices[0];
  const previousRoundIndex = roundIndices[roundIndices.indexOf(activeTabRound) - 1];
  const previousRoundMatches = draftMatches.filter((m) => m.roundIndex === previousRoundIndex);

  // Helper to get formatted team label
  const getTeamLabel = (team?: Team) => {
    if (!team) return 'A definir';
    if (team.playerName && team.playerClass) {
      return `${team.playerName} (${team.playerClass})`;
    }
    return team.name;
  };

  // Helper to clean round name (strip trailing digits)
  const cleanRoundName = (name: string): string => {
    return name.replace(/\s+\d+$/, '').trim();
  };

  // Handle setting team in first round
  const handleSetRound1Team = (matchId: string, slot: 'A' | 'B', teamId: string) => {
    setDraftMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const selectedTeam = modalityTeams.find((t) => t.id === teamId);
        if (slot === 'A') {
          return {
            ...m,
            teamAId: teamId || undefined,
            teamAName: selectedTeam ? getTeamLabel(selectedTeam) : 'A definir',
          };
        } else {
          return {
            ...m,
            teamBId: teamId || undefined,
            teamBName: selectedTeam ? getTeamLabel(selectedTeam) : 'A definir',
          };
        }
      })
    );
  };

  // Handle setting source match in subsequent rounds (ex: Jogo 1 x Jogo 4)
  const handleSetSourceMatch = (targetMatchId: string, slot: 'A' | 'B', sourceMatchId: string) => {
    setDraftMatches((prev) => {
      const sourceMatch = prev.find((m) => m.id === sourceMatchId);
      const sourceLabel = sourceMatch ? `Venc. Jogo ${sourceMatch.matchNumber}` : 'A definir';
      const winnerId = sourceMatch?.winnerId;
      const winnerTeam = winnerId ? modalityTeams.find((t) => t.id === winnerId) : undefined;
      const resolvedTeamName = winnerTeam ? getTeamLabel(winnerTeam) : sourceLabel;

      return prev.map((m) => {
        // Update the target match slot
        if (m.id === targetMatchId) {
          if (slot === 'A') {
            return {
              ...m,
              sourceMatchAId: sourceMatchId || undefined,
              sourceLabelA: sourceLabel,
              teamAId: winnerId,
              teamAName: resolvedTeamName,
            };
          } else {
            return {
              ...m,
              sourceMatchBId: sourceMatchId || undefined,
              sourceLabelB: sourceLabel,
              teamBId: winnerId,
              teamBName: resolvedTeamName,
            };
          }
        }

        // Also update the source match nextMatch link
        if (sourceMatchId && m.id === sourceMatchId) {
          return {
            ...m,
            nextMatchId: targetMatchId,
            nextMatchSlot: slot,
          };
        }

        return m;
      });
    });
  };

  // Quick preset: Apply Cruzado (ex: Jogo 1 x Jogo 4, Jogo 2 x Jogo 3) for Semifinals
  const handleApplyCrossingPreset = () => {
    if (previousRoundMatches.length < 4 || currentRoundMatches.length < 2) return;

    // previous: 0=Jogo 1, 1=Jogo 2, 2=Jogo 3, 3=Jogo 4
    // current: 0=Semi 1, 1=Semi 2
    const prevM1 = previousRoundMatches[0];
    const prevM2 = previousRoundMatches[1];
    const prevM3 = previousRoundMatches[2];
    const prevM4 = previousRoundMatches[3];

    const semi1 = currentRoundMatches[0];
    const semi2 = currentRoundMatches[1];

    if (!semi1 || !semi2 || !prevM1 || !prevM2 || !prevM3 || !prevM4) return;

    setDraftMatches((prev) => {
      let updated = [...prev];

      // Semi 1: Jogo 1 x Jogo 4
      updated = updated.map((m) => {
        if (m.id === semi1.id) {
          const win1 = prevM1.winnerId ? modalityTeams.find((t) => t.id === prevM1.winnerId) : undefined;
          const win4 = prevM4.winnerId ? modalityTeams.find((t) => t.id === prevM4.winnerId) : undefined;
          return {
            ...m,
            sourceMatchAId: prevM1.id,
            sourceLabelA: `Venc. Jogo ${prevM1.matchNumber}`,
            teamAId: prevM1.winnerId,
            teamAName: win1 ? getTeamLabel(win1) : `Venc. Jogo ${prevM1.matchNumber}`,
            sourceMatchBId: prevM4.id,
            sourceLabelB: `Venc. Jogo ${prevM4.matchNumber}`,
            teamBId: prevM4.winnerId,
            teamBName: win4 ? getTeamLabel(win4) : `Venc. Jogo ${prevM4.matchNumber}`,
          };
        }
        if (m.id === semi2.id) {
          const win2 = prevM2.winnerId ? modalityTeams.find((t) => t.id === prevM2.winnerId) : undefined;
          const win3 = prevM3.winnerId ? modalityTeams.find((t) => t.id === prevM3.winnerId) : undefined;
          return {
            ...m,
            sourceMatchAId: prevM2.id,
            sourceLabelA: `Venc. Jogo ${prevM2.matchNumber}`,
            teamAId: prevM2.winnerId,
            teamAName: win2 ? getTeamLabel(win2) : `Venc. Jogo ${prevM2.matchNumber}`,
            sourceMatchBId: prevM3.id,
            sourceLabelB: `Venc. Jogo ${prevM3.matchNumber}`,
            teamBId: prevM3.winnerId,
            teamBName: win3 ? getTeamLabel(win3) : `Venc. Jogo ${prevM3.matchNumber}`,
          };
        }
        if (m.id === prevM1.id) return { ...m, nextMatchId: semi1.id, nextMatchSlot: 'A' };
        if (m.id === prevM4.id) return { ...m, nextMatchId: semi1.id, nextMatchSlot: 'B' };
        if (m.id === prevM2.id) return { ...m, nextMatchId: semi2.id, nextMatchSlot: 'A' };
        if (m.id === prevM3.id) return { ...m, nextMatchId: semi2.id, nextMatchSlot: 'B' };
        return m;
      });

      return updated;
    });
  };

  // Quick preset: Apply Sequential (Jogo 1 x Jogo 2, Jogo 3 x Jogo 4)
  const handleApplySequentialPreset = () => {
    if (previousRoundMatches.length < 4 || currentRoundMatches.length < 2) return;

    const prevM1 = previousRoundMatches[0];
    const prevM2 = previousRoundMatches[1];
    const prevM3 = previousRoundMatches[2];
    const prevM4 = previousRoundMatches[3];

    const semi1 = currentRoundMatches[0];
    const semi2 = currentRoundMatches[1];

    if (!semi1 || !semi2 || !prevM1 || !prevM2 || !prevM3 || !prevM4) return;

    setDraftMatches((prev) => {
      let updated = [...prev];

      // Semi 1: Jogo 1 x Jogo 2
      updated = updated.map((m) => {
        if (m.id === semi1.id) {
          const win1 = prevM1.winnerId ? modalityTeams.find((t) => t.id === prevM1.winnerId) : undefined;
          const win2 = prevM2.winnerId ? modalityTeams.find((t) => t.id === prevM2.winnerId) : undefined;
          return {
            ...m,
            sourceMatchAId: prevM1.id,
            sourceLabelA: `Venc. Jogo ${prevM1.matchNumber}`,
            teamAId: prevM1.winnerId,
            teamAName: win1 ? getTeamLabel(win1) : `Venc. Jogo ${prevM1.matchNumber}`,
            sourceMatchBId: prevM2.id,
            sourceLabelB: `Venc. Jogo ${prevM2.matchNumber}`,
            teamBId: prevM2.winnerId,
            teamBName: win2 ? getTeamLabel(win2) : `Venc. Jogo ${prevM2.matchNumber}`,
          };
        }
        if (m.id === semi2.id) {
          const win3 = prevM3.winnerId ? modalityTeams.find((t) => t.id === prevM3.winnerId) : undefined;
          const win4 = prevM4.winnerId ? modalityTeams.find((t) => t.id === prevM4.winnerId) : undefined;
          return {
            ...m,
            sourceMatchAId: prevM3.id,
            sourceLabelA: `Venc. Jogo ${prevM3.matchNumber}`,
            teamAId: prevM3.winnerId,
            teamAName: win3 ? getTeamLabel(win3) : `Venc. Jogo ${prevM3.matchNumber}`,
            sourceMatchBId: prevM4.id,
            sourceLabelB: `Venc. Jogo ${prevM4.matchNumber}`,
            teamBId: prevM4.winnerId,
            teamBName: win4 ? getTeamLabel(win4) : `Venc. Jogo ${prevM4.matchNumber}`,
          };
        }
        if (m.id === prevM1.id) return { ...m, nextMatchId: semi1.id, nextMatchSlot: 'A' };
        if (m.id === prevM2.id) return { ...m, nextMatchId: semi1.id, nextMatchSlot: 'B' };
        if (m.id === prevM3.id) return { ...m, nextMatchId: semi2.id, nextMatchSlot: 'A' };
        if (m.id === prevM4.id) return { ...m, nextMatchId: semi2.id, nextMatchSlot: 'B' };
        return m;
      });

      return updated;
    });
  };

  // Shuffle teams randomly in Round 1
  const handleShuffleRound1 = () => {
    const shuffled = [...modalityTeams].sort(() => Math.random() - 0.5);
    setDraftMatches((prev) => {
      let teamIndex = 0;
      return prev.map((m) => {
        if (m.roundIndex !== roundIndices[0]) return m;
        const teamA = shuffled[teamIndex++];
        const teamB = shuffled[teamIndex++];
        return {
          ...m,
          teamAId: teamA?.id,
          teamAName: teamA ? getTeamLabel(teamA) : 'A definir',
          teamBId: teamB?.id,
          teamBName: teamB ? getTeamLabel(teamB) : 'A definir',
        };
      });
    });
  };

  // Save changes
  const handleSave = () => {
    // Clean all round names (remove trailing digits like 'Quartas de Final 1' -> 'Quartas de Final')
    const cleaned = draftMatches.map((m) => ({
      ...m,
      roundName: cleanRoundName(m.roundName),
    }));

    onSaveMatches(cleaned);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in text-slate-900">
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border-2 overflow-hidden transition-all ${
          isDark ? 'bg-slate-900 border-amber-400/60 text-white' : 'bg-white border-amber-400 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4.5 border-b border-amber-400/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 block">
                {modalityConfig.label} • Mata-Mata Normal
              </span>
              <h2 className="text-xl font-black font-display uppercase tracking-tight text-white">
                Definir Confrontos: Quem Enfrenta Quem
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase Selector Tabs */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          {roundIndices.map((rIdx) => {
            const matchesInR = draftMatches.filter((m) => m.roundIndex === rIdx);
            const rawName = matchesInR[0]?.roundName || `Fase ${rIdx}`;
            const cleanName = cleanRoundName(rawName);
            const isSelected = activeTabRound === rIdx;

            return (
              <button
                key={rIdx}
                onClick={() => setActiveTabRound(rIdx)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg scale-102'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{cleanName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected
                      ? 'bg-slate-950 text-amber-300'
                      : isDark
                      ? 'bg-slate-900 text-slate-400'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {matchesInR.length} {matchesInR.length === 1 ? 'jogo' : 'jogos'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Instructions Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isDark ? 'bg-blue-950/40 border-blue-800/60' : 'bg-sky-50 border-sky-200'
            }`}
          >
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">
                {isFirstRound ? (
                  <span>
                    <strong>1ª Fase ({cleanRoundName(currentRoundMatches[0]?.roundName || '')}):</strong> Escolha quem cada equipe vai enfrentar nos jogos iniciais. Você também pode sortear de forma aleatória.
                  </span>
                ) : (
                  <span>
                    <strong>Fase Eliminatória ({cleanRoundName(currentRoundMatches[0]?.roundName || '')}):</strong> Escolha de qual confronto vem cada participante (exemplo: <strong>Jogo 1 x Jogo 4</strong>). Conforme os jogos terminam, o vencedor avança automaticamente!
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Preset Buttons for Semifinals */}
          {!isFirstRound && previousRoundMatches.length >= 4 && (
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                  Atalhos de Cruzamento
                </span>
                <p className="text-xs font-bold">
                  Defina os confrontos rapidamente com os modelos padrão:
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyCrossingPreset}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wide transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 text-slate-950 fill-current" />
                  <span>Jogo 1 x Jogo 4 &amp; Jogo 2 x Jogo 3</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplySequentialPreset}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isDark
                      ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600'
                      : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Jogo 1 x Jogo 2 &amp; Jogo 3 x Jogo 4</span>
                </button>
              </div>
            </div>
          )}

          {/* First Round Actions */}
          {isFirstRound && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-500 tracking-wider">
                Confrontos Iniciais da Fase
              </span>

              <button
                type="button"
                onClick={handleShuffleRound1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Sortear Equipes Aleatoriamente</span>
              </button>
            </div>
          )}

          {/* Match Cards Configuration List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentRoundMatches.map((m) => {
              const gameLabel = `Jogo ${m.matchNumber}`;
              const cleanPhase = cleanRoundName(m.roundName);

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border-2 flex flex-col justify-between transition-all ${
                    isDark
                      ? 'bg-slate-950/80 border-slate-800 hover:border-amber-400/50'
                      : 'bg-white border-slate-200 hover:border-amber-400 shadow-sm'
                  }`}
                >
                  {/* Card Header: Jogo X • Fase */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider">
                        {gameLabel}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {cleanPhase}
                      </span>
                    </div>

                    {!isFirstRound && m.sourceLabelA && m.sourceLabelB && (
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                        {m.sourceLabelA} × {m.sourceLabelB}
                      </span>
                    )}
                  </div>

                  {/* Face-off Pickers */}
                  <div className="space-y-3">
                    {/* Participant A */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Participante A:
                      </label>

                      {isFirstRound ? (
                        <select
                          value={m.teamAId || ''}
                          onChange={(e) => handleSetRound1Team(m.id, 'A', e.target.value)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-black uppercase border outline-none cursor-pointer ${
                            isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                          }`}
                        >
                          <option value="">-- A definir --</option>
                          {modalityTeams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {getTeamLabel(t)} {t.playerClass ? `(Sala: ${t.playerClass})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={m.sourceMatchAId || ''}
                          onChange={(e) => handleSetSourceMatch(m.id, 'A', e.target.value)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-black uppercase border outline-none cursor-pointer ${
                            isDark
                              ? 'bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-400'
                              : 'bg-amber-50 border-amber-300 text-amber-900 focus:border-amber-500'
                          }`}
                        >
                          <option value="">-- Escolha o Confronto de Origem --</option>
                          {previousRoundMatches.map((prevM) => (
                            <option key={prevM.id} value={prevM.id}>
                              Vencedor do Jogo {prevM.matchNumber} ({prevM.teamAName || 'A def.'} x {prevM.teamBName || 'A def.'})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* VS Badge */}
                    <div className="flex items-center justify-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-black text-[10px] uppercase border border-slate-700">
                        VS
                      </span>
                    </div>

                    {/* Participant B */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Participante B:
                      </label>

                      {isFirstRound ? (
                        <select
                          value={m.teamBId || ''}
                          onChange={(e) => handleSetRound1Team(m.id, 'B', e.target.value)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-black uppercase border outline-none cursor-pointer ${
                            isDark
                              ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-400'
                              : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                          }`}
                        >
                          <option value="">-- A definir --</option>
                          {modalityTeams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {getTeamLabel(t)} {t.playerClass ? `(Sala: ${t.playerClass})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={m.sourceMatchBId || ''}
                          onChange={(e) => handleSetSourceMatch(m.id, 'B', e.target.value)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-black uppercase border outline-none cursor-pointer ${
                            isDark
                              ? 'bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-400'
                              : 'bg-amber-50 border-amber-300 text-amber-900 focus:border-amber-500'
                          }`}
                        >
                          <option value="">-- Escolha o Confronto de Origem --</option>
                          {previousRoundMatches.map((prevM) => (
                            <option key={prevM.id} value={prevM.id}>
                              Vencedor do Jogo {prevM.matchNumber} ({prevM.teamAName || 'A def.'} x {prevM.teamBName || 'A def.'})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saveSuccess}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all hover:scale-105 cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-800 stroke-[3]" />
                <span>Salvo com Sucesso!</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                <span>Salvar e Aplicar Confrontos</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

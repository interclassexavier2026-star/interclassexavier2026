import React, { useState } from 'react';
import { Team, Match, ModalityType } from '../types';
import { MODALITY_CONFIGS } from '../utils/constants';
import { Trophy, Medal, Flame, Award, Star, Sparkles, TrendingUp, Shirt } from 'lucide-react';

interface StandingsSectionProps {
  teams: Team[];
  matches: Match[];
  activeModality: ModalityType;
  theme?: 'light' | 'dark';
}

interface ParticipantWinStats {
  team: Team;
  wins: number;
  losses: number;
  totalMatches: number;
  isChampion: boolean;
}

export const StandingsSection: React.FC<StandingsSectionProps> = ({
  teams,
  matches,
  activeModality,
  theme = 'dark',
}) => {
  const [viewMode, setViewMode] = useState<'modality' | 'overall'>('modality');
  const currentConfig = MODALITY_CONFIGS[activeModality];
  const isDark = theme === 'dark';

  // 1. Modality Wins Stats
  const filteredTeams = teams.filter((t) => t.modality === activeModality);
  const filteredMatches = matches.filter((m) => m.modality === activeModality);

  const finalMatch = filteredMatches.find(
    (m) => m.roundName === 'Grande Final' && m.winnerId
  );
  const championId = finalMatch?.winnerId;

  const statsMap: Record<string, ParticipantWinStats> = {};

  filteredTeams.forEach((t) => {
    statsMap[t.id] = {
      team: t,
      wins: 0,
      losses: 0,
      totalMatches: 0,
      isChampion: championId === t.id,
    };
  });

  filteredMatches.forEach((m) => {
    // If team won directly by bye
    if (m.isBye && m.winnerId && statsMap[m.winnerId]) {
      statsMap[m.winnerId].wins += 1;
      statsMap[m.winnerId].totalMatches += 1;
      return;
    }

    if (m.winnerId) {
      if (statsMap[m.winnerId]) {
        statsMap[m.winnerId].wins += 1;
        statsMap[m.winnerId].totalMatches += 1;
      }
      if (m.loserId && statsMap[m.loserId]) {
        statsMap[m.loserId].losses += 1;
        statsMap[m.loserId].totalMatches += 1;
      }
    }
  });

  const rankedParticipants = Object.values(statsMap).sort((a, b) => {
    if (a.isChampion) return -1;
    if (b.isChampion) return 1;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });

  // 2. School-wide Overall Class Wins (Ranking Geral por Sala)
  const classWinsMap: Record<string, { className: string; totalWins: number; shirtColor: string; imageUrl?: string }> = {};

  teams.forEach((t) => {
    const cleanClass = t.playerClass ? t.playerClass : t.name;

    if (!classWinsMap[cleanClass]) {
      classWinsMap[cleanClass] = {
        className: cleanClass,
        totalWins: 0,
        shirtColor: t.shirtColor,
        imageUrl: t.imageUrl,
      };
    } else if (t.imageUrl && !classWinsMap[cleanClass].imageUrl) {
      classWinsMap[cleanClass].imageUrl = t.imageUrl;
    }
  });

  matches.forEach((m) => {
    if (m.winnerId) {
      const winningTeam = teams.find((t) => t.id === m.winnerId);
      if (winningTeam) {
        const cleanClass = winningTeam.playerClass ? winningTeam.playerClass : winningTeam.name;
        if (classWinsMap[cleanClass]) {
          classWinsMap[cleanClass].totalWins += 1;
        }
      }
    }
  });

  const rankedSchoolClasses = Object.values(classWinsMap).sort(
    (a, b) => b.totalWins - a.totalWins
  );

  return (
    <section className={`py-6 sm:py-8 transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-white' : 'bg-sky-50/50 text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        {/* Section Header */}
        <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-4 ${
          isDark ? 'border-blue-900/60' : 'border-sky-200'
        }`}>
          <div>
            <div className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider mb-1 ${
              isDark ? 'text-amber-400' : 'text-sky-700'
            }`}>
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Estatísticas Oficiais do Torneio</span>
            </div>
            <h2 className={`text-3xl font-black font-display uppercase tracking-tight ${
              isDark ? 'text-white' : 'text-sky-950'
            }`}>
              QUADRO DE VITÓRIAS
            </h2>
            <p className={`text-sm font-medium mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Posicionamento dos participantes baseado no número total de vitórias conquistadas no torneio.
            </p>
          </div>

          {/* Toggle Views: Modalidade vs Geral */}
          <div className={`flex p-1.5 rounded-2xl border ${
            isDark ? 'bg-slate-900 border-blue-900' : 'bg-white border-sky-200 shadow-sm'
          }`}>
            <button
              onClick={() => setViewMode('modality')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'modality'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-sky-700'
              }`}
            >
              {currentConfig.icon} {currentConfig.shortLabel}
            </button>
            <button
              onClick={() => setViewMode('overall')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'overall'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-sky-700'
              }`}
            >
              🏆 Geral das Salas (Escola)
            </button>
          </div>
        </div>

        {viewMode === 'modality' ? (
          /* Modality Ranking by Wins */
          <div className="space-y-6">
            {rankedParticipants.length === 0 ? (
              <div className={`text-center py-16 border border-dashed rounded-3xl p-8 ${
                isDark ? 'bg-slate-900/40 border-blue-900' : 'bg-white border-sky-200'
              }`}>
                <Trophy className="w-12 h-12 text-sky-500 mx-auto mb-3" />
                <h3 className={`text-lg font-bold uppercase ${isDark ? 'text-white' : 'text-sky-950'}`}>
                  Sem vitórias registradas em {currentConfig.label}
                </h3>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  O quadro será atualizado automaticamente com o avanço de cada partida do chaveamento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {rankedParticipants.map((stat, idx) => {
                  const isGold = idx === 0 && stat.wins > 0;
                  const isSilver = idx === 1 && stat.wins > 0;
                  const isBronze = idx === 2 && stat.wins > 0;

                  return (
                    <div
                      key={stat.team.id}
                      className={`rounded-3xl p-6 border-2 transition-all shadow-md relative overflow-hidden flex flex-col justify-between ${
                        stat.isChampion
                          ? 'border-amber-400 bg-amber-500/10 ring-4 ring-amber-400/20'
                          : isDark
                          ? 'bg-slate-900 border-blue-900/80 text-white'
                          : 'bg-white border-sky-200 text-slate-900'
                      }`}
                    >
                      {/* Top Accent Bar */}
                      <div
                        className="absolute top-0 left-0 right-0 h-2"
                        style={{ backgroundColor: stat.team.shirtColor }}
                      />

                      <div>
                        {/* Header Badge */}
                        <div className="flex items-center justify-between mb-4 pt-1">
                          <div className="flex items-center gap-2">
                            {stat.isChampion ? (
                              <span className="px-3 py-1 bg-amber-400 text-slate-950 text-xs font-black rounded-xl uppercase flex items-center gap-1 shadow-sm">
                                <Trophy className="w-3.5 h-3.5" /> 1º Campeão
                              </span>
                            ) : isGold ? (
                              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-400/40 text-xs font-black rounded-xl flex items-center gap-1">
                                🥇 1º Lugar
                              </span>
                            ) : isSilver ? (
                              <span className="px-2.5 py-1 bg-slate-400/20 text-slate-300 border border-slate-400/40 text-xs font-bold rounded-xl flex items-center gap-1">
                                🥈 2º Lugar
                              </span>
                            ) : isBronze ? (
                              <span className="px-2.5 py-1 bg-amber-700/20 text-amber-300 border border-amber-700/40 text-xs font-bold rounded-xl flex items-center gap-1">
                                🥉 3º Lugar
                              </span>
                            ) : (
                              <span className={`px-2.5 py-1 border text-xs font-bold rounded-xl ${
                                isDark ? 'bg-slate-950 border-blue-900 text-slate-300' : 'bg-sky-50 border-sky-200 text-slate-700'
                              }`}>
                                {idx + 1}º Lugar
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-amber-400 font-black text-sm">
                            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span>{stat.wins} {stat.wins === 1 ? 'Vitória' : 'Vitórias'}</span>
                          </div>
                        </div>

                        {/* Team / Athlete info */}
                        <div className="flex items-center gap-3">
                          {stat.team.imageUrl ? (
                            <img
                              src={stat.team.imageUrl}
                              alt={stat.team.name}
                              className={`w-12 h-12 rounded-2xl object-cover border-2 shadow-sm ${
                                isDark ? 'border-blue-800' : 'border-sky-200 bg-white'
                              }`}
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-white shadow-sm"
                              style={{
                                backgroundColor: stat.team.shirtColor,
                                borderColor: isDark ? '#1e3a8a' : '#cbd5e1',
                              }}
                            >
                              <Shirt className="w-6 h-6" />
                            </div>
                          )}

                          <div>
                            <h4 className={`text-base font-black uppercase font-display tracking-tight ${
                              isDark ? 'text-white' : 'text-sky-950'
                            }`}>
                              {stat.team.playerName && stat.team.playerClass
                                ? stat.team.playerName
                                : stat.team.name}
                            </h4>
                            <span className={`text-xs font-bold block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {stat.team.playerClass ? `Sala: ${stat.team.playerClass}` : `Capitão: ${stat.team.captain}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stat Footer Bar */}
                      <div className={`mt-4 pt-3 border-t grid grid-cols-2 gap-2 text-center text-xs ${
                        isDark ? 'border-blue-900/60' : 'border-sky-100'
                      }`}>
                        <div>
                          <span className={`block text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Partidas Jogadas
                          </span>
                          <span className={`font-black ${isDark ? 'text-white' : 'text-sky-950'}`}>{stat.totalMatches}</span>
                        </div>
                        <div>
                          <span className={`block text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Aproveitamento
                          </span>
                          <span className="font-black text-emerald-500">
                            {stat.totalMatches > 0
                              ? `${Math.round((stat.wins / stat.totalMatches) * 100)}%`
                              : '0%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* School-wide Ranking of Classes */
          <div className="space-y-6">
            <div className={`p-6 border-2 rounded-3xl shadow-md ${
              isDark ? 'bg-slate-900 border-blue-900/80 text-white' : 'bg-white border-sky-200 text-slate-900'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className={`text-lg font-black uppercase font-display ${isDark ? 'text-white' : 'text-sky-950'}`}>
                  Ranking Geral das Turmas da Escola
                </h3>
              </div>
              <p className={`text-xs mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Soma de todas as vitórias obtidas pela mesma sala em todas as modalidades do Interclasse 2026.
              </p>

              <div className="space-y-3">
                {rankedSchoolClasses.map((item, index) => (
                  <div
                    key={item.className}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      index === 0
                        ? 'bg-amber-500/10 border-amber-400/50 font-bold'
                        : isDark
                        ? 'bg-slate-950 border-blue-900/60'
                        : 'bg-sky-50/50 border-sky-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                        index === 0
                          ? 'bg-amber-400 text-slate-950'
                          : index === 1
                          ? 'bg-slate-300 text-slate-900'
                          : index === 2
                          ? 'bg-amber-700 text-white'
                          : isDark ? 'bg-slate-800 text-slate-300' : 'bg-sky-200 text-sky-900'
                      }`}>
                        {index + 1}º
                      </span>

                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.className}
                          className="w-9 h-9 rounded-xl object-cover border border-amber-400/40"
                        />
                      )}

                      <div>
                        <span className={`text-sm font-black uppercase block ${isDark ? 'text-white' : 'text-sky-950'}`}>
                          {item.className}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-black text-amber-400">
                        {item.totalWins} {item.totalWins === 1 ? 'Vitória' : 'Vitórias'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

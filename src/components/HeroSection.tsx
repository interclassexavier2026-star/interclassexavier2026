import React from 'react';
import { ModalityType, User } from '../types';
import { MODALITY_CONFIGS } from '../utils/constants';
import { Trophy, Shield, GitBranch, ArrowRight, Sparkles, Flame } from 'lucide-react';

interface HeroSectionProps {
  activeModality: ModalityType;
  user: User | null;
  onOpenLogin: () => void;
  onSelectSection: (section: string) => void;
  teamsCount: number;
  matchesCount: number;
  theme?: 'light' | 'dark';
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  activeModality,
  user,
  onOpenLogin,
  onSelectSection,
  teamsCount,
  matchesCount,
  theme = 'dark',
}) => {
  const currentConfig = MODALITY_CONFIGS[activeModality];
  const isDark = theme === 'dark';

  return (
    <div className={`relative overflow-hidden py-6 sm:py-8 border-b transition-colors duration-300 ${
      isDark
        ? 'bg-slate-950 text-white border-blue-900/60'
        : 'bg-gradient-to-b from-sky-100 via-sky-50 to-white text-slate-900 border-sky-200'
    }`}>
      {/* Background Accent */}
      {isDark ? (
        <>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-10 left-10 w-72 h-72 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-300/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-10 left-10 w-72 h-72 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />
        </>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          {/* Main Title */}
          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black font-display tracking-tight leading-none uppercase ${
            isDark ? 'text-white' : 'text-sky-950'
          }`}>
            TORNEIO <span className="text-sky-500">INTERCLASSE</span> 2026
          </h1>

          <p className={`text-sm sm:text-base font-medium leading-relaxed ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Acompanhe em tempo real o chaveamento e o quadro de vitórias de{' '}
            <strong className={isDark ? 'text-amber-300' : 'text-sky-900'}>Futsal (Masc/Fem)</strong>,{' '}
            <strong className={isDark ? 'text-amber-300' : 'text-sky-900'}>Vôlei Misto</strong> e{' '}
            <strong className={isDark ? 'text-amber-300' : 'text-sky-900'}>Tênis de Mesa (Masc/Fem)</strong>.
          </p>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onSelectSection('chaveamento')}
              className="flex items-center gap-2 px-5 py-3 bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg transition-all hover:scale-105 cursor-pointer"
            >
              <GitBranch className="w-4 h-4" />
              Chaveamento: {currentConfig.shortLabel}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectSection('vitorias')}
              className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black rounded-2xl shadow-md transition-all hover:scale-105 cursor-pointer"
            >
              <Flame className="w-4 h-4 text-slate-950" />
              Quadro de Vitórias
            </button>

            {!user && (
              <button
                onClick={onOpenLogin}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-2xl shadow-sm transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 hover:bg-slate-800 text-sky-200 border border-blue-900'
                    : 'bg-white hover:bg-sky-50 text-sky-900 border border-sky-300'
                }`}
              >
                <Shield className="w-4 h-4 text-sky-500" />
                Painel Admin
              </button>
            )}
          </div>

          {/* Key Indicators */}
          <div className="grid grid-cols-2 gap-3 pt-2 max-w-sm mx-auto">
            <div className={`p-3 rounded-2xl border text-center shadow-sm ${
              isDark ? 'bg-slate-900/90 border-blue-900/80 text-white' : 'bg-white border-sky-200 text-slate-900'
            }`}>
              <span className={`block text-xl font-black ${isDark ? 'text-amber-400' : 'text-sky-900'}`}>{teamsCount}</span>
              <span className={`text-[11px] font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {currentConfig.isIndividual ? 'Atletas Inscritos' : 'Equipes na Disputa'}
              </span>
            </div>

            <div className={`p-3 rounded-2xl border text-center shadow-sm ${
              isDark ? 'bg-slate-900/90 border-blue-900/80 text-white' : 'bg-white border-sky-200 text-slate-900'
            }`}>
              <span className={`block text-xl font-black ${isDark ? 'text-amber-400' : 'text-sky-900'}`}>{matchesCount}</span>
              <span className={`text-[11px] font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Partidas no Torneio</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { User, ModalityType } from '../types';
import { MODALITY_CONFIGS, COUNTDOWN_TARGET } from '../utils/constants';
import {
  Trophy,
  Shield,
  LogOut,
  Users,
  GitBranch,
  Flame,
  UserCheck,
  Clock,
  Search,
  Sun,
  Moon,
  Settings,
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activeModality: ModalityType;
  onSelectModality: (modality: ModalityType) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  activeSection: string;
  onSelectSection: (section: string) => void;
  onTogglePreviewCountdown?: () => void;
  onOpenSettings?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeModality,
  onSelectModality,
  onOpenLogin,
  onLogout,
  activeSection,
  onSelectSection,
  onTogglePreviewCountdown,
  onOpenSettings,
  theme = 'dark',
  onToggleTheme,
}) => {
  const isBeforeTarget = new Date().getTime() < COUNTDOWN_TARGET.getTime();
  const isDark = theme === 'dark';

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-300 ${
      isDark
        ? 'bg-slate-900/95 border-blue-900/80 shadow-lg text-white'
        : 'bg-white/95 border-sky-100 shadow-sm text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Admin Settings */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => onSelectSection('chaveamento')}
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-sky-200">
                <Trophy className="w-6 h-6 text-amber-200" />
              </div>
              <div>
                <span className={`text-xl font-black font-display tracking-tight uppercase block leading-none ${
                  isDark ? 'text-white' : 'text-sky-950'
                }`}>
                  INTERCLASSE <span className="text-sky-500">2026</span>
                </span>
                <span className="text-[10px] font-bold tracking-wider text-sky-500 uppercase">
                  Torneio Escolar Oficial
                </span>
              </div>
            </div>

            {/* Admin Settings Button placed right next to Interclasse 2026 */}
            {user?.role === 'admin' && onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                title="Configurações do Sistema"
                className={`p-2 rounded-xl border flex items-center justify-center transition-all shadow-sm ml-1 cursor-pointer ${
                  isDark
                    ? 'bg-slate-800/90 text-amber-300 border-slate-700 hover:bg-slate-700 hover:border-amber-400/80 hover:scale-105'
                    : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100 hover:scale-105'
                }`}
              >
                <Settings className="w-5 h-5 text-amber-400" />
              </button>
            )}
          </div>

          {/* Center Navigation Links */}
          <nav className={`hidden lg:flex items-center gap-1 p-1.5 rounded-2xl border ${
            isDark ? 'bg-blue-950/80 border-blue-900' : 'bg-sky-50/80 border-sky-100'
          }`}>
            <button
              type="button"
              onClick={() => onSelectSection('chaveamento')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'chaveamento'
                  ? isDark ? 'bg-amber-400 text-slate-950 shadow font-black' : 'bg-white text-sky-700 shadow-sm'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-sky-700'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              Chaveamento
            </button>

            <button
              type="button"
              onClick={() => onSelectSection('times')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'times'
                  ? isDark ? 'bg-amber-400 text-slate-950 shadow font-black' : 'bg-white text-sky-700 shadow-sm'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-sky-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Equipes & Atletas
            </button>

            <button
              type="button"
              onClick={() => onSelectSection('vitorias')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSection === 'vitorias'
                  ? isDark ? 'bg-amber-400 text-slate-950 shadow font-black' : 'bg-white text-sky-700 shadow-sm'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-sky-700'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-500" />
              Vitórias
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button for ALL Users */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                title={isDark ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
                className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                    : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                }`}
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
                ) : (
                  <Moon className="w-4 h-4 text-sky-700" />
                )}
              </button>
            )}

            {/* Login / User Status */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                  isDark ? 'bg-blue-950 border-blue-900 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-900'
                }`}>
                  {user.role === 'admin' ? (
                    <Shield className="w-4 h-4 text-sky-500" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-sky-500" />
                  )}
                  <span className="text-xs font-bold truncate max-w-[100px]">
                    {user.name || user.username}
                  </span>
                  {user.role === 'admin' && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                      ADMIN
                    </span>
                  )}
                </div>
                <button
                  onClick={onLogout}
                  title="Sair da conta"
                  className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:scale-105 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                Entrar
              </button>
            )}
          </div>
        </div>

        {/* Mobile-only primary section navigation */}
        <div className={`lg:hidden py-2 border-t flex items-center gap-1.5 overflow-x-auto no-scrollbar ${
          isDark ? 'border-blue-900/60' : 'border-sky-100'
        }`}>
          <button
            type="button"
            onClick={() => onSelectSection('chaveamento')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSection === 'chaveamento'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : isDark ? 'bg-blue-950 text-slate-300 border border-blue-900' : 'bg-sky-50 text-slate-700 border border-sky-100'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Chaveamento</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSection('times')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSection === 'times'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : isDark ? 'bg-blue-950 text-slate-300 border border-blue-900' : 'bg-sky-50 text-slate-700 border border-sky-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Equipes</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSection('vitorias')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeSection === 'vitorias'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : isDark ? 'bg-blue-950 text-slate-300 border border-blue-900' : 'bg-sky-50 text-slate-700 border border-sky-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Vitórias</span>
          </button>
        </div>

        {/* Sub-bar: Merged Grouped Modalities Bar (TEXT ONLY) */}
        <div className={`py-2 border-t flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar ${
          isDark ? 'border-blue-900/60' : 'border-sky-100'
        }`}>
          {/* Futsal Group */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${
            isDark ? 'bg-blue-950/60 border-blue-900/80' : 'bg-sky-50/80 border-sky-200'
          }`}>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 ${
              isDark ? 'text-sky-400' : 'text-sky-800'
            }`}>
              Futsal:
            </span>
            <button
              type="button"
              onClick={() => onSelectModality('futsal_masc')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeModality === 'futsal_masc'
                  ? 'bg-sky-600 text-white font-black shadow-sm'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-sky-900'
              }`}
            >
              Masculino
            </button>
            <button
              type="button"
              onClick={() => onSelectModality('futsal_fem')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeModality === 'futsal_fem'
                  ? 'bg-sky-600 text-white font-black shadow-sm'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-sky-900'
              }`}
            >
              Feminino
            </button>
          </div>

          {/* Vôlei Group */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${
            isDark ? 'bg-blue-950/60 border-blue-900/80' : 'bg-sky-50/80 border-sky-200'
          }`}>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 ${
              isDark ? 'text-amber-400' : 'text-amber-800'
            }`}>
              Vôlei:
            </span>
            <button
              type="button"
              onClick={() => onSelectModality('volei_misto')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeModality === 'volei_misto'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-amber-900'
              }`}
            >
              Misto
            </button>
          </div>

          {/* Tênis de Mesa Group */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${
            isDark ? 'bg-blue-950/60 border-blue-900/80' : 'bg-sky-50/80 border-sky-200'
          }`}>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 ${
              isDark ? 'text-emerald-400' : 'text-emerald-800'
            }`}>
              Tênis de Mesa:
            </span>
            <button
              type="button"
              onClick={() => onSelectModality('tenis_mesa_masc')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeModality === 'tenis_mesa_masc'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-emerald-900'
              }`}
            >
              Masculino
            </button>
            <button
              type="button"
              onClick={() => onSelectModality('tenis_mesa_fem')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeModality === 'tenis_mesa_fem'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-emerald-900'
              }`}
            >
              Feminino
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

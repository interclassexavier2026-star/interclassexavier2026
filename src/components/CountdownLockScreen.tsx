import React, { useState, useEffect } from 'react';
import { Trophy, Clock, Shield, Sparkles, Flame, Users, Calendar, ArrowRight, Lock } from 'lucide-react';
import { COUNTDOWN_TARGET } from '../utils/constants';

interface CountdownLockScreenProps {
  onAdminLoginClick: () => void;
  onUnlocked: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const CountdownLockScreen: React.FC<CountdownLockScreenProps> = ({
  onAdminLoginClick,
  onUnlocked,
}) => {
  const calculateTimeLeft = (): TimeLeft => {
    const now = new Date().getTime();
    const target = COUNTDOWN_TARGET.getTime();
    const difference = target - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((difference / 1000 / 60) % 60);
    const seconds = Math.floor((difference / 1000) % 60);

    return { days, hours, minutes, seconds, isExpired: false };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      const updated = calculateTimeLeft();
      setTimeLeft(updated);
      if (updated.isExpired) {
        onUnlocked();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onUnlocked]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-sky-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-20 left-10 w-96 h-96 bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-80 h-80 bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar with Discreet Admin Access */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-sky-900/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
            <Trophy className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <span className="text-lg font-black font-display tracking-wider text-white uppercase block leading-none">
              INTERCLASSE <span className="text-amber-400">2026</span>
            </span>
            <span className="text-[10px] font-extrabold tracking-widest text-sky-400 uppercase">
              Portal Oficial dos Jogos
            </span>
          </div>
        </div>

        {/* Admin Login Button */}
        <button
          onClick={onAdminLoginClick}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 hover:bg-slate-800 text-sky-200 hover:text-amber-300 border border-sky-800/80 hover:border-amber-400/80 rounded-xl text-xs font-bold transition-all shadow-md hover:scale-105"
        >
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Acesso da Comissão / Admin</span>
        </button>
      </header>

      {/* Main Countdown Section */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-10 flex flex-col items-center text-center space-y-8 my-auto">
        {/* Release Date Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-black uppercase tracking-widest animate-pulse">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span>Grande Abertura: 14 de Outubro às 06:45</span>
        </div>

        {/* Main Headline */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-display tracking-tight text-white uppercase drop-shadow-[0_4px_24px_rgba(56,189,248,0.4)]">
            CONTAGEM <span className="text-amber-400 drop-shadow-[0_4px_24px_rgba(251,191,36,0.6)]">REGRESSIVA</span>
          </h1>
          <p className="text-sm sm:text-base text-sky-200/90 font-medium max-w-2xl mx-auto leading-relaxed">
            Os chaveamentos, tabelas de vitórias, confrontos das turmas e resultados serão liberados para todos os alunos e torcedores no apito inicial do evento.
          </p>
        </div>

        {/* 4 Clock Blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full max-w-3xl pt-2">
          {/* Days */}
          <div className="bg-gradient-to-b from-slate-900/90 to-blue-950/90 border-2 border-sky-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md relative overflow-hidden group hover:border-amber-400 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-amber-400" />
            <span className="block text-4xl sm:text-6xl font-black font-display text-white tracking-tight drop-shadow-md">
              {String(timeLeft.days).padStart(2, '0')}
            </span>
            <span className="text-[11px] sm:text-xs font-black uppercase text-sky-300 tracking-widest mt-2 block">
              DIAS
            </span>
          </div>

          {/* Hours */}
          <div className="bg-gradient-to-b from-slate-900/90 to-blue-950/90 border-2 border-sky-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md relative overflow-hidden group hover:border-amber-400 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-amber-400" />
            <span className="block text-4xl sm:text-6xl font-black font-display text-white tracking-tight drop-shadow-md">
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
            <span className="text-[11px] sm:text-xs font-black uppercase text-sky-300 tracking-widest mt-2 block">
              HORAS
            </span>
          </div>

          {/* Minutes */}
          <div className="bg-gradient-to-b from-slate-900/90 to-blue-950/90 border-2 border-sky-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md relative overflow-hidden group hover:border-amber-400 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-amber-400" />
            <span className="block text-4xl sm:text-6xl font-black font-display text-white tracking-tight drop-shadow-md">
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
            <span className="text-[11px] sm:text-xs font-black uppercase text-sky-300 tracking-widest mt-2 block">
              MINUTOS
            </span>
          </div>

          {/* Seconds */}
          <div className="bg-gradient-to-b from-slate-900/90 to-blue-950/90 border-2 border-amber-400/60 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md relative overflow-hidden group hover:border-amber-300 transition-all ring-2 ring-amber-400/20">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-300" />
            <span className="block text-4xl sm:text-6xl font-black font-display text-amber-400 tracking-tight drop-shadow-[0_2px_12px_rgba(251,191,36,0.6)]">
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
            <span className="text-[11px] sm:text-xs font-black uppercase text-amber-300 tracking-widest mt-2 block">
              SEGUNDOS
            </span>
          </div>
        </div>

        {/* Modalities Preview Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-sky-800 text-xs font-bold text-sky-200 flex items-center gap-1.5">
            ⚽ Futsal Masc.
          </span>
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-sky-800 text-xs font-bold text-sky-200 flex items-center gap-1.5">
            ⚽ Futsal Fem.
          </span>
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-sky-800 text-xs font-bold text-sky-200 flex items-center gap-1.5">
            🏐 Vôlei Misto
          </span>
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-sky-800 text-xs font-bold text-sky-200 flex items-center gap-1.5">
            🏓 Tênis de Mesa Masc.
          </span>
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-sky-800 text-xs font-bold text-sky-200 flex items-center gap-1.5">
            🏓 Tênis de Mesa Fem.
          </span>
        </div>

        {/* Notice Card */}
        <div className="w-full max-w-xl bg-blue-950/60 border border-blue-800/60 rounded-2xl p-4 text-xs text-sky-200 text-center">
          <p className="font-bold text-white uppercase mb-0.5">Aviso da Organização:</p>
          <p>
            O acesso a chaveamentos, escalações e pontuação estará disponível pontualmente no dia 14/10 às 06:45 para todos os dispositivos.
          </p>
        </div>
      </main>

      {/* Footer info */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-500 border-t border-sky-950">
        Torneio Escolar Interclasse 2026 • Todos os direitos reservados
      </footer>
    </div>
  );
};

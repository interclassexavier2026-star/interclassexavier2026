import React from 'react';
import { Trophy, Shield } from 'lucide-react';

interface FooterProps {
  theme?: 'light' | 'dark';
}

export const Footer: React.FC<FooterProps> = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';

  return (
    <footer className={`py-12 border-t transition-colors duration-300 ${
      isDark
        ? 'bg-slate-950 text-white border-blue-900/80'
        : 'bg-white text-slate-900 border-sky-200 shadow-inner'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex flex-col md:flex-row items-center justify-between gap-6 border-b pb-8 ${
          isDark ? 'border-blue-900/60' : 'border-sky-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-amber-500 flex items-center justify-center text-white shadow-md">
              <Trophy className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <span className={`text-lg font-black font-display tracking-wider uppercase block ${
                isDark ? 'text-white' : 'text-sky-950'
              }`}>
                INTERCLASSE <span className="text-sky-500">2026</span>
              </span>
              <span className={`text-[11px] font-bold uppercase tracking-widest ${
                isDark ? 'text-amber-400' : 'text-sky-700'
              }`}>
                Gestão Oficial de Torneios Escolares
              </span>
            </div>
          </div>

          <div className={`flex flex-wrap justify-center items-center gap-4 text-xs font-bold uppercase ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}>
            <span>Futsal (Masc/Fem)</span>
            <span>•</span>
            <span>Vôlei Misto</span>
            <span>•</span>
            <span>Tênis de Mesa</span>
            <span>•</span>
            <span>Chaveamento Automático</span>
          </div>
        </div>

        <div className={`pt-6 flex flex-col sm:flex-row items-center justify-between text-xs font-medium gap-4 ${
          isDark ? 'text-slate-400' : 'text-slate-600'
        }`}>
          <p>© 2026 Torneio Interclasse. Todos os direitos reservados.</p>
          <div className={`flex items-center gap-1.5 font-bold ${
            isDark ? 'text-slate-300' : 'text-sky-900'
          }`}>
            <Shield className="w-4 h-4 text-sky-500" />
            <span>Sistema Seguro de Chaveamento & Tabela Oficial</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

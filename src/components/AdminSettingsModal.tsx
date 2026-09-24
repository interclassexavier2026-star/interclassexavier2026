import React, { useState } from 'react';
import { Settings, Lock, Unlock, Eye, X, Shield, Clock, Users, Trash2, Plus, KeyRound, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  countdownForceDisabled: boolean;
  onToggleCountdown: () => void;
  onPreviewCountdown: () => void;
  theme?: 'light' | 'dark';
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  countdownForceDisabled,
  onToggleCountdown,
  onPreviewCountdown,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  const [subAdmins, setSubAdmins] = useState<User[]>(() => {
    try {
      const data = localStorage.getItem('interclasse_subadmins');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const saveSubAdmins = (newList: User[]) => {
    setSubAdmins(newList);
    localStorage.setItem('interclasse_subadmins', JSON.stringify(newList));
  };

  // Temp state for new sub-admin creation inputs for each slot
  const [inputs, setInputs] = useState<Record<string, { u: string; p: string }>>({
    futsal: { u: '', p: '' },
    volei: { u: '', p: '' },
    tenis_mesa: { u: '', p: '' },
  });

  const handleInputChange = (slot: string, field: 'u' | 'p', value: string) => {
    setInputs((prev) => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        [field]: value,
      },
    }));
  };

  const handleCreate = (slot: 'futsal' | 'volei' | 'tenis_mesa') => {
    const u = inputs[slot].u.trim();
    const p = inputs[slot].p.trim();
    if (!u || !p) return;

    if (u.toLowerCase() === 'admin') {
      alert("O nome de usuário 'admin' é reservado para o administrador geral.");
      return;
    }

    const taken = subAdmins.some((sa) => sa.username.toLowerCase() === u.toLowerCase());
    if (taken) {
      alert("Este nome de usuário já está sendo utilizado por outro administrador.");
      return;
    }

    const newUser: User = {
      username: u,
      password: p,
      role: 'subadmin',
      allowedModality: slot,
    };

    const updated = [...subAdmins.filter((sa) => sa.allowedModality !== slot), newUser];
    saveSubAdmins(updated);

    // Reset inputs
    setInputs((prev) => ({
      ...prev,
      [slot]: { u: '', p: '' },
    }));
  };

  const handleDelete = (slot: 'futsal' | 'volei' | 'tenis_mesa') => {
    const updated = subAdmins.filter((sa) => sa.allowedModality !== slot);
    saveSubAdmins(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className={`border-2 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden relative ${
        isDark ? 'bg-slate-900 border-blue-900 text-white' : 'bg-white border-sky-200 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white border-b border-blue-900 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest block">
                Painel do Administrador
              </span>
              <h3 className="text-xl font-black font-display uppercase tracking-wide">
                Configurações do Sistema
              </h3>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {/* Lock Screen Toggle Option */}
          <div className={`p-5 rounded-2xl border-2 space-y-3 transition-colors ${
            isDark ? 'bg-slate-950 border-blue-900/80' : 'bg-sky-50/60 border-sky-200'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl mt-0.5 ${
                  countdownForceDisabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {countdownForceDisabled ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className={`text-sm font-black uppercase font-display ${isDark ? 'text-white' : 'text-sky-950'}`}>
                    Tela de Bloqueio (Contagem Regressiva)
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {countdownForceDisabled
                      ? 'O público geral tem acesso livre para navegar nas turmas, equipes e chaveamento.'
                      : 'O público geral verá a tela de bloqueio com contagem regressiva até o dia oficial.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between">
              <span className={`text-xs font-bold ${
                countdownForceDisabled ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                Status Atual: {countdownForceDisabled ? 'LIVRE (Sem Bloqueio)' : 'BLOQUEADO'}
              </span>

              <button
                type="button"
                onClick={onToggleCountdown}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer ${
                  countdownForceDisabled
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                {countdownForceDisabled ? 'Ativar Bloqueio' : 'Desativar Bloqueio'}
              </button>
            </div>
          </div>

          {/* Student Lock Preview Button */}
          <div className={`p-5 rounded-2xl border-2 flex items-center justify-between gap-4 ${
            isDark ? 'bg-slate-950 border-blue-900/80' : 'bg-sky-50/60 border-sky-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-400/20 text-amber-400 border border-amber-400/30 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className={`text-sm font-black uppercase font-display ${isDark ? 'text-white' : 'text-sky-950'}`}>
                  Visualizar Bloqueio Alunos
                </h4>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Veja como os alunos e visitantes enxergam a tela do temporizador.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onPreviewCountdown();
                onClose();
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all hover:scale-105 shrink-0 cursor-pointer"
            >
              <Eye className="w-4 h-4 inline-block mr-1" />
              Testar
            </button>
          </div>

          {/* SAAS PANEL: Sub-Admins por modalidade */}
          <div className={`p-5 rounded-2xl border-2 space-y-4 ${
            isDark ? 'bg-slate-950 border-blue-900/80' : 'bg-sky-50/60 border-sky-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl">
                <Users className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-left">
                <h4 className={`text-sm font-black uppercase font-display ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Coordenadores de Modalidade (SaaS)
                </h4>
                <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Crie contas específicas para gerenciar os resultados de cada esporte de forma isolada.
                </p>
              </div>
            </div>

            {/* List of 3 Modality Slots */}
            <div className="space-y-4">
              {[
                { slot: 'futsal', label: 'FUTSAL', desc: 'Futsal Masc. e Fem.', color: 'text-sky-400' },
                { slot: 'volei', label: 'VÔLEI MISTO', desc: 'Quadra de Vôlei', color: 'text-amber-400' },
                { slot: 'tenis_mesa', label: 'TÊNIS DE MESA', desc: 'Tênis de Mesa Masc. e Fem.', color: 'text-emerald-400' },
              ].map(({ slot, label, desc, color }) => {
                const subAdmin = subAdmins.find((sa) => sa.allowedModality === slot);

                return (
                  <div key={slot} className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-100'
                  }`}>
                    {/* Modality details */}
                    <div className="text-left space-y-1">
                      <span className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md ${
                        slot === 'futsal' ? 'bg-sky-500/10' : slot === 'volei' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                      } ${color}`}>
                        {label}
                      </span>
                      <p className={`text-xs font-black uppercase ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {desc}
                      </p>
                      
                      {subAdmin && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg font-bold font-mono uppercase ${
                            isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-700'
                          }`}>
                            <UserIcon className="w-3 h-3 text-sky-500" />
                            Usuário: <span className="font-black text-amber-500">{subAdmin.username}</span>
                          </span>
                          <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg font-bold font-mono uppercase ${
                            isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-700'
                          }`}>
                            <KeyRound className="w-3 h-3 text-emerald-500" />
                            Senha: <span className="font-black text-emerald-500">{subAdmin.password}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="shrink-0">
                      {subAdmin ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(slot as any)}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase rounded-xl shadow-md transition-all hover:scale-105 cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover Acesso
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Novo Usuário"
                              value={inputs[slot].u}
                              onChange={(e) => handleInputChange(slot, 'u', e.target.value)}
                              className={`pl-3 pr-3 py-2 text-xs rounded-xl border outline-none font-bold uppercase transition-all w-32 ${
                                isDark
                                  ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-500'
                              }`}
                            />
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Senha"
                              value={inputs[slot].p}
                              onChange={(e) => handleInputChange(slot, 'p', e.target.value)}
                              className={`pl-3 pr-3 py-2 text-xs rounded-xl border outline-none font-bold uppercase transition-all w-32 ${
                                isDark
                                  ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-500'
                              }`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCreate(slot as any)}
                            disabled={!inputs[slot].u.trim() || !inputs[slot].p.trim()}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-[10px] font-black uppercase rounded-xl shadow-md transition-all hover:scale-105 cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none disabled:scale-100"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Liberar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t text-right ${isDark ? 'border-blue-900 bg-slate-950/50' : 'border-sky-100 bg-sky-50'}`}>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

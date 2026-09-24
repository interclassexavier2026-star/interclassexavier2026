import React, { useState } from 'react';
import { User } from '../types';
import { X, Shield, User as UserIcon, Lock, KeyRound } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  theme?: 'light' | 'dark';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  theme = 'dark',
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMsg('Por favor, informe seu usuário.');
      return;
    }

    // Check if Admin credentials
    if (cleanUser.toLowerCase() === 'admin') {
      if (password === '1234') {
        const adminUser: User = { username: 'admin', role: 'admin', name: 'Administrador' };
        onLoginSuccess(adminUser);
        onClose();
        return;
      } else {
        setErrorMsg('Senha incorreta para a conta de Administrador.');
        return;
      }
    }

    // Check if Sub-Admin credentials
    try {
      const subAdminsData = localStorage.getItem('interclasse_subadmins');
      if (subAdminsData) {
        const subAdmins: User[] = JSON.parse(subAdminsData);
        const matchSub = subAdmins.find(
          (u) => u.username.trim().toLowerCase() === cleanUser.toLowerCase()
        );
        if (matchSub) {
          if (matchSub.password === password) {
            const displayNames: Record<string, string> = {
              futsal: 'Admin Futsal',
              volei: 'Admin Vôlei',
              tenis_mesa: 'Admin Tênis de Mesa',
            };
            onLoginSuccess({
              username: matchSub.username,
              role: 'subadmin',
              name: displayNames[matchSub.allowedModality || ''] || matchSub.name || 'Coordenador',
              allowedModality: matchSub.allowedModality,
            });
            onClose();
            return;
          } else {
            setErrorMsg('Senha incorreta para esta conta de coordenador.');
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error parsing sub-admins', err);
    }

    setErrorMsg('Acesso restrito. Login permitido apenas para Administradores.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className={`border rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative ${
        isDark ? 'bg-slate-900 border-blue-900 text-white' : 'bg-white border-sky-100 text-slate-900'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-amber-300" />
          </div>
          <h2 className="text-2xl font-bold font-display tracking-wide uppercase">
            Área Administrativa
          </h2>
          <p className="text-xs text-sky-100 mt-1">
            Entre com as credenciais da comissão organizadora.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div>
            <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Usuário
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Nome de Usuário (ex: admin)"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium border outline-none transition-all ${
                  isDark
                    ? 'bg-slate-950 border-blue-900 text-white focus:border-amber-400'
                    : 'bg-sky-50/60 border-sky-200 text-slate-900 focus:bg-white focus:border-sky-500'
                }`}
                required
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Sua Senha (ex: 1234)"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium border outline-none transition-all ${
                  isDark
                    ? 'bg-slate-950 border-blue-900 text-white focus:border-amber-400'
                    : 'bg-sky-50/60 border-sky-200 text-slate-900 focus:bg-white focus:border-sky-500'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-md transition-all hover:scale-[1.01] cursor-pointer"
          >
            Acessar Sistema
          </button>
        </form>
      </div>
    </div>
  );
};

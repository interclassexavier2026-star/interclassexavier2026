import React, { useState, useEffect } from 'react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  isSupabaseConfigured,
  getSupabaseClient,
} from '../utils/supabaseClient';
import {
  syncAllLocalDataToSupabase,
  supabaseFetchTeams,
  supabaseFetchMatches,
  supabaseFetchImages,
  SUPABASE_SQL_SCHEMA,
} from '../utils/supabaseDb';
import { setStoredTeams, setStoredMatches } from '../utils/storage';
import { saveImageToIndexedDb } from '../utils/indexedDbStorage';
import { Team, Match } from '../types';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Key,
  Globe,
  X,
  Sparkles,
} from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: (teams: Team[], matches: Match[]) => void;
  theme?: 'light' | 'dark';
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isCopiedSql, setIsCopiedSql] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const { url: currentUrl, key: currentKey } = getSupabaseCredentials();
      setUrl(currentUrl);
      setKey(currentKey);
      setIsConnected(isSupabaseConfigured());
      setSyncStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(url, key);
    const configured = isSupabaseConfigured();
    setIsConnected(configured);

    if (configured) {
      setSyncStatusMsg({
        type: 'success',
        text: 'Credenciais salvas! Conexão com Supabase ativada com sucesso.',
      });
    } else {
      setSyncStatusMsg({
        type: 'error',
        text: 'Por favor, insira uma URL e uma Anon Key válidas do Supabase.',
      });
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setIsCopiedSql(true);
    setTimeout(() => setIsCopiedSql(false), 2000);
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);

    const result = await syncAllLocalDataToSupabase();
    setIsSyncing(false);

    if (result.success) {
      setSyncStatusMsg({
        type: 'success',
        text: `Sincronização Concluída! ${result.teamsSynced} equipes, ${result.matchesSynced} confrontos e ${result.imagesSynced} imagens enviadas para o Supabase.`,
      });
    } else {
      setSyncStatusMsg({
        type: 'error',
        text: result.error || 'Erro ao sincronizar dados com o Supabase. Verifique se executou o script SQL das tabelas.',
      });
    }
  };

  const handlePullFromSupabase = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);

    try {
      const teams = await supabaseFetchTeams();
      const matches = await supabaseFetchMatches();
      const images = await supabaseFetchImages();

      setIsSyncing(false);

      if (teams && teams.length > 0) {
        setStoredTeams(teams);
      }
      if (matches && matches.length > 0) {
        setStoredMatches(matches);
      }
      if (images) {
        for (const [imgId, dataUrl] of Object.entries(images)) {
          await saveImageToIndexedDb(imgId, dataUrl);
        }
      }

      if (teams || matches) {
        setSyncStatusMsg({
          type: 'success',
          text: `Dados baixados do Supabase! ${teams?.length || 0} equipes e ${matches?.length || 0} partidas atualizados na aplicação.`,
        });
        if (onDataRestored) {
          onDataRestored(teams || [], matches || []);
        }
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: 'Nenhum dado encontrado nas tabelas do Supabase. Envie dados primeiro usando a sincronização.',
        });
      }
    } catch (err) {
      setIsSyncing(false);
      setSyncStatusMsg({
        type: 'error',
        text: 'Erro ao baixar dados do Supabase. Verifique se as tabelas existem.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in text-slate-900">
      <div
        className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border-2 overflow-hidden ${
          isDark ? 'bg-slate-900 border-emerald-500/50 text-white' : 'bg-white border-emerald-500 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4.5 border-b border-emerald-500/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                INTEGRAÇÃO DE BANCO DE DADOS
              </span>
              <h2 className="text-xl font-black font-display uppercase tracking-tight text-white flex items-center gap-2">
                <span>Conectar Banco Supabase</span>
                {isConnected ? (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    CONECTADO
                  </span>
                ) : (
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    MODO LOCAL
                  </span>
                )}
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Status Alert Banner */}
          {syncStatusMsg && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                syncStatusMsg.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              }`}
            >
              {syncStatusMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              )}
              <p className="text-xs font-bold leading-relaxed">{syncStatusMsg.text}</p>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSaveCredentials} className="space-y-4">
            <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
              <Key className="w-4 h-4" />
              1. Credenciais de Acesso do Supabase
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  URL do Projeto Supabase (VITE_SUPABASE_URL):
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzxyz.supabase.co"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono font-bold border outline-none ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white focus:border-emerald-400'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Chave Anon Pública (VITE_SUPABASE_ANON_KEY):
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono font-bold border outline-none ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white focus:border-emerald-400'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              Salvar Credenciais e Conectar
            </button>
          </form>

          {/* Step 2: SQL Editor Schema Script */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                2. Script SQL de Criação de Tabelas
              </h3>

              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-black text-xs uppercase transition-colors cursor-pointer border border-slate-700"
              >
                {isCopiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Copie o código abaixo e cole no <strong>SQL Editor</strong> do seu painel do Supabase para criar automaticamente as tabelas <code className="text-emerald-400 font-mono font-bold">teams</code>, <code className="text-emerald-400 font-mono font-bold">matches</code> e <code className="text-emerald-400 font-mono font-bold">media_images</code>.
            </p>

            <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 max-h-36 overflow-y-auto scrollbar-thin">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>

          {/* Step 3: Data Sync Actions */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" />
              3. Sincronização de Dados e Imagens
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSyncToSupabase}
                disabled={isSyncing || !isConnected}
                className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isSyncing || !isConnected
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 cursor-pointer hover:scale-102'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Enviar Tudo para o Supabase</span>
              </button>

              <button
                type="button"
                onClick={handlePullFromSupabase}
                disabled={isSyncing || !isConnected}
                className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border shadow-lg transition-all ${
                  isSyncing || !isConnected
                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700 cursor-pointer hover:scale-102'
                }`}
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Puxar Dados do Supabase</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ModalityType, Team, Match, User } from './types';
import { COUNTDOWN_TARGET } from './utils/constants';
import {
  getStoredUser,
  setStoredUser,
  getStoredTeams,
  setStoredTeams,
  getStoredMatches,
  setStoredMatches,
  generateAutomaticBracket,
  generateDoubleEliminationBracket,
  forceSaveAllData,
  clearAllRegisteredTeams,
  sanitizeFutsalFemMatches,
  markTeamAsDeleted,
  unmarkTeamAsDeleted,
  filterDeletedTeams,
  clearDeletedTeamIds,
} from './utils/storage';
import { getAllImagesFromIndexedDb, saveImageToIndexedDb, imageMemoryCache } from './utils/indexedDbStorage';
import { CheckCircle2 } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { TeamsSection } from './components/TeamsSection';
import { BracketSection } from './components/BracketSection';
import { StandingsSection } from './components/StandingsSection';
import { LoginModal } from './components/LoginModal';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { CountdownLockScreen } from './components/CountdownLockScreen';
import { Footer } from './components/Footer';

export function App() {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [activeModality, setActiveModality] = useState<ModalityType>('futsal_masc');
  const [activeSection, setActiveSection] = useState<string>('chaveamento');
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Global Theme State ('light' | 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('interclasse_theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('interclasse_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [teams, setTeams] = useState<Team[]>(getStoredTeams());
  const [matches, setMatches] = useState<Match[]>(getStoredMatches());

  // Hydrate high-capacity images from IndexedDB on mount
  useEffect(() => {
    getAllImagesFromIndexedDb().then((imageMap) => {
      if (imageMap && Object.keys(imageMap).length > 0) {
        setTeams((prevTeams) =>
          prevTeams.map((t) => {
            if (imageMap[t.id]) {
              return { ...t, imageUrl: imageMap[t.id] };
            }
            return t;
          })
        );
      }
    }).catch((err) => {
      console.warn('Could not read IndexedDB image store', err);
    });
  }, []);

  // Countdown lock state: Lock all visitors until 14/10/2026 at 06:45 AM
  const [isUnlockedByTime, setIsUnlockedByTime] = useState<boolean>(
    () => new Date().getTime() >= COUNTDOWN_TARGET.getTime()
  );
  // Admin dynamic bypass toggle for the countdown lock screen
  const [countdownForceDisabled, setCountdownForceDisabled] = useState<boolean>(
    () => localStorage.getItem('interclasse_countdown_force_disabled') !== 'false'
  );
  // Admin preview toggle: allows admin to preview the countdown lock screen
  const [previewCountdownAsAdmin, setPreviewCountdownAsAdmin] = useState<boolean>(false);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('interclasse_countdown_force_disabled', String(countdownForceDisabled));
  }, [countdownForceDisabled]);

  useEffect(() => {
    setStoredUser(user);
  }, [user]);

  useEffect(() => {
    setStoredTeams(teams);
  }, [teams]);

  useEffect(() => {
    setStoredMatches(matches);
  }, [matches]);

  // Toast notification for user confirmation
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual save of all teams, images, and matches to persistent stores (JSON / LocalStorage)
  const handleManualSave = async () => {
    const res = await forceSaveAllData(teams, matches, user);
    setToastMessage(`✓ Todas as ${res.teamsCount} equipes e fotos foram salvas com sucesso no seu dispositivo!`);
    setTimeout(() => setToastMessage(null), 4500);
    return res;
  };

  // Restore complete backup
  const handleRestoreBackup = (newTeams: Team[], newMatches: Match[]) => {
    setTeams(newTeams);
    setMatches(newMatches);
    setToastMessage(`✓ Backup completo restaurado com sucesso! (${newTeams.length} equipes carregadas)`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Clear / Wipe all registered teams and matches
  const handleClearAllTeams = async () => {
    clearDeletedTeamIds();
    await clearAllRegisteredTeams();
    setTeams([]);
    setMatches([]);
    setToastMessage('✓ Todos os times e confrontos cadastrados foram zerados com sucesso!');
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Handle Team / Athlete Creation
  const handleAddTeam = async (teamData: Omit<Team, 'id' | 'createdDate'>) => {
    const newTeam: Team = {
      ...teamData,
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdDate: new Date().toISOString(),
    };

    unmarkTeamAsDeleted(newTeam.id);

    if (newTeam.imageUrl) {
      imageMemoryCache.set(newTeam.id, newTeam.imageUrl);
      saveImageToIndexedDb(newTeam.id, newTeam.imageUrl).catch(() => {});
    }

    setTeams((prev) => {
      if (prev.some((t) => t.id === newTeam.id)) return prev;
      const next = [...prev, newTeam];
      setStoredTeams(next);
      return next;
    });

    setToastMessage(`✓ Equipe "${newTeam.name}" cadastrada com sucesso!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Team Deletion
  const handleDeleteTeam = async (teamId: string) => {
    const teamToDelete = teams.find((t) => t.id === teamId);
    if (!teamToDelete) return;

    // 1. Mark as deleted locally so it can NEVER reappear
    markTeamAsDeleted(teamId);

    // 2. Remove from memory cache
    imageMemoryCache.delete(teamId);

    // 3. Update React state and LocalStorage immediately
    const nextTeams = teams.filter((t) => t.id !== teamId);
    setTeams(nextTeams);
    setStoredTeams(nextTeams);

    // 4. Clean up match references in local state
    setMatches((prevMatches) => {
      const nextMatches = prevMatches.map((m) => {
        let updatedM = { ...m };
        let changed = false;
        if (m.teamAId === teamId) {
          updatedM.teamAId = undefined;
          updatedM.teamAName = 'A definir';
          changed = true;
        }
        if (m.teamBId === teamId) {
          updatedM.teamBId = undefined;
          updatedM.teamBName = 'A definir';
          changed = true;
        }
        if (m.winnerId === teamId) {
          updatedM.winnerId = undefined;
          changed = true;
        }
        if (m.loserId === teamId) {
          updatedM.loserId = undefined;
          changed = true;
        }
        return changed ? updatedM : m;
      });
      setStoredMatches(nextMatches);
      return nextMatches;
    });

    setToastMessage(`✓ Equipe "${teamToDelete.name}" excluída com sucesso!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Updating Players Roster for a Team (Futsal & Vôlei)
  const handleUpdateTeamPlayers = async (teamId: string, players: string[]) => {
    setTeams((prev) => {
      const next = prev.map((t) => {
        if (t.id === teamId) {
          return { ...t, players };
        }
        return t;
      });
      setStoredTeams(next);
      return next;
    });
  };

  // Handle Updating Team Image / Logo (Futsal, Vôlei Misto, etc.)
  const handleUpdateTeamImage = async (teamId: string, imageUrl?: string) => {
    if (imageUrl) {
      imageMemoryCache.set(teamId, imageUrl);
      saveImageToIndexedDb(teamId, imageUrl).catch(() => {});
    }
    setTeams((prev) => {
      const next = prev.map((t) => {
        if (t.id === teamId) {
          return { ...t, imageUrl };
        }
        return t;
      });
      setStoredTeams(next);
      return next;
    });
  };

  // Handle fully updating team details (such as playerClass/room, playerName, etc.)
  const handleUpdateTeam = async (updatedTeam: Team) => {
    if (updatedTeam.imageUrl) {
      imageMemoryCache.set(updatedTeam.id, updatedTeam.imageUrl);
      saveImageToIndexedDb(updatedTeam.id, updatedTeam.imageUrl).catch(() => {});
    }
    setTeams((prev) => {
      const next = prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t));
      setStoredTeams(next);
      return next;
    });

    const updatedName = updatedTeam.playerName && updatedTeam.playerClass
      ? `${updatedTeam.playerName} (${updatedTeam.playerClass})`
      : updatedTeam.name;

    setMatches((prevMatches) =>
      prevMatches.map((m) => {
        let updatedMatch = { ...m };
        let changed = false;

        if (m.teamAId === updatedTeam.id) {
          updatedMatch.teamAName = updatedName;
          changed = true;
        }
        if (m.teamBId === updatedTeam.id) {
          updatedMatch.teamBName = updatedName;
          changed = true;
        }

        return changed ? updatedMatch : m;
      })
    );
  };

  // Handle Automatic Bracket Generation for activeModality (Normal Knockout)
  const handleGenerateBracket = (modality: ModalityType = activeModality) => {
    const modalityTeams = teams.filter((t) => t.modality === modality);
    if (modalityTeams.length < 2) {
      alert('Cadastre pelo menos 2 equipes para gerar o chaveamento desta modalidade.');
      return;
    }

    let newModalityMatches: Match[];
    if (modality === 'tenis_mesa_fem') {
      newModalityMatches = generateDoubleEliminationBracket(teams);
    } else {
      newModalityMatches = generateAutomaticBracket(modality, teams);
    }

    setMatches((prev) => {
      const filtered = prev.filter((m) => m.modality !== modality);
      const combined = [...filtered, ...newModalityMatches];
      setStoredMatches(combined);
      return combined;
    });

    setToastMessage(`✓ Chaveamento de ${modality.replace('_', ' ').toUpperCase()} gerado com sucesso!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle manual updates to matches (scores, winners, etc.)
  const handleUpdateMatches = (newMatches: Match[]) => {
    setMatches(newMatches);
    setStoredMatches(newMatches);
  };

  // Handle match score updates from BracketSection
  const handleUpdateMatchScore = (matchId: string, scoreA: number, scoreB: number, winnerId?: string) => {
    setMatches((prev) => {
      const updated = prev.map((m) => {
        if (m.id === matchId) {
          return {
            ...m,
            scoreA,
            scoreB,
            winnerId,
          };
        }
        return m;
      });

      // Propagate winner to next match if applicable
      const match = updated.find((m) => m.id === matchId);
      if (match && match.nextMatchId && match.winnerId && match.winnerId !== 'BYE') {
        const nextMatch = updated.find((m) => m.id === match.nextMatchId);
        if (nextMatch) {
          const winnerTeam = teams.find((t) => t.id === match.winnerId);
          const winnerName = winnerTeam
            ? (winnerTeam.playerName && winnerTeam.playerClass
                ? `${winnerTeam.playerName} (${winnerTeam.playerClass})`
                : winnerTeam.name)
            : 'Vencedor anterior';

          if (match.nextMatchSlot === 'A') {
            nextMatch.teamAId = match.winnerId;
            nextMatch.teamAName = winnerName;
          } else if (match.nextMatchSlot === 'B') {
            nextMatch.teamBId = match.winnerId;
            nextMatch.teamBName = winnerName;
          }
        }
      }

      setStoredMatches(updated);
      return updated;
    });
  };

  // Compute filtered teams and matches for current modality
  const currentModalityTeams = teams.filter((t) => t.modality === activeModality);
  const currentModalityMatches = matches.filter((m) => m.modality === activeModality);

  const shouldLock = !isUnlockedByTime && !countdownForceDisabled && !previewCountdownAsAdmin && user?.role !== 'admin' && user?.role !== 'subadmin';

  if (shouldLock) {
    return (
      <CountdownLockScreen
        onUnlocked={() => setIsUnlockedByTime(true)}
        onAdminLoginClick={() => setIsLoginOpen(true)}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Admin preview notice banner */}
      {previewCountdownAsAdmin && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-black flex items-center justify-center gap-3 z-50">
          <span>⚠️ MODO PRÉ-VISUALIZAÇÃO DE CONTAGEM REGRESSIVA (Ativo para Administrador)</span>
          <button
            onClick={() => setPreviewCountdownAsAdmin(false)}
            className="px-3 py-1 bg-slate-950 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors"
          >
            Sair do Modo de Pré-visualização
          </button>
        </div>
      )}

      <Navbar
        user={user}
        activeModality={activeModality}
        onSelectModality={setActiveModality}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={() => setUser(null)}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onTogglePreviewCountdown={() => setPreviewCountdownAsAdmin(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onManualSave={handleManualSave}
      />

      <main className="flex-1">
        <HeroSection
          activeModality={activeModality}
          user={user}
          onOpenLogin={() => setIsLoginOpen(true)}
          onSelectSection={setActiveSection}
          teamsCount={currentModalityTeams.length}
          matchesCount={currentModalityMatches.length}
          theme={theme}
        />

        {activeSection === 'chaveamento' && (
          <BracketSection
            matches={matches}
            teams={teams}
            activeModality={activeModality}
            user={user}
            theme={theme}
            onUpdateMatchScore={handleUpdateMatchScore}
            onGenerateBracket={() => handleGenerateBracket(activeModality)}
            onUpdateMatches={handleUpdateMatches}
            onSelectSection={setActiveSection}
          />
        )}

        {activeSection === 'times' && (
          <TeamsSection
            teams={teams}
            activeModality={activeModality}
            user={user}
            theme={theme}
            onAddTeam={handleAddTeam}
            onDeleteTeam={handleDeleteTeam}
            onUpdateTeamPlayers={handleUpdateTeamPlayers}
            onUpdateTeamImage={handleUpdateTeamImage}
            onUpdateTeam={handleUpdateTeam}
            onGenerateBracket={() => handleGenerateBracket(activeModality)}
            onManualSave={handleManualSave}
          />
        )}

        {activeSection === 'vitorias' && (
          <StandingsSection
            teams={teams}
            matches={matches}
            activeModality={activeModality}
            theme={theme}
            user={user}
            onUpdateTeam={handleUpdateTeam}
          />
        )}
      </main>

      <Footer theme={theme} />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
        theme={theme}
      />

      <AdminSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        countdownForceDisabled={countdownForceDisabled}
        onToggleCountdown={() => setCountdownForceDisabled(!countdownForceDisabled)}
        onPreviewCountdown={() => setPreviewCountdownAsAdmin(true)}
        theme={theme}
        teams={teams}
        matches={matches}
        onRestoreBackup={handleRestoreBackup}
        onManualSave={handleManualSave}
        onClearAllTeams={handleClearAllTeams}
      />

      {/* Floating Save Confirmation Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl border border-emerald-400/50 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;

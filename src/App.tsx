import React, { useState, useEffect, useRef } from 'react';
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
import {
  fetchSharedTournamentData,
  saveSharedTournamentData,
  deleteSharedTeam,
} from './utils/apiSync';
import { CheckCircle2, Globe } from 'lucide-react';
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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const lastSyncTimeRef = useRef<number>(0);
  const isInitialLoadDoneRef = useRef<boolean>(false);

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

  // Sync with Server JSON Database (/api/data) on mount and background live polling
  useEffect(() => {
    let isMounted = true;

    const performSync = async (isFirstLoad = false) => {
      try {
        const remoteData = await fetchSharedTournamentData();
        if (!isMounted || !remoteData) return;

        // If server has newer data, apply to state and localStorage
        if (remoteData.lastUpdated > lastSyncTimeRef.current || isFirstLoad) {
          if (remoteData.teams && Array.isArray(remoteData.teams) && remoteData.teams.length > 0) {
            const cleanTeams = filterDeletedTeams(remoteData.teams);
            setTeams(cleanTeams);
            setStoredTeams(cleanTeams);

            // Hydrate images to IndexedDB
            cleanTeams.forEach((t) => {
              if (t.imageUrl && !t.imageUrl.startsWith('idb://')) {
                imageMemoryCache.set(t.id, t.imageUrl);
                saveImageToIndexedDb(t.id, t.imageUrl).catch(() => {});
              }
            });

            if (remoteData.matches && Array.isArray(remoteData.matches)) {
              const cleanMatches = sanitizeFutsalFemMatches(remoteData.matches, cleanTeams);
              setMatches(cleanMatches);
              setStoredMatches(cleanMatches);
            }

            lastSyncTimeRef.current = remoteData.lastUpdated;
          } else if (isFirstLoad && teams.length > 0) {
            // Server was empty on first load but local client has teams: push to server
            setIsSyncing(true);
            saveSharedTournamentData(teams, matches).then((res) => {
              if (res.lastUpdated) {
                lastSyncTimeRef.current = res.lastUpdated;
              }
            }).finally(() => {
              if (isMounted) setIsSyncing(false);
            });
          }
        }
      } catch (err) {
        console.warn('Sync tick error:', err);
      }
    };

    // First load sync
    performSync(true).then(() => {
      isInitialLoadDoneRef.current = true;
    });

    // Polling interval every 3.5 seconds so all visitors see live updates without F5
    const syncInterval = setInterval(() => {
      performSync(false);
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
    };
  }, []);

  // Helper to persist both locally and push to the server JSON database
  const syncToServer = async (newTeams: Team[], newMatches: Match[]) => {
    setIsSyncing(true);
    try {
      const res = await saveSharedTournamentData(newTeams, newMatches);
      if (res.lastUpdated) {
        lastSyncTimeRef.current = res.lastUpdated;
      }
    } finally {
      setIsSyncing(false);
    }
  };

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

  // Manual save of all teams, images, and matches to persistent stores and Server JSON
  const handleManualSave = async () => {
    setIsSyncing(true);
    const res = await forceSaveAllData(teams, matches, user);
    await syncToServer(teams, matches);
    setToastMessage(`✓ Salvo com sucesso no site hospedado (JSON) para todos os visitantes verem!`);
    setTimeout(() => setToastMessage(null), 4500);
    return res;
  };

  // Restore complete backup
  const handleRestoreBackup = async (newTeams: Team[], newMatches: Match[]) => {
    setTeams(newTeams);
    setMatches(newMatches);
    await syncToServer(newTeams, newMatches);
    setToastMessage(`✓ Backup completo restaurado e publicado no site com sucesso! (${newTeams.length} equipes)`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Clear / Wipe all registered teams and matches
  const handleClearAllTeams = async () => {
    clearDeletedTeamIds();
    await clearAllRegisteredTeams();
    setTeams([]);
    setMatches([]);
    await syncToServer([], []);
    setToastMessage('✓ Todos os times e confrontos foram zerados no site com sucesso!');
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

    const nextTeams = [...teams.filter((t) => t.id !== newTeam.id), newTeam];
    setTeams(nextTeams);
    setStoredTeams(nextTeams);

    // Save to shared server JSON
    await syncToServer(nextTeams, matches);

    setToastMessage(`✓ Equipe "${newTeam.name}" cadastrada e salva no site hospedado!`);
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

    // 4. Clean up match references
    const nextMatches = matches.map((m) => {
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

    setMatches(nextMatches);
    setStoredMatches(nextMatches);

    // 5. Delete on server JSON and push updated list
    deleteSharedTeam(teamId).catch(() => {});
    await syncToServer(nextTeams, nextMatches);

    setToastMessage(`✓ Equipe "${teamToDelete.name}" excluída com sucesso do site!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Updating Players Roster for a Team (Futsal & Vôlei)
  const handleUpdateTeamPlayers = async (teamId: string, players: string[]) => {
    const nextTeams = teams.map((t) => {
      if (t.id === teamId) {
        return { ...t, players };
      }
      return t;
    });
    setTeams(nextTeams);
    setStoredTeams(nextTeams);
    await syncToServer(nextTeams, matches);
  };

  // Handle Updating Team Image / Logo (Futsal, Vôlei Misto, etc.)
  const handleUpdateTeamImage = async (teamId: string, imageUrl?: string) => {
    if (imageUrl) {
      imageMemoryCache.set(teamId, imageUrl);
      saveImageToIndexedDb(teamId, imageUrl).catch(() => {});
    }
    const nextTeams = teams.map((t) => {
      if (t.id === teamId) {
        return { ...t, imageUrl };
      }
      return t;
    });
    setTeams(nextTeams);
    setStoredTeams(nextTeams);
    await syncToServer(nextTeams, matches);
  };

  // Handle fully updating team details (such as playerClass/room, playerName, etc.)
  const handleUpdateTeam = async (updatedTeam: Team) => {
    if (updatedTeam.imageUrl) {
      imageMemoryCache.set(updatedTeam.id, updatedTeam.imageUrl);
      saveImageToIndexedDb(updatedTeam.id, updatedTeam.imageUrl).catch(() => {});
    }
    const nextTeams = teams.map((t) => (t.id === updatedTeam.id ? updatedTeam : t));
    setTeams(nextTeams);
    setStoredTeams(nextTeams);

    const updatedName = updatedTeam.playerName && updatedTeam.playerClass
      ? `${updatedTeam.playerName} (${updatedTeam.playerClass})`
      : updatedTeam.name;

    const nextMatches = matches.map((m) => {
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
    });

    setMatches(nextMatches);
    setStoredMatches(nextMatches);
    await syncToServer(nextTeams, nextMatches);
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

    const filtered = matches.filter((m) => m.modality !== modality);
    const combined = [...filtered, ...newModalityMatches];
    setMatches(combined);
    setStoredMatches(combined);
    syncToServer(teams, combined);

    setToastMessage(`✓ Chaveamento de ${modality.replace('_', ' ').toUpperCase()} gerado e salvo no site!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle manual updates to matches (scores, winners, etc.)
  const handleUpdateMatches = (newMatches: Match[]) => {
    setMatches(newMatches);
    setStoredMatches(newMatches);
    syncToServer(teams, newMatches);
  };

  // Handle match score updates from BracketSection
  const handleUpdateMatchScore = (matchId: string, scoreA: number, scoreB: number, winnerId?: string) => {
    const updated = matches.map((m) => {
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

    setMatches(updated);
    setStoredMatches(updated);
    syncToServer(teams, updated);
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
        isSyncing={isSyncing}
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

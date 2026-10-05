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
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { CountdownLockScreen } from './components/CountdownLockScreen';
import { Footer } from './components/Footer';
import { isSupabaseConfigured } from './utils/supabaseClient';
import { supabaseFetchTeams, supabaseFetchMatches, supabaseFetchImages } from './utils/supabaseDb';

export function App() {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [activeModality, setActiveModality] = useState<ModalityType>('futsal_masc');
  const [activeSection, setActiveSection] = useState<string>('chaveamento');
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);

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

    // Hydrate from Supabase on mount if configured
    if (isSupabaseConfigured()) {
      Promise.all([supabaseFetchTeams(), supabaseFetchMatches(), supabaseFetchImages()])
        .then(([remoteTeams, remoteMatches, remoteImages]) => {
          if (remoteTeams && remoteTeams.length > 0) {
            setTeams(remoteTeams);
            setStoredTeams(remoteTeams);
          }
          if (remoteMatches && remoteMatches.length > 0) {
            setMatches(remoteMatches);
            setStoredMatches(remoteMatches);
          }
          if (remoteImages) {
            for (const [id, dataUrl] of Object.entries(remoteImages)) {
              saveImageToIndexedDb(id, dataUrl).catch(() => {});
            }
          }
        })
        .catch((err) => {
          console.warn('Could not fetch initial data from Supabase:', err);
        });
    }
  }, []);

  // Countdown lock state: Lock all visitors until 14/10/2026 at 06:45 AM
  const [isUnlockedByTime, setIsUnlockedByTime] = useState<boolean>(
    () => new Date().getTime() >= COUNTDOWN_TARGET.getTime()
  );
  // Admin dynamic bypass toggle for the countdown lock screen
  const [countdownForceDisabled, setCountdownForceDisabled] = useState<boolean>(true);
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

  // Manual save of all teams, images, and matches to persistent stores
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

  // Handle Team / Athlete Creation
  const handleAddTeam = (teamData: Omit<Team, 'id' | 'createdDate'>) => {
    const newTeam: Team = {
      ...teamData,
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdDate: new Date().toISOString(),
    };

    if (newTeam.imageUrl) {
      imageMemoryCache.set(newTeam.id, newTeam.imageUrl);
      saveImageToIndexedDb(newTeam.id, newTeam.imageUrl).catch(() => {});
    }

    setTeams((prev) => [...prev, newTeam]);
  };

  // Handle Team Deletion
  const handleDeleteTeam = (teamId: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
  };

  // Handle Updating Players Roster for a Team (Futsal & Vôlei)
  const handleUpdateTeamPlayers = (teamId: string, players: string[]) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, players } : t))
    );
  };

  // Handle Updating Team Image / Logo (Futsal, Vôlei Misto, etc.)
  const handleUpdateTeamImage = (teamId: string, imageUrl?: string) => {
    if (imageUrl) {
      imageMemoryCache.set(teamId, imageUrl);
      saveImageToIndexedDb(teamId, imageUrl).catch(() => {});
    }
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, imageUrl } : t))
    );
  };

  // Handle fully updating team details (such as playerClass/room, playerName, etc.)
  const handleUpdateTeam = (updatedTeam: Team) => {
    if (updatedTeam.imageUrl) {
      imageMemoryCache.set(updatedTeam.id, updatedTeam.imageUrl);
      saveImageToIndexedDb(updatedTeam.id, updatedTeam.imageUrl).catch(() => {});
    }
    setTeams((prev) =>
      prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t))
    );

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
  const handleGenerateBracket = () => {
    const newModalityMatches = generateAutomaticBracket(activeModality, teams);

    // Keep matches from other modalities, replace current modality
    setMatches((prev) => [
      ...prev.filter((m) => m.modality !== activeModality),
      ...newModalityMatches,
    ]);
  };

  // Handle Matchup / Bracket updates from MatchupConfigModal
  const handleUpdateMatches = (newModalityMatches: Match[]) => {
    setMatches((prev) => [
      ...prev.filter((m) => m.modality !== activeModality),
      ...newModalityMatches,
    ]);
  };

  // Handle Match Score Update by Admin (No match status field)
  const handleUpdateMatchScore = (
    matchId: string,
    scoreA: number,
    scoreB: number,
    overrideTeamAId?: string,
    overrideTeamBId?: string,
    overrideTeamAName?: string,
    overrideTeamBName?: string,
    penaltyWinnerId?: string
  ) => {
    setMatches((prevMatches) => {
      // 1. Update the scores and find winner/loser
      const updated = prevMatches.map((m) => {
        if (m.id !== matchId) return m;

        const finalTeamAId = overrideTeamAId !== undefined ? overrideTeamAId : m.teamAId;
        const finalTeamBId = overrideTeamBId !== undefined ? overrideTeamBId : m.teamBId;
        const finalTeamAName = overrideTeamAName !== undefined ? overrideTeamAName : m.teamAName;
        const finalTeamBName = overrideTeamBName !== undefined ? overrideTeamBName : m.teamBName;

        let winnerId: string | undefined = undefined;
        let loserId: string | undefined = undefined;

        if (scoreA > scoreB) {
          winnerId = finalTeamAId;
          loserId = finalTeamBId;
        } else if (scoreB > scoreA) {
          winnerId = finalTeamBId;
          loserId = finalTeamAId;
        } else if (scoreA === scoreB && penaltyWinnerId) {
          winnerId = penaltyWinnerId;
          loserId = penaltyWinnerId === finalTeamAId ? finalTeamBId : finalTeamAId;
        }

        return {
          ...m,
          teamAId: finalTeamAId,
          teamBId: finalTeamBId,
          teamAName: finalTeamAName,
          teamBName: finalTeamBName,
          scoreA,
          scoreB,
          winnerId,
          loserId,
          penaltyWinnerId,
        };
      });

      const currentMatch = updated.find((m) => m.id === matchId);
      if (!currentMatch || !currentMatch.winnerId) {
        return updated;
      }

      const getTeamDisplayName = (tid?: string, fallback?: string) => {
        if (!tid) return fallback || 'A definir';
        const found = teams.find((t) => t.id === tid);
        if (found) {
          return found.playerName && found.playerClass
            ? `${found.playerName} (${found.playerClass})`
            : found.name;
        }
        return fallback || 'A definir';
      };

      const winnerTeamName = getTeamDisplayName(currentMatch.winnerId, 
        currentMatch.winnerId === currentMatch.teamAId ? currentMatch.teamAName : currentMatch.teamBName
      );
      const loserTeamName = getTeamDisplayName(currentMatch.loserId,
        currentMatch.loserId === currentMatch.teamAId ? currentMatch.teamAName : currentMatch.teamBName
      );

      // Perform updates across all matches based on promotion
      return updated.map((m) => {
        let nextM = { ...m };

        // A. Promote Winner
        if (currentMatch.nextMatchId && m.id === currentMatch.nextMatchId) {
          if (currentMatch.nextMatchSlot === 'A') {
            nextM.teamAId = currentMatch.winnerId;
            nextM.teamAName = winnerTeamName;
          } else if (currentMatch.nextMatchSlot === 'B') {
            nextM.teamBId = currentMatch.winnerId;
            nextM.teamBName = winnerTeamName;
          }
        }
        if (m.sourceMatchAId === currentMatch.id) {
          nextM.teamAId = currentMatch.winnerId;
          nextM.teamAName = winnerTeamName;
        }
        if (m.sourceMatchBId === currentMatch.id) {
          nextM.teamBId = currentMatch.winnerId;
          nextM.teamBName = winnerTeamName;
        }

        // B. Promote Loser
        if (currentMatch.loserNextMatchId && m.id === currentMatch.loserNextMatchId) {
          if (currentMatch.loserNextMatchSlot === 'A') {
            nextM.teamAId = currentMatch.loserId;
            nextM.teamAName = loserTeamName;
          } else if (currentMatch.loserNextMatchSlot === 'B') {
            nextM.teamBId = currentMatch.loserId;
            nextM.teamBName = loserTeamName;
          }
        }

        // C. Grand Final Special Logic: if it's the first Grand Final in double elimination
        if (currentMatch.bracketType === 'grand_final' && !currentMatch.isResetMatch && m.isResetMatch) {
          if (currentMatch.winnerId === currentMatch.teamBId) {
            // LB Winner won! Activate Reset Match
            nextM.isActive = true;
            nextM.teamAId = currentMatch.teamAId;
            nextM.teamAName = getTeamDisplayName(currentMatch.teamAId, currentMatch.teamAName);
            nextM.teamBId = currentMatch.teamBId;
            nextM.teamBName = getTeamDisplayName(currentMatch.teamBId, currentMatch.teamBName);
            // Reset previous results if any
            nextM.scoreA = undefined;
            nextM.scoreB = undefined;
            nextM.winnerId = undefined;
            nextM.loserId = undefined;
          } else {
            // WB Winner won! Reset Match is NOT active
            nextM.isActive = false;
            nextM.teamAId = undefined;
            nextM.teamAName = 'A definir';
            nextM.teamBId = undefined;
            nextM.teamBName = 'A definir';
            nextM.scoreA = undefined;
            nextM.scoreB = undefined;
            nextM.winnerId = undefined;
            nextM.loserId = undefined;
          }
        }

        return nextM;
      });
    });
  };

  const currentModalityTeams = teams.filter((t) => t.modality === activeModality);
  const currentModalityMatches = matches.filter((m) => m.modality === activeModality);

  // Check if locked to countdown screen (disabled so system opens directly)
  const isUserLocked = false;

  // If locked, render the countdown lock screen
  if (isUserLocked) {
    return (
      <>
        <CountdownLockScreen
          onAdminLoginClick={() => setIsLoginOpen(true)}
          onUnlocked={() => setIsUnlockedByTime(true)}
        />

        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            setPreviewCountdownAsAdmin(false);
          }}
        />
      </>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-sky-50/50 text-slate-900'
    }`}>
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
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
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
            onGenerateBracket={handleGenerateBracket}
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
            onGenerateBracket={handleGenerateBracket}
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
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onDataRestored={(restoredTeams, restoredMatches) => {
          if (restoredTeams.length > 0) setTeams(restoredTeams);
          if (restoredMatches.length > 0) setMatches(restoredMatches);
        }}
        theme={theme}
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

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
} from './utils/storage';
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

  // Countdown lock state: Lock all visitors until 14/10/2026 at 06:45 AM
  const [isUnlockedByTime, setIsUnlockedByTime] = useState<boolean>(
    () => new Date().getTime() >= COUNTDOWN_TARGET.getTime()
  );
  // Admin dynamic bypass toggle for the countdown lock screen
  const [countdownForceDisabled, setCountdownForceDisabled] = useState<boolean>(() => {
    return localStorage.getItem('interclasse_countdown_force_disabled') === 'true';
  });
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

  // Handle Team / Athlete Creation
  const handleAddTeam = (teamData: Omit<Team, 'id' | 'createdDate'>) => {
    const newTeam: Team = {
      ...teamData,
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdDate: new Date().toISOString(),
    };

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
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, imageUrl } : t))
    );
  };

  // Handle Automatic Bracket Generation for activeModality
  const handleGenerateBracket = () => {
    const newModalityMatches = generateAutomaticBracket(activeModality, teams);

    // Keep matches from other modalities, replace current modality
    setMatches((prev) => [
      ...prev.filter((m) => m.modality !== activeModality),
      ...newModalityMatches,
    ]);
  };

  // Handle Match Score Update by Admin (No match status field)
  const handleUpdateMatchScore = (
    matchId: string,
    scoreA: number,
    scoreB: number
  ) => {
    setMatches((prevMatches) => {
      const updated = prevMatches.map((m) => {
        if (m.id !== matchId) return m;

        let winnerId: string | undefined = undefined;
        let loserId: string | undefined = undefined;

        if (scoreA > scoreB) {
          winnerId = m.teamAId;
          loserId = m.teamBId;
        } else if (scoreB > scoreA) {
          winnerId = m.teamBId;
          loserId = m.teamAId;
        }

        return {
          ...m,
          scoreA,
          scoreB,
          winnerId,
          loserId,
        };
      });

      // Auto promote winner to next match if applicable
      const currentMatch = updated.find((m) => m.id === matchId);

      if (
        currentMatch &&
        currentMatch.winnerId &&
        currentMatch.nextMatchId
      ) {
        const winningTeamObj = teams.find((t) => t.id === currentMatch.winnerId);
        let winnerTeamName = 'A definir';

        if (winningTeamObj) {
          winnerTeamName =
            winningTeamObj.playerName && winningTeamObj.playerClass
              ? `${winningTeamObj.playerName} (${winningTeamObj.playerClass})`
              : winningTeamObj.name;
        } else {
          winnerTeamName =
            currentMatch.winnerId === currentMatch.teamAId
              ? currentMatch.teamAName || 'A definir'
              : currentMatch.teamBName || 'A definir';
        }

        return updated.map((m) => {
          if (m.id === currentMatch.nextMatchId) {
            if (currentMatch.nextMatchSlot === 'A') {
              return {
                ...m,
                teamAId: currentMatch.winnerId,
                teamAName: winnerTeamName,
              };
            } else if (currentMatch.nextMatchSlot === 'B') {
              return {
                ...m,
                teamBId: currentMatch.winnerId,
                teamBName: winnerTeamName,
              };
            }
          }
          return m;
        });
      }

      return updated;
    });
  };

  const currentModalityTeams = teams.filter((t) => t.modality === activeModality);
  const currentModalityMatches = matches.filter((m) => m.modality === activeModality);

  // Check if locked to countdown screen
  const isUserLocked =
    (!countdownForceDisabled && !isUnlockedByTime && user?.role !== 'admin' && user?.role !== 'subadmin') ||
    (previewCountdownAsAdmin && user?.role === 'admin');

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
        theme={theme}
        onToggleTheme={handleToggleTheme}
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
            onGenerateBracket={handleGenerateBracket}
          />
        )}

        {activeSection === 'vitorias' && (
          <StandingsSection
            teams={teams}
            matches={matches}
            activeModality={activeModality}
            theme={theme}
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
      />
    </div>
  );
}

export default App;

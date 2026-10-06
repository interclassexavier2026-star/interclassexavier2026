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
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { CountdownLockScreen } from './components/CountdownLockScreen';
import { Footer } from './components/Footer';
import { isSupabaseConfigured, getSupabaseClient } from './utils/supabaseClient';
import { supabaseFetchTeams, supabaseFetchMatches, supabaseFetchImages, rowToMatch, rowToTeam, supabaseSaveTeam, supabaseDeleteTeam, purgeDuplicateFutsalFemMatches } from './utils/supabaseDb';

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
      purgeDuplicateFutsalFemMatches().catch(() => {});
      Promise.all([supabaseFetchTeams(), supabaseFetchMatches(), supabaseFetchImages()])
        .then(([remoteTeams, remoteMatches, remoteImages]) => {
          if (remoteTeams !== null) {
            const cleanTeams = filterDeletedTeams(remoteTeams);
            setTeams(cleanTeams);
            setStoredTeams(cleanTeams);
          }
          const currentTeams = remoteTeams !== null ? filterDeletedTeams(remoteTeams) : teams;
          if (remoteMatches !== null) {
            const cleanMatches = sanitizeFutsalFemMatches(remoteMatches, currentTeams);
            setMatches(cleanMatches);
            setStoredMatches(cleanMatches);
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

  // Supabase Realtime Subscriptions + 5s Smart Polling Backup for Live Public Updates without F5
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const client = getSupabaseClient();
    if (!client) return;

    console.log('🔌 Inicializando subscrição Realtime no Supabase...');

    // Subscrição Realtime na tabela 'matches'
    const matchesChannel = client
      .channel('public_matches_realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'matches',
        },
        (payload) => {
          console.log('⚡ Evento Realtime recebido em matches:', payload.eventType, payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedMatch = rowToMatch(payload.new);
            setMatches((prevMatches) => {
              const exists = prevMatches.some((m) => m.id === updatedMatch.id);
              let nextMatches: Match[];
              if (exists) {
                nextMatches = prevMatches.map((m) =>
                  m.id === updatedMatch.id ? updatedMatch : m
                );
              } else {
                nextMatches = [...prevMatches, updatedMatch];
              }
              setStoredMatches(nextMatches);
              return nextMatches;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setMatches((prevMatches) => {
              const nextMatches = prevMatches.filter((m) => m.id !== deletedId);
              setStoredMatches(nextMatches);
              return nextMatches;
            });
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Status do Canal Realtime (matches):', status);
        if (err) console.error('Erro na subscrição Realtime:', err);
      });

    // Subscrição Realtime na tabela 'teams'
    const teamsChannel = client
      .channel('public_teams_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
        },
        (payload) => {
          console.log('⚡ Evento Realtime recebido em teams:', payload.eventType, payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedTeam = rowToTeam(payload.new);
            const filtered = filterDeletedTeams([updatedTeam]);
            if (filtered.length === 0) {
              // Deleted team received from DB, ignore and retry DB delete
              supabaseDeleteTeam(updatedTeam.id).catch(() => {});
              return;
            }
            setTeams((prevTeams) => {
              const exists = prevTeams.some((t) => t.id === updatedTeam.id);
              let nextTeams: Team[];
              if (exists) {
                nextTeams = prevTeams.map((t) =>
                  t.id === updatedTeam.id ? updatedTeam : t
                );
              } else {
                nextTeams = [...prevTeams, updatedTeam];
              }
              const cleanNext = filterDeletedTeams(nextTeams);
              setStoredTeams(cleanNext);
              return cleanNext;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setTeams((prevTeams) => {
              const nextTeams = prevTeams.filter((t) => t.id !== deletedId);
              setStoredTeams(nextTeams);
              return nextTeams;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status do Canal Realtime (teams):', status);
      });

    // Polling inteligente de backup a cada 10s (garante sincronia pública sem loops de repetição)
    const pollInterval = setInterval(() => {
      supabaseFetchMatches().then((remoteMatches) => {
        if (remoteMatches !== null) {
          const cleanMatches = sanitizeFutsalFemMatches(remoteMatches, teams);
          setMatches((prevMatches) => {
            if (JSON.stringify(prevMatches) !== JSON.stringify(cleanMatches)) {
              setStoredMatches(cleanMatches);
              return cleanMatches;
            }
            return prevMatches;
          });
        }
      });
      supabaseFetchTeams().then((remoteTeams) => {
        if (remoteTeams !== null) {
          const cleanTeams = filterDeletedTeams(remoteTeams);
          setTeams((prevTeams) => {
            if (JSON.stringify(prevTeams) !== JSON.stringify(cleanTeams)) {
              setStoredTeams(cleanTeams);
              return cleanTeams;
            }
            return prevTeams;
          });
        }
      });
    }, 10000);

    // Limpeza dos canais ao desmontar
    return () => {
      console.log('🧹 Removendo canais do Supabase Realtime...');
      client.removeChannel(matchesChannel);
      client.removeChannel(teamsChannel);
      clearInterval(pollInterval);
    };
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

    if (isSupabaseConfigured()) {
      const saved = await supabaseSaveTeam(newTeam);
      if (!saved) {
        alert('⚠️ Não foi possível cadastrar a turma no Supabase. Verifique a sua conexão com a internet.');
        return;
      }
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

    // 3. Clean up match references in local state
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

    // 4. Perform Supabase DELETE and unbind in background if configured
    if (isSupabaseConfigured()) {
      supabaseDeleteTeam(teamId, teamToDelete.imageUrl).then((result) => {
        if (!result.success) {
          console.warn('Supabase delete warning:', result.error);
        }
      }).catch((err) => {
        console.error('Error deleting team from Supabase:', err);
      });
    }

    setToastMessage(`✓ Equipe "${teamToDelete.name}" excluída com sucesso!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Updating Players Roster for a Team (Futsal & Vôlei)
  const handleUpdateTeamPlayers = async (teamId: string, players: string[]) => {
    let updatedTeam: Team | undefined;
    setTeams((prev) => {
      const next = prev.map((t) => {
        if (t.id === teamId) {
          updatedTeam = { ...t, players };
          return updatedTeam;
        }
        return t;
      });
      setStoredTeams(next);
      return next;
    });

    if (updatedTeam && isSupabaseConfigured()) {
      await supabaseSaveTeam(updatedTeam);
    }
  };

  // Handle Updating Team Image / Logo (Futsal, Vôlei Misto, etc.)
  const handleUpdateTeamImage = async (teamId: string, imageUrl?: string) => {
    if (imageUrl) {
      imageMemoryCache.set(teamId, imageUrl);
      saveImageToIndexedDb(teamId, imageUrl).catch(() => {});
    }
    let updatedTeam: Team | undefined;
    setTeams((prev) => {
      const next = prev.map((t) => {
        if (t.id === teamId) {
          updatedTeam = { ...t, imageUrl };
          return updatedTeam;
        }
        return t;
      });
      setStoredTeams(next);
      return next;
    });

    if (updatedTeam && isSupabaseConfigured()) {
      await supabaseSaveTeam(updatedTeam);
    }
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

    if (isSupabaseConfigured()) {
      await supabaseSaveTeam(updatedTeam);
    }

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
        onClearAllTeams={handleClearAllTeams}
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

import React, { useState, useEffect } from 'react';
import { raceStateManager } from './services/stateManager';
import { soundEngine } from './services/audio';
import { HeaderNavbar } from './components/HeaderNavbar';
import { SetupView } from './components/SetupView';
import { VsMatchupView } from './components/VsMatchupView';
import { RaceView } from './components/RaceView';
import { PublicLeaderboardView } from './components/PublicLeaderboardView';
import { WinnerOverlay } from './components/WinnerOverlay';

export function App() {
  const [raceState, setRaceState] = useState(() => raceStateManager.getState());

  // Check URL query param for view mode (?view=public)
  const [activeView, setActiveView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'public' ? 'public' : 'control';
  });

  const [formattedTime, setFormattedTime] = useState('00:00.00');
  const [isMuted, setIsMuted] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // Subscribe to raceStateManager updates across tabs
  useEffect(() => {
    const unsubscribe = raceStateManager.subscribe((newState, eventMeta) => {
      setRaceState({ ...newState });

      if (newState.status === 'finished') {
        setShowWinnerModal(true);
      } else {
        setShowWinnerModal(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Timer Tick Interval
  useEffect(() => {
    let intervalId = null;

    const updateTimer = () => {
      if (!raceState.started_at) {
        setFormattedTime('00:00.00');
        return;
      }

      const now = raceState.ended_at || Date.now();
      const diffMs = Math.max(0, now - raceState.started_at);

      setFormattedTime(raceStateManager.formatTime(diffMs));
    };

    updateTimer();
    if (raceState.started_at && !raceState.ended_at) {
      intervalId = setInterval(updateTimer, 50);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [raceState.started_at, raceState.ended_at]);

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleNewRace = () => {
    raceStateManager.resetRace();
    setShowWinnerModal(false);
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <HeaderNavbar
        activeView={activeView}
        setActiveView={setActiveView}
        formattedTime={formattedTime}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onResetRace={handleNewRace}
      />

      <main className="flex-grow-1 d-flex flex-column">
        {activeView === 'public' ? (
          <PublicLeaderboardView
            raceState={raceState}
            formattedTime={formattedTime}
            onSwitchToControl={() => setActiveView('control')}
          />
        ) : (
          <>
            {raceState.status === 'setup' && (
              <SetupView
                onStartRace={() => setActiveView('control')}
                onOpenLeaderboard={() => setActiveView('public')}
              />
            )}

            {raceState.status === 'vs' && (
              <VsMatchupView
                raceState={raceState}
                onLaunchRace={() => setActiveView('control')}
              />
            )}

            {(raceState.status === 'racing' || raceState.status === 'finished') && (
              <RaceView
                raceState={raceState}
                formattedTime={formattedTime}
                onEndRace={() => setShowWinnerModal(true)}
                onOpenLeaderboard={() => setActiveView('public')}
              />
            )}
          </>
        )}
      </main>

      {/* Winner Celebration Modal Overlay */}
      <WinnerOverlay
        show={showWinnerModal}
        raceState={raceState}
        onNewRace={handleNewRace}
        onOpenLeaderboard={() => {
          setShowWinnerModal(false);
          setActiveView('public');
        }}
      />
    </div>
  );
}

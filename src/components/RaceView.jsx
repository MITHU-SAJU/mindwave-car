import React, { useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { raceStateManager } from '../services/stateManager';
import { soundEngine } from '../services/audio';

export function RaceView({ raceState, formattedTime, onEndRace, onOpenLeaderboard }) {
  const p1 = raceState.players['1'] || {};
  const p2 = raceState.players['2'] || {};

  // Hotkeys (1, A -> P1; 2, L -> P2; Space, B, 3 -> Both)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      const key = e.key.toLowerCase();
      if (key === '1' || key === 'a') {
        e.preventDefault();
        soundEngine.playLapPing('1');
        raceStateManager.addLap('1');
      } else if (key === '2' || key === 'l') {
        e.preventDefault();
        soundEngine.playLapPing('2');
        raceStateManager.addLap('2');
      } else if (e.key === ' ' || key === 'b' || key === '3') {
        e.preventDefault();
        soundEngine.playBothLapsPing();
        raceStateManager.addBothLaps();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddLap = (playerId) => {
    soundEngine.playLapPing(playerId);
    raceStateManager.addLap(playerId);
  };

  const handleAddBothLaps = () => {
    soundEngine.playBothLapsPing();
    raceStateManager.addBothLaps();
  };

  const handleEndRaceClick = () => {
    if (window.confirm('Are you sure you want to END THE RACE and declare the winner?')) {
      raceStateManager.endRace();
      if (onEndRace) onEndRace();
    }
  };

  const renderPlayerCard = (player, icon, key1, key2) => {
    const isP1 = player.id === '1';
    const cardClass = isP1 ? 'p1-card' : 'p2-card';
    const lapBtnClass = isP1 ? 'p1-lap-btn' : 'p2-lap-btn';
    const textColor = isP1 ? 'text-primary' : 'text-danger';

    return (
      <Card className={`cyber-card ${cardClass} p-3 h-100 d-flex flex-column justify-content-between shadow-sm`}>
        <div>
          {/* Header & Name */}
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: '1.6rem' }}>{icon}</span>
              <div>
                <h3 className={`fw-bold mb-0 ${textColor}`}>
                  {player.name || `Player ${player.id}`}
                </h3>
                <small className="text-muted fw-bold" style={{ fontSize: '0.75rem' }}>PLAYER {player.id}</small>
              </div>
            </div>
            <Badge bg="light" text="dark" className="fs-6 px-2 py-1 border">
              Key <kbd>{key1}</kbd> / <kbd>{key2}</kbd>
            </Badge>
          </div>

          {/* Compact Lap Display */}
          <div className="text-center my-2 py-2 rounded-3 shadow-xs" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0' }}>
            <div className="text-muted small tracking-wide fw-bold" style={{ fontSize: '0.75rem' }}>CURRENT LAPS</div>
            <div className="display-4 fw-bold text-dark my-0" style={{ fontFamily: 'var(--font-mono)' }}>
              {player.laps || 0}
            </div>
          </div>

          {/* Lap Time & Total Time Metrics */}
          <Row className="g-2 mb-3 text-center">
            <Col xs={6}>
              <div className="p-2 rounded-3" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0' }}>
                <div className="text-muted small fw-bold" style={{ fontSize: '0.7rem' }}>LAST LAP TIME</div>
                <div className="fw-bold fs-4 text-dark" style={{ fontFamily: 'var(--font-mono)' }}>
                  {player.last_lap_time ? `${player.last_lap_time.toFixed(2)}s` : '--'}
                </div>
              </div>
            </Col>
            <Col xs={6}>
              <div className="p-2 rounded-3" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0' }}>
                <div className="text-muted small fw-bold" style={{ fontSize: '0.7rem' }}>FASTEST LAP</div>
                <div className="fw-bold fs-4 text-warning" style={{ fontFamily: 'var(--font-mono)' }}>
                  {player.best_lap ? `${player.best_lap.toFixed(2)}s` : '--'}
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Adaptive Ergonomic + LAP Button */}
        <div>
          <div className="d-flex justify-content-center">
            <Button
              className={`btn-lap-touch ${lapBtnClass} shadow-md`}
              onClick={() => handleAddLap(player.id)}
            >
              <span>➕ LAP</span>
            </Button>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-1">
            <Button
              variant="outline-secondary"
              size="sm"
              style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}
              disabled={!player.laps || player.laps <= 0}
              onClick={() => raceStateManager.undoLap(player.id)}
            >
              ↩ Undo
            </Button>
            <div className="text-muted small fw-bold" style={{ fontSize: '0.8rem' }}>
              Total Race: <span className="text-primary fw-bold">{formattedTime}</span>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Container fluid className="p-2 p-md-3 flex-grow-1 d-flex flex-column justify-content-between" style={{ maxHeight: 'calc(100vh - 65px)', overflow: 'hidden', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Banner with Race Clock & End Race Button */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mb-2 p-2 rounded-4 cyber-card gap-1 gap-sm-0 text-center text-sm-start">
        <div>
          <div className="text-muted small fw-bold" style={{ fontSize: '0.65rem' }}>OPERATOR RACE CONTROL</div>
          <h6 className="fw-bold text-dark mb-0">LIVE RACE IN PROGRESS</h6>
        </div>

        <div className="text-center">
          <div className="text-muted small fw-bold" style={{ fontSize: '0.65rem' }}>ELAPSED RACE TIME</div>
          <div className="hud-timer fs-3">{formattedTime}</div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {onOpenLeaderboard && (
            <Button
              variant="warning"
              size="sm"
              className="px-2 py-1 fw-bold shadow-sm"
              onClick={onOpenLeaderboard}
            >
              🏆 LEADERBOARD
            </Button>
          )}

          <Button
            variant="danger"
            size="sm"
            className="px-2 py-1 fw-bold text-uppercase shadow-sm"
            onClick={handleEndRaceClick}
          >
            🏁 END RACE
          </Button>
        </div>
      </div>

      {/* Simultaneous Both Laps Central Action Bar */}
      <div className="d-flex justify-content-center mb-2">
        <Button
          className="btn-both-laps py-2 px-3 fs-5 shadow-md d-flex align-items-center justify-content-center gap-2 w-100"
          style={{ maxWidth: '550px' }}
          onClick={handleAddBothLaps}
        >
          <span>⚡ ➕ BOTH PLAYERS LAP</span>
          <Badge bg="light" text="dark" className="fs-6 px-2 py-1 border border-secondary text-uppercase ms-1 d-none d-sm-inline-block">
            Key <kbd>SPACE</kbd> / <kbd>B</kbd>
          </Badge>
        </Button>
      </div>

      {/* 2 Driver Control Cards */}
      <Row className="g-2 flex-grow-1 mb-1">
        <Col xs={12} lg={6}>{renderPlayerCard(p1, '🏎️', '1', 'A')}</Col>
        <Col xs={12} lg={6}>{renderPlayerCard(p2, '⚡', '2', 'L')}</Col>
      </Row>
    </Container>
  );
}

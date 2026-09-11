import React from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { raceStateManager } from '../services/stateManager';
import { soundEngine } from '../services/audio';

export function VsMatchupView({ raceState, onLaunchRace }) {
  const p1 = raceState.players['1'] || {};
  const p2 = raceState.players['2'] || {};
  const p1Name = p1.name || 'Player 1';
  const p2Name = p2.name || 'Player 2';
  const targetLaps = raceState.target_laps || 8;

  const handleLaunch = () => {
    soundEngine.playStartBeep();
    raceStateManager.launchRace();
    if (onLaunchRace) onLaunchRace();
  };

  const handleEditSetup = () => {
    raceStateManager.resetRace();
  };

  return (
    <Container fluid className="p-3 flex-grow-1 d-flex flex-column justify-content-center align-items-center text-center" style={{ minHeight: 'calc(100vh - 65px)', overflow: 'hidden' }}>
      <div className="w-100" style={{ maxWidth: '1000px' }}>
        <div className="mb-2 mb-md-3">
          <Badge bg="warning" text="dark" className="fs-6 px-3 py-2 text-uppercase tracking-wider fw-bold mb-1">
            🏁 HEAD-TO-HEAD MATCHUP
          </Badge>
          <div className="text-muted small fw-bold uppercase" style={{ fontSize: '0.75rem' }}>
            RACE READY • {targetLaps} TARGET LAPS
          </div>
        </div>

        <Card className="cyber-card p-3 p-md-4 position-relative overflow-hidden shadow-lg border-secondary">
          <Row className="align-items-center g-3 my-1">
            {/* Player 1 Card */}
            <Col md={5}>
              <div className="p-3 rounded-4" style={{ background: 'var(--p1-bg)', border: '2px solid var(--p1-border)' }}>
                <div style={{ fontSize: 'clamp(2.2rem, 4vw, 3.5rem)' }} className="mb-1">🏎️</div>
                <div className="text-primary fw-bold small mb-1">PLAYER 1</div>
                <h3 className="fs-3 fw-bold text-dark mb-0 text-truncate">
                  {p1Name}
                </h3>
              </div>
            </Col>

            {/* VS Center Emblem */}
            <Col md={2} className="my-2 my-md-0">
              <div className="vs-badge-container d-flex flex-column align-items-center justify-content-center">
                <div className="vs-glow-circle">
                  <span className="vs-text">VS</span>
                </div>
              </div>
            </Col>

            {/* Player 2 Card */}
            <Col md={5}>
              <div className="p-3 rounded-4" style={{ background: 'var(--p2-bg)', border: '2px solid var(--p2-border)' }}>
                <div style={{ fontSize: 'clamp(2.2rem, 4vw, 3.5rem)' }} className="mb-1">⚡</div>
                <div className="text-danger fw-bold small mb-1">PLAYER 2</div>
                <h3 className="fs-3 fw-bold text-dark mb-0 text-truncate">
                  {p2Name}
                </h3>
              </div>
            </Col>
          </Row>

          {/* Launch Race Controls */}
          <div className="mt-3 mt-md-4 pt-2">
            <Button
              variant="success"
              size="lg"
              className="btn-launch-race py-2 py-md-3 px-4 px-md-5 fw-bold fs-3 text-uppercase shadow-lg w-100 mb-2"
              style={{ maxWidth: '550px', borderRadius: '16px' }}
              onClick={handleLaunch}
            >
              🚦 BEGIN RACE NOW
            </Button>

            <div>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleEditSetup}
              >
                ⚙️ Edit Player Names or Laps
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Container>
  );
}

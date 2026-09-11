import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';
import { raceStateManager } from '../services/stateManager';
import { soundEngine } from '../services/audio';

export function SetupView({ onStartRace, onOpenLeaderboard }) {
  const activeState = raceStateManager.getState();
  const [p1Name, setP1Name] = useState(activeState.players['1']?.name || '');
  const [p2Name, setP2Name] = useState(activeState.players['2']?.name || '');
  const [targetLaps, setTargetLaps] = useState(activeState.target_laps || 8);

  const lapPresetOptions = [4, 8, 12, 16];

  const handleSubmit = (e) => {
    e.preventDefault();
    const p1 = p1Name.trim() || 'Driver 1';
    const p2 = p2Name.trim() || 'Driver 2';

    soundEngine.playStartBeep();
    raceStateManager.startSetup(p1, p2, targetLaps);

    if (onStartRace) {
      onStartRace();
    }
  };

  return (
    <Container fluid className="p-3 flex-grow-1 d-flex flex-column justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 65px)', overflow: 'hidden' }}>
      <div className="w-100" style={{ maxWidth: '1150px' }}>
        {/* Landscape Top Header Banner */}
        <Card className="cyber-card p-3 mb-3 d-flex flex-row justify-content-between align-items-center shadow-sm">
          <div className="d-flex align-items-center gap-3">
            <span style={{ fontSize: '2.2rem' }}>🧠🏎️</span>
            <div>
              <h3 className="fw-bold tracking-wide text-dark mb-0 fs-3">
                MINDWAVE CAR RACING
              </h3>
              <div className="text-muted small fw-bold" style={{ fontSize: '0.75rem' }}>
                FRONTEND 2-PLAYER DRIVER SETUP & RACE CONTROL
              </div>
            </div>
          </div>

          {onOpenLeaderboard && (
            <Button
              variant="outline-dark"
              size="sm"
              className="fw-bold px-3 py-2"
              onClick={onOpenLeaderboard}
              type="button"
            >
              🏆 View Session Leaderboard
            </Button>
          )}
        </Card>

        {/* Landscape Form Content Grid */}
        <Form onSubmit={handleSubmit}>
          <Row className="g-3 align-items-stretch">
            {/* Left Column: Player 1 & Player 2 Name Inputs */}
            <Col lg={7}>
              <Row className="g-3 h-100">
                {/* Player 1 Input */}
                <Col sm={6}>
                  <Card className="cyber-card p1-card p-3 h-100 d-flex flex-column justify-content-between shadow-sm">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span style={{ fontSize: '1.6rem' }}>🏎️</span>
                        <span className="fw-bold text-primary fs-5">PLAYER 1 (Yellow)</span>
                      </div>
                      <Form.Group className="mb-2">
                        <Form.Label className="text-muted small fw-bold mb-1">Driver Name</Form.Label>
                        <Form.Control
                          type="text"
                          className="form-control-cyber fs-5"
                          placeholder="Player 1 Name..."
                          value={p1Name}
                          onChange={(e) => setP1Name(e.target.value)}
                          required
                          autoComplete="off"
                        />
                      </Form.Group>
                    </div>
                    <div className="shortcut-badge mt-2">
                      Lap Hotkey: Press <span>1</span> or <span>A</span>
                    </div>
                  </Card>
                </Col>

                {/* Player 2 Input */}
                <Col sm={6}>
                  <Card className="cyber-card p2-card p-3 h-100 d-flex flex-column justify-content-between shadow-sm">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span style={{ fontSize: '1.6rem' }}>⚡</span>
                        <span className="fw-bold text-danger fs-5">PLAYER 2 (Silver)</span>
                      </div>
                      <Form.Group className="mb-2">
                        <Form.Label className="text-muted small fw-bold mb-1">Driver Name</Form.Label>
                        <Form.Control
                          type="text"
                          className="form-control-cyber fs-5"
                          placeholder="Player 2 Name..."
                          value={p2Name}
                          onChange={(e) => setP2Name(e.target.value)}
                          required
                          autoComplete="off"
                        />
                      </Form.Group>
                    </div>
                    <div className="shortcut-badge mt-2">
                      Lap Hotkey: Press <span>2</span> or <span>L</span>
                    </div>
                  </Card>
                </Col>
              </Row>
            </Col>

            {/* Right Column: Target Laps Selector & Start Race Launch Button */}
            <Col lg={5}>
              <Card className="cyber-card p-3 h-100 d-flex flex-column justify-content-between shadow-sm text-center">
                <div>
                  <Form.Label className="fw-bold text-dark fs-5 mb-2 d-block">
                    🏁 SELECT TARGET LAPS
                  </Form.Label>

                  <div className="d-flex flex-wrap justify-content-center gap-2 mb-2">
                    {lapPresetOptions.map((laps) => (
                      <Button
                        key={laps}
                        variant={targetLaps === laps ? 'primary' : 'outline-secondary'}
                        size="sm"
                        className="px-3 py-1 fw-bold fs-5 rounded-3 shadow-xs"
                        onClick={() => setTargetLaps(laps)}
                        type="button"
                      >
                        {laps} Laps
                      </Button>
                    ))}
                  </div>

                  {/* Custom Laps Input */}
                  <div className="d-inline-flex align-items-center gap-2 my-1" style={{ maxWidth: '210px' }}>
                    <span className="text-muted small fw-bold">Custom:</span>
                    <Form.Control
                      type="number"
                      min="1"
                      max="100"
                      className="form-control-cyber text-center fw-bold text-primary py-1 fs-6"
                      value={targetLaps}
                      onChange={(e) => setTargetLaps(parseInt(e.target.value, 10) || 1)}
                    />
                    <span className="text-muted small fw-bold">Laps</span>
                  </div>
                </div>

                <div className="mt-3">
                  <Button
                    type="submit"
                    variant="success"
                    size="lg"
                    className="btn-launch-race w-100 py-3 fw-bold fs-3 text-uppercase shadow-lg"
                    style={{ borderRadius: '14px' }}
                  >
                    🚦 START RACE NOW
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </Form>
      </div>
    </Container>
  );
}

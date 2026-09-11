import React, { useEffect } from 'react';
import { Modal, Row, Col, Card, Table, Button, Badge } from 'react-bootstrap';
import confetti from 'canvas-confetti';
import { soundEngine } from '../services/audio';

export function WinnerOverlay({ raceState, show, onNewRace, onOpenLeaderboard }) {
  const summary = raceState.winner_summary;

  useEffect(() => {
    if (show && summary) {
      soundEngine.playVictoryFanfare();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch (e) {}
    }
  }, [show, summary]);

  if (!summary) return null;

  return (
    <Modal
      show={show}
      onHide={onNewRace}
      centered
      size="lg"
      backdrop="static"
      contentClassName="modal-content-cyber text-center p-2 p-md-4 shadow-lg"
    >
      <Modal.Body className="p-2 p-md-3">
        <div style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>🏆</div>
        <h1 className="fw-bold text-dark fs-2 fs-md-1 mb-1">
          {summary.winner_name} WINS!
        </h1>
        <p className="text-muted fs-6 fs-md-5 mb-3 mb-md-4 fw-bold">Official Race Victory & Results Summary</p>

        {/* Winner Highlight Card */}
        <Card className="cyber-card p-2 p-md-4 mb-3 mb-md-4 border-warning shadow-sm" style={{ background: '#fef3c7', border: '2px solid #f59e0b' }}>
          <Badge bg="warning" text="dark" className="fs-6 px-3 py-2 mx-auto mb-2 mb-md-3 fw-bold">
            🏆 RACE WINNER SUMMARY
          </Badge>
          <Row className="g-2 g-md-3">
            <Col xs={4}>
              <div className="text-muted small fw-bold" style={{ fontSize: '0.7rem' }}>TOTAL LAPS</div>
              <div className="fw-bold fs-5 fs-md-2 text-dark" style={{ fontFamily: 'var(--font-mono)' }}>{summary.winner_laps} LAPS</div>
            </Col>
            <Col xs={4}>
              <div className="text-muted small fw-bold" style={{ fontSize: '0.7rem' }}>TOTAL RACE TIME</div>
              <div className="fw-bold fs-5 fs-md-2 text-primary" style={{ fontFamily: 'var(--font-mono)' }}>{summary.total_time_str}</div>
            </Col>
            <Col xs={4}>
              <div className="text-muted small fw-bold" style={{ fontSize: '0.7rem' }}>FASTEST LAP</div>
              <div className="fw-bold fs-5 fs-md-2 text-warning" style={{ fontFamily: 'var(--font-mono)' }}>
                {summary.winner_best_lap ? `${summary.winner_best_lap.toFixed(2)}s` : '--'}
              </div>
            </Col>
          </Row>
        </Card>

        {/* Runner-up Details */}
        <Card className="cyber-card p-2 p-md-4 mb-3 mb-md-4 shadow-sm" style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1' }}>
          <div className="d-flex justify-content-between align-items-center mb-2 mb-md-3">
            <span className="fw-bold text-muted small uppercase">🥈 RUNNER-UP DETAILS</span>
            <span className="fw-bold text-dark fs-5 fs-md-4">{summary.runner_up_name || 'Runner-Up'}</span>
          </div>
          <Row className="g-2 g-md-3 text-center">
            <Col xs={6}>
              <div className="p-2 p-md-3 rounded-3 shadow-xs" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0' }}>
                <div className="text-muted small fw-bold mb-1" style={{ fontSize: '0.7rem' }}>TOTAL LAPS</div>
                <div className="fw-bold fs-5 fs-md-3 text-dark" style={{ fontFamily: 'var(--font-mono)' }}>
                  {summary.runner_up_laps} LAPS
                </div>
              </div>
            </Col>
            <Col xs={6}>
              <div className="p-2 p-md-3 rounded-3 shadow-xs" style={{ background: '#ffffff', border: '1.5px solid #e2e8f0' }}>
                <div className="text-muted small fw-bold mb-1" style={{ fontSize: '0.7rem' }}>FASTEST LAP</div>
                <div className="fw-bold fs-5 fs-md-3 text-warning" style={{ fontFamily: 'var(--font-mono)' }}>
                  {summary.runner_up_best_lap ? `${summary.runner_up_best_lap.toFixed(2)}s` : '--'}
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Detailed Lap Timing Matrix */}
        <div className="text-start mb-2">
          <span className="fw-bold text-dark small">⏱️ LAP-BY-LAP TIMING BREAKDOWN</span>
        </div>
        <div className="table-responsive mb-3 mb-md-4 shadow-xs rounded-3 border" style={{ maxHeight: '160px', overflowY: 'auto' }}>
          <Table size="sm" className="table-cyber text-center align-middle mb-0">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Lap #</th>
                <th>Lap Time</th>
              </tr>
            </thead>
            <tbody>
              {['1', '2'].map((pId) => {
                const player = raceState.players ? raceState.players[pId] : null;
                if (!player || !player.lap_times) return null;
                const isWinner = player.id === summary.winner_id;
                return player.lap_times.map((lTime, idx) => (
                  <tr key={`${pId}_${idx}`}>
                    <td className={isWinner ? 'text-primary fw-bold' : 'text-dark'}>
                      {isWinner ? '🏆 ' : ''}{player.name || `Player ${pId}`}
                    </td>
                    <td className="text-dark fw-bold">Lap {idx + 1}</td>
                    <td className="fw-bold text-primary" style={{ fontFamily: 'var(--font-mono)' }}>
                      {typeof lTime === 'number' ? `${lTime.toFixed(2)}s` : lTime}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </Table>
        </div>

        {/* Action Buttons: View Leaderboard & New Race */}
        <Row className="g-2 g-md-3">
          <Col xs={6}>
            <Button
              variant="warning"
              size="md"
              className="w-100 py-2 py-md-3 fw-bold fs-5 fs-md-4 text-uppercase shadow-md"
              onClick={onOpenLeaderboard}
              style={{ borderRadius: '14px' }}
            >
              🏆 LEADERBOARD
            </Button>
          </Col>
          <Col xs={6}>
            <Button
              variant="success"
              size="md"
              className="btn-launch-race w-100 py-2 py-md-3 fw-bold fs-5 fs-md-4 text-uppercase shadow-md"
              onClick={onNewRace}
              style={{ borderRadius: '14px' }}
            >
              🔄 NEW RACE
            </Button>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
}

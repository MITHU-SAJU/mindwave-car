import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Button } from 'react-bootstrap';
import { raceStateManager } from '../services/stateManager';

export function PublicLeaderboardView({ raceState, formattedTime, onSwitchToControl }) {
  const [leaderboard, setLeaderboard] = useState([]);

  const loadLeaderboardData = () => {
    const list = raceStateManager.getLeaderboard();
    setLeaderboard(list);
  };

  useEffect(() => {
    loadLeaderboardData();

    // Subscribe to state manager updates (cross-tab broadcast & local state changes)
    const unsubscribe = raceStateManager.subscribe(() => {
      loadLeaderboardData();
    });

    return () => unsubscribe();
  }, [raceState]);

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all leaderboard records from local storage?')) {
      raceStateManager.clearLeaderboard();
      setLeaderboard([]);
    }
  };

  const isRacing = raceState.status === 'racing';
  const isFinished = raceState.status === 'finished';

  return (
    <Container fluid className="p-2 p-md-3 flex-grow-1 d-flex flex-column" style={{ maxHeight: 'calc(100vh - 65px)', overflow: 'hidden' }}>
      {/* TV Header Banner */}
      <Card className="cyber-card p-2 px-3 mb-2 d-flex flex-row justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <span style={{ fontSize: '1.8rem' }}>🏆</span>
          <div>
            <h4 className="fw-bold text-dark mb-0 tracking-wide fs-5">
              SESSION RACE LEADERBOARD
            </h4>
            <div className="text-muted small fw-bold" style={{ fontSize: '0.7rem' }}>
              ALL COMPLETED PARTICIPANTS & TIMINGS
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Badge bg={isRacing ? 'success' : isFinished ? 'warning' : 'secondary'} className="fs-6 px-2 py-1">
            {isRacing ? 'LIVE RACING' : isFinished ? 'RACE FINISHED' : 'READY'}
          </Badge>

          {onSwitchToControl && (
            <Button variant="outline-primary" size="sm" className="fw-bold px-2 py-1" onClick={onSwitchToControl}>
              ⚙️ Controller
            </Button>
          )}
        </div>
      </Card>

      {/* Winner Banner if Finished */}
      {isFinished && raceState.winner_summary && (
        <Card className="cyber-card p-2 px-3 mb-2 border-warning text-center shadow-sm" style={{ background: '#fef3c7', border: '2px solid #f59e0b' }}>
          <h4 className="fw-bold text-dark fs-5 mb-0">
            🏆 LATEST WINNER: {raceState.winner_summary.winner_name}! | Laps: <strong>{raceState.winner_summary.winner_laps}</strong> | Total Time: <strong>{raceState.winner_summary.total_time_str}</strong> | Best Lap: <strong>{raceState.winner_summary.winner_best_lap ? `${raceState.winner_summary.winner_best_lap.toFixed(2)}s` : '--'}</strong>
          </h4>
        </Card>
      )}

      {/* Clean Session Leaderboard Table */}
      <Card className="cyber-card p-3 flex-grow-1 d-flex flex-column overflow-hidden shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
            <span>🥇</span> DRIVER STANDINGS & RANKINGS
          </h5>
          <Button variant="outline-danger" size="sm" className="py-0 px-2" onClick={handleClearHistory}>
            🗑️ Clear
          </Button>
        </div>

        <div className="table-responsive flex-grow-1 overflow-auto">
          <Table className="table-cyber align-middle text-nowrap mb-0">
            <thead>
              <tr>
                <th className="py-2">Rank</th>
                <th className="py-2">Driver Name</th>
                <th className="py-2">Completed Laps</th>
                <th className="py-2">Total Race Time</th>
                <th className="py-2">Fastest Lap</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard && leaderboard.length > 0 ? (
                leaderboard.map((row, idx) => (
                  <tr key={row.entry_id || idx} style={{ background: row.is_winner ? '#fffbeb' : 'transparent' }}>
                    <td className="fw-bold text-warning py-2">
                      {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                    </td>
                    <td className="fw-bold text-dark py-2">
                      {row.player_name} {row.is_winner && '🏆'}
                    </td>
                    <td className="fw-bold text-primary py-2">{row.laps} Laps</td>
                    <td className="text-dark fw-bold py-2" style={{ fontFamily: 'var(--font-mono)' }}>{row.total_time_str}</td>
                    <td className="text-warning fw-bold py-2" style={{ fontFamily: 'var(--font-mono)' }}>{row.fastest_lap_str}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted fw-bold">
                    No completed races yet in this session. Start a race in Race Controller!
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </Container>
  );
}

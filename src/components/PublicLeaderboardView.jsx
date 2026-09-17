import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Button, ButtonGroup } from 'react-bootstrap';
import { raceStateManager } from '../services/stateManager';
import { fetchRaceHistory, clearRaceHistoryOnDisk } from '../services/api';
import { subscribeToSupabaseRealtime } from '../services/supabase';

export function PublicLeaderboardView({ raceState, formattedTime, onSwitchToControl }) {
  const [filterLocation, setFilterLocation] = useState('all');
  const [leaderboard, setLeaderboard] = useState([]);

  const loadLeaderboardData = async (loc = filterLocation) => {
    // 1. Fetch from API / Supabase / localStorage
    const list = await fetchRaceHistory(loc);

    // Sort: Laps (desc), Total time (asc), Fastest lap (asc)
    const sorted = (list || []).sort((a, b) => {
      const aLaps = parseInt(a.laps, 10) || 0;
      const bLaps = parseInt(b.laps, 10) || 0;
      if (bLaps !== aLaps) return bLaps - aLaps;

      const aTime = parseInt(a.total_time_ms, 10) || Infinity;
      const bTime = parseInt(b.total_time_ms, 10) || Infinity;
      if (aTime !== bTime) return aTime - bTime;

      const aBest = parseFloat(a.best_lap || a.fastest_lap) || Infinity;
      const bBest = parseFloat(b.best_lap || b.fastest_lap) || Infinity;
      return aBest - bBest;
    });

    setLeaderboard(sorted);
  };

  useEffect(() => {
    loadLeaderboardData(filterLocation);

    // Subscribe to state manager updates
    const unsubscribeState = raceStateManager.subscribe(() => {
      loadLeaderboardData(filterLocation);
    });

    // Subscribe to Supabase Realtime updates
    const unsubscribeRealtime = subscribeToSupabaseRealtime(() => {
      loadLeaderboardData(filterLocation);
    });

    return () => {
      unsubscribeState();
      unsubscribeRealtime();
    };
  }, [raceState, filterLocation]);

  const handleLocationTabChange = (loc) => {
    setFilterLocation(loc);
    loadLeaderboardData(loc);
  };

  const handleClearHistory = async () => {
    const targetText = filterLocation === 'all' ? 'ALL locations' : filterLocation === 'location_1' ? 'Location 1' : 'Location 2';
    if (window.confirm(`Are you sure you want to clear leaderboard records for ${targetText}?`)) {
      await clearRaceHistoryOnDisk(filterLocation);
      loadLeaderboardData(filterLocation);
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
              RACE LEADERBOARD & STANDINGS
            </h4>
            <div className="text-muted small fw-bold" style={{ fontSize: '0.7rem' }}>
              REALTIME MULTI-LOCATION TRACKER
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

      {/* Location Selector Tabs */}
      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
        <ButtonGroup size="sm" className="cyber-button-group shadow-sm">
          <Button
            variant={filterLocation === 'all' ? 'warning' : 'outline-dark'}
            className="fw-bold px-3 py-1"
            onClick={() => handleLocationTabChange('all')}
          >
            🌍 Global (All Locations)
          </Button>
          <Button
            variant={filterLocation === 'location_1' ? 'primary' : 'outline-dark'}
            className="fw-bold px-3 py-1"
            onClick={() => handleLocationTabChange('location_1')}
          >
            🏢 Location 1
          </Button>
          <Button
            variant={filterLocation === 'location_2' ? 'danger' : 'outline-dark'}
            className="fw-bold px-3 py-1"
            onClick={() => handleLocationTabChange('location_2')}
          >
            🏬 Location 2
          </Button>
        </ButtonGroup>

        <Button variant="outline-danger" size="sm" className="py-1 px-2" onClick={handleClearHistory}>
          🗑️ Clear ({filterLocation === 'all' ? 'All' : filterLocation === 'location_1' ? 'Loc 1' : 'Loc 2'})
        </Button>
      </div>

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
            <span>🥇</span> DRIVER STANDINGS {filterLocation === 'all' ? '(GLOBAL)' : filterLocation === 'location_1' ? '(LOCATION 1)' : '(LOCATION 2)'}
          </h5>
        </div>

        <div className="table-responsive flex-grow-1 overflow-auto">
          <Table className="table-cyber align-middle text-nowrap mb-0">
            <thead>
              <tr>
                <th className="py-2">Rank</th>
                <th className="py-2">Location</th>
                <th className="py-2">Driver Name</th>
                <th className="py-2">Completed Laps</th>
                <th className="py-2">Total Race Time</th>
                <th className="py-2">Fastest Lap</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard && leaderboard.length > 0 ? (
                leaderboard.map((row, idx) => {
                  const locId = row.location_id || 'location_1';
                  const locBadgeBg = locId === 'location_1' ? 'primary' : locId === 'location_2' ? 'danger' : 'info';
                  const locLabel = locId === 'location_1' ? 'Location 1' : locId === 'location_2' ? 'Location 2' : locId;

                  return (
                    <tr key={row.entry_id || idx} style={{ background: row.is_winner ? '#fffbeb' : 'transparent' }}>
                      <td className="fw-bold text-warning py-2">
                        {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                      </td>
                      <td className="py-2">
                        <Badge bg={locBadgeBg} className="fw-bold px-2 py-1">
                          📍 {locLabel}
                        </Badge>
                      </td>
                      <td className="fw-bold text-dark py-2">
                        {row.player_name || row.name} {row.is_winner && '🏆'}
                      </td>
                      <td className="fw-bold text-primary py-2">{row.laps} Laps</td>
                      <td className="text-dark fw-bold py-2" style={{ fontFamily: 'var(--font-mono)' }}>{row.total_time_str || row.time_str}</td>
                      <td className="text-warning fw-bold py-2" style={{ fontFamily: 'var(--font-mono)' }}>{row.fastest_lap_str || row.best_lap}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted fw-bold">
                    No completed races found for {filterLocation === 'all' ? 'any location' : filterLocation === 'location_1' ? 'Location 1' : 'Location 2'}. Start a race in Race Controller!
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


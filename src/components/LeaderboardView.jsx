import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge
} from 'react-bootstrap';

import { raceStateManager } from '../services/stateManager';
import { fetchRaceHistory } from '../services/api';

export function LeaderboardView({ raceState, onSwitchToRace }) {
  const [history, setHistory] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ============================================================
  // LOAD ALL PLAYER HISTORY
  // ============================================================

  const loadHistory = async () => {
    try {
      /*
       * IMPORTANT:
       * We want ALL historical players, not only the latest 10.
       *
       * If your stateManager already has getAllParticipants(),
       * use it here.
       */

      let local = [];

      if (typeof raceStateManager.getAllParticipants === 'function') {
        local = raceStateManager.getAllParticipants();
      }

      // If localStorage has history, use it
      if (Array.isArray(local) && local.length > 0) {
        setHistory(local);
        return;
      }

      // Otherwise try server history
      try {
        const serverHistory = await fetchRaceHistory();

        if (Array.isArray(serverHistory)) {
          setHistory(serverHistory);
        } else {
          setHistory([]);
        }
      } catch (error) {
        console.warn('Unable to load server history:', error);
        setHistory([]);
      }
    } catch (error) {
      console.error('Error loading leaderboard history:', error);
      setHistory([]);
    }
  };

  // Reload leaderboard whenever race state changes
  useEffect(() => {
    loadHistory();
  }, [raceState]);

  // ============================================================
  // FULLSCREEN
  // ============================================================

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.warn('Fullscreen error:', error);
    }
  };

  // ============================================================
  // CLEAR HISTORY
  // ============================================================

  const handleClearHistory = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all participant leaderboard history?'
    );

    if (!confirmed) {
      return;
    }

    raceStateManager.clearLeaderboard();
    setHistory([]);
  };

  // ============================================================
  // LIVE RACE PLAYERS
  // ============================================================

  const playersArr = Object.values(raceState.players || {});

  /*
   * Live race ranking:
   *
   * 1. Highest number of laps
   * 2. Fastest best lap
   */

  const sortedPlayers = [...playersArr].sort((a, b) => {
    const lapsA = Number(a.laps) || 0;
    const lapsB = Number(b.laps) || 0;

    // More laps = better
    if (lapsA !== lapsB) {
      return lapsB - lapsA;
    }

    const bestLapA = Number(a.best_lap) || Infinity;
    const bestLapB = Number(b.best_lap) || Infinity;

    // Faster lap = better
    return bestLapA - bestLapB;
  });

  // ============================================================
  // GLOBAL LEADERBOARD
  // ============================================================

  /*
   * IMPORTANT:
   *
   * This leaderboard contains ALL players.
   *
   * Ranking is based primarily on BEST LAP TIME.
   *
   * Example:
   *
   * Arun   12.42 sec
   * Rahul  13.10 sec
   * Kumar  14.21 sec
   *
   * Arun becomes #1.
   */

  const sortedHistory = [...history]
    .filter((player) => {
      const bestLap = Number(player.best_lap);

      return Number.isFinite(bestLap) && bestLap > 0;
    })
    .sort((a, b) => {
      const bestLapA = Number(a.best_lap);
      const bestLapB = Number(b.best_lap);

      // Primary ranking:
      // fastest best lap
      if (bestLapA !== bestLapB) {
        return bestLapA - bestLapB;
      }

      // Secondary ranking:
      // more laps
      const lapsA = Number(a.laps) || 0;
      const lapsB = Number(b.laps) || 0;

      if (lapsA !== lapsB) {
        return lapsB - lapsA;
      }

      // Tertiary ranking:
      // earlier race/time record
      const timeA = new Date(
        a.completed_at ||
        a.created_at ||
        a.timestamp ||
        0
      ).getTime();

      const timeB = new Date(
        b.completed_at ||
        b.created_at ||
        b.timestamp ||
        0
      ).getTime();

      return timeA - timeB;
    });

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatLapTime = (value) => {
    const time = Number(value);

    if (!Number.isFinite(time) || time <= 0) {
      return '--';
    }

    return `${time.toFixed(2)}s`;
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Container
      fluid
      className="p-3 p-md-4 flex-grow-1 d-flex flex-column"
    >

      {/* ========================================================
          LIVE RACE
      ======================================================== */}

      <div className="mb-4">

        <h4 className="fw-bold text-info mb-3 d-flex align-items-center gap-2">
          <span>📡</span>

          LIVE RACE STANDINGS

          <Badge
            bg="success"
            className="fs-6 px-2 py-1 ms-auto"
          >
            LIVE SYNC
          </Badge>
        </h4>

        <Row className="g-3">

          {sortedPlayers.map((player, index) => {

            const isP1 = player.id === '1';

            const cardBorder = isP1
              ? 'p1-card'
              : 'p2-card';

            const textColor = isP1
              ? 'text-info'
              : 'text-danger';

            return (
              <Col md={6} key={player.id}>

                <Card
                  className={`cyber-card ${cardBorder} p-3`}
                >

                  <div className="d-flex justify-content-between align-items-center">

                    {/* PLAYER INFO */}

                    <div className="d-flex align-items-center gap-3">

                      <div className="fs-1 fw-bold text-warning">
                        #{index + 1}
                      </div>

                      <div>

                        <h4
                          className={`fw-bold mb-0 ${textColor}`}
                        >
                          {player.name ||
                            `Driver ${player.id}`}
                        </h4>

                        <small className="text-muted">
                          PLAYER {player.id}
                        </small>

                      </div>

                    </div>

                    {/* LAP INFO */}

                    <div className="text-end">

                      <div className="fs-3 fw-bold text-white">

                        {player.laps || 0}

                        {' / '}

                        {raceState.target_laps || 8}

                        {' LAPS'}

                      </div>

                      <div className="text-warning small">

                        BEST:{' '}

                        {player.best_lap
                          ? formatLapTime(player.best_lap)
                          : '--'}

                      </div>

                    </div>

                  </div>

                </Card>

              </Col>
            );
          })}

        </Row>

      </div>


      {/* ========================================================
          GLOBAL LEADERBOARD
      ======================================================== */}

      <Card
        className="cyber-card p-3 p-md-4 flex-grow-1 mb-3"
      >

        {/* HEADER */}

        <div className="d-flex justify-content-between align-items-center mb-3">

          <div className="d-flex align-items-center gap-2">

            <h5 className="fw-bold text-white mb-0">
              🏆 GLOBAL LEADERBOARD
            </h5>

            <Badge bg="secondary">
              ALL PLAYERS
            </Badge>

          </div>


          <div className="d-flex gap-2">

            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleToggleFullscreen}
            >
              {isFullscreen
                ? 'Exit Fullscreen'
                : '🖥️ Fullscreen'}
            </Button>


            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleClearHistory}
            >
              🗑️ Clear History
            </Button>

          </div>

        </div>


        {/* LEADERBOARD DESCRIPTION */}

        <div className="mb-3">

          <small className="text-muted">

            Players are ranked by their fastest recorded lap time.
            Faster lap = higher position.

          </small>

        </div>


        {/* TABLE */}

        <div className="table-responsive">

          <Table
            className="table-cyber align-middle text-nowrap"
          >

            <thead>

              <tr>

                <th>RANK</th>

                <th>DRIVER</th>

                <th>BEST LAP</th>

                <th>LAPS COMPLETED</th>

                <th>RESULT</th>

                <th>TIME LOGGED</th>

              </tr>

            </thead>


            <tbody>

              {sortedHistory.length > 0 ? (

                sortedHistory.map((row, idx) => {

                  const isFirst = idx === 0;

                  const isSecond = idx === 1;

                  const isThird = idx === 2;

                  return (

                    <tr
                      key={
                        row.entry_id ||
                        row.id ||
                        `${row.name}-${idx}`
                      }
                    >

                      {/* RANK */}

                      <td>

                        <span
                          className="fw-bold"
                          style={{
                            fontSize: '1.15rem'
                          }}
                        >

                          {isFirst
                            ? '🥇'
                            : isSecond
                              ? '🥈'
                              : isThird
                                ? '🥉'
                                : `#${idx + 1}`}

                        </span>

                      </td>


                      {/* PLAYER */}

                      <td className="fw-bold text-white">

                        {row.name || 'Unknown Player'}

                      </td>


                      {/* BEST LAP */}

                      <td className="text-info fw-bold">

                        {formatLapTime(row.best_lap)}

                      </td>


                      {/* LAPS */}

                      <td>

                        {row.laps ?? 0}

                        {row.target_laps
                          ? ` / ${row.target_laps}`
                          : ''}

                      </td>


                      {/* RESULT */}

                      <td>

                        <Badge
                          bg={
                            isFirst
                              ? 'warning'
                              : 'dark'
                          }
                          className="border border-secondary"
                        >

                          {isFirst
                            ? '🏆 BEST TIME'
                            : row.status || 'COMPLETED'}

                        </Badge>

                      </td>


                      {/* TIME */}

                      <td className="text-muted small">

                        {row.time_str || '--'}

                      </td>

                    </tr>

                  );

                })

              ) : (

                <tr>

                  <td
                    colSpan="6"
                    className="text-center py-5 text-muted"
                  >

                    <div className="fs-1 mb-2">
                      🏁
                    </div>

                    <div>
                      No completed races yet.
                    </div>

                    <small>
                      Start a race and record lap times
                      to populate the leaderboard.
                    </small>

                  </td>

                </tr>

              )}

            </tbody>

          </Table>

        </div>

      </Card>


      {/* ========================================================
          FOOTER
      ======================================================== */}

      <div
        className="d-flex justify-content-between align-items-center text-muted small"
      >

        <div>
          📡 Auto-Sync Active across screens via
          BroadcastChannel & LocalStorage
        </div>


        <Button
          variant="outline-info"
          size="sm"
          onClick={onSwitchToRace}
        >
          ⚙️ Open Race Controller
        </Button>

      </div>

    </Container>
  );
}
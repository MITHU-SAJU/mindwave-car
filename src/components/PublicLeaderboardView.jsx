import React, { useState, useEffect } from "react";
import {
  Container,
  Card,
  Table,
  Badge,
  Button,
  Modal,
  Form,
} from "react-bootstrap";
import { raceStateManager } from "../services/stateManager";
import {
  fetchRaceHistory,
  clearRaceHistoryOnDisk,
  updateParticipantRecord,
  deleteParticipantRecord,
} from "../services/api";
import { subscribeToSupabaseRealtime } from "../services/supabase";

export function PublicLeaderboardView({
  raceState,
  formattedTime,
  onSwitchToControl,
}) {
  // Default to the venue location configured in Settings (e.g., location_1 or location_2)
  const [filterLocation, setFilterLocation] = useState(() => {
    return raceStateManager.getLocationId() || "location_1";
  });
  const [leaderboard, setLeaderboard] = useState([]);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLaps, setEditLaps] = useState(0);

  const loadLeaderboardData = async (loc = filterLocation) => {
    // Fetch directly from Supabase Database for requested location filter
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

    // Subscribe to state manager updates (including location config changes & END_RACE events)
    const unsubscribeState = raceStateManager.subscribe((state, eventMeta) => {
      if (eventMeta && eventMeta.type === "LOCATION_CHANGED") {
        const activeLoc = raceStateManager.getLocationId();
        setFilterLocation(activeLoc);
        loadLeaderboardData(activeLoc);
      } else {
        loadLeaderboardData(filterLocation);
        // Automatic delayed fetch after race completion to ensure Supabase DB row is rendered without manual reload
        if (
          eventMeta &&
          (eventMeta.type === "END_RACE" || state.status === "finished")
        ) {
          setTimeout(() => {
            loadLeaderboardData(filterLocation);
          }, 1200);
        }
      }
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

  const handleLocationChange = (newLoc) => {
    setFilterLocation(newLoc);
    loadLeaderboardData(newLoc);
  };

  const handleClearHistory = async () => {
    const locName =
      filterLocation === "all"
        ? "all locations"
        : filterLocation === "location_1"
          ? "Location 1"
          : "Location 2";
    if (
      window.confirm(
        `Are you sure you want to clear leaderboard records for ${locName} from Supabase?`,
      )
    ) {
      await clearRaceHistoryOnDisk(filterLocation);
      loadLeaderboardData(filterLocation);
    }
  };

  // Handle Opening Edit Modal
  const handleOpenEdit = (row) => {
    setEditingEntry(row);
    setEditName(row.player_name || row.name || "");
    setEditLaps(parseInt(row.laps, 10) || 0);
    setShowEditModal(true);
  };

  // Save Edit to Supabase
  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    const entryId = editingEntry.entry_id;
    if (entryId) {
      await updateParticipantRecord(entryId, {
        player_name: editName.trim(),
        laps: parseInt(editLaps, 10) || 0,
      });
      loadLeaderboardData(filterLocation);
    }
    setShowEditModal(false);
  };

  // Handle Deleting a Single Row from Supabase
  const handleDeleteRow = async (row) => {
    const entryId = row.entry_id;
    const name = row.player_name || row.name || "Driver";

    if (
      window.confirm(
        `Are you sure you want to delete ${name} from the leaderboard database?`,
      )
    ) {
      await deleteParticipantRecord(entryId);
      loadLeaderboardData(filterLocation);
    }
  };

  const isRacing = raceState.status === "racing";
  const isFinished = raceState.status === "finished";

  return (
    <Container
      fluid
      className="p-3 p-md-4 flex-grow-1 d-flex flex-column"
      style={{ maxHeight: "calc(100vh - 65px)", overflow: "hidden" }}
    >
      {/* Header Banner */}
      {/* <Card className="cyber-card p-3 mb-3 d-flex flex-row justify-content-between align-items-center shadow-sm">
        <div className="d-flex align-items-center gap-3">
          <span style={{ fontSize: '2rem' }}>🏆</span>
          <div>
            <h4 className="fw-bold text-dark mb-0 tracking-wide fs-4">
              RACE LEADERBOARD
            </h4>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Badge bg={isRacing ? 'success' : isFinished ? 'warning' : 'secondary'} className="fs-6 px-3 py-2">
            {isRacing ? 'LIVE RACING' : isFinished ? 'RACE FINISHED' : 'READY'}
          </Badge>

          {onSwitchToControl && (
            <Button variant="outline-primary" size="sm" className="fw-bold px-3 py-2" onClick={onSwitchToControl}>
              ⚙️ Controller
            </Button>
          )}
        </div>
      </Card> */}

      {/* Winner Banner if Finished */}
      {isFinished && raceState.winner_summary && (
        <Card
          className="cyber-card p-3 mb-3 border-warning text-center shadow-sm"
          style={{ background: "#fef3c7", border: "2px solid #f59e0b" }}
        >
          <h4 className="fw-bold text-dark fs-5 mb-0">
            🏆 LATEST WINNER: {raceState.winner_summary.winner_name}! | Laps:{" "}
            <strong>{raceState.winner_summary.winner_laps}</strong> | Total
            Time: <strong>{raceState.winner_summary.total_time_str}</strong> |
            Best Lap:{" "}
            <strong>
              {raceState.winner_summary.winner_best_lap
                ? `${raceState.winner_summary.winner_best_lap.toFixed(2)}s`
                : "--"}
            </strong>
          </h4>
        </Card>
      )}

      {/* Standings Table Card */}
      <Card className="cyber-card p-3 p-md-4 flex-grow-1 d-flex flex-column overflow-hidden shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2 fs-5">
            <span>🥇</span> LEADERBOARD
          </h5>

          {/* Small Location Filter Dropdown & Clear All Button */}
          <div className="d-flex align-items-center gap-2">
            <Form.Select
              size="sm"
              className="location-filter-select shadow-sm"
              style={{ width: "auto", minWidth: "160px", cursor: "pointer" }}
              value={filterLocation}
              onChange={(e) => handleLocationChange(e.target.value)}
            >
              <option value="all">🌍 All Locations</option>
              <option value="location_1">🏢 Location 1</option>
              <option value="location_2">🏬 Location 2</option>
            </Form.Select>

            <Button
              variant="outline-danger"
              size="sm"
              className="py-1 px-3 fw-bold rounded-pill"
              onClick={handleClearHistory}
            >
              🗑️ Clear All
            </Button>
          </div>
        </div>

        <div className="table-responsive flex-grow-1 overflow-auto">
          <Table className="table-cyber align-middle text-nowrap mb-0">
            <thead>
              <tr>
                <th className="py-3 px-4 fs-6">Rank</th>
                <th className="py-3 px-4 fs-6">Driver Name</th>
                <th className="py-3 px-4 fs-6">Completed Laps</th>
                {/* <th className="py-3 px-4 fs-6">Total Race Time</th> */}
                {/* <th className="py-3 px-4 fs-6">Fastest Lap</th> */}
                <th className="py-3 px-4 fs-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard && leaderboard.length > 0 ? (
                leaderboard.map((row, idx) => {
                  const locId = row.location_id || "location_1";
                  const locTag =
                    locId === "location_1"
                      ? "Loc 1"
                      : locId === "location_2"
                        ? "Loc 2"
                        : locId;
                  const pillClass =
                    locId === "location_1"
                      ? "location-pill-loc1"
                      : "location-pill-loc2";

                  return (
                    <tr
                      key={row.entry_id || idx}
                      style={{
                        background: row.is_winner ? "#fffbeb" : "transparent",
                      }}
                    >
                      <td className="fw-bold text-warning py-3 px-4 fs-5">
                        {idx === 0
                          ? "🥇 #1"
                          : idx === 1
                            ? "🥈 #2"
                            : idx === 2
                              ? "🥉 #3"
                              : `#${idx + 1}`}
                      </td>
                      <td className="fw-bold text-dark py-3 px-4 fs-5">
                        {row.player_name || row.name} {row.is_winner && "🏆"}{" "}
                        {filterLocation === "all" && (
                          <Badge className={`ms-2 align-middle ${pillClass}`}>
                            {locTag}
                          </Badge>
                        )}
                      </td>
                      <td className="fw-bold text-primary py-3 px-4 fs-5">
                        {row.laps} Laps
                      </td>
                      {/* <td className="text-dark fw-bold py-3 px-4 fs-5" style={{ fontFamily: 'var(--font-mono)' }}>{row.total_time_str || row.time_str}</td> */}
                      {/* <td className="text-warning fw-bold py-3 px-4 fs-5" style={{ fontFamily: 'var(--font-mono)' }}>{row.fastest_lap_str || row.best_lap}</td> */}
                      <td className="py-3 px-4 text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <Button
                            variant="outline-info"
                            size="sm"
                            className="px-2 py-1 rounded-pill"
                            onClick={() => handleOpenEdit(row)}
                            title="Edit Record"
                          >
                            ✏️ Edit
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="px-2 py-1 rounded-pill"
                            onClick={() => handleDeleteRow(row)}
                            title="Delete Record"
                          >
                            🗑️ Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="text-center py-5 text-muted fw-bold fs-5"
                  >
                    No completed races found for{" "}
                    {filterLocation === "all"
                      ? "any location"
                      : filterLocation === "location_1"
                        ? "Location 1"
                        : "Location 2"}
                    . Start a race in Race Controller!
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Edit Driver Record Modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        centered
        contentClassName="modal-content-cyber"
      >
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title className="fw-bold text-white">
            ✏️ Edit Driver Record
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="text-info fw-bold">Driver Name</Form.Label>
            <Form.Control
              type="text"
              className="form-control-cyber"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="text-warning fw-bold">
              Completed Laps
            </Form.Label>
            <Form.Control
              type="number"
              min="0"
              className="form-control-cyber"
              value={editLaps}
              onChange={(e) => setEditLaps(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowEditModal(false)}
          >
            Cancel
          </Button>
          <Button variant="info" onClick={handleSaveEdit} className="fw-bold">
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { raceStateManager } from '../services/stateManager';

export function ConfigModal({ show, onClose, raceState }) {
  const [targetLaps, setTargetLaps] = useState(raceState.target_laps || 8);
  const [p1Name, setP1Name] = useState(raceState.players['1']?.name || '');
  const [p2Name, setP2Name] = useState(raceState.players['2']?.name || '');

  useEffect(() => {
    if (show) {
      setTargetLaps(raceState.target_laps || 8);
      setP1Name(raceState.players['1']?.name || '');
      setP2Name(raceState.players['2']?.name || '');
    }
  }, [show, raceState]);

  const handleSave = () => {
    const updatedPlayers = JSON.parse(JSON.stringify(raceState.players));
    if (updatedPlayers['1']) updatedPlayers['1'].name = p1Name.trim();
    if (updatedPlayers['2']) updatedPlayers['2'].name = p2Name.trim();

    raceStateManager.updateConfig(targetLaps, updatedPlayers);
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} centered contentClassName="modal-content-cyber">
      <Modal.Header closeButton closeVariant="white">
        <Modal.Title className="fw-bold text-white">⚙️ Race Configuration</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label className="text-muted">Target Laps Count</Form.Label>
          <Form.Control
            type="number"
            min="1"
            max="100"
            className="form-control-cyber"
            value={targetLaps}
            onChange={(e) => setTargetLaps(parseInt(e.target.value, 10) || 8)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="text-info">Player 1 Name (Cyan)</Form.Label>
          <Form.Control
            type="text"
            className="form-control-cyber"
            value={p1Name}
            onChange={(e) => setP1Name(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="text-danger">Player 2 Name (Pink)</Form.Label>
          <Form.Control
            type="text"
            className="form-control-cyber"
            value={p2Name}
            onChange={(e) => setP2Name(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="info" onClick={handleSave} className="fw-bold">
          Save Settings
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

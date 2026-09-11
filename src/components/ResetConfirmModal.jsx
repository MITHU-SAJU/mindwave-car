import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { raceStateManager } from '../services/stateManager';

export function ResetConfirmModal({ show, onClose, onResetConfirmed }) {
  const handleConfirm = () => {
    raceStateManager.resetRace();
    onClose();
    if (onResetConfirmed) onResetConfirmed();
  };

  return (
    <Modal show={show} onHide={onClose} centered contentClassName="modal-content-cyber">
      <Modal.Header closeButton closeVariant="white">
        <Modal.Title className="fw-bold text-danger">🔄 Confirm Race Reset</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-0">
          Are you sure you want to reset the current race? All lap counters and split times will be saved to history log and the dashboard will return to setup mode.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} className="fw-bold">
          Reset Race
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Badge, Alert } from 'react-bootstrap';
import { raceStateManager } from '../services/stateManager';
import { getSupabaseCredentials, saveSupabaseCredentials, isSupabaseConfigured } from '../services/supabase';

export function ConfigModal({ show, onClose, raceState }) {
  const [locationId, setLocationId] = useState(raceStateManager.getLocationId());
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isConnected, setIsConnected] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (show) {
      setLocationId(raceStateManager.getLocationId());
      const creds = getSupabaseCredentials();
      setSupabaseUrl(creds.url || '');
      setSupabaseKey(creds.key || '');
      setIsConnected(isSupabaseConfigured());
    }
  }, [show]);

  const handleSave = () => {
    raceStateManager.setLocationId(locationId);
    saveSupabaseCredentials(supabaseUrl, supabaseKey);
    setIsConnected(isSupabaseConfigured());
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} centered contentClassName="modal-content-cyber">
      <Modal.Header closeButton closeVariant="white">
        <Modal.Title className="fw-bold text-white">⚙️ App & Database Settings</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-4">
          <Form.Label className="text-warning fw-bold d-flex justify-content-between align-items-center">
            <span>📍 Venue Location Identity</span>
            <Badge bg={locationId === 'location_1' ? 'primary' : locationId === 'location_2' ? 'danger' : 'info'}>
              {locationId === 'location_1' ? 'Location 1' : locationId === 'location_2' ? 'Location 2' : locationId}
            </Badge>
          </Form.Label>
          <Form.Select
            className="form-control-cyber fw-bold"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="location_1">🏢 Location 1 (Track A)</option>
            <option value="location_2">🏬 Location 2 (Track B)</option>
          </Form.Select>
          <Form.Text className="text-muted small">
            All races completed on this system will be tagged and stored under this location.
          </Form.Text>
        </Form.Group>

        <hr className="my-3 border-secondary" />

        <Form.Group className="mb-3">
          <Form.Label className="text-info fw-bold d-flex justify-content-between align-items-center">
            <span>⚡ Supabase Database Connection</span>
            <Badge bg={isConnected ? 'success' : 'secondary'}>
              {isConnected ? 'CONNECTED' : 'LOCAL FALLBACK ONLY'}
            </Badge>
          </Form.Label>

          {!isConnected && (
            <Alert variant="secondary" className="p-2 small mb-3">
              Enter your Supabase URL & Anon Key to sync race history across multiple locations in real time.
            </Alert>
          )}

          <Form.Label className="small text-muted mb-1">Supabase Project URL</Form.Label>
          <Form.Control
            type="text"
            placeholder="https://your-project.supabase.co"
            className="form-control-cyber mb-3"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
          />

          <Form.Label className="small text-muted mb-1">Supabase Anon Key</Form.Label>
          <Form.Control
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="form-control-cyber"
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
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


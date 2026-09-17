import React, { useState } from 'react';
import { Navbar, Container, Button, Badge } from 'react-bootstrap';
import { raceStateManager } from '../services/stateManager';
import { ConfigModal } from './ConfigModal';

export function HeaderNavbar({
  activeView,
  setActiveView,
  formattedTime,
  isMuted,
  onToggleMute,
  onResetRace
}) {
  const [showConfig, setShowConfig] = useState(false);
  const locationId = raceStateManager.getLocationId();

  return (
    <>
      <Navbar className="navbar-custom sticky-top">
        <Container fluid className="px-2 px-md-3">
          <Navbar.Brand
            className="d-flex align-items-center gap-1 gap-md-2 me-2 me-md-0"
            onClick={() => setActiveView('control')}
            style={{ cursor: 'pointer' }}
          >
            <span style={{ fontSize: '1.5rem' }}>🧠🏎️</span>
            <div>
              <div className="brand-title-text d-flex align-items-center gap-2">
                <span>MINDWAVE RACING</span>
                <Badge bg={locationId === 'location_1' ? 'primary' : locationId === 'location_2' ? 'danger' : 'info'} className="fs-6 py-1 px-2">
                  📍 {locationId === 'location_1' ? 'Location 1' : locationId === 'location_2' ? 'Location 2' : locationId}
                </Badge>
              </div>
              <div className="d-none d-md-block" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                MULTI-LOCATION SUPABASE LEADERBOARD SYSTEM
              </div>
            </div>
          </Navbar.Brand>

          {activeView !== 'setup' && (
            <div className="d-none d-sm-flex flex-column align-items-center mx-auto">
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                TOTAL RACE TIME
              </span>
              <span className="hud-timer fs-4 fs-md-3">{formattedTime}</span>
            </div>
          )}

          <div className="d-flex align-items-center gap-1 gap-md-2 ms-auto flex-wrap">
            <Button
              variant={activeView === 'control' || activeView === 'setup' ? 'primary' : 'outline-primary'}
              size="sm"
              className="fw-bold px-2 py-1 px-md-3 py-md-2"
              onClick={() => setActiveView('control')}
            >
              🏎️<span className="d-none d-sm-inline ms-1">Controller</span>
            </Button>

            <Button
              variant={activeView === 'public' ? 'warning' : 'outline-dark'}
              size="sm"
              className="fw-bold px-2 py-1 px-md-3 py-md-2"
              onClick={() => setActiveView('public')}
            >
              🏆<span className="d-none d-sm-inline ms-1">Leaderboard</span>
            </Button>

            <Button
              variant="outline-info"
              size="sm"
              className="px-2 py-1 px-md-3 py-md-2"
              onClick={() => setShowConfig(true)}
              title="Location & Database Settings"
            >
              ⚙️
            </Button>

            <Button
              variant="outline-secondary"
              size="sm"
              className="px-2 py-1 px-md-3 py-md-2"
              onClick={onToggleMute}
            >
              {isMuted ? '🔇' : '🔊'}
            </Button>

            {activeView === 'control' && (
              <Button variant="outline-danger" size="sm" className="px-2 py-1 px-md-3 py-md-2" onClick={onResetRace}>
                🔄
              </Button>
            )}
          </div>
        </Container>
      </Navbar>

      <ConfigModal
        show={showConfig}
        onClose={() => setShowConfig(false)}
        raceState={raceStateManager.getState()}
      />
    </>
  );
}


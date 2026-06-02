'use client';

import { Clinician } from '@/types/clinician';
import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface ClinicianDetailModalProps {
  clinician: Clinician | null;
  onClose: () => void;
}

function toTitleCase(text: string): string {
  if (!text) return '';
  const conjunctions = new Set(['and', 'or', 'but', 'nor', 'for', 'yet', 'so', 'at', 'to']);
  return text
    .toLowerCase()
    .split(' ')
    .map((word, wordIndex) => {
      if (wordIndex === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      if (conjunctions.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

const geocodeCache: { [key: string]: { lat: number; lng: number } } = {};

async function geocodeAddress(address: string, city: string, state: string, zipCode: string) {
  try {
    const cacheKey = `${address}|${city}|${state}|${zipCode}`;
    if (geocodeCache[cacheKey]) return geocodeCache[cacheKey];

    const addressForGeocode = address.replace(/(,?\s*(Suite|Ste|Apt|Apartment|Unit|Bldg|Fl|#)\s*\w+)/gi, '');
    const fullAddress = `${addressForGeocode}, ${city}, ${state} ${zipCode}`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`
    );
    const data = await response.json();
    if (data && data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache[cacheKey] = result;
      return result;
    }

    const fallbackAddress = `${city}, ${state} ${zipCode}`;
    const fallbackResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackAddress)}`
    );
    const fallbackData = await fallbackResponse.json();
    if (fallbackData && fallbackData.length > 0) {
      const result = { lat: parseFloat(fallbackData[0].lat), lng: parseFloat(fallbackData[0].lon) };
      geocodeCache[cacheKey] = result;
      return result;
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#9ca3af',
  marginBottom: '0.5rem',
};

export default React.memo(function ClinicianDetailModal({ clinician, onClose }: ClinicianDetailModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const fullName = clinician
    ? `${toTitleCase(clinician.firstName)} ${clinician.middleName ? toTitleCase(clinician.middleName) + ' ' : ''}${toTitleCase(clinician.lastName)}`.trim()
    : '';

  const copyAddressToClipboard = async () => {
    if (!clinician) return;
    const parts = [clinician.address, `${toTitleCase(clinician.city)}, ${clinician.state} ${clinician.zipCode}`]
      .filter(Boolean)
      .join(', ');
    try {
      await navigator.clipboard.writeText(parts);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (clinician) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [clinician]);

  useEffect(() => {
    if (!clinician || !mapRef.current) return;
    setMapLoading(true);

    const initializeMap = async () => {
      const coords = await geocodeAddress(
        clinician.address || '',
        clinician.city,
        clinician.state,
        clinician.zipCode
      );
      const lat = coords?.lat ?? 39.8283;
      const lng = coords?.lng ?? -98.5795;
      const zoom = coords ? 15 : 3;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter([lng, lat]);
        mapInstanceRef.current.setZoom(zoom);
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = new maplibregl.Marker({ color: '#60a5fa' })
          .setLngLat([lng, lat])
          .addTo(mapInstanceRef.current);
        setMapLoading(false);
        return;
      }

      const map = new maplibregl.Map({
        container: mapRef.current as HTMLElement,
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
        center: [lng, lat],
        zoom,
        attributionControl: false,
      });

      map.on('load', () => {
        markerRef.current = new maplibregl.Marker({ color: '#60a5fa' })
          .setLngLat([lng, lat])
          .addTo(map);
        mapInstanceRef.current = map;
        setMapLoading(false);
      });
    };

    initializeMap().catch((err) => {
      console.error('Map initialization error:', err);
      setMapLoading(false);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [clinician]);

  if (!clinician) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 999,
        }}
      />

      {/* Modal Card */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#1a1a1a',
          border: '1px solid #3d3d3d',
          borderRadius: '12px',
          zIndex: 1000,
          maxWidth: '800px',
          width: '85%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #3d3d3d',
            backgroundColor: '#0a0a0a',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff' }}>
                {fullName}
              </h2>
              {clinician.credential && (
                <span
                  style={{
                    padding: '0.2rem 0.5rem',
                    backgroundColor: '#1a3a4d',
                    color: '#60a5fa',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    borderRadius: '4px',
                    border: '1px solid #2d5a73',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {clinician.credential}
                </span>
              )}
              {clinician.deactivated && (
                <span style={{ fontSize: '0.75rem', color: '#f87171' }}>(inactive)</span>
              )}
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#9ca3af' }}>
              NPI: {clinician.npi}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: '0.5rem',
            padding: '1.25rem',
          }}
        >
          {/* Left: Details */}
          <div style={{ minWidth: 0 }}>
            <div style={{ marginBottom: '1.1rem' }}>
              <h3 style={sectionLabelStyle}>Specialty</h3>
              <p style={{ margin: 0, fontSize: '1rem', color: '#f3f4f6' }}>
                {clinician.taxonomyLabel}
              </p>
            </div>

            <div style={{ marginBottom: '1.1rem' }}>
              <h3 style={sectionLabelStyle}>Phone</h3>
              <p style={{ margin: 0, fontSize: '1rem', color: '#fbbf24', fontWeight: '500' }}>
                {clinician.phone && clinician.phone !== '-' ? clinician.phone : 'Not available'}
              </p>
            </div>

            <div style={{ marginBottom: '1.1rem', position: 'relative' }}>
              {copyFeedback && (
                <div
                  style={{
                    position: 'absolute',
                    top: '0.25rem',
                    right: '0.5rem',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  {copyFeedback}
                </div>
              )}
              <h3 style={sectionLabelStyle}>Location</h3>
              <div
                onClick={copyAddressToClipboard}
                style={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background-color 0.2s ease',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2d2d2d')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {clinician.address && (
                  <p style={{ margin: '0.25rem 0', fontSize: '1rem', color: '#f3f4f6' }}>
                    {toTitleCase(clinician.address)}
                  </p>
                )}
                <p style={{ margin: '0.25rem 0', fontSize: '1rem', color: '#f3f4f6' }}>
                  {toTitleCase(clinician.city)}, {clinician.state} {clinician.zipCode}
                </p>
              </div>
            </div>

            <div>
              <h3 style={sectionLabelStyle}>NPPES Registry</h3>
              <a
                href={`https://npiregistry.cms.hhs.gov/provider-view/${clinician.npi}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '1rem', color: '#60a5fa', textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#60a5fa')}
              >
                {clinician.npi}
              </a>
            </div>
          </div>

          {/* Right: Map */}
          <div style={{ minWidth: 0 }}>
            <h3 style={sectionLabelStyle}>Location Map</h3>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
              <div
                ref={mapRef}
                style={{ width: '100%', height: '100%', border: '1px solid #3d3d3d', borderRadius: '8px' }}
              />
              {mapLoading && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid #3d3d3d',
                        borderTop: '3px solid #60a5fa',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading map...</span>
                  </div>
                </div>
              )}
              <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
              `}</style>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            backgroundColor: '#0a0a0a',
            borderTop: '1px solid #3d3d3d',
            fontSize: '0.8rem',
            color: '#6b7280',
          }}
        >
          Press ESC to close • Last updated:{' '}
          {clinician.lastUpdated ? new Date(clinician.lastUpdated).toLocaleDateString() : '—'}
        </div>
      </div>
    </>
  );
});

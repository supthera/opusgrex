'use client';

import { Agency } from '@/types/agency';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface AgencyDetailModalProps {
  agency: Agency | null;
  onClose: () => void;
}

function toTitleCase(text: string): string {
  if (!text) return '';
  
  const conjunctions = new Set(['and', 'or', 'but', 'nor', 'for', 'yet', 'so', 'at', 'to']);
  
  let result = text
    .toLowerCase()
    .split(' ')
    .map((word, wordIndex) => {
      if (wordIndex === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      if (conjunctions.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  
  const entityMap: { [key: string]: string } = {
    ' ltd.': ' Ltd.',
    ' ltd': ' Ltd.',
    ' llc': ' LLC',
    ' inc.': ' Inc.',
    ' inc': ' Inc.',
    ' corp.': ' Corp.',
    ' corp': ' Corp.',
    ' lp': ' LP',
    ' llp': ' LLP',
    ' pllc': ' PLLC',
    ' pa': ' PA',
    ' pc': ' PC',
    ' co.': ' Co.',
    ' co': ' Co.',
  };
  
  Object.entries(entityMap).forEach(([lowercase, proper]) => {
    const regex = new RegExp(lowercase + '$', 'i');
    result = result.replace(regex, proper);
  });
  
  return result;
}

// Module-level cache for fallback geocoding results
const geocodeCache: { [key: string]: { lat: number; lng: number } } = {};

// Fallback geocoding function (only used if stored coordinates missing)
async function geocodeAddress(address: string, city: string, state: string, zipCode: string) {
  try {
    // Check cache first
    const cacheKey = `${address}|${city}|${state}|${zipCode}`;
    if (geocodeCache[cacheKey]) {
      return geocodeCache[cacheKey];
    }

    // Remove suite/apt/unit from address for geocoding
    const addressForGeocode = address.replace(/(,?\s*(Suite|Ste|Apt|Apartment|Unit|#)\s*\w+)/gi, '');
    const fullAddress = `${addressForGeocode}, ${city}, ${state} ${zipCode}`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`
    );
    const data = await response.json();
    
    // If full address search returns any results, use the first one
    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      geocodeCache[cacheKey] = result;
      return result;
    }

    // Fallback: Try with just city, state, zip
    const fallbackAddress = `${city}, ${state} ${zipCode}`;
    const fallbackResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackAddress)}`
    );
    const fallbackData = await fallbackResponse.json();

    if (fallbackData && fallbackData.length > 0) {
      const result = {
        lat: parseFloat(fallbackData[0].lat),
        lng: parseFloat(fallbackData[0].lon),
      };
      geocodeCache[cacheKey] = result;
      return result;
    }

    return null;
  } catch (error) {
    console.error('Fallback geocoding error:', error);
    return null;
  }
}

export default React.memo(function AgencyDetailModal({ agency, onClose }: AgencyDetailModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showAddressTooltip, setShowAddressTooltip] = useState(false);

  const copyAddressToClipboard = async () => {
    if (!agency) return;
    const fullAddress = `${agency.address}, ${toTitleCase(agency.city)}, ${agency.state} ${agency.zipCode}`;
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const copyPhoneToClipboard = async () => {
    if (!agency?.phone) return;
    try {
      await navigator.clipboard.writeText(agency.phone);
      setCopyFeedback('Phone copied!');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      console.error('Failed to copy phone:', err);
    }
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (agency) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [agency]);

  // Initialize MapLibre map with pre-computed coordinates (or geocode as fallback)
  useEffect(() => {
    if (!agency || !mapRef.current) return;

    setMapLoading(true);

    const initializeMap = async () => {
      // Check if we have pre-computed coordinates
      let lat = agency.latitude;
      let lng = agency.longitude;

      // If coordinates missing, geocode on-demand as fallback
      if (!lat || !lng) {
        // ...existing code...
        const coords = await geocodeAddress(
          agency.address,
          agency.city,
          agency.state,
          agency.zipCode
        );
        lat = coords?.lat || 39.8283;
        lng = coords?.lng || -98.5795;
      } else {
        // Use pre-computed coordinates
        lat = agency.latitude;
        lng = agency.longitude;
      }

      // Fallback to US center if still missing
      if (!lat || !lng) {
        lat = 39.8283;
        lng = -98.5795;
      }

      // If map instance exists, update it
      if (mapInstanceRef.current) {
        // Instantly center on location without zoom animation
        mapInstanceRef.current.setCenter([lng, lat]);

        // Remove old marker
        if (markerRef.current) {
          markerRef.current.remove();
        }

        // Add new marker using MAF favicon design
        const el = document.createElement('img');
        el.src = '/MAF.png';
        el.style.width = '48px';
        el.style.height = '48px';
        el.style.cursor = 'pointer';
        el.style.display = 'block';

        markerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -8] })
          .setLngLat([lng, lat])
          .addTo(mapInstanceRef.current);

        setMapLoading(false);
        return;
      }

      // Create map with MapLibre GL
      const map = new maplibregl.Map({
        container: mapRef.current as HTMLElement,
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
        center: [lng, lat],
        zoom: 16,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
      });

      map.on('load', () => {
        // Add marker for agency using MAF favicon design
        const el = document.createElement('img');
        el.src = '/MAF.png';
        el.style.width = '48px';
        el.style.height = '48px';
        el.style.cursor = 'pointer';
        el.style.display = 'block';

        markerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -8] })
          .setLngLat([lng, lat])
          .addTo(map);

        mapInstanceRef.current = map;
        setMapLoading(false);
      });
    };

    initializeMap().catch(err => {
      console.error('Map initialization error:', err);
      setMapLoading(false);
    });

    // Cleanup on unmount
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
  }, [agency]);

  if (!agency) return null;

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#ffffff',
                }}
              >
                {toTitleCase(agency.providerName)}
              </h2>
              {agency.isVerified && (
                <Image
                  src="/VerifyBadge.png"
                  alt="Verified Agency"
                  title="This agency has been verified"
                  width={24}
                  height={24}
                  style={{
                    marginLeft: '0.5rem',
                  }}
                />
              )}
            </div>
            <p
              style={{
                margin: '0.5rem 0 0 0',
                fontSize: '0.9rem',
                color: '#9ca3af',
              }}
            >
              CCN: {agency.ccn}
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
          {/* Left: Agency Details */}
          <div style={{ minWidth: 0 }}>
            <div style={{ marginBottom: '1.1rem', position: 'relative' }}>
              {copyFeedback && (
                <div style={{
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
                  animation: 'fadeInOut 2s ease-in-out forwards'
                }}>
                  {copyFeedback}
                </div>
              )}
              <h3
                style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#9ca3af',
                  marginBottom: '0.5rem',
                }}
              >
                Location
              </h3>
              <div
                onClick={copyAddressToClipboard}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background-color 0.2s ease',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                }}
                onMouseEnter={e => {
                  setShowAddressTooltip(true);
                  e.currentTarget.style.backgroundColor = '#2d2d2d';
                }}
                onMouseLeave={e => {
                  setShowAddressTooltip(false);
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <p
                  style={{
                    margin: '0.25rem 0',
                    fontSize: '1rem',
                    color: '#f3f4f6',
                  }}
                >
                  {toTitleCase(agency.address)}
                </p>
                <p
                  style={{
                    margin: '0.25rem 0',
                    fontSize: '1rem',
                    color: '#f3f4f6',
                  }}
                >
                  {toTitleCase(agency.city)}, {agency.state} {agency.zipCode}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '1.1rem' }}>
              <h3
                style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#9ca3af',
                  marginBottom: '0.5rem',
                }}
              >
                Phone
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  color: '#fbbf24',
                  fontWeight: '500',
                }}
              >
                {agency.phone && agency.phone !== '-' ? agency.phone : 'Not available'}
              </p>
            </div>

            <div style={{ marginBottom: '1.1rem' }}>
              <h3
                style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#9ca3af',
                  marginBottom: '0.5rem',
                }}
              >
                Website
              </h3>
              {agency.verifiedWebsite ? (
                <a
                  href={agency.verifiedWebsite.startsWith('http') ? agency.verifiedWebsite : `https://${agency.verifiedWebsite}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    margin: 0,
                    fontSize: '1rem',
                    color: '#60a5fa',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#3b82f6')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#60a5fa')}
                >
                  {agency.verifiedWebsite}
                </a>
              ) : (
                <button
                  onClick={() => window.open('https://medicareagencyfinder.com/verify/', '_blank')}
                  style={{
                    padding: '0.35rem 0.65rem',
                    backgroundColor: 'transparent',
                    color: '#60a5fa',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    border: '1px solid #4d4d4d',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '0.025em',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1a3a4d';
                    e.currentTarget.style.borderColor = '#60a5fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = '#4d4d4d';
                  }}
                >
                  Verify
                </button>
              )}
            </div>

            <div style={{ marginBottom: '1.1rem' }}>
              <h3
                style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#9ca3af',
                  marginBottom: '0.5rem',
                }}
              >
                Email
              </h3>
              {agency.verifiedEmail ? (
                <a
                  href={`mailto:${agency.verifiedEmail}`}
                  style={{
                    margin: 0,
                    fontSize: '1rem',
                    color: '#60a5fa',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#3b82f6')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#60a5fa')}
                >
                  {agency.verifiedEmail}
                </a>
              ) : (
                <button
                  onClick={() => window.open('https://medicareagencyfinder.com/verify/', '_blank')}
                  style={{
                    padding: '0.35rem 0.65rem',
                    backgroundColor: 'transparent',
                    color: '#60a5fa',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    border: '1px solid #4d4d4d',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '0.025em',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1a3a4d';
                    e.currentTarget.style.borderColor = '#60a5fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = '#4d4d4d';
                  }}
                >
                  Verify
                </button>
              )}
            </div>

            <div style={{ marginBottom: '1.1rem' }}>
              <h3
                style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#9ca3af',
                  marginBottom: '0.5rem',
                }}
              >
                Services Offered
              </h3>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.25rem',
                }}
              >
                {agency.nursingCare && (
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#475569',
                      color: '#cbd5e1',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #64748b',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    RN
                  </span>
                )}
                {agency.physicalTherapy && (
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#475569',
                      color: '#cbd5e1',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #64748b',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    PT
                  </span>
                )}
                {agency.occupationalTherapy && (
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#475569',
                      color: '#cbd5e1',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #64748b',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    OT
                  </span>
                )}
                {agency.speechPathology && (
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#475569',
                      color: '#cbd5e1',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #64748b',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    SLP
                  </span>
                )}
                {agency.medicalSocial && (
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#475569',
                      color: '#cbd5e1',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #64748b',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    SW
                  </span>
                )}
                {agency.homeHealthAide && (
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#475569',
                      color: '#cbd5e1',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #64748b',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    HHA
                  </span>
                )}
              </div>
            </div>

            {agency.qualityRating && (
              <div>
                <h3
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#9ca3af',
                    marginBottom: '0.5rem',
                  }}
                >
                  Quality Rating
                </h3>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      color: '#fbbf24',
                    }}
                  >
                    {agency.qualityRating}
                  </span>
                  <span style={{ color: '#fbbf24', fontSize: '0.9rem' }}>★</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: MapLibre Map */}
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                fontSize: '0.85rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#9ca3af',
                marginBottom: '0.5rem',
              }}
            >
              Location Map
            </h3>
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1 / 1',
              }}
            >
              <div
                ref={mapRef}
                style={{
                  width: '100%',
                  height: '100%',
                  border: '1px solid #3d3d3d',
                  borderRadius: '8px',
                }}
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
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
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
                    <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                      Loading map...
                    </span>
                  </div>
                </div>
              )}
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
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
          Press ESC to close • Last updated: {new Date(agency.lastUpdated).toLocaleDateString()}
        </div>
      </div>
    </>
  );
});

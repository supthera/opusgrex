'use client';

import dynamic from 'next/dynamic';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Clinician } from '@/types/clinician';

const ClinicianDetailModal = dynamic(() => import('./ClinicianDetailModal'), {
  loading: () => null,
  ssr: false,
});

interface ClinicianTableProps {
  clinicians: Clinician[];
  selectedSpecialty?: string;
  onSpecialtyChange?: (specialty: string) => void;
  onFilteredCountChange?: (count: number) => void;
}

const INITIAL_BATCH_SIZE = 50;
const LOAD_MORE_BATCH_SIZE = 50;

// Convert text to title case (first letter of each word uppercase).
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

const GRID_COLUMNS = '1fr 1.35fr 0.95fr 1.15fr 1.55fr';

export default React.memo(function ClinicianTable({
  clinicians,
  selectedSpecialty,
  onSpecialtyChange,
  onFilteredCountChange,
}: ClinicianTableProps) {
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(INITIAL_BATCH_SIZE);
  const [selectedClinician, setSelectedClinician] = useState<Clinician | null>(null);
  const [localSelectedSpecialty, setLocalSelectedSpecialty] = useState('');
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const activeSpecialty = selectedSpecialty ?? localSelectedSpecialty;

  const specialtyOptions = useMemo(() => {
    const specialties = new Set(clinicians.map((c) => c.taxonomyLabel).filter(Boolean));
    return Array.from(specialties).sort((a, b) => a.localeCompare(b));
  }, [clinicians]);

  const cliniciansBySpecialty = useMemo(() => {
    if (!activeSpecialty) return clinicians;
    return clinicians.filter((c) => c.taxonomyLabel === activeSpecialty);
  }, [clinicians, activeSpecialty]);

  const uniqueCities = useMemo(() => {
    const cities = new Set(cliniciansBySpecialty.map((c) => c.city));
    return Array.from(cities).sort((a, b) => a.localeCompare(b));
  }, [cliniciansBySpecialty]);

  const filteredCities = useMemo(() => {
    if (!searchInput.trim()) return [];
    const searchLower = searchInput.toLowerCase();
    return uniqueCities
      .filter((city) => city.toLowerCase().startsWith(searchLower))
      .slice(0, 8);
  }, [searchInput, uniqueCities]);

  const sortedClinicians = useMemo(() => {
    const source = selectedCity
      ? cliniciansBySpecialty.filter((c) => c.city === selectedCity)
      : cliniciansBySpecialty;
    if (source.length > 1) {
      return [...source].sort(
        (a, b) =>
          a.city.localeCompare(b.city) ||
          a.taxonomyLabel.localeCompare(b.taxonomyLabel) ||
          a.lastName.localeCompare(b.lastName) ||
          a.firstName.localeCompare(b.firstName)
      );
    }
    return source;
  }, [cliniciansBySpecialty, selectedCity]);

  useEffect(() => {
    setDisplayCount(INITIAL_BATCH_SIZE);
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTop = 0;
    }
  }, [selectedCity, activeSpecialty]);

  useEffect(() => {
    onFilteredCountChange?.(sortedClinicians.length);
  }, [sortedClinicians.length, onFilteredCountChange]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < sortedClinicians.length) {
          setDisplayCount((prev) =>
            Math.min(prev + LOAD_MORE_BATCH_SIZE, sortedClinicians.length)
          );
        }
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => observer.disconnect();
  }, [displayCount, sortedClinicians.length]);

  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    setSearchInput(toTitleCase(city));
    setShowSuggestions(false);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSelectedCity(null);
    setShowSuggestions(false);
  };

  const handleSpecialtyChange = (value: string) => {
    if (onSpecialtyChange) {
      onSpecialtyChange(value);
    } else {
      setLocalSelectedSpecialty(value);
    }
    setSelectedCity(null);
    setSearchInput('');
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayedClinicians = useMemo(
    () => sortedClinicians.slice(0, displayCount),
    [sortedClinicians, displayCount]
  );

  const hasMore = displayCount < sortedClinicians.length;

  if (clinicians.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 w-full">
        <span className="mx-auto text-center w-full">No clinicians found for this state.</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: '#3d3d3d',
        borderWidth: '1px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '500px',
      }}
    >
      {/* Header with Search */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: GRID_COLUMNS,
          gap: '1rem',
          padding: '0.75rem 1rem',
          paddingRight: 'calc(1rem + 8px)',
          backgroundColor: '#2A2929',
          borderBottomWidth: '1px',
          borderBottomColor: '#3d3d3d',
          fontWeight: '600',
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          flexShrink: 0,
          alignItems: 'center',
        }}
      >
        {/* City Header with Search */}
        <div style={{ position: 'relative' }} ref={searchContainerRef}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setShowSuggestions(true);
                setSelectedCity(null);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="search by city..."
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: '#1a1a1a',
                border: '1px solid #4d4d4d',
                color: '#e5e7eb',
                borderRadius: '4px',
                width: '140px',
                outline: 'none',
              }}
              className="placeholder-gray-500"
            />
            {searchInput && (
              <button
                onClick={handleClearSearch}
                style={{
                  fontSize: '0.65rem',
                  padding: '0.2rem 0.4rem',
                  backgroundColor: '#4d4d4d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {showSuggestions && filteredCities.length > 0 && (
            <div
              ref={suggestionsRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                backgroundColor: '#1a1a1a',
                border: '1px solid #4d4d4d',
                borderRadius: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 20,
                marginTop: '0.25rem',
                minWidth: '150px',
                textTransform: 'none',
              }}
            >
              {filteredCities.map((city) => (
                <div
                  key={city}
                  onClick={() => handleSelectCity(city)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    color: '#e5e7eb',
                    borderBottom: '1px solid #2d2d2d',
                    backgroundColor: selectedCity === city ? '#3d3d3d' : 'transparent',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#3d3d3d';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      selectedCity === city ? '#3d3d3d' : 'transparent';
                  }}
                >
                  {toTitleCase(city)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ whiteSpace: 'nowrap' }}>Provider Name</div>
        <div style={{ textAlign: 'center' }}>Phone</div>
        <div>
          <select
            value={activeSpecialty}
            onChange={(e) => handleSpecialtyChange(e.target.value)}
            style={{
              fontSize: '0.75rem',
              padding: '0.2rem 0.35rem',
              backgroundColor: '#1a1a1a',
              border: '1px solid #4d4d4d',
              color: '#e5e7eb',
              borderRadius: '4px',
              width: '100%',
              maxWidth: '180px',
              outline: 'none',
              textTransform: 'none',
            }}
            title="Filter by specialty"
          >
            <option value="">All specialties</option>
            {specialtyOptions.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>
        </div>
        <div>Address</div>
      </div>

      {/* Rows - scrollable container */}
      <div style={{ flex: 1, overflowY: 'auto' }} ref={tableScrollRef} className="agency-table-scroll">
        {sortedClinicians.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
            {activeSpecialty
              ? `No ${activeSpecialty} clinicians found${selectedCity ? ` for "${selectedCity}"` : ''}.`
              : `No clinicians found for "${selectedCity}"`}
          </div>
        ) : (
          <>
            {displayedClinicians.map((clinician, index) => (
              <div
                key={clinician.npi || index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: GRID_COLUMNS,
                  gap: '1rem',
                  padding: '0.75rem 1rem',
                  paddingRight: 'calc(1rem + 8px)',
                  borderBottom: '1px solid #3d3d3d',
                  alignItems: 'center',
                  backgroundColor: index % 2 === 0 ? '#1a1a1a' : '#222222',
                }}
              >
                {/* City */}
                <div className="truncate" style={{ fontSize: '1.0625rem', textAlign: 'center', color: '#f3f4f6' }}>
                  {toTitleCase(clinician.city)}
                </div>

                {/* Provider Name - opens detail modal */}
                <button
                  onClick={() => setSelectedClinician(clinician)}
                  className="truncate"
                  style={{
                    fontSize: '1.0625rem',
                    color: '#60a5fa',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontFamily: 'inherit',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#60a5fa')}
                >
                  {toTitleCase(clinician.lastName)}, {toTitleCase(clinician.firstName)}
                  {clinician.deactivated && (
                    <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: '#f87171' }}>
                      (inactive)
                    </span>
                  )}
                </button>

                {/* Phone */}
                <div className="truncate" style={{ fontSize: '1rem', textAlign: 'center', color: '#fbbf24' }}>
                  {clinician.phone && clinician.phone !== '-' ? clinician.phone : ''}
                </div>

                {/* Specialty */}
                <div className="truncate" style={{ fontSize: '1.0625rem', color: '#9ca3af' }}>
                  {clinician.taxonomyLabel}
                </div>

                {/* Address */}
                <div className="truncate" style={{ fontSize: '1rem', color: '#9ca3af' }}>
                  {toTitleCase(clinician.address || '')}
                </div>
              </div>
            ))}

            {hasMore && (
              <div ref={loadMoreRef} style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
                Loading more clinicians...
              </div>
            )}
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .agency-table-scroll {
          scrollbar-width: none;
        }
        .agency-table-scroll::-webkit-scrollbar {
          display: none;
        }
      `}} />
      {selectedClinician && (
        <ClinicianDetailModal
          clinician={selectedClinician}
          onClose={() => setSelectedClinician(null)}
        />
      )}
    </div>
  );
});

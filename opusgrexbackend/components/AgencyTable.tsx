'use client';

import dynamic from 'next/dynamic';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Agency } from '@/types/agency';

// Dynamic import with no loading fallback - modal has internal loading state
const AgencyDetailModal = dynamic(
  () => import('./AgencyDetailModal'),
  { 
    loading: () => null,
    ssr: false
  }
);

interface AgencyTableProps {
  agencies: Agency[];
  showServices?: boolean;
}

const INITIAL_BATCH_SIZE = 50;
const LOAD_MORE_BATCH_SIZE = 50;

// Convert text to title case (first letter of each word uppercase)
// Also formats entity suffixes properly (Ltd, LLC, Inc, etc.)
// Does not capitalize coordinating conjunctions (and, or, but, nor, for, yet, so, at, to)
function toTitleCase(text: string): string {
  if (!text) return '';
  
  // Coordinating conjunctions that should not be capitalized (except first word)
  const conjunctions = new Set(['and', 'or', 'but', 'nor', 'for', 'yet', 'so', 'at', 'to']);
  
  // Split by spaces and capitalize first letter of each word
  let result = text
    .toLowerCase()
    .split(' ')
    .map((word, wordIndex, wordsArray) => {
      // Always capitalize first word, regardless of what it is
      if (wordIndex === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // For other words, check if they're conjunctions
      if (conjunctions.has(word)) {
        return word; // Keep lowercase
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  
  // Map of common entity suffixes to their proper format
  // Include both with and without periods
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
  
  // Replace entity suffixes with proper formatting
  Object.entries(entityMap).forEach(([lowercase, proper]) => {
    const regex = new RegExp(lowercase + '$', 'i');
    result = result.replace(regex, proper);
  });
  
  return result;
}

export default React.memo(function AgencyTable({ agencies, showServices = false }: AgencyTableProps) {
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(INITIAL_BATCH_SIZE);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Extract unique cities and sort alphabetically
  const uniqueCities = useMemo(() => {
    const cities = new Set(agencies.map(a => a.city));
    return Array.from(cities).sort((a, b) => a.localeCompare(b));
  }, [agencies]);

  // Filter cities based on search input - debounced
  const filteredCities = useMemo(() => {
    if (!searchInput.trim()) return [];
    const searchLower = searchInput.toLowerCase();
    // Use filter + slice directly to reduce allocations
    return uniqueCities.filter(city =>
      city.toLowerCase().startsWith(searchLower)
    ).slice(0, 8); // Show max 8 suggestions
  }, [searchInput, uniqueCities]);

  // Filter agencies based on selected city - optimized with early exit
  const sortedAgencies = useMemo(() => {
    const source = selectedCity 
      ? agencies.filter(a => a.city === selectedCity)
      : agencies;
    
    // Sort in place if necessary, otherwise return as-is for same city
    if (source.length > 1) {
      return [...source].sort((a, b) => a.city.localeCompare(b.city));
    }
    return source;
  }, [agencies, selectedCity]);

  // Reset display count and scroll when city changes
  useEffect(() => {
    setDisplayCount(INITIAL_BATCH_SIZE);
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTop = 0;
    }
  }, [selectedCity]);

  // Set up Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && displayCount < sortedAgencies.length) {
          setDisplayCount(prev => Math.min(prev + LOAD_MORE_BATCH_SIZE, sortedAgencies.length));
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [displayCount, sortedAgencies.length]);

  // Handle city selection
  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    setSearchInput(toTitleCase(city));
    setShowSuggestions(false);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchInput('');
    setSelectedCity(null);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only close if click is outside BOTH the search container and suggestions
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

  // Get only the agencies to display (based on displayCount)
  const displayedAgencies = useMemo(() => {
    return sortedAgencies.slice(0, displayCount);
  }, [sortedAgencies, displayCount]);

  const hasMoreAgencies = displayCount < sortedAgencies.length;

  if (agencies.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 w-full">
        <span className="mx-auto text-center w-full">No agencies found for this state.</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#3d3d3d', borderWidth: '1px', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
      {/* Header with Search */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showServices ? '0.8fr 1.8fr 1fr 2fr 1.2fr 0.4fr' : '0.8fr 1.8fr 1fr 2fr 0.4fr',
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

          {/* Suggestions Dropdown */}
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
                    (e.currentTarget as HTMLElement).style.backgroundColor = selectedCity === city ? '#3d3d3d' : 'transparent';
                  }}
                >
                  {toTitleCase(city)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ whiteSpace: 'nowrap' }}>Provider Name</div>
        <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '1.3rem' }}>Phone</div>
        <div>Address</div>
        {showServices && <div>Services</div>}
        <div style={{ textAlign: 'center' }}>Rating</div>
      </div>

      {/* Rows - scrollable container */}
      <div style={{ flex: 1, overflowY: 'auto' }} ref={tableScrollRef} className="agency-table-scroll">
        {sortedAgencies.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
            No agencies found for &quot;{selectedCity}&quot;
          </div>
        ) : (
          <>
            {displayedAgencies.map((agency, index) => {
              // Create Google Maps URL with agency address
              const mapsQuery = encodeURIComponent(`${agency.address}, ${agency.city}, ${agency.state} ${agency.zipCode}`);
              const mapsUrl = `https://www.google.com/maps/search/${mapsQuery}`;
              
              return (
              <div
                key={agency.ccn || index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: showServices ? '0.8fr 1.8fr 1fr 2fr 1.2fr 0.4fr' : '0.8fr 1.8fr 1fr 2fr 0.4fr',
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
                  {toTitleCase(agency.city)}
                </div>

                {/* Provider Name - as Link */}
                <button
                  onClick={() => setSelectedAgency(agency)}
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
                  {toTitleCase(agency.providerName)}
                </button>

                {/* Phone */}
                <div className="truncate" style={{ fontSize: '1.0625rem', textAlign: 'center', color: '#fbbf24' }}>
                  {(agency.phone && agency.phone !== '-') ? agency.phone : ''}
                </div>

                {/* Address */}
                <div className="truncate" style={{ fontSize: '1.0625rem', color: '#9ca3af' }}>
                  {toTitleCase(agency.address || '')}
                </div>

                {/* Services */}
                {showServices && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                  {agency.nursingCare && <span style={{ padding: '0.15rem 0.35rem', backgroundColor: '#475569', color: '#cbd5e1', fontSize: '0.65rem', borderRadius: '3px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>RN</span>}
                  {agency.physicalTherapy && <span style={{ padding: '0.15rem 0.35rem', backgroundColor: '#475569', color: '#cbd5e1', fontSize: '0.65rem', borderRadius: '3px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>PT</span>}
                  {agency.occupationalTherapy && <span style={{ padding: '0.15rem 0.35rem', backgroundColor: '#475569', color: '#cbd5e1', fontSize: '0.65rem', borderRadius: '3px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>OT</span>}
                  {agency.speechPathology && <span style={{ padding: '0.15rem 0.35rem', backgroundColor: '#475569', color: '#cbd5e1', fontSize: '0.65rem', borderRadius: '3px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>SLP</span>}
                  {agency.medicalSocial && <span style={{ padding: '0.15rem 0.35rem', backgroundColor: '#475569', color: '#cbd5e1', fontSize: '0.65rem', borderRadius: '3px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>SW</span>}
                  {agency.homeHealthAide && <span style={{ padding: '0.15rem 0.35rem', backgroundColor: '#475569', color: '#cbd5e1', fontSize: '0.65rem', borderRadius: '3px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>HHA</span>}
                </div>
                )}

                {/* Quality Rating */}
                <div className="text-sm text-gray-300 text-center" style={{ fontSize: '1rem' }}>
                  {agency.qualityRating ? (
                    <div className="flex items-center justify-center">
                      <span className="font-semibold text-yellow-400">
                        {agency.qualityRating}
                      </span>
                      <span className="ml-1 text-yellow-400">★</span>
                    </div>
                  ) : null}
                </div>
              </div>
              );
            })}

            {/* Load More Sentinel */}
            {hasMoreAgencies && (
              <div ref={loadMoreRef} style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
                Loading more agencies...
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Scoped scrollbar styling for agency table - hidden for clean design */}
      <style dangerouslySetInnerHTML={{__html: `
        .agency-table-scroll {
          scrollbar-width: none;
        }
        .agency-table-scroll::-webkit-scrollbar {
          display: none;
        }
      `}} />
      {selectedAgency && (
        <AgencyDetailModal
          agency={selectedAgency}
          onClose={() => setSelectedAgency(null)}
        />
      )}
    </div>
  );
});

'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState, useRef, useEffect } from 'react';
import { Agency } from '@/types/agency';
import { getCityGroupItemListSchema } from '@/lib/citySchemas';

// Dynamic import with no loading fallback - modal has internal loading state
const AgencyDetailModal = dynamic(
  () => import('./AgencyDetailModal'),
  { 
    loading: () => null,
    ssr: false
  }
);

interface StatePageContentProps {
  agencies: Agency[];
  stateName: string;
  stateCode?: string;
}

// Convert text to title case
function toTitleCase(text: string): string {
  if (!text) return '';
  
  const conjunctions = new Set(['and', 'or', 'but', 'nor', 'for', 'yet', 'so', 'at', 'to']);
  
  let result = text
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (word === text.toLowerCase().split(' ')[0]) {
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

export default function StatePageContent({ agencies, stateName }: StatePageContentProps) {
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // Extract unique cities and sort alphabetically
  const uniqueCities = useMemo(() => {
    const cities = new Set(agencies.map(a => a.city));
    return Array.from(cities).sort((a, b) => a.localeCompare(b));
  }, [agencies]);

  // Filter cities based on search input
  const filteredCities = useMemo(() => {
    if (!searchInput.trim()) return [];
    return uniqueCities.filter(city =>
      city.toLowerCase().startsWith(searchInput.toLowerCase())
    ).slice(0, 8);
  }, [searchInput, uniqueCities]);

  // Filter agencies based on selected city
  const sortedAgencies = useMemo(() => {
    let filtered = [...agencies];
    
    if (selectedCity) {
      filtered = filtered.filter(a => a.city === selectedCity);
    }
    
    return filtered.sort((a, b) => a.city.localeCompare(b.city));
  }, [agencies, selectedCity]);

  // Handle city selection
  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    setSearchInput(city);
    setShowSuggestions(false);
    
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTop = 0;
    }
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

  return (
    <>
      {/* SCHEMAS: City ItemLists for each city with agencies */}
      {uniqueCities.map((city) => {
        const cityAgencies = agencies.filter(a => a.city === city);
        const stateCode = agencies[0]?.state || 'US';
        return (
          <script
            key={`schema-${city}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(
                getCityGroupItemListSchema(cityAgencies, city, stateCode, stateName)
              )
            }}
          />
        );
      })}

      <>
      {/* State Page Table - Without Services Column */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#3d3d3d', borderWidth: '1px', display: 'flex', flexDirection: 'column', maxHeight: '450px' }}>
        {/* Header with Search */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 2.5fr 1fr 0.6fr',
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
          <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>Phone</div>
          <div style={{ textAlign: 'center' }}>Rating</div>
        </div>

        {/* Rows - scrollable container */}
        <div style={{ flex: 1, overflowY: 'auto' }} ref={tableScrollRef} className="agency-scroll">
          {sortedAgencies.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
              No agencies found{selectedCity ? ` for "${selectedCity}"` : ''}
            </div>
          ) : (
            sortedAgencies.map((agency, index) => {
              return (
              <div
                key={agency.ccn || index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 2.5fr 1fr 0.6fr',
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

                {/* Provider Name - as Button */}
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
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#60a5fa')}
                >
                  {toTitleCase(agency.providerName)}
                </button>

                {/* Phone */}
                <div className="truncate" style={{ fontSize: '1.0625rem', textAlign: 'left', color: '#fbbf24' }}>
                  {(agency.phone && agency.phone !== '-') ? agency.phone : ''}
                </div>

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
            })
          )}
        </div>
      </div>
      {/* Scoped scrollbar styling for agency table - hidden for clean design */}
      <style dangerouslySetInnerHTML={{__html: `
        .agency-scroll {
          scrollbar-width: none;
        }
        .agency-scroll::-webkit-scrollbar {
          display: none;
        }
      `}} />
      
      {selectedAgency && (
        <AgencyDetailModal
          agency={selectedAgency}
          onClose={() => setSelectedAgency(null)}
        />
      )}
      </>
    </>
  );
}

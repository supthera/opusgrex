"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import InteractiveUSMap from './InteractiveUSMap';
import { US_STATES } from '@/types/agency';
import { trackStateSelection } from '@/lib/analytics';
import { useMobileDetection } from '@/mobile/hooks/useMobileDetection';

interface MapDashboardPanelProps {
  onStateClick?: (stateCode: string | null) => void;
  expandedStates?: Set<string>;
  selectedSpecialty?: string;
  onSpecialtyChange?: (specialty: string) => void;
}

// Default dimensions for each panel - PERMANENTLY SET BY USER
const DEFAULT_DIMENSIONS = {
  mainPanelHeight: 742,
  mainPanelWidth: 1200,
  mapPanelHeight: 600,
  mapPanelWidth: 848,
  sidebarHeight: 739,
  sidebarWidth: 230,
};

// Helper function to load saved dimensions from localStorage with defaults
const getSavedDimension = (key: string): number => {
  if (typeof window === 'undefined') return DEFAULT_DIMENSIONS[key as keyof typeof DEFAULT_DIMENSIONS] || 400;
  const saved = localStorage.getItem(key);
  return saved ? Number(saved) : DEFAULT_DIMENSIONS[key as keyof typeof DEFAULT_DIMENSIONS] || 400;
};

// Map state codes to flag filenames
function getStateFlagName(stateCode: string): string {
  const flagNameMap: { [key: string]: string } = {
    'AL': 'Alabama',
    'AK': 'Alaska',
    'AZ': 'Arizona',
    'AR': 'Arkansas',
    'CA': 'California',
    'CO': 'Colorado_designed_by_Andrew_Carlisle_Carson',
    'CT': 'Connecticut',
    'DE': 'Delaware',
    'FL': 'Florida',
    'GA': 'Georgia_(U.S._state)',
    'HI': 'Hawaii',
    'ID': 'Idaho',
    'IL': 'Illinois',
    'IN': 'Indiana',
    'IA': 'Iowa',
    'KS': 'Kansas',
    'KY': 'Kentucky',
    'LA': 'Louisiana',
    'ME': 'Maine',
    'MD': 'Maryland',
    'MA': 'Massachusetts',
    'MI': 'Michigan',
    'MN': 'Minnesota',
    'MS': 'Mississippi',
    'MO': 'Missouri',
    'MT': 'Montana',
    'NE': 'Nebraska',
    'NV': 'Nevada',
    'NH': 'New_Hampshire',
    'NJ': 'New_Jersey',
    'NM': 'New_Mexico',
    'NY': 'New_York',
    'NC': 'North_Carolina',
    'ND': 'North_Dakota',
    'OH': 'Ohio',
    'OK': 'Oklahoma',
    'OR': 'Oregon',
    'PA': 'Pennsylvania',
    'RI': 'Rhode_Island',
    'SC': 'South_Carolina',
    'SD': 'South_Dakota',
    'TN': 'Tennessee',
    'TX': 'Texas',
    'UT': 'Utah',
    'VT': 'Vermont',
    'VA': 'Virginia',
    'WA': 'Washington',
    'WV': 'West_Virginia',
    'WI': 'Wisconsin',
    'WY': 'Wyoming',
    'DC': 'the_District_of_Columbia',
    'PR': 'Puerto_Rico',
    'VI': 'the_United_States_Virgin_Islands',
    'GU': 'Guam',
    'AS': 'American_Samoa',
    'MP': 'the_Northern_Mariana_Islands',
  };
  return flagNameMap[stateCode] || stateCode;
}

const metricFlagStyle: React.CSSProperties = {
  position: 'absolute',
  top: '0.5rem',
  right: '0.5rem',
  height: '28px',
  width: '47px',
  borderRadius: '2px',
  border: 'none',
  outline: 'none',
  boxShadow: 'none',
};

export default React.memo(function MapDashboardPanel({
  onStateClick,
  expandedStates,
  selectedSpecialty = '',
  onSpecialtyChange,
}: MapDashboardPanelProps) {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const isMobileOrTablet = useMobileDetection();
  const [isPortrait, setIsPortrait] = useState(false);

  // Detect portrait orientation on mobile
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkOrientation();
    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('resize', checkOrientation);

    return () => {
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('resize', checkOrientation);
    };
  }, []);

  const [panelHeight, setPanelHeight] = useState<number>(DEFAULT_DIMENSIONS.mainPanelHeight);
  const [panelWidth, setPanelWidth] = useState<number>(DEFAULT_DIMENSIONS.mainPanelWidth);
  const [mapPanelHeight, setMapPanelHeight] = useState<number>(DEFAULT_DIMENSIONS.mapPanelHeight);
  const [mapPanelWidth, setMapPanelWidth] = useState<number>(DEFAULT_DIMENSIONS.mapPanelWidth);
  const [sidebarHeight, setSidebarHeight] = useState<number>(DEFAULT_DIMENSIONS.sidebarHeight);
  const [sidebarWidth, setSidebarWidth] = useState<number>(DEFAULT_DIMENSIONS.sidebarWidth);

  // Load from localStorage and set hydration flag
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMainHeight = localStorage.getItem('mainPanelHeight');
      const savedMainWidth = localStorage.getItem('mainPanelWidth');
      const savedMapHeight = localStorage.getItem('mapPanelHeight');
      const savedMapWidth = localStorage.getItem('mapPanelWidth');
      const savedSidebarHeight = localStorage.getItem('sidebarHeight');
      const savedSidebarWidth = localStorage.getItem('sidebarWidth');
      
      if (savedMainHeight) setPanelHeight(Number(savedMainHeight));
      if (savedMainWidth) setPanelWidth(Number(savedMainWidth));
      if (savedMapHeight) setMapPanelHeight(Number(savedMapHeight));
      if (savedMapWidth) setMapPanelWidth(Number(savedMapWidth));
      if (savedSidebarHeight) setSidebarHeight(Number(savedSidebarHeight));
      if (savedSidebarWidth) setSidebarWidth(Number(savedSidebarWidth));
      
      setIsHydrated(true);
    }
  }, []);

  // Prevent page scrolling only when the user is at the top-level map view.
  // Keep scrolling enabled while a state is selected/expanding so the
  // programmatic scroll-to-panel can complete before any lock is applied.
  useEffect(() => {
    // Don't apply scroll lock until hydration is complete
    if (!isHydrated) return;

    const hasExpandedState = expandedStates && expandedStates.size > 0;
    const hasActiveSelection = Boolean(selectedState);

    if (hasExpandedState || hasActiveSelection) {
      // Allow scrolling when state panels are expanded
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      return;
    }

    // Immediately reset scroll to top
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Lock scrolling when no state panels expanded
    const preventScroll = (e: WheelEvent | TouchEvent) => {
      e.preventDefault();
      // Force back to top on any scroll attempt
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    window.addEventListener('wheel', preventScroll as EventListener, { passive: false });
    window.addEventListener('touchmove', preventScroll as EventListener, { passive: false });
    
    return () => {
      window.removeEventListener('wheel', preventScroll as EventListener);
      window.removeEventListener('touchmove', preventScroll as EventListener);
    };
  }, [expandedStates, isHydrated, selectedState]);

  // Ref for audio element
  const deselectAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const mainPanelRef = React.useRef<HTMLDivElement | null>(null);
  const mapPanelRef = React.useRef<HTMLDivElement | null>(null);
  const sidebarRef = React.useRef<HTMLAnchorElement | null>(null);

  const handleStateClick = (stateCode: string) => {
    if (selectedState === stateCode) {
      // Deselect if clicking same state
      setSelectedState(null);
      if (onStateClick) {
        onStateClick(null);  // Pass null to parent to indicate deselection
      }
      // Play deselect sound
      if (deselectAudioRef.current) {
        deselectAudioRef.current.volume = 0.25; // Set volume to 25%
        deselectAudioRef.current.currentTime = 0;
        deselectAudioRef.current.play();
      }
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Select new state - instant response
      setSelectedState(stateCode);
      if (onStateClick) {
        onStateClick(stateCode);
      }
      // Track state selection asynchronously (defer to not block UI)
      const stateName = US_STATES[stateCode];
      if (stateName) {
        setTimeout(() => {
          trackStateSelection(stateCode, stateName);
        }, 0);
      }
    }
  };

  const handleStateHover = (stateCode: string | null) => {
    setHoveredState(stateCode);
  };

  // Determine if we should show the selected state
  // Only show if: hovering, OR (selected AND expanded)
  const isSelectedStateExpanded = selectedState && expandedStates?.has(selectedState);
  const shouldShowSelected = !hoveredState && isSelectedStateExpanded;
  
  const displayState = hoveredState || (shouldShowSelected ? selectedState : null);
  const stateName = displayState ? US_STATES[displayState] : null;

  // Load clinician counts from static JSON files
  const [countsByState, setCountsByState] = useState<{ [state: string]: number }>({});
  const [specialtyCountsByState, setSpecialtyCountsByState] = useState<Record<string, Record<string, number>>>({});
  const [nationalSpecialtyCounts, setNationalSpecialtyCounts] = useState<Record<string, number>>({});
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);
  const [totalClinicians, setTotalClinicians] = useState<number | null>(null);
  const [loadingCounts, setLoadingCounts] = useState<boolean>(true);
  const [lastModified, setLastModified] = useState<string | null>(null);

  React.useEffect(() => {
    async function loadClinicianCounts() {
      try {
        setLoadingCounts(true);

        // Load stateStats.json from public folder (shape: { meta, states })
        const res = await fetch('/data/stateStats.json');
        if (!res.ok) throw new Error('Failed to load stateStats');
        const stateStats = await res.json();

        // Extract last modified date from meta
        const lastUpdatedStr = stateStats.meta?.lastUpdated;
        if (lastUpdatedStr) {
          const date = new Date(lastUpdatedStr);
          const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          setLastModified(formattedDate);
        }

        // Extract clinician counts by state
        const counts: { [state: string]: number } = {};
        const specialtyByState: Record<string, Record<string, number>> = {};
        const nationalBySpecialty: Record<string, number> = {};
        const specialtySet = new Set<string>();
        const states = stateStats.states || {};
        Object.entries(states).forEach(([stateCode, stateData]: [string, any]) => {
          if (typeof stateData.totalClinicians === 'number') {
            counts[stateCode] = stateData.totalClinicians;
          }
          const byTaxonomy = (stateData.byTaxonomy || {}) as Record<string, number>;
          specialtyByState[stateCode] = byTaxonomy;
          Object.entries(byTaxonomy).forEach(([specialty, count]) => {
            specialtySet.add(specialty);
            nationalBySpecialty[specialty] = (nationalBySpecialty[specialty] || 0) + (count || 0);
          });
        });

        setCountsByState(counts);
        setSpecialtyCountsByState(specialtyByState);
        setNationalSpecialtyCounts(nationalBySpecialty);
        setSpecialtyOptions(Array.from(specialtySet).sort((a, b) => a.localeCompare(b)));
        setTotalClinicians(
          typeof stateStats.meta?.totalClinicians === 'number'
            ? stateStats.meta.totalClinicians
            : Object.values(counts).reduce((sum, n) => sum + n, 0)
        );
      } catch (err) {
        setCountsByState({});
        setTotalClinicians(null);
        console.log('Error loading clinician counts:', err);
      } finally {
        setLoadingCounts(false);
      }
    }
    loadClinicianCounts();
  }, []);

  const selectedStateTotal = displayState
    ? (selectedSpecialty
      ? (specialtyCountsByState[displayState]?.[selectedSpecialty] ?? 0)
      : (countsByState[displayState] ?? 0))
    : null;

  const nationalTotal = selectedSpecialty
    ? (nationalSpecialtyCounts[selectedSpecialty] ?? 0)
    : totalClinicians;

  return (
    <div className="map-dashboard-page">
      {/* Audio element for deselect sound */}
      <audio ref={deselectAudioRef} src="/Deselect_Tap_for_state_TAC.mp3" preload="auto" />
      
      {/* MAIN PANEL: Encompasses both Map Panel and Dashboard Sidebar */}
      <div 
        ref={mainPanelRef}
        className="map-dashboard-panel" 
        style={{ 
          position: 'relative',
          gridTemplateColumns: isMobileOrTablet && isPortrait ? '1fr' : `1fr ${sidebarWidth}px`
        }}
      >
        
        {/* MAP PANEL: Left section with interactive map */}
        <div className="map-dashboard-main" style={{
          order: isMobileOrTablet && isPortrait ? 2 : 0
        }}>

          <div 
            ref={mapPanelRef}
            className="map-dashboard-map"
            style={{ 
              aspectRatio: 'auto',
              minHeight: 'auto',
              maxHeight: 'none'
            }}
          >
            {/* Show map on all devices including mobile portrait */}
            <InteractiveUSMap 
              onStateClick={handleStateClick}
              selectedState={selectedState}
              onStateHover={handleStateHover}
            />
          </div>
          
        </div>

        {/* DASHBOARD SIDEBAR: Right section with metrics - appears first on mobile portrait */}
        <aside 
          ref={sidebarRef}
          className="map-dashboard-side"
          style={{ 
            position: 'relative',
            order: isMobileOrTablet && isPortrait ? 1 : 0
          }}
        >
          <div className="map-dashboard-metrics-container">
            <div className="map-dashboard-metric">
              <span className="map-dashboard-metric-label">Selected State</span>
              <span className="map-dashboard-metric-value" style={{ color: displayState ? '#fbbf24' : '#fca5a5' }}>
                {displayState && stateName
                  ? stateName
                  : 'None'}
              </span>
            </div>

            <div className="map-dashboard-metric" style={{ position: 'relative' }}>
              <span className="map-dashboard-metric-label">Total Clinicians</span>
              <span
                className="map-dashboard-metric-value"
                style={{
                  color: '#fbbf24' // yellow for both state and national total
                }}
              >
                {loadingCounts
                  ? 'Loading...'
                  : displayState
                    ? selectedStateTotal!.toLocaleString()
                    : (nationalTotal !== null ? nationalTotal.toLocaleString() : '—')}
              </span>
              {displayState && (
                <Image
                  src={`/flags/Flag_of_${getStateFlagName(displayState)}.svg`}
                  alt={`${stateName} flag`}
                  width={100}
                  height={60}
                  style={metricFlagStyle}
                />
              )}
              {!displayState && (
                <Image
                  src={`/flags/Flag_of_the_United_States.svg`}
                  alt="United States flag"
                  width={100}
                  height={60}
                  style={metricFlagStyle}
                />
              )}
            </div>

            <div className="map-dashboard-metric">
              <span className="map-dashboard-metric-label">Last Modified</span>
              <span className="map-dashboard-metric-value" style={{ color: '#a8d5a8' }}>
                {loadingCounts ? 'Loading...' : (lastModified || '—')}
              </span>
            </div>

            <div className="map-dashboard-metric">
              <span className="map-dashboard-metric-label">Specialty</span>
              <select
                value={selectedSpecialty}
                onChange={(e) => onSpecialtyChange?.(e.target.value)}
                style={{
                  marginTop: '0.35rem',
                  width: '100%',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #4d4d4d',
                  color: '#e5e7eb',
                  borderRadius: '4px',
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.8rem',
                  outline: 'none',
                }}
              >
                <option value="">All specialties</option>
                {specialtyOptions.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
});

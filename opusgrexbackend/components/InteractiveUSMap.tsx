'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { US_STATES } from '@/types/agency';

interface InteractiveUSMapProps {
  onStateClick?: (stateCode: string) => void;
  selectedState?: string | null;
  onStateHover?: (stateCode: string | null) => void;
}

declare global {
  interface Window {
    jQuery: any;
    $: any;
    Raphael: any;
  }
}

export default function InteractiveUSMap({ onStateClick, selectedState, onStateHover }: InteractiveUSMapProps) {
  // Tooltip refs for direct DOM manipulation (avoids React re-renders for smooth tracking)
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipNameRef = useRef<string | null>(null);
  const [tooltipMounted, setTooltipMounted] = useState(false);
  // Mount portal eagerly so tooltipRef.current is ready before any hover
  useEffect(() => { setTooltipMounted(true); }, []);

  // pointermove on document — always tracks cursor position via transform (no layout reflow)
  useEffect(() => {
    const nativeMove = (e: PointerEvent) => {
      if (tooltipRef.current) {
        tooltipRef.current.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 16}px)`;
      }
    };
    document.addEventListener('pointermove', nativeMove);
    return () => document.removeEventListener('pointermove', nativeMove);
  }, []);

  const lastHoverCodeRef = useRef<string | null>(null);
  const hoverCallbackRaf = useRef<number | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Programmatically trigger mouseover on a state path to play hover sound on load
  // onStateClick/onStateHover are intentionally omitted from deps to avoid breaking map plugin
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapContainerRef.current) return;
    setTimeout(() => {
      const container = mapContainerRef.current;
      if (!container) return;
      const svg = container.querySelector('svg');
      if (svg) {
        // Try to find the first state path element
        const firstPath = svg.querySelector('path');
        if (firstPath) {
          firstPath.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        }
      }
    }, 400);
  }, []);
  // Programmatically trigger a click on the map after hydration to enable hover sound
  useEffect(() => {
    if (!mapContainerRef.current) return;
    setTimeout(() => {
      const container = mapContainerRef.current;
      if (!container) return;
      const svg = container.querySelector('svg');
      if (svg) {
        // Simulate a click event on the SVG
        svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    }, 300);
  }, []);
  // Hydration-triggered resize to fix initial map sizing
  useEffect(() => {
    if (!mapContainerRef.current) return;
    setTimeout(() => {
      if (mapContainerRef.current) {
        window.dispatchEvent(new Event('resize'));
      }
    }, 100);
  }, []);

    // Ensure container has non-zero size before initializing map
    useEffect(() => {
      if (!mapContainerRef.current) return;
      const checkSize = () => {
        const rect = mapContainerRef.current!.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
        }
      };
      checkSize();
      const resizeObs = new window.ResizeObserver(checkSize);
      resizeObs.observe(mapContainerRef.current);
      return () => resizeObs.disconnect();
    }, []);
  // Mute hover sound for a few seconds after select
  const hoverMuteRef = useRef(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const mapInitializedRef = useRef(false);
  const hoverSoundRef = useRef<HTMLAudioElement | null>(null);
  const selectSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize hover sound effect
  useEffect(() => {
  hoverSoundRef.current = new Audio('/hover_tick_spy_v2_ultra_subtle.wav');
  hoverSoundRef.current.volume = 0.07; // Set volume to 7%
  }, []);

  // Initialize select sound effect
  useEffect(() => {
  selectSoundRef.current = new Audio('/Confirm Tap for state.mp3');
  selectSoundRef.current.volume = 0.25; // Set volume to 25%
  }, []);

  // Load external scripts (jQuery, Raphael, usmap) - defer until after first paint
  useEffect(() => {
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if script already exists
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
      });
    };

    // Use requestIdleCallback to defer script loading until after initial paint
    // Falls back to setTimeout if requestIdleCallback not available
    const deferLoad = () => {
      const loadAllScripts = async () => {
        try {
          // Load in order: jQuery -> Raphael -> usmap
          await loadScript('https://code.jquery.com/jquery-3.7.1.min.js');
          await loadScript('/raphael.js');
          await loadScript('/jquery.usmap.js');
          setScriptsLoaded(true);
        } catch (error) {
          console.error('Error loading map scripts:', error);
        }
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadAllScripts, { timeout: 2000 });
      } else {
        // Fallback: wait 100ms to ensure first paint
        setTimeout(loadAllScripts, 100);
      }
    };

    deferLoad();
  }, []);

  // Initialize the map once scripts are loaded
  useEffect(() => {
    if (!scriptsLoaded || !mapContainerRef.current || !window.jQuery || mapInitializedRef.current) return;

    const $ = window.jQuery;
    const Raphael = window.Raphael;

    // Initialize the usmap plugin
    $(mapContainerRef.current).usmap({
      stateStyles: {
        fill: '#0a0a0a', // Dark grey
        stroke: '#7a7a7a',
        'stroke-width': 1.5,
        'stroke-linejoin': 'round'
      },
      stateHoverStyles: {
        fill: '#110526', // Updated hover color to #110526
        stroke: '#b8b8b8',
        'stroke-width': 2
      },
      stateHoverAnimation: 350,
      showLabels: true,
      labelWidth: 35,
      labelHeight: 20,
      labelBackingStyles: {
        fill: '#0a0a0a',
        stroke: '#7a7a7a',
        'stroke-width': 1
      },
      labelBackingHoverStyles: {
        fill: '#000000',
        stroke: '#b8b8b8'
      },
      labelTextStyles: {
        fill: '#7a7a7a',
        'font-size': '13px',
        'font-weight': '600'
      },
      mouseover: function (event: any, data: any) {
        const stateCode = data.name;
        const stateName = US_STATES[stateCode as keyof typeof US_STATES];
        
        // 1. Update text + show — position is handled exclusively by pointermove on document
        if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
        tooltipNameRef.current = stateName || stateCode;
        if (tooltipRef.current) {
          tooltipRef.current.textContent = stateName || stateCode;
          tooltipRef.current.style.opacity = '1';
        }
        
        // 2. Sound - fire and forget, skip if same state or muted
        if (stateCode !== lastHoverCodeRef.current && !hoverMuteRef.current && hoverSoundRef.current) {
          hoverSoundRef.current.currentTime = 0;
          hoverSoundRef.current.play().catch(() => {});
          hoverMuteRef.current = true;
          setTimeout(() => { hoverMuteRef.current = false; }, 60);
        }
        
        // 3. Parent callback - batched via rAF to avoid re-render storm
        lastHoverCodeRef.current = stateCode;
        if (onStateHover) {
          if (hoverCallbackRaf.current) cancelAnimationFrame(hoverCallbackRaf.current);
          hoverCallbackRaf.current = requestAnimationFrame(() => {
            onStateHover(stateCode);
          });
        }
      },
      mouseout: function (event: any, data: any) {
        // Short delay before hiding — prevents flicker when cursor crosses state boundaries
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
          tooltipNameRef.current = null;
          lastHoverCodeRef.current = null;
          if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
        }, 60);
        
        if (onStateHover) {
          if (hoverCallbackRaf.current) cancelAnimationFrame(hoverCallbackRaf.current);
          hoverCallbackRaf.current = requestAnimationFrame(() => {
            onStateHover(null);
          });
        }
      },
      click: function (event: any, data: any) {
        const stateCode = data.name;
        // Play select sound effect
        if (selectSoundRef.current) {
          selectSoundRef.current.currentTime = 0;
          selectSoundRef.current.play().catch(err => console.log('Audio play failed:', err));
        }
        // Mute hover sound for 2 seconds
        hoverMuteRef.current = true;
        setTimeout(() => {
          hoverMuteRef.current = false;
        }, 2000);
        if (onStateClick) {
          onStateClick(stateCode);
        }
      }
    });

    // Add touch event support for mobile devices - but only on landscape/desktop
    // On portrait mode, allow native scrolling
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isPortrait = window.innerHeight > window.innerWidth;
    
    if (!isMobile || !isPortrait) {
      // Defer touch handler setup until idle to not block initial render
      const timeoutId = setTimeout(() => {
        if (!mapContainerRef.current) return;
        
        const mapContainer = mapContainerRef.current;
        const mapData = $(mapContainer).data('usmap');
        if (!mapData || !mapData.stateShapes) return;

        const stateShapes = mapData.stateShapes;
        
        // Add container-level touch handler (passive, non-blocking)
        mapContainer.addEventListener('touchstart', (e: TouchEvent) => {
          // Only handle single finger touches
          if (e.touches.length !== 1) return;
          
          const touch = e.touches[0];
          const target = document.elementFromPoint(touch.clientX, touch.clientY);
          
          // Check if touch is on a state (SVG path)
          if (target && target.tagName === 'path') {
            const statePath = target as any;
            
            // Find which state this is
            for (const [stateCode, stateShape] of Object.entries(stateShapes)) {
              if ((stateShape as any).node === target) {
                // Trigger hover sound
                if (!hoverMuteRef.current && hoverSoundRef.current) {
                  hoverSoundRef.current.currentTime = 0;
                  hoverSoundRef.current.play().catch(err => console.log('Audio play failed:', err));
                  hoverMuteRef.current = true;
                  setTimeout(() => {
                    hoverMuteRef.current = false;
                  }, 80);
                }

                // Trigger hover callback
                if (onStateHover) {
                  onStateHover(stateCode as string);
                }

                // Apply hover styles manually
                (stateShape as any).attr({
                  fill: '#000000',
                  stroke: '#b8b8b8',
                  'stroke-width': 2
                });
                
                // Store current state for touchend
                (mapContainer as any)._currentTouchState = { stateCode, stateShape };
                break;
              }
            }
          }
        }, { passive: true });

        // Touch end handler
        mapContainer.addEventListener('touchend', (e: TouchEvent) => {
          const touchData = (mapContainer as any)._currentTouchState;
          if (!touchData) return;
          
          const { stateCode, stateShape } = touchData;
          
          // Reset to normal styles
          (stateShape as any).attr({
            fill: '#0a0a0a',
            stroke: '#7a7a7a',
            'stroke-width': 1.5
          });

          // Remove hover
          if (onStateHover) {
            onStateHover(null);
          }

          // Trigger click
          if (selectSoundRef.current) {
            selectSoundRef.current.currentTime = 0;
            selectSoundRef.current.play().catch(err => console.log('Audio play failed:', err));
          }

          hoverMuteRef.current = true;
          setTimeout(() => {
            hoverMuteRef.current = false;
          }, 2000);

          if (onStateClick) {
            onStateClick(stateCode);
          }
          
          (mapContainer as any)._currentTouchState = null;
        }, { passive: true });
      }, 600);
      
      return () => clearTimeout(timeoutId);
    }

    // Add custom state labels for larger states (excluding small east coast states, AK, HI)
    // Small east coast states already have labels: VT, NH, MA, RI, CT, NJ, DE, MD, DC
    // Use setTimeout to ensure the map is fully initialized
    setTimeout(() => {
      if (!mapContainerRef.current) return;
      
      const mapData = $(mapContainerRef.current).data('usmap');
      if (!mapData || !mapData.paper || !mapData.stateShapes) {
        console.log('Map data not ready yet');
        return;
      }

      const statesToLabel = [
        'WA', 'OR', 'CA', 'NV', 'ID', 'MT', 'WY', 'UT', 'AZ', 'NM', 'CO',
        'ND', 'SD', 'NE', 'KS', 'OK', 'TX', 'MN', 'IA', 'MO', 'AR', 'LA',
        'WI', 'IL', 'MS', 'MI', 'IN', 'OH', 'KY', 'TN', 'AL', 'WV', 'VA',
        'NC', 'SC', 'GA', 'FL', 'PA', 'NY', 'ME'
      ];

      const paper = mapData.paper;
      const stateShapes = mapData.stateShapes;

      // Fix SVG clipping - allow overflow for label boxes
      const svgElement = $(mapContainerRef.current).find('svg')[0];
      if (svgElement) {
        svgElement.style.overflow = 'visible';
        // Set a very generous viewBox to accommodate all label boxes
        // Labels start at x=860, with our larger boxes they need more room
        svgElement.setAttribute('viewBox', '-50 -50 1200 850');
        svgElement.setAttribute('preserveAspectRatio', 'xMinYMin meet');
      }

      statesToLabel.forEach((state) => {
        if (stateShapes[state]) {
          try {
            const bbox = stateShapes[state].getBBox();
            const centerX = bbox.x + bbox.width / 2;
            const centerY = bbox.y + bbox.height / 2;

            // Add text label
            paper.text(centerX, centerY, state).attr({
              'fill': '#ffffff',
              'font-size': '11px',
              'font-weight': 'bold',
              'opacity': 0.8,
              'pointer-events': 'none'
            });
          } catch (err) {
            console.error(`Error adding label for ${state}:`, err);
          }
        }
      });
    }, 200);

    mapInitializedRef.current = true;

    // Cleanup only on unmount
    const container = mapContainerRef.current;
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (container && mapInitializedRef.current) {
        $(container).empty();
        mapInitializedRef.current = false;
      }
    };
  }, [scriptsLoaded]);

  return (
    <div className="relative w-full min-h-[500px]" style={{ overflow: 'visible', width: '100%', height: '100%', touchAction: 'manipulation' }}>
      <div 
        ref={mapContainerRef} 
        className="w-full min-h-[500px]"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          width: '100%',
          height: '100%',
          position: 'relative',
          touchAction: 'manipulation'
        }}
      />

      {/* Loading Overlay */}
      {!scriptsLoaded && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 50,
          borderRadius: '8px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              position: 'relative',
              width: '48px',
              height: '48px',
              margin: '0 auto 12px'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                border: '3px solid rgba(153, 27, 27, 0.4)',
                borderRadius: '9999px'
              }}></div>
              <div style={{
                position: 'absolute',
                inset: 0,
                border: '3px solid transparent',
                borderTopColor: '#ef4444',
                borderRightColor: '#ef4444',
                borderRadius: '9999px',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>
            <p style={{
              color: '#cbd5e1',
              fontWeight: 300,
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}>Initializing Map</p>
          </div>
        </div>
      )}

      {/* Floating State Tooltip - persistent DOM element, shown/hidden via opacity */}
      {tooltipMounted && createPortal(
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: '5px',
            fontSize: '17px',
            fontWeight: 600,
            zIndex: 99999,
            whiteSpace: 'nowrap',
            border: '1px solid #444',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            opacity: 0,
            transform: 'translate(0px, 0px)',
            willChange: 'transform',
            transition: 'opacity 0.08s ease-out',
          }}
        />,
        document.body
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

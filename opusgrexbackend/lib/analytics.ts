// Google Analytics event tracking utility

export const trackEvent = (eventName: string, eventParams: { [key: string]: string | number | boolean }) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventParams);
  }
};

// Track state selection on the map
export const trackStateSelection = (stateCode: string, stateName: string) => {
  trackEvent('state_selected', {
    state_code: stateCode,
    state_name: stateName,
    timestamp: new Date().toISOString(),
  });
};

// Track CSV download by state
export const trackDownloadCSV = (stateCode: string, stateName: string, agencyCount: number) => {
  trackEvent('csv_download', {
    state_code: stateCode,
    state_name: stateName,
    agency_count: agencyCount,
    timestamp: new Date().toISOString(),
  });
};

// Track national download (all states)
export const trackDownloadNational = (totalAgencies: number) => {
  trackEvent('csv_download_national', {
    state_code: 'ALL',
    state_name: 'National Total',
    agency_count: totalAgencies,
    timestamp: new Date().toISOString(),
  });
};

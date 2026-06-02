'use client';

import { useState } from 'react';
import Image from 'next/image';
import StatePageContent from './StatePageContent';
import { Agency } from '@/types/agency';

interface StateAgencyPanelProps {
  agencies: Agency[];
  stateName: string;
  stateCode: string;
  flagName: string;
}

function generateAgenciesCSV(agencies: Agency[], stateName: string): string {
  const header = 'City,Provider Name,Phone,RN,PT,OT,ST,MSW,HHA,Quality Rating\n';
  const rows = agencies.map(agency => {
    const services = [
      agency.nursingCare ? 'Yes' : 'No',
      agency.physicalTherapy ? 'Yes' : 'No',
      agency.occupationalTherapy ? 'Yes' : 'No',
      agency.speechPathology ? 'Yes' : 'No',
      agency.medicalSocial ? 'Yes' : 'No',
      agency.homeHealthAide ? 'Yes' : 'No',
    ].join(',');
    
    return `"${agency.city}","${agency.providerName.replace(/"/g, '""')}","${agency.phone}",${services},"${agency.qualityRating || 'N/A'}"`;
  });
  
  return header + rows.join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function StateAgencyPanel({ agencies, stateName, stateCode, flagName }: StateAgencyPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      id={`state-${stateCode}`}
      className="mb-8 scroll-mt-4"
    >
      <div className={`state-panel-container ${isExpanded ? 'expanded' : ''}`}>
        {/* Panel Header */}
        <div 
          className="state-panel-header"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="state-panel-header-left flex-1">
            <div className="state-panel-header-label" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {stateCode}
              <Image 
                src={`/flags/Flag_of_${flagName}.svg`}
                alt={`${stateName} flag`}
                width={100}
                height={60}
                style={{ height: '40px', width: '67px', borderRadius: '2px', border: 'none !important', outline: 'none', boxShadow: 'none' }}
              />
            </div>
            <h2>
              {stateName}
            </h2>
          </div>
          
          <div className="state-panel-header-right">
            <div>
              <div className="state-panel-header-label">
                Total Agencies
              </div>
              <div className="state-panel-agency-count">
                {agencies.length}
              </div>
            </div>
            <div className={`state-panel-chevron ${isExpanded ? 'expanded' : ''}`}>
              ▼
            </div>
          </div>
        </div>
        
        {!isExpanded && (
          <div style={{ paddingLeft: '2rem', paddingBottom: '1rem', fontSize: '0.875rem', color: '#6b7280', fontStyle: 'italic' }}>
            Click to view agencies...
          </div>
        )}
        
        {isExpanded && (
          <div style={{ paddingLeft: '2rem', paddingRight: '2rem', paddingBottom: '1.5rem', flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column', willChange: 'contents', contentVisibility: 'auto' }}>
            <StatePageContent agencies={agencies} stateName={stateName} stateCode={stateCode} />
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: 'auto', paddingTop: '1.5rem', paddingBottom: '0' }}>
              <a
                href={`/state/${stateCode.toLowerCase()}`}
                title={`View ${stateName} state page`}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: '1px solid #4d4d4d',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  color: '#e5e7eb',
                  textDecoration: 'none',
                  fontSize: '16px',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#2d2d2d';
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = '#6b7280';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = '#4d4d4d';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 2 2 2 2 7" />
                  <polyline points="17 2 22 2 22 7" />
                  <polyline points="7 22 2 22 2 17" />
                  <polyline points="17 22 22 22 22 17" />
                </svg>
              </a>
              <button
                onClick={() => {
                  const csv = generateAgenciesCSV(agencies, stateName);
                  downloadCSV(csv, `${stateName}_Agencies.csv`);
                }}
                title="Download agencies as CSV"
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: '1px solid #4d4d4d',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  color: '#e5e7eb',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2d2d2d';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#6b7280';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#4d4d4d';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { 
  MapPin, 
  Search, 
  ShoppingBag, 
  ChevronDown, 
  ArrowLeft,
  Sparkles,
  Store
} from 'lucide-react';

export default function MarketplaceHeader({ 
  selectedCorridor, 
  onSelectCorridor, 
  corridorList = [], 
  searchTerm, 
  onSearchChange,
  onExitToLanding 
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="mp-header">
      <div className="mp-header-container">
        {/* Brand & Location */}
        <div className="mp-brand-block">
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#27BBAD', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#0a0a0a' }}>Subtech Hub</span>
              <span className="font-mono" style={{ fontSize: '11px', color: '#27BBAD', fontWeight: 700 }}>shop.subtech.app</span>
            </div>

            {/* Location Corridor Picker */}
            <div style={{ position: 'relative', marginTop: '2px' }}>
              <button 
                className="mp-location-selector"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <MapPin size={12} color="#27BBAD" />
                <span>{selectedCorridor}</span>
                <ChevronDown size={12} color="#737373" />
              </button>

              {dropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '6px', background: '#ffffff', border: '1.5px solid #e5e5e5', borderRadius: '12px', padding: '6px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', minWidth: '220px', zIndex: 50 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#a3a3a3', padding: '6px 10px', textTransform: 'uppercase' }}>
                    Select Neighborhood Corridor
                  </div>
                  {corridorList.map(c => (
                    <button
                      key={c}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        background: selectedCorridor === c ? 'rgba(39, 187, 173, 0.1)' : 'transparent',
                        color: selectedCorridor === c ? '#27BBAD' : '#0a0a0a',
                        fontWeight: selectedCorridor === c ? 700 : 500,
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onClick={() => {
                        onSelectCorridor(c);
                        setDropdownOpen(false);
                      }}
                    >
                      <span>{c}</span>
                      {selectedCorridor === c && <span style={{ fontSize: '11px', color: '#27BBAD', fontWeight: 800 }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="mp-search-bar">
          <Search size={16} color="#a3a3a3" />
          <input
            type="text"
            placeholder="Search stores, pharmacies, medicines, or snacks..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="mp-search-input"
          />
        </div>

        {/* Exit Button */}
        <button
          onClick={onExitToLanding}
          style={{
            border: '1.5px solid #e5e5e5',
            background: '#ffffff',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#525252',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Main Site</span>
        </button>
      </div>
    </header>
  );
}

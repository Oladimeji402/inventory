import React from 'react';
import { Zap, ShieldCheck, Lock, Headphones } from 'lucide-react';
import { TRUST_FEATURES } from './marketplaceData';

const iconMap = {
  Zap: Zap,
  ShieldCheck: ShieldCheck,
  Lock: Lock,
  Headphones: Headphones
};

export default function MarketplaceTrustBar() {
  return (
    <div className="mp-trust-bar-section">
      <div className="mp-trust-bar-grid">
        {TRUST_FEATURES.map((item) => {
          const IconComp = iconMap[item.icon] || ShieldCheck;
          return (
            <div key={item.id} className="mp-trust-card">
              <div 
                className="mp-trust-icon-box"
                style={{ background: item.bg, color: item.color }}
              >
                <IconComp size={24} />
              </div>
              <div className="mp-trust-text">
                <h4 className="mp-trust-title">{item.title}</h4>
                <p className="mp-trust-desc">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

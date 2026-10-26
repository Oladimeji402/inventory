import React from 'react';
import { 
  Smartphone, 
  Pill, 
  ShoppingBasket, 
  Shirt, 
  Sparkles, 
  Cookie,
  ArrowRight
} from 'lucide-react';
import { DEPARTMENTS } from './marketplaceData';

const iconMap = {
  Smartphone: Smartphone,
  Pill: Pill,
  ShoppingBasket: ShoppingBasket,
  Shirt: Shirt,
  Sparkles: Sparkles,
  Cookie: Cookie
};

export default function MarketplaceCategoryGrid({
  selectedCategory,
  onSelectCategory
}) {
  return (
    <section className="mp-categories-section">
      <div className="mp-section-title-wrap">
        <div>
          <h2 className="mp-section-title">Explore by Department</h2>
          <p className="mp-section-sub">Browse verified local inventory sorted by specialized merchant channels.</p>
        </div>
        <button
          type="button"
          className="mp-view-all-link"
          onClick={() => onSelectCategory('All')}
        >
          <span>View All Departments</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="mp-categories-cards-grid">
        {DEPARTMENTS.map((dept) => {
          const IconComp = iconMap[dept.icon] || Sparkles;
          const isActive = selectedCategory === dept.id;

          return (
            <div
              key={dept.id}
              className={`mp-category-feature-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelectCategory(dept.id)}
            >
              <div 
                className="mp-cat-card-icon"
                style={{ background: dept.bg, color: dept.color }}
              >
                <IconComp size={28} />
              </div>

              <div className="mp-cat-card-info">
                <h3 className="mp-cat-card-name">{dept.name}</h3>
                <span className="mp-cat-card-count">{dept.itemCount}</span>
              </div>

              {dept.badge && (
                <span className="mp-cat-card-badge" style={{ background: dept.bg, color: dept.color }}>
                  {dept.badge}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

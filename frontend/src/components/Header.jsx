import React from 'react';
import { Activity, Brain, PieChart, TrendingUp, Newspaper } from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'predictor', label: 'ML Forecaster', icon: Brain },
    { id: 'sentiment', label: 'Sentiment Hub', icon: Newspaper },
    { id: 'optimizer', label: 'Portfolio Optimizer', icon: PieChart },
  ];

  return (
    <header className="glass-card" style={{
      borderRadius: '0px 0px 16px 16px',
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      padding: '16px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'rgba(7, 7, 14, 0.85)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          borderRadius: '10px',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <TrendingUp size={24} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }} className="gradient-text-primary">
            ANTIGRAVITY QUANT
          </h1>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
            STOCKS & CRYPTO PREDICTIVE ANALYTICS
          </span>
        </div>
      </div>

      <nav style={{ display: 'flex', gap: '8px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="btn"
              style={{
                background: isActive ? 'linear-gradient(135deg, rgba(123, 97, 255, 0.15) 0%, rgba(0, 242, 254, 0.15) 100%)' : 'transparent',
                borderColor: isActive ? 'var(--primary-glow)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                borderRadius: '8px',
                padding: '8px 16px',
                border: '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'var(--transition-smooth)'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={18} color={isActive ? 'var(--secondary)' : 'currentColor'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

import React, { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Predictor from './components/Predictor';
import Sentiment from './components/Sentiment';
import Optimizer from './components/Optimizer';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTicker, setSelectedTicker] = useState('');

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Content Area */}
      <main style={{ flexGrow: 1 }}>
        {activeTab === 'dashboard' && (
          <Dashboard selectedTicker={selectedTicker} setSelectedTicker={setSelectedTicker} />
        )}
        
        {activeTab === 'predictor' && (
          <Predictor selectedTicker={selectedTicker} />
        )}
        
        {activeTab === 'sentiment' && (
          <Sentiment selectedTicker={selectedTicker} />
        )}
        
        {activeTab === 'optimizer' && (
          <Optimizer />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        padding: '24px 40px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border-color)',
        marginTop: 'auto',
        background: 'rgba(5, 5, 10, 0.5)'
      }}>
        Antigravity Quant Platform • Built with React, FastAPI, & Scikit-Learn • Data powered by Yahoo Finance
      </footer>
    </div>
  );
}

export default App;

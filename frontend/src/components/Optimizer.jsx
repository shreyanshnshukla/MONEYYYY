import React, { useState, useEffect } from 'react';
import { runPortfolioOptimization, fetchAssets } from '../utils/api';
import { 
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, 
  CartesianGrid, Tooltip, Cell, BarChart, Bar, Legend
} from 'recharts';
import { PieChart, Settings, Play, Plus, Trash2, CheckSquare, Square, Info } from 'lucide-react';

export default function Optimizer() {
  const [availableAssets, setAvailableAssets] = useState({ stocks: [], cryptos: [] });
  const [selectedList, setSelectedList] = useState([]);
  const [period, setPeriod] = useState('1y');
  const [riskFreeRate, setRiskFreeRate] = useState(2.0);
  const [loading, setLoading] = useState(false);
  const [optData, setOptData] = useState(null);
  const [error, setError] = useState(null);
  const [portfolioType, setPortfolioType] = useState('max_sharpe'); // max_sharpe, min_vol

  useEffect(() => {
    async function loadAssets() {
      try {
        const data = await fetchAssets();
        setAvailableAssets(data);
        
        // Default select first few assets to make user experience fast
        const defaults = [
          data.cryptos[0]?.symbol,
          data.cryptos[1]?.symbol,
          data.stocks[0]?.symbol,
          data.stocks[1]?.symbol
        ].filter(Boolean);
        setSelectedList(defaults);
      } catch (err) {
        console.error(err);
        setError("Failed to load available assets.");
      }
    }
    loadAssets();
  }, []);

  const handleToggleAsset = (symbol) => {
    if (selectedList.includes(symbol)) {
      setSelectedList(selectedList.filter(s => s !== symbol));
    } else {
      setSelectedList([...selectedList, symbol]);
    }
  };

  const handleOptimize = async () => {
    if (selectedList.length < 2) {
      setError("Please select at least 2 assets to construct a portfolio.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        tickers: selectedList,
        period: period,
        risk_free_rate: parseFloat(riskFreeRate) / 100.0
      };
      const data = await runPortfolioOptimization(payload);
      setOptData(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Optimization failed. Check that assets have aligned historical data.");
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for the Efficient Frontier Scatter Plot
  const getScatterData = () => {
    if (!optData) return [];
    
    // Format Monte Carlo random portfolios
    return optData.monte_carlo.map((p, idx) => ({
      x: p.volatility * 100, // Volatility in %
      y: p.return * 100,     // Return in %
      sharpe: p.sharpe,
      isOptimalSharpe: p.is_optimal_sharpe,
      isOptimalVol: p.is_optimal_vol,
      id: idx
    }));
  };

  const scatterData = getScatterData();

  // Get active optimized profile
  const getActiveProfile = () => {
    if (!optData) return null;
    return portfolioType === 'max_sharpe' ? optData.max_sharpe : optData.min_vol;
  };

  const activeProfile = getActiveProfile();

  // Prepare data for weightings bar chart
  const getWeightsChartData = () => {
    if (!activeProfile || !optData) return [];
    return optData.tickers.map((ticker, idx) => ({
      name: ticker,
      weight: parseFloat((activeProfile.weights[idx] * 100).toFixed(2)) // in %
    }));
  };

  const weightsData = getWeightsChartData();

  return (
    <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 2fr', alignItems: 'stretch' }}>
        
        {/* Selector & Setup Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }} className="gradient-text">
            <Settings size={20} color="var(--primary)" />
            Portfolio Constructor
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1 }}>
            
            {/* Checklist of assets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Include Assets in Portfolio (Select 2+)</label>
              
              <div style={{ 
                maxHeight: '220px', 
                overflowY: 'auto', 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '10px',
                padding: '12px'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cryptos</span>
                  {availableAssets.cryptos.map(c => {
                    const isChecked = selectedList.includes(c.symbol);
                    return (
                      <div 
                        key={c.symbol} 
                        onClick={() => handleToggleAsset(c.symbol)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          padding: '6px 4px', 
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: isChecked ? '#ffffff' : 'var(--text-secondary)'
                        }}
                      >
                        {isChecked ? <CheckSquare size={14} color="var(--secondary)" /> : <Square size={14} color="var(--text-muted)" />}
                        <span>{c.symbol.split('-')[0]} - {c.name}</span>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Stocks</span>
                  {availableAssets.stocks.map(s => {
                    const isChecked = selectedList.includes(s.symbol);
                    return (
                      <div 
                        key={s.symbol} 
                        onClick={() => handleToggleAsset(s.symbol)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          padding: '6px 4px', 
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: isChecked ? '#ffffff' : 'var(--text-secondary)'
                        }}
                      >
                        {isChecked ? <CheckSquare size={14} color="var(--primary)" /> : <Square size={14} color="var(--text-muted)" />}
                        <span>{s.symbol} - {s.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Params */}
            <div className="grid-2" style={{ gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Risk-Free Rate (%)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="10" 
                  className="form-input" 
                  style={{ marginTop: '6px' }}
                  value={riskFreeRate}
                  onChange={(e) => setRiskFreeRate(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Lookback Period</label>
                <select 
                  className="form-select" 
                  style={{ marginTop: '6px' }}
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option value="1y">1 Year</option>
                  <option value="2y">2 Years</option>
                  <option value="5y">5 Years</option>
                </select>
              </div>
            </div>

            {/* Run optimization */}
            <button 
              className="btn btn-primary" 
              style={{ marginTop: 'auto', padding: '12px' }}
              onClick={handleOptimize}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Settings size={18} style={{ animation: 'spin 2s linear infinite' }} />
                  Calculating Efficient Frontier...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Optimize Portfolio
                </>
              )}
            </button>
            
          </div>
        </div>

        {/* Frontier Plots & Charts Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {loading ? (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '420px', gap: '16px' }}>
              <PieChart size={48} className="glow-effect" style={{ color: 'var(--secondary)', animation: 'pulse 1.5s infinite ease-in-out' }} />
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Running Modern Portfolio Optimization</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.5 }}>
                  Solving quadratic optimization targets (SLSQP solver), fitting expected returns & covariance matrices, running Monte Carlo simulations of random weights, mapping the Sharpe ratios, and computing risk boundaries...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '420px', gap: '16px', borderColor: 'var(--danger)' }}>
              <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select different assets or lookback periods if data alignments failed.</p>
            </div>
          ) : !optData ? (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '420px', gap: '16px', color: 'var(--text-secondary)' }}>
              <PieChart size={48} style={{ opacity: 0.3 }} />
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Optimizer Workspace Ready</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Choose your assets on the left and run MPT allocations</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Frontier scatter plot */}
              <div className="glass-card">
                <h4 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Markowitz Efficient Frontier Plot</h4>
                <div style={{ width: '100%', height: '240px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis type="number" dataKey="x" name="Volatility" unit="%" stroke="var(--text-muted)" fontSize={9} />
                      <YAxis type="number" dataKey="y" name="Expected Return" unit="%" stroke="var(--text-muted)" fontSize={9} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ 
                          backgroundColor: 'rgba(10, 10, 20, 0.95)', 
                          borderColor: 'var(--primary-glow)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)'
                        }}
                        formatter={(value, name) => [Number(value).toFixed(2) + '%', name]}
                      />
                      
                      {/* Portfolios points */}
                      <Scatter name="Portfolios" data={scatterData} fill="rgba(123, 97, 255, 0.25)">
                        {scatterData.map((entry, index) => {
                          let color = 'rgba(123, 97, 255, 0.25)';
                          let size = 15;
                          
                          if (entry.isOptimalSharpe) {
                            color = 'var(--secondary)'; // Max Sharpe
                            size = 80;
                          } else if (entry.isOptimalVol) {
                            color = 'var(--success)';   // Min Vol
                            size = 80;
                          }
                          
                          return <Cell key={`cell-${index}`} fill={color} r={entry.isOptimalSharpe || entry.isOptimalVol ? 6 : 2} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)' }} />
                    Max Sharpe Ratio
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                    Min Volatility
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(123, 97, 255, 0.25)' }} />
                    Simulated Portfolios
                  </span>
                </div>
              </div>

              {/* Toggle optimal profile selection */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setPortfolioType('max_sharpe')}
                  className="btn"
                  style={{
                    flex: 1,
                    background: portfolioType === 'max_sharpe' ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(123, 97, 255, 0.15) 100%)' : 'transparent',
                    borderColor: portfolioType === 'max_sharpe' ? 'var(--primary-glow)' : 'transparent',
                    color: portfolioType === 'max_sharpe' ? '#ffffff' : 'var(--text-secondary)',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}
                >
                  🚀 Max Sharpe Profile (Optimized Return)
                </button>
                <button
                  onClick={() => setPortfolioType('min_vol')}
                  className="btn"
                  style={{
                    flex: 1,
                    background: portfolioType === 'min_vol' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                    borderColor: portfolioType === 'min_vol' ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
                    color: portfolioType === 'min_vol' ? '#ffffff' : 'var(--text-secondary)',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}
                >
                  🛡️ Min Volatility Profile (Risk Averse)
                </button>
              </div>

              {/* Statistics & weightings bar chart */}
              <div className="grid-2">
                
                {/* Stats */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Portfolio Performance Metrics</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Expected Annual Return</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--success)' }}>
                        {(activeProfile.return * 100).toFixed(2)}%
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Annualized Volatility</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--warning)' }}>
                        {(activeProfile.volatility * 100).toFixed(2)}%
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sharpe Ratio (above risk-free)</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
                        {activeProfile.sharpe.toFixed(3)}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '12px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '6px' }}>
                    <Info size={12} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Using risk-free rate of {riskFreeRate}%</span>
                  </div>
                </div>

                {/* Bar weightings */}
                <div className="glass-card">
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Optimized Asset Weightings</h4>
                  <div style={{ width: '100%', height: '140px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weightsData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} />
                        <YAxis stroke="var(--text-muted)" fontSize={9} unit="%" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(10, 10, 20, 0.95)', 
                            borderColor: 'var(--primary-glow)',
                            borderRadius: '8px'
                          }}
                          formatter={(value) => [value + '%', 'Allocated Weight']}
                        />
                        <Bar dataKey="weight" fill={portfolioType === 'max_sharpe' ? 'var(--primary)' : 'var(--success)'} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
              </div>
              
            </div>
          )}
          
        </div>
      </div>
      
    </div>
  );
}

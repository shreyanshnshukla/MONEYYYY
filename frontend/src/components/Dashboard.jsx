import React, { useState, useEffect } from 'react';
import { fetchAssets, fetchTickerDetails, fetchHistoricalData } from '../utils/api';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, BarChart2, DollarSign, Layers } from 'lucide-react';

export default function Dashboard({ selectedTicker, setSelectedTicker }) {
  const [assets, setAssets] = useState({ stocks: [], cryptos: [] });
  const [tickerDetails, setTickerDetails] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [period, setPeriod] = useState('1y');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Close'); // Close, SMA, Bollinger

  useEffect(() => {
    async function loadAssets() {
      try {
        const data = await fetchAssets();
        setAssets(data);
        if (!selectedTicker) {
          // Default selection
          setSelectedTicker(data.cryptos[0]?.symbol || 'BTC-USD');
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load supported assets.");
      }
    }
    loadAssets();
  }, []);

  useEffect(() => {
    if (!selectedTicker) return;

    async function loadTickerData() {
      setLoading(true);
      setError(null);
      try {
        const [details, history] = await Promise.all([
          fetchTickerDetails(selectedTicker),
          fetchHistoricalData(selectedTicker, period)
        ]);
        setTickerDetails(details);
        setHistoryData(history);
      } catch (err) {
        console.error(err);
        setError("Failed to load asset details and history.");
      } finally {
        setLoading(false);
      }
    }

    loadTickerData();
  }, [selectedTicker, period]);

  const handleAssetSelect = (symbol) => {
    setSelectedTicker(symbol);
  };

  const getPriceColor = () => {
    if (!tickerDetails || tickerDetails.previousClose === null) return 'var(--text-primary)';
    const pct = ((tickerDetails.currentPrice - tickerDetails.previousClose) / tickerDetails.previousClose) * 100;
    return pct >= 0 ? 'var(--success)' : 'var(--danger)';
  };

  const formatNumber = (num, isCurrency = false) => {
    if (num === null || num === undefined) return 'N/A';
    if (isCurrency) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    }
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString();
  };

  const calculateDailyChange = () => {
    if (!tickerDetails || !tickerDetails.currentPrice || !tickerDetails.previousClose) return { val: 0, pct: 0, isUp: true };
    const diff = tickerDetails.currentPrice - tickerDetails.previousClose;
    const pct = (diff / tickerDetails.previousClose) * 100;
    return {
      val: diff,
      pct: pct,
      isUp: diff >= 0
    };
  };

  const dailyChange = calculateDailyChange();

  return (
    <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Asset Selection Panel */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} color="var(--primary)" />
          Select Financial Asset to Analyze
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cryptocurrencies</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {assets.cryptos.map(c => (
                <button
                  key={c.symbol}
                  onClick={() => handleAssetSelect(c.symbol)}
                  className="btn"
                  style={{
                    backgroundColor: selectedTicker === c.symbol ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255,255,255,0.02)',
                    borderColor: selectedTicker === c.symbol ? 'var(--secondary)' : 'var(--border-color)',
                    color: selectedTicker === c.symbol ? '#ffffff' : 'var(--text-secondary)',
                    padding: '6px 12px',
                    fontSize: '0.85rem'
                  }}
                >
                  {c.name} ({c.symbol.split('-')[0]})
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stocks</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {assets.stocks.map(s => (
                <button
                  key={s.symbol}
                  onClick={() => handleAssetSelect(s.symbol)}
                  className="btn"
                  style={{
                    backgroundColor: selectedTicker === s.symbol ? 'rgba(123, 97, 255, 0.15)' : 'rgba(255,255,255,0.02)',
                    borderColor: selectedTicker === s.symbol ? 'var(--primary)' : 'var(--border-color)',
                    color: selectedTicker === s.symbol ? '#ffffff' : 'var(--text-secondary)',
                    padding: '6px 12px',
                    fontSize: '0.85rem'
                  }}
                >
                  {s.name} ({s.symbol})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '16px' }}>
          <RefreshCw size={40} className="glow-effect" style={{ animation: 'spin 2s linear infinite', color: 'var(--primary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading asset intelligence & historical trends...</p>
        </div>
      ) : error ? (
        <div className="glass-card" style={{ borderColor: 'var(--danger)', padding: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
          <button className="btn btn-secondary" style={{ marginTop: '12px' }} onClick={() => setSelectedTicker(selectedTicker)}>Retry Connection</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Key Stats Row */}
          <div className="grid-4">
            <div className="glass-card interactive">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Current Market Price</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{formatNumber(tickerDetails?.currentPrice, true)}</h2>
                {tickerDetails?.previousClose && (
                  <span style={{ color: getPriceColor(), fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {dailyChange.isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {dailyChange.pct.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>

            <div className="glass-card interactive">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>24h Trading Volume</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <BarChart2 size={20} color="var(--secondary)" />
                <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>{formatNumber(tickerDetails?.volume)}</h2>
              </div>
            </div>

            <div className="glass-card interactive">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Market Capitalization</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <DollarSign size={20} color="var(--success)" />
                <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>{formatNumber(tickerDetails?.marketCap, false)}</h2>
              </div>
            </div>

            <div className="glass-card interactive">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Day Range (Low / High)</span>
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Low: {formatNumber(tickerDetails?.dayLow, true)}</span>
                  <span>High: {formatNumber(tickerDetails?.dayHigh, true)}</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginTop: '6px', position: 'relative' }}>
                  {tickerDetails?.dayHigh && tickerDetails?.dayLow && tickerDetails?.currentPrice && (
                    <div style={{
                      position: 'absolute',
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
                      borderRadius: '3px',
                      left: '0%',
                      width: `${Math.max(0, Math.min(100, ((tickerDetails.currentPrice - tickerDetails.dayLow) / (tickerDetails.dayHigh - tickerDetails.dayLow)) * 100))}%`
                    }} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Chart Section */}
          <div className="glass-card" style={{ minHeight: '450px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem' }}>Historical Price Analytics: {tickerDetails?.shortName}</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Analyze indicators, moving averages, and support/resistance zones</p>
              </div>

              {/* Control Buttons */}
              <div style={{ display: 'flex', gap: '16px' }}>
                {/* Mode Select */}
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {['Close', 'Moving Averages', 'Bollinger Bands'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        color: activeTab === tab ? '#ffffff' : 'var(--text-secondary)',
                        background: activeTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Period Select */}
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {['1mo', '3mo', '6mo', '1y', '2y'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        color: period === p ? '#ffffff' : 'var(--text-secondary)',
                        background: period === p ? 'rgba(255,255,255,0.08)' : 'transparent',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Line Chart */}
            <div style={{ width: '100%', height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="Date" stroke="var(--text-muted)" fontSize={10} dy={10} />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => '$' + val.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(10, 10, 20, 0.95)', 
                      borderColor: 'var(--primary-glow)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }} 
                    formatter={(value) => ['$' + Number(value).toFixed(2), undefined]}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
                  
                  <Line 
                    type="monotone" 
                    dataKey="Close" 
                    name="Close Price" 
                    stroke="var(--secondary)" 
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />

                  {activeTab === 'Moving Averages' && (
                    <>
                      <Line 
                        type="monotone" 
                        dataKey="SMA_20" 
                        name="20-day SMA" 
                        stroke="var(--warning)" 
                        strokeWidth={1.5}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="SMA_50" 
                        name="50-day SMA" 
                        stroke="var(--primary)" 
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </>
                  )}

                  {activeTab === 'Bollinger Bands' && (
                    <>
                      <Line 
                        type="monotone" 
                        dataKey="BB_Upper" 
                        name="BB Upper" 
                        stroke="rgba(16, 185, 129, 0.5)" 
                        strokeDasharray="4 4"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="BB_Lower" 
                        name="BB Lower" 
                        stroke="rgba(239, 68, 68, 0.5)" 
                        strokeDasharray="4 4"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="BB_Middle" 
                        name="BB Middle" 
                        stroke="rgba(255,255,255,0.2)" 
                        dot={false}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Description Section */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>About {tickerDetails?.shortName}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{tickerDetails?.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}

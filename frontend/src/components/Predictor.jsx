import React, { useState } from 'react';
import { predictPrices } from '../utils/api';
import { 
  ResponsiveContainer, ComposedChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { Brain, Sliders, Shield, Award, Activity, HelpCircle, BarChart2 } from 'lucide-react';

export default function Predictor({ selectedTicker }) {
  const [modelType, setModelType] = useState('random_forest');
  const [windowSize, setWindowSize] = useState(30);
  const [horizon, setHorizon] = useState(7);
  const [period, setPeriod] = useState('2y');
  const [nEstimators, setNEstimators] = useState(100);
  const [epochs, setEpochs] = useState(25);
  const [lr, setLr] = useState(0.005);
  const [loading, setLoading] = useState(false);
  const [predictionData, setPredictionData] = useState(null);
  const [error, setError] = useState(null);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ticker: selectedTicker,
        model_type: modelType,
        window_size: Number(windowSize),
        horizon: Number(horizon),
        period: period,
        hyperparameters: modelType === 'lstm' 
          ? { epochs: Number(epochs), lr: Number(lr) }
          : { n_estimators: Number(nEstimators) }
      };
      
      const data = await predictPrices(payload);
      setPredictionData(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to execute prediction pipeline.");
    } finally {
      setLoading(false);
    }
  };

  // Process data for the visualization chart
  const getChartData = () => {
    if (!predictionData) return [];
    
    const chartPoints = [];
    
    // Add historical baseline values
    predictionData.historical_baseline.forEach((h, idx) => {
      chartPoints.push({
        date: h.Date,
        Close: h.Close,
        forecast: null,
      });
    });
    
    // Connect historical and forecast by adding a point
    const lastHistorical = chartPoints[chartPoints.length - 1];
    if (lastHistorical) {
      chartPoints.push({
        date: lastHistorical.date,
        Close: lastHistorical.Close,
        forecast: lastHistorical.Close
      });
    }
    
    // Add forecast values
    predictionData.forecast.forEach(f => {
      chartPoints.push({
        date: f.date,
        Close: null,
        forecast: f.predicted_price
      });
    });
    
    return chartPoints;
  };

  const chartData = getChartData();

  // Process feature importance list for the chart
  const getImportanceData = () => {
    if (!predictionData || !predictionData.feature_importance) return [];
    
    return Object.entries(predictionData.feature_importance)
      .slice(0, 8) // Limit to top 8
      .map(([key, val]) => ({
        feature: key,
        importance: val * 100 // percentage
      }));
  };

  const importanceData = getImportanceData();

  const getMetricGrade = (r2) => {
    if (r2 >= 0.85) return { grade: 'EXCELLENT', color: 'var(--success)' };
    if (r2 >= 0.6) return { grade: 'GOOD', color: 'var(--warning)' };
    if (r2 >= 0.0) return { grade: 'WEAK', color: '#f87171' };
    return { grade: 'UNRELIABLE', color: 'var(--danger)' };
  };

  const metricRating = predictionData?.metrics ? getMetricGrade(predictionData.metrics.r2) : null;

  return (
    <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 2fr' }}>
        
        {/* Parameters Column */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }} className="gradient-text">
            <Sliders size={20} color="var(--primary)" />
            Model Configuration
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Selected asset display */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Target Asset</label>
              <div style={{ 
                padding: '10px 14px', 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px',
                fontWeight: 700,
                marginTop: '6px',
                fontSize: '1rem',
                color: 'var(--secondary)'
              }}>
                {selectedTicker}
              </div>
            </div>

            {/* Model Type */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Model Type</label>
              <select 
                className="form-select" 
                style={{ marginTop: '6px' }}
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
              >
                <option value="random_forest">Random Forest (Ensemble Tree)</option>
                <option value="gradient_boosting">Gradient Boosting (Sequential Tree)</option>
                <option value="ridge">Ridge Regressor (Regularized Linear)</option>
                <option value="lstm">Lightweight Deep Learning Neural Net</option>
              </select>
            </div>

            {/* Horizons & Window Sizes */}
            <div className="grid-2" style={{ gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Lookback Window</label>
                <select 
                  className="form-select" 
                  style={{ marginTop: '6px' }}
                  value={windowSize}
                  onChange={(e) => setWindowSize(e.target.value)}
                >
                  <option value={15}>15 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={45}>45 Days</option>
                  <option value={60}>60 Days</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Forecast Horizon</label>
                <select 
                  className="form-select" 
                  style={{ marginTop: '6px' }}
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                >
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              </div>
            </div>

            {/* Training Dataset Range */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Training Dataset Span</label>
              <select 
                className="form-select" 
                style={{ marginTop: '6px' }}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="1y">1 Year (Recent Trends)</option>
                <option value="2y">2 Years (Medium-Term Cycles)</option>
                <option value="5y">5 Years (Long-Term Structural)</option>
              </select>
            </div>

            {/* Hyperparameters based on model selection */}
            {modelType !== 'lstm' && modelType !== 'ridge' && (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Number of Trees (Estimators)</label>
                <input 
                  type="range" 
                  min="50" 
                  max="300" 
                  step="50"
                  style={{ width: '100%', marginTop: '8px', accentColor: 'var(--primary)' }}
                  value={nEstimators}
                  onChange={(e) => setNEstimators(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>50</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{nEstimators} Trees</span>
                  <span>300</span>
                </div>
              </div>
            )}

            {modelType === 'lstm' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Training Epochs</label>
                  <input 
                    type="range" 
                    min="10" 
                    max="50" 
                    step="5"
                    style={{ width: '100%', marginTop: '8px', accentColor: 'var(--primary)' }}
                    value={epochs}
                    onChange={(e) => setEpochs(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>10</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{epochs} Epochs</span>
                    <span>50</span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Learning Rate</label>
                  <select 
                    className="form-select" 
                    style={{ marginTop: '6px' }}
                    value={lr}
                    onChange={(e) => setLr(e.target.value)}
                  >
                    <option value={0.01}>0.01 (Fast)</option>
                    <option value={0.005}>0.005 (Balanced)</option>
                    <option value={0.001}>0.001 (Conservative)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Run Button */}
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '8px', padding: '12px' }}
              onClick={handlePredict}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Activity size={18} style={{ animation: 'spin 2s linear infinite' }} />
                  Running Optimization Pipeline...
                </>
              ) : (
                <>
                  <Brain size={18} />
                  Train Model & Forecast
                </>
              )}
            </button>
            
          </div>
        </div>

        {/* Prediction Results / Visual Charts Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {loading ? (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '400px', gap: '16px' }}>
              <Brain size={48} className="glow-effect" style={{ color: 'var(--primary)', animation: 'pulse 1.5s infinite ease-in-out' }} />
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Processing Quantitative Pipeline</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.5 }}>
                  Fetching historical prices, calculating indicators (SMA, RSI, MACD), scaling features, splits datasets, training the {modelType.replace('_', ' ')} model, and executing sequence-based predictions...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '400px', gap: '16px', borderColor: 'var(--danger)' }}>
              <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>If the server is still starting up, please wait a moment and try again.</p>
            </div>
          ) : !predictionData ? (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '400px', gap: '16px', color: 'var(--text-secondary)' }}>
              <Brain size={48} style={{ opacity: 0.3 }} />
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Forecasting Module Ready</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Configure your preferences on the left and click "Train Model & Forecast"</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Forecast Plot Card */}
              <div className="glass-card">
                <h4 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>{predictionData.ticker} Forecast Horizon ({predictionData.forecast.length} Days)</h4>
                
                <div style={{ width: '100%', height: '320px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={9} />
                      <YAxis 
                        stroke="var(--text-muted)" 
                        fontSize={9} 
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => '$' + val.toLocaleString(undefined, { maximumFractionDigits: 1 })}
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
                      
                      {/* Historical Close */}
                      <Line 
                        type="monotone" 
                        dataKey="Close" 
                        name="Historical Base" 
                        stroke="var(--secondary)" 
                        strokeWidth={2}
                        dot={false}
                      />
                      
                      {/* Forecasted Close */}
                      <Line 
                        type="monotone" 
                        dataKey="forecast" 
                        name="Model Forecast" 
                        stroke="var(--primary)" 
                        strokeWidth={2.5}
                        strokeDasharray="4 4"
                        dot={{ r: 4, stroke: 'var(--primary)', strokeWidth: 1 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Evaluation Metrics Cards */}
              <div className="grid-4" style={{ gap: '16px' }}>
                <div className="glass-card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>R² Score (Fit Quality)</span>
                  <h3 style={{ fontSize: '1.4rem', color: metricRating.color, marginTop: '4px' }}>
                    {predictionData.metrics.r2.toFixed(3)}
                  </h3>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    Grade: <strong>{metricRating.grade}</strong>
                  </span>
                </div>

                <div className="glass-card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MAE (Mean Abs Error)</span>
                  <h3 style={{ fontSize: '1.4rem', marginTop: '4px' }}>
                    ${predictionData.metrics.mae.toFixed(2)}
                  </h3>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Avg dollars off</span>
                </div>

                <div className="glass-card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>RMSE (Root MSE)</span>
                  <h3 style={{ fontSize: '1.4rem', marginTop: '4px' }}>
                    ${predictionData.metrics.rmse.toFixed(2)}
                  </h3>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Penalizes larger outliers</span>
                </div>

                <div className="glass-card" style={{ padding: '16px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MAPE (Percentage Error)</span>
                  <h3 style={{ fontSize: '1.4rem', marginTop: '4px' }}>
                    {predictionData.metrics.mape.toFixed(2)}%
                  </h3>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Percent variance</span>
                </div>
              </div>

              {/* Feature Importance Section */}
              {importanceData.length > 0 && (
                <div className="glass-card">
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart2 size={18} color="var(--primary)" />
                    Relative Feature Importance (Model Weightings)
                  </h4>
                  <div style={{ width: '100%', height: '200px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={importanceData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis type="number" stroke="var(--text-muted)" fontSize={9} unit="%" />
                        <YAxis dataKey="feature" type="category" stroke="var(--text-muted)" fontSize={9} width={80} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(10, 10, 20, 0.95)', 
                            borderColor: 'var(--primary-glow)',
                            borderRadius: '8px'
                          }}
                          formatter={(value) => [Number(value).toFixed(2) + '%', 'Weight']}
                        />
                        <Bar dataKey="importance" fill="url(#barGradient)" radius={[0, 4, 4, 0]}>
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="var(--primary)" />
                              <stop offset="100%" stopColor="var(--secondary)" />
                            </linearGradient>
                          </defs>
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              
            </div>
          )}
        </div>
        
      </div>
      
    </div>
  );
}

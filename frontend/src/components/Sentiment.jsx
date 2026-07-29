import React, { useState, useEffect } from 'react';
import { fetchSentiment } from '../utils/api';
import { RefreshCw, MessageSquare, ShieldAlert, Award, ExternalLink, ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react';

export default function Sentiment({ selectedTicker }) {
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSentiment = async () => {
    if (!selectedTicker) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSentiment(selectedTicker);
      setSentimentData(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch recent sentiment and financial news.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSentiment();
  }, [selectedTicker]);

  const getDialColor = (score) => {
    if (score >= 0.15) return 'var(--success)';
    if (score <= -0.15) return 'var(--danger)';
    return 'var(--warning)';
  };

  const getDialLabel = (score) => {
    if (score >= 0.3) return 'Strong Bullish';
    if (score >= 0.1) return 'Mild Bullish';
    if (score <= -0.3) return 'Strong Bearish';
    if (score <= -0.1) return 'Mild Bearish';
    return 'Neutral Market Sentiment';
  };

  return (
    <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem' }}>Financial Sentiment Hub: {selectedTicker}</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-time news processing and algorithmic sentiment scoring</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={loadSentiment} 
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
          Refresh Feed
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '16px' }}>
          <RefreshCw size={40} className="glow-effect" style={{ animation: 'spin 2s linear infinite', color: 'var(--primary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Scraping news indexes and calculating compound metrics...</p>
        </div>
      ) : error ? (
        <div className="glass-card" style={{ borderColor: 'var(--danger)', padding: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
          <button className="btn btn-secondary" style={{ marginTop: '12px' }} onClick={loadSentiment}>Retry Fetch</button>
        </div>
      ) : !sentimentData ? (
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No sentiment data loaded yet.</p>
        </div>
      ) : (
        <div className="grid-3" style={{ gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          
          {/* Sentiment Meter Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compound Index</h4>
              
              {/* Dial Representation */}
              <div style={{
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                border: `8px solid rgba(255,255,255,0.03)`,
                borderTopColor: getDialColor(sentimentData.overall.overall_sentiment),
                transform: 'rotate(-45deg)', // decorative
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: 'var(--shadow-premium)'
              }}>
                <div style={{
                  transform: 'rotate(45deg)', // counteract parent
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <span style={{ 
                    fontSize: '2rem', 
                    fontWeight: 800, 
                    color: getDialColor(sentimentData.overall.overall_sentiment) 
                  }}>
                    {(sentimentData.overall.overall_sentiment * 100).toFixed(0)}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Range -100 to +100</span>
                </div>
              </div>

              {/* Sentiment Summary */}
              <div>
                <h3 style={{ fontSize: '1.2rem', color: getDialColor(sentimentData.overall.overall_sentiment) }}>
                  {getDialLabel(sentimentData.overall.overall_sentiment)}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Analyzed from {sentimentData.articles.length} news items.
                </p>
              </div>
            </div>

            {/* Breakdown distribution card */}
            <div className="glass-card">
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score Distribution</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Positive (Bullish) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--success)' }}>Bullish Articles</span>
                    <span>{sentimentData.overall.breakdown.positive} ({((sentimentData.overall.breakdown.positive / (sentimentData.articles.length || 1)) * 100).toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                    <div style={{ 
                      height: '100%', 
                      background: 'var(--success)', 
                      borderRadius: '3px',
                      width: `${(sentimentData.overall.breakdown.positive / (sentimentData.articles.length || 1)) * 100}%`
                    }} />
                  </div>
                </div>

                {/* Neutral */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--warning)' }}>Neutral Articles</span>
                    <span>{sentimentData.overall.breakdown.neutral} ({((sentimentData.overall.breakdown.neutral / (sentimentData.articles.length || 1)) * 100).toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                    <div style={{ 
                      height: '100%', 
                      background: 'var(--warning)', 
                      borderRadius: '3px',
                      width: `${(sentimentData.overall.breakdown.neutral / (sentimentData.articles.length || 1)) * 100}%`
                    }} />
                  </div>
                </div>

                {/* Negative (Bearish) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--danger)' }}>Bearish Articles</span>
                    <span>{sentimentData.overall.breakdown.negative} ({((sentimentData.overall.breakdown.negative / (sentimentData.articles.length || 1)) * 100).toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                    <div style={{ 
                      height: '100%', 
                      background: 'var(--danger)', 
                      borderRadius: '3px',
                      width: `${(sentimentData.overall.breakdown.negative / (sentimentData.articles.length || 1)) * 100}%`
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Articles Feed Column */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '550px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Recent Headline Analysis</h3>
            
            {sentimentData.articles.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p>No recent articles found for this ticker.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sentimentData.articles.map((article, idx) => {
                  const isPos = article.sentiment_score >= 0.15;
                  const isNeg = article.sentiment_score <= -0.15;
                  
                  return (
                    <div 
                      key={idx} 
                      className="glass-card interactive" 
                      style={{ 
                        padding: '16px', 
                        background: 'rgba(0,0,0,0.15)',
                        borderColor: isPos 
                          ? 'rgba(16, 185, 129, 0.15)' 
                          : isNeg 
                            ? 'rgba(239, 68, 68, 0.15)' 
                            : 'var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {article.publisher} • {article.date}
                        </span>
                        
                        {/* Score Badge */}
                        <span className={`badge ${isPos ? 'badge-success' : isNeg ? 'badge-danger' : 'badge-warning'}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isPos ? <ThumbsUp size={10} /> : isNeg ? <ThumbsDown size={10} /> : null}
                          {article.sentiment_label} ({(article.sentiment_score).toFixed(2)})
                        </span>
                      </div>
                      
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', lineHeight: 1.4, marginBottom: '6px' }}>
                        {article.title}
                      </h4>
                      
                      {article.summary && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>
                          {article.summary}
                        </p>
                      )}

                      <a 
                        href={article.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          fontSize: '0.75rem', 
                          color: 'var(--secondary)', 
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600
                        }}
                      >
                        Read Original Article
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

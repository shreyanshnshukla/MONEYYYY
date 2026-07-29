import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import re
from typing import List, Dict, Any

# Ensure VADER lexicon is downloaded
try:
    nltk.data.find('sentiment/vader_lexicon.zip')
except LookupError:
    try:
        nltk.download('vader_lexicon', quiet=True)
    except Exception as e:
        print(f"Failed to download NLTK vader_lexicon: {str(e)}. Using fallback analyzer.")

class SentimentAnalyzer:
    def __init__(self):
        self.sia = None
        try:
            self.sia = SentimentIntensityAnalyzer()
        except Exception:
            print("VADER analyzer could not be initialized. Fallback keyword-based matching will be used.")
            
        # Finance-specific positive and negative words for fallback sentiment analysis
        self.positive_keywords = {
            "bull", "bullish", "growth", "grow", "surge", "soar", "gain", "upward", "breakout", 
            "record", "rally", "profit", "profitable", "buy", "accumulate", "outperform", "support", 
            "climb", "high", "success", "innovative", "adoption", "positive", "strong"
        }
        self.negative_keywords = {
            "bear", "bearish", "crash", "plummet", "drop", "decline", "fall", "loss", "lose", 
            "losses", "slide", "deficit", "risk", "risky", "sell", "underperform", "resistance", 
            "fear", "panic", "dump", "investigation", "regulation", "lawsuit", "hack", "scam"
        }

    def _fallback_score(self, text: str) -> float:
        """
        Simple keyword-based sentiment scoring fallback.
        Returns a score in range [-1.0, 1.0].
        """
        text = text.lower()
        words = re.findall(r'\b\w+\b', text)
        if not words:
            return 0.0
            
        pos_count = sum(1 for w in words if w in self.positive_keywords)
        neg_count = sum(1 for w in words if w in self.negative_keywords)
        
        total = pos_count + neg_count
        if total == 0:
            return 0.0
            
        return (pos_count - neg_count) / total

    def analyze_text(self, text: str) -> float:
        """
        Analyzes the sentiment of a given string.
        Returns a compound score between -1.0 (very negative) and 1.0 (very positive).
        """
        if not text:
            return 0.0
            
        if self.sia:
            try:
                scores = self.sia.polarity_scores(text)
                return float(scores.get("compound", 0.0))
            except Exception:
                pass
                
        return self._fallback_score(text)

    def analyze_news_list(self, news_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Takes a list of news items (as formatted by data_fetcher) and performs sentiment scoring.
        Modifies items in place and returns aggregate scores.
        """
        if not news_items:
            return {
                "overall_sentiment": 0.0,
                "label": "Neutral",
                "breakdown": {"positive": 0, "neutral": 0, "negative": 0}
            }
            
        total_score = 0.0
        pos_count = 0
        neg_count = 0
        neutral_count = 0
        
        for item in news_items:
            # Combine title and summary for richer text analysis
            full_text = f"{item.get('title', '')}. {item.get('summary', '')}"
            score = self.analyze_text(full_text)
            item["sentiment_score"] = score
            
            # Categorize
            if score >= 0.15:
                item["sentiment_label"] = "Bullish"
                pos_count += 1
            elif score <= -0.15:
                item["sentiment_label"] = "Bearish"
                neg_count += 1
            else:
                item["sentiment_label"] = "Neutral"
                neutral_count += 1
                
            total_score += score
            
        avg_score = total_score / len(news_items)
        
        if avg_score >= 0.1:
            label = "Bullish"
        elif avg_score <= -0.1:
            label = "Bearish"
        else:
            label = "Neutral"
            
        return {
            "overall_sentiment": round(avg_score, 4),
            "label": label,
            "breakdown": {
                "positive": pos_count,
                "neutral": neutral_count,
                "negative": neg_count
            }
        }

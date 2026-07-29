import requests
import json

def test_get(url):
    print(f"Testing GET {url}...")
    try:
        r = requests.get(url, timeout=10)
        print(f"Response status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, dict):
                print(f"Keys returned: {list(data.keys())}")
            elif isinstance(data, list):
                print(f"List items returned: {len(data)} (first item keys: {list(data[0].keys()) if len(data) > 0 else 'empty'})")
            return True
        else:
            print(f"Failed with output: {r.text}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        return False

def test_post(url, payload):
    print(f"Testing POST {url}...")
    try:
        r = requests.post(url, json=payload, timeout=20)
        print(f"Response status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Keys returned: {list(data.keys())}")
            return True
        else:
            print(f"Failed with output: {r.text}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        return False

if __name__ == "__main__":
    base_url = "http://127.0.0.1:8000/api"
    
    # 1. Assets
    assert test_get(f"{base_url}/assets")
    
    # 2. Ticker details
    assert test_get(f"{base_url}/ticker/BTC-USD")
    
    # 3. Historical data
    assert test_get(f"{base_url}/historical/BTC-USD?period=1mo")
    
    # 4. Sentiment analysis
    assert test_get(f"{base_url}/sentiment/BTC-USD")
    
    # 5. Predict (using Random Forest)
    predict_payload = {
        "ticker": "BTC-USD",
        "model_type": "random_forest",
        "window_size": 30,
        "horizon": 7,
        "period": "1y"
    }
    assert test_post(f"{base_url}/predict", predict_payload)
    
    # 6. Portfolio Optimization
    optimize_payload = {
        "tickers": ["BTC-USD", "ETH-USD", "AAPL", "MSFT"],
        "period": "1y",
        "risk_free_rate": 0.02
    }
    assert test_post(f"{base_url}/optimize", optimize_payload)
    
    print("\n--- ALL ENDPOINTS PASSED VERIFICATION successfully ---")

import requests
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta, time as dt_time
import feedparser
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import json
from decimal import Decimal, ROUND_HALF_UP
import pymongo
import time
import os
from dotenv import load_dotenv

load_dotenv()

try:
    # VADER lexicon (sentiment analysis ke liye)
    nltk.data.find('sentiment/vader_lexicon.zip')
except LookupError:
    print("Downloading VADER lexicon...")
    nltk.download('vader_lexicon')
    
# --- CONFIGURATION (Sirf MongoDB) ---

# MongoDB Configuration
MONGO_URI = os.environ.get("MONGO_URI")
MONGO_DATABASE = "stock_analysis_cache"
MONGO_LIVE_QUOTES_COLLECTION = "live_quotes"
MONGO_FUNDAMENTAL_COLLECTION = "fundamental_cache"
MONGO_HISTORICAL_COLLECTION = "historical_data" 
MONGO_INTRADAY_1D_COLLECTION = "intraday_1d_data" # 1-Day Chart
MONGO_INTRADAY_5D_COLLECTION = "intraday_5d_data" # 1-Week Chart

#  CACHING TIMES (Final)
TTL_LIVE_QUOTE_SECONDS = 1800     # 30 Minutes for "Live" Price/Volume
TTL_INTRADAY_SECONDS = 1800       # 30 Minutes for 1-Day/1-Week Chart
TTL_FUNDAMENTAL_SECONDS = 1800    # 30 Minutes for Fundamental Data
TTL_HISTORICAL_SECONDS = 86400    # 24 Hours for Historical Data (6M, 1Y, 5Y charts)
# -----------------------------------------------

# MongoDB Client Initialization
MONGO_CLIENT = None
MONGO_DB = None
try:
    MONGO_CLIENT = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    MONGO_CLIENT.admin.command('ping') 
    MONGO_DB = MONGO_CLIENT[MONGO_DATABASE]
    print("MongoDB connection successful.")
except Exception as e:
    print(f"MongoDB connection failed. Check if server is running: {e}")

# Helper function to safely format large numbers
def format_large_number(value):
    if value is None or not isinstance(value, (int, float)): return 'N/A'
    if abs(value) >= 1_000_000_000:
        return f"{Decimal(value / 1_000_000_000).quantize(Decimal('0.01'), ROUND_HALF_UP)}B"
    if abs(value) >= 1_000_000:
        return f"{Decimal(value / 1_000_000).quantize(Decimal('0.01'), ROUND_HALF_UP)}M"
    return str(value)

# --- RELIABLE CACHING WRAPPER ---
def check_and_get_cached_data(collection_name, key, fetch_function, ttl_seconds):
    """Reliable caching logic with stale data fallback."""
    if MONGO_DB is None: 
        return fetch_function()
        
    collection = MONGO_DB[collection_name]
    result = collection.find_one({"key": key})
    
    is_stale = True
    if result:
        last_fetch_time = datetime.strptime(result['timestamp'], '%Y-%m-%d %H:%M:%S')
        if datetime.now() < last_fetch_time + timedelta(seconds=ttl_seconds):
            is_stale = False
    
    if not is_stale:
        return result['data']
    
    new_data = fetch_function()
    
    if new_data is not None and not new_data.get('error'):
        current_time_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        document = {"key": key, "data": new_data, "timestamp": current_time_str}
        collection.replace_one({"key": key}, document, upsert=True)
        return new_data
    else:
        if result:
            print(f"WARNING: yfinance fetch failed for {key}. Serving stale data from cache.")
            return result['data']
        else:
            print(f"ERROR: yfinance fetch failed for {key} and no cache available.")
            return new_data 


# --- YFINANCE DATA FETCHING (Live/EOD) ---

def _fetch_yfinance_live_data_internal(ticker_symbol):
    """yfinance se 'live' (delayed) quote fetch karta hai."""
    nse_ticker = ticker_symbol + ".NS"
    try:
        ticker = yf.Ticker(nse_ticker)
        info = ticker.info
        
        price = info.get('regularMarketPrice', info.get('currentPrice'))
        volume = info.get('regularMarketVolume', info.get('volume'))
        prev_close = info.get('previousClose')

        if price and volume and prev_close:
            return {
                "Close": price, 
                "Volume": volume, 
                "Previous_Close": prev_close,
            }
        else:
            return {'error': True, 'message': 'Yfinance info data incomplete.'}
            
    except Exception as e:
        return {'error': True, 'message': str(e)}

def get_yfinance_live_quote(ticker_symbol: str):
    """Live/EOD quote ko 30-minute cache ke saath fetch karta hai."""
    return check_and_get_cached_data(
        MONGO_LIVE_QUOTES_COLLECTION,
        ticker_symbol,
        lambda: _fetch_yfinance_live_data_internal(ticker_symbol),
        TTL_LIVE_QUOTE_SECONDS 
    )

# --- YFINANCE (HISTORICAL AND FUNDAMENTAL) ---

def is_market_open():
    """Checks if the Indian stock market (NSE) is currently open."""
    now = datetime.now()
    market_start = dt_time(9, 15, 0)
    market_end = dt_time(15, 30, 0)
    if now.weekday() >= 5: return False 
    current_time = now.time()
    return market_start <= current_time <= market_end

def _fetch_yfinance_historical_data(ticker_symbol, days_back=200):
    """yfinance se NSE historical (Daily) data fetch karta hai."""
    nse_ticker = ticker_symbol + ".NS"  
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')
    
    try:
        data = yf.download(nse_ticker, start=start_date, end=end_date, progress=False, auto_adjust=True)
        if data.empty: 
            return {'error': True, 'message': 'Yfinance historical data empty.'}
            
        if isinstance(data.columns, pd.MultiIndex): data.columns = data.columns.droplevel(1)
        
        data.columns = [col.strip() for col in data.columns]
        data = data[['Close', 'Volume']].copy() 
        
        return json.loads(data.to_json(orient='table'))
        
    except Exception as e:
        print(f"Yfinance Historical Data Error for {ticker_symbol}: {e}")
        return {'error': True, 'message': str(e)}

def get_stock_data(ticker_symbol, days_back=200):
    """Historical (Daily) data ko 24-hour cache ke saath fetch karta hai."""
    key = f"{ticker_symbol}_{days_back}"
    
    data_json = check_and_get_cached_data(
        MONGO_HISTORICAL_COLLECTION,
        key,
        lambda: _fetch_yfinance_historical_data(ticker_symbol, days_back),
        TTL_HISTORICAL_SECONDS
    )
    
    if data_json and not data_json.get('error'):
        return pd.read_json(json.dumps(data_json), orient='table')
    
    return None 

# 🟢 1-Day/5-Day Intraday Data Fetcher (Graph Fix)
def _fetch_yfinance_intraday_data(ticker_symbol, period="1d", interval="5m"):
    """1-Day/5-Day chart ke liye yfinance se intraday data fetch karta hai."""
    nse_ticker = ticker_symbol + ".NS"
    try:
        # 🟢 FIX: 1d ke liye explicit date range (zyada reliable)
        if period == "1d":
            end_date = datetime.now()
            start_date = end_date.replace(hour=9, minute=15, second=0, microsecond=0)
            
            if datetime.now().time() < dt_time(9, 15, 0):
                 start_date = (end_date - timedelta(days=1)).replace(hour=9, minute=15, second=0, microsecond=0)
                 end_date = (end_date - timedelta(days=1)).replace(hour=15, minute=30, second=0, microsecond=0)
            
            data = yf.download(
                nse_ticker, start=start_date, end=end_date, 
                interval=interval, progress=False, auto_adjust=True
            )
        else:
            # 5d ke liye standard period
            data = yf.download(
                nse_ticker, period=period, interval=interval, 
                progress=False, auto_adjust=True
            )
        
        if data.empty:
            print(f"Yfinance Intraday: No {period} data found for {ticker_symbol}")
            return {'error': True, 'message': f'No {period} intraday data found.'}
        
        data.reset_index(inplace=True)
        
        date_col = 'Datetime' if 'Datetime' in data.columns else 'index'
        data.rename(columns={date_col: 'date'}, inplace=True)
        
        data['date'] = data['date'].dt.strftime('%Y-%m-%dT%H:%M:%S')
        data = data[['date', 'Close']]
        
        return json.loads(data.to_json(orient='table'))
        
    except Exception as e:
        print(f"Yfinance Intraday Fetch Error for {ticker_symbol}: {e}")
        return {'error': True, 'message': str(e)}

def get_intraday_data_1d(ticker_symbol: str):
    """1-Day chart data ko 30-minute cache ke saath fetch karta hai."""
    return check_and_get_cached_data(
        MONGO_INTRADAY_1D_COLLECTION,
        f"{ticker_symbol}_1d",
        lambda: _fetch_yfinance_intraday_data(ticker_symbol, period="1d", interval="5m"),
        TTL_INTRADAY_SECONDS
    )

def get_intraday_data_5d(ticker_symbol: str):
    """1-Week (5d) chart data ko 30-minute cache ke saath fetch karta hai."""
    return check_and_get_cached_data(
        MONGO_INTRADAY_5D_COLLECTION,
        f"{ticker_symbol}_5d",
        lambda: _fetch_yfinance_intraday_data(ticker_symbol, period="5d", interval="15m"),
        TTL_INTRADAY_SECONDS
    )

def _fetch_basic_fundamental_data_live(ticker_symbol):
    """yfinance se stock ka basic fundamental data fetch karta hai."""
    nse_ticker = ticker_symbol + ".NS"
    fundamental_details = {}
    
    try:
        ticker = yf.Ticker(nse_ticker)
        info = ticker.info
        
        market_cap_val = info.get('marketCap')
        if market_cap_val:
            fundamental_details['MarketCap'] = f"₹{Decimal(market_cap_val / 10_000_000).quantize(Decimal('0.01'), ROUND_HALF_UP)} Cr"
        else:
            fundamental_details['MarketCap'] = 'N/A'

        fundamental_details['TrailingPE'] = round(info.get('trailingPE'), 2) if info.get('trailingPE') else 'N/A'
        fundamental_details['ForwardPE'] = round(info.get('forwardPE'), 2) if info.get('forwardPE') else 'N/A'
        
        # 🟢 KEY METRICS FIX: Debt/Equity ki sahi calculation
        debt_equity_ratio = info.get('debtToEquity')
        
        if debt_equity_ratio is not None:
            fundamental_details['DebtToEquity'] = round(debt_equity_ratio / 100, 2)
        else:
            fundamental_details['DebtToEquity'] = 'N/A'

        if fundamental_details['MarketCap'] != 'N/A':
            return fundamental_details
        else:
            return {'error': True, 'message': 'Market Cap not found'}

    except Exception as e:
        print(f"Error fetching Fundamental data for {ticker_symbol}: {e}")
        return {'error': True, 'message': str(e)}
        
def get_basic_fundamental_data(ticker_symbol):
    """Fundamental data ko 30-MINUTE cache ke saath fetch karta hai."""
    return check_and_get_cached_data(
        MONGO_FUNDAMENTAL_COLLECTION,
        ticker_symbol,
        lambda: _fetch_basic_fundamental_data_live(ticker_symbol),
        TTL_FUNDAMENTAL_SECONDS # 30 minutes (1800s)
    )
        
def get_nifty_50_tickers_dynamic():
    """Wikipedia se Nifty 50 current list scrape karta hai."""
    try:
        url = "https://en.wikipedia.org/wiki/NIFTY_50"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data_list = pd.read_html(response.content)  
            nifty_table = data_list[1]  
            tickers = nifty_table['Symbol'].tolist()[:30] 
            return tickers
        else:
            raise Exception(f"Request failed with status code: {response.status_code}")

    except Exception as e:
        print(f"Error fetching dynamic Nifty 50 list: {e}. Using hardcoded backup.")
        return ["RELIANCE", "TCS", "HDFCBANK", "INFY", "SBIN", "ICICIBANK", "LT", "HINDUNILVR", "BAJFINANCE", "ADANIPORTS"]


def _fetch_latest_news_and_analyze(query):
    """Google News se latest news fetch karke VADER sentiment analysis karta hai."""
    search_query = f"{query} stock market India"
    rss_url = f"https://news.google.com/rss/search?q={search_query.replace(' ', '+')}&hl=en-IN&gl=IN&ceid=IN:en"
    news_list = []
    
    try:
        feed = feedparser.parse(rss_url)
        for entry in feed.entries[:5]:
            news_list.append({"title": entry.title, "source": entry.source.title if hasattr(entry, 'source') else 'Unknown', "link": entry.link, "published": entry.published_parsed})
        
        if not news_list:
            return {"sentiment": "Neutral", "score": 0.0, "news_count": 0, "news_headlines": []}
            
        analyser = SentimentIntensityAnalyzer()
        compound_scores = []
        news_headlines = []
        for news in news_list:
            title_score = analyser.polarity_scores(news['title'])
            compound_scores.append(title_score['compound'])
            news_headlines.append({"title": news['title'], "source": news['source'], "link": news['link']})
        avg_score = sum(compound_scores) / len(compound_scores)
        
        if avg_score >= 0.1: sentiment = "Positive"
        elif avg_score <= -0.1: sentiment = "Negative"
        else: sentiment = "Neutral"
            
        return {"sentiment": sentiment, "score": round(avg_score, 4), "news_count": len(news_list), "news_headlines": news_headlines}

    except Exception as e:
        print(f"Error while fetching news/analysis: {e}")
        return {"error": True, "message": str(e)}


def analyze_news_sentiment(query):
    """News list par VADER sentiment analysis karta hai (NO CACHE)."""
    return _fetch_latest_news_and_analyze(query)


# ===============================================
# C. ANALYSIS FUNCTIONS (Trending, Sentiment, Advice)
# ===============================================

def find_trending_stocks():
    """
    Volume aur momentum ke basis par trending stocks find karta hai.
    Sabhi data (Live/EOD, Historical) Yfinance se (cached) aata hai.
    """
    
    market_open = is_market_open() 
    tickers_list = get_nifty_50_tickers_dynamic()
    
    DELAY_PER_TICKER_SECONDS = 1.5
    
    try:
        trending_list = []
        
        for ticker in tickers_list:
            try:
                live_data = get_yfinance_live_quote(ticker) 
                historical_data = get_stock_data(ticker, days_back=30) 

                print(f"[{ticker}] Data fetched. Waiting {DELAY_PER_TICKER_SECONDS}s for rate limit...")
                time.sleep(DELAY_PER_TICKER_SECONDS)

                if live_data is None or live_data.get('error') or historical_data is None: 
                    if live_data and live_data.get('error'):
                        print(f"Skipping {ticker} due to Yfinance Live error: {live_data.get('message')}")
                    else:
                        print(f"Skipping {ticker}: Yfinance historical data failed.")
                    continue

                # --- Data Extraction ---
                try:
                    current_volume = live_data.get('Volume', 0)
                    latest_price = live_data.get('Close', 0)
                    prev_close = live_data.get('Previous_Close', 0)
                    
                    source_text = "Live (Yfinance)" if market_open else "EOD (Yfinance)"
                    
                    historical_data['Volume_Avg_20d'] = historical_data['Volume'].rolling(window=20).mean()
                    avg_volume = historical_data['Volume_Avg_20d'].iloc[-1]
                        
                except Exception as e:
                    print(f"Skipping {ticker}: Error extracting volume data. {e}")
                    continue 

                if pd.isna(avg_volume) or avg_volume == 0:
                    print(f"Skipping {ticker}: Historical Average Volume is Zero/Missing.")
                    continue

                if current_volume is None or current_volume == 0:
                    current_volume = 1 

                volume_increase = current_volume / avg_volume

                start_price = historical_data['Close'].iloc[-5] 
                end_price = latest_price 
                    
                if pd.isna(start_price) or start_price == 0:
                    price_change_5d = 0
                else:
                    price_change_5d = ((end_price - start_price) / start_price) * 100
                    
                
                # --- VOLUME FILTER (TRENDING CRITERIA) ---
                if True: # Testing ke liye hamesha True
                    
                    try:
                        ticker_obj = yf.Ticker(ticker + ".NS")
                        long_name = ticker_obj.info.get('longName', ticker + " Ltd.")
                    except:
                        long_name = ticker + " Ltd."

                    if prev_close and latest_price:
                        today_change_percent = ((latest_price - prev_close) / prev_close) * 100
                    else:
                        today_change_percent = 0.0

                    reason_text = (f"Volume ({round(current_volume, 0)}) vs Avg ({round(avg_volume, 0)}) - Momentum ({round(price_change_5d, 2)}%) (Source: {source_text})")
                        
                    trending_list.append({
                        "ticker": ticker, "name": long_name, "current_price": round(latest_price, 2),
                        "today_change_percent": round(today_change_percent, 2), "volume_factor": round(volume_increase, 2),
                        "price_change_5d": round(price_change_5d, 2), "reason": reason_text
                    })
            
            except Exception as ticker_e:
                print(f"Error processing ticker {ticker}: {ticker_e}") 
                continue

        trending_list.sort(key=lambda x: x['volume_factor'], reverse=True)
        return json.dumps(trending_list[:30])
    
    except Exception as e:
        print(f"FATAL ERROR in find_trending_stocks function: {e}")
        return json.dumps([])


def generate_investment_advice(ticker_symbol):
    """
    Generate AI-based investment advice for a given stock ticker.
    Sabhi data Yfinance se (cached) aata hai.
    """

    # 1. Data Fetching
    price_data_long = get_stock_data(ticker_symbol, days_back=1825)
    price_data_short = get_stock_data(ticker_symbol, days_back=200)

    # 🟢 NEW: 1-Day Chart Data (30-min cached)
    intraday_data_1d_json = get_intraday_data_1d(ticker_symbol)
    
    # 🟢 NEW: 1-Week Chart Data (30-min cached)
    intraday_data_5d_json = get_intraday_data_5d(ticker_symbol)

    # Latest Data (30-min cached)
    live_data = get_yfinance_live_quote(ticker_symbol)
    
    # Fundamental Data (30-min cached)
    fundamental_data = get_basic_fundamental_data(ticker_symbol) 
    
    # Sentiment Data (NO CACHE)
    news_sentiment = analyze_news_sentiment(ticker_symbol) 

    # Fallback Logic:
    eod_price = price_data_short['Close'].iloc[-1] if price_data_short is not None and not price_data_short.empty else None
    latest_price = live_data.get('Close') if live_data and not live_data.get('error') else eod_price
    
    price_data = price_data_short

    # 🟢 FIX: today_change_percent ko calculate karna
    prev_close = live_data.get('Previous_Close') if live_data and not live_data.get('error') else (price_data_short['Close'].iloc[-2] if price_data_short is not None and len(price_data_short) > 1 else eod_price)
    
    today_change_percent = 0.0
    if latest_price and prev_close:
        today_change_percent = ((latest_price - prev_close) / prev_close) * 100

    # --- Check for minimum data for analysis ---
    if price_data is None or price_data.shape[0] < 50 or latest_price is None:
        advice_details = {
            "advice": "HOLD", "reason_summary": "Not enough data (price history/latest price) for Technical Analysis.",
            "risk_level": "Medium",
            "fundamentals": fundamental_data if fundamental_data else {"status": "Fundamental data unavailable."},
            "sentiment_score": news_sentiment.get('score', 0), "sentiment_status": news_sentiment.get('sentiment', "Unknown"),
            "latest_news": news_sentiment.get('latest_news', []), "historical_data": {}, "additional_metrics": {},
            "latest_price": latest_price or 0,
            "today_change_percent": today_change_percent
        }
        return advice_details
    
    _close_prices = price_data_short['Close'].iloc[-250:] if not price_data_short.empty else pd.Series()
    additional_metrics = {
        "52W High": f"₹{_close_prices.max().round(2)}" if not _close_prices.empty else 'N/A',
        "52W Low": f"₹{_close_prices.min().round(2)}" if not _close_prices.empty else 'N/A',
    }

    historical_data_for_frontend = {}

    # 🟢 FIX FOR 1-DAY GRAPH (DOT PROBLEM)
    if intraday_data_1d_json and not intraday_data_1d_json.get('error'):
        historical_data_for_frontend['1 Day'] = [
            {'date': row['date'], 'price': row['Close']} 
            for row in intraday_data_1d_json['data']
        ]
    else:
         historical_data_for_frontend['1 Day'] = [{'date': price_data_long.index[-1].strftime('%Y-%m-%d'), 'price': price_data_long['Close'].iloc[-1]}]

    # 🟢 FIX FOR 1-WEEK GRAPH (MISMATCH PROBLEM)
    if intraday_data_5d_json and not intraday_data_5d_json.get('error'):
        historical_data_for_frontend['1 Week'] = [
            {'date': row['date'], 'price': row['Close']} 
            for row in intraday_data_5d_json['data']
        ]
    else:
        # Fallback (Purana 'Daily' wala logic)
        historical_data_for_frontend['1 Week'] = [{'date': date.strftime('%Y-%m-%d'), 'price': price} for date, price in price_data_long['Close'].iloc[-5:].items()]


    if price_data_long is not None and not price_data_long.empty:
        def extract_slice_trading_days(df, trading_days):
            if trading_days <= len(df):
                return df['Close'].iloc[-trading_days:]
            return df['Close']

        # 6M, 1Y, 5Y (Yeh Daily data use karte hain, jo sahi tha)
        historical_data_for_frontend['6 Months'] = [{'date': date.strftime('%Y-%m-%d'), 'price': price} for date, price in extract_slice_trading_days(price_data_long, 120).items()]
        historical_data_for_frontend['1 Year'] = [{'date': date.strftime('%Y-%m-%d'), 'price': price} for date, price in extract_slice_trading_days(price_data_long, 250).items()]
        historical_data_for_frontend['5 Year'] = [{'date': date.strftime('%Y-%m-%d'), 'price': price} for date, price in price_data_long['Close'].items()]

    price_data['MA50'] = price_data['Close'].rolling(window=50).mean()
    current_price = latest_price 
    ma50_value = price_data['MA50'].iloc[-1]
    technical_signal = (current_price > ma50_value)

    pe_val = fundamental_data.get('TrailingPE') if fundamental_data else None
    de_val = fundamental_data.get('DebtToEquity') if fundamental_data else 'N/A' 
    
    is_pe_low = isinstance(pe_val, (int, float)) and pe_val < 30
    is_de_low = isinstance(de_val, (int, float)) and de_val < 1.0

    if technical_signal and news_sentiment.get('sentiment') == "Positive" and is_pe_low and is_de_low:
        advice = "STRONG BUY"
        reason_summary = (f"Price Above MA50 ({round(ma50_value, 2)}), Fundamentals Strong (PE:{pe_val}, D/E:{de_val}), and News Sentiment is Positive.")
        risk_level = "Low"
    elif (not technical_signal) and news_sentiment.get('sentiment') == "Negative" and isinstance(pe_val, (int, float)) and pe_val > 50:
        advice = "AVOID / SELL"
        reason_summary = (f"Price Below MA50 ({round(ma50_value, 2)}), News Negative, and High PE ({pe_val}).")
        risk_level = "High"
    else:
        advice = "HOLD / CAUTION"
        reason_summary = "Signals are mixed or incomplete. Further research is recommended."
        risk_level = "Medium"

    return {
        "advice": advice, "reason_summary": reason_summary, "risk_level": risk_level,
        "fundamentals": fundamental_data if fundamental_data else {"status": "Fundamental data unavailable."},
        "sentiment_score": news_sentiment.get('score', 0), "sentiment_status": news_sentiment.get('sentiment', "Unknown"),
        "latest_news": news_sentiment['news_headlines'], "historical_data": historical_data_for_frontend, "additional_metrics": additional_metrics,
        # 🟢 FIX: Live data ko response mein bhejna
        "latest_price": latest_price,
        "today_change_percent": today_change_percent
    }
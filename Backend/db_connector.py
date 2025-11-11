from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Get MongoDB connection string
MONGO_URI = os.getenv("MONGO_URI")

# Global client and database handles
client = None
db = None

if not MONGO_URI:
    print("FATAL: MONGO_URI not set. Database features will be disabled.")
else:
    try:
        # Establish and verify MongoDB connection
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        db = client.stock_analysis_db
        print("MongoDB connection successful.")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        client = None
        db = None

# Collections used across the project
if db:
    TICKERS_COLLECTION = db.tickers_list
    ANALYSIS_CACHE_COLLECTION = db.analysis_cache
else:
    TICKERS_COLLECTION = None
    ANALYSIS_CACHE_COLLECTION = None
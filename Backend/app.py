from flask import Flask, jsonify, request
from flask_cors import CORS
from stock_analysis_service import generate_investment_advice, find_trending_stocks
import json

app = Flask(__name__)
CORS(app)

# ================================
# 1. Full Investment Analysis API
# ================================
@app.route('/api/full-analysis/<symbol>', methods=['GET'])
def full_analysis_api(symbol):
    """Returns full stock analysis (technical, fundamental, sentiment)."""
    print(f"[Request] Full Analysis for: {symbol}")
    
    analysis_result = generate_investment_advice(symbol.upper())
    if 'error' in analysis_result:
        print(f"[Error] {analysis_result['error']}")
        return jsonify({"error": analysis_result['error']}), 500
        
    print("[Success] Full Analysis Complete.")
    return jsonify(analysis_result), 200


# ================================
# 2. Trending Stocks API
# ================================
@app.route('/api/trending-stocks', methods=['GET'])
def trending_stocks_api():
    """Returns list of trending stocks based on volume and momentum."""
    print("[Request] Finding Trending Stocks...")
    
    try:
        trending_json_string = find_trending_stocks()
        trending_data = json.loads(trending_json_string)

        if not trending_data:
            print("[Info] No trending stocks found.")
            return jsonify({
                "success": True,
                "message": "No major trending stocks found.",
                "results": []
            }), 200

        print("[Success] Trending Stocks Found.")
        return jsonify({
            "success": True,
            "message": "Trending stocks list.",
            "results": trending_data
        }), 200
        
    except Exception as e:
        print(f"[Critical Error] {e}")
        return jsonify({
            "success": False,
            "message": f"Backend processing failed: {e}",
            "results": []
        }), 500


# ================================
# 3. Server Start
# ================================
if __name__ == '__main__':
    print("\n===========================================")
    print(" FLASK SERVER STARTING...")
    print(" Backend URL: http://127.0.0.1:5000")
    print(" Routes:")
    print("   • /api/full-analysis/<symbol>")
    print("   • /api/trending-stocks")
    print("===========================================\n")
    app.run(debug=True, port=5000, use_reloader=False)
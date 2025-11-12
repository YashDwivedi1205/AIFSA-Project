'use client';

import { Search, Loader2, AlertCircle, TrendingUp, Clock, Zap, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// --- INTERFACES ---
interface ChartDataPoint {
  date: string;
  price: number;
}
interface FullAnalysisData {
  advice: string;
  reason_summary: string;
  risk_level: string;
  fundamentals: {
    MarketCap: string;
    TrailingPE: number | string;
    ForwardPE: number | string;
    DebtToEquity: number | string;
  };
  sentiment_score: number;
  sentiment_status: string;
  latest_news: { title: string; source: string; link: string }[];
  historical_data: {
    '1 Day': ChartDataPoint[];
    '1 Week': ChartDataPoint[];
    '6 Months': ChartDataPoint[];
    '1 Year': ChartDataPoint[];
    '5 Year': ChartDataPoint[];
  };
  additional_metrics: {
    '52W High': string;
    '52W Low': string;
  };
  latest_price: number;
  today_change_percent: number;
}

// --- DATA FETCHING (Full Analysis) ---
async function getFullAnalysis(ticker: string): Promise<FullAnalysisData | null> {
  const API_URL = `https://aifsa.onrender.com/api/full-analysis/${ticker}`;
  try {
    const response = await fetch(API_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(
        `Full Analysis fetch error: ${response.statusText} (${response.status})`
      );
    }
    const result: FullAnalysisData = await response.json();
    if (result.advice === "HOLD" && result.reason_summary.includes("Not enough data")) {
        throw new Error("Data not found for this ticker in yfinance.");
    }
    return result;
  } catch (error) {
    console.error('Full Analysis Data Fetching Error:', error);
    return null;
  }
}


// --- StockDetails Component (showing data) ---
const StockDetailsView = ({ stock, data, onBack }: { stock: {ticker: string, name: string}, data: FullAnalysisData, onBack: () => void }) => {
  const [analysisData] = useState<FullAnalysisData | null>(data);
  const [activeTimeframe, setActiveTimeframe] = useState<'1 Day' | '1 Week' | '6 Months' | '1 Year' | '5 Year'>('1 Day');

  const isPositive = analysisData ? analysisData.today_change_percent >= 0 : false;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const ArrowIcon = isPositive ? ArrowUp : ArrowDown;

  // Chart Data Logic
  const chartData = {
    labels: analysisData?.historical_data[activeTimeframe].map(d => d.date) || [],
    datasets: [
      {
        label: 'Price (₹)',
        data: analysisData?.historical_data[activeTimeframe].map(d => d.price) || [],
        borderColor: isPositive ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)', // Green/Red
        backgroundColor: isPositive ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)',
        borderWidth: 2,
        pointRadius: 1,
        fill: true,
        tension: 0.1,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'category', 
        ticks: {
          color: '#4B5563', 
          maxTicksLimit: activeTimeframe === '1 Day' || activeTimeframe === '1 Week' ? 10 : 12,
        },
        grid: {
          display: false,
        }
      },
      y: {
        ticks: {
          color: '#4B5563',
        },
        grid: {
          color: '#E5E7EB',
        }
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };
  
  const timeframes: ('1 Day' | '1 Week' | '6 Months' | '1 Year' | '5 Year')[] = ['1 Day', '1 Week', '6 Months', '1 Year', '5 Year'];

  // Key Metrics
  const metrics = analysisData ? [
    { label: 'Market Cap', value: analysisData.fundamentals.MarketCap },
    { label: 'P/E Ratio', value: analysisData.fundamentals.TrailingPE },
    { label: 'Forward P/E', value: analysisData.fundamentals.ForwardPE },
    { label: 'Debt/Equity', value: analysisData.fundamentals.DebtToEquity },
    { label: '52W High', value: analysisData.additional_metrics['52W High'] },
    { label: '52W Low', value: analysisData.additional_metrics['52W Low'] },
  ] : [];

  return (
    <div className="max-w-4xl mx-auto mt-8">
      {analysisData && (
          <>
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-xl mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-extrabold text-gray-900">{stock.name}</h1>
                  <p className="text-xl font-semibold text-indigo-600">{stock.ticker}</p>
                </div>
                
                <div className="text-right">
                  <p className="text-4xl font-extrabold text-gray-900">
                    ₹{analysisData.latest_price.toFixed(2)}
                  </p>
                  <div className={`flex items-center justify-end text-lg font-bold ${changeColor}`}>
                    <ArrowIcon className="w-5 h-5" />
                    {analysisData.today_change_percent.toFixed(2)}%
                  </div>
                </div>
                
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-xl mb-6">
              <div className="h-96">
                <Line options={chartOptions} data={chartData} />
              </div>
              <div className="flex justify-center space-x-2 mt-4">
                {timeframes.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setActiveTimeframe(tf)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      activeTimeframe === tf 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="bg-white p-6 rounded-2xl shadow-xl mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Key Financial Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {metrics.map((metric) => (
                  <div key={metric.label} className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">{metric.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
    </div>
  );
};


// --- MAIN PAGE COMPONENT (Search Bar) ---
function SingleStockSearchPage() {
  const [ticker, setTicker] = useState('');
  const [analysisData, setAnalysisData] = useState<FullAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ROUTING FIX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tickerFromUrl = params.get('ticker');

    if (tickerFromUrl) {
      setTicker(tickerFromUrl);
      handleSearch(tickerFromUrl); //search automatically if URl contains ticker
    }
  }, []);

  const handleSearch = async (searchTicker: string) => {
    if (!searchTicker) {
      setError("Please enter a stock ticker (e.g., RELIANCE).");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisData(null); // clearing old data
    
    // updating URL
    window.history.pushState({ stockTicker: searchTicker }, '', `?ticker=${searchTicker}`);

    const data = await getFullAnalysis(searchTicker.toUpperCase());

    if (data) {
      setAnalysisData(data);
    } else {
      setError(`Failed to load data for ${searchTicker}. Check the ticker or try again.`);
    }
    setIsLoading(false);
  };

  const handleBack = () => {
    setAnalysisData(null);
    setError(null);
    setTicker('');
    window.history.pushState(null, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="bg-white p-6 rounded-2xl shadow-xl mb-8">
          
          {analysisData && (
            <button 
              onClick={handleBack} 
              className="mb-4 flex items-center text-indigo-600 font-semibold hover:text-indigo-800"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              New Search
            </button>
          )}

          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
            Single Stock Analysis
          </h1>
          <p className="text-gray-600 mb-4">
            Shows (delayed) data, fundamentals, aur graphs of any NSE Stock. (Data source: Yfinance)
          </p>
          
          {!analysisData && (
            <div className="flex space-x-2">
              <input 
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="E.g., RELIANCE, TCS, INFY..."
                className="flex-grow p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(ticker)}
              />
              <button
                onClick={() => handleSearch(ticker)}
                disabled={isLoading}
                className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </div>
          )}
        </header>

        <main>
          {/* Loading Spinner */}
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
              <p className="ml-4 text-lg text-gray-700">Fetching data for {ticker}...</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex flex-col items-center justify-center p-10 bg-red-50 rounded-xl border border-red-300 shadow-lg">
              <AlertCircle className="w-10 h-10 text-red-600 mb-4" />
              <h2 className="text-xl font-bold text-red-800">
                Error
              </h2>
              <p className="text-red-700 mt-2 text-center">
                {error}
              </p>
            </div>
          )}

          {/* Data Display */}
          {analysisData && (
            <StockDetailsView 
              stock={{ ticker: ticker.toUpperCase(), name: analysisData.fundamentals.MarketCap ? ticker.toUpperCase() : "Stock Details" }} 
              data={analysisData} 
              onBack={handleBack} 
            />
          )}

        </main>
      </div>
    </div>
  );
}

// SINGLE DEFAULT EXPORT
export default SingleStockSearchPage;
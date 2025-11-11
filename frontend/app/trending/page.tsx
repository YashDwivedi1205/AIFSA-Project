'use client';

import { TrendingUp, Clock, Zap, ArrowUp, ArrowDown } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import StockSlideshowClient from '../../components/StockScene';
import StockDetails from '../../components/StockDetails';

// --- INTERFACES ---
interface TrendingStock {
  ticker: string;
  name: string;
  current_price: number;
  today_change_percent: number;
  volume_factor: number;
  price_change_5d: number;
  reason: string;
}

export interface RankedTrendingStock extends TrendingStock {
  rank: number;
}

interface ApiResponse {
  success: boolean;
  message: string;
  results: TrendingStock[];
}

// --- DATA FETCHING ---
async function getTrendingStocks(): Promise<RankedTrendingStock[]> {
  const API_URL = 'http://localhost:5000/api/trending-stocks';
  try {
    const response = await fetch(API_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(
        `Problem fetching data from API: ${response.statusText} (${response.status})`
      );
    }
    const result: ApiResponse = await response.json();
    if (!result.success) {
      throw new Error(`API returned failure status: ${result.message}`);
    }
    const rankedData: RankedTrendingStock[] = (result.results || []).map(
      (stock, index) => ({
        ...stock,
        rank: index + 1,
      })
    );
    return rankedData;
  } catch (error) {
    console.error('Data Fetching Error:', error);
    return [];
  }
}

// --- STOCK ITEM COMPONENT ---
interface StockItemProps {
  stock: RankedTrendingStock;
  onViewDetail: (stock: RankedTrendingStock) => void;
}

const StockItem: React.FC<StockItemProps> = ({ stock, onViewDetail }) => {
  const isPositive = stock.today_change_percent >= 0;
  const changeColor = isPositive
    ? 'text-green-600 bg-green-50'
    : 'text-red-600 bg-red-50';
  const ArrowIcon = isPositive ? ArrowUp : ArrowDown;

  return (
    <div
      className="flex flex-col p-4 bg-white hover:bg-indigo-50 transition duration-200 rounded-xl shadow-lg border border-gray-100 cursor-pointer"
      onClick={() => onViewDetail(stock)}
    >
      <div className="flex justify-between items-center pb-2 border-b border-indigo-100 mb-2">
        <div className="flex items-center space-x-3">
          <span className="text-2xl font-extrabold w-8 text-center text-indigo-700 p-1 bg-indigo-100 rounded-lg shadow-inner">
            {stock.rank}
          </span>
          <p className="text-xl font-bold text-gray-900">{stock.ticker}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-gray-900">
            ₹{stock.current_price.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-medium text-gray-700 truncate max-w-[150px] md:max-w-[200px]">
          {stock.name}
        </p>
        <div
          className={`flex items-center justify-end text-base font-bold px-2 py-0.5 rounded-lg ${changeColor}`}
        >
          <ArrowIcon className="w-4 h-4 mr-1" />
          {stock.today_change_percent.toFixed(2)}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-600 pt-2 border-t border-gray-100">
        <div className="flex items-center">
          <Zap className="w-4 h-4 mr-1 text-red-500" />
          Volume Surge:{' '}
          <span className="ml-1 font-semibold text-gray-800">
            {stock.volume_factor.toFixed(2)}X
          </span>
        </div>
        <div className="flex items-center justify-end text-right">
          <Clock className="w-4 h-4 mr-1 text-blue-500" />
          5D Momentum:{' '}
          <span
            className={`ml-1 font-semibold ${
              stock.price_change_5d >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {stock.price_change_5d.toFixed(2)}%
          </span>
        </div>
        <div className="col-span-2 text-center mt-2 p-2 bg-gray-50 rounded-md text-sm text-indigo-700 font-semibold">
          Reason: {stock.reason}
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
function TrendingPageClient() {
  const [stocks, setStocks] = useState<RankedTrendingStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStock, setSelectedStock] =
    useState<RankedTrendingStock | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const fetchedStocks = await getTrendingStocks();
      setStocks(fetchedStocks);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const top5Stocks = stocks.slice(0, 5);
  const remainingStocks = stocks.slice(5);
  const hasData = stocks.length > 0;
  const stockCountText = hasData
    ? `Top ${stocks.length} Trending Indian Stocks`
    : 'No Trending Stocks Found';

  const handleViewDetail = useCallback((stock: RankedTrendingStock) => {
    setSelectedStock(stock);
    window.history.pushState({ stockTicker: stock.ticker }, '', `?ticker=${stock.ticker}`);
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!event.state || !event.state.stockTicker) {
        setSelectedStock(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleBackToList = () => {
    setSelectedStock(null);
    window.history.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl font-semibold text-indigo-600 animate-pulse">
          Loading Trending Stocks...
        </p>
      </div>
    );
  }

  if (selectedStock) {
    return <StockDetails stock={selectedStock} onBack={handleBackToList} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="bg-white p-6 rounded-2xl shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 mr-3 text-indigo-600" />
            <h1 className="text-3xl font-extrabold text-gray-900">
              {stockCountText}
            </h1>
          </div>
        </header>

        <main>
          {!hasData && (
            <div className="flex flex-col items-center justify-center p-10 bg-yellow-50 rounded-xl border border-yellow-300 shadow-lg">
              <Clock className="w-10 h-10 text-yellow-600 mb-4 animate-spin" />
              <h2 className="text-xl font-bold text-yellow-800">
                No Live Trending Data Found
              </h2>
              <p className="text-yellow-700 mt-2 text-center">
                Please check whether your Flask server (python backend/app.py)
                is able to fetch data from yfinance.
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Either no data was received from the service, or no stock met
                the trending criteria.
              </p>
            </div>
          )}

          {top5Stocks.length > 0 && (
            <StockSlideshowClient
              stocks={top5Stocks}
              onViewDetail={handleViewDetail}
            />
          )}

          {remainingStocks.length > 0 && (
            <div className="pt-6 border-t-4 border-indigo-100 mt-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Trending List (Rank {top5Stocks.length + 1} onwards)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {remainingStocks.map((stock) => (
                  <StockItem
                    key={stock.ticker}
                    stock={stock}
                    onViewDetail={handleViewDetail}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default TrendingPageClient;
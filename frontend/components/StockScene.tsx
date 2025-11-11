'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Zap, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface RankedTrendingStock {
  ticker: string;
  name: string;
  current_price: number;
  today_change_percent: number;
  volume_factor: number;
  price_change_5d: number;
  reason: string;
  rank: number;
}

// --- SLIDE ITEM ---
interface SlideItemProps {
  stock: RankedTrendingStock;
  onViewDetail: (stock: RankedTrendingStock) => void;
}

/**
 * @description Individual stock card in slideshow
 */
const SlideItem: React.FC<SlideItemProps> = ({ stock, onViewDetail }) => {
  const isPositive = stock.today_change_percent >= 0;
  const colorClass = isPositive ? 'bg-green-600' : 'bg-red-600';
  const textColor = isPositive ? 'text-green-600' : 'text-red-600';
  const ArrowIcon = isPositive ? ArrowUp : ArrowDown;

  return (
    <div
      className="relative p-6 md:p-10 lg:p-12 bg-white rounded-3xl shadow-2xl transition-transform duration-500 ease-in-out cursor-pointer hover:shadow-indigo-300/50"
      onClick={() => onViewDetail(stock)}
    >
      {/* Rank Badge */}
      <span className="absolute top-0 left-0 p-3 bg-indigo-600 text-white font-extrabold text-xl rounded-tl-3xl rounded-br-2xl shadow-md">
        RANK #{stock.rank}
      </span>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pt-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800">{stock.ticker}</h2>
          <p className="text-gray-500 text-lg">{stock.name}</p>
        </div>

        <div className="flex items-center mt-4 md:mt-0">
          <ArrowIcon className={`w-8 h-8 ${textColor}`} />
          <span className={`ml-2 text-2xl font-semibold ${textColor}`}>
            {stock.today_change_percent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-200 pt-6">
        <div className="flex items-center space-x-3">
          <Zap className="w-5 h-5 text-indigo-600" />
          <span className="text-gray-600">Current Price:</span>
          <span className="font-semibold text-gray-900">
            ₹{stock.current_price.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <Clock className="w-5 h-5 text-indigo-600" />
          <span className="text-gray-600">5D Change:</span>
          <span className={`font-semibold ${textColor}`}>
            {stock.price_change_5d.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <Zap className="w-5 h-5 text-indigo-600" />
          <span className="text-gray-600">Volume Factor:</span>
          <span className="font-semibold text-gray-900">
            {stock.volume_factor.toFixed(2)}x
          </span>
        </div>
      </div>

      {/* Reason Banner */}
      <div className={`mt-6 p-4 rounded-xl text-center font-semibold text-white ${colorClass} shadow-lg`}>
        <p className="text-lg">{stock.reason}</p>
      </div>
    </div>
  );
};

// --- MAIN SLIDESHOW COMPONENT ---
interface StockSlideshowProps {
  stocks: RankedTrendingStock[];
  onViewDetail: (stock: RankedTrendingStock) => void;
}

/**
 * @description Slideshow component
 */
const StockSlideshowClient: React.FC<StockSlideshowProps> = ({ stocks, onViewDetail }) => {
  const slides = stocks.slice(0, 5);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-play logic (5 seconds per slide)
  useEffect(() => {
    if (slides.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
      }, 5000);
      return () => clearInterval(interval);
    } else if (slides.length === 1) {
      setCurrentIndex(0);
    }
  }, [slides.length]);

  const goToPrev = () => setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
  const goToNext = () => setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);

  if (slides.length === 0) return null;

  return (
    <div className="relative mb-12">
      {/* Current Slide */}
      <SlideItem stock={slides[currentIndex]} onViewDetail={onViewDetail} />

      {/* Navigation Buttons */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white/50 hover:bg-white p-3 rounded-full shadow-lg transition z-10 hidden md:block"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>
          <button
            onClick={goToNext}
            className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white/50 hover:bg-white p-3 rounded-full shadow-lg transition z-10 hidden md:block"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 text-gray-800" />
          </button>
        </>
      )}

      {/* Indicators */}
      <div className="flex justify-center mt-4 space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentIndex === index ? 'bg-indigo-600 w-8' : 'bg-gray-300'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default StockSlideshowClient;
'use client';

import React from 'react';
import { ArrowLeft, Zap, Eye, BrainCircuit, ShieldCheck } from 'lucide-react';

/**
 * About Page
 * Provides a formal explanation of the AI Financial Advisor platform.
 */
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto p-4 md:p-12">
        
        {/* Back Button */}
        <a 
          href="/" 
          className="inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </a>

        {/* Header */}
        <header className="mb-12">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
            About Our AI Financial Advisor
          </h1>
          <p className="text-xl text-gray-600">
            Simplifying complex market data into actionable insights for everyday investors.
          </p>
        </header>

        {/* Section 1: Our Mission */}
        <Section 
          icon={<Eye className="w-8 h-8 text-white" />}
          title="Our Mission: Clarity in Chaos"
        >
          <p>
            The financial market is flooded with data—billions of data points moving every second. For a retail investor, this isn't just overwhelming; it's a barrier. Our mission is to break down this barrier. We leverage technology to filter the noise and provide clear, unbiased, and data-driven insights that anyone can understand.
          </p>
        </Section>

        {/* Section 2: Core Features */}
        <Section 
          icon={<Zap className="w-8 h-8 text-white" />}
          title="Core Features"
        >
          <ul className="list-disc list-inside space-y-4">
            <li>
              <strong>Live Trending Stocks:</strong> Our system constantly scans the market for unusual activity. We compare real-time (delayed) trading volume against the 20-day average to identify stocks that are gaining significant market attention *right now*.
            </li>
            <li>
              <strong>Single Stock Analysis:</strong> Go beyond the ticker. Our search provides a 360-degree view of any stock, including interactive graphs (1-Day to 5-Year), key financial metrics (P/E Ratio, Market Cap, Debt/Equity), and 52-week performance.
            </li>
            <li>
              <strong>AI-Powered Sentiment Analysis:</strong> Data isn't just numbers. We fetch the latest news headlines related to a stock and use Natural Language Processing (NLP) to assign a "Positive," "Negative," or "Neutral" sentiment score, helping you understand the market's mood.
            </li>
          </ul>
        </Section>
        
        {/* Section 3: Why & How to Use This Platform */}
        <Section 
          icon={<BrainCircuit className="w-8 h-8 text-white" />}
          title="Why & How to Use This Platform"
        >
          <h3 className="text-xl font-semibold mb-2">Why Use It?</h3>
          <p className="mb-4">
            Standard brokerage apps (like Groww or Zerodha) are built for *execution*—they help you Buy and Sell. Our platform is built for *decision-making*. We provide the consolidated "Why" before you hit the "Buy" button by merging technicals, fundamentals, and sentiment into one simple view.
          </p>
          <h3 className="text-xl font-semibold mb-2">How to Use It?</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Start at the <strong>Trending Stocks</strong> page to discover what's moving the market.</li>
            <li>Use the <strong>Single Stock Search</strong> to deep-dive into a company you're interested in.</li>
            <li>Review the <strong>Key Metrics</strong> and **Sentiment** to build a complete picture.</li>
            <li>Use our AI-generated advice as a *suggestion*, not a command, to guide your own research.</li>
          </ol>
        </Section>

        {/* Section 4: Our Technology (The "How") */}
        <Section 
          icon={<ShieldCheck className="w-8 h-8 text-white" />}
          title="Our Data & Technology"
        >
          <p>
            To provide this service for free, we rely on robust, publicly available data sources like **Yfinance**. Because these free sources have strict rate limits (to prevent IP blocking), our platform uses a sophisticated **caching system (powered by MongoDB)**.
          </p>
          <p className="mt-2">
            This means data like "Live Price" or "Key Metrics" is intelligently cached for **30 minutes**, while "Historical Data" (like 1-Year graphs) is cached for **24 hours**. This ensures the platform is fast, reliable, and always available, even if the data is slightly delayed from the real-time ticker.
          </p>
        </Section>

      </div>
    </div>
  );
}

// Reusable Section Component
const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <section className="mb-10 bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
    <div className="flex items-center mb-4">
      <div className="p-3 bg-indigo-600 rounded-full mr-4">
        {icon}
      </div>
      <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
    </div>
    <div className="text-lg text-gray-700 leading-relaxed">
      {children}
    </div>
  </section>
);
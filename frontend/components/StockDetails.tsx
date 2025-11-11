// 'use client';

// import React, { useState, useEffect, useMemo } from 'react';
// import { ArrowLeft, DollarSign, BarChart, Newspaper, Target } from 'lucide-react';
// import { RankedTrendingStock } from '../app/trending/page';
// import { Line } from 'react-chartjs-2';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
// } from 'chart.js';

// ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// // ---------- INTERFACES ----------
// interface StockDetailsProps {
//   stock: RankedTrendingStock;
//   onBack: () => void;
// }

// interface DetailedFinancials {
//   MarketCap?: string;
//   TrailingPE?: number | string;
//   ForwardPE?: number | string;
//   DebtToEquity?: number | string;
//   status?: string;
// }

// interface NewsArticle {
//   title: string;
//   source: string;
//   link: string;
// }

// interface ChartDataPoint {
//   date: string;
//   price: number;
// }

// interface AdditionalMetrics {
//   '52W High': string;
//   '52W Low': string;
//   [key: string]: string;
// }

// interface LiveStockDetails {
//   advice: string;
//   reason_summary: string;
//   risk_level: string;
//   fundamentals: DetailedFinancials;
//   sentiment_score: number;
//   sentiment_status: 'Positive' | 'Negative' | 'Neutral';
//   latest_news: NewsArticle[];
//   historical_data: Record<string, ChartDataPoint[]>;
//   additional_metrics: AdditionalMetrics;
// }

// // ---------- PRICE CHART COMPONENT (Unchanged) ----------
// interface PriceChartProps {
//   data: ChartDataPoint[];
//   timeframe: string;
// }

// const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
//   const chartData = useMemo(() => {
//     if (!data || data.length === 0) return { datasets: [] };

//     const isPositiveTrend = data[data.length - 1].price >= data[0].price;
//     const color = isPositiveTrend ? 'rgb(16,185,129)' : 'rgb(239,68,68)';

//     return {
//       labels: data.map((d) => new Date(d.date).toLocaleDateString()),
//       datasets: [
//         {
//           label: 'Closing Price (INR)',
//           data: data.map((d) => d.price),
//           borderColor: color,
//           backgroundColor: color + '33',
//           pointRadius: 1.5,
//           borderWidth: 2,
//           fill: true,
//           tension: 0.1,
//         },
//       ],
//     };
//   }, [data]);

//   const options = {
//     responsive: true,
//     maintainAspectRatio: false,
//     plugins: {
//       legend: { display: false },
//       title: { display: false },
//       tooltip: {
//         callbacks: {
//           label: (context: any) => `Price: ₹${context.parsed.y.toFixed(2)}`,
//         },
//       },
//     },
//     scales: {
//       x: {
//         title: { display: true, text: 'Date' },
//         ticks: { maxTicksLimit: 10 },
//       },
//       y: {
//         title: { display: true, text: 'Price (₹)' },
//       },
//     },
//   };

//   if (!data || data.length === 0) {
//     return (
//       <p className="text-gray-500 text-lg text-center p-4">
//         No data available for chart.
//       </p>
//     );
//   }

//   return <Line options={options} data={chartData} />;
// };

// // ---------- MAIN STOCK DETAILS COMPONENT ----------
// const StockDetails: React.FC<StockDetailsProps> = ({ stock, onBack }) => {
//   const isPositive = stock.today_change_percent >= 0;
//   const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
//   const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';

//   const [liveDetails, setLiveDetails] = useState<LiveStockDetails | null>(null);
//   const [isLoadingDetails, setIsLoadingDetails] = useState(true);
//   
//   // FIX: '1 Day' ko wapas add kiya gaya, default '1 Week' set kiya
//   const [activeTimeframe, setActiveTimeframe] = useState('1 Week');
//   const timeframes = ['1 Day', '1 Week', '6 Months', '1 Year', '5 Year']; 
//   // --------------

//   // ---------- DATA FETCH ----------
//   useEffect(() => {
//     const fetchDetails = async () => {
//       setIsLoadingDetails(true);
//       const API_URL = `http://localhost:5000/api/full-analysis/${stock.ticker}`;
//       try {
//         const response = await fetch(API_URL, { cache: 'no-store' });
//         if (!response.ok) throw new Error('Failed to fetch detailed stock data');

//         const data: LiveStockDetails = await response.json();
//         setLiveDetails(data);
//       } catch (error) {
//         console.error(`Error fetching details for ${stock.ticker}:`, error);
//         setLiveDetails(null);
//       } finally {
//         setIsLoadingDetails(false);
//       }
//     };
//     fetchDetails();
//   }, [stock.ticker]);

//   // ---------- LOADING STATE ----------
//   if (isLoadingDetails) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
//         <p className="text-xl font-semibold text-indigo-600 animate-pulse">
//           Loading Detailed Data for {stock.ticker}...
//         </p>
//       </div>
//     );
//   }

//   // ---------- ERROR HANDLING ----------
//   if (!liveDetails) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
//         <p className="text-xl font-semibold text-red-600">
//           Error: Could not load detailed analysis for {stock.ticker}.
//         </p>
//         <button
//           onClick={onBack}
//           className="mt-4 text-sm text-indigo-600 font-semibold hover:underline"
//         >
//           Back to Trending List
//         </button>
//         
//       </div>
//     );
//   }

//   // ---------- METRICS ----------
//   const initialMetrics = [
//     { key: 'Market Cap', value: liveDetails.fundamentals.MarketCap ?? 'N/A', unit: '' },
//     { key: 'P/E Ratio', value: liveDetails.fundamentals.TrailingPE ?? 'N/A', unit: 'x' },
//     { key: 'Forward P/E', value: liveDetails.fundamentals.ForwardPE ?? 'N/A', unit: 'x' },
//     { key: 'Debt/Equity', value: liveDetails.fundamentals.DebtToEquity ?? 'N/A', unit: '' },
//   ];

//   const additionalMetricsList = Object.entries(liveDetails.additional_metrics).map(
//     ([key, value]) => ({
//       key,
//       value,
//       unit: '',
//       isHighlight: key.includes('High') || key.includes('Low'),
//     })
//   );

//   const financialMetrics = [...initialMetrics, ...additionalMetricsList];
//   const hasNews = liveDetails.latest_news && liveDetails.latest_news.length > 0;


//   // ---------- RENDER ----------
//   return (
//     <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
//       <div className="max-w-6xl mx-auto">
//         {/* HEADER */}
//         <header className="mb-6">
//           <button
//             onClick={onBack}
//             className="flex items-center text-indigo-600 font-semibold mb-6 p-2 rounded-full hover:bg-indigo-100 transition"
//             aria-label="Back to Trending List"
//           >
//             <ArrowLeft className="w-5 h-5 mr-2" />
//             Back to Trending List
//           </button>

//           <div className={`p-6 rounded-2xl shadow-xl ${bgColor} border border-gray-100`}>
//             <div className="flex justify-between items-start mb-4"> {/* Added mb-4 for spacing */}
//               <div>
//                 <h1 className="text-4xl font-extrabold text-gray-900">
//                   {stock.ticker} - Rank #{stock.rank}
//                 </h1>
//                 <p className="text-xl text-gray-600 mt-1">{stock.name}</p>
//               </div>
//               <div className="text-right">
//                 <p className="text-5xl font-black text-gray-900">
//                   ₹{stock.current_price.toFixed(2)}
//                 </p>
//                 <p className={`text-2xl font-bold ${changeColor}`}>
//                   {stock.today_change_percent.toFixed(2)}% Today
//                 </p>
//               </div>
//             </div>
//         
//                 {/* LIVE ADVICE: Updated from previous step */}
//                 <div className="mt-4 p-4 rounded-lg bg-white shadow-inner border-t border-gray-100">
//                     <div className="flex justify-between items-center">
//                         <div className="flex items-center">
//                             <Target className="w-5 h-5 mr-2 text-indigo-700" />
//                             <span className="text-lg font-bold text-gray-800 mr-2">
//                                 Our Verdict:
//                             </span>
//                             <em
//                                 className={`text-xl font-extrabold ${
//                                     liveDetails.advice.includes('BUY')
//                                         ? 'text-green-600'
//                                         : liveDetails.advice.includes('SELL')
//                                         ? 'text-red-600'
//                                         : 'text-yellow-600'
//                                 }`}
//                             >
//                                 {liveDetails.advice.toUpperCase()}
//                             </em>
//                         </div>
//                         <div className="text-right">
//                             <span className="text-sm text-gray-500 mr-2">Risk:</span>
//                             <span className={`text-sm font-bold px-3 py-1 rounded-full ${
//                                 liveDetails.risk_level === 'Low' ? 'bg-green-100 text-green-700' :
//                                 liveDetails.risk_level === 'High' ? 'bg-red-100 text-red-700' : 
//                                 'bg-yellow-100 text-yellow-700'
//                             }`}>
//                                 {liveDetails.risk_level.toUpperCase()}
//                             </span>
//                         </div>
//                     </div>
//                     <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
//                         <strong>Reason:</strong> {liveDetails.reason_summary}
//                     </p>
//                 </div>
//                 {/* END LIVE ADVICE */}
//           </div>
//         </header>

//         {/* METRICS (Unchanged) */}
//         <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4 flex items-center">
//           <DollarSign className="w-6 h-6 mr-2 text-green-600" /> Key Financial Metrics
//         </h2>

//         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
//           {financialMetrics.map((metric) => (
//             <div
//               key={metric.key}
//               className={`p-4 bg-white rounded-xl shadow-md border ${
//                 metric.isHighlight ? 'border-indigo-200' : 'border-gray-100'
//               }`}
//             >
//               <p className="text-sm text-gray-500 font-medium truncate">{metric.key}</p>
//               <p className="text-xl font-bold text-gray-900 mt-1">
//                 {metric.value} {metric.unit}
//               </p>
//             </div>
//           ))}
//         </div>

//         {/* PRICE CHART (1 Day button added back) */}
//         <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4 flex items-center">
//           <BarChart className="w-6 h-6 mr-2 text-blue-600" /> Price Chart Analysis
//         </h2>

//         <div className="bg-white p-6 rounded-2xl shadow-xl mb-8">
//           <div className="flex space-x-2 border-b border-gray-200 pb-4 mb-4 overflow-x-auto">
//             {timeframes.map((timeframe) => (
//               <button
//                 key={timeframe}
//                 onClick={() => setActiveTimeframe(timeframe)}
//                 className={`px-4 py-2 text-sm font-semibold rounded-full transition whitespace-nowrap ${
//                   activeTimeframe === timeframe
//                     ? 'bg-indigo-600 text-white shadow-lg'
//                     : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//                 }`}
//               >
//                 {timeframe}
//               </button>
//             ))}
//           </div>

//           <div className="h-96 w-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 p-2">
//             {liveDetails.historical_data[activeTimeframe] ? (
//               <PriceChart
//                 data={liveDetails.historical_data[activeTimeframe]}
//                 timeframe={activeTimeframe}
//               />
//             ) : (
//               <p className="text-gray-500">No chart data available for this timeframe.</p>
//             )}
//           </div>
//         </div>

//         {/* NEWS SECTION (Rendering check added) */}
//         <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4 flex items-center">
//           <Newspaper className="w-6 h-6 mr-2 text-red-600" /> Relevant News Articles
//           <span
//             className={`ml-3 px-3 py-1 text-sm font-semibold rounded-full ${
//               liveDetails.sentiment_status === 'Positive'
//                 ? 'bg-green-100 text-green-800'
//                 : liveDetails.sentiment_status === 'Negative'
//                 ? 'bg-red-100 text-red-800'
//                 : 'bg-yellow-100 text-yellow-800'
//             }`}
//           >
//             Sentiment: {liveDetails.sentiment_status} ({liveDetails.sentiment_score})
//           </span>
//         </h2>

//         {hasNews ? (
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
//             {liveDetails.latest_news.map((news, index) => (
//               <a
//                 key={index}
//                 href={news.link}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="p-4 bg-white rounded-xl shadow-md border-l-4 border-indigo-400 hover:shadow-lg transition block"
//               >
//                 <p className="text-lg font-semibold text-gray-800">{news.title}</p>
//                 <p className="text-sm text-gray-500 mt-1">
//                   Source: <span className="font-medium text-gray-700">{news.source}</span>
//                 </p>
//               </a>
//             ))}
//           </div>
//         ) : (
//             <div className="p-4 bg-gray-100 rounded-xl text-center border border-gray-200">
//                 <p className="text-gray-600">No recent news articles found for analysis.</p>
//             </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default StockDetails;





'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, DollarSign, BarChart, Newspaper, Target } from 'lucide-react';
// 🟢 FIX: Interface ko 'app/trending/page.tsx' se import karna (jaisa aapne kiya)
import { RankedTrendingStock } from '../app/trending/page'; 
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
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// ---------- INTERFACES ----------
interface StockDetailsProps {
  stock: RankedTrendingStock;
  onBack: () => void;
}

interface DetailedFinancials {
  MarketCap?: string;
  TrailingPE?: number | string;
  ForwardPE?: number | string;
  DebtToEquity?: number | string;
  status?: string;
}

interface NewsArticle {
  title: string;
  source: string;
  link: string;
}

interface ChartDataPoint {
  date: string;
  price: number;
}

interface AdditionalMetrics {
  '52W High': string;
  '52W Low': string;
  [key: string]: string;
}

interface LiveStockDetails {
  advice: string;
  reason_summary: string;
  risk_level: string;
  fundamentals: DetailedFinancials;
  sentiment_score: number;
  sentiment_status: 'Positive' | 'Negative' | 'Neutral';
  latest_news: NewsArticle[];
  historical_data: Record<string, ChartDataPoint[]>;
  additional_metrics: AdditionalMetrics;
}

// ---------- PRICE CHART COMPONENT (Unchanged) ----------
interface PriceChartProps {
  data: ChartDataPoint[];
  timeframe: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { datasets: [] };

    const isPositiveTrend = data[data.length - 1].price >= data[0].price;
    const color = isPositiveTrend ? 'rgb(16,185,129)' : 'rgb(239,68,68)';

    return {
      labels: data.map((d) => new Date(d.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Closing Price (INR)',
          data: data.map((d) => d.price),
          borderColor: color,
          backgroundColor: color + '33',
          pointRadius: 1.5,
          borderWidth: 2,
          fill: true,
          tension: 0.1,
        },
      ],
    };
  }, [data]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `Price: ₹${context.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Date' },
        ticks: { maxTicksLimit: 10 },
      },
      y: {
        title: { display: true, text: 'Price (₹)' },
      },
    },
  };

  if (!data || data.length === 0) {
    return (
      <p className="text-gray-500 text-lg text-center p-4">
        No data available for chart.
      </p>
    );
  }

  return <Line options={options as any} data={chartData} />;
};

// ---------- MAIN STOCK DETAILS COMPONENT ----------
const StockDetails: React.FC<StockDetailsProps> = ({ stock, onBack }) => {
  const isPositive = stock.today_change_percent >= 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';

  const [liveDetails, setLiveDetails] = useState<LiveStockDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  
  // FIX: '1 Day' ko wapas add kiya gaya, default '1 Week' set kiya
  const [activeTimeframe, setActiveTimeframe] = useState('1 Week');
  const timeframes = ['1 Day', '1 Week', '6 Months', '1 Year', '5 Year']; 
  // --------------

  // ---------- DATA FETCH ----------
  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      const API_URL = `http://localhost:5000/api/full-analysis/${stock.ticker}`;
      try {
        const response = await fetch(API_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch detailed stock data');

        const data: LiveStockDetails = await response.json();
        setLiveDetails(data);
      } catch (error) {
        console.error(`Error fetching details for ${stock.ticker}:`, error);
        setLiveDetails(null);
      } finally {
        setIsLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [stock.ticker]);

  // ---------- LOADING STATE ----------
  if (isLoadingDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <p className="text-xl font-semibold text-indigo-600 animate-pulse">
          Loading Detailed Data for {stock.ticker}...
        </p>
      </div>
    );
  }

  // ---------- ERROR HANDLING ----------
  if (!liveDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <p className="text-xl font-semibold text-red-600">
          Error: Could not load detailed analysis for {stock.ticker}.
        </p>
        <button
          onClick={onBack}
          className="mt-4 text-sm text-indigo-600 font-semibold hover:underline"
        >
          Back to Trending List
        </button>
        
      </div>
    );
  }

  // ---------- METRICS ----------
  // 🟢 FIX: 'isHighlight: false' ko default metrics mein add kiya gaya
  const initialMetrics = [
    { key: 'Market Cap', value: liveDetails.fundamentals.MarketCap ?? 'N/A', unit: '', isHighlight: false },
    { key: 'P/E Ratio', value: liveDetails.fundamentals.TrailingPE ?? 'N/A', unit: 'x', isHighlight: false },
    { key: 'Forward P/E', value: liveDetails.fundamentals.ForwardPE ?? 'N/A', unit: 'x', isHighlight: false },
    { key: 'Debt/Equity', value: liveDetails.fundamentals.DebtToEquity ?? 'N/A', unit: '', isHighlight: false },
  ];

  const additionalMetricsList = Object.entries(liveDetails.additional_metrics).map(
    ([key, value]) => ({
      key,
      value,
      unit: '',
      isHighlight: key.includes('High') || key.includes('Low'),
    })
  );

  const financialMetrics = [...initialMetrics, ...additionalMetricsList];
  const hasNews = liveDetails.latest_news && liveDetails.latest_news.length > 0;


  // ---------- RENDER ----------
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-indigo-600 font-semibold mb-6 p-2 rounded-full hover:bg-indigo-100 transition"
            aria-label="Back to Trending List"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Trending List
          </button>

          <div className={`p-6 rounded-2xl shadow-xl ${bgColor} border border-gray-100`}>
            <div className="flex justify-between items-start mb-4"> {/* Added mb-4 for spacing */}
              <div>
                <h1 className="text-4xl font-extrabold text-gray-900">
                  {stock.ticker} - Rank #{stock.rank}
                </h1>
                <p className="text-xl text-gray-600 mt-1">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="text-5xl font-black text-gray-900">
                  ₹{stock.current_price.toFixed(2)}
                </p>
                <p className={`text-2xl font-bold ${changeColor}`}>
                  {stock.today_change_percent.toFixed(2)}% Today
                </p>
              </div>
            </div>
        
            {/* LIVE ADVICE: Updated from previous step */}
            <div className="mt-4 p-4 rounded-lg bg-white shadow-inner border-t border-gray-100">
                <div className="flex justify-between items-center">
                    <div className="flex items-center">
                        <Target className="w-5 h-5 mr-2 text-indigo-700" />
                        <span className="text-lg font-bold text-gray-800 mr-2">
                            Our Verdict:
                        </span>
                        <em
                            className={`text-xl font-extrabold ${
                                liveDetails.advice.includes('BUY')
                                    ? 'text-green-600'
                                    : liveDetails.advice.includes('SELL')
                                    ? 'text-red-600'
                                    : 'text-yellow-600'
                            }`}
                        >
                            {liveDetails.advice.toUpperCase()}
                        </em>
                    </div>
                    <div className="text-right">
                        <span className="text-sm text-gray-500 mr-2">Risk:</span>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                            liveDetails.risk_level === 'Low' ? 'bg-green-100 text-green-700' :
                            liveDetails.risk_level === 'High' ? 'bg-red-100 text-red-700' : 
                            'bg-yellow-100 text-yellow-700'
                        }`}>
                            {liveDetails.risk_level.toUpperCase()}
                        </span>
                    </div>
                </div>
                <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                    <strong>Reason:</strong> {liveDetails.reason_summary}
                </p>
            </div>
            {/* END LIVE ADVICE */}
          </div>
        </header>

        {/* METRICS (Unchanged) */}
        <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4 flex items-center">
          <DollarSign className="w-6 h-6 mr-2 text-green-600" /> Key Financial Metrics
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {financialMetrics.map((metric) => (
            <div
              key={metric.key}
              className={`p-4 bg-white rounded-xl shadow-md border ${
                metric.isHighlight ? 'border-indigo-200' : 'border-gray-100'
              }`}
            >
              <p className="text-sm text-gray-500 font-medium truncate">{metric.key}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {metric.value} {metric.unit}
              </p>
            </div>
          ))}
        </div>

        {/* PRICE CHART (1 Day button added back) */}
        <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4 flex items-center">
          <BarChart className="w-6 h-6 mr-2 text-blue-600" /> Price Chart Analysis
        </h2>

        <div className="bg-white p-6 rounded-2xl shadow-xl mb-8">
          <div className="flex space-x-2 border-b border-gray-200 pb-4 mb-4 overflow-x-auto">
            {timeframes.map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setActiveTimeframe(timeframe)}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition whitespace-nowrap ${
                  activeTimeframe === timeframe
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>

          <div className="h-96 w-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 p-2">
            {liveDetails.historical_data[activeTimeframe] ? (
              <PriceChart
                data={liveDetails.historical_data[activeTimeframe]}
                timeframe={activeTimeframe}
              />
            ) : (
              <p className="text-gray-500">No chart data available for this timeframe.</p>
            )}
          </div>
        </div>

        {/* NEWS SECTION (Rendering check added) */}
        <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4 flex items-center">
          <Newspaper className="w-6 h-6 mr-2 text-red-600" /> Relevant News Articles
          <span
            className={`ml-3 px-3 py-1 text-sm font-semibold rounded-full ${
              liveDetails.sentiment_status === 'Positive'
                ? 'bg-green-100 text-green-800'
                : liveDetails.sentiment_status === 'Negative'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            Sentiment: {liveDetails.sentiment_status} ({liveDetails.sentiment_score})
          </span>
        </h2>

        {hasNews ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {liveDetails.latest_news.map((news, index) => (
              <a
                key={index}
                href={news.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-white rounded-xl shadow-md border-l-4 border-indigo-400 hover:shadow-lg transition block"
              >
                <p className="text-lg font-semibold text-gray-800">{news.title}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Source: <span className="font-medium text-gray-700">{news.source}</span>
                </p>
              </a>
            ))}
          </div>
        ) : (
            <div className="p-4 bg-gray-100 rounded-xl text-center border border-gray-200">
              <p className="text-gray-600">No recent news articles found for analysis.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default StockDetails;
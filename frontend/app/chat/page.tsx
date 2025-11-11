'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Search, Zap, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { debounce } from 'lodash';

// Type Definitions 
interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
    sources?: { uri: string; title: string }[];
}

// Utility Functions

// 1. Icon Components for visual appeal
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" {...props}>
        <path d="M12 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c1.6 0 3.1-.48 4.39-1.3l-2.09-1.3a5.53 5.53 0 01-2.3.57c-3.03 0-5.5-2.47-5.5-5.5s2.47-5.5 5.5-5.5c1.47 0 2.8.58 3.8 1.5l2.67-2.67C15.82 4.39 14.02 4 12 4zm6 6h-2.2v2h2.2v-2z" fill="#4285F4"/>
        <path d="M22 12c0-5.52-4.48-10-10-10C5.38 2 0 7.38 0 14c0 1.93.55 3.75 1.5 5.38l3.18-3.18C4.24 14.73 4 13.36 4 12c0-4.42 3.58-8 8-8s8 3.58 8 8c0 2.21-1.25 4.14-3.1 5.16l2.1 1.28C21.45 16.74 22 14.47 22 12z" fill="#34A853"/>
        <path d="M20 12c0 1.98-.82 3.8-2.17 5.09l1.45 1.45c1.6-1.5 2.72-3.75 2.72-6.54 0-2.21-1.25-4.14-3.1-5.16l-2.1 1.28C18.75 7.86 20 9.79 20 12z" fill="#FBBC04"/>
        <path d="M12 0c-4.42 0-8 3.58-8 8s3.58 8 8 8c1.6 0 3.1-.48 4.39-1.3l-2.09-1.3A5.53 5.53 0 0112 10.5c-3.03 0-5.5-2.47-5.5-5.5s2.47-5.5 5.5-5.5c1.47 0 2.8.58 3.8 1.5l2.67-2.67C15.82 4.39 14.02 4 12 4z" fill="#EA4335"/>
    </svg>
);

// 2. Exponential Backoff Fetch
const exponentialBackoffFetch = async (url: string, options: RequestInit, maxRetries: number = 5) => {
    let delay = 1000;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return response;
            }
            const errorMessage = response.statusText || `HTTP Error ${response.status}`;
            // For non-2xx responses, throw error to trigger retry logic, except 4xx/5xx errors
            // We only retry on 429 (Too Many Requests) or network issues (which throw before this)
            if (response.status === 429 && attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential increase
                continue;
            }
            throw new Error(`API error: ${response.statusText}`);
        } catch (error) {
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential increase
                continue;
            }
            throw error;
        }
    }
    throw new Error('Failed to fetch after all retries.');
};

// API Call Function 
const callGeminiAPI = async (chatHistory: ChatMessage[], currentQuery: string): Promise<ChatMessage> => {
    const apiKey = "AIzaSyCAj23NHBRGY0Uajc7Wo_T0RsFZe3rCJHU"; // API Key is provided by the canvas environment
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // Construct history for API payload
    const contents = chatHistory.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: msg.parts.map(p => ({ text: p.text }))
    }));
    contents.push({ role: 'user', parts: [{ text: currentQuery }] });

    // FIX: Updated system prompt to strictly enforce text-only output and prevent malformed function call error.
    const systemPrompt = `
You are a helpful and concise AI assistant. Your primary goal is to provide clear and direct answers.

Follow these rules strictly:
1.  **Be Concise:** Always provide answers that are to-the-point. Avoid long paragraphs and unnecessary introductory or concluding sentences.
2.  **Use Bullet Points:** Whenever possible, format your answers using bullet points or numbered lists to make them easy to read.
3.  **Match Language:** You MUST reply in the exact same language (e.g., Hindi, English) that the user used for their query.
`;
    const payload = {
        contents: contents,
        tools: [{ "google_search": {} }], // Enable Google Search grounding
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    try {
        const response = await exponentialBackoffFetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            const text = candidate.content.parts[0].text;
            let sources: { uri: string; title: string }[] = [];
            const groundingMetadata = candidate.groundingMetadata;
            
            if (groundingMetadata && groundingMetadata.groundingAttributions) {
                sources = groundingMetadata.groundingAttributions
                    .map((attribution: any) => ({
                        uri: attribution.web?.uri,
                        title: attribution.web?.title,
                    }))
                    .filter(source => source.uri && source.title);
            }

            return {
                role: 'model',
                parts: [{ text }],
                sources
            };
        } else {
            // Handle the MALFORMED_FUNCTION_CALL case
            console.error('Gemini API response missing text or malformed tool call:', result);
            const errorMessage = candidate?.finishMessage?.includes("Malformed function call") 
                ? "Apologies, there was a data processing issue with the API. Please simplify your question and ask again."
                : "Sorry, I wasn’t able to answer this question. Please try again after some time or rephrase your question.";

            return {
                role: 'model',
                parts: [{ text: errorMessage }]
            };
        }
    } catch (error) {
        console.error("API Call Error:", error);
        const knownError = error as Error;
        return {
            role: 'model',
            parts: [{ text: `A Network/API error has occurred: ${knownError.message}. Please check your network connection and try again.` }]
        };
    }
};

// --- Components ---

// Chat Bubble component
const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.role === 'user';
    const content = message.parts[0].text;
    const sources = message.sources;

    // Source component
    const SourceAttribution: React.FC<{ sources: ChatMessage['sources'] }> = ({ sources }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        if (!sources || sources.length === 0) return null;

        const uniqueSources = sources.filter((source, index, self) => 
            index === self.findIndex((t) => t.uri === source.uri)
        );

        const visibleSources = isExpanded ? uniqueSources : uniqueSources.slice(0, 3);
        const hasMore = uniqueSources.length > 3;

        return (
            <div className="mt-3 p-3 bg-gray-700/50 rounded-lg text-xs border border-gray-600/50 shadow-inner">
                <div className="flex items-center text-gray-300 font-semibold mb-2">
                    <Search size={14} className="mr-1 text-indigo-400" />
                    Sources Grounded by Google Search ({uniqueSources.length})
                </div>
                <ul className="space-y-1">
                    {visibleSources.map((source, index) => (
                        <li key={index} className="truncate">
                            <a 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                <span className="font-mono text-gray-400 mr-2">[{index + 1}]</span>
                                {source.title}
                            </a>
                        </li>
                    ))}
                </ul>
                {hasMore && (
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="mt-2 text-indigo-400 hover:text-indigo-300 flex items-center transition-colors text-xs font-medium"
                    >
                        {isExpanded ? <ChevronUp size={12} className="mr-1" /> : <ChevronDown size={12} className="mr-1" />}
                        {isExpanded ? 'Show Less' : `Show ${uniqueSources.length - 3} More Sources`}
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
            <div 
                className={`max-w-3xl p-4 rounded-xl shadow-lg transition-all duration-300 ${
                    isUser 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-gray-800 text-gray-100 rounded-tl-none border border-indigo-500/50'
                }`}
            >
                <div className="prose prose-invert max-w-none text-gray-100">
                    {/* Render content as markdown for better formatting */}
                    <div dangerouslySetInnerHTML={{ __html: content.replace(/\\(.?)\\*/g, '<strong>$1</strong>') }} />
                </div>
                {!isUser && sources && <SourceAttribution sources={sources} />}
            </div>
        </div>
    );
};

// Main Chat Component
export default function ChatPage() {
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to the latest message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isLoading]);


    // Initial welcome message (runs only once)
    useEffect(() => {
        const welcomeMessage: ChatMessage = {
            role: 'model',
            parts: [{ 
                text: "Namaste! I am an AI Financial Analyst. I use real-time Google Search to provide you with accurate insights on the stock market, company analysis, and other financial queries. Which stock or financial topic would you like to explore today?" 
            }],
        };
        setChatHistory([welcomeMessage]);
    }, []);

    // Handle user submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = input.trim();
        if (!trimmedInput || isLoading) return;

        setIsLoading(true);
        setInput('');

        const userMessage: ChatMessage = { role: 'user', parts: [{ text: trimmedInput }] };
        setChatHistory(prev => [...prev, userMessage]);

        // Call the API
        const modelMessage = await callGeminiAPI(chatHistory, trimmedInput);

        setChatHistory(prev => [...prev, modelMessage]);
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            
            {/* Header */}
            <header className="flex items-center p-4 bg-gray-800 shadow-xl border-b border-indigo-600/50">
                <Zap className="text-indigo-400 mr-3" size={24} />
                <h1 className="text-2xl font-bold tracking-tight">AI Financial Analyst Chat</h1>
                <p className="ml-4 text-sm text-gray-400">Powered by Gemini 2.5 Flash & Google Search</p>
            </header>

            {/* Chat History Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4">
                {chatHistory.map((msg, index) => (
                    <ChatBubble key={index} message={msg} />
                ))}
                
                {/* Loading State */}
                {isLoading && (
                    <div className="flex justify-start mb-6">
                        <div className="max-w-md p-3 bg-gray-800 text-gray-300 rounded-xl rounded-tl-none border border-indigo-500/50 flex items-center">
                            <Loader2 className="animate-spin mr-2 text-indigo-400" size={18} />
                            <span>AI Analyst is analyzing...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 bg-gray-800 border-t border-indigo-600/50">
                <form onSubmit={handleSubmit} className="flex items-center max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="I am pleased to know your perspective...."
                        className="flex-1 p-3 text-lg rounded-l-xl border border-gray-700 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                        disabled={isLoading}
                        suppressHydrationWarning={true}
                    />
                    <button
                        type="submit"
                        className={`p-3 rounded-r-xl text-white transition-all duration-200 flex items-center justify-center h-full ${
                            input.trim() && !isLoading
                                ? 'bg-indigo-600 hover:bg-indigo-700'
                                : 'bg-gray-600 cursor-not-allowed'
                        }`}
                        disabled={!input.trim() || isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <Send size={24} />
                        )}
                    </button>
                </form>
            </div>

            {/* Footer Status */}
            <footer className="p-2 text-center text-xs bg-gray-900 text-gray-500 border-t border-gray-700/50">
                <p className="flex justify-center items-center">
                    <CheckCircle className="text-green-500 mr-1" size={12} /> Live Grounding: Real-time information using Google Search.
                </p>
            </footer>
        </div>
    );
}
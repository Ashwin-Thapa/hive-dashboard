import React, { useState } from 'react';
import type { ChatMessage } from '../types';
import { SparklesIcon } from './icons';

interface ChatInterfaceProps {
    chatHistory: ChatMessage[];
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    hiveName: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ chatHistory, onSendMessage, isLoading, hiveName }) => {
    const [input, setInput] = useState('');
    
    const handleSend = () => {
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2 text-bwise-yellow"/>
                AI Chat for {hiveName}
            </h3>
            <div className="flex-grow bg-gray-50 rounded-lg p-3 overflow-y-auto mb-3 h-48 min-h-[12rem]">
                {chatHistory.length === 0 && !isLoading && (
                     <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-center text-gray-500">Ask a question or request a data analysis to begin.</p>
                    </div>
                )}
                <div className="space-y-4">
                    {chatHistory.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && <img className="w-8 h-8 rounded-full" src="https://static.wixstatic.com/media/ed34e9_a2827e7629924cbcaca85d89e2fcd01c~mv2.jpg/v1/fill/w_48,h_48,al_c,lg_1,q_80/1.jpg" alt="Bwise avatar" />}
                            <div className={`flex flex-col w-full max-w-[320px] leading-1.5 p-3 border-gray-200 rounded-xl ${msg.role === 'user' ? 'rounded-br-none bg-bwise-yellow/30' : 'rounded-bl-none bg-white shadow-sm'}`}>
                                <p className="text-sm font-normal text-gray-900 whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-2.5">
                            <img className="w-8 h-8 rounded-full" src="https://static.wixstatic.com/media/ed34e9_a2827e7629924cbcaca85d89e2fcd01c~mv2.jpg/v1/fill/w_48,h_48,al_c,lg_1,q_80/1.jpg" alt="Bwise avatar" />
                            <div className="flex flex-col w-full max-w-[320px] leading-1.5 p-3 border-gray-200 rounded-xl rounded-bl-none bg-white shadow-sm">
                                <div className="flex space-x-1 justify-center items-center h-6">
                                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-auto pt-2 flex items-center space-x-2">
                <input
                    type="text"
                    className="flex-grow p-2 bg-gray-100 border border-gray-300 rounded-lg focus:ring-bwise-yellow focus:border-bwise-yellow disabled:bg-gray-200 transition-colors"
                    placeholder='Ask "Analyze Sensor Data" or a Question about Bees'
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                />
                <button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-bwise-yellow text-slate-900 font-bold p-2 rounded-lg hover:bg-bwise-yellow/80 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                </button>
            </div>
        </div>
    );
};

export default ChatInterface;
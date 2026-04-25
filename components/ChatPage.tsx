import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Send, Sparkles, User } from 'lucide-react';
import { claudeService, ChatHistoryMessage } from '../services/claudeService';
import { apiService } from '../services/apiService';
import { Spinner } from './ui/Spinner';
import { ChatMessage } from '../types';

export const ChatPage: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [history, setHistory] = useState<ChatHistoryMessage[]>([]);
    const [systemContext, setSystemContext] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [ready, setReady] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                const docs = await apiService.getDocuments();
                const simplified = docs.map(doc => ({
                    id: doc.id,
                    category: doc.category,
                    fileName: doc.fileName,
                    createdAt: doc.createdAt,
                    ...('subject' in doc && { subject: doc.subject }),
                    ...('details' in doc && { details: doc.details }),
                    ...('typeOfDocument' in doc && { typeOfDocument: doc.typeOfDocument }),
                    ...('tags' in doc && { tags: doc.tags.map(t => t.label) }),
                }));
                setSystemContext(`Here are the documents currently in the system:\n${JSON.stringify(simplified, null, 2)}`);
                setMessages([{
                    id: uuidv4(),
                    sender: 'ai',
                    text: "Hello! I'm your AI assistant. How can I help you with your documents today? You can ask me to find files, summarize information, or answer questions about your records.",
                }]);
                setReady(true);
            } catch {
                setMessages([{
                    id: uuidv4(),
                    sender: 'ai',
                    text: "Sorry, I couldn't load the document context. Please refresh the page.",
                }]);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !ready || isLoading) return;

        const userText = inputValue.trim();
        const userMessage: ChatMessage = { id: uuidv4(), sender: 'user', text: userText };
        const aiMessageId = uuidv4();

        const newHistory: ChatHistoryMessage[] = [...history, { role: 'user', content: userText }];
        setHistory(newHistory);
        setMessages(prev => [...prev, userMessage, { id: aiMessageId, sender: 'ai', text: '' }]);
        setInputValue('');
        setIsLoading(true);

        let accumulatedText = '';

        await claudeService.startChatStream(
            newHistory,
            systemContext,
            (chunk) => {
                accumulatedText += chunk;
                setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId ? { ...msg, text: accumulatedText } : msg
                ));
            },
            () => {
                setHistory(prev => [...prev, { role: 'assistant', content: accumulatedText }]);
                setIsLoading(false);
            },
            (err) => {
                setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId ? { ...msg, text: `Sorry, an error occurred: ${err}` } : msg
                ));
                setIsLoading(false);
            },
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-slate-800 rounded-xl shadow-lg">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">AI Chat</h1>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                            {msg.sender === 'ai' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                    <Sparkles size={20} className="text-white" />
                                </div>
                            )}
                            <div className="w-full max-w-2xl">
                                <div className={`p-4 rounded-xl ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                            {msg.sender === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                                    <User size={20} className="text-slate-500 dark:text-slate-300" />
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.sender === 'user' && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                <Sparkles size={20} className="text-white" />
                            </div>
                            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-700">
                                <Spinner size="small" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask about your documents..."
                        disabled={isLoading || !ready}
                        className="flex-1 w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !ready || !inputValue.trim()}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        <Send size={16} />
                        <span>Send</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

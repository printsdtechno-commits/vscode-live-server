"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Send, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: number;
    sender: 'user' | 'driver';
    text: string;
    timestamp: number;
}

interface ChatProps {
    tripId: string | number;
    role: 'user' | 'driver';
    onClose: () => void;
}

export default function ChatWindow({ tripId, role, onClose }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync Messages from localStorage
    useEffect(() => {
        const loadMessages = () => {
            const stored = localStorage.getItem(`chat_${tripId}`);
            if (stored) {
                setMessages(JSON.parse(stored));
            }
        };

        loadMessages();
        const interval = setInterval(loadMessages, 1000);
        window.addEventListener('storage', loadMessages);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', loadMessages);
        };
    }, [tripId]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMessage: Message = {
            id: Date.now(),
            sender: role,
            text: input.trim(),
            timestamp: Date.now()
        };

        const updated = [...messages, newMessage];
        setMessages(updated);
        localStorage.setItem(`chat_${tripId}`, JSON.stringify(updated));
        setInput("");
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 bottom-24 md:inset-auto md:right-8 md:bottom-32 md:w-96 bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl border border-emerald-100 dark:border-emerald-900/30 overflow-hidden z-[2000] flex flex-col h-[500px]"
        >
            {/* Header */}
            <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <User size={20} />
                    </div>
                    <div>
                        <p className="font-bold text-sm uppercase tracking-widest">{role === 'user' ? 'Support Chat / Driver' : 'Chat with Passenger'}</p>
                        <p className="text-xs text-emerald-100">Live Connection Active</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 dark:bg-zinc-950/50">
                {messages.length === 0 && (
                    <div className="text-center py-10 opacity-40">
                        <p className="text-sm">No messages yet. Say hello!</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === role ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-[24px] ${msg.sender === role
                                ? 'bg-emerald-600 text-white rounded-tr-none'
                                : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-tl-none shadow-sm border border-zinc-100 dark:border-zinc-800'
                            }`}>
                            <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                            <p className={`text-[10px] mt-1 opacity-50 ${msg.sender === role ? 'text-right' : 'text-left'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-zinc-100 dark:bg-zinc-800 px-5 py-3 rounded-full text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button type="submit" className="bg-emerald-600 text-white p-3 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all">
                    <Send size={20} />
                </button>
            </form>
        </motion.div>
    );
}

"use client";
import React, { useEffect, useRef } from 'react';
import { MapPin, Phone, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RideRequestProps {
    onAccept: () => void;
    onReject: () => void;
    pickup: string;
    drop: string;
    price: string;
    distance: string;
    waiting?: number;
    isRoundTrip?: boolean;
    userName?: string;
    paymentMethod?: string;
    visible: boolean;
}

export default function RideRequest({ onAccept, onReject, pickup, drop, price, distance, waiting, isRoundTrip, userName, paymentMethod, visible }: RideRequestProps) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="fixed inset-0 z-[2000] bg-zinc-900 flex flex-col items-center justify-between py-12 px-6 safe-top safe-bottom"
                >
                    {/* Background Visuals */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" />
                    </div>

                    {/* Top: Header */}
                    <div className="relative z-10 text-center space-y-2">
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="inline-block px-4 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-500/30"
                        >
                            Incoming Request
                        </motion.div>
                        <h1 className="text-3xl font-black text-white">{userName || "New Customer"}</h1>
                        <p className="text-zinc-400 font-medium">wants a ride</p>
                    </div>

                    {/* Middle: Stats */}
                    <div className="relative z-10 w-full max-w-sm bg-zinc-800/50 backdrop-blur-md rounded-[32px] p-6 border border-zinc-700 space-y-6">
                        <div className="text-center">
                            <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Est. Earning</p>
                            <p className="text-5xl font-black text-white mt-2">₹{price}</p>
                            <p className="text-zinc-400 text-sm font-bold mt-1">{distance} KM • {paymentMethod || 'Cash'}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Pickup</p>
                                    <p className="text-white font-bold leading-tight line-clamp-2">{pickup}</p>
                                </div>
                            </div>
                            <div className="w-0.5 h-6 bg-zinc-700 ml-1" />
                            <div className="flex items-start gap-3">
                                <div className="mt-1 w-2 h-2 bg-white rounded-full" />
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Drop</p>
                                    <p className="text-white font-bold leading-tight line-clamp-2">{drop}</p>
                                </div>
                            </div>
                        </div>

                        {waiting ? (
                            <div className="bg-emerald-900/30 p-3 rounded-xl border border-emerald-900/50 text-center">
                                <p className="text-emerald-400 text-xs font-bold">Waiting: {waiting} hours (Extra Fare)</p>
                            </div>
                        ) : null}
                    </div>

                    {/* Bottom: Actions */}
                    <div className="relative z-10 w-full max-w-sm grid grid-cols-2 gap-5">
                        <button
                            onClick={onReject}
                            className="flex flex-col items-center gap-3 group"
                        >
                            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 group-active:scale-95 transition-all">
                                <X className="w-6 h-6 text-zinc-400" />
                            </div>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Decline</span>
                        </button>

                        <button
                            onClick={onAccept}
                            className="flex flex-col items-center gap-3 group"
                        >
                            <div className="relative w-20 h-20">
                                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-50" />
                                <div className="absolute inset-0 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-600/50 group-active:scale-95 transition-all outline outline-4 outline-emerald-500/30">
                                    <Phone className="w-8 h-8 text-white fill-current" />
                                </div>
                            </div>
                            <span className="text-xs font-bold text-white uppercase tracking-widest mt-1">Accept</span>
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

"use client";
import React from 'react';
import { MapPin, Navigation, Clock, Banknote, User } from 'lucide-react';
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
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 500 }}
                    className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl p-6 z-[1000] border-t border-zinc-200 dark:border-zinc-800 safe-bottom"
                >
                    <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-6" />

                    {/* Header with User Info & Huge Price */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-1">புதிய சவாரி (New Ride)</h2>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-emerald-600">₹{price}</span>
                                <span className="text-zinc-400 font-bold">/ {distance} KM</span>
                            </div>
                            <div className="flex gap-2 mt-2 flex-wrap">
                                <span className="text-[10px] font-black bg-zinc-900 text-white px-2 py-1 rounded-md uppercase tracking-tight flex items-center gap-1">
                                    <Banknote size={10} />
                                    {paymentMethod || 'Cash'}
                                </span>
                                {isRoundTrip && (
                                    <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded-md uppercase tracking-tight">Return Included</span>
                                )}
                                {(waiting ?? 0) > 0 && (
                                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md uppercase tracking-tight">{waiting}h Wait</span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-1 border-2 border-emerald-200 dark:border-emerald-800">
                                <User className="w-6 h-6 text-emerald-600" />
                            </div>
                            <p className="font-black text-sm text-right text-zinc-900 dark:text-white uppercase tracking-tighter">{userName || "User"}</p>
                        </div>
                    </div>

                    <div className="space-y-6 mb-8">
                        {/* Pickup */}
                        <div className="flex gap-4 items-start">
                            <div className="mt-1">
                                <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-900/30" />
                                <div className="w-0.5 h-10 bg-zinc-200 dark:bg-zinc-700 mx-auto my-1" />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-black">PICKUP</p>
                                <h3 className="font-bold text-lg leading-tight text-zinc-800 dark:text-zinc-200">{pickup}</h3>
                            </div>
                        </div>

                        {/* Drop */}
                        <div className="flex gap-4 items-start">
                            <div className="mt-1">
                                <div className="w-4 h-4 rounded-full bg-red-500 ring-4 ring-red-100 dark:ring-red-900/30" />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-black">DROP OFF</p>
                                <h3 className="font-bold text-lg leading-tight text-zinc-800 dark:text-zinc-200">{drop}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={onReject}
                            className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 py-5 rounded-3xl font-bold text-lg transition-all active:scale-95"
                        >
                            நிராகரி
                        </button>
                        <button
                            onClick={onAccept}
                            className="flex-[2] bg-emerald-600 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <span>ஏற்கவும்</span>
                            <div className="h-6 w-[1px] bg-white/30 mx-2" />
                            <span>₹{price}</span>
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

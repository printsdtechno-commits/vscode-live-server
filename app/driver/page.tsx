"use client";

import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import RideRequest from './components/RideRequest';
import { User, Wallet, Menu, Shield, LogOut, MessageSquare, XCircle, Clock, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ChatWindow from '../components/ChatWindow';

// Dynamically import Map with no SSR
const DriverMap = dynamic(() => import('./components/DriverMap'), {
    ssr: false,
    loading: () => (
        <div className="h-screen w-full flex items-center justify-center bg-zinc-100 text-zinc-500 animate-pulse">
            <div className="text-center">
                <p className="font-bold text-xl mb-2">Adirai Driver</p>
                <p>Loading Map...</p>
            </div>
        </div>
    )
});

export default function DriverPage() {
    const router = useRouter();
    const [isOnline, setIsOnline] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [request, setRequest] = useState<any>(null);
    const [ongoingTrip, setOngoingTrip] = useState<any>(null);
    const [driver, setDriver] = useState<any>(null);
    const [earnings, setEarnings] = useState(0);
    const [showQr, setShowQr] = useState(false);

    // Auth & Earnings Check
    useEffect(() => {
        const storedDriver = localStorage.getItem('adirai_driver');
        if (!storedDriver) {
            router.push('/driver/login');
        } else {
            try {
                setDriver(JSON.parse(storedDriver));
            } catch (e) {
                console.error("Failed to parse driver session", e);
                router.push('/driver/login');
            }

            // Load earnings safely
            const storedEarnings = localStorage.getItem('adirai_earnings');
            if (storedEarnings) {
                const val = parseFloat(storedEarnings);
                setEarnings(isNaN(val) ? 0 : val);
            }
        }
    }, [router]);

    const [prevRequestId, setPrevRequestId] = useState<number | null>(null);

    // Alert Sound & Vibration System
    const playNotification = () => {
        try {
            // 1. Vibration (Standard mobile pattern)
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
            // 2. Audible Alert (Standard Ping)
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play();
        } catch (e) {
            console.warn("Notification interaction required", e);
        }
    };

    // LIVE CONNECTION: Listen for UNIFIED trip session
    useEffect(() => {
        const checkRequests = () => {
            if (!isOnline) return;

            const tripString = localStorage.getItem('adirai_trip');
            if (tripString) {
                const trip = JSON.parse(tripString);

                // Show request ONLY if status is 'searching'
                if (trip.status === 'searching') {
                    // Filter out rejected IDs
                    const rejectedIds = JSON.parse(localStorage.getItem('adirai_rejected_ids') || '[]');
                    if (rejectedIds.includes(trip.id)) {
                        setRequest(null);
                        setOngoingTrip(null);
                        return;
                    }

                    setRequest(trip);
                    setOngoingTrip(null);

                    // ALARM: Trigger if this is a NEW request we haven't alerted for
                    if (trip.id !== prevRequestId) {
                        playNotification();
                        setPrevRequestId(trip.id);
                    }
                } else if (trip.status === 'accepted' || trip.status === 'finished') {
                    // MULTI-DRIVER CHECK: Only show dashboard if THIS driver accepted it
                    if (trip.driver?.phone === driver.phone) {
                        setOngoingTrip(trip);
                        setRequest(null);
                    } else {
                        // Someone else accepted it
                        setRequest(null);
                        setOngoingTrip(null);
                    }
                } else {
                    setRequest(null);
                    setOngoingTrip(null);
                }
            } else {
                setRequest(null);
                setOngoingTrip(null);
            }
        };

        const interval = setInterval(checkRequests, 500); // Check faster (500ms)
        window.addEventListener('storage', checkRequests);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', checkRequests);
        };
    }, [isOnline, prevRequestId, ongoingTrip]);

    const handleAccept = () => {
        if (!request) return;

        // Update the UNIFIED object to 'accepted'
        const updatedTrip = { ...request, status: 'accepted', driver: driver };
        localStorage.setItem('adirai_trip', JSON.stringify(updatedTrip));

        // Update local state
        setOngoingTrip(updatedTrip);
        setRequest(null);
    };

    const handleFinish = () => {
        if (!ongoingTrip) return;

        // Update Earnings only when trip is finished
        const price = parseFloat(ongoingTrip.price);
        if (!isNaN(price)) {
            const newEarnings = earnings + price;
            setEarnings(newEarnings);
            localStorage.setItem('adirai_earnings', newEarnings.toString());
        }

        // Mark as finished but don't delete yet so summary can show
        const finishedTrip = { ...ongoingTrip, status: 'finished' };

        // SAVE TO GLOBAL HISTORY for Manager/Admin
        const historyStr = localStorage.getItem('adirai_history') || '[]';
        const history = JSON.parse(historyStr);
        history.push(finishedTrip);
        localStorage.setItem('adirai_history', JSON.stringify(history));

        localStorage.setItem('adirai_trip', JSON.stringify(finishedTrip));
        setOngoingTrip(finishedTrip);
    };

    const formatDuration = (mins: number) => {
        const arrival = new Date();
        arrival.setMinutes(arrival.getMinutes() + mins);
        return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const closeFinishedTrip = () => {
        // Finally clear everything for the next ride
        localStorage.removeItem('adirai_trip');
        setOngoingTrip(null);
    };

    const resetEarnings = () => {
        if (confirm("சம்பாதித்த பணத்தை பூஜ்ஜியம் ஆக்க விரும்புகிறீர்களா? (Reset all earnings to ₹0?)")) {
            setEarnings(0);
            localStorage.setItem('adirai_earnings', '0');
        }
    };

    const handleReject = () => {
        if (!request) return;

        // Mark as rejected locally for this driver session
        const rejectedIds = JSON.parse(localStorage.getItem('adirai_rejected_ids') || '[]');
        if (!rejectedIds.includes(request.id)) {
            rejectedIds.push(request.id);
            localStorage.setItem('adirai_rejected_ids', JSON.stringify(rejectedIds));
        }

        setRequest(null);
    };

    const handleLogout = () => {
        localStorage.removeItem('adirai_driver');
        router.push('/driver/login');
    };

    if (!driver) return null;

    return (
        <main className="relative h-screen w-full overflow-hidden bg-zinc-50">

            {/* Header Controls */}
            <div className="absolute top-4 left-4 right-4 z-[500] flex justify-between items-start pointer-events-none">
                <button
                    onClick={handleLogout}
                    className="pointer-events-auto bg-white dark:bg-black p-3 rounded-full shadow-lg hover:scale-105 transition-transform text-red-500"
                >
                    <LogOut className="w-6 h-6" />
                </button>

                {/* Earnings Pill - Only show when Online or In Trip */}
                {(isOnline || ongoingTrip) && (
                    <div className="flex items-center gap-2 pointer-events-auto">
                        <button
                            onClick={() => setShowQr(!showQr)}
                            className="bg-white dark:bg-zinc-800 p-2.5 rounded-full shadow-lg text-emerald-600 hover:scale-105 transition-transform"
                        >
                            <QrCode className="w-6 h-6" />
                        </button>
                        <div
                            onClick={resetEarnings}
                            className="bg-black text-white dark:bg-white dark:text-black px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 font-bold hover:scale-105 transition-transform cursor-pointer"
                        >
                            <Wallet className="w-4 h-4 text-emerald-500" />
                            <span>₹{earnings.toFixed(0)}</span>
                        </div>
                    </div>
                )}

                <div className="pointer-events-auto relative">
                    <button className="bg-white dark:bg-black w-12 h-12 rounded-full shadow-lg hover:scale-105 transition-transform text-black dark:text-white overflow-hidden uppercase flex items-center justify-center p-0">
                        {driver.photo ? (
                            <img src={driver.photo} alt="P" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-6 h-6" />
                        )}
                    </button>
                    {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                    )}
                </div>
            </div>

            {/* Map Background */}
            <div className="absolute inset-x-0 top-0 bottom-[180px] z-0">
                <DriverMap
                    pickup={request?.pickup || ongoingTrip?.pickup}
                    drop={request?.drop || ongoingTrip?.drop}
                />
            </div>

            {/* Bottom Dashboard Area */}
            {isOnline && (
                <div className="absolute bottom-6 left-4 right-4 z-[500]">
                    {ongoingTrip ? (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className={`bg-white dark:bg-zinc-900 rounded-[28px] p-5 shadow-2xl border-2 ${ongoingTrip.status === 'finished' ? 'border-orange-500' : 'border-emerald-500'}`}
                        >
                            {ongoingTrip.status === 'finished' ? (
                                <div className="text-center space-y-4">
                                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                                        <Wallet className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase">Trip Finished!</h3>
                                        <p className="text-zinc-500 text-sm font-bold">சவாரி முடிந்தது. பணத்தை வசூலிக்கவும்.</p>
                                    </div>
                                    <div className="bg-orange-50 dark:bg-orange-950/20 py-4 rounded-2xl relative overflow-hidden">
                                        <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1">Total to Collect</p>
                                        <p className="text-5xl font-black text-zinc-900 dark:text-white">₹{ongoingTrip.price}</p>

                                        {ongoingTrip.paymentMethod === 'Online' && (
                                            <div className="mt-4 flex flex-col items-center gap-2 animate-in fade-in zoom-in">
                                                <div className="bg-white p-3 rounded-2xl shadow-md border-2 border-orange-100">
                                                    <img
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=imranmd@okicici&pn=AdiraiRides&am=${ongoingTrip.price}&cu=INR&tn=Ride-${ongoingTrip.id}`)}`}
                                                        alt="Payment QR"
                                                        className="w-[140px] h-[140px]"
                                                    />
                                                </div>
                                                <p className="text-[10px] font-black text-orange-600 uppercase">Scan to Pay Online</p>
                                            </div>
                                        )}
                                    </div>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={closeFinishedTrip}
                                        className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4 rounded-full font-black text-sm tracking-widest uppercase shadow-xl"
                                    >
                                        COLLECTED & CLOSE
                                    </motion.button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Ongoing Ride</p>
                                            <h3 className="text-xl font-black text-zinc-900 dark:text-white">To: {ongoingTrip.drop}</h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-emerald-600">₹{ongoingTrip.price}</p>
                                            <div className="flex flex-col items-end gap-1 mt-1">
                                                <div className="flex items-center gap-2 text-xs font-bold">
                                                    <span className="text-zinc-400">{ongoingTrip.distance} KM</span>
                                                    {ongoingTrip.duration && (
                                                        <span className="text-emerald-500 flex items-center gap-0.5">
                                                            <Clock size={10} />
                                                            ETA: {formatDuration(ongoingTrip.duration)}
                                                        </span>
                                                    )}
                                                </div>
                                                {ongoingTrip.isRoundTrip && (
                                                    <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md uppercase tracking-tighter">Round Trip (x2)</span>
                                                )}
                                                {ongoingTrip.waiting > 0 && (
                                                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md uppercase tracking-tighter">Wait: {ongoingTrip.waiting}h</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mb-3">
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setIsChatOpen(true)}
                                            className="flex-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 rounded-full py-3.5 text-xs font-black flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800"
                                        >
                                            <MessageSquare size={16} />
                                            <span>CHAT</span>
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleFinish}
                                            className="flex-[1.5] bg-emerald-600 text-white rounded-full py-3.5 text-xs font-black shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2"
                                        >
                                            <span>FINISH RIDE</span>
                                        </motion.button>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (confirm("Cancel this ride?")) closeFinishedTrip();
                                        }}
                                        className="w-full text-red-500 font-bold flex items-center justify-center gap-2 py-2 hover:bg-red-50 rounded-2xl transition-colors text-sm"
                                    >
                                        <XCircle size={16} />
                                        <span>CANCEL RIDE / சவாரி ரத்து</span>
                                    </button>
                                </>
                            )}

                            <AnimatePresence>
                                {isChatOpen && ongoingTrip && ongoingTrip.status !== 'finished' && (
                                    <ChatWindow
                                        tripId={ongoingTrip.id}
                                        role="driver"
                                        onClose={() => setIsChatOpen(false)}
                                    />
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ) : request ? (
                        null // Handled by RideRequest popup
                    ) : (
                        <div className="max-w-xs mx-auto space-y-4">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="bg-white dark:bg-black/80 backdrop-blur-md p-4 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 text-center"
                            >
                                <p className="text-zinc-500 text-sm font-medium mb-1">Looking for rides...</p>
                                <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-emerald-500"
                                        animate={{ x: ["-100%", "100%"] }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                    />
                                </div>
                            </motion.div>

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsOnline(false)}
                                className="w-full bg-red-500 text-white rounded-full py-3.5 text-lg font-bold shadow-xl shadow-red-500/30 flex items-center justify-center gap-2"
                            >
                                <span>GO OFFLINE</span>
                            </motion.button>
                        </div>
                    )}
                </div>
            )}

            {!isOnline && (
                <div className="absolute bottom-6 left-4 right-4 z-[500] max-w-xs mx-auto">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOnline(true)}
                        className="w-full bg-emerald-600 text-white rounded-full py-3.5 text-lg font-bold shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2"
                    >
                        <span>GO ONLINE</span>
                    </motion.button>
                </div>
            )}

            {/* QR Code Overlay Modal */}
            <AnimatePresence>
                {showQr && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowQr(false)}
                        className="absolute inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white rounded-[32px] p-8 w-full max-w-xs text-center space-y-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-zinc-900">PAYMENT QR</h3>
                                <button onClick={() => setShowQr(false)} className="text-zinc-400 hover:text-zinc-900">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="aspect-square bg-white rounded-3xl border-2 border-zinc-100 flex items-center justify-center relative p-4 shadow-inner">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent('upi://pay?pa=imranmd@okicici&pn=AdiraiRides&cu=INR')}`}
                                    alt="Driver QR"
                                    className="w-full h-full"
                                />
                            </div>

                            <div className="space-y-1">
                                <p className="font-black text-xl text-zinc-900">{driver?.name}</p>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{driver?.vehicle} Driver</p>
                            </div>

                            <p className="text-[10px] text-zinc-400 font-medium">பயணிகள் இந்த QR குறியீட்டை ஸ்கேன் செய்து பணம் செலுத்தலாம்.</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ride Request Popup */}
            <RideRequest
                visible={!!request}
                pickup={request?.pickup || ""}
                drop={request?.drop || ""}
                price={request?.price || "0"}
                distance={request?.distance || "0"}
                waiting={request?.waiting || 0}
                isRoundTrip={request?.isRoundTrip || false}
                userName={request?.user || ""}
                paymentMethod={request?.paymentMethod || "Cash"}
                onAccept={handleAccept}
                onReject={handleReject}
            />
        </main>
    );
}

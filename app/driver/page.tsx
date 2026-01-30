"use client";

import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import RideRequest from './components/RideRequest';
import { User, Wallet, Menu, Shield, LogOut, MessageSquare, XCircle, Clock, QrCode, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ChatWindow from '../components/ChatWindow';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, limit, orderBy } from 'firebase/firestore';
import { formatTel, getAppBaseUrl } from '@/lib/utils';

// SUPPRESS FIREBASE PERMISSION ERRORS
if (typeof window !== 'undefined') {
    const originalError = console.error;
    console.error = (...args) => {
        if (args[0]?.toString().includes('Missing or insufficient permissions')) return;
        if (args[0]?.code === 'permission-denied') return;
        originalError(...args);
    };
}

// Dynamically import Map with no SSR
const DriverMap = dynamic(() => import('./components/DriverMap'), {
    ssr: false,
    loading: () => (
        <div className="h-screen w-full flex items-center justify-center bg-zinc-100 text-zinc-500 animate-pulse">
            <div className="text-center">
                <p className="font-bold text-xl mb-2">Adirai Driver</p>
                <p>வரைபடம் ஏற்றப்படுகிறது...</p>
            </div>
        </div>
    )
});

export default function DriverPage() {
    const router = useRouter();
    const [isOnline, setIsOnline] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('adirai_driver_online') === 'true';
        }
        return false;
    });

    useEffect(() => {
        localStorage.setItem('adirai_driver_online', isOnline.toString());
    }, [isOnline]);

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [request, setRequest] = useState<any>(null);
    const [ongoingTrip, setOngoingTrip] = useState<any>(null);
    const [driver, setDriver] = useState<any>(null);
    const [earnings, setEarnings] = useState(0);
    const [showQr, setShowQr] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

    // PERSISTENT AUDIO OBJECTS
    const [audioManager] = useState<{
        message: HTMLAudioElement | null;
        ring: HTMLAudioElement | null;
    }>(() => {
        if (typeof Audio === 'undefined') return { message: null, ring: null };
        const msg = new Audio('https://raw.githubusercontent.com/sh4n0/TaxiApp/master/src/assets/sounds/message.mp3');
        const rng = new Audio('https://raw.githubusercontent.com/sh4n0/TaxiApp/master/src/assets/sounds/request.mp3');
        msg.load();
        rng.load();
        return { message: msg, ring: rng };
    });

    const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

    // Robust Beep Fallback (Works even if MP3 fails)
    const playSystemBeep = (freq = 440, duration = 0.2) => {
        try {
            const ctx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
            if (!audioCtx) setAudioCtx(ctx);
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.error("WebAudio Error", e);
        }
    };

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

            const storedEarnings = localStorage.getItem('adirai_earnings');
            if (storedEarnings) {
                const val = parseFloat(storedEarnings);
                setEarnings(isNaN(val) ? 0 : val);
            }
        }
    }, [router]);

    const [prevRequestId, setPrevRequestId] = useState<string | null>(null);

    const playNotification = (type: 'message' | 'ring') => {
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(type === 'ring' ? [500, 200, 500] : [200]);
            }

            // Audio Logic
            const audio = type === 'message' ? audioManager.message : audioManager.ring;
            if (audio) {
                audio.currentTime = 0;
                audio.loop = (type === 'ring');
                audio.volume = 1.0;
                audio.play().catch(e => {
                    console.warn(`MP3 ${type} blocked, trying Beep fallback...`);
                    playSystemBeep(type === 'ring' ? 880 : 440, 0.5);
                });
            } else {
                playSystemBeep(type === 'ring' ? 880 : 440, 0.5);
            }
        } catch (e) {
            playSystemBeep(440, 0.2);
        }
    };

    const stopRinging = () => {
        if (audioManager.ring) {
            audioManager.ring.pause();
            audioManager.ring.currentTime = 0;
        }
    };

    // Firebase Listeners
    useEffect(() => {
        if (!isOnline || !driver) return;
        let fallbackInterval: any;

        if ((db as any).type === 'mock') {
            const checkRequests = () => {
                if (!isOnline) return;
                const tripString = localStorage.getItem('adirai_trip');
                if (tripString) {
                    const trip = JSON.parse(tripString);
                    if (trip.status === 'searching') {
                        const rejectedIds = JSON.parse(localStorage.getItem('adirai_rejected_ids') || '[]');
                        if (rejectedIds.includes(trip.id)) {
                            setRequest(null);
                            return;
                        }
                        setRequest(trip);
                        if (trip.id !== prevRequestId) {
                            playNotification('ring');
                            setPrevRequestId(trip.id);
                        }
                    } else if (trip.status === 'accepted' || trip.status === 'finished') {
                        if (trip.driver?.phone === driver.phone) {
                            setOngoingTrip(trip);
                            setRequest(null);
                        } else {
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

            const interval = setInterval(checkRequests, 1000);
            window.addEventListener('storage', checkRequests);
            return () => {
                clearInterval(interval);
                window.removeEventListener('storage', checkRequests);
            };
        }

        const unsubscribeRequests = onSnapshot(query(
            collection(db, 'trips'),
            where('status', '==', 'searching'),
            limit(10) // Get last 10 to be safe
        ), (snapshot) => {
            if (!snapshot.empty) {
                // Sort by timestamp manually to avoid Firebase Index requirement
                const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
                docs.sort((a, b) => (b.createdTime || 0) - (a.createdTime || 0));

                const trip = docs[0];
                const rejectedIds = JSON.parse(localStorage.getItem('adirai_rejected_ids') || '[]');
                if (!rejectedIds.includes(trip.id)) {
                    if (!ongoingTrip) {
                        setRequest(trip);
                        if (trip.id !== prevRequestId) {
                            playNotification('ring');
                            setPrevRequestId(trip.id.toString());
                        }
                    }
                }
            } else {
                if (!ongoingTrip) setRequest(null);
            }
        }, (err) => {
            console.error("Requests Listener fail", err);
            startLocalPolling();
        });

        let unsubscribeTrip = () => { };
        if (ongoingTrip?.id) {
            unsubscribeTrip = onSnapshot(doc(db, 'trips', ongoingTrip.id), (docSnap) => {
                if (docSnap.exists()) {
                    setOngoingTrip({ id: docSnap.id, ...docSnap.data() });
                    setRequest(null);
                }
            });
        }

        const startLocalPolling = () => {
            if (fallbackInterval) return;
            const checkRequests = () => {
                if (!isOnline) return;
                const tripString = localStorage.getItem('adirai_trip');
                if (tripString) {
                    const trip = JSON.parse(tripString);
                    if (trip.status === 'searching') {
                        const rejectedIds = JSON.parse(localStorage.getItem('adirai_rejected_ids') || '[]');
                        if (!rejectedIds.includes(trip.id) && !ongoingTrip) {
                            setRequest(trip);
                            if (trip.id !== prevRequestId) {
                                playNotification('ring');
                                setPrevRequestId(trip.id);
                            }
                        }
                    } else if (trip.status === 'accepted' || trip.status === 'finished') {
                        if (trip.driver?.phone === driver.phone) {
                            setOngoingTrip(trip);
                            setRequest(null);
                        }
                    }
                }
            };
            fallbackInterval = setInterval(checkRequests, 1000);
        };
        startLocalPolling();

        return () => {
            unsubscribeRequests();
            unsubscribeTrip();
            if (fallbackInterval) clearInterval(fallbackInterval);
        };
    }, [isOnline, driver, ongoingTrip?.id]);

    useEffect(() => {
        if (!ongoingTrip || isChatOpen) {
            if (isChatOpen) setUnreadCount(0);
            return;
        }
        const connectTime = Date.now();
        try {
            if ((db as any).type !== 'mock') {
                const q = query(
                    collection(db, 'trips', ongoingTrip.id.toString(), 'messages'),
                    orderBy('timestamp', 'desc'),
                    limit(1)
                );
                const unsub = onSnapshot(q, (snapshot) => {
                    if (snapshot.empty) return;
                    const lastMsg = snapshot.docs[0].data();
                    if (lastMsg.sender === 'user' && lastMsg.timestamp > connectTime) {
                        setUnreadCount(prev => prev + 1);
                        playNotification('message');
                        setNotificationMessage(`Message: ${lastMsg.text}`);
                    }
                });
                return () => unsub();
            }
        } catch (e) { }
    }, [ongoingTrip?.id, isChatOpen]);

    const handleAccept = async () => {
        if (!request) return;
        stopRinging();
        if ((db as any).type === 'mock') {
            const updatedTrip = { ...request, status: 'accepted', driver };
            localStorage.setItem('adirai_trip', JSON.stringify(updatedTrip));
            setOngoingTrip(updatedTrip);
            setRequest(null);
            return;
        }
        try {
            await updateDoc(doc(db, 'trips', request.id), { status: 'accepted', driver });
            setOngoingTrip({ ...request, status: 'accepted', driver });
            setRequest(null);
        } catch (e) {
            setRequest(null);
        }
    };

    const handleFinish = async () => {
        if (!ongoingTrip) return;
        const price = parseFloat(ongoingTrip.price);
        if (!isNaN(price)) {
            const newEarnings = earnings + price;
            setEarnings(newEarnings);
            localStorage.setItem('adirai_earnings', newEarnings.toString());
        }
        if ((db as any).type === 'mock') {
            const finishedTrip = { ...ongoingTrip, status: 'finished' };
            localStorage.setItem('adirai_trip', JSON.stringify(finishedTrip));
            setOngoingTrip(finishedTrip);
            return;
        }
        try {
            await updateDoc(doc(db, 'trips', ongoingTrip.id), { status: 'finished' });
        } catch (e) { }
    };

    const handleReject = () => {
        if (!request) return;
        stopRinging();
        const rejectedIds = JSON.parse(localStorage.getItem('adirai_rejected_ids') || '[]');
        rejectedIds.push(request.id);
        localStorage.setItem('adirai_rejected_ids', JSON.stringify(rejectedIds));
        setRequest(null);
    };

    const handleLogout = () => {
        localStorage.removeItem('adirai_driver');
        router.push('/driver/login');
    };

    if (!driver) return null;

    return (
        <main className="relative h-screen w-full overflow-hidden bg-zinc-50 font-sans">
            <AnimatePresence>
                {notificationMessage && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="absolute top-20 left-4 right-4 z-[2000] bg-zinc-900 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-zinc-800"
                        onClick={() => { setNotificationMessage(null); setIsChatOpen(true); }}
                    >
                        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0"><MessageSquare size={20} /></div>
                        <div>
                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">புதிய செய்தி</p>
                            <p className="text-sm font-medium line-clamp-2">{notificationMessage}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="absolute top-4 left-4 right-4 z-[500] flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto relative group">
                    <button className="bg-white dark:bg-black p-3 rounded-full shadow-lg text-zinc-800"><Menu className="w-6 h-6" /></button>
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden hidden group-hover:block transition-all">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-100">
                            <p className="font-bold text-sm">{driver.name}</p>
                            <p className="text-xs text-zinc-500">{driver.vehicle}</p>
                        </div>
                        <div className="p-2 space-y-1">
                            <button onClick={() => router.push('/')} className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-2">Switch to Customer</button>
                            <button onClick={() => router.push('/admin')} className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-2">Switch to Admin</button>
                            <div className="p-3 mt-2 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">App Domain (Sharing)</p>
                                <p className="text-[10px] font-mono break-all text-emerald-600">{getAppBaseUrl()}/driver</p>
                            </div>
                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 rounded-xl flex items-center gap-2 font-bold"><LogOut size={14} /> Logout</button>
                        </div>
                    </div>
                </div>

                {(isOnline || ongoingTrip) && (
                    <div className="flex items-center gap-2 pointer-events-auto">
                        {/* Sound Test Button */}
                        <button
                            onClick={() => playNotification('message')}
                            className="bg-white dark:bg-zinc-800 p-2.5 rounded-full shadow-lg text-emerald-600 active:scale-90"
                            title="Test Sound"
                        >
                            <Clock className="w-6 h-6" />
                        </button>
                        <button onClick={() => setShowQr(!showQr)} className="bg-white dark:bg-zinc-800 p-2.5 rounded-full shadow-lg text-emerald-600"><QrCode className="w-6 h-6" /></button>
                        <div onClick={() => { if (confirm("Reset earnings?")) setEarnings(0); }} className="bg-black text-white dark:bg-white dark:text-black px-5 py-2.5 rounded-full shadow-lg flex flex-col items-center">
                            <div className="flex items-center gap-2 font-bold">
                                <Wallet className="w-4 h-4 text-emerald-500" /><span>₹{earnings.toFixed(0)}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${(db as any).type !== 'mock' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                                <span className="text-[7px] uppercase font-black tracking-tighter opacity-50">Sync</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="pointer-events-auto relative">
                    <button className="bg-white dark:bg-black w-12 h-12 rounded-full shadow-lg overflow-hidden flex items-center justify-center">
                        {driver.photo ? <img src={driver.photo} alt="P" className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
                    </button>
                    {isOnline && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>}
                </div>
            </div>

            {/* Map */}
            {(!ongoingTrip || ongoingTrip.status !== 'finished') && (
                <div className="absolute inset-x-0 top-0 bottom-[180px] z-0">
                    <DriverMap pickup={request?.pickup || ongoingTrip?.pickup} drop={request?.drop || ongoingTrip?.drop} />
                </div>
            )}

            {/* Dashboard */}
            {isOnline && (
                <div className="absolute bottom-6 left-4 right-4 z-[500]">
                    {ongoingTrip ? (
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`bg-white dark:bg-zinc-900 rounded-[28px] p-5 shadow-2xl border-2 ${ongoingTrip.status === 'finished' ? 'border-orange-500' : 'border-emerald-500'}`}>
                            {ongoingTrip.status === 'finished' ? (
                                <div className="text-center space-y-4">
                                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto"><Wallet className="w-6 h-6 text-orange-600" /></div>
                                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white">சவாரி முடிந்தது!</h3>
                                    <div className="bg-orange-50 dark:bg-orange-950/20 py-4 rounded-2xl">
                                        <p className="text-xs font-black text-orange-600 uppercase">மொத்த கட்டணம்</p>
                                        <p className="text-5xl font-black text-zinc-900 dark:text-white">₹{ongoingTrip.price}</p>
                                    </div>
                                    <button onClick={() => { localStorage.removeItem('adirai_trip'); setOngoingTrip(null); }} className="w-full bg-zinc-900 text-white py-4 rounded-full font-black uppercase shadow-xl">பணம் பெறப்பட்டது</button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">தற்போதைய சவாரி</p>
                                            <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase">To: {ongoingTrip.drop}</h3>
                                        </div>
                                        <div className="text-right"><p className="text-2xl font-black text-emerald-600">₹{ongoingTrip.price}</p></div>
                                    </div>
                                    <div className="flex gap-3 mb-3">
                                        <a
                                            href={formatTel(ongoingTrip.userPhone || ongoingTrip.phone)}
                                            className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform shrink-0"
                                        >
                                            <Phone size={24} fill="currentColor" />
                                        </a>
                                        <button onClick={() => setIsChatOpen(true)} className="flex-1 bg-emerald-100 text-emerald-900 rounded-full py-3.5 text-xs font-black flex items-center justify-center gap-2 relative">
                                            <MessageSquare size={16} />{unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
                                            <span>உரையாடல்</span>
                                        </button>
                                        <button onClick={handleFinish} className="flex-[1.5] bg-emerald-600 text-white rounded-full py-3.5 text-xs font-black shadow-xl">சவாரி முடிந்தது</button>
                                    </div>
                                    <button onClick={() => { if (confirm("Cancel ride?")) { localStorage.removeItem('adirai_trip'); setOngoingTrip(null); } }} className="w-full text-red-500 font-bold py-2 text-sm flex items-center justify-center gap-2"><XCircle size={16} /> ரத்து (CANCEL)</button>
                                </>
                            )}
                        </motion.div>
                    ) : request ? null : (
                        <div className="max-w-xs mx-auto space-y-4">
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-4 rounded-xl shadow-lg border border-zinc-200 text-center">
                                <p className="text-zinc-500 text-sm font-bold mb-1">சவாரி தேடுகிறது...</p>
                                <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                                    <motion.div className="h-full bg-emerald-500" animate={{ x: ["-100%", "100%"] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} />
                                </div>
                            </motion.div>
                            <button onClick={() => setIsOnline(false)} className="w-full bg-red-500 text-white rounded-full py-4 text-lg font-bold shadow-xl">ஓய்வு எடு (OFFLINE)</button>
                        </div>
                    )}
                </div>
            )}

            {!isOnline && (
                <div className="absolute bottom-6 left-4 right-4 z-[500] max-w-xs mx-auto">
                    <button
                        onClick={() => {
                            setIsOnline(true);
                            // UNLOCK ALL AUDIO SYSTEMS
                            playSystemBeep(440, 0.01); // Prime WebAudio
                            if (audioManager.message) {
                                audioManager.message.play().then(() => {
                                    audioManager.message?.pause();
                                    audioManager.message!.currentTime = 0;
                                }).catch(() => { });
                            }
                            if (audioManager.ring) {
                                audioManager.ring.play().then(() => {
                                    audioManager.ring?.pause();
                                    audioManager.ring!.currentTime = 0;
                                }).catch(() => { });
                            }
                        }}
                        className="w-full bg-emerald-600 text-white rounded-full py-4 text-xl font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                        <Shield className="w-6 h-6" /><span>பணியை தொடங்கு (GO ONLINE)</span>
                    </button>
                </div>
            )}

            <AnimatePresence>
                {isChatOpen && ongoingTrip && ongoingTrip.status !== 'finished' && (
                    <ChatWindow tripId={ongoingTrip.id} role="driver" onClose={() => setIsChatOpen(false)} />
                )}
            </AnimatePresence>

            {showQr && (
                <div className="absolute inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowQr(false)}>
                    <div className="bg-white rounded-[32px] p-8 w-full max-w-xs text-center space-y-6" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-zinc-900">கட்டண QR குறியீடு</h3>
                        <div className="aspect-square bg-white rounded-3xl border-2 border-zinc-100 flex items-center justify-center p-4">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent('upi://pay?pa=imranmd@okicici&pn=AdiraiRides&cu=INR')}`} alt="QR" className="w-full h-full" />
                        </div>
                        <p className="font-black text-xl">{driver.name}</p>
                        <button onClick={() => setShowQr(false)} className="w-full bg-zinc-900 text-white py-3 rounded-full font-bold">மூடு</button>
                    </div>
                </div>
            )}

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

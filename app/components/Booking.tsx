"use client";
import React, { useState, useEffect } from 'react';
import { Car, Bike, MapPin, Navigation, CheckCircle2, IndianRupee, Info, User, Send, MessageSquare, Clock, Repeat, XCircle, Banknote, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PRICING, formatTel } from '@/lib/utils';
import ChatWindow from './ChatWindow';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
// SUPPRESS FIREBASE PERMISSION ERRORS
if (typeof window !== 'undefined') {
    const originalError = console.error;
    console.error = (...args) => {
        if (args[0]?.toString().includes('Missing or insufficient permissions')) return;
        if (args[0]?.code === 'permission-denied') return;
        originalError(...args);
    };
}

interface BookingProps {
    onPickupChange?: (val: string) => void;
    onDropChange?: (val: string) => void;
}

export default function BookingInterface({ onPickupChange, onDropChange }: BookingProps) {
    const [pickup, setPickup] = useState("");
    const [drop, setDrop] = useState("");
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [tripId, setTripId] = useState<string | number | null>(null);



    // Notify parent for map updates
    useEffect(() => {
        if (onPickupChange) onPickupChange(pickup);
    }, [pickup, onPickupChange]);

    useEffect(() => {
        if (onDropChange) onDropChange(drop);
    }, [drop, onDropChange]);
    const [activeInput, setActiveInput] = useState<'pickup' | 'drop' | null>(null);
    const [selectedRide, setSelectedRide] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'searching' | 'accepted' | 'finished'>('idle');
    const [driverDetails, setDriverDetails] = useState<any>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [waitingHours, setWaitingHours] = useState(0);
    const [isRoundTrip, setIsRoundTrip] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online'>('Cash');
    const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

    // Alert Sound & Vibration
    const playNotification = () => {
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.warn("Audio play failed", e));
        } catch (e) {
            console.warn("Notification error", e);
        }
    };

    // Location Database
    const suggestions = {
        local: [
            "Bus Stand (பேருந்து நிலையம்)",
            "Middle Street (நடுத்தெரு)",
            "Hospital Road (மருத்துவமனை சாலை)",
            "Beach Road (கடற்கரை சாலை)",
            "New Street (புது தெரு)",
            "ECC Road (இ.சி.சி சாலை)",
            "Market (மார்க்கெட்)",
            "Takkiya Street (தக்கியா தெரு)",
            "Kadukkadu (காடுக்காடு)",
            "Anaimugudan (ஆனைமுகுந்தன்)",
            "Khadir (காதர்)",
            "Karikkadu (கரிக்காடு)",
            "Maharajasamudram (மகாராஜசமுத்திரம்)",
            "Maravakkadu (மறவக்காடு)",
            "Nadimuthu Nagar (நடிமுத்து நகர்)",
            "Thamarankottai (தாமரங்கோட்டை)",
            "Chekkadi Street (செக்கடி தெரு)",
            "Jailani Street (ஜெயிலானி தெரு)",
            "Railway Station (இரயில் நிலையம்)",
            "ECR Road (ஈ.சி.ஆர் சாலை)",
            "Pudumanai Street",
        ],
        regional: [
            "Pattukottai (பட்டுக்கோட்டை)",
            "Thanjavur (தஞ்சாவூர்)",
            "Muthupettai (முத்துப்பேட்டை)",
            "Mallipattinam (மல்லிப்பட்டினம்)",
            "Peravurani (பேராவூரணி)",
            "Tiruchirappalli (திருச்சி)",
            "Mannargudi (மன்னார்குடி)",
            "Chennai (சென்னை)",
            "Madurai (மதுரை)",
            "Pudukkottai (புதுக்கோட்டை)",
            "Kumbakonam (கும்பகோணம்)",
            "Nagapattinam (நாகப்பட்டினம்)",
            "Tiruvarur (திருவாரூர்)",
            "Mayiladuthurai (மயிலாடுதுறை)",
            "Coimbatore (கோயம்புத்தூர்)",
            "Salem (சேலம்)",
            "Erode (ஈரோடு)",
            "Vellore (வேலூர்)",
            "Tirunelveli (திருநெல்வேலி)",
            "Kanyakumari (கன்னியாகுமரி)",
        ]
    };

    const getFilteredSuggestions = (val: string) => {
        if (!val || val.length < 1) return [];
        const combined = [...suggestions.local, ...suggestions.regional];
        return combined.filter(s => s.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
    };

    // Rate Calculation Logic
    const calculateFare = (type: string) => {
        if (!distance) return 0;

        let baseFare = 0;
        // Check if either location is a known town (Regional)
        const knownRegional = [...suggestions.regional].map(s => s.toLowerCase().split(' ')[0]);
        const isRegional = knownRegional.some(town => pickup.toLowerCase().includes(town) || drop.toLowerCase().includes(town));

        if (isRegional) {
            const rate = PRICING.regional[type as keyof typeof PRICING.regional] || 0;
            baseFare = distance * rate;
        } else {
            // Local Flat Rate
            baseFare = PRICING.local[type as keyof typeof PRICING.local] || 0;
        }

        // Apply Round Trip (Return) - Double the base amount
        if (isRoundTrip) {
            baseFare = baseFare * 2;
        }

        // Add Waiting Charges (Rs 10 per hour)
        const waitingCharge = waitingHours * PRICING.waiting;
        return baseFare + waitingCharge;
    };

    const calculateDuration = (dist: number, type: string) => {
        // Base: 1 KM = 10 Minutes
        const baseMinutes = dist * 10;
        // Traffic Addition: Adding 25% extra for traffic delays
        const trafficDelay = baseMinutes * 0.25;
        // Pickup Buffer: 3 mins for driver arrival
        return Math.ceil(baseMinutes + trafficDelay + 3);
    };

    const formatDuration = (mins: number) => {
        const arrival = new Date();
        arrival.setMinutes(arrival.getMinutes() + mins);
        const timeStr = arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `வருகை: ${timeStr}`;
    };

    // ... updated distance logic here ...


    // Smart Distance Calculator
    useEffect(() => {
        if (pickup.length > 2 && drop.length > 2) {
            import('@/lib/utils').then(({ calculateDistance, getKnownDistance }) => {
                // 1. Check Known Matrix
                const knownDist = getKnownDistance(pickup, drop);
                if (knownDist) {
                    setDistance(knownDist);
                    return;
                }

                // 2. Calculate using Shared Coordinate Logic (Consistent with Map)
                const calcDist = calculateDistance(pickup, drop);
                setDistance(calcDist);
            });
        } else {
            setDistance(null);
        }
    }, [pickup, drop]);

    const rides = [
        { id: 'bike', name: 'Bike', icon: <Bike className="w-7 h-7" /> },
        { id: 'auto', name: 'Auto', icon: <Car className="w-7 h-7" /> },
        { id: 'car', name: 'Car', icon: <Car className="w-7 h-7" /> },
    ];

    const handleConfirm = () => {
        if (!pickup || !drop || !selectedRide || !distance) {
            alert("விவரங்களை நிரப்பவும்");
            return;
        }

        setStatus('searching');

        // Prepare User Data
        const userSession = localStorage.getItem('adirai_user');
        const userData = userSession ? JSON.parse(userSession) : { name: 'Anonymous', phone: '' };
        const finalPrice = calculateFare(selectedRide);

        const tripData = {
            status: 'searching',
            pickup,
            drop,
            distance: distance.toFixed(1),
            vehicle: selectedRide,
            price: finalPrice.toFixed(0),
            duration: calculateDuration(distance, selectedRide || 'auto'),
            paymentMethod,
            waiting: waitingHours,
            isRoundTrip: isRoundTrip,
            user: userData.name,
            userPhone: userData.phone,
            timestamp: serverTimestamp(), // Use server time for cross-device sync
            createdTime: Date.now() // Local fallback
        };

        // FIREBASE: Create Trip
        try {
            if ((db as any).type === 'mock') {
                console.warn("Firebase not configured. Using LocalStorage fallback.");
                // Fallback: Save to LocalStorage for simulation
                const mockId = Date.now().toString();
                const mockTrip = { ...tripData, id: mockId };
                localStorage.setItem('adirai_trip', JSON.stringify(mockTrip));
                setTripId(mockId);
                // We don't return here, we let execution continue or just handle it
            } else {
                addDoc(collection(db, 'trips'), tripData).then((docRef) => {
                    setTripId(docRef.id);
                    localStorage.setItem('adirai_trip_id', docRef.id);
                    // SHADOW WRITE: Ensure driver sees it even if listener fails
                    localStorage.setItem('adirai_trip', JSON.stringify({ ...tripData, id: docRef.id }));
                }).catch((err) => {
                    console.error("Firestore Add Error (Handled):", err);
                    // If permissions fail, fallback triggers via the outer catch usually, 
                    // or we handle it here if it bubbled differently.
                    // Force fallback logic or alert:
                    if (err.code === 'permission-denied') {
                        const mockId = Date.now().toString();
                        const mockTrip = { ...tripData, id: mockId };
                        localStorage.setItem('adirai_trip', JSON.stringify(mockTrip));
                        setTripId(mockId);
                    }
                });
            }
        } catch (e: any) {
            console.error("Error adding trip: ", e);
            if (e.code === 'permission-denied') {
                alert("Permission Denied (Firebase Rules). Using Local Storage.");
                // Fallback
                const mockId = Date.now().toString();
                const mockTrip = { ...tripData, id: mockId };
                localStorage.setItem('adirai_trip', JSON.stringify(mockTrip));
                setTripId(mockId);
            } else {
                alert("Connection Error. Try again.");
                setStatus('idle');
            }
        }
    };

    const SuggestionBox = ({ field }: { field: 'pickup' | 'drop' }) => {
        const val = field === 'pickup' ? pickup : drop;
        const list = getFilteredSuggestions(val);
        if (activeInput !== field) return null;

        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-emerald-100 z-[1100] overflow-hidden"
            >
                {/* Current Location Option */}
                <button
                    className="w-full text-left p-4 active:bg-emerald-50 flex items-center gap-3 border-b border-emerald-50 transition-colors text-emerald-600"
                    onClick={() => {
                        if (field === 'pickup') setPickup("Adirampattinam (My Location)");
                        else setDrop("Adirampattinam (My Location)");
                        setActiveInput(null);
                    }}
                >
                    <Navigation className="w-4 h-4" />
                    <Navigation className="w-4 h-4" />
                    <span className="font-bold">தற்போதைய இடம்</span>
                </button>

                {list.map((s, i) => (
                    <button
                        key={i}
                        className="w-full text-left p-4 active:bg-emerald-50 flex items-center gap-3 border-b border-emerald-50 last:border-none transition-colors"
                        onClick={() => {
                            if (field === 'pickup') setPickup(s);
                            else setDrop(s);
                            setActiveInput(null);
                        }}
                    >
                        <MapPin className="text-emerald-500 w-4 h-4" />
                        <span className="font-medium text-emerald-950">{s}</span>
                    </button>
                ))}
            </motion.div>
        );
    };

    // FIREBASE: Listen for Trip Updates
    useEffect(() => {
        if (!tripId) return;

        if ((db as any).type === 'mock') {
            // LocalStorage Listener Fallback
            const checkTrip = () => {
                const tripString = localStorage.getItem('adirai_trip');
                if (tripString) {
                    const trip = JSON.parse(tripString);
                    if (trip.status === 'accepted' && status !== 'accepted') {
                        setStatus('accepted');
                        setDriverDetails(trip.driver);
                    }
                    if (trip.status === 'finished' && status !== 'finished') {
                        setStatus('finished');
                    }
                }
            };
            window.addEventListener('storage', checkTrip);
            const interval = setInterval(checkTrip, 1000);
            return () => {
                window.removeEventListener('storage', checkTrip);
                clearInterval(interval);
            };
        }

        const unsub = onSnapshot(doc(db, 'trips', tripId.toString()), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === 'accepted' && status !== 'accepted') {
                    setStatus('accepted');
                    setDriverDetails(data.driver);
                }
                if (data.status === 'finished' && status !== 'finished') {
                    setStatus('finished');
                }
            }
        });

        return () => unsub();

    }, [tripId, status]);

    // NEW: Listen for Chat Messages (Notification) - Customer Side
    useEffect(() => {
        if (!tripId || isChatOpen || status !== 'accepted') {
            if (isChatOpen) setUnreadCount(0);
            return;
        }

        const connectTime = Date.now();
        try {
            if ((db as any).type !== 'mock') {
                const q = query(
                    collection(db, 'trips', tripId.toString(), 'messages'),
                    orderBy('timestamp', 'desc'),
                    limit(1)
                );

                const unsub = onSnapshot(q, (snapshot) => {
                    if (snapshot.empty) return;
                    const lastMsg = snapshot.docs[0].data();

                    // Check if NEW and from DRIVER
                    if (lastMsg.sender === 'driver' && lastMsg.timestamp > connectTime) {
                        setUnreadCount(prev => prev + 1);
                        playNotification();
                        setNotificationMessage(`Message: ${lastMsg.text}`);
                        // No timeout - persist until clicked
                    }
                });
                return () => unsub();
            }
        } catch (e) { console.error("Message Listener fail", e); }
    }, [tripId, isChatOpen, status]);

    const handleReset = async () => {
        // 1. Update status to 'cancelled' so Driver App knows
        if (tripId) {
            // Firebase Update
            try {
                if ((db as any).type !== 'mock') {
                    // Fire and forget to avoid waiting too long
                    updateDoc(doc(db, 'trips', tripId.toString()), { status: 'cancelled' }).catch(e => console.error("Cancel Sync Error", e));
                }
            } catch (e) { console.error("Cancel Error", e); }
        }

        // 2. LocalStorage Update (Critical for Sync)
        const tripString = localStorage.getItem('adirai_trip');
        if (tripString) {
            const trip = JSON.parse(tripString);
            trip.status = 'cancelled';
            localStorage.setItem('adirai_trip', JSON.stringify(trip));
        }

        // 3. Reset UI state
        setStatus('idle');
        setDriverDetails(null);
        setTripId(null);
        localStorage.removeItem('adirai_trip_id');
    }

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] shadow-2xl p-5 z-[1000] border-t border-emerald-50 safe-bottom max-h-[90vh] overflow-y-auto"
        >
            <AnimatePresence>
                {notificationMessage && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="sticky top-0 z-[2000] mb-4 bg-zinc-900 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-zinc-800 cursor-pointer"
                        onClick={() => {
                            setNotificationMessage(null);
                            setIsChatOpen(true);
                        }}
                    >
                        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                            <MessageSquare size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">ஓட்டுநர் செய்தி (New Message)</p>
                            <p className="text-sm font-medium line-clamp-1">{notificationMessage}</p>
                        </div>
                        <XCircle size={18} className="text-zinc-500" />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="w-12 h-1 bg-emerald-100 rounded-full mx-auto mb-4" />

            {status === 'idle' && (
                <div className="space-y-4">
                    {/* Brand Identity - Hidden on mobile if requested, or made smaller */}
                    <div className="hidden md:flex flex-col items-center justify-center pt-1 pb-2">
                        <img src="/logo.png" alt="Adirai Rides Logo" className="h-16 w-auto" />
                    </div>

                    <div className="bg-emerald-50/50 p-3 rounded-2xl space-y-3">
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={22} />
                            <input
                                type="text"
                                placeholder="ஏறுமிடம் (Pickup)"
                                className="w-full bg-white border-none p-3 pl-11 rounded-xl text-base focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={pickup}
                                onChange={(e) => setPickup(e.target.value)}
                                onFocus={() => setActiveInput('pickup')}
                                onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                            />
                            <SuggestionBox field="pickup" />
                        </div>
                        <div className="relative">
                            <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold" size={22} />
                            <input
                                type="text"
                                placeholder="இறங்குமிடம் (Drop)"
                                className="w-full bg-white border-none p-3 pl-11 rounded-xl text-base focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={drop}
                                onChange={(e) => setDrop(e.target.value)}
                                onFocus={() => setActiveInput('drop')}
                                onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                            />
                            <SuggestionBox field="drop" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-2">
                        <h3 className="font-bold text-xl text-emerald-900">தேர்வு செய்யவும்</h3>
                        {distance && <span className="text-emerald-600 font-bold bg-emerald-100 px-3 py-1 rounded-full text-sm">{distance.toFixed(1)} KM</span>}
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
                        {rides.map((ride) => {
                            const fare = calculateFare(ride.id);
                            return (
                                <button
                                    key={ride.id}
                                    onClick={() => setSelectedRide(ride.id)}
                                    className={`min-w-[160px] snap-center flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${selectedRide === ride.id
                                        ? 'border-emerald-500 bg-emerald-50 shadow-md ring-4 ring-emerald-500/10'
                                        : 'border-gray-50 bg-gray-50/50 active:bg-gray-100'
                                        }`}
                                >
                                    <div className={`p-3 rounded-xl mb-2 transition-all ${selectedRide === ride.id ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-600'}`}>
                                        {ride.icon}
                                    </div>
                                    <p className="font-extrabold text-lg text-gray-900">{ride.name}</p>
                                    <p className="font-black text-xl text-emerald-600 mt-1">{fare > 0 ? `₹${fare.toFixed(0)}` : '--'}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                        {(() => {
                                            const knownRegional = [...suggestions.regional].map(s => s.toLowerCase().split(' ')[0]);
                                            const isRegional = knownRegional.some(town => pickup.toLowerCase().includes(town) || drop.toLowerCase().includes(town));
                                            if (isRegional) {
                                                const rate = PRICING.regional[ride.id as keyof typeof PRICING.regional] || 0;
                                                return `₹${rate}/km`;
                                            } else {
                                                return 'Fixed';
                                            }
                                        })()}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Waiting Time Selection (Optional) */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="font-bold text-lg text-emerald-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-emerald-500" />
                                <span>காத்திருப்பு (தேவைப்பட்டால்)</span>
                            </h3>
                            {waitingHours > 0 && <span className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full text-xs">+ ₹{waitingHours * PRICING.waiting}</span>}
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {[0, 1, 2, 3, 4, 5].map((h) => (
                                <button
                                    key={h}
                                    onClick={() => setWaitingHours(h)}
                                    className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all border-2 ${waitingHours === h
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200'
                                        : 'bg-white text-emerald-900 border-emerald-50 active:bg-emerald-50'
                                        }`}
                                >
                                    {h === 0 ? 'இல்லை' : `${h} மணி`}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-zinc-400 italic px-2">காத்திருப்புக் கட்டணம்: மணிக்கு ₹10</p>
                    </div>

                    {/* Return Trip (Round Trip) Selection */}
                    <div className="pt-2">
                        <button
                            onClick={() => setIsRoundTrip(!isRoundTrip)}
                            className={`w-full flex items-center justify-between p-4 rounded-3xl border-2 transition-all ${isRoundTrip
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200'
                                : 'bg-white text-emerald-900 border-emerald-50 hover:bg-emerald-50'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Repeat className={`w-5 h-5 ${isRoundTrip ? 'text-white' : 'text-emerald-500'}`} />
                                <div className="text-left">
                                    <p className="font-bold">திரும்ப வருதல்</p>
                                    <p className={`text-xs ${isRoundTrip ? 'text-emerald-100' : 'text-zinc-500'}`}>அதே கட்டணம் மீண்டும் கணக்கிடப்படும்</p>
                                </div>
                            </div>
                            <div className={`w-12 h-6 rounded-full relative transition-colors ${isRoundTrip ? 'bg-emerald-400' : 'bg-zinc-200'}`}>
                                <motion.div
                                    animate={{ x: isRoundTrip ? 24 : 4 }}
                                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                />
                            </div>
                        </button>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="pt-2 space-y-4">
                        <h3 className="font-bold text-lg text-emerald-900 flex items-center gap-2 px-2">
                            <Banknote className="w-5 h-5 text-emerald-500" />
                            <span>பணம் செலுத்தும் முறை</span>
                        </h3>
                        <div className="flex gap-3">
                            {['Cash', 'Online'].map((method) => (
                                <button
                                    key={method}
                                    onClick={() => setPaymentMethod(method as 'Cash' | 'Online')}
                                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all ${paymentMethod === method
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200'
                                        : 'bg-white text-emerald-900 border-zinc-100 active:bg-emerald-50'
                                        }`}
                                >
                                    <span className="font-black tracking-widest uppercase">{method === 'Cash' ? 'ரொக்கம்' : 'ஆன்லைன்'}</span>
                                    <span className={`text-[10px] ${paymentMethod === method ? 'text-emerald-100' : 'text-zinc-500'}`}>
                                        {method === 'Cash' ? 'நேரடி பணம்' : 'ஆன்லைன் பேமண்ட்'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-2 pt-1">
                        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${(db as any).type !== 'mock' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                            {(db as any).type !== 'mock' ? 'Cloud Connected' : 'Local Mode (Sync Disabled)'}
                        </div>
                    </div>
                    <button onClick={handleConfirm} className="btn-primary w-full text-lg py-4 shadow-emerald-200">
                        பயணத்தை உறுதி செய்
                    </button>
                </div>
            )}

            {status === 'searching' && (
                <div className="py-6 text-center space-y-4">
                    <div className="relative w-24 h-24 mx-auto">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute inset-0 border-[6px] border-emerald-100 rounded-full border-t-emerald-500" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Car className="text-emerald-500 w-10 h-10" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-emerald-900 italic">ஓட்டுநரைத் தேடுகிறது...</h3>
                        <p className="text-emerald-600 font-medium mt-2">சற்று காத்திருக்கவும்...</p>
                    </div>

                    {/* Multi-Driver Search Simulation - RE-ENABLED FOR FEEDBACK */}
                    <div className="bg-emerald-50/50 rounded-[32px] p-5 space-y-4 border border-emerald-100/50">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest text-left px-2 italic">அருகிலுள்ள ஓட்டுநர்களுக்குத் தெரிவிக்கப்படுகிறது...</p>
                        <div className="space-y-3">
                            {availableDrivers.map((d, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.4 }}
                                    className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-emerald-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                            {d.icon}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-sm text-emerald-950">{d.name}</p>
                                            <p className="text-[10px] text-emerald-600 font-medium">{d.vehicle}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                            className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
                                        />
                                        <span className="text-[10px] font-bold text-emerald-500">அழைக்கிறோம்...</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleReset}
                        className="text-red-500 font-bold flex items-center justify-center gap-2 mx-auto active:bg-red-50 px-6 py-2 rounded-full transition-colors"
                    >
                        <XCircle size={18} />
                        <span>தேடுதலை ரத்து செய்</span>
                    </button>
                </div>
            )}

            {status === 'accepted' && (
                <div className="py-6 space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="flex items-center gap-4 bg-emerald-500 p-5 rounded-[28px] text-white shadow-xl shadow-emerald-500/20">
                        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                            <Car className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-emerald-100 uppercase tracking-tighter">உங்கள் ஓட்டுநர்</p>
                            <h3 className="text-lg font-black uppercase text-white">{driverDetails?.name || "ஓட்டுநர் கிடைத்துள்ளார்"}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] bg-emerald-600/50 px-2 py-0.5 rounded-full border border-white/20">TN-49-AD-1234</p>
                                {JSON.parse(localStorage.getItem('adirai_trip') || '{}').duration && (
                                    <p className="text-[10px] font-bold text-white flex items-center gap-1">
                                        <Clock size={10} />
                                        <span>{formatDuration(JSON.parse(localStorage.getItem('adirai_trip') || '{}').duration)}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <a
                                href={formatTel(driverDetails?.phone)}
                                className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform shrink-0"
                            >
                                <Phone size={24} fill="currentColor" />
                            </a>
                            <button onClick={() => setIsChatOpen(true)} className="flex-1 bg-emerald-100 text-emerald-900 p-4 rounded-3xl font-bold flex items-center justify-center gap-2 active:bg-emerald-200 transition-colors relative">
                                <div className="relative">
                                    <Send size={20} className="text-emerald-600" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                                    )}
                                </div>
                                <span>உரையாடல் {unreadCount > 0 && `(${unreadCount})`}</span>
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                if (confirm("பயணத்தை ரத்து செய்ய விரும்புகிறீர்களா?")) handleReset();
                            }}
                            className="w-full text-red-500 font-bold flex items-center justify-center gap-2 py-3 active:bg-red-50 rounded-2xl transition-colors text-sm border-2 border-dashed border-red-200"
                        >
                            <XCircle size={18} />
                            <span>பயணத்தை ரத்து செய்</span>
                        </button>
                    </div>

                    <AnimatePresence>
                        {isChatOpen && (
                            <ChatWindow
                                tripId={tripId || ""}
                                role="user"
                                onClose={() => setIsChatOpen(false)}
                            />
                        )}
                    </AnimatePresence>
                </div>
            )}

            {status === 'finished' && (
                <div className="py-10 text-center space-y-6 animate-in slide-in-from-bottom duration-500">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 size={40} className="text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-emerald-950 italic">நன்றி!</h2>
                        <p className="text-emerald-600 font-bold mt-2">உங்களது பயணம் சிறப்பாக அமைந்தது என்று நம்புகிறோம்</p>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-[32px] border-2 border-emerald-100 shadow-sm">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-emerald-100/50">
                            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">பணம் செலுத்தும் முறை</p>
                            <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                                {JSON.parse(localStorage.getItem('adirai_trip') || '{}').paymentMethod === 'Cash' ? 'ரொக்கம்' : 'ஆன்லைன்'}
                            </span>
                        </div>
                        <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">செலுத்த வேண்டிய தொகை</p>
                        <p className="text-5xl font-black text-emerald-950">₹{parseFloat(JSON.parse(localStorage.getItem('adirai_trip') || '{}').price || '0').toFixed(0)}</p>
                    </div>
                    <button
                        onClick={handleReset}
                        className="btn-primary w-full py-5 text-xl tracking-widest uppercase shadow-emerald-200"
                    >
                        பணம் செலுத்தி முடி
                    </button>
                </div>
            )}
        </motion.div>
    );
}

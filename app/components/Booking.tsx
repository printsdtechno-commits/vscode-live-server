"use client";
import React, { useState, useEffect } from 'react';
import { Car, Bike, MapPin, Navigation, CheckCircle2, IndianRupee, Info, User, Send, MessageSquare, Clock, Repeat, XCircle, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PRICING } from '@/lib/utils';
import ChatWindow from './ChatWindow';

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
        return `Arrival: ${timeStr}`;
    };

    // ... updated distance logic here ...


    // Smart Distance Calculator
    useEffect(() => {
        if (pickup.length > 2 && drop.length > 2) {
            const p = pickup.toLowerCase();
            const d = drop.toLowerCase();

            // ACTUAL DISTANCE MATRIX (Road Kilometers) - Verified with Google Maps
            const getActualDistance = (from: string, to: string) => {
                const matrix: Record<string, Record<string, number>> = {
                    'pattukottai': { 'muthupettai': 21.0, 'adirampattinam': 13.0, 'mallipattinam': 24.5, 'thanjavur': 48.0, 'mannargudi': 34.0 },
                    'muthupettai': { 'pattukottai': 21.0, 'adirampattinam': 15.0, 'mallipattinam': 26.0, 'thanjavur': 68.0, 'mannargudi': 37.0 },
                    'adirampattinam': { 'pattukottai': 13.0, 'muthupettai': 15.0, 'mallipattinam': 11.0, 'thanjavur': 62.0, 'peravurani': 32.0, 'trichy': 105.0, 'mannargudi': 38.0 },
                    'mallipattinam': { 'pattukottai': 24.5, 'muthupettai': 26.0, 'adirampattinam': 11.0 },
                    'mannargudi': { 'pattukottai': 34.0, 'muthupettai': 37.0, 'adirampattinam': 38.0, 'thanjavur': 39.0 },
                    'thanjavur': { 'pattukottai': 48.0, 'adirampattinam': 62.0, 'mannargudi': 39.0 }
                };

                // Find keys
                const fKey = Object.keys(matrix).find(k => from.includes(k));
                const tKey = Object.keys(matrix).find(k => to.includes(k));

                if (fKey && tKey) {
                    if (matrix[fKey] && matrix[fKey][tKey]) return matrix[fKey][tKey];
                    if (matrix[tKey] && matrix[tKey][fKey]) return matrix[tKey][fKey];
                }
                return 0;
            };

            const cleanP = p.toLowerCase().trim();
            const cleanD = d.toLowerCase().trim();

            // 1. Check Matrix for Actual Road Distance
            const actualRoadDist = getActualDistance(cleanP, cleanD);
            if (actualRoadDist > 0) {
                setDistance(actualRoadDist);
                return;
            }

            // 2. Check for Single Town Distance (If only one is a town, assumes from/to Adirai)
            const knownPlaces: Record<string, number> = {
                'pattukottai': 13.0, 'pattakottai': 13.0, 'பட்டுக்கோட்டை': 13.0,
                'muthupettai': 15.0, 'muthupetta': 15.0, 'முத்துப்பேட்டை': 15.0,
                'thanjavur': 62.0, 'thanjavaur': 62.0, 'தஞ்சாவூர்': 62.0,
                'mallipattinam': 11.0, 'மல்லிப்பட்டினம்': 11.0,
                'peravurani': 32.0, 'பேராவூரணி': 32.0,
                'tiruchirappalli': 105.0, 'trichy': 105.0, 'திருச்சி': 105.0,
                'mannargudi': 38.0, 'மன்னார்குடி': 38.0,
                'chennai': 356.0, 'சென்னை': 356.0,
                'madurai': 180.0, 'மதுரை': 180.0,
                'pudukkottai': 75.0, 'புதுக்கோட்டை': 75.0,
                'kumbakonam': 74.0, 'கும்பகோணம்': 74.0,
                'nagapattinam': 81.0, 'நாகப்பட்டினம்': 81.0,
                'tiruvarur': 70.0, 'திருவாரூர்': 70.0,
                'mayiladuthurai': 105.0, 'மயிலாடுதுறை': 105.0,
                'coimbatore': 310.0, 'கோயம்புத்தூர்': 310.0,
                'salem': 240.0, 'சேலம்': 240.0,
                'erode': 215.0, 'ஈரோடு': 215.0,
                'vellore': 290.0, 'வேலூர்': 290.0,
                'tirunelveli': 330.0, 'திருநெல்வேலி': 330.0,
                'kanyakumari': 425.0, 'கன்னியாகுமரி': 425.0,
            };

            let singleTownDist = 0;
            for (const place in knownPlaces) {
                if (cleanP.includes(place) || cleanD.includes(place)) {
                    singleTownDist = knownPlaces[place];
                    break;
                }
            }

            if (singleTownDist > 0) {
                // If both are Adirampattinam, it's local (don't return here)
                if (cleanP.includes('adirampattinam') && cleanD.includes('adirampattinam')) {
                    // Continue
                } else {
                    setDistance(singleTownDist);
                    return;
                }
            }

            // 2. Detect if addresses are on the same street (Ultra-Local)
            const streetKeywords = ['street', 'road', 'nagar', 'theru', 'vithi', 'தெரு', 'சாலை'];
            let sameStreet = false;

            for (const keyword of streetKeywords) {
                if (p.includes(keyword) && d.includes(keyword)) {
                    sameStreet = true;
                    break;
                }
            }

            if (sameStreet) {
                const pNumMatch = p.match(/\d+/);
                const dNumMatch = d.match(/\d+/);
                const pNum = pNumMatch ? parseInt(pNumMatch[0]) : null;
                const dNum = dNumMatch ? parseInt(dNumMatch[0]) : null;

                if (pNum !== null && dNum !== null) {
                    const diff = Math.abs(pNum - dNum);
                    const km = Math.max(0.2, (diff * 0.01));
                    setDistance(parseFloat(km.toFixed(1)));
                } else {
                    setDistance(0.5);
                }
            } else {
                // 3. Different Local locations: Use a content-based hash
                const combined = (p + d).replace(/\s/g, '');
                let hash = 0;
                for (let i = 0; i < combined.length; i++) {
                    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
                    hash |= 0;
                }
                const seed = Math.abs(hash) % 50;
                const simDistance = 1.5 + (seed / 10);
                setDistance(parseFloat(simDistance.toFixed(1)));
            }
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
            alert("விவரங்களை நிரப்பவும் (Fill all details)");
            return;
        }

        setStatus('searching');
        const userSession = localStorage.getItem('adirai_user');
        const userData = userSession ? JSON.parse(userSession) : null;

        const finalPrice = calculateFare(selectedRide);

        const tripData = {
            id: Date.now(),
            status: 'searching',
            pickup,
            drop,
            distance: distance.toFixed(1), // Store numerical distance as string
            vehicle: selectedRide,
            price: finalPrice.toFixed(0), // Store numerical price
            duration: calculateDuration(distance, selectedRide || 'auto'),
            paymentMethod,
            waiting: waitingHours,
            isRoundTrip: isRoundTrip,
            user: userData?.name || "Anonymous",
            userPhone: userData?.phone || "",
            timestamp: Date.now()
        };

        setTripId(tripData.id);
        localStorage.setItem('adirai_trip', JSON.stringify(tripData));
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
                    className="w-full text-left p-4 hover:bg-emerald-50 flex items-center gap-3 border-b border-emerald-50 transition-colors text-emerald-600"
                    onClick={() => {
                        if (field === 'pickup') setPickup("Adirampattinam (My Location)");
                        else setDrop("Adirampattinam (My Location)");
                        setActiveInput(null);
                    }}
                >
                    <Navigation className="w-4 h-4" />
                    <span className="font-bold">தற்போதைய இடம் (Current Location)</span>
                </button>

                {list.map((s, i) => (
                    <button
                        key={i}
                        className="w-full text-left p-4 hover:bg-emerald-50 flex items-center gap-3 border-b border-emerald-50 last:border-none transition-colors"
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

    useEffect(() => {
        const checkTrip = () => {
            const tripString = localStorage.getItem('adirai_trip');
            if (tripString) {
                const trip = JSON.parse(tripString);
                if (trip.id) setTripId(trip.id);
                if (trip.status === 'accepted' && status !== 'accepted') {
                    setStatus('accepted');
                    setDriverDetails(trip.driver);
                }
                if (trip.status === 'finished' && status !== 'finished') {
                    setStatus('finished');
                }
            } else if (status === 'searching' || status === 'accepted') {
                // Trip was cancelled by driver
                handleReset();
            }
        };
        window.addEventListener('storage', checkTrip);
        const interval = setInterval(checkTrip, 500);
        return () => {
            window.removeEventListener('storage', checkTrip);
            clearInterval(interval);
        };
    }, [status]);

    const handleReset = () => {
        setStatus('idle');
        setDriverDetails(null);
        localStorage.removeItem('adirai_trip');
    }

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] shadow-2xl p-5 z-[1000] border-t border-emerald-50 safe-bottom max-h-[90vh] overflow-y-auto"
        >
            <div className="w-12 h-1 bg-emerald-100 rounded-full mx-auto mb-4" />

            {status === 'idle' && (
                <div className="space-y-6">
                    {/* Brand Identity at the Front */}
                    <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <img src="/logo.png" alt="Adirai Rides Logo" style={{ height: '140px', width: 'auto' }} />
                    </div>

                    <div className="bg-emerald-50/50 p-3 rounded-2xl space-y-3">
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={22} />
                            <input
                                type="text"
                                placeholder="இடம் (Pickup Location)"
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
                                placeholder="எங்கே செல்ல வேண்டும்? (Drop)"
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

                    <div className="grid grid-cols-1 gap-3 max-h-[35vh] overflow-y-auto pr-1">
                        {rides.map((ride) => {
                            const fare = calculateFare(ride.id);
                            return (
                                <button
                                    key={ride.id}
                                    onClick={() => setSelectedRide(ride.id)}
                                    className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${selectedRide === ride.id
                                        ? 'border-emerald-500 bg-emerald-50 shadow-md ring-4 ring-emerald-500/10'
                                        : 'border-gray-50 bg-gray-50/50 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-xl transition-all ${selectedRide === ride.id ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-600'}`}>
                                            {ride.icon}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-extrabold text-lg text-gray-900">{ride.name}</p>
                                            <p className="text-sm text-gray-500 font-medium">
                                                {(() => {
                                                    const knownRegional = [...suggestions.regional].map(s => s.toLowerCase().split(' ')[0]);
                                                    const isRegional = knownRegional.some(town => pickup.toLowerCase().includes(town) || drop.toLowerCase().includes(town));
                                                    if (isRegional) {
                                                        const rate = PRICING.regional[ride.id as keyof typeof PRICING.regional] || 0;
                                                        return `₹${rate}/km`;
                                                    } else {
                                                        const rate = PRICING.local[ride.id as keyof typeof PRICING.local] || 0;
                                                        return `Flat ₹${rate}`;
                                                    }
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-xl text-emerald-600">{fare > 0 ? `₹${fare.toFixed(0)}` : '--'}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">ESTIMATED</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Waiting Time Selection (Optional) */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="font-bold text-lg text-emerald-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-emerald-500" />
                                <span>Waiting / Stay (Optional)</span>
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
                                        : 'bg-white text-emerald-900 border-emerald-50 hover:bg-emerald-50'
                                        }`}
                                >
                                    {h === 0 ? 'None' : `${h}h`}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-zinc-400 italic px-2">Standard rate: ₹10 per hour of waiting.</p>
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
                                    <p className="font-bold">திரும்ப வருதல் (Return Trip?)</p>
                                    <p className={`text-xs ${isRoundTrip ? 'text-emerald-100' : 'text-zinc-500'}`}>அதே கட்டணம் (Calculates same amount for return)</p>
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
                            <span>Payment Method / பணம் செலுத்தும் முறை</span>
                        </h3>
                        <div className="flex gap-3">
                            {['Cash', 'Online'].map((method) => (
                                <button
                                    key={method}
                                    onClick={() => setPaymentMethod(method as 'Cash' | 'Online')}
                                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all ${paymentMethod === method
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200'
                                        : 'bg-white text-emerald-900 border-zinc-100 hover:bg-emerald-50'
                                        }`}
                                >
                                    <span className="font-black tracking-widest uppercase">{method}</span>
                                    <span className={`text-[10px] ${paymentMethod === method ? 'text-emerald-100' : 'text-zinc-500'}`}>
                                        {method === 'Cash' ? 'நேரடி பணம்' : 'ஆன்லைன் பேமண்ட்'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={handleConfirm} className="btn-primary w-full text-lg py-4 shadow-emerald-200">
                        பயணத்தை உறுதி செய்
                    </button>
                </div>
            )}

            {status === 'searching' && (
                <div className="py-12 text-center space-y-6">
                    <div className="relative w-32 h-32 mx-auto">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute inset-0 border-[6px] border-emerald-100 rounded-full border-t-emerald-500" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Car className="text-emerald-500 w-12 h-12" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-emerald-900 italic">FINDING DRIVER...</h3>
                        <p className="text-emerald-600 font-medium mt-2">உங்களுக்காக ஓட்டுநரைத் தேடுகிறோம்</p>
                    </div>

                    {/* Multi-Driver Search Simulation */}
                    <div className="bg-emerald-50/50 rounded-[32px] p-5 space-y-4 border border-emerald-100/50">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest text-left px-2">Notifying nearest drivers...</p>
                        <div className="space-y-3">
                            {[
                                { name: "Salman", vehicle: "Auto", icon: <Car size={16} /> },
                                { name: "Rahuman", vehicle: "Car", icon: <Car size={16} /> },
                                { name: "Siddiq", vehicle: "Bike", icon: <Bike size={16} /> }
                            ].map((d, i) => (
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
                                        <span className="text-[10px] font-bold text-emerald-500">Notifying...</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleReset}
                        className="text-red-500 font-bold flex items-center justify-center gap-2 mx-auto hover:bg-red-50 px-6 py-2 rounded-full transition-colors"
                    >
                        <XCircle size={18} />
                        <span>CANCEL SEARCH</span>
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
                            <p className="text-xs font-black text-emerald-100 uppercase tracking-tighter">உங்கள் ஓட்டுநர் (Driver)</p>
                            <h3 className="text-lg font-black uppercase text-white">{driverDetails?.name || "Driver Found"}</h3>
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
                            <button onClick={() => setIsChatOpen(true)} className="flex-1 bg-emerald-100 text-emerald-900 p-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-200 transition-colors">
                                <Send size={20} className="text-emerald-600" />
                                <span>CHAT</span>
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                if (confirm("Cancel or Reject this driver? (நீங்கள் இந்த சவாரியை ரத்து செய்ய விரும்புகிறீர்களா?)")) handleReset();
                            }}
                            className="w-full text-red-500 font-bold flex items-center justify-center gap-2 py-3 hover:bg-red-50 rounded-2xl transition-colors text-sm border-2 border-dashed border-red-200"
                        >
                            <XCircle size={18} />
                            <span>CANCEL / REJECT RIDE (ரத்து செய்)</span>
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
                        <h2 className="text-3xl font-black text-emerald-950 italic">THANKS FOR RIDING!</h2>
                        <p className="text-emerald-600 font-bold mt-2">உங்களது பயணம் சிறப்பாக அமைந்தது</p>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-[32px] border-2 border-emerald-100 shadow-sm">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-emerald-100/50">
                            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Payment Mode</p>
                            <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                                {JSON.parse(localStorage.getItem('adirai_trip') || '{}').paymentMethod || 'Cash'}
                            </span>
                        </div>
                        <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Total Amount to Pay</p>
                        <p className="text-5xl font-black text-emerald-950">₹{parseFloat(JSON.parse(localStorage.getItem('adirai_trip') || '{}').price || '0').toFixed(0)}</p>
                    </div>
                    <button
                        onClick={handleReset}
                        className="btn-primary w-full py-5 text-xl tracking-widest uppercase shadow-emerald-200"
                    >
                        PAY & CLOSE (சரி)
                    </button>
                </div>
            )}
        </motion.div>
    );
}

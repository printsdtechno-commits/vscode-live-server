"use client";
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Phone, Unlock, User, Car, Camera, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateUniqueOTP, dbData, resizeImage } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';

export default function DriverLoginPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<'phone' | 'otp' | 'profile' | 'vehicle'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [name, setName] = useState('');
    const [vehicleType, setVehicleType] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSendOtp = () => {
        if (phone.length < 10) return alert("சரியான எண்ணை உள்ளிடவும் (Please enter 10 digits)");
        setIsLoading(true);
        const newOtp = generateUniqueOTP();
        setGeneratedOtp(newOtp);

        setTimeout(() => {
            setIsLoading(false);
            setStep('otp');
            alert(`Driver OTP: ${newOtp}`);
        }, 1200);
    };

    const handleVerifyOtp = () => {
        if (otp !== generatedOtp) return alert("தவறான OTP");
        setStep('profile');
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const resized = await resizeImage(reader.result as string);
                setPhoto(resized);
            };
            reader.readAsDataURL(file);
        }
    };



    const handleComplete = async () => {
        if (!name || !vehicleType || !photo) return alert("Complete all details including photo");

        // Auth skipped to prevent configuration crashes.

        const driverData = { phone, name, vehicle: vehicleType, photo, type: 'driver', joinedAt: new Date().toISOString() };
        dbData.saveDriver(driverData);
        localStorage.setItem('adirai_driver', JSON.stringify(driverData));

        router.push('/driver');
    };

    return (
        <div className="min-h-screen bg-emerald-950 text-white flex flex-col p-6 overflow-x-hidden">
            <div className="pt-10 flex flex-col items-center">
                <div className="mb-10">
                    <img src="/logo.png" alt="Adirai Rides Logo" style={{ width: '220px', height: 'auto', display: 'block' }} />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight">Driver Partner</h1>
                <p className="text-emerald-400 font-medium mt-2">ஓட்டுநர் பக்கம்</p>
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
                <AnimatePresence mode="wait">
                    {step === 'phone' && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold">தொடங்குங்கள்!</h2>
                                <p className="text-emerald-500 mt-2">உங்கள் மொபைல் எண்ணை உள்ளிடவும்</p>
                            </div>
                            <input
                                type="tel"
                                placeholder="98765 43210"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                className="w-full bg-emerald-900/40 border-2 border-emerald-800 focus:border-emerald-400 p-5 rounded-3xl text-xl outline-none transition-all"
                            />
                            <button onClick={handleSendOtp} className="w-full bg-emerald-500 hover:bg-emerald-400 p-5 rounded-3xl font-bold text-xl flex items-center justify-center gap-3">
                                OTP அனுப்பவும் <ArrowRight />
                            </button>
                        </motion.div>
                    )}

                    {step === 'otp' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                            <h2 className="text-2xl font-bold text-center">OTP சரிபார்</h2>
                            <input
                                type="text"
                                maxLength={4}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full bg-emerald-900/40 border-2 border-emerald-800 p-5 rounded-3xl text-center text-4xl tracking-widest outline-none"
                            />
                            <button onClick={handleVerifyOtp} className="w-full bg-emerald-500 p-5 rounded-3xl font-bold">தொடரவும்</button>
                        </motion.div>
                    )}

                    {step === 'profile' && (
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-white">உங்கள் புகைப்படம்</h2>
                                <p className="text-emerald-500">உங்கள் புகைப்படத்தை சேர்க்கவும்</p>
                            </div>

                            <div className="flex justify-center">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative w-28 h-28 bg-emerald-900/50 rounded-full border-4 border-dashed border-emerald-700 flex items-center justify-center overflow-hidden cursor-pointer"
                                >
                                    {photo ? (
                                        <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <Camera className="w-10 h-10 text-emerald-500 mb-2" />
                                            <span className="text-xs">புகைப்படம்</span>
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} onChange={handlePhotoSelect} hidden accept="image/*" />
                                </div>
                            </div>

                            <input
                                type="text"
                                placeholder="முழு பெயர் (Driver Name)"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-emerald-900/40 border-2 border-emerald-800 p-5 rounded-3xl text-xl outline-none"
                            />

                            <button onClick={() => setStep('vehicle')} disabled={!photo || !name} className="w-full bg-emerald-500 p-5 rounded-3xl font-bold disabled:opacity-50">தொடரவும்</button>
                        </motion.div>
                    )}

                    {step === 'vehicle' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <h2 className="text-2xl font-bold text-center">உங்கள் வாகனம்?</h2>
                            <div className="grid grid-cols-1 gap-4">
                                {['Auto', 'Car', 'Bike'].map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => setVehicleType(v)}
                                        className={`p-6 rounded-3xl border-2 flex items-center justify-between transition-all ${vehicleType === v ? 'border-emerald-400 bg-emerald-800' : 'border-emerald-800 bg-emerald-900/30'}`}
                                    >
                                        <div className="flex items-center gap-4 text-xl font-bold">
                                            <Car size={30} />
                                            {v}
                                        </div>
                                        {vehicleType === v && <div className="bg-emerald-400 rounded-full p-1"><Check size={16} className="text-emerald-950" /></div>}
                                    </button>
                                ))}
                            </div>
                            <button onClick={handleComplete} className="w-full bg-white text-emerald-950 p-6 rounded-3xl font-black text-xl mt-6">பயணத்தை தொடங்கவும் 🚀</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

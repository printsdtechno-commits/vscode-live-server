"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Phone, Unlock, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateUniqueOTP, dbData } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSendOtp = () => {
        if (phone.length < 10) return alert("சரியான எண்ணை உள்ளிடவும் (10 இலக்கங்கள்)");
        setIsLoading(true);

        // Logical Order: Generate OTP -> Store phone -> show step
        const newOtp = generateUniqueOTP();
        setGeneratedOtp(newOtp);

        setTimeout(() => {
            setIsLoading(false);
            setStep('otp');
            // In real app, SMS would be sent here
            console.log("Your OTP is:", newOtp);
            alert(`உங்கள் OTP: ${newOtp}`);
        }, 1200);
    };

    const handleVerifyOtp = () => {
        if (otp !== generatedOtp) return alert("தவறான OTP");
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setStep('name');
        }, 800);
    };

    const handleComplete = async () => {
        if (!name.trim()) return alert("பெயரை உள்ளிடவும்");

        // Auth skipped to prevent configuration crashes. 
        // We rely on fallback mode.

        const userData = { phone, name, type: 'client', joinedAt: new Date().toISOString() };
        dbData.saveUser(userData); // Save to "Database"
        localStorage.setItem('adirai_user', JSON.stringify(userData));

        router.push('/');
    };

    return (
        <div className="min-h-screen bg-mesh flex flex-col justify-center p-6 font-sans text-center overflow-hidden relative">
            {/* Background Blobs for extra flare */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-400/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px] animate-pulse delay-1000 pointer-events-none" />

            <div className="w-full max-w-md mx-auto space-y-8 relative z-10">
                <div className="flex justify-center mb-6">
                    <motion.div
                        animate={{ y: [0, -15, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    >
                        <img src="/logo.png" alt="Adirai Rides Logo" style={{ width: '350px', height: 'auto', display: 'block' }} className="drop-shadow-2xl" />
                    </motion.div>
                </div>
                <AnimatePresence mode="wait">
                    {step === 'phone' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-gray-900">தொடங்குவோம்!</h2>
                                <p className="text-gray-500 mt-2">உங்கள் மொபைல் எண்ணை உள்ளிடவும்</p>
                            </div>
                            <div className="relative">
                                <input
                                    type="tel"
                                    placeholder="98765 43210"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    className="input-field text-center text-xl tracking-widest"
                                />
                            </div>
                            <button onClick={handleSendOtp} disabled={isLoading} className="btn-primary w-full">
                                {isLoading ? 'அனுப்புகிறது...' : 'OTP பெறவும்'}
                                <ArrowRight size={20} />
                            </button>
                        </motion.div>
                    )}

                    {step === 'otp' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-gray-900">OTP-ஐ சரிபார்க்கவும்</h2>
                                <p className="text-gray-500 mt-2">எண்: {phone} அனுப்பப்பட்டது</p>
                            </div>
                            <div className="relative">
                                <Unlock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="0000"
                                    maxLength={4}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="input-field pl-16 text-center tracking-[1em] text-2xl"
                                />
                            </div>
                            <button onClick={handleVerifyOtp} className="btn-primary w-full">
                                உறுதி செய்
                            </button>
                        </motion.div>
                    )}

                    {step === 'name' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-gray-900">உங்கள் விவரங்கள்</h2>
                                <p className="text-center text-gray-500 mt-2">உங்களை பற்றி மற்றவர்கள் அறிய</p>
                            </div>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="உங்கள் பெயர்"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input-field pl-16"
                                />
                            </div>
                            <button onClick={handleComplete} className="btn-primary w-full shadow-emerald-200">
                                கணக்கை உருவாக்கவும்
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Phone, Unlock, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateUniqueOTP, dbData } from '@/lib/utils';

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSendOtp = () => {
        if (phone.length < 10) return alert("சரியான எண்ணை உள்ளிடவும் (Please enter 10 digits)");
        setIsLoading(true);

        // Logical Order: Generate OTP -> Store phone -> show step
        const newOtp = generateUniqueOTP();
        setGeneratedOtp(newOtp);

        setTimeout(() => {
            setIsLoading(false);
            setStep('otp');
            // In real app, SMS would be sent here
            console.log("Your OTP is:", newOtp);
            alert(`Your Private OTP: ${newOtp}`);
        }, 1200);
    };

    const handleVerifyOtp = () => {
        if (otp !== generatedOtp) return alert("தவறான OTP (Invalid OTP)");
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setStep('name');
        }, 800);
    };

    const handleComplete = () => {
        if (!name.trim()) return alert("பெயரை உள்ளிடவும் (Please enter name)");

        const userData = { phone, name, type: 'client', joinedAt: new Date().toISOString() };
        dbData.saveUser(userData); // Save to "Database"
        localStorage.setItem('adirai_user', JSON.stringify(userData));

        router.push('/');
    };

    return (
        <div className="min-h-screen bg-white flex flex-col p-6 font-sans">
            <div className="pt-10 flex flex-col items-center">
                <div className="mb-10">
                    <img src="/logo.png" alt="Adirai Rides Logo" style={{ width: '220px', height: 'auto', display: 'block' }} />
                </div>
                <h1 className="text-4xl font-extrabold text-emerald-900 tracking-tight">Adirai Rides</h1>
                <p className="text-emerald-600 font-medium mt-2 text-lg">அதிரை ரைட்ஸ்</p>
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
                <AnimatePresence mode="wait">
                    {step === 'phone' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-gray-900">தொடங்குவோம்!</h2>
                                <p className="text-gray-500 mt-2">உங்கள் மொபைல் எண்ணை உள்ளிடவும்</p>
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="tel"
                                    placeholder="98765 43210"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    className="input-field pl-12"
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
                                    className="input-field pl-12 text-center tracking-[1em] text-2xl"
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
                                <p className="text-gray-500 mt-2">உங்களை பற்றி மற்றவர்கள் அறிய</p>
                            </div>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="உங்கள் பெயர்"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input-field pl-12"
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

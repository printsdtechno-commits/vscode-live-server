"use client";

import dynamic from 'next/dynamic';
import BookingInterface from './components/Booking';
import { Menu, User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAppBaseUrl } from '@/lib/utils';

// Dynamically import Map with no SSR to avoid window is not defined error
const MapComponent = dynamic(() => import('./components/Map'), {
    ssr: false,
    loading: () => (
        <div className="h-screen w-full flex items-center justify-center bg-zinc-100 text-zinc-500 animate-pulse">
            <div className="text-center">
                <p className="font-bold text-xl mb-2">Adirai Rides (அதிரை ரைட்ஸ்)</p>
                <p>வரைபடம் ஏற்றப்படுகிறது...</p>
            </div>
        </div>
    )
});

export default function Home() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [pickup, setPickup] = useState("");
    const [drop, setDrop] = useState("");

    useEffect(() => {
        // Simple Auth Check
        const storedUser = localStorage.getItem('adirai_user');
        if (!storedUser) {
            router.push('/login');
        } else {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user session", e);
                localStorage.removeItem('adirai_user');
                router.push('/login');
            }
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('adirai_user');
        router.push('/login');
    };

    if (!user) return null;

    return (
        <main className="relative h-screen w-full overflow-hidden bg-zinc-50">

            {/* Header / Overlay Controls */}
            <div className="absolute top-4 left-4 right-4 z-[500] flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto relative group">
                    <button className="bg-white dark:bg-black p-3 rounded-full shadow-lg text-emerald-600 hover:scale-105 transition-transform">
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Navigation Dropdown */}
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden hidden group-hover:block transition-all">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-100">
                            <p className="font-bold text-sm text-emerald-800 dark:text-emerald-400">{user?.name || 'User'}</p>
                            <p className="text-xs text-emerald-600">{user?.phone}</p>
                        </div>
                        <div className="p-2 space-y-1">
                            <button onClick={() => router.push('/driver')} className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full" /> Switch to Driver
                            </button>
                            <button onClick={() => router.push('/admin')} className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full" /> Switch to Admin
                            </button>

                            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
                                <LogOut size={14} /> Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* Branding is now handled inside the Booking card at the bottom */}
                <div />

                <div />
            </div>

            {/* Map Background */}
            <div className="absolute inset-0 z-0">
                <MapComponent pickup={pickup} drop={drop} />
            </div>

            {/* Booking Interface */}
            <BookingInterface onPickupChange={setPickup} onDropChange={setDrop} />
        </main>
    );
}

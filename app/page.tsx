"use client";

import dynamic from 'next/dynamic';
import BookingInterface from './components/Booking';
import { Menu, User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Dynamically import Map with no SSR to avoid window is not defined error
const MapComponent = dynamic(() => import('./components/Map'), {
    ssr: false,
    loading: () => (
        <div className="h-screen w-full flex items-center justify-center bg-zinc-100 text-zinc-500 animate-pulse">
            <div className="text-center">
                <p className="font-bold text-xl mb-2">Adirai Rides</p>
                <p>Loading Map...</p>
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
                <button
                    onClick={handleLogout}
                    className="pointer-events-auto bg-white dark:bg-black p-3 rounded-full shadow-lg hover:scale-105 transition-transform text-red-500"
                >
                    <LogOut className="w-6 h-6" />
                </button>

                {/* Branding is now handled inside the Booking card at the bottom */}
                <div />

                <button className="pointer-events-auto bg-white dark:bg-black p-3 rounded-full shadow-lg hover:scale-105 transition-transform text-black dark:text-white">
                    <a href="/admin">
                        <User className="w-6 h-6" />
                    </a>
                </button>
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

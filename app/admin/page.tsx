"use client";
import React from 'react';
import { LayoutDashboard, Users, Car, Map as MapIcon, Settings, Bell, TrendingUp, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
    const [stats, setStats] = React.useState([
        { title: "Total Earnings (மொத்த வருவாய்)", value: "₹0", icon: <DollarSign className="w-6 h-6 text-green-500" />, trend: "Real-time" },
        { title: "Active Drivers (ஓட்டுநர்கள்)", value: "0", icon: <Car className="w-6 h-6 text-blue-500" />, trend: "Live" },
        { title: "Total Rides (சவாரிகள்)", value: "0", icon: <TrendingUp className="w-6 h-6 text-purple-500" />, trend: "Total" },
    ]);

    const [recentRides, setRecentRides] = React.useState<any[]>([]);
    const [driversList, setDriversList] = React.useState<any[]>([]);
    const [activeTab, setActiveTab] = React.useState('Dashboard');

    const copyInviteLink = () => {
        const link = `${window.location.origin}/driver/login`;
        navigator.clipboard.writeText(link);
        alert("Driver Invite Link Copied! Send this to new drivers: " + link);
    };

    React.useEffect(() => {
        const loadData = () => {
            try {
                const historyStr = localStorage.getItem('adirai_history') || '[]';
                const history = JSON.parse(historyStr);
                const driversStr = localStorage.getItem('adirai_db_drivers') || '{}';
                const drivers = JSON.parse(driversStr);
                const driverCount = Object.keys(drivers).length;

                const totalEarnings = Array.isArray(history)
                    ? history.reduce((acc: number, ride: any) => acc + parseFloat(ride.price || 0), 0)
                    : 0;

                setStats([
                    { title: "Total Earnings (மொத்த வருவாய்)", value: `₹${totalEarnings.toLocaleString()}`, icon: <DollarSign className="w-6 h-6 text-green-500" />, trend: "Live" },
                    { title: "Active Drivers (ஓட்டுநர்கள்)", value: driverCount.toString(), icon: <Car className="w-6 h-6 text-blue-500" />, trend: "Registered" },
                    { title: "Total Rides (சவாரிகள்)", value: (Array.isArray(history) ? history.length : 0).toString(), icon: <TrendingUp className="w-6 h-6 text-purple-500" />, trend: "Total" },
                ]);

                if (Array.isArray(history)) {
                    setRecentRides(history.slice(-5).reverse().map((r: any) => ({
                        id: `#${String(r.id || '').slice(-4) || 'N/A'}`,
                        user: r.user || "Customer",
                        driver: r.driver?.name || 'Unknown',
                        from: r.pickup || 'Unknown',
                        to: r.drop || 'Unknown',
                        status: 'Completed',
                        amount: `₹${r.price || 0}`
                    })));

                    // Calculate earnings per driver
                    const driverDataWithEarnings = Object.values(drivers).map((d: any) => {
                        const driverRides = history.filter((r: any) => r.driver?.phone === d.phone);
                        const cashCollected = driverRides
                            .filter((r: any) => r.paymentMethod === 'Cash')
                            .reduce((sum: number, r: any) => sum + parseFloat(r.price || 0), 0);
                        const onlineTotal = driverRides
                            .filter((r: any) => r.paymentMethod === 'Online')
                            .reduce((sum: number, r: any) => sum + parseFloat(r.price || 0) * 1, 0); // *1 to ensure number

                        return { ...d, totalEarnings: cashCollected + onlineTotal, cashCollected, onlineTotal };
                    });
                    setDriversList(driverDataWithEarnings);
                }
            } catch (e) {
                console.error("Dashboard Sync Error:", e);
            }
        };

        loadData();
        const interval = setInterval(loadData, 2000); // Live refresh every 2 seconds
        window.addEventListener('storage', loadData); // Sync across tabs

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', loadData);
        };
    }, []);

    return (
        <div className="flex h-screen bg-zinc-50 dark:bg-black overflow-hidden">

            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 hidden md:flex flex-col">
                <div className="p-10 flex justify-center border-b border-zinc-100 dark:border-zinc-800 mb-6">
                    <img src="/logo.png" alt="Adirai Rides Logo" style={{ height: '140px', width: 'auto', display: 'block' }} />
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <NavItem icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
                    <NavItem icon={<Users />} label="Drivers (ஓட்டுநர்கள்)" active={activeTab === 'Drivers'} onClick={() => setActiveTab('Drivers')} />
                    <NavItem icon={<Car />} label="Rides (சவாரிகள்)" active={activeTab === 'Rides'} onClick={() => setActiveTab('Rides')} />
                    <NavItem icon={<MapIcon />} label="Live Map" active={activeTab === 'Map'} onClick={() => setActiveTab('Map')} />
                    <NavItem icon={<Settings />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
                </nav>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                        <div>
                            <p className="font-bold text-sm">Admin User</p>
                            <p className="text-xs text-green-500">Super Admin</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 relative">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-black dark:text-white">Overview</h2>
                        <p className="text-zinc-500">Welcome back, Admin</p>
                    </div>
                    <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <Bell className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                    </button>
                </header>

                {activeTab === 'Dashboard' ? (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {stats.map((stat, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">{stat.icon}</div>
                                        <span className="text-xs font-bold text-green-500 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">{stat.trend}</span>
                                    </div>
                                    <h3 className="text-zinc-500 text-sm font-medium mb-1">{stat.title}</h3>
                                    <p className="text-3xl font-bold text-black dark:text-white">{stat.value}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Content Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Recent Rides List */}
                            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
                                <h3 className="font-bold text-lg mb-4">Recent Activity (சமீபத்திய சவாரிகள்)</h3>
                                <div className="space-y-4">
                                    {recentRides.map((ride, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                    {ride.id}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{ride.user} <span className="text-zinc-400">→</span> {ride.driver}</p>
                                                    <p className="text-xs text-zinc-500">{ride.from} - {ride.to}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">{ride.amount}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${ride.status === 'Completed' ? 'bg-green-100 text-green-600' :
                                                    ride.status === 'In Progress' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-red-100 text-red-600'
                                                    }`}>{ride.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Drivers List Side Section */}
                            <div className="lg:col-span-1 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
                                <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                                    <span className="flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /> Drivers</span>
                                    <button onClick={() => setActiveTab('Drivers')} className="text-xs text-blue-600 font-bold hover:underline">View All</button>
                                </h3>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                                    {driversList.slice(0, 5).map((d, i) => (
                                        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center overflow-hidden">
                                                {d.photo ? <img src={d.photo} className="w-full h-full object-cover" /> : <Car className="text-blue-600" size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{d.name}</p>
                                                <div className="flex flex-col">
                                                    <p className="text-[10px] text-zinc-500 uppercase">{d.vehicle}</p>
                                                    <div className="flex gap-2">
                                                        <span className="text-[10px] font-bold text-orange-600">Cash: ₹{d.cashCollected || 0}</span>
                                                        <span className="text-[10px] font-bold text-emerald-600">Online: ₹{d.onlineTotal || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                ) : activeTab === 'Drivers' ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-3">
                                <Users className="w-6 h-6 text-blue-500" />
                                <span>Driver Partners Directory (ஓட்டுநர்கள் பட்டியல்)</span>
                            </h3>
                            <button
                                onClick={copyInviteLink}
                                className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <Users size={18} />
                                <span>+ INVITE NEW DRIVER</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {driversList.map((d, i) => (
                                <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-white shadow-sm">
                                            {d.photo ? <img src={d.photo} className="w-full h-full object-cover" /> : <Users className="text-zinc-400" size={30} />}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-lg">{d.name}</h4>
                                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">{d.vehicle}</span>
                                        </div>
                                    </div>
                                    <div className="mt-6 pt-6 border-t border-zinc-50 dark:border-zinc-800 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-400 font-bold uppercase text-[10px]">Mobile</span>
                                            <span className="font-black text-blue-600">{d.phone}</span>
                                        </div>
                                        <div className="flex justify-between text-sm p-2 bg-orange-50 dark:bg-orange-950/20 rounded-xl my-1 border border-orange-100">
                                            <span className="text-orange-700 font-black uppercase text-[10px]">Cash to Collect (பணம் பெறவும்)</span>
                                            <span className="font-black text-orange-600">₹{d.cashCollected || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-400 font-bold uppercase text-[10px]">Online Earnings</span>
                                            <span className="font-black text-emerald-600">₹{d.onlineTotal || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-400 font-bold uppercase text-[10px]">Status</span>
                                            <span className="text-green-500 font-black flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Registered</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                        <MapIcon size={64} className="mb-4 opacity-10" />
                        <p className="font-bold">{activeTab} Section Coming Soon...</p>
                    </div>
                )}
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${active
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}>
            {icon}
            <span>{label}</span>
        </button>
    )
}

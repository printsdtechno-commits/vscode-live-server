import React, { useState, useEffect, useRef } from 'react';
import { Send, User, X, Image as ImageIcon, Loader2, Camera, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, getDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatTel } from '@/lib/utils';

interface Message {
    id: number | string;
    sender: 'user' | 'driver';
    text: string;
    imageUrl?: string;
    timestamp: number;
}

interface ChatProps {
    tripId: string | number;
    role: 'user' | 'driver';
    onClose: () => void;
}

export default function ChatWindow({ tripId, role, onClose }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [tripDetails, setTripDetails] = useState<any>(null);

    // Fetch Trip Details for Phone Numbers
    useEffect(() => {
        if (!tripId) return;

        const fetchTrip = async () => {
            if ((db as any).type === 'mock') {
                const stored = localStorage.getItem('adirai_trip');
                if (stored) setTripDetails(JSON.parse(stored));
                return;
            }
            try {
                const snap = await getDoc(doc(db, 'trips', tripId.toString()));
                if (snap.exists()) setTripDetails(snap.data());
            } catch (e) { console.error(e); }
        };
        fetchTrip();
    }, [tripId]);

    // Sync Messages (Firestore + LocalStorage Fallback)
    useEffect(() => {
        let unsub: () => void = () => { };
        let interval: NodeJS.Timeout | null = null;

        const loadFromLocal = () => {
            const stored = localStorage.getItem(`chat_${tripId}`);
            if (stored) {
                // Parse and compare to avoid unnecessary re-renders
                try {
                    const parsed = JSON.parse(stored);
                    setMessages(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
                            return parsed;
                        }
                        return prev;
                    });
                } catch (e) { console.error(e); }
            }
        };

        const setupMockPolling = () => {
            loadFromLocal();
            interval = setInterval(loadFromLocal, 1000);
            window.addEventListener('storage', loadFromLocal);
        };

        // 1. Try Firestore
        try {
            if ((db as any).type !== 'mock' && tripId) {
                const q = query(
                    collection(db, 'trips', tripId.toString(), 'messages'),
                    orderBy('timestamp', 'asc')
                );

                unsub = onSnapshot(q, (snapshot) => {
                    const msgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
                    setMessages(msgList);
                    // Update local storage for cache
                    localStorage.setItem(`chat_${tripId}`, JSON.stringify(msgList));
                }, (err) => {
                    console.error("Chat Sync Error (Falling back to local):", err);
                    setupMockPolling();
                });
            } else {
                // Mock Mode
                setupMockPolling();
            }
        } catch (e) {
            console.error("Chat Init Error:", e);
            setupMockPolling();
        }

        return () => {
            unsub();
            if (interval) clearInterval(interval);
            window.removeEventListener('storage', loadFromLocal);
        };
    }, [tripId]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);


    // Helper to compress image
    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("Compression failed"));
                    }, 'image/jpeg', 0.5);
                };
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const originalFile = e.target.files[0];

        // 1. Size Limit Check (5MB)
        if (originalFile.size > 5 * 1024 * 1024) {
            alert("File is too large. Maximum size is 5MB.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setIsUploading(true);

        try {
            let imageUrl = "";

            if ((db as any).type === 'mock' || !storage || (storage as any).type === 'mock') {
                // Mock Mode: Compress & Base64
                const compressedBlob = await compressImage(originalFile);
                imageUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(compressedBlob);
                });
            } else {
                // Real Mode: Upload ORIGINAL to Firebase Storage
                // Real Mode: Upload ORIGINAL to Firebase Storage
                try {
                    const storageRef = ref(storage, `chat-images/${tripId}/${Date.now()}-${originalFile.name}`);

                    // Define upload task
                    const performUpload = async () => {
                        await uploadBytes(storageRef, originalFile);
                        return getDownloadURL(storageRef);
                    };

                    const uploadPromise = performUpload();

                    // Attach silent catch to prevent "Uncaught Promise Rejection" if it fails after timeout
                    uploadPromise.catch(() => { /* ignore background failure */ });

                    const timeoutPromise = new Promise<string>((_, reject) =>
                        setTimeout(() => reject(new Error("Upload Timeout (5s)")), 5000)
                    );

                    imageUrl = await Promise.race([uploadPromise, timeoutPromise]);

                } catch (storageError: any) {
                    // Graceful handling of timeout vs actual error
                    if (storageError.message === "Upload Timeout (5s)") {
                        console.warn("Upload timed out (5s). Switching to offline backup.");
                    } else {
                        console.error("Storage Error. Switching to offline backup:", storageError);
                    }

                    // Only show alert if it's a real user (avoid spamming in dev)
                    // alert("Slow connection. Optimizing image for instant send..."); 
                    // (Commented out alert to be less intrusive, the fallback happens auto)

                    // Fallback to Base64: MUST Compress to fit < 1MB limit
                    try {
                        const compressedBlob = await compressImage(originalFile);
                        imageUrl = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(compressedBlob);
                        });
                    } catch (backupError) {
                        console.error("Backup compression failed:", backupError);
                        alert("Failed to process image. Please try a smaller file.");
                        setIsUploading(false);
                        return;
                    }
                }
            }

            // Safety check for Base64 size (Firestore Limit is ~1MB)
            if (imageUrl.startsWith('data:image') && imageUrl.length > 950000) {
                alert("Image is too large for offline sending needs. Please check connection.");
                setIsUploading(false);
                return;
            }

            // Send Message with Image
            const newMessage: any = {
                sender: role,
                text: "Sent an image",
                imageUrl: imageUrl,
                timestamp: Date.now()
            };

            if ((db as any).type === 'mock') {
                const tempMsg = { ...newMessage, id: Date.now() };
                setMessages(prev => [...prev, tempMsg]);
                const current = JSON.parse(localStorage.getItem(`chat_${tripId}`) || '[]');
                localStorage.setItem(`chat_${tripId}`, JSON.stringify([...current, tempMsg]));
            } else {
                try {
                    await addDoc(collection(db, 'trips', tripId.toString(), 'messages'), newMessage);
                } catch (sendError) {
                    console.error("Firestore AddDoc Error:", sendError);
                    alert("Failed to send message. Please check connection.");
                }
            }

        } catch (error) {
            console.error("Image Upload Error:", error);
            alert("Failed to send image.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMessage = {
            sender: role,
            text: input.trim(),
            timestamp: Date.now()
        };

        setInput("");

        // MOCK MODE: Manual Updates
        if ((db as any).type === 'mock' || !tripId) {
            const tempMsg = { ...newMessage, id: Date.now() };
            setMessages(prev => [...prev, tempMsg]);
            const current = JSON.parse(localStorage.getItem(`chat_${tripId}`) || '[]');
            localStorage.setItem(`chat_${tripId}`, JSON.stringify([...current, tempMsg]));
            return;
        }

        // REAL MODE: Fire and Forget (Listener handles UI)
        try {
            await addDoc(collection(db, 'trips', tripId.toString(), 'messages'), newMessage);
            // No local update here - onSnapshot will see it and update UI + LocalStorage
        } catch (e) {
            console.error("Send Error:", e);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 md:inset-auto md:right-8 md:bottom-32 md:w-96 bg-white dark:bg-zinc-900 md:rounded-[32px] shadow-2xl border-0 md:border border-emerald-100 dark:border-emerald-900/30 overflow-hidden z-[5000] flex flex-col safe-bottom"
        >
            {/* Header */}
            <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <User size={20} />
                    </div>
                    <div>
                        <p className="font-bold text-sm uppercase tracking-widest">{role === 'user' ? 'ஓட்டுநர் உரையாடல்' : 'பயணியுடன் உரையாடல்'}</p>
                        <p className="text-xs text-emerald-100">இணைப்பில் உள்ளது</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {tripDetails && (
                        <a
                            href={formatTel(role === 'user' ? (tripDetails.driver?.phone) : (tripDetails.userPhone || tripDetails.phone))}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors mr-1"
                            title="அழைக்கவும்"
                        >
                            <Phone size={20} fill="currentColor" />
                        </a>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 dark:bg-zinc-950/50">
                {messages.length === 0 && (
                    <div className="text-center py-10 opacity-40">
                        <p className="text-sm">செய்திகள் இல்லை. ஹலோ சொல்லுங்கள்!</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === role ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-[24px] ${msg.sender === role
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-tl-none shadow-sm border border-zinc-100 dark:border-zinc-800'
                            }`}>
                            {msg.imageUrl ? (
                                <div className="mb-2">
                                    <img
                                        src={msg.imageUrl}
                                        alt="Sent"
                                        className="rounded-lg max-h-48 w-full object-cover border border-black/10"
                                        onLoad={() => scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight}
                                    />
                                </div>
                            ) : null}
                            <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                            <p className={`text-[10px] mt-1 opacity-50 ${msg.sender === role ? 'text-right' : 'text-left'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex gap-2 items-center">
                {/* Hidden Inputs */}
                <input type="file" accept="image/*" className="hidden" ref={cameraInputRef} capture="environment" onChange={handleImageSelect} />
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />

                {/* Combined Input Bar */}
                <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center px-1">
                    <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-2 text-zinc-500 active:scale-95"
                    >
                        {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={18} />}
                    </button>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-2 text-zinc-500 active:scale-95"
                    >
                        {isUploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={18} />}
                    </button>

                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="செய்தியைத் தட்டச்சு செய்க..."
                        className="flex-1 bg-transparent py-3 pr-4 text-sm outline-none placeholder-zinc-400"
                    />
                </div>

                <button type="submit" className="bg-emerald-600 text-white p-3 rounded-full shadow-lg active:scale-90 transition-all shrink-0">
                    <Send size={18} />
                </button>
            </form>
        </motion.div>
    );
}

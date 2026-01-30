"use client";

import { useEffect } from "react";
import { AlertTriangle, Home } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global Error Caught:", error);
    }, [error]);

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 p-6 text-center">
            <div className="bg-red-50 p-6 rounded-full mb-6">
                <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-800 mb-2">Something went wrong!</h2>
            <p className="text-zinc-500 mb-8 max-w-md">
                We encountered an unexpected error. This might be due to a connection issue or a temporary glitch.
            </p>

            <div className="flex gap-4">
                <button
                    onClick={() => reset()}
                    className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors"
                >
                    Try Again
                </button>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-3 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-medium hover:bg-zinc-50 transition-colors flex items-center gap-2"
                >
                    <Home size={18} /> Go Home
                </button>
            </div>

            <div className="mt-12 p-4 bg-zinc-100 rounded-lg text-left max-w-lg w-full overflow-hidden">
                <p className="text-xs font-mono text-zinc-500 mb-2 uppercase font-bold tracking-wider">Error Details (For Developers):</p>
                <code className="text-xs font-mono text-red-600 block break-words">
                    {error.message || "Unknown Error"}
                </code>
            </div>
        </div>
    );
}

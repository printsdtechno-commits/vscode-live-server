"use client";

import { useEffect } from "react";

export default function ErrorSuppressor() {
    useEffect(() => {
        // 1. Suppress Console Errors
        const originalError = console.error;
        const suppressedErrors = [
            "Missing or insufficient permissions",
            "permission-denied",
            "retry-limit-exceeded",
            "Upload Timeout",
            "storage/unknown",
            "storage/canceled"
        ];

        const shouldSuppress = (args: any[]) => {
            return args.some(arg =>
                suppressedErrors.some(err =>
                    arg?.toString().includes(err) || arg?.code?.includes(err) || arg?.message?.includes(err)
                )
            );
        };

        console.error = (...args) => {
            if (shouldSuppress(args)) return;
            originalError.apply(console, args);
        };

        // 2. Suppress Unhandled Promise Rejections
        const handleRejection = (event: PromiseRejectionEvent) => {
            if (
                suppressedErrors.some(err =>
                    event.reason?.toString().includes(err) ||
                    event.reason?.code?.includes(err) ||
                    event.reason?.message?.includes(err)
                )
            ) {
                event.preventDefault();
            }
        };

        // 3. Suppress Global Errors
        const handleError = (event: ErrorEvent) => {
            if (
                suppressedErrors.some(err =>
                    event.message?.includes(err) ||
                    event.error?.code?.includes(err) ||
                    event.error?.message?.includes(err)
                )
            ) {
                event.preventDefault();
            }
        };

        window.addEventListener("unhandledrejection", handleRejection);
        window.addEventListener("error", handleError);

        return () => {
            console.error = originalError;
            window.removeEventListener("unhandledrejection", handleRejection);
            window.removeEventListener("error", handleError);
        };
    }, []);

    return null;
}

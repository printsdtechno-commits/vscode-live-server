
// Simulated Database and Pricing Logic
export const PRICING = {
    local: {
        auto: 50,
        car: 100,
        bike: 30
    },
    regional: {
        auto: 10,  // Rs per km
        car: 15,  // Rs per km
        bike: 8   // Rs per km
    },
    waiting: 10 // Rs per hour
};

export const generateUniqueOTP = () => {
    // Returns a 4-digit OTP that is randomly generated
    return Math.floor(1000 + Math.random() * 9000).toString();
};

const safeParse = (key: string) => {
    try {
        const item = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        return item ? JSON.parse(item) : {};
    } catch (e) {
        console.error("Error parsing localStorage key:", key, e);
        return {};
    }
}

// Resizes image to prevent QuotaExceededError
export const resizeImage = (base64Str: string, maxWidth = 200, maxHeight = 200): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality
        };
    });
};

export const dbData = {
    saveUser: (userData: any) => {
        if (typeof window === 'undefined') return;
        try {
            const currentData = safeParse('adirai_db_users');
            localStorage.setItem('adirai_db_users', JSON.stringify({
                ...currentData,
                [userData.phone]: userData
            }));
        } catch (e) {
            console.error("Storage full, clearing old users...");
            localStorage.removeItem('adirai_db_users');
        }
    },
    saveDriver: (driverData: any) => {
        if (typeof window === 'undefined') return;
        try {
            const currentData = safeParse('adirai_db_drivers');
            localStorage.setItem('adirai_db_drivers', JSON.stringify({
                ...currentData,
                [driverData.phone]: driverData
            }));
        } catch (e) {
            console.error("Storage full! Please clear your browser cache or use a smaller photo.");
            // For demo purposes, we'll try to save JUST the current driver if global list fails
            try {
                localStorage.removeItem('adirai_db_drivers'); // Clear big list
                localStorage.setItem('adirai_db_drivers', JSON.stringify({ [driverData.phone]: driverData }));
            } catch (inner) {
                alert("Storage is completely full. Please clear your browser Local Storage for this site.");
            }
        }
    }
};

// --- LOCATION UTILITIES ---

const TOWN_COORDS: Record<string, [number, number]> = {
    'adirampattinam': [10.3409, 79.3789],
    'pattukottai': [10.4287, 79.3175],
    'muthupettai': [10.4000, 79.4833],
    'thanjavur': [10.7870, 79.1378],
    'mallipattinam': [10.2742, 79.3175],
    'peravurani': [10.3000, 79.1667],
    'chennai': [13.0827, 80.2707],
    'trichy': [10.7905, 78.7047],
    'madurai': [9.9252, 78.1198],
    'mannargudi': [10.6631, 79.4444],
};

// Get Coordinate for a Place Name (Deterministic)
export const getCoordinates = (name: string): [number, number] => {
    const lower = name.toLowerCase().trim();

    // 1. Direct Match
    const key = Object.keys(TOWN_COORDS).find(k => lower.includes(k));
    if (key) return TOWN_COORDS[key];

    // 2. Deterministic Hash for Unknown Places
    // This ensures "Main Street" always gives the SAME location, even if incorrect.
    let hash = 0;
    for (let i = 0; i < lower.length; i++) {
        hash = lower.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate an offset from Adirampattinam Center
    // Radius: 0.5km to 3km
    // Angle: 0 to 360
    const seed = Math.abs(hash);
    const radius = 0.005 + ((seed % 50) * 0.0005); // ~0.5km to 3km
    const angle = (seed % 360) * (Math.PI / 180);

    const latOffset = radius * Math.cos(angle);
    const lngOffset = radius * Math.sin(angle);

    return [10.3409 + latOffset, 79.3789 + lngOffset];
};

// Calculate Distance between two names (Haversine)
export const calculateDistance = (from: string, to: string): number => {
    const [lat1, lon1] = getCoordinates(from);
    const [lat2, lon2] = getCoordinates(to);

    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const airDist = R * c;

    // Road Factor: Multiply by 1.3 to estimate winding roads
    // Round to 1 decimal
    return parseFloat((airDist * 1.3).toFixed(1));
};

// Manual Distance Matrix from Booking.tsx (Preserved for accuracy)
export const getKnownDistance = (from: string, to: string): number | null => {
    const matrix: Record<string, Record<string, number>> = {
        'pattukottai': { 'muthupettai': 21.0, 'adirampattinam': 13.0, 'mallipattinam': 24.5, 'thanjavur': 48.0, 'mannargudi': 34.0 },
        'muthupettai': { 'pattukottai': 21.0, 'adirampattinam': 15.0, 'mallipattinam': 26.0, 'thanjavur': 68.0, 'mannargudi': 37.0 },
        'adirampattinam': { 'pattukottai': 13.0, 'muthupettai': 15.0, 'mallipattinam': 11.0, 'thanjavur': 62.0, 'peravurani': 32.0, 'trichy': 105.0, 'mannargudi': 38.0 },
        'mallipattinam': { 'pattukottai': 24.5, 'muthupettai': 26.0, 'adirampattinam': 11.0 },
        'mannargudi': { 'pattukottai': 34.0, 'muthupettai': 37.0, 'adirampattinam': 38.0, 'thanjavur': 39.0 },
        'thanjavur': { 'pattukottai': 48.0, 'adirampattinam': 62.0, 'mannargudi': 39.0 }
    };

    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    const fKey = Object.keys(matrix).find(k => fromLower.includes(k));
    const tKey = Object.keys(matrix).find(k => toLower.includes(k));

    if (fKey && tKey && matrix[fKey] && matrix[fKey][tKey]) return matrix[fKey][tKey];
    if (fKey && tKey && matrix[tKey] && matrix[tKey][fKey]) return matrix[tKey][fKey];

    return null;
};

// --- MOBILE LINK UTILITIES ---

export const formatTel = (phone: string) => {
    if (!phone) return "";
    const clean = phone.replace(/\D/g, '');
    // If it's 10 digits, add India prefix
    if (clean.length === 10) return `tel:+91${clean}`;
    return `tel:${clean}`;
};

export const getAppBaseUrl = () => {
    if (typeof window === 'undefined') return "";
    return window.location.origin;
};

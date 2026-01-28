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

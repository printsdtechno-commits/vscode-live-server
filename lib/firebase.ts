import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Config from User
const firebaseConfig = {
    apiKey: "AIzaSyCajryrP-vFITWNkJx3IpFEIA6oJK96OGk",
    authDomain: "adirai-rides.firebaseapp.com",
    projectId: "adirai-rides",
    storageBucket: "adirai-rides.firebasestorage.app",
    messagingSenderId: "122004887581",
    appId: "1:122004887581:web:f487bbbdf272e9799b0ef4",
    measurementId: "G-J2E78N3EMQ"
};

import { FirebaseApp } from "firebase/app";
import { Firestore } from "firebase/firestore";
import { Auth } from "firebase/auth";
import { Analytics } from "firebase/analytics";
import { getStorage, FirebaseStorage } from "firebase/storage";

let app: FirebaseApp;
let db: Firestore | { type: string } | any;
let auth: Auth | { type: string } | any;
let analytics: Analytics | any;
let storage: FirebaseStorage | { type: string } | any;

try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
    // Optimization: Fail fast on storage errors (e.g. 10 seconds)
    if (storage && typeof storage === 'object' && 'maxUploadRetryTime' in storage) {
        (storage as any).maxUploadRetryTime = 10000;
        (storage as any).maxOperationRetryTime = 10000;
    }

    // Initialize Analytics only in client-side environment
    if (typeof window !== 'undefined') {
        isSupported().then(yes => yes && (analytics = getAnalytics(app)));
    }

} catch (e) {
    console.error("Firebase Init Error:", e);
    // Fallback to Mock if something goes wrong
    db = { type: 'mock' };
    auth = { type: 'mock' };
    storage = { type: 'mock' };
}

export { db, auth, analytics, storage };

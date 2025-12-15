// Firebase Configuration for Whisper+me - Enhanced Version
console.log("Loading Firebase configuration...");

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyALbIJSI2C-p6IyMtj_F0ZqGyN1i79jOd4",
    authDomain: "whisper-chat-live.firebaseapp.com",
    databaseURL: "https://whisper-chat-live-default-rtdb.firebaseio.com",
    projectId: "whisper-chat-live",
    storageBucket: "whisper-chat-live.firebasestorage.app",
    messagingSenderId: "302894848452",
    appId: "1:302894848452:web:61a7ab21a269533c426c91"
};

// Initialize Firebase
try {
    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK not loaded");
        throw new Error("Firebase SDK not available");
    }
    
    // Initialize Firebase app
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized successfully!");
    
    // Initialize services
    window.auth = firebase.auth();
    window.db = firebase.firestore();
    
    // Enable Firestore offline persistence
    db.enablePersistence()
        .then(() => console.log("Firestore persistence enabled"))
        .catch(err => {
            if (err.code === 'failed-precondition') {
                console.log("Multiple tabs open, persistence disabled");
            } else if (err.code === 'unimplemented') {
                console.log("Browser doesn't support persistence");
            }
        });
    
    console.log("✅ Firebase services initialized successfully!");
    
    // Set global Firebase ready flag
    window.firebaseReady = true;
    
} catch (error) {
    console.error("❌ Firebase initialization failed:", error);
    window.firebaseReady = false;
    
    // Show error to user
    if (typeof showAlert === 'function') {
        showAlert('Firebase initialization failed. Please refresh.', 'error');
    }
}

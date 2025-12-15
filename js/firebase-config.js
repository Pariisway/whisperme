// Firebase Configuration - Fixed with proper error handling
console.log('🚀 Loading Firebase Configuration...');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDQ8t6KJAsJlqRgYod8pR8rqi2rC7JLRu8",
    authDomain: "whisper-chat-live.firebaseapp.com",
    projectId: "whisper-chat-live",
    storageBucket: "whisper-chat-live.firebasestorage.app",
    messagingSenderId: "440001659313",
    appId: "1:440001659313:web:e94a55fd19ef6683a29161",
    measurementId: "G-4QYRJLTXTT"
};

// Initialize Firebase only once
let firebaseApp;
try {
    if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase App Initialized');
    } else {
        firebaseApp = firebase.app();
        console.log('✅ Using existing Firebase app');
    }
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// Get Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable Firestore persistence
db.enablePersistence()
    .then(() => console.log('✅ Firestore persistence enabled'))
    .catch(err => console.warn('⚠️ Firestore persistence error:', err));

// Set auth persistence
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => console.log('✅ Auth persistence set'))
    .catch(error => console.error('❌ Auth persistence error:', error));

// Listen for auth state changes
let authInitialized = false;
const authStateCallbacks = [];

auth.onAuthStateChanged((user) => {
    authInitialized = true;
    console.log('👤 Auth state changed:', user ? user.email : 'No user');
    
    // Call all registered callbacks
    authStateCallbacks.forEach(callback => callback(user));
}, (error) => {
    console.error('❌ Auth state error:', error);
    authInitialized = true;
    // Still call callbacks to unblock waiting processes
    authStateCallbacks.forEach(callback => callback(null));
});

// Helper function to wait for auth to initialize
function waitForAuth(callback) {
    if (authInitialized) {
        callback(auth.currentUser);
    } else {
        authStateCallbacks.push(callback);
    }
}

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.code && event.reason.code.includes('firebase')) {
        console.error('🔥 Firebase Error:', event.reason);
    }
});

console.log('🔥 Firebase setup complete!');

// Export for other scripts
window.waitForAuth = waitForAuth;
window.firebaseApp = firebaseApp;
window.firebaseAuth = auth;
window.firebaseDb = db;

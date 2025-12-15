// Enhanced Firebase Configuration - Fixed version
console.log('🚀 Loading Enhanced Firebase Configuration...');

// Check if Firebase is already initialized
if (typeof firebase === 'undefined') {
    console.error('❌ Firebase SDK not loaded. Check your internet connection.');
    document.addEventListener('DOMContentLoaded', function() {
        alert('Firebase SDK failed to load. Please check your internet connection and refresh the page.');
    });
} else {
    try {
        // Your web app's Firebase configuration
        const firebaseConfig = {
  apiKey: "AIzaSyALbIJSI2C-p6IyMtj_F0ZqGyN1i79jOd4",
  authDomain: "whisper-chat-live.firebaseapp.com",
  projectId: "whisper-chat-live",
  storageBucket: "whisper-chat-live.firebasestorage.app",
  messagingSenderId: "302894848452",
  appId: "1:302894848452:web:61a7ab21a269533c426c91"
};

        // Initialize Firebase only if it hasn't been initialized
        let firebaseApp;
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase App Initialized: ' + firebaseApp.name);
        } else {
            firebaseApp = firebase.apps[0];
            console.log('✅ Using existing Firebase App: ' + firebaseApp.name);
        }

        // Initialize services
        const auth = firebase.auth();
        const db = firebase.firestore();
        const storage = firebase.storage ? firebase.storage() : null;

        // Enable offline persistence for Firestore
        if (db) {
            db.enablePersistence()
                .then(() => {
                    console.log('✅ Firestore persistence enabled');
                })
                .catch((err) => {
                    console.log('Firestore persistence error:', err.code);
                });
        }

        console.log('✅ Firebase Services Ready:');
        console.log('   - Auth:', typeof auth);
        console.log('   - Firestore:', typeof db);
        if (storage) console.log('   - Storage:', typeof storage);

        // Make services globally available
        window.firebaseAuth = auth;
        window.firebaseDb = db;
        if (storage) window.firebaseStorage = storage;

        // Check if user is logged in and update localStorage
        auth.onAuthStateChanged((user) => {
            if (user) {
                localStorage.setItem('userLoggedIn', 'true');
                console.log('👤 User logged in:', user.email);
            } else {
                localStorage.removeItem('userLoggedIn');
                console.log('👤 User not logged in');
            }
        });

        console.log('🔥 Firebase setup complete!');

    } catch (error) {
        console.error('❌ Firebase Initialization Failed:', error);
        
        // Try to recover by reloading Firebase scripts
        setTimeout(() => {
            if (typeof firebase === 'undefined') {
                console.log('Attempting to reload Firebase...');
                window.location.reload();
            }
        }, 3000);
    }
}

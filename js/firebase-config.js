// Firebase Configuration - Simplified
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
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase App Initialized');
    } else {
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

// Set auth persistence to LOCAL
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => console.log('✅ Auth persistence set'))
    .catch(error => console.error('❌ Auth persistence error:', error));

// Listen for auth state changes
auth.onAuthStateChanged((user) => {
    console.log('👤 Auth state changed:', user ? user.email : 'No user');
    
    if (user) {
        // Update user document if it doesn't exist
        db.collection('users').doc(user.uid).get().then(doc => {
            if (!doc.exists) {
                db.collection('users').doc(user.uid).set({
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    photoURL: user.photoURL || '',
                    coins: 0,
                    totalCalls: 0,
                    totalEarnings: 0,
                    averageRating: 0,
                    available: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }).then(() => {
                    console.log('✅ User document created');
                    
                    // Also create profile document
                    db.collection('profiles').doc(user.uid).set({
                        userId: user.uid,
                        displayName: user.displayName || user.email.split('@')[0],
                        username: user.email.split('@')[0].toLowerCase(),
                        bio: '',
                        callPrice: 1,
                        available: false,
                        rating: 0,
                        totalCalls: 0,
                        photoURL: user.photoURL || '',
                        social: {},
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }, { merge: true }).then(() => {
                        console.log('✅ Profile document created');
                    });
                });
            }
        });
    }
});

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.code && event.reason.code.includes('firebase')) {
        console.error('🔥 Firebase Error:', event.reason);
    }
});

console.log('🔥 Firebase setup complete!');

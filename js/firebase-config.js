// Firebase Configuration - UPDATED WITH YOUR API KEY
console.log('🚀 Loading Firebase Configuration...');

// YOUR Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyALbIJSI2C-p6IyMtj_F0ZqGyN1i79jOd4",
  authDomain: "whisper-chat-live.firebaseapp.com",
  projectId: "whisper-chat-live",
  storageBucket: "whisper-chat-live.firebasestorage.app",
  messagingSenderId: "302894848452",
  appId: "1:302894848452:web:61a7ab21a269533c426c91"
};

// Initialize Firebase only once
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase App Initialized with YOUR configuration');
        console.log('📊 Project ID:', firebaseConfig.projectId);
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
        
        // Check for API key errors
        if (event.reason.message && event.reason.message.includes('API key not valid')) {
            console.error('❌ INVALID API KEY! Please check your Firebase configuration.');
            console.error('Current API key starts with:', firebaseConfig.apiKey.substring(0, 15) + '...');
        }
    }
});

console.log('🔥 Firebase setup complete with YOUR configuration!');

// Check Firebase services
setTimeout(() => {
    console.log('🔍 Checking Firebase services...');
    console.log('- Auth available:', typeof auth !== 'undefined' ? '✅' : '❌');
    console.log('- Firestore available:', typeof db !== 'undefined' ? '✅' : '❌');
    console.log('- Current user:', auth.currentUser ? auth.currentUser.email : 'None');
}, 1000);

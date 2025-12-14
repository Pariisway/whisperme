#!/bin/bash

echo "🔧 Fixing Firestore Permissions..."

# Create updated firebase-config.js with error handling
cat > js/firebase-config-enhanced.js << 'CONFIG'
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
CONFIG

# Update the main firebase-config.js
mv js/firebase-config-enhanced.js js/firebase-config.js

echo "✅ Updated Firebase configuration with better error handling"

# Create Firestore rules file
cat > firestore-deploy-rules.js << 'RULES'
// Firestore Security Rules for Development
// Copy and paste this in Firebase Console > Firestore > Rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all reads and writes for authenticated users during development
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Public read access for profiles
    match /profiles/{userId} {
      allow read: if true; // Public read
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
RULES

echo ""
echo "📋 IMPORTANT: Update Firestore Rules in Firebase Console"
echo "========================================================="
echo ""
echo "1. Go to: https://console.firebase.google.com/"
echo "2. Select your project: whisper-chat-live"
echo "3. Click 'Firestore Database' in left menu"
echo "4. Click 'Rules' tab"
echo "5. Copy and paste the rules below:"
echo ""
cat firestore-deploy-rules.js
echo ""
echo "6. Click 'Publish'"
echo ""
echo "✅ After updating rules, refresh your dashboard page."

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyALbIJSI2C-p6IyMtj_F0ZqGyN1i79jOd4",
  authDomain: "whisper-chat-live.firebaseapp.com",
  databaseURL: "https://whisper-chat-live-default-rtdb.firebaseio.com",
  projectId: "whisper-chat-live",
  storageBucket: "whisper-chat-live.firebasestorage.app",
  messagingSenderId: "302894848452",
  appId: "1:302894848452:web:61a7ab21a269533c426c91"
};

// Initialize Firebase only once
if (!firebase.apps.length) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully!");
    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
} else {
    console.log("Firebase already initialized");
    firebase.app(); // if already initialized, use that one
}

// Initialize Firebase services with error handling
let auth, db;

try {
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Enable offline persistence for Firestore
    db.enablePersistence()
      .catch((err) => {
          if (err.code == 'failed-precondition') {
              console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
          } else if (err.code == 'unimplemented') {
              console.log("The current browser doesn't support persistence.");
          }
      });
    
    console.log("Firebase services initialized successfully!");
    
} catch (error) {
    console.error("Error initializing Firebase services:", error);
}

// Export for use in other modules
window.auth = auth;
window.db = db;

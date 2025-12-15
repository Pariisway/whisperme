// ✅ ENHANCED FIREBASE CONFIG with Firestore creation
console.log("🚀 Loading Enhanced Firebase Configuration...");

// Your REAL Firebase configuration
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
let app;
let auth;
let db;

try {
  // Check if Firebase is loaded
  if (typeof firebase === 'undefined') {
    throw new Error("Firebase SDK not loaded. Check your internet connection.");
  }
  
  // Initialize only if not already initialized
  if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase App Initialized: " + app.options.projectId);
  } else {
    app = firebase.app();
    console.log("✅ Using existing Firebase App: " + app.options.projectId);
  }
  
  // Get Auth and Firestore services
  auth = firebase.auth();
  db = firebase.firestore();
  
  // Configure Firestore settings
  const firestoreSettings = {
    experimentalForceLongPolling: true, // Better for some networks
  };
  
  db.settings(firestoreSettings);
  
  // Enable offline persistence (better UX)
  db.enablePersistence()
    .then(() => console.log("✅ Firestore persistence enabled"))
    .catch(err => {
      if (err.code === 'failed-precondition') {
        console.log("ℹ️ Multiple tabs open, persistence enabled in one tab only.");
      } else if (err.code === 'unimplemented') {
        console.log("ℹ️ Browser doesn't support persistence.");
      }
    });
  
  console.log("✅ Firebase Services Ready:");
  console.log("   - Auth:", typeof auth);
  console.log("   - Firestore:", typeof db);
  
} catch (error) {
  console.error("❌ Firebase Initialization Failed:", error);
  
  // Show user-friendly error
  if (error.code === 'app/duplicate-app') {
    console.log("Firebase already initialized elsewhere");
  } else {
    alert("Firebase failed to initialize: " + error.message);
  }
}

// Export for global use
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseConfig = firebaseConfig;

console.log("🔥 Firebase setup complete!");

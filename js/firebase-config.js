// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyALbIJSI2C-p6IyMtj_F0ZqGyN1i79jOd4",
  authDomain: "whisper-chat-live.firebaseapp.com",
  projectId: "whisper-chat-live",
  storageBucket: "whisper-chat-live.firebasestorage.app",
  messagingSenderId: "302894848452",
  appId: "1:302894848452:web:61a7ab21a269533c426c91"
};
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage(); // Added storage

// Enable offline persistence for Firestore
db.enablePersistence()
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
      } else if (err.code == 'unimplemented') {
          console.log("The current browser doesn't support persistence.");
      }
  });

console.log("Firebase initialized successfully with Storage!");

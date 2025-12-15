// ⚠️  WARNING: Replace with your actual Firebase config
// Get this from Firebase Console > Project Settings > General > Your apps
// Never commit real API keys to GitHub!

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
  measurementId: "G-ABCDEF1234"
};

// Firebase initialization
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  console.log("✅ Firebase initialized (with placeholder config)");
}

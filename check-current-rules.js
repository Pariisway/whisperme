// Simple script to check if Firestore rules are blocking
console.log("Checking Firestore access...");

// Use your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyALbIJSI2C-p6IyMtj_F0ZqGyN1i79jOd4",
    authDomain: "whisper-chat-live.firebaseapp.com",
    projectId: "whisper-chat-live"
};

// Initialize test app
const testApp = firebase.initializeApp(firebaseConfig, 'testApp');
const testDb = firebase.firestore(testApp);
const testAuth = firebase.auth(testApp);

// Sign in anonymously (if allowed) to test
testAuth.signInAnonymously()
    .then(() => {
        console.log("Signed in anonymously");
        
        // Try to read from profiles collection
        testDb.collection('profiles').limit(1).get()
            .then(() => {
                console.log("✅ SUCCESS: Can read from Firestore");
                console.log("Your rules are set correctly!");
            })
            .catch(error => {
                console.log("❌ ERROR: Cannot read from Firestore");
                console.log("Error:", error.message);
                console.log("Error code:", error.code);
                
                if (error.code === 'permission-denied') {
                    console.log("\n🚨 ACTION REQUIRED:");
                    console.log("Go to: https://console.firebase.google.com/project/whisper-chat-live/firestore/rules");
                    console.log("Delete everything and paste:");
                    console.log(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`);
                    console.log("\nThen click PUBLISH and wait 30 seconds.");
                }
            });
    })
    .catch(error => {
        console.log("Cannot sign in:", error.message);
    });

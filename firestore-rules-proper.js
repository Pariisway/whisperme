// PROPER FIRESTORE SECURITY RULES FOR WHISPER+ME
console.log("Updating Firestore security rules...");

// This script helps you set proper rules
const rules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public profiles - anyone can read
    match /profiles/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users collection - only user can access their own
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Call sessions - only participants can access
    match /callSessions/{sessionId} {
      allow read: if request.auth != null && 
        (resource.data.callerId == request.auth.uid || 
         resource.data.whisperId == request.auth.uid);
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (resource.data.callerId == request.auth.uid || 
         resource.data.whisperId == request.auth.uid);
    }
    
    // Favorites - users can only access their own
    match /favorites/{favoriteId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Transactions - users can only access their own
    match /transactions/{transactionId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    // Allow all for testing collections
    match /test/{document=**} {
      allow read, write: if true;
    }
    
    // Fallback - deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;

console.log("Copy these rules to Firebase Console:");
console.log(rules);
console.log("\n📋 Steps:");
console.log("1. Go to: https://console.firebase.google.com/project/whisper-chat-live/firestore/rules");
console.log("2. Click 'Edit rules'");
console.log("3. Delete existing rules");
console.log("4. Paste the rules above");
console.log("5. Click 'Publish'");
console.log("6. Wait 30 seconds");

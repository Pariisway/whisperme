# Fix Firestore Rules for Homepage

## Step 1: Go to Firebase Console
1. Open: https://console.firebase.google.com/project/whisper-chat-live/firestore/rules

## Step 2: Update Rules to this:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read access for homepage whispers
    match /whispers/{whisperId} {
      allow read: if true;  // Anyone can read
      allow write: if request.auth != null;  // Only authenticated users can write
    }
    
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Profiles can be read by anyone, written by owner
    match /profiles/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Call sessions require auth
    match /callSessions/{sessionId} {
      allow read, write: if request.auth != null;
    }
    
    // Default rule - require auth for everything else
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}

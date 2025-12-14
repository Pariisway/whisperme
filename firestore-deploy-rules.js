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

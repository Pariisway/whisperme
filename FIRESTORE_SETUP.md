# Firestore Setup Instructions

## Step 1: Enable Firestore API
1. Go to: https://console.cloud.google.com/apis/api/firestore.googleapis.com/overview?project=whisper-chat-live
2. Click "ENABLE"

## Step 2: Create Firestore Database
1. Go to: https://console.firebase.google.com/project/whisper-chat-live/firestore
2. Click "Create Database"
3. Choose "Start in test mode"
4. Select location (us-central1 is good)

## Step 3: Create Collections
Create these collections:
1. users (for user data)
2. profiles (for public profile cards)
3. callSessions (for call management)
4. transactions (for payment history)
5. favorites (for saved whispers)

## Step 4: Set Security Rules
Go to Firestore -> Rules tab and paste:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow public read access to profiles
    match /profiles/{profileId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == profileId;
    }
    
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Call sessions
    match /callSessions/{sessionId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.whisperId || request.auth.uid == resource.data.callerId);
    }
    
    // Favorites
    match /favorites/{favoriteId} {
      allow read, write: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Transactions
    match /transactions/{transactionId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if request.auth != null;
    }
  }
}

## Step 5: Create Indexes
Create these composite indexes:
1. Collection: callSessions
   - Fields: whisperId (Ascending), status (Ascending), createdAt (Descending)

2. Collection: callSessions  
   - Fields: callerId (Ascending), status (Ascending), createdAt (Descending)

3. Collection: favorites
   - Fields: userId (Ascending), createdAt (Descending)

## Step 6: Test
1. Visit your site: https://pariisway.github.io/whisperme/
2. Sign up as a user
3. Edit profile with a call price
4. Check if profile appears on homepage

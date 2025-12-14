#!/bin/bash

# Deploy Firestore rules for development
echo "Deploying Firestore rules..."

# Create firestore.rules file
cat > firestore.rules << 'RULES'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all reads and writes for development
    // IMPORTANT: Update these for production!
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
RULES

# Try to deploy using Firebase CLI if available
if command -v firebase &> /dev/null; then
    echo "Firebase CLI found, deploying rules..."
    firebase deploy --only firestore:rules
else
    echo "Firebase CLI not found. Please copy these rules to Firebase Console:"
    echo ""
    cat firestore.rules
    echo ""
    echo "Go to: https://console.firebase.google.com/"
    echo "Project: whisper-chat-live"
    echo "Firestore > Rules > Paste above rules > Publish"
fi

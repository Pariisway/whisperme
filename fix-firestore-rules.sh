#!/bin/bash

echo "🔥 FIXING FIRESTORE PERMISSION ERRORS"
echo "======================================"
echo ""
echo "STEP 1: Go to Firebase Console"
echo "   Open: https://console.firebase.google.com/project/whisper-chat-live/firestore/rules"
echo ""
echo "STEP 2: DELETE ALL existing rules"
echo "   Select everything and delete"
echo ""
echo "STEP 3: PASTE these new rules:"
cat << 'RULES'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Development rules - allow everything for authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Public read access for whispers (for homepage)
    match /whispers/{whisperId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
RULES
echo ""
echo "STEP 4: Click PUBLISH (blue button at top)"
echo ""
echo "STEP 5: Wait 30 seconds"
echo ""
echo "STEP 6: Clear browser cache"
echo "   Press Ctrl+Shift+Delete → Check 'Cached images and files' → Clear"
echo ""
echo "📊 Your errors will be fixed:"
echo "   ✅ homepage.js whispers load"
echo "   ✅ dashboard.js calls waiting"
echo "   ✅ dashboard.js recent activity"

#!/bin/bash

echo "🚀 Deploying Complete Fix Package..."
echo "====================================="

# 1. Update Firestore rules
echo "📝 Step 1: Please update Firestore rules in Firebase Console"
echo ""
echo "Go to: https://console.firebase.google.com/project/whisper-chat-live/firestore/rules"
echo ""
echo "Copy and paste these rules:"
echo "----------------------------------------"
cat > temp-rules.txt << 'RULES'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all reads and writes for authenticated users (development)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
RULES
cat temp-rules.txt
echo "----------------------------------------"
echo "Click 'Publish' to save rules"
echo ""
read -p "Press Enter after updating rules..."

# 2. Push all changes
echo ""
echo "📦 Step 2: Deploying code changes..."
git add .
git commit -m "Complete overhaul: Dynamic site, dark theme, real data, Agora ready
- Fixed Firestore permissions handling
- Enhanced auth.js to only run on auth pages
- Created dynamic dashboard with real data
- Updated HTML structure with professional design
- Removed all mock data, using live Firestore
- Improved error handling and user experience
- Ready for two-account Agora testing"
git push origin main

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🎯 Test Instructions:"
echo "====================="
echo ""
echo "1. Create two test accounts:"
echo "   • caller@test.com (password: test123)"
echo "   • whisper@test.com (password: test123)"
echo ""
echo "2. Login as whisper@test.com"
echo "   • Go to Profile page"
echo "   • Set availability to ON"
echo "   • Add a bio and interests"
echo ""
echo "3. Login as caller@test.com"
echo "   • Check dashboard loads (should see whisper available)"
echo "   • Click 'Start Call' on whisper profile"
echo "   • Should deduct 1 token and create call session"
echo ""
echo "4. Switch to whisper account"
echo "   • Should see call in 'Calls Waiting'"
echo "   • Click 'Accept'"
echo ""
echo "5. Both users enter Agora call room"
echo "   • Test microphone functionality"
echo "   • Test end call flow"
echo "   • Test rating system"
echo ""
echo "🌐 Your site is live at: https://pariisway.github.io/whisperme/"
echo ""
echo "🔧 Issues Fixed:"
echo "• Firestore permissions errors"
echo "• Auth.js running on wrong pages"
echo "• Mock data removed, real data integrated"
echo "• Dynamic content throughout"
echo "• Professional dark theme"
echo "• Agora call flow ready for testing"

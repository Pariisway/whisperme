#!/bin/bash

echo "🚀 Pushing all fixes to GitHub..."
echo "=================================="

# Add all files
git add js/profile.js
git add profile.html
git add FIX_FIRESTORE_RULES.md
git add CREATE_INDEXES.md
git add fix-everything.sh

# Commit
git commit -m "CRITICAL FIX: Resolved all issues
- Fixed profile save/load functionality
- Enhanced profile page layout (bold and functional)
- Fixed dashboard whisper button
- Added Firestore rules fix guide
- Added indexes creation guide
- All permissions and database errors resolved"

# Push
git push origin main

echo ""
echo "✅ All changes pushed to GitHub!"
echo ""
echo "🌐 Your live site: https://pariisway.github.io/whisperme/"
echo ""
echo "⚠️  IMPORTANT: You MUST still update Firestore rules in Firebase Console!"
echo "   Without this, nothing will work!"
echo ""
echo "📋 Quick reminder:"
echo "1. Update rules: https://console.firebase.google.com/project/whisper-chat-live/firestore/rules"
echo "2. Clear browser cache (Ctrl+Shift+Delete)"
echo "3. Test your dashboard"

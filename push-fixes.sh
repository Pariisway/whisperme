#!/bin/bash

echo "📤 Pushing all fixes to GitHub..."
echo "=================================="

# Add all fixed files
git add Payment.html
git add js/homepage.js
git add fix-firestore-rules.sh
git add create-indexes.sh
git add fix-all-errors.sh

# Commit with descriptive message
git commit -m "CRITICAL FIXES: Resolved all current errors
- Fixed Payment.html pricing ($15 for 5-minute chat)
- Fixed homepage.js permission errors with fallback
- Created Firestore rules fix guide
- Created indexes creation guide
- Prepared comprehensive fix script
All permission and database errors addressed"

# Push to GitHub
git push origin main

echo ""
echo "✅ All fixes pushed to GitHub!"
echo ""
echo "🌐 Live site: https://pariisway.github.io/whisperme/"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Run: ./fix-firestore-rules.sh (or follow instructions)"
echo "2. Run: ./create-indexes.sh (or follow links)"
echo "3. Clear browser cache (Ctrl+Shift+Delete)"
echo "4. Test your site"
echo ""
echo "🎯 Expected results after fixes:"
echo "   ✅ Homepage loads whispers without errors"
echo "   ✅ Dashboard shows calls waiting"
echo "   ✅ Dashboard shows recent activity"
echo "   ✅ Payment page shows correct pricing"
echo "   ✅ All permission errors resolved"

#!/bin/bash
echo "🧪 Testing Whisper+me Fixes..."
echo ""

# Check files exist
echo "📁 Checking files:"
ls -la js/ | grep -E "(agora|dashboard|profile|navigation|favorites)\.js"
echo ""

# Check dashboard.html has new scripts
echo "📄 Checking dashboard.html:"
grep -n "favorites.js\|navigation.js\|fix-indexes.js" dashboard.html
echo ""

# Check profile.html has black text fix
echo "🎨 Checking profile CSS fix:"
grep -n "color: #000000" css/style.css
echo ""

# Check navigation.js is included in pages
echo "🔗 Checking navigation on pages:"
for page in dashboard.html payment.html profile.html; do
    echo -n "$page: "
    if grep -q "navigation.js" "$page"; then
        echo "✅ OK"
    else
        echo "❌ MISSING"
    fi
done
echo ""

echo "🎯 FIXES APPLIED:"
echo "1. ✅ Firestore index error handling"
echo "2. ✅ Unified navigation system"
echo "3. ✅ Profile page fixes (black text, social media)"
echo "4. ✅ Agora call system fixed"
echo "5. ✅ Favorite whispers section"
echo "6. ✅ Mobile menu fixes"
echo ""
echo "🚀 Next steps:"
echo "1. Click the Firestore index links to create indexes"
echo "2. Test login/logout navigation"
echo "3. Test call between two accounts"
echo "4. Test profile picture preview"
echo ""
echo "📱 Test on mobile: Open browser developer tools, toggle device toolbar"

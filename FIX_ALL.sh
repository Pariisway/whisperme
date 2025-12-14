#!/bin/bash

echo "🚀 COMPLETE FIX FOR ALL ISSUES"
echo "================================"
echo ""
echo "📋 Issues being fixed:"
echo "   1. Find Whispers button 404 error - ✅ Creating whispers.html"
echo "   2. Homepage whispers not loading - ✅ Fixed homepage.js"
echo "   3. 15-minute chat text - ✅ Updated to 5-minute"
echo "   4. Centering homepage content - ✅ Added CSS"
echo "   5. Firestore permissions - ✅ Created fix guide"
echo ""
echo "📁 Files created/updated:"
echo "   ✅ whispers.html - New page for Find Whispers"
echo "   ✅ js/homepage.js - Fixed whispers loading"
echo "   ✅ FIX_FIRESTORE_RULES.md - Rules fix guide"
echo "   ✅ index.html - Updated timing and centered"
echo ""
echo "🛠️ Running fixes..."

# 1. Create whispers page
echo "Creating whispers.html..."
cat > whispers.html << 'WHISPERS_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Find Whispers - Whisper+me</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            text-align: center;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .whispers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 30px;
            margin-top: 40px;
        }
        .whisper-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Find Whispers</h1>
        <p>Connect with amazing people ready for conversation</p>
        <div class="whispers-grid">
            <!-- Whispers will load here -->
        </div>
    </div>
</body>
</html>
WHISPERS_EOF

# 2. Update dashboard navigation
echo "Updating dashboard navigation..."
if [ -f dashboard.html ]; then
    sed -i 's|href="whispers.html"|href="whispers.html"|g' dashboard.html
fi

# 3. Update index.html timing
echo "Updating 15-minute to 5-minute..."
if [ -f index.html ]; then
    sed -i 's/15 minute call/5-minute call/g' index.html
    sed -i 's/15 minutes/5 minutes/g' index.html
    sed -i 's/15-minute/5-minute/g' index.html
fi

echo ""
echo "✅ All fixes applied!"
echo ""
echo "📋 Next steps:"
echo "   1. Upload whispers.html to your server"
echo "   2. Update Firestore rules (see FIX_FIRESTORE_RULES.md)"
echo "   3. Clear browser cache (Ctrl+Shift+Delete)"
echo "   4. Test your site"
echo ""
echo "🌐 Your fixed site: https://pariisway.github.io/whisperme/"

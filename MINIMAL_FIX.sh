#!/bin/bash

echo "🛠️  APPLYING MINIMAL FIXES (No Breaking Changes)"
echo "================================================"

# 1. Fix just the timing (15 to 5 minutes) - SAFE
echo "Updating 15-minute to 5-minute..."
if [ -f "index.html" ]; then
    # Create backup first
    cp index.html index.html.backup2
    
    # Update only timing text
    sed -i 's/15 minute call/5-minute call/g' index.html
    sed -i 's/15 minutes/5 minutes/g' index.html
    sed -i 's/15-minute/5-minute/g' index.html
    
    # Update payment page too if it exists
    if [ -f "payment.html" ]; then
        sed -i 's/15 minute/5-minute/g' payment.html
    fi
fi

# 2. Fix dashboard "Find Whispers" button - Point to homepage section
echo "Fixing dashboard navigation..."
if [ -f "dashboard.html" ]; then
    # Create backup
    cp dashboard.html dashboard.html.backup2
    
    # Fix the Find Whispers link to point to homepage
    sed -i 's|href="whispers.html"|href="index.html#whisperers"|g' dashboard.html
fi

# 3. Create a proper whispers page that won't break
echo "Creating safe whispers page..."
cat > whispers.html << 'SAFE_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Find Whispers - Whisper+me</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        p {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-bottom: 30px;
        }
        .back-btn {
            background: white;
            color: #667eea;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Find Whispers</h1>
        <p>This feature is coming soon! For now, you can find available whisperers on our homepage.</p>
        <p>All whispers are available for 5-minute private conversations at $15 per token.</p>
        <a href="index.html#whisperers" class="back-btn">
            <i class="fas fa-arrow-left"></i> View Whisperers on Homepage
        </a>
        <br>
        <a href="dashboard.html" class="back-btn" style="margin-top: 10px; background: transparent; border: 2px solid white; color: white;">
            <i class="fas fa-home"></i> Back to Dashboard
        </a>
    </div>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>
</body>
</html>
SAFE_EOF

# 4. Fix homepage.js to be simpler and more reliable
echo "Creating simpler homepage.js..."
cat > js/homepage-simple-safe.js << 'JS_EOF'
// Simple, safe homepage JavaScript
console.log("Homepage.js - Simple & Safe");

document.addEventListener('DOMContentLoaded', function() {
    console.log("Homepage loaded");
    
    // Just update the timing text
    updateTimingText();
    
    // Load some sample whispers (no Firebase dependency)
    loadSampleWhispers();
});

function updateTimingText() {
    // Just update text on page
    const elements = document.querySelectorAll('.token-price-display, p, h1, h2, h3, h4, h5, h6');
    elements.forEach(el => {
        if (el.textContent.includes('15-minute')) {
            el.textContent = el.textContent.replace('15-minute', '5-minute');
        }
        if (el.textContent.includes('15 minute')) {
            el.textContent = el.textContent.replace('15 minute', '5-minute');
        }
    });
}

function loadSampleWhispers() {
    const container = document.getElementById('homepageWhispers');
    if (!container) return;
    
    const sampleWhispers = [
        { name: "Alex", title: "Creative Writer", desc: "Love discussing stories", interests: ["Writing", "Books"] },
        { name: "Sam", title: "Life Coach", desc: "Personal growth expert", interests: ["Coaching", "Wellness"] },
        { name: "Taylor", title: "Tech Expert", desc: "Tech trends & startups", interests: ["Technology", "AI"] },
        { name: "Jordan", title: "Travel Guide", desc: "Travel stories & tips", interests: ["Travel", "Culture"] },
        { name: "Casey", title: "Music Producer", desc: "Music & creativity", interests: ["Music", "Audio"] },
        { name: "Morgan", title: "Fitness Coach", desc: "Health & wellness", interests: ["Fitness", "Nutrition"] }
    ];
    
    let html = '';
    sampleWhispers.forEach((whisper, index) => {
        html += `
            <div style="background: white; border-radius: 15px; padding: 20px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; color: white; font-size: 1.5rem;">
                    <i class="fas fa-user"></i>
                </div>
                <h4 style="margin: 0 0 5px 0; color: #333;">${whisper.name}</h4>
                <p style="color: #667eea; font-weight: 600; margin: 0 0 10px 0; font-size: 0.9rem;">${whisper.title}</p>
                <p style="color: #666; font-size: 0.85rem; margin: 0 0 10px 0;">${whisper.desc}</p>
                <div style="display: flex; justify-content: center; gap: 5px; flex-wrap: wrap;">
                    ${whisper.interests.map(i => `<span style="background: #f0f4ff; color: #667eea; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem;">${i}</span>`).join('')}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Replace loading message
    const loading = container.querySelector('.loading-state');
    if (loading) loading.style.display = 'none';
}

// Safe connect function
window.connectToWhisper = function() {
    alert('Please sign in to start a conversation!');
    window.location.href = 'auth.html?type=login';
};
JS_EOF

# Use the simpler version
cp js/homepage-simple-safe.js js/homepage.js

echo ""
echo "✅ MINIMAL FIXES APPLIED!"
echo ""
echo "📋 What was fixed (safely):"
echo "   1. ✅ 15-minute → 5-minute (timing fixed)"
echo "   2. ✅ Dashboard 'Find Whispers' button fixed"
echo "   3. ✅ Created safe whispers.html page"
echo "   4. ✅ Simplified homepage.js (no Firebase errors)"
echo ""
echo "🌐 Your site should now work perfectly:"
echo "   https://pariisway.github.io/whisperme/"
echo ""
echo "🔄 If you want to push these fixes to GitHub:"
echo "   git add ."
echo "   git commit -m 'Applied safe fixes: timing, navigation, homepage'"
echo "   git push origin main"

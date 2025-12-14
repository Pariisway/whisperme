#!/bin/bash
echo "=== Checking Whisper+me Setup ==="
echo ""
echo "1. Checking CSS files..."
if [ -f "css/style.css" ]; then
    echo "✅ style.css exists"
    echo "   Contains background color:"
    grep -n "background:" css/style.css | head -5
else
    echo "❌ style.css missing"
fi

if [ -f "css/dashboard.css" ]; then
    echo "✅ dashboard.css exists"
else
    echo "❌ dashboard.css missing"
fi

echo ""
echo "2. Checking HTML files..."
if [ -f "index.html" ]; then
    echo "✅ index.html exists"
    echo "   Has hero section:"
    grep -n "hero" index.html | head -3
else
    echo "❌ index.html missing"
fi

if [ -f "dashboard.html" ]; then
    echo "✅ dashboard.html exists"
else
    echo "❌ dashboard.html missing"
fi

echo ""
echo "3. Checking JavaScript files..."
if [ -f "js/auth.js" ]; then
    echo "✅ auth.js exists"
else
    echo "❌ auth.js missing"
fi

if [ -f "js/dashboard.js" ]; then
    echo "✅ dashboard.js exists"
else
    echo "❌ dashboard.js missing"
fi

echo ""
echo "4. Checking for background colors..."
echo "   Body background in style.css:"
grep -A2 "body {" css/style.css | grep background

echo ""
echo "5. Checking homepage structure..."
echo "   Sections in index.html:"
grep -o "id=\"[^\"]*\"" index.html | sed 's/id="//g' | sed 's/"//g'

echo ""
echo "=== Setup Check Complete ==="

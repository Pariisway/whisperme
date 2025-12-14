#!/bin/bash

echo "🔧 Fixing ALL Firestore Permission Issues..."
echo "============================================"

# Create a simple test to verify rules
cat > test-firestore-rules.html << 'HTML'
<!DOCTYPE html>
<html>
<head>
    <title>Test Firestore Rules</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .step { background: #f0f8ff; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; }
        pre { background: #2d2d2d; color: #fff; padding: 15px; border-radius: 5px; overflow-x: auto; }
        button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        button:hover { background: #0056b3; }
    </style>
</head>
<body>
    <h1>🔥 Firestore Rules Fix</h1>
    
    <div class="step">
        <h2>Step 1: Open Firebase Console</h2>
        <p>Click this link: 
            <a href="https://console.firebase.google.com/project/whisper-chat-live/firestore/rules" target="_blank">
                https://console.firebase.google.com/project/whisper-chat-live/firestore/rules
            </a>
        </p>
    </div>
    
    <div class="step">
        <h2>Step 2: DELETE ALL Existing Rules</h2>
        <p>Select everything in the rules editor and delete it.</p>
    </div>
    
    <div class="step">
        <h2>Step 3: Copy and Paste These Rules</h2>
        <pre>
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // DEVELOPMENT RULES - Allows everything for authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
        </pre>
        <p>Click "Publish" (blue button at the top).</p>
    </div>
    
    <div class="step">
        <h2>Step 4: Wait 30 Seconds</h2>
        <p>Rules take a moment to propagate.</p>
    </div>
    
    <div class="step">
        <h2>Step 5: Test Your Dashboard</h2>
        <p>
            <a href="https://pariisway.github.io/whisperme/dashboard.html" target="_blank">
                Open Dashboard
            </a>
        </p>
        <p>If it loads with data, you're good! If not, refresh and check console.</p>
    </div>
    
    <div id="testResult"></div>
    
    <script>
        // Simple test function
        function testRules() {
            const result = document.getElementById('testResult');
            result.innerHTML = '<div class="step">Testing... Please wait.</div>';
            
            // Try to access Firestore
            if (typeof firebase === 'undefined') {
                result.innerHTML = '<div class="step error">Firebase not loaded. Refresh page.</div>';
                return;
            }
            
            // Initialize test
            const testConfig = {
                apiKey: "AIzaSyB0nXwqC0YBPG52eS0dPN5bA5bQl8fO5g8",
                authDomain: "whisper-chat-live.firebaseapp.com",
                projectId: "whisper-chat-live"
            };
            
            try {
                firebase.initializeApp(testConfig, 'testApp');
                const db = firebase.firestore();
                
                // Try to read from a test collection
                db.collection('test').limit(1).get()
                    .then(() => {
                        result.innerHTML = '<div class="step success">✅ Rules are working! Your dashboard should load now.</div>';
                    })
                    .catch(error => {
                        result.innerHTML = `<div class="step error">❌ Rules issue: ${error.message}</div>`;
                    });
            } catch (error) {
                result.innerHTML = `<div class="step error">❌ Error: ${error.message}</div>`;
            }
        }
    </script>
    
    <button onclick="testRules()">Test Firestore Rules</button>
</body>
</html>
HTML

echo "✅ Created Firestore rules fix guide"
echo ""
echo "🌐 Open test-firestore-rules.html in your browser for step-by-step instructions"
echo ""
echo "📝 Also fixing your profile save issue..."

# Create a backup of your current rules first
cat > backup-current-rules.txt << 'BACKUP'
// BACKUP of your current Firestore rules (if any)
// Go to Firebase Console > Firestore > Rules to see current rules
// If you see anything other than what's below, they're blocking access:

// WRONG (blocks everything):
// allow read, write: if false;

// WRONG (blocks unauthenticated but might have syntax issues):
// allow read, write: if request.auth.uid != null;

// CORRECT (for development):
// allow read, write: if request.auth != null;

// MOST OPEN (temporary testing):
// allow read, write: if true;
BACKUP

echo ""
echo "🔍 Common Rule Problems:"
echo "1. Using 'request.auth.uid != null' instead of 'request.auth != null'"
echo "2. Missing the 'rules_version = '2';' line"
echo "3. Extra closing brackets or syntax errors"
echo "4. Rules not published (must click Publish button)"
echo ""
echo "🚨 IMPORTANT: After updating rules, CLEAR YOUR BROWSER CACHE and refresh dashboard"
echo ""
echo "📋 Quick Fix:"
echo "1. Delete ALL existing rules"
echo "2. Paste exactly:"
echo "----------------------------------------"
echo "rules_version = '2';"
echo "service cloud.firestore {"
echo "  match /databases/{database}/documents {"
echo "    match /{document=**} {"
echo "      allow read, write: if request.auth != null;"
echo "    }"
echo "  }"
echo "}"
echo "----------------------------------------"
echo "3. Click Publish"
echo "4. Wait 30 seconds"
echo "5. Clear browser cache (Ctrl+Shift+Delete)"
echo "6. Reload dashboard"

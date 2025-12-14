#!/bin/bash

echo "Updating Whisper+me files..."

# Update CSS
echo "Updating CSS..."
cp css/style.css css/style.css.backup
cat > css/style.css << 'CSS_EOF'
[PASTE THE ENTIRE CSS CONTENT FROM ABOVE HERE]
CSS_EOF

# Update JavaScript files
echo "Updating JavaScript files..."

# Update firebase-config.js
cat > js/firebase-config.js << 'FIREBASE_EOF'
[PASTE THE CORRECTED FIREBASE CONFIG FROM ABOVE HERE]
FIREBASE_EOF

# Update main.js
cat > js/main.js << 'MAIN_EOF'
[PASTE THE MAIN.JS CONTENT FROM ABOVE HERE]
MAIN_EOF

# Update auth.js
cat > js/auth.js << 'AUTH_EOF'
[PASTE THE AUTH.JS CONTENT FROM ABOVE HERE]
AUTH_EOF

# Update dashboard.js
cat > js/dashboard.js << 'DASHBOARD_EOF'
[PASTE THE DASHBOARD.JS CONTENT FROM ABOVE HERE]
DASHBOARD_EOF

# Update agora.js
cat > js/agora.js << 'AGORA_EOF'
[PASTE THE AGORA.JS CONTENT FROM ABOVE HERE]
AGORA_EOF

# Update profile.js
cat > js/profile.js << 'PROFILE_EOF'
[PASTE THE PROFILE.JS CONTENT FROM ABOVE HERE]
PROFILE_EOF

# Update payment.js
cat > js/payment.js << 'PAYMENT_EOF'
[PASTE THE PAYMENT.JS CONTENT FROM ABOVE HERE]
PAYMENT_EOF

# Update index.html
echo "Updating index.html..."
cp index.html index.html.backup
cat > index.html << 'INDEX_EOF'
[PASTE THE UPDATED INDEX.HTML FROM ABOVE HERE]
INDEX_EOF

echo "Update complete! All files have been updated."
echo "Backups created: css/style.css.backup, index.html.backup"

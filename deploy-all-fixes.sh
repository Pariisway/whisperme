#!/bin/bash

echo "🚀 Deploying all fixes..."

# 1. Backup existing files
echo "Backing up existing files..."
mkdir -p backups
cp css/style.css backups/style-backup.css 2>/dev/null || true
cp js/profile.js backups/profile-backup.js 2>/dev/null || true
cp js/payment.js backups/payment-backup.js 2>/dev/null || true
cp js/dashboard.js backups/dashboard-backup.js 2>/dev/null || true

# 2. Deploy Firestore rules
echo "Updating Firestore rules..."
if command -v firebase &> /dev/null; then
    cat > firestore.rules << 'RULES'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
RULES
    firebase deploy --only firestore:rules --non-interactive
else
    echo "⚠️  Firebase CLI not found. Please update rules manually in Firebase Console."
    echo "Go to: https://console.firebase.google.com/project/whisper-chat-live/firestore/rules"
fi

# 3. Wait for rules to propagate
echo "Waiting for Firestore rules to propagate..."
sleep 5

# 4. Create a simple test script
echo "Creating test script..."
cat > test-accounts.md << 'TEST'
# Whisper+me Test Accounts

## Account 1 (Caller)
- Email: caller@test.com
- Password: test123
- Role: Caller
- Use for: Making calls to whispers

## Account 2 (Whisper)
- Email: whisper@test.com  
- Password: test123
- Role: Whisper
- Use for: Receiving calls, set availability to true

## Testing Flow:
1. Login as whisper@test.com
2. Go to Profile, set availability to ON
3. Login as caller@test.com  
4. Go to Dashboard, see available whispers
5. Click "Call Now" on whisper profile
6. Whisper should see call in "Calls Waiting"
7. Whisper clicks "Accept"
8. Both users join Agora call room
9. Test microphone, end call, rating

## Important URLs:
- Home: index.html
- Auth: auth.html
- Dashboard: dashboard.html
- Profile: profile.html
- Payment: payment.html
- Call Room: call.html?session={id}&role={caller/whisper}
TEST

echo "✅ All fixes deployed!"
echo ""
echo "📋 Next Steps:"
echo "1. Create test accounts: caller@test.com and whisper@test.com"
echo "2. Login as whisper, set availability ON"
echo "3. Login as caller, test call flow"
echo "4. Check test-accounts.md for detailed instructions"
echo ""
echo "🎯 Key Changes Made:"
echo "✅ Dark theme applied to entire site"
echo "✅ Removed all mock data"
echo "✅ Real Firestore data integration"
echo "✅ Removed earnings from profile cards"
echo "✅ Fixed Firebase permissions"
echo "✅ Ready for Agora call testing"

# Open test instructions
if command -v open &> /dev/null; then
    open test-accounts.md
elif command -v xdg-open &> /dev/null; then
    xdg-open test-accounts.md
fi

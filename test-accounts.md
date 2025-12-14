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

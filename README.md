# Whisper+me 🎤

A platform for 5-minute private voice chats using tokens.

## Live Demo
- GitHub Pages: https://Pariisway.github.io/whisperme
- Repository: https://github.com/Pariisway/whisperme

## Features
- User authentication system
- Token-based payment system
- 5-minute private voice calls
- User dashboard with statistics
- Profile management
- Responsive mobile design

## Pages
- `index.html` - Home page
- `auth.html` - Login/Signup
- `dashboard.html` - User dashboard
- `payment.html` - Token purchases
- `profile.html` - Profile settings
- `call.html` - Voice call interface

## Setup
1. Open `index.html` in any web browser
2. No installation or build required

## Technologies
- HTML, CSS, JavaScript
- Firebase (for authentication)
- Responsive design

## License
MIT License

## 🔒 Safe Development Practices

### Before Pushing to GitHub:
1. Always check that `js/firebase-config.js` contains placeholder values, not real API keys
2. Run `./safe-push.sh` instead of direct git commands
3. Keep backup files locally (add them to .gitignore)

### File Structure:
- `js/firebase-config-REAL.js` - Your real Firebase config (in .gitignore)
- `js/firebase-config.js` - Placeholder config for GitHub
- `safe-push.sh` - Safe push script (in .gitignore)

### Backup Strategy:
- Backup files should end with `.backup` or be in `backups/` directory
- All backups are ignored by git via .gitignore

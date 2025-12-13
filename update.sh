#!/bin/bash
echo "🚀 Updating GitHub repository..."
cd ~/whisperme
git add .
git commit -m "Update: $(date '+%Y-%m-%d %H:%M:%S')" 2>/dev/null || true
git push origin main
echo "✅ Done! Repository updated."
echo "🌐 View at: https://github.com/Pariisway/whisperme"

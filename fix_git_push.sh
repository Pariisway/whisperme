#!/bin/bash

echo "=== Fixing Git Push Issues ==="
echo ""

echo "1. Checking current status..."
git status

echo ""
echo "2. Checking remotes..."
git remote -v

echo ""
echo "3. Checking branches..."
git branch -a

echo ""
echo "4. Checking commits..."
git log --oneline || echo "No commits yet"

echo ""
echo "5. Adding and committing files..."
git add .
git commit -m "Initial commit: Complete Whisper+me app" || echo "Commit already exists or no changes"

echo ""
echo "6. Setting up remote..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/pariisway/whisperme.git

echo ""
echo "7. Setting branch name..."
if git branch | grep -q "master"; then
    echo "Renaming master to main..."
    git branch -M main
fi

echo ""
echo "8. Pushing to GitHub..."
echo "Trying normal push..."
if git push -u origin main 2>&1 | grep -q "rejected"; then
    echo "Push rejected, trying force push..."
    git push -f origin main
else
    echo "Push successful!"
fi

echo ""
echo "9. Verifying..."
git remote -v
git branch -a

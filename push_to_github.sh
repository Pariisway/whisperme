#!/bin/bash

echo "=== Pushing Whisper+me to GitHub ==="
echo ""

# Check if we have commits
if ! git log --oneline > /dev/null 2>&1; then
    echo "No commits found. Creating initial commit..."
    git add .
    git commit -m "Initial commit: Complete Whisper+me application"
fi

echo "Current commits:"
git log --oneline

echo ""
echo "Checking if remote is set..."
if git remote | grep -q "origin"; then
    echo "Remote 'origin' already exists."
    echo "Pushing to GitHub..."
    git push -u origin main
else
    echo "No GitHub repository connected yet."
    echo ""
    echo "To connect to GitHub:"
    echo "1. Create a repository at https://github.com/new"
    echo "2. Name it: whisperme"
    echo "3. DO NOT initialize with README, .gitignore, or license"
    echo "4. Copy the commands from GitHub"
    echo "5. Run them here"
    echo ""
    echo "The commands will be:"
    echo "  git remote add origin https://github.com/YOUR_USERNAME/whisperme.git"
    echo "  git branch -M main"
    echo "  git push -u origin main"
fi

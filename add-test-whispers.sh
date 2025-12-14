#!/bin/bash

echo "📝 ADDING TEST DATA TO YOUR WHISPER COLLECTION"
echo "=============================================="
echo ""
echo "STEP 1: Go to Firestore Database"
echo "   Open: https://console.firebase.google.com/project/whisper-chat-live/firestore"
echo ""
echo "STEP 2: Click on your collection ('whispers' or 'Whisper')"
echo ""
echo "STEP 3: Click 'Add document'"
echo ""
echo "STEP 4: Add these fields for each whisper:"
echo ""
echo "Whisper 1:"
echo "┌─────────────────┬─────────────────────────────────────────┐"
echo "│ Field           │ Value                                    │"
echo "├─────────────────┼─────────────────────────────────────────┤"
echo "│ displayName     │ Alex Johnson                             │"
echo "│ title           │ Creative Writer                          │"
echo "│ description     │ Love discussing stories and creative ideas │"
echo "│ interests       │ ["Writing", "Books", "Art"]              │"
echo "│ available       │ true                                     │"
echo "│ rating          │ 4.9                                      │"
echo "│ calls           │ 156                                      │
echo "└─────────────────┴─────────────────────────────────────────┘"
echo ""
echo "Whisper 2:"
echo "┌─────────────────┬─────────────────────────────────────────┐"
echo "│ Field           │ Value                                    │
echo "├─────────────────┼─────────────────────────────────────────┤"
echo "│ displayName     │ Sam Wilson                               │
echo "│ title           │ Life Coach                               │
echo "│ description     │ Let's talk about personal growth         │
echo "│ interests       │ ["Coaching", "Wellness", "Meditation"]   │
echo "│ available       │ true                                     │
echo "│ rating          │ 4.8                                      │
echo "│ calls           │ 203                                      │
echo "└─────────────────┴─────────────────────────────────────────┘"
echo ""
echo "STEP 5: Add at least 4-6 whispers"
echo ""
echo "✅ After adding data, refresh your homepage"
echo "   The whispers should appear automatically!"

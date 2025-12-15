// Profile.js - Updated to sync with dashboard and profile card
console.log('Profile.js loaded - Fixed version');

let user, db;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
    
    // Wait for Firebase
    const waitForFirebase = setInterval(() => {
        if (window.firebase && firebase.apps.length > 0) {
            clearInterval(waitForFirebase);
            initProfile();
        }
    }, 100);
});

async function initProfile() {
    const auth = firebase.auth();
    db = firebase.firestore();
    
    auth.onAuthStateChanged(async (currentUser) => {
        if (!currentUser) {
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        user = currentUser;
        console.log('User:', user.email);
        
        // Load user data
        await loadUserData();
        
        // Setup form submission
        setupFormSubmission();
    });
}

async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        
        // Load profile data
        const profileDoc = await db.collection('profiles').doc(user.uid).get();
        const profileData = profileDoc.data() || {};
        
        // Populate form
        document.getElementById('displayName').value = profileData.displayName || '';
        document.getElementById('username').value = profileData.username || '';
        document.getElementById('bio').value = profileData.bio || '';
        document.getElementById('callPrice').value = profileData.callPrice || 1;
        document.getElementById('photoURL').value = profileData.photoURL || '';
        
        // Load social links
        if (profileData.social) {
            document.getElementById('twitter').value = profileData.social.twitter || '';
            document.getElementById('instagram').value = profileData.social.instagram || '';
            document.getElementById('website').value = profileData.social.website || '';
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function setupFormSubmission() {
    const form = document.getElementById('profileForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const saveButton = document.getElementById('saveProfile');
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        try {
            const displayName = document.getElementById('displayName').value.trim();
            const username = document.getElementById('username').value.trim();
            const bio = document.getElementById('bio').value.trim();
            let callPrice = parseInt(document.getElementById('callPrice').value);
            const photoURL = document.getElementById('photoURL').value.trim();
            
            const social = {
                twitter: document.getElementById('twitter').value.trim(),
                instagram: document.getElementById('instagram').value.trim(),
                website: document.getElementById('website').value.trim()
            };
            
            // Validate call price (1-5 whisper coins)
            if (callPrice < 1) callPrice = 1;
            if (callPrice > 5) callPrice = 5;
            
            // Update profile
            const profileData = {
                userId: user.uid,
                displayName,
                username,
                bio,
                callPrice,
                photoURL,
                social,
                updatedAt: new Date()
            };
            
            await db.collection('profiles').doc(user.uid).set(profileData, { merge: true });
            
            // Also update user document
            await db.collection('users').doc(user.uid).set({
                displayName,
                updatedAt: new Date()
            }, { merge: true });
            
            showNotification('✅ Profile updated successfully! Your changes will appear on your dashboard and profile card.');
            
            // Redirect back to dashboard after a short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('❌ Error updating profile: ' + error.message, 'error');
            saveButton.disabled = false;
            saveButton.innerHTML = '<i class="fas fa-save"></i> Save Profile';
        }
    });
}

function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

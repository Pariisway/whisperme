// Profile.js - Fixed with social links and proper saving
console.log('Profile.js loaded');

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
        console.log('Loading profile for user:', user.email);
        
        // Load user data
        await loadUserData();
        
        // Setup form submission
        setupFormSubmission();
        
        // Setup call price slider
        setupCallPriceSlider();
        
        // Setup profile link
        setupProfileLink();
    });
}

async function loadUserData() {
    try {
        // Load profile data
        const profileDoc = await db.collection('profiles').doc(user.uid).get();
        
        if (profileDoc.exists) {
            const profile = profileDoc.data();
            
            // Populate form
            document.getElementById('displayName').value = profile.displayName || '';
            document.getElementById('username').value = profile.username || '';
            document.getElementById('bio').value = profile.bio || '';
            document.getElementById('callPrice').value = profile.callPrice || 1;
            document.getElementById('callPriceRange').value = profile.callPrice || 1;
            document.getElementById('photoURL').value = profile.photoURL || '';
            
            // Update profile image if exists
            if (profile.photoURL) {
                document.getElementById('profileImage').src = profile.photoURL;
            }
            
            // Load social links
            if (profile.social) {
                document.getElementById('twitter').value = profile.social.twitter || '';
                document.getElementById('instagram').value = profile.social.instagram || '';
                document.getElementById('linkedin').value = profile.social.linkedin || '';
                document.getElementById('website').value = profile.social.website || '';
            }
            
            console.log('✅ Profile data loaded');
        } else {
            console.log('No profile found, using defaults');
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Error loading profile data', 'error');
    }
}

function setupCallPriceSlider() {
    const slider = document.getElementById('callPriceRange');
    const input = document.getElementById('callPrice');
    
    slider.addEventListener('input', function() {
        input.value = this.value;
    });
    
    input.addEventListener('input', function() {
        let value = parseInt(this.value);
        if (value < 1) value = 1;
        if (value > 5) value = 5;
        this.value = value;
        slider.value = value;
    });
}

function setupProfileLink() {
    const baseUrl = window.location.origin + window.location.pathname.replace('profile.html', '');
    const profileUrl = `${baseUrl}profile-view.html?user=${user.uid}`;
    
    document.getElementById('profileLink').value = profileUrl;
    
    // Copy link button
    document.getElementById('copyLinkBtn').addEventListener('click', function() {
        navigator.clipboard.writeText(profileUrl).then(() => {
            this.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-copy"></i> Copy';
            }, 2000);
        });
    });
    
    // Share link button
    document.getElementById('shareLinkBtn').addEventListener('click', function() {
        if (navigator.share) {
            navigator.share({
                title: 'My Whisper+Me Profile',
                text: 'Connect with me on Whisper+Me!',
                url: profileUrl
            });
        } else {
            // Fallback to copying
            navigator.clipboard.writeText(profileUrl);
            this.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-share"></i> Share';
            }, 2000);
        }
    });
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
            const username = document.getElementById('username').value.trim().toLowerCase();
            const bio = document.getElementById('bio').value.trim();
            let callPrice = parseInt(document.getElementById('callPrice').value);
            const photoURL = document.getElementById('photoURL').value.trim();
            
            // Social links
            const social = {
                twitter: document.getElementById('twitter').value.trim(),
                instagram: document.getElementById('instagram').value.trim(),
                linkedin: document.getElementById('linkedin').value.trim(),
                website: document.getElementById('website').value.trim()
            };
            
            // Validate
            if (!displayName || !username) {
                throw new Error('Display name and username are required');
            }
            
            // Validate call price (1-5)
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
            
            // Also update user document
            const userData = {
                displayName,
                photoURL,
                updatedAt: new Date()
            };
            
            // Save to Firestore
            await db.collection('profiles').doc(user.uid).set(profileData, { merge: true });
            await db.collection('users').doc(user.uid).set(userData, { merge: true });
            
            // Update profile image if URL changed
            if (photoURL) {
                document.getElementById('profileImage').src = photoURL;
            }
            
            showNotification('✅ Profile updated successfully! Changes will appear shortly.');
            
            // Redirect back to dashboard after a short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('❌ Error: ' + error.message, 'error');
            saveButton.disabled = false;
            saveButton.innerHTML = '<i class="fas fa-save"></i> Save Profile';
        }
    });
    
    // Handle photo URL changes
    document.getElementById('photoURL').addEventListener('input', function() {
        const url = this.value.trim();
        if (url) {
            document.getElementById('profileImage').src = url;
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

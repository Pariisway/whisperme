// Profile.js - Fixed working version
console.log('Profile.js loaded - Working version');

let user, db;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
    
    // Check if user is logged in
    if (!window.firebase || !firebase.apps.length) {
        setTimeout(() => {
            initProfile();
        }, 1000);
        return;
    }
    
    initProfile();
});

async function initProfile() {
    try {
        // Wait for Firebase to be ready
        const auth = firebase.auth();
        db = firebase.firestore();
        
        auth.onAuthStateChanged(async (currentUser) => {
            if (!currentUser) {
                window.location.href = 'auth.html?type=login';
                return;
            }
            
            user = currentUser;
            console.log('Loading profile for user:', user.email);
            
            // Set email field (readonly)
            document.getElementById('email').value = user.email;
            
            // Load user data
            await loadUserData();
            
            // Setup form submission
            setupFormSubmission();
            
            // Setup photo URL live preview
            setupPhotoPreview();
        });
    } catch (error) {
        console.error('Error initializing profile:', error);
        setTimeout(initProfile, 1000);
    }
}

async function loadUserData() {
    try {
        // Load profile data
        const profileDoc = await db.collection('profiles').doc(user.uid).get();
        
        if (profileDoc.exists) {
            const profile = profileDoc.data();
            
            // Populate form
            document.getElementById('displayName').value = profile.displayName || '';
            document.getElementById('bio').value = profile.bio || '';
            document.getElementById('callPrice').value = profile.callPrice || 1;
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
            
            // Load banking info
            if (profile.banking) {
                document.getElementById('bankName').value = profile.banking.bankName || '';
                document.getElementById('accountName').value = profile.banking.accountName || '';
                document.getElementById('accountNumber').value = profile.banking.accountNumber || '';
                document.getElementById('routingNumber').value = profile.banking.routingNumber || '';
            }
            
            console.log('✅ Profile data loaded');
        } else {
            console.log('No profile found, using defaults');
            // Set default display name from email
            const defaultName = user.email.split('@')[0];
            document.getElementById('displayName').value = defaultName;
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Error loading profile data', 'error');
    }
}

function setupPhotoPreview() {
    document.getElementById('photoURL').addEventListener('input', function() {
        const url = this.value.trim();
        if (url) {
            document.getElementById('profileImage').src = url;
        }
    });
}

function setupFormSubmission() {
    const form = document.getElementById('profileForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const saveButton = document.getElementById('saveProfile');
        const originalText = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        try {
            const displayName = document.getElementById('displayName').value.trim();
            const bio = document.getElementById('bio').value.trim();
            let callPrice = parseInt(document.getElementById('callPrice').value);
            const photoURL = document.getElementById('photoURL').value.trim();
            
            // Validate required fields
            if (!displayName) {
                throw new Error('Display name is required');
            }
            
            if (!photoURL) {
                throw new Error('Profile image URL is required');
            }
            
            // Validate URL
            if (!isValidUrl(photoURL)) {
                throw new Error('Please enter a valid image URL');
            }
            
            // Validate call price (1-5)
            if (callPrice < 1) callPrice = 1;
            if (callPrice > 5) callPrice = 5;
            
            // Social links
            const social = {
                twitter: document.getElementById('twitter').value.trim(),
                instagram: document.getElementById('instagram').value.trim(),
                linkedin: document.getElementById('linkedin').value.trim(),
                website: document.getElementById('website').value.trim()
            };
            
            // Banking info
            const banking = {
                bankName: document.getElementById('bankName').value.trim(),
                accountName: document.getElementById('accountName').value.trim(),
                accountNumber: document.getElementById('accountNumber').value.trim(),
                routingNumber: document.getElementById('routingNumber').value.trim()
            };
            
            // Password change
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            
            // Update profile data
            const profileData = {
                userId: user.uid,
                email: user.email,
                displayName,
                bio,
                callPrice,
                photoURL,
                social,
                banking,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Also update user document
            const userData = {
                displayName,
                photoURL,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            console.log('Saving profile data:', profileData);
            
            // Save to Firestore
            await db.collection('profiles').doc(user.uid).set(profileData, { merge: true });
            await db.collection('users').doc(user.uid).set(userData, { merge: true });
            
            // Update auth user display name
            await user.updateProfile({
                displayName: displayName,
                photoURL: photoURL
            });
            
            // Update profile image if URL changed
            if (photoURL) {
                document.getElementById('profileImage').src = photoURL;
            }
            
            // Update password if provided
            if (currentPassword && newPassword) {
                if (newPassword.length < 6) {
                    throw new Error('New password must be at least 6 characters');
                }
                
                // Re-authenticate before changing password
                const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
                await user.reauthenticateWithCredential(credential);
                await user.updatePassword(newPassword);
                
                // Clear password fields
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                
                showNotification('✅ Password updated successfully!');
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
            saveButton.innerHTML = originalText;
        }
    });
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
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

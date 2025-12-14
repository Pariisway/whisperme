// Profile JavaScript - Final Fix with Error Handling
console.log("Profile.js loaded - Final Fix");

let currentUser = null;
let userProfile = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Profile page loaded");
    
    // Check Firebase initialization
    if (typeof firebaseReady === 'undefined' || !firebaseReady) {
        console.log("Waiting for Firebase...");
        setTimeout(() => {
            initializeProfile();
        }, 2000);
        return;
    }
    
    initializeProfile();
});

async function initializeProfile() {
    console.log("Initializing profile...");
    
    // Check auth
    auth.onAuthStateChanged(async function(user) {
        if (!user) {
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        currentUser = user;
        console.log("User authenticated:", user.email);
        
        try {
            await loadProfileData(user.uid);
            setupProfileListeners();
        } catch (error) {
            console.error("Error initializing profile:", error);
            showAlert('Error loading profile. Please check Firestore permissions.', 'error');
        }
    });
}

async function loadProfileData(userId) {
    showLoading(true);
    
    try {
        // Try to load profile
        const profileDoc = await db.collection('profiles').doc(userId).get();
        
        if (profileDoc.exists) {
            userProfile = profileDoc.data();
            console.log("Profile loaded:", userProfile);
            populateProfileForm();
        } else {
            // Create default profile
            userProfile = {
                userId: userId,
                email: currentUser.email,
                displayName: currentUser.email.split('@')[0],
                username: currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
                bio: '',
                available: true,
                interests: [],
                profilePicture: '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // Try to save default profile
            try {
                await db.collection('profiles').doc(userId).set(userProfile);
                console.log("Created default profile");
            } catch (saveError) {
                console.warn("Could not save default profile (permissions issue):", saveError);
                // Continue with local profile
            }
            
            populateProfileForm();
        }
        
        // Try to load stats
        try {
            const statsDoc = await db.collection('userStats').doc(userId).get();
            if (statsDoc.exists) {
                updateStatsDisplay(statsDoc.data());
            }
        } catch (statsError) {
            console.warn("Could not load stats:", statsError);
        }
        
    } catch (error) {
        console.error("Error loading profile data:", error);
        
        // Check error type
        if (error.code === 'permission-denied') {
            showAlert('Firestore permissions denied. Please update security rules.', 'error');
        } else {
            showAlert('Error loading profile: ' + error.message, 'error');
        }
        
    } finally {
        showLoading(false);
    }
}

function populateProfileForm() {
    if (!userProfile) return;
    
    document.getElementById('displayName').value = userProfile.displayName || '';
    document.getElementById('username').value = userProfile.username || '';
    document.getElementById('bio').value = userProfile.bio || '';
    document.getElementById('interests').value = (userProfile.interests || []).join(', ');
    
    const availabilityToggle = document.getElementById('availabilityToggle');
    if (availabilityToggle) {
        availabilityToggle.checked = userProfile.available !== false;
    }
    
    // Update avatar if exists
    if (userProfile.profilePicture) {
        document.getElementById('profilePicture').src = userProfile.profilePicture;
    }
}

function updateStatsDisplay(stats) {
    const container = document.getElementById('profileStats');
    if (!container) return;
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">${stats.calls || 0}</div>
                <div class="stat-label">Total Calls</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${(stats.rating || 0).toFixed(1)}</div>
                <div class="stat-label">Avg Rating</div>
            </div>
        </div>
    `;
}

function setupProfileListeners() {
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveProfile();
        });
    }
    
    // Availability toggle
    const availabilityToggle = document.getElementById('availabilityToggle');
    if (availabilityToggle) {
        availabilityToggle.addEventListener('change', async function() {
            await updateAvailability(this.checked);
        });
    }
    
    // Profile picture upload
    const pictureInput = document.getElementById('profilePictureInput');
    if (pictureInput) {
        pictureInput.addEventListener('change', handlePictureUpload);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            if (confirm('Are you sure you want to logout?')) {
                await auth.signOut();
                window.location.href = 'index.html';
            }
        });
    }
}

async function saveProfile() {
    if (!currentUser || !userProfile) {
        showAlert('Please wait for profile to load', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Get form values
        const displayName = document.getElementById('displayName').value.trim();
        const username = document.getElementById('username').value.trim().toLowerCase();
        const bio = document.getElementById('bio').value.trim();
        const interests = document.getElementById('interests').value
            .split(',')
            .map(i => i.trim())
            .filter(i => i);
        
        // Validation
        if (!displayName) {
            showAlert('Display name is required', 'error');
            showLoading(false);
            return;
        }
        
        if (!username || username.length < 3) {
            showAlert('Username must be at least 3 characters', 'error');
            showLoading(false);
            return;
        }
        
        // Update profile
        const updatedProfile = {
            ...userProfile,
            displayName,
            username,
            bio,
            interests,
            updatedAt: new Date()
        };
        
        // Save to Firestore
        await db.collection('profiles').doc(currentUser.uid).set(updatedProfile, { merge: true });
        
        // Update local copy
        userProfile = updatedProfile;
        
        showAlert('✅ Profile saved successfully!', 'success');
        
    } catch (error) {
        console.error("Error saving profile:", error);
        
        if (error.code === 'permission-denied') {
            showAlert('❌ Permission denied. Cannot save profile. Please update Firestore rules.', 'error');
        } else {
            showAlert('❌ Error saving profile: ' + error.message, 'error');
        }
        
    } finally {
        showLoading(false);
    }
}

async function updateAvailability(isAvailable) {
    try {
        if (!userProfile) return;
        
        await db.collection('profiles').doc(currentUser.uid).update({
            available: isAvailable,
            updatedAt: new Date()
        });
        
        userProfile.available = isAvailable;
        
        showAlert(`You are now ${isAvailable ? 'available' : 'unavailable'} for calls`, 'success');
        
    } catch (error) {
        console.error("Error updating availability:", error);
        
        if (error.code === 'permission-denied') {
            showAlert('Cannot update availability. Firestore permissions issue.', 'error');
        } else {
            showAlert('Error updating availability', 'error');
        }
    }
}

function handlePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.match('image.*')) {
        showAlert('Please select an image file', 'error');
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        showAlert('Image must be less than 2MB', 'error');
        return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const profilePic = document.getElementById('profilePicture');
        if (profilePic) {
            profilePic.src = e.target.result;
        }
        showAlert('Profile picture updated (preview only)', 'info');
    };
    reader.readAsDataURL(file);
}

function showLoading(isLoading) {
    const form = document.getElementById('profileForm');
    const button = form ? form.querySelector('button[type="submit"]') : null;
    
    if (button) {
        if (isLoading) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            button.disabled = true;
        } else {
            button.innerHTML = '<i class="fas fa-save"></i> Save Profile';
            button.disabled = false;
        }
    }
}

function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existing = document.querySelector('.alert.fixed');
    if (existing) existing.remove();
    
    // Create alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} fixed`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // Style
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '10000';
    alert.style.minWidth = '300px';
    alert.style.maxWidth = '400px';
    alert.style.animation = 'slideIn 0.3s ease';
    
    document.body.appendChild(alert);
    
    // Auto remove
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Make functions available globally
window.handlePictureUpload = handlePictureUpload;
window.saveProfile = saveProfile;

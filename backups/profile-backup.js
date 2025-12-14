// Profile JavaScript for Whisper+me - Real Data Only
console.log("Profile.js loaded - Real Data Version");

let currentUser = null;
let userProfile = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Profile page loaded");
    
    // Check auth state
    auth.onAuthStateChanged(async function(user) {
        if (!user) {
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        currentUser = user;
        console.log("User logged in:", user.email);
        
        try {
            await loadProfileData(user.uid);
            setupProfileListeners();
        } catch (error) {
            console.error("Error loading profile:", error);
            showAlert('Error loading profile data', 'error');
        }
    });
});

// Load profile data
async function loadProfileData(userId) {
    try {
        showLoading(true);
        
        // Load profile from Firestore
        const profileDoc = await db.collection('profiles').doc(userId).get();
        
        if (!profileDoc.exists) {
            // Create default profile
            const defaultProfile = {
                userId: userId,
                email: currentUser.email,
                displayName: currentUser.email.split('@')[0],
                username: currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
                bio: '',
                available: true,
                interests: [],
                profilePicture: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('profiles').doc(userId).set(defaultProfile);
            userProfile = defaultProfile;
        } else {
            userProfile = profileDoc.data();
        }
        
        // Load user stats
        const statsDoc = await db.collection('userStats').doc(userId).get();
        if (statsDoc.exists) {
            updateStatsDisplay(statsDoc.data());
        } else {
            updateStatsDisplay({ calls: 0, rating: 0 });
        }
        
        // Populate form
        populateProfileForm();
        
        // Load profile picture
        if (userProfile.profilePicture) {
            document.getElementById('profilePicture').src = userProfile.profilePicture;
        }
        
        showLoading(false);
        
    } catch (error) {
        console.error("Error loading profile:", error);
        showAlert('Error loading profile data', 'error');
        showLoading(false);
    }
}

// Populate profile form
function populateProfileForm() {
    if (!userProfile) return;
    
    document.getElementById('displayName').value = userProfile.displayName || '';
    document.getElementById('username').value = userProfile.username || '';
    document.getElementById('bio').value = userProfile.bio || '';
    document.getElementById('interests').value = (userProfile.interests || []).join(', ');
    
    const availabilityToggle = document.getElementById('availabilityToggle');
    if (availabilityToggle) {
        availabilityToggle.checked = userProfile.available !== false;
        updateAvailabilityDisplay(userProfile.available !== false);
    }
}

// Update stats display
function updateStatsDisplay(stats) {
    const statsContainer = document.getElementById('profileStats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div class="profile-stats">
            <div class="stat-item">
                <div class="stat-value">${stats.calls || 0}</div>
                <div class="stat-label">Calls</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${(stats.rating || 0).toFixed(1)}</div>
                <div class="stat-label">Rating</div>
            </div>
        </div>
    `;
}

// Update availability display
function updateAvailabilityDisplay(isAvailable) {
    const availabilityStatus = document.getElementById('availabilityStatus');
    if (availabilityStatus) {
        availabilityStatus.textContent = isAvailable ? 'Available for Calls' : 'Not Available';
        availabilityStatus.style.color = isAvailable ? 'var(--accent-green)' : 'var(--accent-red)';
    }
}

// Setup profile listeners
function setupProfileListeners() {
    // Profile form submission
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
        availabilityToggle.addEventListener('change', function() {
            updateAvailability(this.checked);
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

// Save profile
async function saveProfile() {
    try {
        if (!currentUser || !userProfile) return;
        
        showLoading(true);
        
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
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('profiles').doc(currentUser.uid).set(updatedProfile, { merge: true });
        
        userProfile = updatedProfile;
        
        showAlert('Profile saved successfully!', 'success');
        showLoading(false);
        
    } catch (error) {
        console.error("Error saving profile:", error);
        showAlert('Error saving profile: ' + error.message, 'error');
        showLoading(false);
    }
}

// Update availability
async function updateAvailability(isAvailable) {
    try {
        if (!currentUser || !userProfile) return;
        
        await db.collection('profiles').doc(currentUser.uid).update({
            available: isAvailable,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        userProfile.available = isAvailable;
        updateAvailabilityDisplay(isAvailable);
        
        showAlert(`You are now ${isAvailable ? 'available' : 'unavailable'} for calls`, 'success');
        
    } catch (error) {
        console.error("Error updating availability:", error);
        showAlert('Error updating availability', 'error');
    }
}

// Handle picture upload (simplified - just updates locally for now)
function handlePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check if it's an image
    if (!file.type.match('image.*')) {
        showAlert('Please select an image file', 'error');
        return;
    }
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showAlert('Image must be less than 2MB', 'error');
        return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('profilePicture').src = e.target.result;
        showAlert('Profile picture updated (locally)', 'success');
    };
    reader.readAsDataURL(file);
}

// Show loading state
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

// Show alert
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert.fixed');
    if (existingAlert) existingAlert.remove();
    
    // Create alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} fixed`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // Style alert
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '10000';
    alert.style.minWidth = '300px';
    
    document.body.appendChild(alert);
    
    // Auto remove
    setTimeout(() => alert.remove(), 5000);
}

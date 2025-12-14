// Profile JavaScript for Whisper+me
console.log("Profile.js loaded");

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Profile page loaded");
    
    // First, wait for Firebase to be fully loaded
    if (typeof waitForFirebase !== 'undefined') {
        waitForFirebase(function(firebaseReady) {
            if (!firebaseReady) {
                console.error("Firebase not ready");
                showAlert('Firebase initialization failed. Please refresh the page.', 'error');
                return;
            }
            initializeProfile();
        });
    } else {
        // Fallback if checker isn't available
        setTimeout(initializeProfile, 2000);
    }
});

function initializeProfile() {
    console.log("Initializing profile...");
    
    // Check if Firebase is loaded
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
        console.error("Firebase services not loaded.");
        showAlert('Authentication services not available. Please refresh.', 'error');
        return;
    }
    
    // Check authentication
    auth.onAuthStateChanged(async function(user) {
        console.log("Auth state changed. User:", user ? user.email : "null");
        
        if (!user) {
            console.log("No user found, redirecting to login");
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        console.log("User logged in:", user.email);
        
        try {
            // Load profile data
            await loadProfileData(user.uid, user.email);
            
            // Setup event listeners
            setupProfileListeners(user.uid);
            
        } catch (error) {
            console.error("Error loading profile:", error);
            showAlert('Error loading profile data', 'error');
        }
    });
}

// Load profile data
async function loadProfileData(userId, userEmail) {
    try {
        // Load user profile
        const profileDoc = await db.collection('profiles').doc(userId).get();
        
        if (profileDoc.exists) {
            const profileData = profileDoc.data();
            populateProfileForm(profileData, userEmail);
        } else {
            // Create default profile if it doesn't exist
            const defaultProfile = {
                userId: userId,
                email: userEmail,
                displayName: userEmail.split('@')[0],
                username: userEmail.split('@')[0].toLowerCase(),
                bio: '',
                interests: [],
                available: true,
                profilePicture: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Show default values
            populateProfileForm(defaultProfile, userEmail);
            
            // Don't create automatically - let user save first
            console.log("Profile doesn't exist yet - will create on save");
        }
        
        // Load user stats
        const statsDoc = await db.collection('userStats').doc(userId).get();
        if (statsDoc.exists) {
            const stats = statsDoc.data();
            updateProfileStats(stats);
        }
        
    } catch (error) {
        console.error("Error loading profile:", error);
        showAlert('Error loading profile data. Please refresh.', 'error');
    }
}

// Populate profile form with data
function populateProfileForm(profileData, userEmail) {
    // Basic info
    document.getElementById('profileEmail').textContent = userEmail;
    document.getElementById('displayName').value = profileData.displayName || '';
    document.getElementById('username').value = profileData.username || '';
    document.getElementById('bio').value = profileData.bio || '';
    
    // Availability
    const availabilityToggle = document.getElementById('availabilityToggle');
    if (availabilityToggle) {
        availabilityToggle.checked = profileData.available !== false;
    }
    
    // Interests (simplified for now)
    if (profileData.interests && Array.isArray(profileData.interests)) {
        document.getElementById('interests').value = profileData.interests.join(', ');
    }
    
    // Profile picture preview
    const profilePicture = document.getElementById('profilePicture');
    if (profilePicture && profileData.profilePicture) {
        profilePicture.src = profileData.profilePicture;
    }
}

// Update profile stats display
function updateProfileStats(stats) {
    const statsElement = document.getElementById('profileStats');
    if (!statsElement) return;
    
    statsElement.innerHTML = `
        <div class="profile-stats-grid">
            <div class="stat-item">
                <div class="stat-value">${stats.calls || 0}</div>
                <div class="stat-label">Total Calls</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${(stats.rating || 0).toFixed(1)}</div>
                <div class="stat-label">Avg Rating</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">$${(stats.earnings || 0).toFixed(2)}</div>
                <div class="stat-label">Earnings</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.activeTime ? Math.floor(stats.activeTime / 60) : 0}h</div>
                <div class="stat-label">Active Time</div>
            </div>
        </div>
    `;
}

// Setup profile event listeners
function setupProfileListeners(userId) {
    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleProfileSubmit(userId);
        });
    }
    
    // Profile picture upload (simplified without storage)
    const profilePictureInput = document.getElementById('profilePictureInput');
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', function(e) {
            handleProfilePictureUpload(e, userId);
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                await auth.signOut();
                window.location.href = 'index.html';
            } catch (error) {
                console.error("Error signing out:", error);
                showAlert('Error signing out', 'error');
            }
        });
    }
    
    // Mobile menu
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('show');
        });
    }
}

// Handle profile form submission
async function handleProfileSubmit(userId) {
    try {
        showAlert('Saving profile...', 'info');
        
        // Get form values
        const displayName = document.getElementById('displayName').value.trim();
        const username = document.getElementById('username').value.trim().toLowerCase();
        const bio = document.getElementById('bio').value.trim();
        const interests = document.getElementById('interests').value.split(',').map(i => i.trim()).filter(i => i);
        const available = document.getElementById('availabilityToggle').checked;
        
        // Basic validation
        if (!displayName) {
            showAlert('Display name is required', 'error');
            return;
        }
        
        if (!username) {
            showAlert('Username is required', 'error');
            return;
        }
        
        // Check username uniqueness (simplified - in real app, check against other users)
        if (username.length < 3) {
            showAlert('Username must be at least 3 characters', 'error');
            return;
        }
        
        // Get current user
        const user = auth.currentUser;
        if (!user) {
            showAlert('You must be logged in to save profile', 'error');
            return;
        }
        
        // Prepare profile data
        const profileData = {
            userId: userId,
            email: user.email,
            displayName: displayName,
            username: username,
            bio: bio,
            interests: interests,
            available: available,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add createdAt if this is a new profile
        const profileDoc = await db.collection('profiles').doc(userId).get();
        if (!profileDoc.exists) {
            profileData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        
        // Save to Firestore
        await db.collection('profiles').doc(userId).set(profileData, { merge: true });
        
        showAlert('Profile saved successfully!', 'success');
        
        // Update welcome message if on dashboard
        if (typeof updateWelcomeMessage === 'function') {
            updateWelcomeMessage(user);
        }
        
    } catch (error) {
        console.error("Error updating profile:", error);
        showAlert('Error saving profile: ' + error.message, 'error');
    }
}

// Handle profile picture upload (simplified without Firebase Storage)
function handleProfilePictureUpload(event, userId) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file type
        if (!file.type.match('image.*')) {
            showAlert('Please select an image file', 'error');
            return;
        }
        
        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showAlert('Image must be less than 2MB', 'error');
            return;
        }
        
        showAlert('Uploading profile picture...', 'info');
        
        // Create a local URL for preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const profilePicture = document.getElementById('profilePicture');
            if (profilePicture) {
                profilePicture.src = e.target.result;
            }
            
            // For now, we'll just store the data URL (in production, upload to storage)
            // showAlert('Profile picture updated (locally)', 'success');
            
            // In a real app, you would upload to Firebase Storage here
            // and save the download URL to the profile document
        };
        
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error("Error handling file upload:", error);
        showAlert('Error uploading image: ' + error.message, 'error');
    }
}

// Utility function to show alerts
function showAlert(message, type = 'info') {
    // Remove existing alerts
    document.querySelectorAll('.alert.fixed').forEach(el => el.remove());
    
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} fixed`;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '10000';
    alert.style.minWidth = '300px';
    alert.style.maxWidth = '400px';
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Profile JavaScript - Fixed Version
console.log("Profile.js loaded - Fixed Version");

let currentUser = null;
let userProfile = null;
let db = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Profile page loaded");
    initializeProfile();
});

async function initializeProfile() {
    console.log("Initializing profile...");
    
    try {
        // Wait for Firebase to be ready
        if (typeof firebase === 'undefined') {
            console.error("Firebase not loaded");
            return;
        }
        
        // Initialize Firebase if not already initialized
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase initialized in profile.js");
        }
        
        // Get auth and db instances
        const auth = firebase.auth();
        db = firebase.firestore();
        
        // Enable persistence
        await db.enablePersistence();
        console.log("Firestore persistence enabled");
        
        // Check auth state
        auth.onAuthStateChanged(async function(user) {
            if (!user) {
                window.location.href = 'auth.html?type=login';
                return;
            }
            
            currentUser = user;
            console.log("User authenticated:", user.email);
            console.log("User UID:", user.uid);
            
            // Load profile data
            await loadProfileData(user.uid);
            setupEventListeners();
        });
        
    } catch (error) {
        console.error("Error initializing profile:", error);
    }
}

async function loadProfileData(userId) {
    console.log("Loading profile data for:", userId);
    
    try {
        // Get profile document
        const profileRef = db.collection('profiles').doc(userId);
        const profileDoc = await profileRef.get();
        
        if (profileDoc.exists) {
            userProfile = profileDoc.data();
            console.log("Profile loaded:", userProfile);
            populateProfileForm();
        } else {
            // Create default profile
            console.log("No profile found, creating default");
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
            
            // Save default profile
            await profileRef.set(userProfile);
            console.log("Default profile created");
            populateProfileForm();
        }
        
        // Load stats
        await loadProfileStats(userId);
        
    } catch (error) {
        console.error("Error loading profile:", error);
        showMessage('Error loading profile: ' + error.message, 'error');
    }
}

function populateProfileForm() {
    console.log("Populating form with profile:", userProfile);
    
    // Get all form elements
    const displayNameEl = document.getElementById('displayName');
    const usernameEl = document.getElementById('username');
    const bioEl = document.getElementById('bio');
    const interestsEl = document.getElementById('interests');
    const availabilityToggle = document.getElementById('availabilityToggle');
    
    // Check if elements exist before setting values
    if (displayNameEl) displayNameEl.value = userProfile.displayName || '';
    if (usernameEl) usernameEl.value = userProfile.username || '';
    if (bioEl) bioEl.value = userProfile.bio || '';
    if (interestsEl) interestsEl.value = (userProfile.interests || []).join(', ');
    if (availabilityToggle) {
        availabilityToggle.checked = userProfile.available !== false;
    }
    
    // Update profile picture if exists
    const profilePic = document.getElementById('profilePicture');
    if (profilePic && userProfile.profilePicture) {
        profilePic.src = userProfile.profilePicture;
    }
    
    console.log("Form populated successfully");
}

async function loadProfileStats(userId) {
    try {
        // Load call statistics
        const callsQuery = await db.collection('callSessions')
            .where('whisperId', '==', userId)
            .get();
        
        const stats = {
            totalCalls: callsQuery.size,
            completedCalls: 0,
            rating: 0
        };
        
        // Calculate stats
        callsQuery.forEach(doc => {
            const data = doc.data();
            if (data.status === 'completed') {
                stats.completedCalls++;
                if (data.rating) {
                    stats.rating += data.rating;
                }
            }
        });
        
        // Update stats display
        updateStatsDisplay(stats);
        
    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

function updateStatsDisplay(stats) {
    const statsContainer = document.getElementById('profileStats');
    if (!statsContainer) return;
    
    const avgRating = stats.completedCalls > 0 ? (stats.rating / stats.completedCalls).toFixed(1) : '0.0';
    
    statsContainer.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">${stats.totalCalls || 0}</div>
                <div class="stat-label">Total Calls</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.completedCalls || 0}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${avgRating}</div>
                <div class="stat-label">Avg Rating</div>
            </div>
        </div>
    `;
}

function setupEventListeners() {
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
                try {
                    await firebase.auth().signOut();
                    window.location.href = 'index.html';
                } catch (error) {
                    console.error("Logout error:", error);
                }
            }
        });
    }
}

async function saveProfile() {
    console.log("Saving profile...");
    
    try {
        // Get form values
        const displayName = document.getElementById('displayName').value.trim();
        const username = document.getElementById('username').value.trim().toLowerCase();
        const bio = document.getElementById('bio').value.trim();
        const interests = document.getElementById('interests').value
            .split(',')
            .map(i => i.trim())
            .filter(i => i.length > 0);
        
        // Validation
        if (!displayName) {
            showMessage('Display name is required', 'error');
            return;
        }
        
        if (!username || username.length < 3) {
            showMessage('Username must be at least 3 characters', 'error');
            return;
        }
        
        // Check username uniqueness (optional - can be removed if too complex)
        if (username !== userProfile.username) {
            const usernameCheck = await db.collection('profiles')
                .where('username', '==', username)
                .limit(1)
                .get();
            
            if (!usernameCheck.empty) {
                showMessage('Username already taken', 'error');
                return;
            }
        }
        
        // Update profile object
        const updatedProfile = {
            ...userProfile,
            displayName: displayName,
            username: username,
            bio: bio,
            interests: interests,
            updatedAt: new Date()
        };
        
        // Save to Firestore
        await db.collection('profiles').doc(currentUser.uid).set(updatedProfile, { merge: true });
        
        // Update local profile
        userProfile = updatedProfile;
        
        console.log("Profile saved successfully");
        showMessage('✅ Profile saved successfully!', 'success');
        
    } catch (error) {
        console.error("Error saving profile:", error);
        showMessage('❌ Error saving profile: ' + error.message, 'error');
    }
}

async function updateAvailability(isAvailable) {
    try {
        await db.collection('profiles').doc(currentUser.uid).update({
            available: isAvailable,
            updatedAt: new Date()
        });
        
        userProfile.available = isAvailable;
        showMessage(`You are now ${isAvailable ? 'available' : 'unavailable'} for calls`, 'success');
        
    } catch (error) {
        console.error("Error updating availability:", error);
        showMessage('Error updating availability', 'error');
    }
}

function handlePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.match('image.*')) {
        showMessage('Please select an image file', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showMessage('Image must be less than 5MB', 'error');
        return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const profilePic = document.getElementById('profilePicture');
        if (profilePic) {
            profilePic.src = e.target.result;
        }
        showMessage('Profile picture updated (preview)', 'info');
    };
    reader.readAsDataURL(file);
}

function showMessage(message, type = 'info') {
    // Remove existing messages
    const existing = document.querySelector('.alert-message');
    if (existing) existing.remove();
    
    // Create message element
    const alert = document.createElement('div');
    alert.className = `alert-message alert-${type}`;
    alert.innerHTML = `
        <div class="alert-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        padding: 12px 20px;
        border-radius: 8px;
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
        z-index: 10000;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => alert.remove(), 300);
        }
    }, 5000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .alert-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .alert-content i {
        font-size: 1.2em;
    }
`;
document.head.appendChild(style);

// Make functions available globally if needed
window.saveProfile = saveProfile;
window.handlePictureUpload = handlePictureUpload;

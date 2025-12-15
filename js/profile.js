// Profile JavaScript - Fixed Version (No persistence error)
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
                social: {
                    twitter: '',
                    instagram: '',
                    tiktok: ''
                },
                banking: {
                    paypalEmail: '',
                    bankAccount: ''
                },
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
    const elements = {
        'displayName': userProfile.displayName || '',
        'username': userProfile.username || '',
        'bio': userProfile.bio || '',
        'interests': (userProfile.interests || []).join(', '),
        'availabilityToggle': userProfile.available !== false,
        'twitter': userProfile.social?.twitter || '',
        'instagram': userProfile.social?.instagram || '',
        'tiktok': userProfile.social?.tiktok || '',
        'paypalEmail': userProfile.banking?.paypalEmail || '',
        'bankAccount': userProfile.banking?.bankAccount || ''
    };
    
    // Set values
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = elements[id];
            } else {
                element.value = elements[id];
            }
        }
    });
    
    // Update profile picture if exists
    const profilePic = document.getElementById('profilePicture');
    if (profilePic && userProfile.profilePicture) {
        profilePic.src = userProfile.profilePicture;
    } else if (profilePic) {
        // Use default avatar based on user ID
        const avatarIndex = Math.abs(hashCode(userProfile.userId)) % 70;
        profilePic.src = `https://i.pravatar.cc/150?img=${avatarIndex}`;
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
    
    // Profile picture upload (simplified - just preview)
    const pictureInput = document.getElementById('profilePictureInput');
    if (pictureInput) {
        pictureInput.addEventListener('change', handlePicturePreview);
    }
    
    // Save social media and banking
    const saveSocialBtn = document.getElementById('saveSocialBtn');
    if (saveSocialBtn) {
        saveSocialBtn.addEventListener('click', async function() {
            await saveSocialAndBanking();
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

async function saveSocialAndBanking() {
    try {
        const socialData = {
            twitter: document.getElementById('twitter').value.trim(),
            instagram: document.getElementById('instagram').value.trim(),
            tiktok: document.getElementById('tiktok').value.trim()
        };
        
        const bankingData = {
            paypalEmail: document.getElementById('paypalEmail').value.trim(),
            bankAccount: document.getElementById('bankAccount').value.trim()
        };
        
        await db.collection('profiles').doc(currentUser.uid).update({
            social: socialData,
            banking: bankingData,
            updatedAt: new Date()
        });
        
        showMessage('✅ Social media & banking info saved!', 'success');
        
    } catch (error) {
        console.error("Error saving social/banking:", error);
        showMessage('❌ Error saving: ' + error.message, 'error');
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

function handlePicturePreview(event) {
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
            showMessage('Profile picture preview updated', 'info');
            
            // In a real app, you would upload to Firebase Storage here
            // For now, we'll store as data URL (not recommended for production)
            userProfile.profilePicture = e.target.result;
        }
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
            alert.remove();
        }
    }, 5000);
}

// Helper function for consistent avatars
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

// Make functions available globally
window.saveProfile = saveProfile;
window.saveSocialAndBanking = saveSocialAndBanking;
window.handlePicturePreview = handlePicturePreview;

// Profile management for Whisper+me
console.log("Profile.js loaded");

// DOM Elements
let profileForm;
let profilePictureInput;
let profilePreview;
let bioTextarea;
let bioCounter;
let availabilityToggle;
let availabilityStatus;
let preferredHoursSelect;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Profile page loaded");
    
    // Check authentication
    auth.onAuthStateChanged(async function(user) {
        if (!user) {
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        console.log("User logged in:", user.email);
        window.currentUser = user;
        
        // Get DOM elements
        getProfileElements();
        
        // Load profile data
        await loadProfileData(user.uid);
        
        // Setup event listeners
        setupProfileListeners();
    });
});

// Get profile DOM elements
function getProfileElements() {
    profileForm = document.getElementById('profileForm');
    profilePictureInput = document.getElementById('profilePicture');
    profilePreview = document.getElementById('profilePreview');
    bioTextarea = document.getElementById('bio');
    bioCounter = document.getElementById('bioCounter');
    availabilityToggle = document.getElementById('availabilityToggle');
    availabilityStatus = document.getElementById('availabilityStatus');
    preferredHoursSelect = document.getElementById('preferredHours');
}

// Load profile data
async function loadProfileData(userId) {
    try {
        const profileDoc = await db.collection('profiles').doc(userId).get();
        
        if (profileDoc.exists) {
            const profileData = profileDoc.data();
            
            // Populate form fields
            document.getElementById('displayName').value = profileData.displayName || '';
            
            if (bioTextarea) {
                bioTextarea.value = profileData.bio || '';
                updateBioCounter(bioTextarea.value.length);
            }
            
            if (profilePreview && profileData.profilePicture) {
                profilePreview.src = profileData.profilePicture;
            }
            
            // Set availability toggle
            if (availabilityToggle) {
                availabilityToggle.checked = profileData.available || false;
                updateAvailabilityStatus(profileData.available || false);
            }
            
            // Set preferred hours
            if (preferredHoursSelect && profileData.preferredHours) {
                const hours = profileData.preferredHours;
                Array.from(preferredHoursSelect.options).forEach(option => {
                    option.selected = hours.includes(option.value);
                });
            }
            
            // Set topics
            if (profileData.topics) {
                document.querySelectorAll('input[name="topics"]').forEach(checkbox => {
                    checkbox.checked = profileData.topics.includes(checkbox.value);
                });
            }
            
            // Set social links
            if (profileData.socialLinks) {
                const socialInputs = document.querySelectorAll('.social-inputs input');
                socialInputs.forEach(input => {
                    const platform = input.previousElementSibling.querySelector('i').className.split(' ')[1];
                    if (platform.includes('twitter') && profileData.socialLinks.twitter) {
                        input.value = profileData.socialLinks.twitter;
                    } else if (platform.includes('instagram') && profileData.socialLinks.instagram) {
                        input.value = profileData.socialLinks.instagram;
                    } else if (platform.includes('tiktok') && profileData.socialLinks.tiktok) {
                        input.value = profileData.socialLinks.tiktok;
                    }
                });
            }
        }
        
    } catch (error) {
        console.error("Error loading profile:", error);
        showAlert('Error loading profile data', 'error');
    }
}

// Setup profile event listeners
function setupProfileListeners() {
    // Profile picture upload
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', handleProfilePictureUpload);
    }
    
    // Bio character counter
    if (bioTextarea) {
        bioTextarea.addEventListener('input', function() {
            updateBioCounter(this.value.length);
        });
    }
    
    // Availability toggle
    if (availabilityToggle) {
        availabilityToggle.addEventListener('change', function() {
            updateAvailabilityStatus(this.checked);
        });
    }
    
    // Form submission
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
    
    // Mobile menu
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('show');
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
}

// Handle profile picture upload
async function handleProfilePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        showAlert('Please select an image file', 'error');
        return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showAlert('Image must be less than 5MB', 'error');
        return;
    }
    
    try {
        // Show loading state
        if (profilePreview) {
            profilePreview.src = 'https://via.placeholder.com/200/e2e8f0/64748b?text=Uploading...';
        }
        
        // Create a unique filename
        const userId = currentUser.uid;
        const fileExtension = file.name.split('.').pop();
        const fileName = `profile_${userId}_${Date.now()}.${fileExtension}`;
        
        // Upload to Firebase Storage
        const storageRef = storage.ref(`profile_pictures/${fileName}`);
        const uploadTask = storageRef.put(file);
        
        // Monitor upload progress
        uploadTask.on('state_changed',
            (snapshot) => {
                // Progress tracking (optional)
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload progress: ' + progress + '%');
            },
            (error) => {
                console.error("Upload error:", error);
                showAlert('Error uploading image: ' + error.message, 'error');
                
                // Reset preview
                if (profilePreview) {
                    profilePreview.src = 'https://via.placeholder.com/200/4361ee/ffffff?text=Upload+Photo';
                }
            },
            async () => {
                // Upload completed successfully
                try {
                    // Get download URL
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    
                    // Update preview
                    if (profilePreview) {
                        profilePreview.src = downloadURL;
                    }
                    
                    // Save URL to user's profile
                    await db.collection('profiles').doc(userId).update({
                        profilePicture: downloadURL,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    showAlert('Profile picture updated successfully!', 'success');
                    
                } catch (error) {
                    console.error("Error getting download URL:", error);
                    showAlert('Error updating profile picture', 'error');
                }
            }
        );
        
    } catch (error) {
        console.error("Error handling file upload:", error);
        showAlert('Error uploading image', 'error');
    }
}

// Update bio character counter
function updateBioCounter(length) {
    if (bioCounter) {
        bioCounter.textContent = `${length}/500 characters`;
        
        // Change color if approaching limit
        if (length > 450) {
            bioCounter.style.color = 'var(--accent-red)';
        } else if (length > 400) {
            bioCounter.style.color = 'var(--accent-yellow)';
        } else {
            bioCounter.style.color = 'var(--text-muted)';
        }
    }
}

// Update availability status display
function updateAvailabilityStatus(isAvailable) {
    if (availabilityStatus) {
        availabilityStatus.textContent = isAvailable ? 'Available' : 'Unavailable';
        availabilityStatus.style.color = isAvailable ? 'var(--accent-green)' : 'var(--accent-red)';
    }
}

// Handle profile form submission
async function handleProfileSubmit(event) {
    event.preventDefault();
    
    const userId = currentUser.uid;
    
    // Get form values
    const displayName = document.getElementById('displayName').value.trim();
    const bio = bioTextarea ? bioTextarea.value.trim() : '';
    const isAvailable = availabilityToggle ? availabilityToggle.checked : false;
    
    // Get preferred hours
    const preferredHours = [];
    if (preferredHoursSelect) {
        Array.from(preferredHoursSelect.selectedOptions).forEach(option => {
            preferredHours.push(option.value);
        });
    }
    
    // Get topics
    const topics = [];
    document.querySelectorAll('input[name="topics"]:checked').forEach(checkbox => {
        topics.push(checkbox.value);
    });
    
    // Get social links
    const socialLinks = {};
    const socialInputs = document.querySelectorAll('.social-inputs input');
    socialInputs.forEach(input => {
        const platform = input.previousElementSibling.querySelector('i').className.split(' ')[1];
        const url = input.value.trim();
        
        if (url) {
            if (platform.includes('twitter')) socialLinks.twitter = url;
            else if (platform.includes('instagram')) socialLinks.instagram = url;
            else if (platform.includes('tiktok')) socialLinks.tiktok = url;
        }
    });
    
    // Validate
    if (!displayName) {
        showAlert('Please enter a display name', 'error');
        return;
    }
    
    if (bio.length > 500) {
        showAlert('Bio must be 500 characters or less', 'error');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = profileForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        // Update profile in Firestore
        await db.collection('profiles').doc(userId).update({
            displayName: displayName,
            bio: bio,
            available: isAvailable,
            preferredHours: preferredHours,
            topics: topics,
            socialLinks: socialLinks,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Also update user document for quick access
        await db.collection('users').doc(userId).update({
            displayName: displayName,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Restore button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        // Show success message
        showAlert('Profile updated successfully!', 'success');
        
        // Update UI
        updateAvailabilityStatus(isAvailable);
        
        // Update username in welcome message if on dashboard
        const welcomeElement = document.getElementById('welcomeText');
        if (welcomeElement) {
            welcomeElement.textContent = `Welcome back, ${displayName}!`;
        }
        
        // Redirect after delay if needed
        setTimeout(() => {
            // Only redirect if not on profile page
            if (!window.location.pathname.includes('profile.html')) {
                window.location.href = 'dashboard.html';
            }
        }, 1500);
        
    } catch (error) {
        console.error("Error updating profile:", error);
        showAlert('Error updating profile: ' + error.message, 'error');
        
        // Restore button state
        const submitBtn = profileForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Profile';
            submitBtn.disabled = false;
        }
    }
}

// Utility function to show alerts
function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '1000';
    alert.style.minWidth = '300px';
    alert.style.maxWidth = '500px';
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Export for debugging
window.ProfileManager = {
    loadProfileData,
    updateAvailabilityStatus
};

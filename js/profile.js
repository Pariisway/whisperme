// Profile Page JavaScript with File Upload
document.addEventListener('DOMContentLoaded', function() {
    console.log("Profile page loaded");
    
    // Initialize Firebase services
    let storage;
    try {
        if (firebase.apps.length) {
            storage = firebase.storage();
        }
    } catch (e) {
        console.log("Firebase Storage not available:", e);
    }
    
    // Check authentication
    checkAuth();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load existing profile data
    loadProfileData();
});

// Check authentication
function checkAuth() {
    if (typeof auth === 'undefined') return;
    
    auth.onAuthStateChanged(function(user) {
        if (!user) {
            window.location.href = 'auth.html?redirect=profile';
        } else {
            // Store current user ID for later use
            window.currentUserId = user.uid;
            window.currentUserEmail = user.email;
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Profile picture upload
    const fileInput = document.getElementById('profilePicture');
    const profilePreview = document.getElementById('profilePreview');
    
    if (fileInput && profilePreview) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.match('image.*')) {
                    alert('Please select an image file (JPEG, PNG, GIF)');
                    return;
                }
                
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image size should be less than 5MB');
                    return;
                }
                
                // Preview image
                const reader = new FileReader();
                reader.onload = function(e) {
                    profilePreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Bio character counter
    const bioInput = document.getElementById('bio');
    const bioCounter = document.getElementById('bioCounter');
    
    if (bioInput && bioCounter) {
        bioInput.addEventListener('input', function() {
            const count = this.value.length;
            bioCounter.textContent = `${count}/500 characters`;
            
            if (count > 490) {
                bioCounter.style.color = 'var(--danger)';
            } else if (count > 400) {
                bioCounter.style.color = 'var(--warning)';
            } else {
                bioCounter.style.color = 'var(--gray)';
            }
        });
    }
    
    // Availability toggle
    const availabilityToggle = document.getElementById('availabilityToggle');
    const availabilityStatus = document.getElementById('availabilityStatus');
    
    if (availabilityToggle && availabilityStatus) {
        availabilityToggle.addEventListener('change', function() {
            if (this.checked) {
                availabilityStatus.textContent = 'Available';
                availabilityStatus.style.color = 'var(--success)';
            } else {
                availabilityStatus.textContent = 'Unavailable';
                availabilityStatus.style.color = 'var(--danger)';
            }
        });
    }
    
    // Form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveProfile();
        });
    }
    
    // Setup logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof auth !== 'undefined') {
                auth.signOut().then(() => {
                    window.location.href = 'index.html';
                });
            }
        });
    }
}

// Load existing profile data
async function loadProfileData() {
    if (!window.currentUserId || typeof db === 'undefined') return;
    
    try {
        const profileDoc = await db.collection('profiles').doc(window.currentUserId).get();
        
        if (profileDoc.exists) {
            const data = profileDoc.data();
            
            // Populate form fields
            document.getElementById('displayName').value = data.displayName || '';
            document.getElementById('bio').value = data.bio || '';
            
            // Trigger bio counter update
            const bioInput = document.getElementById('bio');
            if (bioInput) bioInput.dispatchEvent(new Event('input'));
            
            // Load profile picture if exists
            if (data.profilePicture) {
                document.getElementById('profilePreview').src = data.profilePicture;
            }
            
            // Load availability
            if (data.available !== undefined) {
                document.getElementById('availabilityToggle').checked = data.available;
                document.getElementById('availabilityToggle').dispatchEvent(new Event('change'));
            }
            
            console.log("Profile data loaded:", data);
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

// Save profile data
async function saveProfile() {
    if (!window.currentUserId) {
        alert('Please log in to save profile');
        return;
    }
    
    // Get form data
    const profileData = {
        displayName: document.getElementById('displayName').value.trim(),
        bio: document.getElementById('bio').value.trim(),
        available: document.getElementById('availabilityToggle').checked,
        updatedAt: new Date().toISOString(),
        email: window.currentUserEmail
    };
    
    // Get social links
    const socialInputs = document.querySelectorAll('.social-inputs input');
    const socialLinks = {};
    socialInputs.forEach(input => {
        const platform = input.previousElementSibling.querySelector('i').className.split(' ')[1].replace('fa-', '');
        socialLinks[platform] = input.value.trim();
    });
    profileData.socialLinks = socialLinks;
    
    // Get selected topics
    const selectedTopics = [];
    document.querySelectorAll('input[name="topics"]:checked').forEach(checkbox => {
        selectedTopics.push(checkbox.value);
    });
    profileData.topics = selectedTopics;
    
    // Get preferred hours
    const preferredHours = [];
    const hourSelect = document.getElementById('preferredHours');
    for (let option of hourSelect.selectedOptions) {
        preferredHours.push(option.value);
    }
    profileData.preferredHours = preferredHours;
    
    // Upload profile picture if changed
    const fileInput = document.getElementById('profilePicture');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        try {
            const downloadURL = await uploadProfilePicture(file, window.currentUserId);
            profileData.profilePicture = downloadURL;
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            alert('Error uploading profile picture. Please try again.');
            return;
        }
    }
    
    // Save to Firestore
    try {
        await db.collection('profiles').doc(window.currentUserId).set(profileData, { merge: true });
        
        // Show success message
        showMessage('Profile saved successfully!', 'success');
        
        // Update UI in dashboard if we're coming from there
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error("Error saving profile:", error);
        showMessage('Error saving profile: ' + error.message, 'error');
    }
}

// Upload profile picture to Firebase Storage
async function uploadProfilePicture(file, userId) {
    if (typeof storage === 'undefined') {
        throw new Error('Storage not initialized');
    }
    
    // Create a unique filename
    const extension = file.name.split('.').pop();
    const filename = `profile-pictures/${userId}/profile.${extension}`;
    
    // Create storage reference
    const storageRef = storage.ref(filename);
    
    // Upload file
    const uploadTask = storageRef.put(file);
    
    // Wait for upload to complete
    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                // Progress tracking
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload progress:', progress + '%');
            },
            (error) => {
                reject(error);
            },
            async () => {
                // Upload complete, get download URL
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                resolve(downloadURL);
            }
        );
    });
}

// Show message
function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.alert');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageEl = document.createElement('div');
    messageEl.className = `alert alert-${type}`;
    messageEl.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;
    
    // Insert after form
    const form = document.getElementById('profileForm');
    if (form) {
        form.parentNode.insertBefore(messageEl, form);
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                messageEl.remove();
            }, 3000);
        }
    }
}

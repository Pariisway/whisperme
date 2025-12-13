// profile.js - Handles profile management

// Initialize Firebase
let currentUser = null;
let userData = null;

// DOM Elements
const displayNameEl = document.getElementById('displayName');
const userEmailEl = document.getElementById('userEmail');
const profileAvatarEl = document.getElementById('profileAvatar');
const fullNameEl = document.getElementById('fullName');
const bioEl = document.getElementById('bio');
const phoneEl = document.getElementById('phone');
const hourlyRateEl = document.getElementById('hourlyRate');
const activeToggleEl = document.getElementById('activeToggle');
const statusTextEl = document.getElementById('statusText');
const addSkillInputEl = document.getElementById('addSkill');
const addSkillBtn = document.getElementById('addSkillBtn');
const skillTagsEl = document.getElementById('skillTags');
const totalCallsEl = document.getElementById('totalCalls');
const avgRatingEl = document.getElementById('avgRating');
const savePersonalBtn = document.getElementById('savePersonalBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const logoutBtn = document.getElementById('logoutBtn');
const changeAvatarBtn = document.getElementById('changeAvatarBtn');

// Initialize profile page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
});

// Check if user is logged in
function checkAuth() {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            loadUserData();
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'auth.html?redirect=profile';
        }
    });
}

// Load user data from Firestore
async function loadUserData() {
    try {
        const userDoc = await firebase.firestore()
            .collection('users')
            .doc(currentUser.uid)
            .get();
        
        if (userDoc.exists) {
            userData = userDoc.data();
            updateProfileUI(userData);
        } else {
            // Create user profile if it doesn't exist
            await createUserProfile();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showAlert('error', 'Failed to load profile data.');
    }
}

// Create user profile if it doesn't exist
async function createUserProfile() {
    try {
        const userProfile = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || currentUser.email.split('@')[0],
            fullName: currentUser.displayName || '',
            bio: '',
            phone: '',
            photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.email.split('@')[0])}&background=7b2cbf&color=fff&size=150`,
            hourlyRate: 60,
            isActive: true,
            skills: ['Listening', 'Advice', 'Motivation', 'Friendship'],
            interests: ['gaming', 'books'],
            totalCalls: 0,
            averageRating: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await firebase.firestore()
            .collection('users')
            .doc(currentUser.uid)
            .set(userProfile);
        
        userData = userProfile;
        updateProfileUI(userData);
    } catch (error) {
        console.error('Error creating user profile:', error);
    }
}

// Update profile UI
function updateProfileUI(data) {
    // Basic info
    displayNameEl.textContent = data.displayName || 'User';
    userEmailEl.textContent = data.email || '';
    profileAvatarEl.src = data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || 'User')}&background=7b2cbf&color=fff&size=150`;
    
    // Personal info form
    fullNameEl.value = data.fullName || '';
    bioEl.value = data.bio || '';
    phoneEl.value = data.phone || '';
    
    // Whisperer settings
    hourlyRateEl.value = data.hourlyRate || 60;
    activeToggleEl.checked = data.isActive !== false;
    statusTextEl.textContent = data.isActive !== false ? 'Available for calls' : 'Currently unavailable';
    
    // Skills
    updateSkillsUI(data.skills || ['Listening', 'Advice', 'Motivation', 'Friendship']);
    
    // Interests
    updateInterestsUI(data.interests || ['gaming', 'books']);
    
    // Stats
    totalCallsEl.textContent = data.totalCalls || 0;
    avgRatingEl.textContent = `${data.averageRating || 0.0} ★`;
}

// Update skills UI
function updateSkillsUI(skills) {
    skillTagsEl.innerHTML = '';
    skills.forEach(skill => {
        const skillTag = document.createElement('span');
        skillTag.className = 'skill-tag';
        skillTag.innerHTML = `
            ${skill} <button class="remove-skill" data-skill="${skill}">×</button>
        `;
        skillTagsEl.appendChild(skillTag);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-skill').forEach(btn => {
        btn.addEventListener('click', function() {
            const skill = this.getAttribute('data-skill');
            removeSkill(skill);
        });
    });
}

// Update interests UI
function updateInterestsUI(interests) {
    document.querySelectorAll('.interest-check').forEach(checkbox => {
        checkbox.checked = interests.includes(checkbox.value);
    });
}

// Set up event listeners
function setupEventListeners() {
    // Save personal info
    savePersonalBtn.addEventListener('click', savePersonalInfo);
    
    // Save settings
    saveSettingsBtn.addEventListener('click', saveWhispererSettings);
    
    // Active toggle
    activeToggleEl.addEventListener('change', function() {
        statusTextEl.textContent = this.checked ? 'Available for calls' : 'Currently unavailable';
    });
    
    // Add skill
    addSkillBtn.addEventListener('click', addSkill);
    addSkillInputEl.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addSkill();
        }
    });
    
    // Delete account
    deleteAccountBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone!')) {
            deleteAccount();
        }
    });
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            firebase.auth().signOut().then(() => {
                window.location.href = 'index.html';
            });
        });
    }
    
    // Change avatar
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', function() {
            // In a real app, you would upload an image here
            // For now, we'll just show an alert
            alert('In a real application, you would upload a profile picture here.');
        });
    }
}

// Save personal info
async function savePersonalInfo() {
    try {
        const updates = {
            fullName: fullNameEl.value.trim(),
            bio: bioEl.value.trim(),
            phone: phoneEl.value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await firebase.firestore()
            .collection('users')
            .doc(currentUser.uid)
            .update(updates);
        
        // Update local data
        Object.assign(userData, updates);
        if (updates.fullName && !updates.fullName.includes(' ')) {
            userData.displayName = updates.fullName;
            displayNameEl.textContent = updates.fullName;
        }
        
        showAlert('success', 'Personal information saved!');
    } catch (error) {
        console.error('Error saving personal info:', error);
        showAlert('error', 'Failed to save personal information.');
    }
}

// Save whisperer settings
async function saveWhispererSettings() {
    try {
        // Get selected interests
        const interests = [];
        document.querySelectorAll('.interest-check:checked').forEach(checkbox => {
            interests.push(checkbox.value);
        });
        
        const updates = {
            hourlyRate: parseInt(hourlyRateEl.value) || 60,
            isActive: activeToggleEl.checked,
            skills: userData.skills || [],
            interests: interests,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await firebase.firestore()
            .collection('users')
            .doc(currentUser.uid)
            .update(updates);
        
        // Update local data
        Object.assign(userData, updates);
        
        showAlert('success', 'Settings updated!');
    } catch (error) {
        console.error('Error saving settings:', error);
        showAlert('error', 'Failed to update settings.');
    }
}

// Add a new skill
async function addSkill() {
    const skill = addSkillInputEl.value.trim();
    if (!skill) return;
    
    if (!userData.skills) {
        userData.skills = [];
    }
    
    if (userData.skills.includes(skill)) {
        showAlert('warning', 'Skill already exists!');
        return;
    }
    
    userData.skills.push(skill);
    updateSkillsUI(userData.skills);
    addSkillInputEl.value = '';
    
    // Save to Firestore
    try {
        await firebase.firestore()
            .collection('users')
            .doc(currentUser.uid)
            .update({
                skills: userData.skills,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        showAlert('success', 'Skill added!');
    } catch (error) {
        console.error('Error adding skill:', error);
        showAlert('error', 'Failed to add skill.');
    }
}

// Remove a skill
async function removeSkill(skill) {
    if (!userData.skills) return;
    
    userData.skills = userData.skills.filter(s => s !== skill);
    updateSkillsUI(userData.skills);
    
    // Save to Firestore
    try {
        await firebase.firestore()
            .collection('users')
            .doc(currentUser.uid)
            .update({
                skills: userData.skills,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        showAlert('success', 'Skill removed!');
    } catch (error) {
        console.error('Error removing skill:', error);
        showAlert('error', 'Failed to remove skill.');
    }
}

// Delete account
async function deleteAccount() {
    try {
        // Show loading
        deleteAccountBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        deleteAccountBtn.disabled = true;
        
        // In a real app, you would:
        // 1. Delete all user data from Firestore
        // 2. Delete the user from Firebase Auth
        // 3. Handle any other cleanup
        
        // For demo purposes, we'll just simulate deletion
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Sign out and redirect
        await firebase.auth().signOut();
        alert('Account deletion simulated. In a real app, your account would be permanently deleted.');
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Error deleting account:', error);
        showAlert('error', 'Failed to delete account.');
        deleteAccountBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete Account';
        deleteAccountBtn.disabled = false;
    }
}

// Show alert message
function showAlert(type, message) {
    // Create alert element
    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${type} fade-in`;
    alertEl.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // Position at top
    alertEl.style.position = 'fixed';
    alertEl.style.top = '80px';
    alertEl.style.left = '50%';
    alertEl.style.transform = 'translateX(-50%)';
    alertEl.style.zIndex = '1000';
    alertEl.style.minWidth = '300px';
    alertEl.style.maxWidth = '90%';
    alertEl.style.textAlign = 'center';
    
    // Add to page
    document.body.appendChild(alertEl);
    
    // Remove after 3 seconds
    setTimeout(() => {
        alertEl.classList.remove('fade-in');
        alertEl.style.opacity = '0';
        setTimeout(() => {
            if (alertEl.parentNode) {
                alertEl.parentNode.removeChild(alertEl);
            }
        }, 300);
    }, 3000);
}
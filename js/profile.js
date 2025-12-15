// Fixed profile.js without duplicate db declaration

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Profile page loaded - Fixed version');
    
    // Wait for Firebase to initialize
    let checkCount = 0;
    const maxChecks = 50;
    
    const waitForFirebase = setInterval(() => {
        if (window.firebase && firebase.apps.length > 0) {
            clearInterval(waitForFirebase);
            initProfile();
        } else if (checkCount++ > maxChecks) {
            clearInterval(waitForFirebase);
            console.error('Firebase not loaded');
        }
    }, 100);
});

async function initProfile() {
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();
    const user = auth.currentUser;
    
    if (!user) {
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    console.log('Initializing profile for user:', user.uid);
    
    // Load user data
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data() || {};
    
    // Populate form fields
    if (userData.displayName) {
        document.getElementById('displayName').value = userData.displayName;
    }
    
    if (userData.bio) {
        document.getElementById('bio').value = userData.bio;
    }
    
    if (userData.photoURL) {
        document.getElementById('profilePicture').src = userData.photoURL;
    }
    
    // Populate account info
    document.getElementById('userEmail').textContent = user.email;
    
    if (userData.socialMedia) {
        document.getElementById('instagram').value = userData.socialMedia.instagram || '';
        document.getElementById('twitter').value = userData.socialMedia.twitter || '';
        document.getElementById('tiktok').value = userData.socialMedia.tiktok || '';
    }
    
    if (userData.banking) {
        document.getElementById('bankName').value = userData.banking.bankName || '';
        document.getElementById('accountNumber').value = userData.banking.accountNumber || '';
        document.getElementById('routingNumber').value = userData.banking.routingNumber || '';
    }
    
    // Setup event listeners
    setupEventListeners(user, db, storage);
}

function setupEventListeners(user, db, storage) {
    // Save profile button
    document.getElementById('saveProfileBtn').addEventListener('click', () => saveProfile(user, db));
    
    // Save account info button
    document.getElementById('saveAccountBtn').addEventListener('click', () => saveAccountInfo(user, db));
    
    // Save social media button
    document.getElementById('saveSocialBtn').addEventListener('click', () => saveSocialMedia(user, db));
    
    // Save banking button
    document.getElementById('saveBankingBtn').addEventListener('click', () => saveBankingInfo(user, db));
    
    // Profile picture upload
    const profilePicInput = document.getElementById('profilePicInput');
    if (profilePicInput) {
        profilePicInput.addEventListener('change', (e) => handlePictureUpload(e, user, db, storage));
    }
    
    // Manual picture upload button
    const uploadPicBtn = document.getElementById('uploadPicBtn');
    if (uploadPicBtn) {
        uploadPicBtn.addEventListener('click', () => {
            document.getElementById('profilePicInput').click();
        });
    }
}

// Define the missing function
async function handlePictureUpload(event, user, db, storage) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image must be less than 5MB');
        return;
    }
    
    // Show loading
    const profilePic = document.getElementById('profilePicture');
    const originalSrc = profilePic.src;
    profilePic.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
    
    try {
        // Upload to Firebase Storage
        const storageRef = storage.ref();
        const fileRef = storageRef.child(`profile_pictures/${user.uid}/${Date.now()}_${file.name}`);
        
        // Upload file
        await fileRef.put(file);
        
        // Get download URL
        const downloadURL = await fileRef.getDownloadURL();
        
        // Update Firestore
        await db.collection('users').doc(user.uid).update({
            photoURL: downloadURL,
            updatedAt: new Date()
        });
        
        // Update UI
        profilePic.src = downloadURL;
        alert('Profile picture updated successfully!');
        
    } catch (error) {
        console.error('Error uploading picture:', error);
        profilePic.src = originalSrc;
        alert('Error uploading picture: ' + error.message);
    }
}

async function saveProfile(user, db) {
    const displayName = document.getElementById('displayName').value;
    const bio = document.getElementById('bio').value;
    
    try {
        await db.collection('users').doc(user.uid).update({
            displayName,
            bio,
            updatedAt: new Date()
        });
        alert('Profile updated successfully!');
    } catch (error) {
        alert('Error updating profile: ' + error.message);
    }
}

async function saveAccountInfo(user, db) {
    const newEmail = document.getElementById('newEmail').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    try {
        if (newEmail && newEmail !== user.email) {
            await user.updateEmail(newEmail);
            await db.collection('users').doc(user.uid).update({
                email: newEmail,
                updatedAt: new Date()
            });
        }
        
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            await user.updatePassword(newPassword);
        }
        
        alert('Account information updated successfully!');
    } catch (error) {
        alert('Error updating account: ' + error.message);
    }
}

async function saveSocialMedia(user, db) {
    const socialMedia = {
        instagram: document.getElementById('instagram').value,
        twitter: document.getElementById('twitter').value,
        tiktok: document.getElementById('tiktok').value
    };
    
    try {
        await db.collection('users').doc(user.uid).update({
            socialMedia,
            updatedAt: new Date()
        });
        alert('Social media links updated successfully!');
    } catch (error) {
        alert('Error updating social media: ' + error.message);
    }
}

async function saveBankingInfo(user, db) {
    const banking = {
        bankName: document.getElementById('bankName').value,
        accountNumber: document.getElementById('accountNumber').value,
        routingNumber: document.getElementById('routingNumber').value
    };
    
    try {
        await db.collection('users').doc(user.uid).update({
            banking,
            updatedAt: new Date()
        });
        alert('Banking information updated successfully!');
    } catch (error) {
        alert('Error updating banking info: ' + error.message);
    }
}

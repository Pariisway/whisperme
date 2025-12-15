// Auth.js - Fixed version
console.log('Auth.js loaded - Fixed version');

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing auth...');
    
    // Wait for Firebase
    let checkCount = 0;
    const maxChecks = 50;
    
    const waitForFirebase = setInterval(() => {
        if (window.firebase && firebase.apps.length > 0) {
            clearInterval(waitForFirebase);
            console.log('✅ Firebase is ready after ' + checkCount + ' attempts');
            initializeAuthPage();
        } else if (checkCount++ > maxChecks) {
            clearInterval(waitForFirebase);
            console.error('Firebase not loaded');
            showError('Firebase not loaded. Please refresh the page.');
        }
    }, 100);
});

function initializeAuthPage() {
    console.log('Initializing auth page...');
    
    // Get auth type from URL
    const urlParams = new URLSearchParams(window.location.search);
    const authType = urlParams.get('type') || 'login';
    console.log('Auth type:', authType);
    
    // Update page elements if they exist
    const formTitle = document.getElementById('formTitle');
    const formSubtitle = document.getElementById('formSubtitle');
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const toggleLink = document.getElementById('toggleLink');
    const toggleText = document.getElementById('toggleText');
    
    if (formTitle) {
        formTitle.textContent = authType === 'signup' ? 'Create Your Account' : 'Welcome Back';
    }
    
    if (formSubtitle) {
        formSubtitle.textContent = authType === 'signup' 
            ? 'Start earning from your fans today' 
            : 'Sign in to your account to continue';
    }
    
    if (submitBtn) {
        submitBtn.innerHTML = authType === 'signup' 
            ? '<i class="fas fa-user-plus"></i><span>Sign Up</span>' 
            : '<i class="fas fa-sign-in-alt"></i><span>Sign In</span>';
    }
    
    if (submitText) {
        submitText.textContent = authType === 'signup' ? 'Sign Up' : 'Sign In';
    }
    
    if (toggleLink && toggleText) {
        if (authType === 'signup') {
            toggleText.innerHTML = 'Already have an account? ';
            toggleLink.textContent = 'Sign in';
            toggleLink.href = 'auth.html?type=login';
        } else {
            toggleText.innerHTML = 'Don\'t have an account? ';
            toggleLink.textContent = 'Sign up';
            toggleLink.href = 'auth.html?type=signup';
        }
    }
    
    console.log('✅ Auth page initialized successfully');
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    } else {
        alert(message);
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}

// Handle form submission globally
document.addEventListener('submit', async function(e) {
    if (e.target.id === 'authForm') {
        e.preventDefault();
        
        const urlParams = new URLSearchParams(window.location.search);
        const authType = urlParams.get('type') || 'login';
        
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        const submitBtn = document.getElementById('submitBtn');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }
        
        // Show loading
        const originalContent = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;
        
        // Hide messages
        if (errorMessage) errorMessage.style.display = 'none';
        if (successMessage) successMessage.style.display = 'none';
        
        try {
            const auth = firebase.auth();
            const db = firebase.firestore();
            
            if (authType === 'signup') {
                // Sign up
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Create user profile
                await db.collection('users').doc(user.uid).set({
                    email: user.email,
                    displayName: user.email.split('@')[0],
                    createdAt: new Date(),
                    tokens: 0,
                    available: false,
                    totalEarnings: 0,
                    totalCalls: 0,
                    averageRating: 0
                });
                
                // Create public profile
                await db.collection('profiles').doc(user.uid).set({
                    userId: user.uid,
                    displayName: user.email.split('@')[0],
                    email: user.email,
                    bio: '',
                    photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email.split('@')[0])}&background=1e3a8a&color=fff`,
                    available: false,
                    rating: 0,
                    totalCalls: 0,
                    createdAt: new Date()
                });
                
                showSuccess('Account created successfully! Redirecting...');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                
            } else {
                // Sign in
                await auth.signInWithEmailAndPassword(email, password);
                window.location.href = 'dashboard.html';
            }
            
        } catch (error) {
            console.error('Auth error:', error);
            
            // Reset button
            submitBtn.innerHTML = originalContent;
            submitBtn.disabled = false;
            
            // Show error
            showError(getErrorMessage(error.code));
        }
    }
});

function getErrorMessage(errorCode) {
    switch(errorCode) {
        case 'auth/invalid-email':
            return 'Please enter a valid email address';
        case 'auth/user-disabled':
            return 'This account has been disabled';
        case 'auth/user-not-found':
            return 'No account found with this email';
        case 'auth/wrong-password':
            return 'Incorrect password';
        case 'auth/email-already-in-use':
            return 'This email is already registered';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please try again later';
        default:
            return 'An error occurred. Please try again';
    }
}

// Check if user is already logged in
firebase.auth().onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('auth.html')) {
        console.log('User already logged in, redirecting to dashboard');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);
    }
});

// Add click handler for toggle link
document.addEventListener('click', function(e) {
    if (e.target.id === 'toggleLink') {
        e.preventDefault();
        const urlParams = new URLSearchParams(window.location.search);
        const authType = urlParams.get('type') || 'login';
        const newType = authType === 'login' ? 'signup' : 'login';
        window.location.href = `auth.html?type=${newType}`;
    }
});

console.log('✅ Auth.js loaded successfully');

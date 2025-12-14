// Authentication handling for Whisper+me
console.log("Auth.js loaded");

// DOM Elements
let authForm;
let authBtn;
let authMessage;
let emailInput;
let passwordInput;
let switchLink;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Auth page loaded");
    
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'login';
    
    // Get DOM elements
    authForm = document.getElementById('authForm');
    authBtn = document.getElementById('authBtn');
    authMessage = document.getElementById('authMessage');
    emailInput = document.getElementById('email');
    passwordInput = document.getElementById('password');
    switchLink = document.getElementById('switchLink');
    
    // Set up form based on type
    setupAuthForm(type);
    
    // Check if user is already logged in
    auth.onAuthStateChanged(function(user) {
        if (user && (window.location.pathname.includes('auth.html') || window.location.pathname.includes('login.html'))) {
            // User is already logged in, redirect to dashboard
            window.location.href = 'dashboard.html';
        }
    });
    
    // Setup event listeners
    setupAuthListeners();
});

// Setup auth form based on type (login/signup)
function setupAuthForm(type) {
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    
    if (type === 'signup') {
        // Setup signup form
        authTitle.textContent = 'Sign Up';
        authSubtitle.textContent = 'Create your account to start whispering';
        authBtn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
        
        // Update switch link
        if (switchLink) {
            switchLink.textContent = 'Already have an account? Login here';
            switchLink.href = 'auth.html?type=login';
        }
        
        // Add confirm password field if not present
        if (!document.getElementById('confirmPassword')) {
            const confirmPasswordGroup = document.createElement('div');
            confirmPasswordGroup.className = 'form-group';
            confirmPasswordGroup.innerHTML = `
                <label for="confirmPassword"><i class="fas fa-lock"></i> Confirm Password</label>
                <input type="password" id="confirmPassword" class="form-control" placeholder="••••••••">
            `;
            
            // Insert before the button
            const authBtn = document.getElementById('authBtn');
            if (authBtn && authBtn.parentNode) {
                authBtn.parentNode.insertBefore(confirmPasswordGroup, authBtn);
            }
        }
        
    } else {
        // Setup login form
        authTitle.textContent = 'Login';
        authSubtitle.textContent = 'Welcome back! Enter your credentials';
        authBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        
        // Update switch link
        if (switchLink) {
            switchLink.textContent = "Don't have an account? Sign up here";
            switchLink.href = 'auth.html?type=signup';
        }
        
        // Remove confirm password field if present
        const confirmPassword = document.getElementById('confirmPassword');
        if (confirmPassword && confirmPassword.parentNode) {
            confirmPassword.parentNode.remove();
        }
    }
}

// Setup auth event listeners
function setupAuthListeners() {
    // Auth button click
    if (authBtn) {
        authBtn.addEventListener('click', handleAuthSubmit);
    }
    
    // Form submit on enter
    if (authForm) {
        authForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleAuthSubmit();
        });
    }
}

// Handle auth form submission
async function handleAuthSubmit() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'login';
    
    // Get form values
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = type === 'signup' ? document.getElementById('confirmPassword')?.value : null;
    
    // Validate inputs
    if (!email || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (type === 'signup' && password !== confirmPassword) {
        showAuthMessage('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        showAuthMessage('Processing...', 'info');
        
        if (type === 'signup') {
            // Sign up user
            await handleSignUp(email, password);
        } else {
            // Log in user
            await handleLogin(email, password);
        }
        
    } catch (error) {
        console.error("Auth error:", error);
        showAuthMessage(getAuthErrorMessage(error), 'error');
    }
}

// Handle user sign up
async function handleSignUp(email, password) {
    showAuthMessage('Creating your account...', 'info');
    
    // Create user with email and password
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Update user profile
    await user.updateProfile({
        displayName: email.split('@')[0] // Use email username as display name
    });
    
    // Create user document in Firestore
    await db.collection('users').doc(user.uid).set({
        email: email,
        displayName: email.split('@')[0],
        tokens: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Create profile document
    await db.collection('profiles').doc(user.uid).set({
        userId: user.uid,
        email: email,
        displayName: email.split('@')[0],
        username: email.split('@')[0].toLowerCase(),
        bio: '',
        profilePicture: '',
        available: false, // Default to unavailable
        socialLinks: {},
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Create user stats document
    await db.collection('userStats').doc(user.uid).set({
        userId: user.uid,
        calls: 0,
        earnings: 0,
        rating: 0,
        totalRatingCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showAuthMessage('Account created successfully! Redirecting...', 'success');
    
    // Redirect to dashboard after delay
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1500);
}

// Handle user login
async function handleLogin(email, password) {
    showAuthMessage('Logging in...', 'info');
    
    // Sign in user
    await auth.signInWithEmailAndPassword(email, password);
    
    showAuthMessage('Login successful! Redirecting...', 'success');
    
    // Redirect to dashboard after delay
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1000);
}

// Show auth message
function showAuthMessage(message, type = 'info') {
    if (!authMessage) return;
    
    // Set message and type
    authMessage.textContent = message;
    authMessage.className = `alert alert-${type}`;
    authMessage.style.display = 'block';
    
    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            authMessage.style.display = 'none';
        }, 3000);
    }
}

// Get user-friendly auth error message
function getAuthErrorMessage(error) {
    switch(error.code) {
        case 'auth/email-already-in-use':
            return 'Email already in use. Please try logging in.';
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/operation-not-allowed':
            return 'Email/password accounts are not enabled.';
        case 'auth/weak-password':
            return 'Password is too weak.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        default:
            return error.message || 'An error occurred. Please try again.';
    }
}

// Handle password reset (optional feature)
function handlePasswordReset() {
    const email = prompt('Enter your email address to reset password:');
    if (!email) return;
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            alert('Password reset email sent. Check your inbox.');
        })
        .catch(error => {
            alert('Error sending reset email: ' + error.message);
        });
}

// Export functions if needed
window.AuthHandler = {
    showAuthMessage,
    getAuthErrorMessage,
    handlePasswordReset
};

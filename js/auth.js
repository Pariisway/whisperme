// Auth.js - Fixed version with better error handling
console.log("Auth.js loaded - Fixed Version");

// Wait for Firebase to be ready
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max
        
        const checkFirebase = () => {
            attempts++;
            
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                console.log("✅ Firebase is ready after", attempts, "attempts");
                resolve(true);
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.error("❌ Firebase failed to load after", maxAttempts, "attempts");
                reject(new Error("Firebase failed to load"));
                return;
            }
            
            console.log("Waiting for Firebase... attempt", attempts);
            setTimeout(checkFirebase, 1000);
        };
        
        checkFirebase();
    });
}

// Initialize auth page
async function initializeAuthPage() {
    console.log("Initializing auth page...");
    
    try {
        // Wait for Firebase
        await waitForFirebase();
        
        // Get auth type from URL
        const urlParams = new URLSearchParams(window.location.search);
        const authType = urlParams.get('type') || 'login';
        
        console.log("Auth type:", authType);
        
        // Update UI based on auth type
        document.getElementById('authTitle').textContent = 
            authType === 'signup' ? 'Create Account' : 'Welcome Back';
        
        document.getElementById('authSubmit').textContent = 
            authType === 'signup' ? 'Sign Up' : 'Login';
        
        document.getElementById('authSwitch').innerHTML = 
            authType === 'signup' 
                ? 'Already have an account? <a href="auth.html?type=login">Login</a>'
                : 'Need an account? <a href="auth.html?type=signup">Sign Up</a>';
        
        // Setup form submission
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                await handleAuthSubmit(authType);
            });
        }
        
        console.log("✅ Auth page initialized successfully");
        
    } catch (error) {
        console.error("Failed to initialize auth page:", error);
        showAuthError("Firebase not available. Please refresh the page.");
    }
}

// Handle auth form submission
async function handleAuthSubmit(authType) {
    const submitBtn = document.getElementById('authSubmit');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Validate
    if (!email || !password) {
        showAuthError("Please fill in all fields");
        return;
    }
    
    // Show loading
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;
    
    try {
        if (authType === 'signup') {
            await signUpUser(email, password);
        } else {
            await logInUser(email, password);
        }
    } catch (error) {
        console.error("Auth error:", error);
        showAuthError(error.message);
        submitBtn.innerHTML = authType === 'signup' ? 'Sign Up' : 'Login';
        submitBtn.disabled = false;
    }
}

// Sign up user
async function signUpUser(email, password) {
    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        console.log("User signed up:", userCredential.user.uid);
        
        // Create user profile
        await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
            email: email,
            displayName: email.split('@')[0],
            createdAt: new Date(),
            coins: 10, // Give 10 free coins
            role: 'user'
        });
        
        // Show success
        showAuthSuccess("Account created! Redirecting...");
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        throw new Error(getAuthErrorMessage(error));
    }
}

// Log in user
async function logInUser(email, password) {
    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        console.log("User logged in:", userCredential.user.uid);
        
        // Show success
        showAuthSuccess("Login successful! Redirecting...");
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        throw new Error(getAuthErrorMessage(error));
    }
}

// Get user-friendly auth error messages
function getAuthErrorMessage(error) {
    switch (error.code) {
        case 'auth/email-already-in-use':
            return 'Email already in use';
        case 'auth/invalid-email':
            return 'Invalid email address';
        case 'auth/operation-not-allowed':
            return 'Email/password accounts are not enabled';
        case 'auth/weak-password':
            return 'Password is too weak';
        case 'auth/user-disabled':
            return 'This account has been disabled';
        case 'auth/user-not-found':
            return 'No account found with this email';
        case 'auth/wrong-password':
            return 'Incorrect password';
        default:
            return error.message;
    }
}

// Show auth error
function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.className = 'auth-error';
    }
}

// Show auth success
function showAuthSuccess(message) {
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.className = 'auth-success';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing auth...");
    setTimeout(() => {
        initializeAuthPage();
    }, 1000);
});

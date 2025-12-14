// Authentication JavaScript for Whisper+me
console.log("Auth.js loaded");

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Auth page loaded");
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'login';
    
    // Setup auth form based on type
    setupAuthForm(type);
    
    // Setup form submission
    setupFormSubmission();
});

// Setup auth form based on type (login/signup)
function setupAuthForm(type) {
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const authBtn = document.getElementById('authBtn');
    const switchText = document.getElementById('switchText');
    const switchLink = document.getElementById('switchLink');
    const authForm = document.getElementById('authForm');
    
    // Check if Firebase is ready
    if (typeof auth === 'undefined') {
        console.error("Firebase auth not loaded yet");
        showAuthMessage("Loading authentication...", "info");
        // Wait for Firebase
        if (typeof waitForFirebase !== 'undefined') {
            waitForFirebase(function(firebaseReady) {
                if (firebaseReady) {
                    console.log("Firebase ready, setting up form");
                    setupAuthForm(type);
                }
            });
        }
        return;
    }
    
    if (type === 'signup') {
        // Setup signup form
        authTitle.textContent = 'Create Account';
        authSubtitle.textContent = 'Join Whisper+me and start earning today';
        authBtn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
        switchText.innerHTML = 'Already have an account? ';
        switchLink.textContent = 'Login here';
        switchLink.href = 'auth.html?type=login';
        
        // Add confirm password field if it doesn't exist
        if (!document.getElementById('confirmPassword')) {
            const confirmPasswordField = `
                <div class="form-group">
                    <label for="confirmPassword"><i class="fas fa-lock"></i> Confirm Password</label>
                    <input type="password" id="confirmPassword" class="form-control" placeholder="••••••••" required>
                </div>
            `;
            const passwordField = document.querySelector('[for="password"]').parentElement;
            passwordField.insertAdjacentHTML('afterend', confirmPasswordField);
        }
    } else {
        // Setup login form
        authTitle.textContent = 'Login';
        authSubtitle.textContent = 'Welcome back to Whisper+me';
        authBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        switchText.innerHTML = 'Don\'t have an account? ';
        switchLink.textContent = 'Sign up here';
        switchLink.href = 'auth.html?type=signup';
        
        // Remove confirm password field if it exists
        const confirmPasswordField = document.getElementById('confirmPassword');
        if (confirmPasswordField) {
            confirmPasswordField.parentElement.remove();
        }
    }
    
    // Update nav active states
    const loginNavBtn = document.getElementById('loginNavBtn');
    const signupNavBtn = document.getElementById('signupNavBtn');
    
    if (loginNavBtn && signupNavBtn) {
        if (type === 'signup') {
            loginNavBtn.classList.remove('active');
            signupNavBtn.classList.add('active');
        } else {
            loginNavBtn.classList.add('active');
            signupNavBtn.classList.remove('active');
        }
    }
}

// Setup form submission
function setupFormSubmission() {
    const authForm = document.getElementById('authForm');
    if (!authForm) return;
    
    authForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form values
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        
        // Get current type from URL
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type') || 'login';
        
        // Validate form
        if (!email || !password) {
            showAuthMessage('Please fill in all fields', 'error');
            return;
        }
        
        if (type === 'signup') {
            if (!confirmPassword) {
                showAuthMessage('Please confirm your password', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showAuthMessage('Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 6) {
                showAuthMessage('Password must be at least 6 characters', 'error');
                return;
            }
            
            // Sign up user
            await signUpUser(email, password);
        } else {
            // Log in user
            await logInUser(email, password);
        }
    });
}

// Sign up user
async function signUpUser(email, password) {
    try {
        showAuthMessage('Creating your account...', 'info');
        
        // Check if Firebase auth is available
        if (typeof auth === 'undefined') {
            throw new Error('Authentication service not available. Please refresh the page.');
        }
        
        // Create user with email and password
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log("User created:", user.uid);
        
        // Create user document in Firestore
        if (typeof db !== 'undefined') {
            await db.collection('users').doc(user.uid).set({
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                tokens: 0,
                role: 'user'
            });
            
            // Create initial user stats
            await db.collection('userStats').doc(user.uid).set({
                earnings: 0,
                calls: 0,
                rating: 0,
                activeTime: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Create initial profile
            await db.collection('profiles').doc(user.uid).set({
                userId: user.uid,
                email: email,
                displayName: email.split('@')[0],
                username: email.split('@')[0].toLowerCase(),
                available: true,
                bio: '',
                profilePicture: '',
                interests: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        showAuthMessage('Account created successfully! Redirecting...', 'success');
        
        // Send email verification
        await user.sendEmailVerification();
        
        // Redirect to dashboard after delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error("Sign up error:", error);
        
        let errorMessage = 'Error creating account: ';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Email already in use. Try logging in instead.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Use at least 6 characters.';
                break;
            default:
                errorMessage += error.message;
        }
        
        showAuthMessage(errorMessage, 'error');
    }
}

// Log in user
async function logInUser(email, password) {
    try {
        showAuthMessage('Logging in...', 'info');
        
        // Check if Firebase auth is available
        if (typeof auth === 'undefined') {
            throw new Error('Authentication service not available. Please refresh the page.');
        }
        
        // Sign in with email and password
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Check if email is verified
        if (!user.emailVerified) {
            showAuthMessage('Please verify your email before logging in. Check your inbox.', 'warning');
            await auth.signOut();
            return;
        }
        
        console.log("User logged in:", user.uid);
        
        showAuthMessage('Login successful! Redirecting...', 'success');
        
        // Redirect to dashboard after delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error("Login error:", error);
        
        let errorMessage = 'Error logging in: ';
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many login attempts. Try again later.';
                break;
            default:
                errorMessage += error.message;
        }
        
        showAuthMessage(errorMessage, 'error');
    }
}

// Show auth message
function showAuthMessage(message, type = 'info') {
    const authMessage = document.getElementById('authMessage');
    if (!authMessage) return;
    
    authMessage.textContent = message;
    authMessage.className = `alert alert-${type}`;
    authMessage.style.display = 'flex';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        authMessage.style.display = 'none';
    }, 5000);
}

// Check if user is already logged in
function checkAuthState() {
    if (typeof auth === 'undefined') return;
    
    auth.onAuthStateChanged(function(user) {
        if (user && window.location.pathname.includes('auth.html')) {
            // User is logged in but on auth page, redirect to dashboard
            console.log("User already logged in, redirecting to dashboard");
            window.location.href = 'dashboard.html';
        }
    });
}

// Initialize auth state check
if (typeof waitForFirebase !== 'undefined') {
    waitForFirebase(function(firebaseReady) {
        if (firebaseReady) {
            checkAuthState();
        }
    });
}

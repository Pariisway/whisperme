// Authentication JavaScript for Whisper+me - Enhanced with Page Detection
console.log("Auth.js loaded - Enhanced version");

// Check if we're on auth page
const isAuthPage = window.location.pathname.includes('auth.html') || 
                   window.location.pathname.includes('auth.html') ||
                   document.getElementById('authForm') !== null;

// Initialize only on auth page
if (isAuthPage) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Auth page loaded, initializing auth form...");
        
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type') || 'login';
        
        // Setup auth form based on type
        setupAuthForm(type);
        
        // Setup form submission
        setupFormSubmission();
        
        // Check auth state with delay to prevent loops
        setTimeout(checkAuthState, 1000);
    });
}

// Setup auth form based on type (login/signup)
function setupAuthForm(type) {
    console.log("Setting up auth form for type:", type);
    
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const authBtn = document.getElementById('authBtn');
    const switchText = document.getElementById('switchText');
    const switchLink = document.getElementById('switchLink');
    const authForm = document.getElementById('authForm');
    
    if (!authTitle || !authSubtitle || !authBtn || !switchText || !switchLink || !authForm) {
        console.log("Not on auth page or elements not found yet, retrying...");
        setTimeout(() => setupAuthForm(type), 500);
        return;
    }
    
    console.log("Auth form elements found, proceeding with setup...");
    
    if (type === 'signup') {
        // Setup signup form
        authTitle.textContent = 'Create Your Whisper Account';
        authSubtitle.textContent = 'Join our community and start meaningful conversations today';
        authBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        switchText.innerHTML = 'Already part of our community? ';
        switchLink.textContent = 'Sign in here';
        switchLink.href = 'auth.html?type=login';
        
        // Add confirm password field if it doesn't exist
        if (!document.getElementById('confirmPassword')) {
            const confirmPasswordField = `
                <div class="form-group">
                    <label for="confirmPassword"><i class="fas fa-lock"></i> Confirm Password</label>
                    <input type="password" id="confirmPassword" class="form-control" placeholder="Confirm your password" required>
                    <small class="form-text">For your security, please confirm your password</small>
                </div>
            `;
            const passwordField = document.querySelector('[for="password"]').parentElement;
            if (passwordField) {
                passwordField.insertAdjacentHTML('afterend', confirmPasswordField);
            }
        }
    } else {
        // Setup login form
        authTitle.textContent = 'Welcome Back to Whisper';
        authSubtitle.textContent = 'Continue your journey of meaningful connections';
        authBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In to Your Account';
        switchText.innerHTML = 'New to Whisper? ';
        switchLink.textContent = 'Join our community';
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
    if (!authForm) {
        console.error("Auth form not found");
        return;
    }
    
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
            showAuthMessage('Please fill in all required fields', 'error');
            return;
        }
        
        if (type === 'signup') {
            if (!confirmPassword) {
                showAuthMessage('Please confirm your password', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showAuthMessage('Passwords do not match. Please try again', 'error');
                return;
            }
            
            if (password.length < 6) {
                showAuthMessage('Password must be at least 6 characters long', 'error');
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
        showAuthMessage('Creating your secure account...', 'info');
        
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
            try {
                // Create user document
                await db.collection('users').doc(user.uid).set({
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    tokens: 5, // Give 5 free tokens for new users
                    role: 'user'
                });
                
                // Create initial user stats
                await db.collection('userStats').doc(user.uid).set({
                    earnings: 0,
                    calls: 0,
                    rating: 0,
                    totalRatingCount: 0,
                    activeTime: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Create initial profile
                await db.collection('profiles').doc(user.uid).set({
                    userId: user.uid,
                    email: email,
                    displayName: email.split('@')[0],
                    username: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
                    available: true,
                    bio: 'Just joined Whisper! Ready for meaningful conversations.',
                    profilePicture: '',
                    interests: ['conversation', 'listening', 'connection'],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Create welcome transaction
                await db.collection('transactions').add({
                    userId: user.uid,
                    type: 'welcome',
                    amount: 0,
                    tokens: 5,
                    description: 'Welcome bonus tokens',
                    status: 'completed',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
            } catch (firestoreError) {
                console.warn("Firestore setup warning:", firestoreError);
                // Continue even if Firestore has issues
            }
        }
        
        showAuthMessage('🎉 Account created successfully! Welcome to Whisper!', 'success');
        
        // Send email verification
        try {
            await user.sendEmailVerification();
            showAuthMessage('📧 Verification email sent. Please check your inbox.', 'info');
        } catch (emailError) {
            console.log("Email verification optional:", emailError);
        }
        
        // Redirect to dashboard after delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2500);
        
    } catch (error) {
        console.error("Sign up error:", error);
        
        let errorMessage = 'Unable to create account: ';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email is already registered. Try signing in instead.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Use at least 6 characters.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your connection.';
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
        showAuthMessage('Signing you in...', 'info');
        
        // Check if Firebase auth is available
        if (typeof auth === 'undefined') {
            throw new Error('Authentication service not available. Please refresh the page.');
        }
        
        // Sign in with email and password
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log("User logged in:", user.uid);
        
        showAuthMessage('✅ Welcome back! Redirecting to your dashboard...', 'success');
        
        // Redirect to dashboard after delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error("Login error:", error);
        
        let errorMessage = 'Unable to sign in: ';
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email. Please sign up first.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many login attempts. Please try again later.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your connection.';
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
    if (!authMessage) {
        console.log("Auth message element not found on this page");
        return;
    }
    
    authMessage.textContent = message;
    authMessage.className = `alert alert-${type}`;
    authMessage.style.display = 'flex';
    authMessage.style.animation = 'slideIn 0.3s ease';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        if (authMessage) {
            authMessage.style.display = 'none';
        }
    }, 5000);
}

// Check if user is already logged in
function checkAuthState() {
    if (typeof auth === 'undefined') {
        console.log("Auth not available yet, retrying...");
        setTimeout(checkAuthState, 500);
        return;
    }
    
    auth.onAuthStateChanged(function(user) {
        if (!user) {
            // No user, stay on auth page
            return;
        }
        
        // User is logged in, check if we're on auth page
        if (window.location.pathname.includes('auth.html')) {
            console.log("User already logged in, redirecting to dashboard");
            showAuthMessage('Already signed in. Redirecting...', 'info');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        }
    });
}

// Make functions available globally
window.showAuthMessage = showAuthMessage;
window.checkAuthState = checkAuthState;

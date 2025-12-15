// Auth.js - Fixed with proper loading handling
console.log('Auth.js loaded');

let authInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth page DOM loaded');
    
    // Get auth type from URL
    const urlParams = new URLSearchParams(window.location.search);
    const authType = urlParams.get('type') || 'login';
    
    // Create auth form
    createAuthForm(authType);
    
    // Initialize Firebase auth
    initAuth();
});

function createAuthForm(type) {
    const container = document.getElementById('authContainer');
    if (!container) return;
    
    const isLogin = type === 'login';
    const title = isLogin ? 'Welcome Back' : 'Create Account';
    const buttonText = isLogin ? 'Sign In' : 'Sign Up';
    const switchText = isLogin ? "Don't have an account?" : 'Already have an account?';
    const switchLink = isLogin ? 'signup' : 'login';
    const switchButtonText = isLogin ? 'Sign Up' : 'Sign In';
    
    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            <h2 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">${title}</h2>
            <p style="color: var(--text-muted);">${isLogin ? 'Sign in to your account' : 'Start your journey today'}</p>
        </div>
        
        <form id="authForm" style="display: flex; flex-direction: column; gap: 1.5rem;">
            <div class="form-group">
                <label for="email" class="form-label">Email Address</label>
                <input type="email" id="email" class="form-control" placeholder="you@example.com" required>
            </div>
            
            <div class="form-group">
                <label for="password" class="form-label">Password</label>
                <input type="password" id="password" class="form-control" placeholder="••••••••" required minlength="6">
            </div>
            
            ${!isLogin ? `
            <div class="form-group">
                <label for="displayName" class="form-label">Display Name</label>
                <input type="text" id="displayName" class="form-control" placeholder="How you'll appear">
            </div>
            ` : ''}
            
            <div style="margin-top: 1rem;">
                <button type="submit" id="submitBtn" class="btn btn-primary" style="width: 100%;">
                    <i class="fas fa-spinner fa-spin" style="display: none;"></i>
                    <span>${buttonText}</span>
                </button>
            </div>
            
            <div style="text-align: center; margin-top: 1rem; color: var(--text-muted);">
                <p>${switchText} <a href="auth.html?type=${switchLink}" style="color: var(--plus-green); text-decoration: none;">${switchButtonText}</a></p>
            </div>
            
            ${isLogin ? `
            <div style="text-align: center; margin-top: 1rem;">
                <a href="#" onclick="resetPassword()" style="color: var(--text-muted); text-decoration: none; font-size: 0.9rem;">
                    Forgot your password?
                </a>
            </div>
            ` : ''}
        </form>
        
        <div id="authError" style="display: none; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 1rem; margin-top: 1.5rem; color: #ef4444;"></div>
        
        <div id="authSuccess" style="display: none; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 1rem; margin-top: 1.5rem; color: #10b981;"></div>
    `;
    
    // Add form submit handler
    document.getElementById('authForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (isLogin) {
            handleLogin();
        } else {
            handleSignup();
        }
    });
}

function initAuth() {
    console.log('Initializing auth...');
    
    // Wait for Firebase to be ready
    const checkFirebase = setInterval(() => {
        if (window.firebase && firebase.auth) {
            clearInterval(checkFirebase);
            authInitialized = true;
            console.log('✅ Auth initialized');
            
            // Check if user is already logged in
            const user = firebase.auth().currentUser;
            if (user) {
                console.log('User already logged in, redirecting to dashboard...');
                window.location.href = 'dashboard.html';
            }
        }
    }, 100);
    
    // Timeout after 10 seconds
    setTimeout(() => {
        if (!authInitialized) {
            console.warn('⚠️ Firebase auth initialization timed out');
            showError('Firebase not responding. Please refresh the page.');
        }
    }, 10000);
}

async function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = document.getElementById('submitBtn');
    const errorDiv = document.getElementById('authError');
    const successDiv = document.getElementById('authSuccess');
    
    // Reset messages
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    // Validate
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    // Show loading
    submitBtn.disabled = true;
    submitBtn.querySelector('i').style.display = 'inline-block';
    submitBtn.querySelector('span').textContent = 'Signing in...';
    
    try {
        const auth = firebase.auth();
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        console.log('✅ Login successful:', userCredential.user.email);
        
        // Show success message
        successDiv.innerHTML = '<i class="fas fa-check-circle"></i> Login successful! Redirecting...';
        successDiv.style.display = 'block';
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Login error:', error);
        
        let errorMessage = 'Login failed. ';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage += 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Incorrect password.';
                break;
            case 'auth/too-many-requests':
                errorMessage += 'Too many failed attempts. Try again later.';
                break;
            case 'auth/network-request-failed':
                errorMessage += 'Network error. Check your connection.';
                break;
            default:
                errorMessage += error.message;
        }
        
        showError(errorMessage);
        submitBtn.disabled = false;
        submitBtn.querySelector('i').style.display = 'none';
        submitBtn.querySelector('span').textContent = 'Sign In';
    }
}

async function handleSignup() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const displayName = document.getElementById('displayName')?.value.trim() || email.split('@')[0];
    const submitBtn = document.getElementById('submitBtn');
    const errorDiv = document.getElementById('authError');
    const successDiv = document.getElementById('authSuccess');
    
    // Reset messages
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    // Validate
    if (!email || !password) {
        showError('Please fill in all required fields');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    // Show loading
    submitBtn.disabled = true;
    submitBtn.querySelector('i').style.display = 'inline-block';
    submitBtn.querySelector('span').textContent = 'Creating account...';
    
    try {
        const auth = firebase.auth();
        const db = firebase.firestore();
        
        // Create user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update profile
        await user.updateProfile({
            displayName: displayName
        });
        
        // Create user document
        await db.collection('users').doc(user.uid).set({
            email: email,
            displayName: displayName,
            coins: 0,
            totalCalls: 0,
            totalEarnings: 0,
            averageRating: 0,
            available: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        // Create profile document
        await db.collection('profiles').doc(user.uid).set({
            userId: user.uid,
            displayName: displayName,
            username: displayName.toLowerCase().replace(/\s+/g, ''),
            bio: '',
            callPrice: 1,
            available: false,
            rating: 0,
            totalCalls: 0,
            photoURL: '',
            social: {},
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        console.log('✅ Signup successful:', user.email);
        
        // Show success message
        successDiv.innerHTML = '<i class="fas fa-check-circle"></i> Account created! Redirecting...';
        successDiv.style.display = 'block';
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('❌ Signup error:', error);
        
        let errorMessage = 'Signup failed. ';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'Email already registered.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Invalid email address.';
                break;
            case 'auth/weak-password':
                errorMessage += 'Password is too weak.';
                break;
            case 'auth/network-request-failed':
                errorMessage += 'Network error. Check your connection.';
                break;
            default:
                errorMessage += error.message;
        }
        
        showError(errorMessage);
        submitBtn.disabled = false;
        submitBtn.querySelector('i').style.display = 'none';
        submitBtn.querySelector('span').textContent = 'Sign Up';
    }
}

async function resetPassword() {
    const email = prompt('Enter your email address to reset password:');
    if (!email) return;
    
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        alert('Password reset email sent! Check your inbox.');
    } catch (error) {
        console.error('Password reset error:', error);
        alert('Error: ' + error.message);
    }
}

function showError(message) {
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorDiv.style.display = 'block';
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('authSuccess');
    if (successDiv) {
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        successDiv.style.display = 'block';
    }
}

// Authentication JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log("Auth.js loaded");
    
    // Check if we're on an auth page
    if (window.location.pathname.includes('auth.html')) {
        setupAuthPage();
    }
    
    // Check auth state for all pages
    if (typeof auth !== 'undefined') {
        checkAuthState();
    }
});

// Setup authentication page
function setupAuthPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'login';
    
    // Update page based on type
    if (type === 'signup') {
        document.getElementById('authTitle').textContent = 'Sign Up';
        document.getElementById('authSubtitle').textContent = 'Create your account to get started';
        document.getElementById('authBtn').innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
        document.getElementById('switchLink').textContent = 'Already have an account? Login here';
        document.getElementById('switchLink').href = 'auth.html?type=login';
    }
    
    // Setup form submission
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.addEventListener('click', handleAuth);
    }
}

// Handle authentication
async function handleAuth() {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    const messageEl = document.getElementById('authMessage');
    
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error', messageEl);
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'login';
    
    try {
        if (type === 'signup') {
            // Sign up
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Create user profile in Firestore
            await db.collection('profiles').doc(user.uid).set({
                email: user.email,
                displayName: user.email.split('@')[0],
                createdAt: new Date().toISOString(),
                available: true,
                tokens: 0,
                callsCompleted: 0,
                totalEarnings: 0,
                rating: 4.5
            });
            
            showMessage('Account created successfully!', 'success', messageEl);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } else {
            // Login
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            showMessage('Login successful!', 'success', messageEl);
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        }
    } catch (error) {
        console.error("Auth error:", error);
        
        // Handle specific error cases
        let errorMessage = error.message;
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password';
        } else if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email already in use';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password should be at least 6 characters';
        }
        
        showMessage('Error: ' + errorMessage, 'error', messageEl);
    }
}

// Check auth state for all pages
function checkAuthState() {
    if (typeof auth === 'undefined') {
        console.log("Auth not initialized");
        return;
    }
    
    auth.onAuthStateChanged((user) => {
        const loginBtn = document.getElementById('loginBtn');
        const dashboardBtn = document.getElementById('dashboardBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (user) {
            // User is signed in
            console.log("User is signed in:", user.email);
            if (loginBtn) loginBtn.style.display = 'none';
            if (dashboardBtn) {
                dashboardBtn.style.display = 'flex';
                dashboardBtn.href = "dashboard.html";
            }
            if (logoutBtn) logoutBtn.style.display = 'flex';
        } else {
            // User is signed out
            console.log("User is signed out");
            if (loginBtn) loginBtn.style.display = 'flex';
            if (dashboardBtn) dashboardBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    });
}

// Show message
function showMessage(message, type, element) {
    if (!element) return;
    
    element.textContent = message;
    element.className = `alert alert-${type}`;
    element.style.display = 'block';
    
    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
}

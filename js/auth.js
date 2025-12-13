// Authentication JavaScript
document.addEventListener('DOMContentLoaded', function() {
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
function handleAuth() {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    const messageEl = document.getElementById('authMessage');
    
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error', messageEl);
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'login';
    
    if (type === 'signup') {
        // Sign up
        if (typeof auth !== 'undefined') {
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    showMessage('Account created successfully!', 'success', messageEl);
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                })
                .catch((error) => {
                    showMessage('Error: ' + error.message, 'error', messageEl);
                });
        } else {
            // Demo mode
            showMessage('Success! Redirecting...', 'success', messageEl);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        }
    } else {
        // Login
        if (typeof auth !== 'undefined') {
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    showMessage('Login successful!', 'success', messageEl);
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                })
                .catch((error) => {
                    showMessage('Error: ' + error.message, 'error', messageEl);
                });
        } else {
            // Demo mode
            showMessage('Success! Redirecting...', 'success', messageEl);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        }
    }
}

// Check auth state
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        const loginBtn = document.getElementById('loginBtn');
        const dashboardBtn = document.getElementById('dashboardBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (user) {
            // User is signed in
            if (loginBtn) loginBtn.style.display = 'none';
            if (dashboardBtn) {
                dashboardBtn.style.display = 'flex';
                dashboardBtn.href = "dashboard.html";
            }
            if (logoutBtn) logoutBtn.style.display = 'flex';
        } else {
            // User is signed out
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

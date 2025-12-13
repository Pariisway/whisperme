// Main Application for Home Page
document.addEventListener('DOMContentLoaded', function() {
    console.log("Whisper+me Home Page loaded");
    
    // Mobile menu toggle
    const mobileMenu = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenu && navLinks) {
        mobileMenu.addEventListener('click', function() {
            navLinks.classList.toggle('show');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!mobileMenu.contains(event.target) && !navLinks.contains(event.target)) {
                navLinks.classList.remove('show');
            }
        });
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get filter value
            const filter = this.getAttribute('data-filter');
            loadWhispers(filter);
        });
    });
    
    // Modal close functionality
    const modal = document.getElementById('callModal');
    const closeModal = document.querySelector('.close-modal');
    
    if (modal && closeModal) {
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Check if user is logged in and update UI
    checkAuthState();
    
    // Load stats
    loadStats();
    
    // Load whispers
    loadWhispers('all');
});

// Check authentication state
function checkAuthState() {
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(function(user) {
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
    
    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof auth !== 'undefined') {
                auth.signOut().then(() => {
                    window.location.reload();
                }).catch(error => {
                    console.error("Logout error:", error);
                });
            }
        });
    }
}

// Load stats from Firebase
async function loadStats() {
    try {
        // In a real app, you would have stats collection
        // For demo, we'll use some default values
        document.getElementById('activeWhispers').textContent = '24';
        document.getElementById('totalCalls').textContent = '1,234';
        document.getElementById('totalEarned').textContent = '$18,510';
        
    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

// Load whispers from Firebase
async function loadWhispers(filter = 'all') {
    const container = document.getElementById('whispersContainer');
    if (!container) return;
    
    // Show loading
    container.innerHTML = `
        <div class="loading" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
            <i class="fas fa-spinner fa-spin fa-3x" style="color: var(--primary-blue);"></i>
            <p style="margin-top: 1rem;">Loading whispers...</p>
        </div>
    `;
    
    try {
        let query = db.collection('profiles');
        
        // Apply filters
        if (filter === 'online') {
            query = query.where('available', '==', true);
        }
        
        // Get whispers
        const snapshot = await query.limit(12).get();
        
        // Clear container
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-users-slash fa-3x" style="color: var(--gray-light); margin-bottom: 1rem;"></i>
                    <h3>No whispers available</h3>
                    <p>Be the first to sign up and start whispering!</p>
                    <a href="auth.html?type=signup" class="btn btn-primary" style="margin-top: 1rem;">
                        <i class="fas fa-user-plus"></i> Sign Up Now
                    </a>
                </div>
            `;
            return;
        }
        
        snapshot.forEach(doc => {
            const whisper = doc.data();
            const card = createWhisperCard(whisper, doc.id);
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error("Error loading whispers:", error);
        container.innerHTML = `
            <div class="error" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-exclamation-triangle fa-3x" style="color: var(--danger); margin-bottom: 1rem;"></i>
                <h3>Error loading whispers</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// Create a whisper card element
function createWhisperCard(whisper, id) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.dataset.id = id;
    
    const statusClass = whisper.available ? 'available' : 'unavailable';
    const statusText = whisper.available ? 'Available Now' : 'Currently Busy';
    
    card.innerHTML = `
        <div class="profile-header">
            <img src="https://via.placeholder.com/400x200/4361ee/ffffff?text=Whisper+me" 
                 alt="Profile Background" 
                 class="profile-bg">
            <img src="${whisper.profilePicture || 'https://i.pravatar.cc/120?img=' + Math.floor(Math.random() * 70)}" 
                 alt="${whisper.displayName || 'User'}" 
                 class="profile-avatar">
        </div>
        <div class="profile-body">
            <h3 class="profile-name">${whisper.displayName || 'Anonymous User'}</h3>
            <div class="status ${statusClass}">
                <i class="fas fa-circle"></i> ${statusText}
            </div>
            <p class="profile-bio">${whisper.bio || 'No bio yet'}</p>
            
            <div class="profile-stats">
                <div class="stat-item">
                    <div class="stat-value">${whisper.callsCompleted || 0}</div>
                    <div class="stat-label">Calls</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${whisper.rating || '4.5'}</div>
                    <div class="stat-label">Rating</div>
                </div>
            </div>

            <div class="token-price">
                <i class="fas fa-coins"></i> $15 per 5-minute call
            </div>

            <button class="call-btn" ${!whisper.available ? 'disabled' : ''}>
                <i class="fas fa-phone"></i> Start Call (1 Token)
            </button>
        </div>
    `;
    
    // Add click event to call button
    const callBtn = card.querySelector('.call-btn');
    if (callBtn) {
        callBtn.addEventListener('click', function() {
            showCallModal(whisper);
        });
    }
    
    return card;
}

// Show call modal
function showCallModal(whisper) {
    const modal = document.getElementById('callModal');
    const modalBody = document.getElementById('callModalBody');
    
    if (!modal || !modalBody) return;
    
    modalBody.innerHTML = `
        <div class="token-modal">
            <h3>Start Call with ${whisper.displayName || 'User'}</h3>
            <p>You need 1 Whisper token to start a 5-minute call.</p>
            <p><strong>Each token costs $15 and gives you one 5-minute private conversation.</strong></p>
            
            <div class="profile-info" style="text-align: center; margin: 1.5rem 0;">
                <img src="${whisper.profilePicture || 'https://i.pravatar.cc/80?img=' + Math.floor(Math.random() * 70)}" 
                     alt="${whisper.displayName || 'User'}" 
                     style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 1rem; border: 3px solid var(--primary-blue);">
                <h4>${whisper.displayName || 'Anonymous User'}</h4>
                <p style="color: var(--gray); font-size: 0.9rem;">${whisper.bio || 'No bio yet'}</p>
                <p><strong>Rating:</strong> ${whisper.rating || '4.5'} ★</p>
            </div>
            
            <div class="token-price-display" style="margin: 1.5rem 0;">
                <i class="fas fa-coins"></i> 1 Token = $15 = 5 Minutes
            </div>
            
            <div class="modal-buttons" style="display: flex; gap: 1rem; margin-top: 2rem;">
                <button id="buyTokensBtn" class="btn btn-primary" style="flex: 1;">
                    <i class="fas fa-coins"></i> Buy Tokens First
                </button>
                <button id="startCallBtn" class="btn btn-success" style="flex: 1;" ${!whisper.available ? 'disabled' : ''}>
                    <i class="fas fa-phone"></i> Start Call Now
                </button>
                <button id="cancelModalBtn" class="btn btn-secondary" style="flex: 1;">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Add event listeners
    document.getElementById('buyTokensBtn').addEventListener('click', function() {
        window.location.href = 'auth.html?type=login';
        modal.style.display = 'none';
    });
    
    document.getElementById('startCallBtn').addEventListener('click', function() {
        if (whisper.available) {
            // Check if user is logged in
            auth.onAuthStateChanged(function(user) {
                if (user) {
                    alert('Starting call...');
                    window.location.href = 'call.html';
                } else {
                    alert('Please login first to start a call.');
                    window.location.href = 'auth.html?type=login';
                }
            });
        }
    });
    
    document.getElementById('cancelModalBtn').addEventListener('click', function() {
        modal.style.display = 'none';
    });
}

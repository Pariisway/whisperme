// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log("Dashboard loaded");
    
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
    
    // Check authentication
    checkAuth();
    
    // Load dashboard data
    loadDashboardData();
    
    // Load whispers
    loadWhispers();
    
    // Setup logout
    setupLogout();
    
    // Setup call modal
    setupCallModal();
});

// Check if user is authenticated
function checkAuth() {
    if (typeof auth === 'undefined') {
        console.error("Firebase auth not initialized");
        return;
    }
    
    auth.onAuthStateChanged(function(user) {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = 'auth.html?redirect=dashboard';
        } else {
            // Update UI with user info
            updateUserInfo(user);
        }
    });
}

// Update user info in dashboard
function updateUserInfo(user) {
    const welcomeElement = document.querySelector('.welcome-message p');
    if (welcomeElement && user.email) {
        const displayName = user.displayName || user.email.split('@')[0];
        welcomeElement.textContent = `Welcome back, ${displayName}! Here's your activity overview`;
    }
}

// Load dashboard data
function loadDashboardData() {
    // Demo data - in a real app, this would come from Firebase
    setTimeout(() => {
        document.getElementById('tokenBalance').innerHTML = '5 <small style="font-size: 1rem;">tokens</small>';
        document.getElementById('totalEarnings').textContent = '$124.50';
        document.getElementById('callsCompleted').textContent = '12';
        document.getElementById('averageRating').textContent = '4.8 ★';
        document.getElementById('activeTime').textContent = '3h 45m';
    }, 1000);
}

// Load whispers for dashboard
function loadWhispers() {
    const container = document.getElementById('dashboardWhispers');
    if (!container) return;
    
    // Demo whispers data
    const demoWhispers = [
        {
            id: 1,
            name: "Alex Johnson",
            bio: "Professional listener with 5+ years experience",
            status: "available",
            calls: 124,
            rating: 4.8
        },
        {
            id: 2,
            name: "Sam Wilson",
            bio: "Life coach specializing in career advice",
            status: "available",
            calls: 89,
            rating: 4.9
        },
        {
            id: 3,
            name: "Taylor Swift",
            bio: "Music therapist and conversation partner",
            status: "unavailable",
            calls: 256,
            rating: 4.7
        }
    ];
    
    // Clear loading message
    container.innerHTML = '';
    
    // Create whisper cards
    demoWhispers.forEach(whisper => {
        const card = createWhisperCard(whisper);
        container.appendChild(card);
    });
}

// Create a whisper card for dashboard
function createWhisperCard(whisper) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.dataset.id = whisper.id;
    
    const statusClass = whisper.status === 'available' ? 'available' : 'unavailable';
    const statusText = whisper.status === 'available' ? 'Available Now' : 'Currently Busy';
    
    card.innerHTML = `
        <div class="profile-header">
            <img src="https://via.placeholder.com/300x200/7b2cbf/ffffff?text=Whisper+me" 
                 alt="Profile Background" 
                 class="profile-bg">
            <img src="https://i.pravatar.cc/100?img=${whisper.id}" 
                 alt="${whisper.name}" 
                 class="profile-avatar">
        </div>
        <div class="profile-body">
            <h3 class="profile-name">${whisper.name}</h3>
            <div class="status ${statusClass}">${statusText}</div>
            <p class="profile-bio">${whisper.bio}</p>
            
            <div class="profile-stats">
                <div class="stat-item">
                    <div class="stat-value">${whisper.calls}</div>
                    <div class="stat-label">Calls</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${whisper.rating}</div>
                    <div class="stat-label">Rating</div>
                </div>
            </div>

            <button class="call-btn" ${whisper.status !== 'available' ? 'disabled' : ''}>
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

// Setup logout functionality
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof auth !== 'undefined') {
                auth.signOut().then(() => {
                    window.location.href = 'index.html';
                }).catch(error => {
                    console.error("Logout error:", error);
                    alert('Error logging out: ' + error.message);
                });
            }
        });
    }
}

// Setup call modal
function setupCallModal() {
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
}

// Show call modal with whisper info
function showCallModal(whisper) {
    const modal = document.getElementById('callModal');
    const modalBody = document.getElementById('callModalBody');
    
    if (!modal || !modalBody) return;
    
    modalBody.innerHTML = `
        <div class="token-modal">
            <h3>Start Call with ${whisper.name}</h3>
            <p>You need 1 Whisper token to start a 5-minute call.</p>
            <p>Each token costs $15 and gives you one 5-minute private conversation.</p>
            
            <div class="profile-info" style="text-align: center; margin: 1.5rem 0;">
                <img src="https://i.pravatar.cc/80?img=${whisper.id}" 
                     alt="${whisper.name}" 
                     style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 1rem;">
                <h4>${whisper.name}</h4>
                <p style="color: #666; font-size: 0.9rem;">${whisper.bio}</p>
                <p><strong>Rating:</strong> ${whisper.rating} ★</p>
                <p><strong>Completed Calls:</strong> ${whisper.calls}</p>
            </div>
            
            <div class="modal-buttons" style="display: flex; gap: 1rem; margin-top: 2rem;">
                <button id="buyTokensBtn" class="btn btn-primary" style="flex: 1;">
                    <i class="fas fa-coins"></i> Buy Tokens First
                </button>
                <button id="startCallBtn" class="btn btn-success" style="flex: 1;" ${whisper.status !== 'available' ? 'disabled' : ''}>
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
        window.location.href = 'payment.html';
        modal.style.display = 'none';
    });
    
    document.getElementById('startCallBtn').addEventListener('click', function() {
        if (whisper.status === 'available') {
            alert('Starting call with ' + whisper.name + '...');
            // In a real app, this would redirect to the call interface
            modal.style.display = 'none';
        }
    });
    
    document.getElementById('cancelModalBtn').addEventListener('click', function() {
        modal.style.display = 'none';
    });
}

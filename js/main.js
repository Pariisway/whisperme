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
            console.log("Filtering by:", filter);
            
            // Here you would filter whispers based on the filter value
            // For now, we'll just log it
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
    
    // Load whispers (demo data for now)
    loadDemoWhispers();
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

// Load demo whispers for homepage
function loadDemoWhispers() {
    const container = document.getElementById('whispersContainer');
    if (!container) return;
    
    // Demo whispers data
    const demoWhispers = [
        {
            id: 1,
            name: "Alex Johnson",
            bio: "Professional listener with 5+ years experience in counseling",
            status: "available",
            calls: 124,
            rating: 4.8,
            social: {
                twitter: "#",
                instagram: "#"
            }
        },
        {
            id: 2,
            name: "Sam Wilson",
            bio: "Life coach specializing in career advice and motivation",
            status: "available",
            calls: 89,
            rating: 4.9,
            social: {
                instagram: "#",
                tiktok: "#"
            }
        },
        {
            id: 3,
            name: "Taylor Swift",
            bio: "Music therapist and conversation partner",
            status: "unavailable",
            calls: 256,
            rating: 4.7,
            social: {
                twitter: "#",
                instagram: "#"
            }
        },
        {
            id: 4,
            name: "Jordan Lee",
            bio: "Mindfulness coach and meditation guide",
            status: "available",
            calls: 67,
            rating: 4.6,
            social: {
                twitter: "#"
            }
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

// Create a whisper card element
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

            <div class="social-links">
                ${whisper.social.twitter ? `<a href="${whisper.social.twitter}"><i class="fab fa-twitter"></i></a>` : ''}
                ${whisper.social.instagram ? `<a href="${whisper.social.instagram}"><i class="fab fa-instagram"></i></a>` : ''}
                ${whisper.social.tiktok ? `<a href="${whisper.social.tiktok}"><i class="fab fa-tiktok"></i></a>` : ''}
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

// Show call modal
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
            alert('In a real app, this would start the call process. Redirecting to call interface...');
            modal.style.display = 'none';
        }
    });
    
    document.getElementById('cancelModalBtn').addEventListener('click', function() {
        modal.style.display = 'none';
    });
}

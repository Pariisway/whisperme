// Main JavaScript for Whisper+me
console.log("Whisper+me Home Page loaded");

// Check auth state on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(function(user) {
            if (user) {
                // User is signed in
                console.log("User is signed in:", user.email);
                updateAuthUI(true, user.email);
                loadWhispers();
            } else {
                // User is signed out
                console.log("No user signed in");
                updateAuthUI(false);
                loadWhispers();
            }
        });
    } else {
        console.log("Firebase not initialized yet");
        loadWhispers();
    }
    
    // Setup mobile menu
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('show');
        });
    }
});

// Update UI based on auth state
function updateAuthUI(isLoggedIn, email = '') {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');
    const signupBtn = document.getElementById('signupBtn');
    
    if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'block';
    if (logoutBtn) logoutBtn.style.display = isLoggedIn ? 'block' : 'none';
    if (dashboardBtn) dashboardBtn.style.display = isLoggedIn ? 'block' : 'none';
    if (signupBtn) signupBtn.style.display = isLoggedIn ? 'none' : 'block';
}

// Load whispers (simplified version)
async function loadWhispers() {
    const whispersContainer = document.getElementById('whispersContainer');
    if (!whispersContainer) return;
    
    try {
        // Show loading
        whispersContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Loading whispers...</p></div>';
        
        // If Firebase is available, try to load real data
        if (typeof db !== 'undefined' && auth.currentUser) {
            const profilesSnapshot = await db.collection('profiles')
                .where('available', '==', true)
                .limit(6)
                .get();
            
            if (!profilesSnapshot.empty) {
                whispersContainer.innerHTML = '';
                profilesSnapshot.forEach(doc => {
                    const profile = doc.data();
                    whispersContainer.appendChild(createWhisperCard(profile));
                });
                return;
            }
        }
        
        // Fallback: Show demo whispers
        whispersContainer.innerHTML = '';
        
        // Demo data
        const demoWhispers = [
            {
                displayName: "Oddwilson365",
                username: "oddwilson.com",
                bio: "Life coach specializing in career transitions and personal growth.",
                profilePicture: "https://i.pravatar.cc/150?img=1",
                calls: 42,
                rating: 4.8,
                earnings: 504
            },
            {
                displayName: "IliGee",
                username: "iligee",
                bio: "Mental health advocate and mindfulness practitioner. Let's talk about self-care.",
                profilePicture: "https://i.pravatar.cc/150?img=2",
                calls: 28,
                rating: 4.9,
                earnings: 336
            },
            {
                displayName: "Sarah Wisdom",
                username: "sarahw",
                bio: "Relationship expert with 10+ years experience helping people connect.",
                profilePicture: "https://i.pravatar.cc/150?img=3",
                calls: 65,
                rating: 4.7,
                earnings: 780
            }
        ];
        
        demoWhispers.forEach(whisper => {
            whispersContainer.appendChild(createWhisperCard(whisper));
        });
        
    } catch (error) {
        console.error("Error loading whispers:", error);
        whispersContainer.innerHTML = '<div class="alert alert-error">Error loading whispers. Please refresh the page.</div>';
    }
}

// Create whisper card
function createWhisperCard(profile) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    
    card.innerHTML = `
        <div class="profile-header">
            <img src="${profile.profilePicture || 'https://i.pravatar.cc/400?img=' + Math.floor(Math.random() * 70)}" 
                 alt="${profile.displayName}" class="profile-bg">
            <div class="profile-avatar">
                <img src="${profile.profilePicture || 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70)}" 
                     alt="${profile.displayName}">
            </div>
        </div>
        <div class="profile-body">
            <h3 class="profile-name">${profile.displayName}</h3>
            <p class="profile-username">@${profile.username}</p>
            <div class="status available">
                <i class="fas fa-circle"></i> Available Now
            </div>
            <p class="profile-bio">${profile.bio}</p>
            
            <div class="profile-stats">
                <div class="stat-item">
                    <div class="stat-value">${profile.calls || 0}</div>
                    <div class="stat-label">Calls</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${profile.rating || '4.8'}</div>
                    <div class="stat-label">Rating</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">$${profile.earnings || 0}</div>
                    <div class="stat-label">Earned</div>
                </div>
            </div>
            
            <div class="token-price">
                <i class="fas fa-coins"></i> $15 per 5-min call
            </div>
            
            <button class="call-btn btn-primary" onclick="handleCallButton()">
                <i class="fas fa-phone-alt"></i> Start Call
            </button>
        </div>
    `;
    
    return card;
}

// Handle call button click
function handleCallButton() {
    if (typeof auth === 'undefined' || !auth.currentUser) {
        alert('Please login to start a call');
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    // Check if user has tokens
    if (typeof db !== 'undefined') {
        // In real app, check token balance
        alert('Call feature requires tokens. Redirecting to purchase page...');
        window.location.href = 'payment.html';
    } else {
        alert('Please login to use call features');
        window.location.href = 'auth.html?type=login';
    }
}

// Filter whispers
function filterWhispers(filter) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Simple filter - in real app, this would filter the data
    const cards = document.querySelectorAll('.profile-card');
    if (filter === 'online') {
        // All cards with "Available" status
        cards.forEach(card => {
            const status = card.querySelector('.status');
            card.style.display = status.classList.contains('available') ? 'block' : 'none';
        });
    } else {
        cards.forEach(card => card.style.display = 'block');
    }
}

// Initialize filter buttons
document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            filterWhispers(filter);
        });
    });
});

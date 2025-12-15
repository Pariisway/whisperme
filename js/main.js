// Main JavaScript for Whisper+me
console.log("Whisper+me Home Page loaded");

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOM loaded, initializing...");
    
    // Check auth state
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(async function(user) {
            console.log("Auth state changed:", user ? "Logged in" : "Logged out");
            
            if (user) {
                // User is signed in
                updateAuthUI(true, user.email);
                await loadWhispers();
            } else {
                // User is signed out
                updateAuthUI(false);
                await loadWhispers();
            }
        });
    } else {
        console.log("Firebase not initialized yet, loading whispers anyway");
        await loadWhispers();
    }
    
    // Setup mobile menu
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('show');
        });
        
        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('show');
            });
        });
    }
    
    // Setup filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            const filter = this.getAttribute('data-filter');
            filterWhispers(filter);
        });
    });
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

// Load whispers from Firestore or show demo
async function loadWhispers() {
    const whispersContainer = document.getElementById('whispersContainer');
    if (!whispersContainer) return;
    
    try {
        // Show loading
        whispersContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Loading whispers...</p></div>';
        
        // If Firebase is available and user is logged in, try to load real data
        if (typeof db !== 'undefined' && auth && auth.currentUser) {
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
        showDemoWhispers();
        
    } catch (error) {
        console.error("Error loading whispers:", error);
        showDemoWhispers();
    }
}

// Show demo whispers
function showDemoWhispers() {
    const whispersContainer = document.getElementById('whispersContainer');
    if (!whispersContainer) return;
    
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
            earnings: 504,
            available: true
        },
        {
            displayName: "IliGee",
            username: "iligee",
            bio: "Mental health advocate and mindfulness practitioner. Let's talk about self-care.",
            profilePicture: "https://i.pravatar.cc/150?img=2",
            calls: 28,
            rating: 4.9,
            earnings: 336,
            available: true
        },
        {
            displayName: "Sarah Wisdom",
            username: "sarahw",
            bio: "Relationship expert with 10+ years experience helping people connect.",
            profilePicture: "https://i.pravatar.cc/150?img=3",
            calls: 65,
            rating: 4.7,
            earnings: 780,
            available: true
        },
        {
            displayName: "Alex Mentor",
            username: "alexm",
            bio: "Tech career coach helping developers advance their careers.",
            profilePicture: "https://i.pravatar.cc/150?img=4",
            calls: 35,
            rating: 4.6,
            earnings: 420,
            available: true
        },
        {
            displayName: "Maya Guide",
            username: "mayag",
            bio: "Wellness coach focused on work-life balance and stress management.",
            profilePicture: "https://i.pravatar.cc/150?img=5",
            calls: 52,
            rating: 4.8,
            earnings: 624,
            available: true
        },
        {
            displayName: "Chris Advisor",
            username: "chrisa",
            bio: "Financial advisor helping with budgeting and investment strategies.",
            profilePicture: "https://i.pravatar.cc/150?img=6",
            calls: 41,
            rating: 4.7,
            earnings: 492,
            available: true
        }
    ];
    
    demoWhispers.forEach(whisper => {
        whispersContainer.appendChild(createWhisperCard(whisper));
    });
}

// Create whisper card HTML
function createWhisperCard(profile) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    
    // Format bio (truncate if too long)
    const bio = profile.bio || 'No bio provided yet.';
    const truncatedBio = bio.length > 120 ? bio.substring(0, 120) + '...' : bio;
    
    // Determine status
    const isAvailable = profile.available !== false; // Default to true if not specified
    const statusText = isAvailable ? 'Available Now' : 'Unavailable';
    const statusClass = isAvailable ? 'available' : 'unavailable';
    
    card.innerHTML = `
        <div class="profile-header">
            <img src="${profile.profilePicture || 'https://i.pravatar.cc/400?img=' + Math.floor(Math.random() * 70)}" 
                 alt="${profile.displayName || 'User'}" class="profile-bg">
            <div class="profile-avatar">
                <img src="${profile.profilePicture || 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70)}" 
                     alt="${profile.displayName || 'User'}">
            </div>
        </div>
        <div class="profile-body">
            <h3 class="profile-name">${profile.displayName || 'Anonymous User'}</h3>
            <p class="profile-username">@${profile.username || 'user'}</p>
            <div class="status ${statusClass}">
                <i class="fas fa-circle"></i> ${statusText}
            </div>
            <p class="profile-bio">${truncatedBio}</p>
            
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
            
            <button class="call-btn btn-primary" onclick="handleCallButton()" ${!isAvailable ? 'disabled' : ''}>
                <i class="fas fa-phone-alt"></i> ${isAvailable ? 'Start Call' : 'Unavailable'}
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

// Filter whispers based on selection
function filterWhispers(filter) {
    const cards = document.querySelectorAll('.profile-card');
    const allButtons = document.querySelectorAll('.filter-btn');
    
    // Update active button
    allButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    cards.forEach(card => {
        switch(filter) {
            case 'online':
                const isOnline = card.querySelector('.status').classList.contains('available');
                card.style.display = isOnline ? 'block' : 'none';
                break;
            case 'popular':
                // Sort by rating (simplified)
                const rating = parseFloat(card.querySelector('.stat-item:nth-child(2) .stat-value').textContent);
                card.style.display = rating >= 4.5 ? 'block' : 'none';
                break;
            case 'new':
                // Show all for now (in real app, would filter by date)
                card.style.display = 'block';
                break;
            default:
                card.style.display = 'block';
        }
    });
}

// Make functions available globally
window.handleCallButton = handleCallButton;
window.filterWhispers = filterWhispers;

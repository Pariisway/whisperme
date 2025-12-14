// Homepage JavaScript for Whisper+me
console.log("Homepage.js loaded");

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Homepage loaded");
    
    // Wait for Firebase
    if (typeof waitForFirebase !== 'undefined') {
        waitForFirebase(function(firebaseReady) {
            if (firebaseReady) {
                loadHomepageWhispers();
            }
        });
    } else {
        // Fallback
        setTimeout(loadSampleWhispers, 1000);
    }
});

// Load whispers for homepage
async function loadHomepageWhispers() {
    const whispersContainer = document.getElementById('homepageWhispers');
    if (!whispersContainer) return;
    
    try {
        // Check if Firebase is available
        if (typeof db === 'undefined') {
            showSampleWhispers(whispersContainer);
            return;
        }
        
        // Try to load real data
        const whispersSnapshot = await db.collection('profiles')
            .where('available', '==', true)
            .limit(8)
            .get();
        
        if (whispersSnapshot.empty) {
            showSampleWhispers(whispersContainer);
            return;
        }
        
        whispersContainer.innerHTML = '';
        
        const promises = [];
        whispersSnapshot.forEach(async (doc) => {
            const profile = doc.data();
            promises.push(createHomepageWhisperCard(doc.id, profile));
        });
        
        // Wait for all cards to be created
        const cards = await Promise.all(promises);
        cards.forEach(card => {
            if (card) whispersContainer.appendChild(card);
        });
        
    } catch (error) {
        console.error("Error loading whispers:", error);
        showSampleWhispers(whispersContainer);
    }
}

// Create homepage whisper card
async function createHomepageWhisperCard(userId, profile) {
    try {
        const card = document.createElement('div');
        card.className = 'profile-card';
        
        // Get user stats if available
        let stats = { calls: 0, rating: 0, earnings: 0 };
        if (typeof db !== 'undefined') {
            try {
                const statsDoc = await db.collection('userStats').doc(userId).get();
                if (statsDoc.exists) {
                    stats = statsDoc.data();
                }
            } catch (error) {
                console.error("Error loading stats:", error);
            }
        }
        
        // Create card HTML
        card.innerHTML = `
            <div class="profile-header">
                <img src="${profile.profilePicture || 'https://images.unsplash.com/photo-1494790108753-0ffa3dd550a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'}" 
                     alt="${profile.displayName || 'User'}" class="profile-bg">
                <div class="profile-avatar">
                    <img src="${profile.profilePicture || 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70)}" 
                         alt="${profile.displayName || 'User'}">
                </div>
            </div>
            <div class="profile-body">
                <h3 class="profile-name">${profile.displayName || 'Anonymous'}</h3>
                <p class="profile-username">@${profile.username || userId.substring(0, 8)}</p>
                <div class="status available">
                    <i class="fas fa-circle"></i> Available Now
                </div>
                
                ${profile.bio ? `<p class="profile-bio" style="margin: 1rem 0; color: var(--text-secondary); font-size: 0.9rem;">${profile.bio.substring(0, 100)}${profile.bio.length > 100 ? '...' : ''}</p>` : ''}
                
                <div class="profile-stats">
                    <div class="stat-item">
                        <div class="stat-value">${stats.calls || 0}</div>
                        <div class="stat-label">Calls</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${(stats.rating || 0).toFixed(1)}</div>
                        <div class="stat-label">Rating</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">$${(stats.earnings || 0).toFixed(0)}</div>
                        <div class="stat-label">Earned</div>
                    </div>
                </div>
                
                <button class="call-btn btn btn-primary" onclick="startCallFromHomepage('${userId}', '${profile.displayName || 'User'}')">
                    <i class="fas fa-phone-alt"></i> Call Now ($15)
                </button>
            </div>
        `;
        
        return card;
        
    } catch (error) {
        console.error("Error creating whisper card:", error);
        return null;
    }
}

// Show sample whispers (fallback)
function showSampleWhispers(container) {
    const sampleWhispers = [
        {
            id: '1',
            name: 'Sarah Chen',
            username: 'sarahc',
            bio: 'Career coach with 10+ years experience helping professionals find their path.',
            calls: 124,
            rating: 4.8,
            earnings: 1860,
            online: true
        },
        {
            id: '2',
            name: 'Marcus Johnson',
            username: 'marcusj',
            bio: 'Academic advisor specializing in college admissions and scholarship applications.',
            calls: 89,
            rating: 4.9,
            earnings: 1335,
            online: true
        },
        {
            id: '3',
            name: 'Priya Patel',
            username: 'priyap',
            bio: 'Life coach focusing on mindfulness, productivity, and work-life balance.',
            calls: 156,
            rating: 4.7,
            earnings: 2340,
            online: true
        },
        {
            id: '4',
            name: 'David Kim',
            username: 'davidk',
            bio: 'Tech mentor helping startups with product development and fundraising.',
            calls: 92,
            rating: 4.8,
            earnings: 1380,
            online: false
        },
        {
            id: '5',
            name: 'Emily Wilson',
            username: 'emilyw',
            bio: 'Relationship counselor with expertise in communication and conflict resolution.',
            calls: 178,
            rating: 4.6,
            earnings: 2670,
            online: true
        },
        {
            id: '6',
            name: 'Michael Brown',
            username: 'michaelb',
            bio: 'Financial advisor specializing in investment strategies and retirement planning.',
            calls: 112,
            rating: 4.9,
            earnings: 1680,
            online: true
        }
    ];
    
    container.innerHTML = '';
    
    sampleWhispers.forEach(whisper => {
        const card = document.createElement('div');
        card.className = 'profile-card';
        
        card.innerHTML = `
            <div class="profile-header">
                <img src="https://images.unsplash.com/photo-1494790108753-0ffa3dd550a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" 
                     alt="${whisper.name}" class="profile-bg">
                <div class="profile-avatar">
                    <img src="https://i.pravatar.cc/150?img=${whisper.id + 10}" alt="${whisper.name}">
                </div>
            </div>
            <div class="profile-body">
                <h3 class="profile-name">${whisper.name}</h3>
                <p class="profile-username">@${whisper.username}</p>
                <div class="status ${whisper.online ? 'available' : 'busy'}">
                    <i class="fas fa-circle"></i> ${whisper.online ? 'Available Now' : 'Currently Busy'}
                </div>
                
                <p class="profile-bio" style="margin: 1rem 0; color: var(--text-secondary); font-size: 0.9rem;">
                    ${whisper.bio}
                </p>
                
                <div class="profile-stats">
                    <div class="stat-item">
                        <div class="stat-value">${whisper.calls}</div>
                        <div class="stat-label">Calls</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${whisper.rating}</div>
                        <div class="stat-label">Rating</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">$${whisper.earnings}</div>
                        <div class="stat-label">Earned</div>
                    </div>
                </div>
                
                <button class="call-btn btn btn-primary ${!whisper.online ? 'disabled' : ''}" 
                        onclick="startCallFromHomepage('${whisper.id}', '${whisper.name}')"
                        ${!whisper.online ? 'disabled' : ''}>
                    <i class="fas fa-phone-alt"></i> ${whisper.online ? 'Call Now ($15)' : 'Currently Busy'}
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Start call from homepage
async function startCallFromHomepage(whisperId, whisperName) {
    // Check if user is logged in
    if (typeof auth !== 'undefined' && auth.currentUser) {
        // User is logged in, proceed with call
        alert(`Starting call with ${whisperName}...`);
        // In a real app, this would redirect to call interface
    } else {
        // User is not logged in, redirect to login
        alert('Please login or sign up to start a call');
        window.location.href = 'auth.html?type=login';
    }
}

// Make function globally available
window.startCallFromHomepage = startCallFromHomepage;

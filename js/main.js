// Main.js - Fixed to show available whispers on homepage
console.log('Main.js loaded');

let db;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Main page loaded');
    
    // Initialize Firebase if available
    if (window.firebase && firebase.apps.length > 0) {
        db = firebase.firestore();
        loadAvailableWhispers();
    } else {
        // Fallback - show placeholder whispers
        showPlaceholderWhispers();
    }
    
    // Setup smooth scrolling for anchor links
    setupSmoothScrolling();
    
    // Setup call buttons
    setupCallButtons();
});

async function loadAvailableWhispers() {
    const container = document.getElementById('available-whispers');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #94a3b8;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <p>Loading available whispers...</p>
        </div>
    `;
    
    try {
        // Query for available whispers (users who have profiles and are marked as available)
        const whispersQuery = await db.collection('profiles')
            .where('available', '==', true)
            .limit(12)
            .get();
        
        if (whispersQuery.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-users" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3 style="color: white; margin-bottom: 0.5rem;">No Whispers Available</h3>
                    <p style="color: #94a3b8; max-width: 500px; margin: 0 auto;">
                        Check back soon or become a whisper yourself!
                    </p>
                </div>
            `;
            return;
        }
        
        const whispers = [];
        whispersQuery.forEach(doc => {
            whispers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Render whispers
        renderWhispers(whispers, container);
        
    } catch (error) {
        console.error('Error loading whispers:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Error loading whispers</p>
                <button onclick="loadAvailableWhispers()" class="btn btn-primary" style="margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
}

function renderWhispers(whispers, container) {
    if (whispers.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="fas fa-users" style="font-size: 3rem; color: #94a3b8; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="color: white;">No whispers available at the moment</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="whispers-grid">';
    
    whispers.forEach(whisper => {
        const displayName = whisper.displayName || 'Anonymous';
        const bio = whisper.bio || 'No bio available';
        const callPrice = whisper.callPrice || 1;
        const photoURL = whisper.photoURL || 'https://i.pravatar.cc/150';
        const rating = whisper.rating || 0;
        const totalCalls = whisper.totalCalls || 0;
        
        // Check social links
        const hasSocial = whisper.social && (
            whisper.social.twitter || 
            whisper.social.instagram || 
            whisper.social.linkedin || 
            whisper.social.website
        );
        
        html += `
            <div class="whisper-card">
                <div class="whisper-card-header">
                    <div class="whisper-avatar">
                        <img src="${photoURL}" alt="${displayName}">
                        <div class="availability-dot available"></div>
                    </div>
                    <div class="whisper-info">
                        <h3 class="whisper-name">${displayName}</h3>
                        <div class="whisper-rating">
                            <i class="fas fa-star"></i> ${rating.toFixed(1)}
                            <span class="whisper-calls"> • ${totalCalls} calls</span>
                        </div>
                    </div>
                </div>
                
                <div class="whisper-bio">
                    ${bio.length > 120 ? bio.substring(0, 120) + '...' : bio}
                </div>
                
                ${hasSocial ? `
                    <div class="whisper-social">
                        ${whisper.social.twitter ? `<a href="${whisper.social.twitter}" target="_blank"><i class="fab fa-twitter"></i></a>` : ''}
                        ${whisper.social.instagram ? `<a href="${whisper.social.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>` : ''}
                        ${whisper.social.linkedin ? `<a href="${whisper.social.linkedin}" target="_blank"><i class="fab fa-linkedin"></i></a>` : ''}
                        ${whisper.social.website ? `<a href="${whisper.social.website}" target="_blank"><i class="fas fa-globe"></i></a>` : ''}
                    </div>
                ` : ''}
                
                <div class="whisper-card-footer">
                    <div class="call-price">
                        <i class="fas fa-coins"></i> ${callPrice} coin${callPrice !== 1 ? 's' : ''}
                        <span class="price-note">per 5-min call</span>
                    </div>
                    <button class="btn btn-primary call-btn" onclick="callWhisperFromHomepage('${whisper.id}')">
                        <i class="fas fa-phone-alt"></i> Call Now
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function showPlaceholderWhispers() {
    const container = document.getElementById('available-whispers');
    if (!container) return;
    
    container.innerHTML = `
        <div class="whispers-grid">
            <!-- Placeholder cards for demo -->
            <div class="whisper-card">
                <div class="whisper-card-header">
                    <div class="whisper-avatar">
                        <img src="https://i.pravatar.cc/150?img=1" alt="Alex Morgan">
                        <div class="availability-dot available"></div>
                    </div>
                    <div class="whisper-info">
                        <h3 class="whisper-name">Alex Morgan</h3>
                        <div class="whisper-rating">
                            <i class="fas fa-star"></i> 4.8
                            <span class="whisper-calls"> • 124 calls</span>
                        </div>
                    </div>
                </div>
                <div class="whisper-bio">
                    Business coach specializing in startup growth and fundraising strategies.
                </div>
                <div class="whisper-social">
                    <a href="#"><i class="fab fa-twitter"></i></a>
                    <a href="#"><i class="fab fa-linkedin"></i></a>
                </div>
                <div class="whisper-card-footer">
                    <div class="call-price">
                        <i class="fas fa-coins"></i> 3 coins
                        <span class="price-note">per 5-min call</span>
                    </div>
                    <button class="btn btn-primary call-btn" onclick="requireLogin()">
                        <i class="fas fa-phone-alt"></i> Call Now
                    </button>
                </div>
            </div>
            
            <div class="whisper-card">
                <div class="whisper-card-header">
                    <div class="whisper-avatar">
                        <img src="https://i.pravatar.cc/150?img=2" alt="Sarah Chen">
                        <div class="availability-dot available"></div>
                    </div>
                    <div class="whisper-info">
                        <h3 class="whisper-name">Sarah Chen</h3>
                        <div class="whisper-rating">
                            <i class="fas fa-star"></i> 4.9
                            <span class="whisper-calls"> • 89 calls</span>
                        </div>
                    </div>
                </div>
                <div class="whisper-bio">
                    Tech career advisor with 10+ years at Google and Microsoft.
                </div>
                <div class="whisper-social">
                    <a href="#"><i class="fab fa-linkedin"></i></a>
                </div>
                <div class="whisper-card-footer">
                    <div class="call-price">
                        <i class="fas fa-coins"></i> 2 coins
                        <span class="price-note">per 5-min call</span>
                    </div>
                    <button class="btn btn-primary call-btn" onclick="requireLogin()">
                        <i class="fas fa-phone-alt"></i> Call Now
                    </button>
                </div>
            </div>
            
            <div class="whisper-card">
                <div class="whisper-card-header">
                    <div class="whisper-avatar">
                        <img src="https://i.pravatar.cc/150?img=3" alt="Marcus Johnson">
                        <div class="availability-dot available"></div>
                    </div>
                    <div class="whisper-info">
                        <h3 class="whisper-name">Marcus Johnson</h3>
                        <div class="whisper-rating">
                            <i class="fas fa-star"></i> 4.7
                            <span class="whisper-calls"> • 67 calls</span>
                        </div>
                    </div>
                </div>
                <div class="whisper-bio">
                    Fitness coach and nutrition expert helping people transform their health.
                </div>
                <div class="whisper-social">
                    <a href="#"><i class="fab fa-instagram"></i></a>
                </div>
                <div class="whisper-card-footer">
                    <div class="call-price">
                        <i class="fas fa-coins"></i> 1 coin
                        <span class="price-note">per 5-min call</span>
                    </div>
                    <button class="btn btn-primary call-btn" onclick="requireLogin()">
                        <i class="fas fa-phone-alt"></i> Call Now
                    </button>
                </div>
            </div>
        </div>
    `;
}

function setupSmoothScrolling() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function setupCallButtons() {
    // This will be handled by the call buttons in the whisper cards
}

// Global functions
window.callWhisperFromHomepage = async function(whisperId) {
    // Check if user is logged in
    if (!firebase.auth().currentUser) {
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    try {
        // Get user info
        const user = firebase.auth().currentUser;
        
        // Get whisper info
        const whisperDoc = await db.collection('profiles').doc(whisperId).get();
        const whisperData = whisperDoc.data();
        
        if (!whisperData || !whisperData.available) {
            alert('This whisper is currently unavailable. Please try another whisper.');
            return;
        }
        
        // Get whisper's call price
        const callPrice = Math.min(Math.max(whisperData.callPrice || 1, 1), 5);
        
        // Check user's coin balance
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        
        if (!userData.coins || userData.coins < callPrice) {
            alert(`You need at least ${callPrice} whisper coin${callPrice !== 1 ? 's' : ''} to make this call. You have ${userData.coins || 0} coins.`);
            window.location.href = 'payment.html';
            return;
        }
        
        // Create call session
        const callSession = {
            callerId: user.uid,
            callerName: userData.displayName || user.email.split('@')[0],
            whisperId: whisperId,
            whisperName: whisperData.displayName || 'Whisper',
            callPrice: callPrice,
            status: 'waiting',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes to accept
            refunded: false
        };
        
        // Deduct coins
        await db.collection('users').doc(user.uid).update({
            coins: firebase.firestore.FieldValue.increment(-callPrice)
        });
        
        // Record transaction
        await db.collection('transactions').add({
            userId: user.uid,
            type: 'call_held',
            amount: callPrice * 15,
            whisperCoins: -callPrice,
            description: `Call to ${whisperData.displayName}`,
            status: 'pending',
            whisperId: whisperId,
            createdAt: new Date()
        });
        
        // Create call session
        const sessionRef = await db.collection('callSessions').add(callSession);
        
        // Redirect to waiting page
        window.location.href = `call-waiting.html?session=${sessionRef.id}&role=caller`;
        
    } catch (error) {
        console.error('Error calling whisper:', error);
        alert('Error: ' + error.message);
    }
};

window.requireLogin = function() {
    window.location.href = 'auth.html?type=login';
};

// Export for other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadAvailableWhispers };
}

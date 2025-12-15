// Enhanced Homepage JavaScript for Whisper+me
console.log("Homepage.js loaded - Enhanced Version");

// Initialize on load
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Homepage initialized");
    
    // Initialize Firebase
    await initializeFirebase();
    
    // Load whispers
    await loadHomepageWhispers();
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Setup social sharing
    setupSocialSharing();
});

// Initialize Firebase (public read only)
async function initializeFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        window.db = firebase.firestore();
        window.auth = firebase.auth();
        console.log("Firebase initialized for homepage");
    } catch (error) {
        console.warn("Firebase init warning (normal for non-auth pages):", error);
    }
}

// Load whispers for homepage
async function loadHomepageWhispers() {
    const container = document.getElementById('homepageWhispers');
    if (!container) return;
    
    try {
        // Show loading
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <i class="fas fa-spinner fa-spin fa-2x" style="color: #4361ee;"></i>
                <p style="margin-top: 1rem; color: #666;">Finding available whisperers...</p>
            </div>
        `;
        
        // Get available whispers
        const profilesRef = db.collection('profiles');
        const querySnapshot = await profilesRef
            .where('available', '==', true)
            .orderBy('lastActive', 'desc')
            .limit(12)
            .get();
        
        if (querySnapshot.empty) {
            showNoWhispers(container);
            return;
        }
        
        displayWhispers(querySnapshot, container);
        
    } catch (error) {
        console.error("Error loading whispers:", error);
        showErrorState(container, error);
    }
}

// Display whispers in grid
function displayWhispers(querySnapshot, container) {
    let html = '';
    let whisperCount = 0;
    
    querySnapshot.forEach(doc => {
        whisperCount++;
        const profile = doc.data();
        const whisperId = doc.id;
        
        html += createWhisperCard(profile, whisperId);
    });
    
    // Update count display
    const countDisplay = document.getElementById('whisperCount');
    if (countDisplay) {
        countDisplay.textContent = `${whisperCount} whisperers available`;
    }
    
    container.innerHTML = html;
}

// Create whisper card HTML
function createWhisperCard(profile, whisperId) {
    const avatarId = Math.abs(hashCode(whisperId)) % 70;
    const rating = profile.averageRating || 0;
    const callCount = profile.totalCalls || 0;
    
    return `
        <div class="whisper-card" style="background: white; border-radius: 15px; padding: 1.5rem; box-shadow: 0 5px 15px rgba(0,0,0,0.1); border: 2px solid #e0e0e0; transition: all 0.3s;">
            <!-- Profile Header -->
            <div style="text-align: center; margin-bottom: 1rem; position: relative;">
                <div style="width: 80px; height: 80px; border-radius: 50%; overflow: hidden; margin: 0 auto 1rem; border: 3px solid #4361ee; position: relative;">
                    <img src="${profile.profilePicture || `https://i.pravatar.cc/150?img=${avatarId}`}" 
                         alt="${profile.displayName}" 
                         style="width: 100%; height: 100%; object-fit: cover;">
                    <div style="position: absolute; bottom: 5px; right: 5px; width: 12px; height: 12px; border-radius: 50%; background: #4ade80; border: 2px solid white;"></div>
                </div>
                
                <h3 style="margin: 0.5rem 0 0.25rem 0; color: #333; font-size: 1.2rem;">
                    ${profile.displayName || 'Whisperer'}
                </h3>
                <p style="color: #666; font-size: 0.9rem; margin: 0 0 0.5rem 0;">
                    @${profile.username || 'user'}
                </p>
                
                <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(67, 97, 238, 0.1); color: #4361ee; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.8rem; font-weight: 500;">
                    <i class="fas fa-circle" style="font-size: 0.6rem;"></i>
                    Available now
                </div>
            </div>
            
            <!-- Bio -->
            <div style="margin: 1rem 0; color: #555; font-size: 0.9rem; line-height: 1.5; min-height: 60px;">
                ${profile.bio || 'Ready for meaningful conversation about life, work, and everything in between!'}
            </div>
            
            <!-- Interests -->
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem; justify-content: center;">
                ${(profile.interests || ['Conversation', 'Listening', 'Advice']).slice(0, 3).map(interest => `
                    <span style="background: #f0f4ff; color: #4361ee; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.75rem;">
                        ${interest}
                    </span>
                `).join('')}
            </div>
            
            <!-- Stats -->
            <div style="display: flex; justify-content: space-around; margin-bottom: 1.5rem; padding: 0.75rem; background: #f8f9fa; border-radius: 10px;">
                <div style="text-align: center;">
                    <div style="font-size: 1.1rem; font-weight: 700; color: #4361ee;">${callCount}</div>
                    <div style="font-size: 0.75rem; color: #666;">Calls</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.1rem; font-weight: 700; color: #f59e0b;">${rating.toFixed(1)}</div>
                    <div style="font-size: 0.75rem; color: #666;">Rating</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.1rem; font-weight: 700; color: #4ade80;">$${callCount * 12}</div>
                    <div style="font-size: 0.75rem; color: #666;">Earned</div>
                </div>
            </div>
            
            <!-- Call Button -->
            <button onclick="startCallFromHomepage('${whisperId}', '${profile.displayName || 'User'}')" 
                    style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #4361ee, #7209b7); color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.3s;">
                <i class="fas fa-phone-alt"></i> Call Now (1 token • $15)
            </button>
            
            <!-- Share Button -->
            <button onclick="shareWhisper('${whisperId}', '${profile.displayName || 'User'}')" 
                    style="width: 100%; padding: 0.5rem; background: transparent; color: #666; border: 1px solid #ddd; border-radius: 10px; font-size: 0.85rem; margin-top: 0.75rem; cursor: pointer;">
                <i class="fas fa-share-alt"></i> Share Profile
            </button>
        </div>
    `;
}

// Start call from homepage
async function startCallFromHomepage(whisperId, whisperName) {
    try {
        // Check authentication
        if (!auth.currentUser) {
            alert('Please sign in to start a call!');
            window.location.href = `auth.html?type=login&redirect=${encodeURIComponent(window.location.href)}`;
            return;
        }
        
        const user = auth.currentUser;
        
        // Check tokens
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        const userTokens = userData?.tokens || 0;
        
        if (userTokens < 1) {
            if (confirm('You need tokens to call. Would you like to buy tokens now?')) {
                window.location.href = 'payment.html';
            }
            return;
        }
        
        // Show loading
        showToast('Creating call session...', 'info');
        
        // Create call session
        const callData = {
            callerId: user.uid,
            callerName: user.displayName || user.email.split('@')[0],
            callerEmail: user.email,
            whisperId: whisperId,
            whisperName: whisperName,
            status: 'waiting',
            price: 15,
            whisperEarns: 12,
            platformFee: 3,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        };
        
        const callRef = await db.collection('callSessions').add(callData);
        const callId = callRef.id;
        
        // Deduct token
        await db.collection('users').doc(user.uid).update({
            tokens: firebase.firestore.FieldValue.increment(-1),
            lastCallStarted: new Date()
        });
        
        // Update whisperer's stats
        await db.collection('profiles').doc(whisperId).update({
            pendingCalls: firebase.firestore.FieldValue.increment(1),
            lastCallRequest: new Date()
        });
        
        // Check if whisperer has >5 pending calls
        const whisperDoc = await db.collection('profiles').doc(whisperId).get();
        const whisperData = whisperDoc.data();
        
        if (whisperData.pendingCalls >= 5) {
            // Auto-switch to unavailable
            await db.collection('profiles').doc(whisperId).update({
                available: false,
                autoDisabled: true,
                autoDisabledAt: new Date()
            });
            
            // Notify whisperer
            await db.collection('notifications').add({
                userId: whisperId,
                type: 'auto_unavailable',
                title: 'Auto-switched to Unavailable',
                message: 'You have 5+ pending calls. Automatically switched to unavailable.',
                createdAt: new Date(),
                read: false
            });
        }
        
        // Redirect to call room
        showToast('Redirecting to call room...', 'success');
        setTimeout(() => {
            window.location.href = `call-waiting.html?session=${callId}&role=caller`;
        }, 1500);
        
    } catch (error) {
        console.error("Error starting call:", error);
        showToast('Error starting call: ' + error.message, 'error');
    }
}

// Share whisper profile
function shareWhisper(whisperId, whisperName) {
    const shareUrl = `${window.location.origin}/index.html#${whisperId}`;
    const shareText = `Chat with ${whisperName} on Whisper+me! 5-minute private voice conversations. Earn $12 per call.`;
    
    if (navigator.share) {
        navigator.share({
            title: `Chat with ${whisperName}`,
            text: shareText,
            url: shareUrl
        });
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
            showToast('Link copied to clipboard!', 'success');
        });
    } else {
        // Fallback for older browsers
        prompt('Copy this link to share:', `${shareText} ${shareUrl}`);
    }
}

// Helper functions
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

function showNoWhispers(container) {
    container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; background: white; border-radius: 15px; border: 2px dashed #ddd;">
            <i class="fas fa-users-slash fa-3x" style="color: #ccc; margin-bottom: 1rem;"></i>
            <h3 style="color: #666; margin-bottom: 1rem;">No whisperers available</h3>
            <p style="color: #888; margin-bottom: 2rem; max-width: 500px; margin-left: auto; margin-right: auto;">
                Be the first whisperer online! Sign up now and start earning $12 per 5-minute call.
            </p>
            <a href="auth.html?type=signup" style="display: inline-block; padding: 1rem 2rem; background: linear-gradient(135deg, #4361ee, #7209b7); color: white; text-decoration: none; border-radius: 10px; font-weight: 600;">
                <i class="fas fa-user-plus"></i> Become a Whisperer
            </a>
        </div>
    `;
}

function showErrorState(container, error) {
    container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <i class="fas fa-exclamation-triangle fa-2x" style="color: #ef4444; margin-bottom: 1rem;"></i>
            <h3 style="color: #666; margin-bottom: 1rem;">Connection Issue</h3>
            <p style="color: #888; margin-bottom: 1.5rem;">Unable to load whisperers</p>
            <button onclick="loadHomepageWhispers()" style="padding: 0.75rem 1.5rem; background: #4361ee; color: white; border: none; border-radius: 8px; cursor: pointer;">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
}

function showToast(message, type = 'info') {
    // Remove existing toasts
    const existing = document.querySelector('.homepage-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `homepage-toast toast-${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Style toast
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Setup mobile menu
function setupMobileMenu() {
    const mobileBtn = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('show');
        });
        
        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !mobileBtn.contains(e.target)) {
                navLinks.classList.remove('show');
            }
        });
    }
}

// Setup social sharing
function setupSocialSharing() {
    // Add share buttons dynamically
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        const shareDiv = document.createElement('div');
        shareDiv.className = 'share-buttons';
        shareDiv.innerHTML = `
            <div style="text-align: center; margin-top: 2rem;">
                <p style="color: rgba(255,255,255,0.8); margin-bottom: 1rem;">Share with friends:</p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button onclick="shareToTwitter()" style="padding: 0.75rem 1.5rem; background: #1DA1F2; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        <i class="fab fa-twitter"></i> Twitter
                    </button>
                    <button onclick="shareToFacebook()" style="padding: 0.75rem 1.5rem; background: #4267B2; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        <i class="fab fa-facebook"></i> Facebook
                    </button>
                    <button onclick="shareToWhatsApp()" style="padding: 0.75rem 1.5rem; background: #25D366; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                </div>
            </div>
        `;
        heroSection.appendChild(shareDiv);
    }
}

// Social sharing functions
function shareToTwitter() {
    const text = encodeURIComponent('Earn $12 per 5-minute call on Whisper+me! Private voice conversations. Join now:');
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

function shareToFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
}

function shareToWhatsApp() {
    const text = encodeURIComponent('Check out Whisper+me - Earn $12 per 5-minute call! ' + window.location.href);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .whisper-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 30px rgba(0,0,0,0.15);
        border-color: #4361ee;
    }
    
    @media (max-width: 768px) {
        .whispers-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1.5rem;
        }
        
        .whisper-card {
            padding: 1.25rem;
        }
    }
    
    @media (max-width: 480px) {
        .whispers-grid {
            grid-template-columns: 1fr;
        }
    }
`;
document.head.appendChild(style);

// Make functions globally available
window.loadHomepageWhispers = loadHomepageWhispers;
window.startCallFromHomepage = startCallFromHomepage;
window.shareWhisper = shareWhisper;

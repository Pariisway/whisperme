// Homepage.js - Fixed to handle Firestore API errors
console.log("Homepage.js loaded - Firestore Error Handling Version");

// Function to load whispers for homepage
async function loadHomepageWhispers() {
    console.log("Loading whispers for homepage...");
    
    const container = document.getElementById('whispersGrid');
    if (!container) {
        console.log("No whispersGrid found on this page");
        return;
    }
    
    try {
        // Check if Firebase is available
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            showWhispersError("Firebase not loaded. Please refresh.");
            return;
        }
        
        const db = firebase.firestore();
        
        // Try to get available whispers
        const snapshot = await db.collection('profiles')
            .where('available', '==', true)
            .limit(12)
            .get();
        
        console.log(`Found ${snapshot.size} available whispers`);
        
        if (snapshot.empty) {
            showNoWhispersMessage();
            return;
        }
        
        // Clear loading state
        container.innerHTML = '';
        
        // Display each whisper
        snapshot.forEach(doc => {
            const whisper = doc.data();
            const whisperCard = createWhisperCard(whisper);
            container.appendChild(whisperCard);
        });
        
    } catch (error) {
        console.error("Error loading whispers:", error);
        
        // Check if it's the Firestore API error
        if (error.code === 'permission-denied' && error.message.includes('Cloud Firestore API')) {
            showWhispersError(`
                <strong>Firestore API Not Enabled</strong><br>
                <a href="https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=whisper-chat-live" 
                   target="_blank" style="color: var(--primary-purple); text-decoration: underline;">
                   Click here to enable Firestore API
                </a><br>
                Then refresh this page.
            `);
        } else {
            // Show demo data so the site isn't broken
            showDemoWhispers(container);
        }
    }
}

// Show demo whispers when Firestore isn't ready
function showDemoWhispers(container) {
    console.log("Showing demo whispers");
    
    const demoWhispers = [
        { displayName: "Alex Johnson", username: "alexj", bio: "Let's chat about life!", available: true },
        { displayName: "Sam Wilson", username: "samw", bio: "Professional listener here", available: true },
        { displayName: "Taylor Swift", username: "taylors", bio: "Talk music with me!", available: true },
        { displayName: "Jamie Lee", username: "jamiel", bio: "Available for deep conversations", available: true }
    ];
    
    container.innerHTML = '';
    
    demoWhispers.forEach((whisper, index) => {
        const card = document.createElement('div');
        card.className = 'whisper-card';
        card.innerHTML = `
            <div class="whisper-avatar">
                <img src="https://i.pravatar.cc/150?img=${index + 10}" alt="${whisper.displayName}">
                <span class="online-status online"></span>
            </div>
            <div class="whisper-info">
                <h3 class="whisper-name">${whisper.displayName}</h3>
                <p class="whisper-username">@${whisper.username}</p>
            </div>
            <div class="whisper-bio">
                <p>${whisper.bio}</p>
            </div>
            <div class="whisper-actions">
                <button class="btn btn-primary btn-block" onclick="showDemoCallAlert()">
                    <i class="fas fa-phone-alt"></i> Call Now
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function showDemoCallAlert() {
    alert("This is a demo. When Firestore API is enabled, this will initiate a real call.");
}

// Create a whisper card
function createWhisperCard(whisper) {
    const card = document.createElement('div');
    card.className = 'whisper-card';
    
    // Generate avatar based on user ID or random
    const avatarIndex = Math.abs(hashCode(whisper.userId || whisper.displayName)) % 70;
    
    card.innerHTML = `
        <div class="whisper-avatar">
            <img src="https://i.pravatar.cc/150?img=${avatarIndex}" alt="${whisper.displayName}">
            <span class="online-status ${whisper.available ? 'online' : 'offline'}"></span>
        </div>
        <div class="whisper-info">
            <h3 class="whisper-name">${whisper.displayName || 'Anonymous'}</h3>
            <p class="whisper-username">@${whisper.username || 'user'}</p>
        </div>
        <div class="whisper-bio">
            <p>${whisper.bio || 'No bio yet.'}</p>
        </div>
        ${whisper.social ? `
        <div class="whisper-social">
            ${whisper.social.twitter ? `<a href="${whisper.social.twitter}" target="_blank"><i class="fab fa-twitter"></i></a>` : ''}
            ${whisper.social.instagram ? `<a href="${whisper.social.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>` : ''}
            ${whisper.social.tiktok ? `<a href="${whisper.social.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>` : ''}
        </div>
        ` : ''}
        <div class="whisper-actions">
            <button class="btn btn-primary btn-block" onclick="initiateCallToWhisper('${whisper.userId}', '${whisper.displayName}')">
                <i class="fas fa-phone-alt"></i> Call Now
            </button>
        </div>
    `;
    
    return card;
}

// Show error message
function showWhispersError(message) {
    const container = document.getElementById('whispersGrid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 40px;">
            <div style="font-size: 48px; color: var(--accent-red); margin-bottom: 20px;">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Firestore API Not Enabled</h3>
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                ${message}
            </div>
            <p>This is required for the site to work.</p>
            <button class="btn btn-primary" onclick="window.open('https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=whisper-chat-live', '_blank')">
                <i class="fas fa-external-link-alt"></i> Open Google Cloud Console
            </button>
        </div>
    `;
}

// Show "no whispers" message
function showNoWhispersMessage() {
    const container = document.getElementById('whispersGrid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px;">
            <div style="font-size: 48px; color: var(--dark-text-secondary); margin-bottom: 20px;">
                <i class="fas fa-users"></i>
            </div>
            <h3>No Whispers Available</h3>
            <p>Be the first to sign up as a whisper!</p>
            <a href="auth.html?type=signup" class="btn btn-primary">
                <i class="fas fa-user-plus"></i> Sign Up as Whisper
            </a>
        </div>
    `;
}

// Helper function for consistent avatar hashing
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("Homepage initialized - waiting for Firebase...");
    
    // Wait for Firebase to initialize, then load whispers
    setTimeout(() => {
        if (typeof firebase !== 'undefined' && firebase.apps.length) {
            console.log("Firebase ready, loading whispers...");
            loadHomepageWhispers();
        } else {
            console.log("Firebase not ready yet, waiting...");
            // Try again in 2 seconds
            setTimeout(loadHomepageWhispers, 2000);
        }
    }, 1000);
});

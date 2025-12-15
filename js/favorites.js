// Favorite Whispers System
console.log("Favorites.js loaded");

let favoriteWhispers = [];

// Load favorite whispers
async function loadFavoriteWhispers(userId) {
    try {
        const favoritesSnapshot = await db.collection('favorites')
            .where('userId', '==', userId)
            .get();
        
        favoriteWhispers = [];
        const favoriteIds = [];
        
        favoritesSnapshot.forEach(doc => {
            const data = doc.data();
            favoriteIds.push(data.whisperId);
        });
        
        // Load whisper profiles
        if (favoriteIds.length > 0) {
            for (const whisperId of favoriteIds) {
                const profileDoc = await db.collection('profiles').doc(whisperId).get();
                if (profileDoc.exists) {
                    favoriteWhispers.push({
                        id: whisperId,
                        ...profileDoc.data()
                    });
                }
            }
        }
        
        displayFavoriteWhispers();
        
    } catch (error) {
        console.error("Error loading favorites:", error);
    }
}

// Display favorite whispers
function displayFavoriteWhispers() {
    const container = document.getElementById('favoriteWhispers');
    if (!container) return;
    
    if (favoriteWhispers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <h3>No favorite whispers yet</h3>
                <p>Click the heart icon on any whisper to add them here</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    favoriteWhispers.forEach(whisper => {
        const avatarIndex = Math.abs(hashCode(whisper.userId)) % 70;
        
        html += `
            <div class="whisper-card">
                <div class="whisper-card-header">
                    <div class="whisper-avatar">
                        <img src="https://i.pravatar.cc/150?img=${avatarIndex}" 
                             alt="${whisper.displayName}">
                        <span class="online-status ${whisper.available ? 'online' : 'offline'}"></span>
                    </div>
                    <div class="whisper-info">
                        <h4 class="whisper-name">${whisper.displayName}</h4>
                        <p class="whisper-username">@${whisper.username}</p>
                    </div>
                    <button class="favorite-btn active" onclick="removeFromFavorites('${whisper.userId}')">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                
                <div class="whisper-bio">
                    <p>${whisper.bio || 'No bio yet'}</p>
                </div>
                
                ${whisper.social ? `
                <div class="whisper-social">
                    ${whisper.social.twitter ? `<a href="${whisper.social.twitter}" target="_blank"><i class="fab fa-twitter"></i></a>` : ''}
                    ${whisper.social.instagram ? `<a href="${whisper.social.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>` : ''}
                    ${whisper.social.tiktok ? `<a href="${whisper.social.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>` : ''}
                </div>
                ` : ''}
                
                <button class="btn btn-primary btn-block" 
                        onclick="startCallWithWhisper('${whisper.userId}', '${whisper.displayName}')">
                    <i class="fas fa-phone-alt"></i> Call Now
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Add whisper to favorites
async function addToFavorites(whisperId, whisperName) {
    try {
        await db.collection('favorites').add({
            userId: currentUser.uid,
            whisperId: whisperId,
            whisperName: whisperName,
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert(`Added ${whisperName} to favorites!`, 'success');
        
        // Reload favorites
        await loadFavoriteWhispers(currentUser.uid);
        
    } catch (error) {
        console.error("Error adding to favorites:", error);
        showAlert('Error adding to favorites', 'error');
    }
}

// Remove from favorites
async function removeFromFavorites(whisperId) {
    try {
        const favoriteQuery = await db.collection('favorites')
            .where('userId', '==', currentUser.uid)
            .where('whisperId', '==', whisperId)
            .get();
        
        if (!favoriteQuery.empty) {
            const batch = db.batch();
            favoriteQuery.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
        
        showAlert('Removed from favorites', 'success');
        
        // Reload favorites
        await loadFavoriteWhispers(currentUser.uid);
        
    } catch (error) {
        console.error("Error removing from favorites:", error);
        showAlert('Error removing from favorites', 'error');
    }
}

// Add favorite button to whisper cards
function addFavoriteButtonsToWhispers() {
    document.querySelectorAll('.whisper-card').forEach(card => {
        const whisperId = card.getAttribute('data-whisper-id');
        const whisperName = card.querySelector('.whisper-name')?.textContent;
        
        if (whisperId && whisperName) {
            const header = card.querySelector('.whisper-card-header');
            if (header && !header.querySelector('.favorite-btn')) {
                const favoriteBtn = document.createElement('button');
                favoriteBtn.className = 'favorite-btn';
                favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
                favoriteBtn.onclick = (e) => {
                    e.stopPropagation();
                    addToFavorites(whisperId, whisperName);
                };
                header.appendChild(favoriteBtn);
            }
        }
    });
}

// Initialize favorites
if (typeof currentUser !== 'undefined' && currentUser) {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            loadFavoriteWhispers(currentUser.uid);
        }, 2000);
    });
}

// Helper function
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

// Make functions available globally
window.addToFavorites = addToFavorites;
window.removeFromFavorites = removeFromFavorites;
window.loadFavoriteWhispers = loadFavoriteWhispers;

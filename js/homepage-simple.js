// Simple Homepage JavaScript
console.log("Homepage.js loaded - Simple version");

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("Homepage loaded");
    
    // Load whispers after 1 second (let Firebase initialize)
    setTimeout(loadHomepageWhispers, 1000);
    
    // Update timing text
    updateTimingText();
    
    // Setup event listeners
    setupHomepageListeners();
});

// Load whispers from Firebase
async function loadHomepageWhispers() {
    console.log("Loading whispers from Firestore...");
    
    const container = document.getElementById('homepageWhispers');
    if (!container) {
        console.error("Whispers container not found!");
        return;
    }
    
    // Show loading state
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; width: 100%;">
            <i class="fas fa-spinner fa-spin fa-2x" style="color: #667eea;"></i>
            <p style="margin-top: 15px; color: #666;">Loading whispers...</p>
        </div>
    `;
    
    try {
        // Initialize Firebase if not already
        if (typeof firebase === 'undefined') {
            console.error("Firebase not loaded!");
            showSampleWhispers(container);
            return;
        }
        
        // Make sure Firebase is initialized
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase initialized");
        }
        
        // Get Firestore instance
        const db = firebase.firestore();
        
        console.log("Querying Firestore...");
        
        // Try different collection names
        let snapshot;
        
        // First try 'whispers' (lowercase)
        try {
            snapshot = await db.collection('whispers')
                .where('available', '==', true)
                .limit(8)
                .get();
            console.log("Found 'whispers' collection");
        } catch (error) {
            console.log("'whispers' collection not found, trying 'Whisper'...");
            // Try 'Whisper' (capital W)
            try {
                snapshot = await db.collection('Whisper')
                    .where('available', '==', true)
                    .limit(8)
                    .get();
                console.log("Found 'Whisper' collection");
            } catch (error2) {
                console.log("'Whisper' collection not found either");
                snapshot = { empty: true };
            }
        }
        
        if (snapshot.empty) {
            console.log("No whispers found or collection doesn't exist");
            showSampleWhispers(container);
            return;
        }
        
        // Display whispers from Firestore
        const whispers = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            whispers.push({
                id: doc.id,
                name: data.displayName || data.name || 'Whisper User',
                title: data.title || data.bio || 'Ready to chat',
                description: data.description || data.bio || 'Available for meaningful conversations',
                interests: data.interests || ['Chat', 'Connect', 'Share'],
                rating: data.rating || 4.5,
                calls: data.calls || Math.floor(Math.random() * 100),
                available: true
            });
        });
        
        console.log(`Loaded ${whispers.length} whispers from Firestore`);
        displayWhispers(container, whispers);
        
    } catch (error) {
        console.error("Error loading whispers:", error);
        console.log("Error details:", error.message, error.code);
        showSampleWhispers(container);
    }
}

// Display whispers in the grid
function displayWhispers(container, whispers) {
    if (whispers.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; width: 100%;">
                <i class="fas fa-users" style="font-size: 3rem; color: #667eea; opacity: 0.5;"></i>
                <h3 style="margin-top: 15px; color: #666;">No whispers available</h3>
                <p style="color: #999;">Be the first to join as a whisperer!</p>
                <button onclick="window.location.href='auth.html?type=signup'" 
                        style="margin-top: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                               color: white; border: none; padding: 12px 30px; border-radius: 25px; 
                               cursor: pointer; font-weight: 600;">
                    <i class="fas fa-user-plus"></i> Join Now
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    whispers.forEach((whisper, index) => {
        // Create avatar based on index (for consistent colors)
        const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];
        const color = colors[index % colors.length];
        
        html += `
            <div class="whisper-card-home" style="
                background: white; 
                border-radius: 15px; 
                padding: 25px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
                text-align: center; 
                transition: all 0.3s ease;
                max-width: 300px;
                margin: 0 auto;
            ">
                <div class="whisper-avatar" style="
                    width: 80px; 
                    height: 80px; 
                    background: linear-gradient(135deg, ${color} 0%, ${color}99 100%); 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    margin: 0 auto 20px; 
                    color: white; 
                    font-size: 2rem;
                ">
                    <i class="fas fa-user"></i>
                </div>
                <h4 style="color: #333; margin-bottom: 5px; font-size: 1.2rem;">${whisper.name}</h4>
                <p style="color: #667eea; font-weight: 600; margin-bottom: 10px; font-size: 0.9rem;">${whisper.title}</p>
                <p style="color: #666; font-size: 0.85rem; margin-bottom: 15px; line-height: 1.4; height: 60px; overflow: hidden;">
                    ${whisper.description.substring(0, 80)}${whisper.description.length > 80 ? '...' : ''}
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; margin-bottom: 15px; min-height: 50px;">
                    ${whisper.interests.slice(0, 3).map(interest => 
                        `<span style="background: #f0f4ff; color: #667eea; padding: 3px 10px; border-radius: 15px; font-size: 0.75rem; font-weight: 500;">${interest}</span>`
                    ).join('')}
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #666; margin-bottom: 15px; padding: 10px 0; border-top: 1px solid #f0f0f0;">
                    <div>
                        <div style="font-weight: 700; color: #333;">${whisper.rating}</div>
                        <div>Rating</div>
                    </div>
                    <div>
                        <div style="font-weight: 700; color: #333;">${whisper.calls}</div>
                        <div>Calls</div>
                    </div>
                </div>
                <button onclick="connectToWhisper('${whisper.name.replace(/'/g, "\\'")}')" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    border: none; 
                    padding: 10px 20px; 
                    border-radius: 25px; 
                    cursor: pointer; 
                    transition: all 0.3s;
                    font-size: 0.9rem;
                    font-weight: 600;
                    width: 100%;
                ">
                    <i class="fas fa-comment"></i> Connect Now
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add hover effect
    setTimeout(() => {
        const cards = container.querySelectorAll('.whisper-card-home');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-10px)';
                card.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.15)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
            });
        });
    }, 100);
}

// Show sample whispers (fallback)
function showSampleWhispers(container) {
    console.log("Showing sample whispers");
    
    const sampleWhispers = [
        {
            name: "Alex Johnson",
            title: "Creative Writer",
            description: "Love discussing stories, creative ideas, and helping people find their voice.",
            interests: ["Writing", "Books", "Art", "Storytelling"],
            rating: 4.9,
            calls: 156,
            available: true
        },
        {
            name: "Sam Wilson",
            title: "Life Coach",
            description: "Let's talk about personal growth, goals, and finding balance in life.",
            interests: ["Coaching", "Wellness", "Meditation", "Growth"],
            rating: 4.8,
            calls: 203,
            available: true
        },
        {
            name: "Taylor Smith",
            title: "Tech Enthusiast",
            description: "Discuss latest tech trends, startups, and the future of technology.",
            interests: ["Technology", "Startups", "AI", "Innovation"],
            rating: 4.7,
            calls: 89,
            available: true
        },
        {
            name: "Jordan Lee",
            title: "Travel Blogger",
            description: "Share travel stories, tips, and cultural experiences from around the world.",
            interests: ["Travel", "Culture", "Photography", "Adventure"],
            rating: 4.9,
            calls: 127,
            available: true
        },
        {
            name: "Casey Brown",
            title: "Music Producer",
            description: "Let's talk about music production, songwriting, and the creative process.",
            interests: ["Music", "Production", "Audio", "Creativity"],
            rating: 4.6,
            calls: 94,
            available: true
        },
        {
            name: "Morgan Taylor",
            title: "Fitness Coach",
            description: "Discuss fitness routines, nutrition, and maintaining a healthy lifestyle.",
            interests: ["Fitness", "Health", "Nutrition", "Wellness"],
            rating: 4.8,
            calls: 178,
            available: true
        }
    ];
    
    displayWhispers(container, sampleWhispers);
}

// Connect to whisper button handler
function connectToWhisper(whisperName) {
    console.log("Connecting to:", whisperName);
    
    if (typeof firebase !== 'undefined') {
        const user = firebase.auth().currentUser;
        if (user) {
            // User is logged in, redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            // User not logged in, redirect to login
            window.location.href = 'auth.html?type=login';
        }
    } else {
        window.location.href = 'auth.html?type=login';
    }
}

// Update timing text from 15-minute to 5-minute
function updateTimingText() {
    // Update all text elements
    const elements = document.querySelectorAll('body *');
    elements.forEach(el => {
        if (el.textContent) {
            // Replace 15-minute with 5-minute
            el.textContent = el.textContent.replace(/15-minute/g, '5-minute');
            el.textContent = el.textContent.replace(/15 minute/g, '5-minute');
            el.textContent = el.textContent.replace(/15 minutes/g, '5 minutes');
            el.textContent = el.textContent.replace(/15 min/g, '5 min');
            
            // Also update any innerHTML if it's an input element
            if (el.innerHTML) {
                el.innerHTML = el.innerHTML.replace(/15-minute/g, '5-minute');
                el.innerHTML = el.innerHTML.replace(/15 minute/g, '5-minute');
                el.innerHTML = el.innerHTML.replace(/15 minutes/g, '5 minutes');
                el.innerHTML = el.innerHTML.replace(/15 min/g, '5 min');
            }
        }
    });
    
    // Special update for the token price display
    const tokenDisplays = document.querySelectorAll('.token-price-display');
    tokenDisplays.forEach(display => {
        if (display.textContent.includes('15')) {
            display.textContent = display.textContent.replace('15', '5');
            display.textContent = display.textContent.replace(/15/g, '5');
        }
    });
}

// Setup homepage event listeners
function setupHomepageListeners() {
    // Sign up button
    const signupBtn = document.querySelector('.btn-primary');
    if (signupBtn && signupBtn.textContent.includes('Sign Up')) {
        signupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'auth.html?type=signup';
        });
    }
    
    // Login button
    const loginBtn = document.querySelector('a[href*="login"]');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'auth.html?type=login';
        });
    }
}

// Make functions available globally
window.connectToWhisper = connectToWhisper;

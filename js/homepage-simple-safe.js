// Simple, safe homepage JavaScript
console.log("Homepage.js - Simple & Safe");

document.addEventListener('DOMContentLoaded', function() {
    console.log("Homepage loaded");
    
    // Just update the timing text
    updateTimingText();
    
    // Load some sample whispers (no Firebase dependency)
    loadSampleWhispers();
});

function updateTimingText() {
    // Just update text on page
    const elements = document.querySelectorAll('.token-price-display, p, h1, h2, h3, h4, h5, h6');
    elements.forEach(el => {
        if (el.textContent.includes('15-minute')) {
            el.textContent = el.textContent.replace('15-minute', '5-minute');
        }
        if (el.textContent.includes('15 minute')) {
            el.textContent = el.textContent.replace('15 minute', '5-minute');
        }
    });
}

function loadSampleWhispers() {
    const container = document.getElementById('homepageWhispers');
    if (!container) return;
    
    const sampleWhispers = [
        { name: "Alex", title: "Creative Writer", desc: "Love discussing stories", interests: ["Writing", "Books"] },
        { name: "Sam", title: "Life Coach", desc: "Personal growth expert", interests: ["Coaching", "Wellness"] },
        { name: "Taylor", title: "Tech Expert", desc: "Tech trends & startups", interests: ["Technology", "AI"] },
        { name: "Jordan", title: "Travel Guide", desc: "Travel stories & tips", interests: ["Travel", "Culture"] },
        { name: "Casey", title: "Music Producer", desc: "Music & creativity", interests: ["Music", "Audio"] },
        { name: "Morgan", title: "Fitness Coach", desc: "Health & wellness", interests: ["Fitness", "Nutrition"] }
    ];
    
    let html = '';
    sampleWhispers.forEach((whisper, index) => {
        html += `
            <div style="background: white; border-radius: 15px; padding: 20px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; color: white; font-size: 1.5rem;">
                    <i class="fas fa-user"></i>
                </div>
                <h4 style="margin: 0 0 5px 0; color: #333;">${whisper.name}</h4>
                <p style="color: #667eea; font-weight: 600; margin: 0 0 10px 0; font-size: 0.9rem;">${whisper.title}</p>
                <p style="color: #666; font-size: 0.85rem; margin: 0 0 10px 0;">${whisper.desc}</p>
                <div style="display: flex; justify-content: center; gap: 5px; flex-wrap: wrap;">
                    ${whisper.interests.map(i => `<span style="background: #f0f4ff; color: #667eea; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem;">${i}</span>`).join('')}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Replace loading message
    const loading = container.querySelector('.loading-state');
    if (loading) loading.style.display = 'none';
}

// Safe connect function
window.connectToWhisper = function() {
    alert('Please sign in to start a conversation!');
    window.location.href = 'auth.html?type=login';
};

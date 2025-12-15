// ✅ SIMPLE STRIPE PAYMENT FOR WHISPER COINS
console.log("Stripe payment system loaded");

const STRIPE_PUBLIC_KEY = "pk_test_51SPYHwRvETRK3Zx7mnVDTNyPB3mxT8vbSIcSVQURp8irweK0lGznwFrW9sjgju2GFgmDiQ5GkWYVlUQZZVNrXkJb00q2QOCC3I";
const STRIPE_PRODUCT_ID = "prod_TZ0C0wOq1WjSyy"; // Your $15 product

// Initialize Stripe
let stripe = null;
let elements = null;

async function initializeStripe() {
    try {
        // Load Stripe.js
        if (typeof Stripe === 'undefined') {
            console.error("Stripe.js not loaded");
            return false;
        }
        
        stripe = Stripe(STRIPE_PUBLIC_KEY);
        console.log("✅ Stripe initialized");
        return true;
    } catch (error) {
        console.error("Stripe initialization error:", error);
        return false;
    }
}

// Create a checkout session
async function createWhisperCoinCheckout(userId, userEmail) {
    console.log("Creating checkout for:", userEmail);
    
    try {
        // Create a checkout session on your server
        // For now, we'll simulate a direct checkout
        // In production, you need a backend
        
        const checkoutUrl = `https://buy.stripe.com/test_14k3gJ0uT9Hp1Ic4gg?prefilled_email=${encodeURIComponent(userEmail)}&client_reference_id=${userId}`;
        
        // Redirect to Stripe Checkout
        window.location.href = checkoutUrl;
        
        // Alternative: Open in new tab
        // window.open(checkoutUrl, '_blank');
        
        return true;
        
    } catch (error) {
        console.error("Checkout error:", error);
        alert("Payment error: " + error.message);
        return false;
    }
}

// Handle successful payment (to be called from webhook)
async function handleSuccessfulPayment(userId, paymentId) {
    console.log(`Payment successful for user ${userId}, payment ${paymentId}`);
    
    try {
        const db = firebase.firestore();
        const userRef = db.collection('users').doc(userId);
        
        // Add 1 Whisper Coin
        await userRef.update({
            coins: firebase.firestore.FieldValue.increment(1),
            lastPayment: new Date(),
            paymentId: paymentId,
            totalSpent: firebase.firestore.FieldValue.increment(15)
        });
        
        console.log("✅ Added 1 Whisper Coin to user");
        
        // Show success message
        alert("✅ Payment successful! 1 Whisper Coin added to your account.");
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error("Error updating user after payment:", error);
    }
}

// Simple buy button handler
function setupBuyButtons() {
    const buyButtons = document.querySelectorAll('[data-action="buy-token"]');
    
    buyButtons.forEach(button => {
        button.addEventListener('click', async function() {
            if (!firebase.auth().currentUser) {
                alert("Please log in to buy tokens");
                window.location.href = 'auth.html?type=login';
                return;
            }
            
            const user = firebase.auth().currentUser;
            const confirmed = confirm("Buy 1 Whisper Coin for $15?\nYou'll be redirected to Stripe.");
            
            if (confirmed) {
                await createWhisperCoinCheckout(user.uid, user.email);
            }
        });
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Payment page loaded");
    
    // Wait for Firebase auth
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(async function(user) {
            if (user) {
                await initializeStripe();
                setupBuyButtons();
            }
        });
    }
});

// Make functions available globally
window.createWhisperCoinCheckout = createWhisperCoinCheckout;
window.handleSuccessfulPayment = handleSuccessfulPayment;

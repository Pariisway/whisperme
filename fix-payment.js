// Fixed payment.js for $15 tokens
console.log('Payment page loaded - Fixed version');

let stripe, user;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing payment page...');
    
    // Initialize Stripe with your public key
    stripe = Stripe('pk_test_51SPYHwRvETRK3Zx7mnVDTNyPB3mxT8vbSIcSVQURp8irweK0lGznwFrW9sjgju2GFgmDiQ5GkWYVlUQZZVNrXkJb00q2QOCC3I', {
        locale: 'en'
    });
    
    // Wait for Firebase
    let checkCount = 0;
    const maxChecks = 50;
    
    const waitForFirebase = setInterval(() => {
        if (window.firebase && firebase.apps.length > 0) {
            clearInterval(waitForFirebase);
            initPaymentPage();
        } else if (checkCount++ > maxChecks) {
            clearInterval(waitForFirebase);
            console.error('Firebase not loaded');
        }
    }, 100);
});

async function initPaymentPage() {
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    auth.onAuthStateChanged(async (currentUser) => {
        if (!currentUser) {
            window.location.href = 'auth.html?type=login';
            return;
        }
        
        user = currentUser;
        console.log('User authenticated:', user.email);
        
        // Load user tokens
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data() || {};
        
        document.getElementById('currentTokens').textContent = userData.tokens || 0;
        
        // Setup event listeners
        document.querySelectorAll('.token-option').forEach(option => {
            option.addEventListener('click', function() {
                const tokens = parseInt(this.getAttribute('data-tokens'));
                purchaseTokens(tokens);
            });
        });
        
        // Custom amount
        document.getElementById('buyCustomBtn').addEventListener('click', function() {
            const customAmount = document.getElementById('customTokens').value;
            if (customAmount && customAmount > 0) {
                purchaseTokens(parseInt(customAmount));
            } else {
                alert('Please enter a valid number of tokens');
            }
        });
    });
}

async function purchaseTokens(tokenAmount) {
    if (!user) {
        alert('Please log in to purchase tokens');
        window.location.href = 'auth.html?type=login';
        return;
    }
    
    console.log('Purchasing', tokenAmount, 'tokens');
    
    // Calculate price: $15 per token
    const pricePerToken = 1500; // $15 in cents
    const totalAmount = tokenAmount * pricePerToken;
    
    // Create checkout session on your backend
    try {
        // Note: You need a backend endpoint to create Stripe checkout sessions
        // For now, we'll create a direct checkout session
        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer sk_test_51SPYHwRvETRK3Zx7...', // You need your secret key here
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'payment_method_types[]': 'card',
                'line_items[0][price_data][currency]': 'usd',
                'line_items[0][price_data][product_data][name]': `Whisper+Me Tokens (${tokenAmount})`,
                'line_items[0][price_data][unit_amount]': totalAmount,
                'line_items[0][quantity]': 1,
                'mode': 'payment',
                'success_url': `${window.location.origin}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
                'cancel_url': `${window.location.origin}/payment.html`,
                'client_reference_id': user.uid,
                'customer_email': user.email,
            })
        });
        
        const session = await response.json();
        
        // Redirect to Stripe Checkout
        const result = await stripe.redirectToCheckout({
            sessionId: session.id
        });
        
        if (result.error) {
            alert(result.error.message);
        }
        
    } catch (error) {
        console.error('Error creating checkout session:', error);
        alert('Error processing payment: ' + error.message);
        
        // Fallback: Direct to Stripe payment link
        const amountInDollars = (totalAmount / 100).toFixed(2);
        alert(`Direct payment link: $${amountInDollars} for ${tokenAmount} tokens\n\nYou need to set up a Stripe product for this.`);
    }
}

// Alternative: Simple token purchase without Stripe (for testing)
async function simpleTokenPurchase(tokenAmount) {
    if (!user) return;
    
    const db = firebase.firestore();
    const price = tokenAmount * 15; // $15 per token
    
    if (confirm(`Purchase ${tokenAmount} tokens for $${price}?`)) {
        // In production, you would process payment here
        // For testing, just add tokens
        const userDoc = await db.collection('users').doc(user.uid).get();
        const currentTokens = userDoc.data().tokens || 0;
        const newTokens = currentTokens + tokenAmount;
        
        await db.collection('users').doc(user.uid).update({
            tokens: newTokens,
            updatedAt: new Date()
        });
        
        alert(`Success! ${tokenAmount} tokens added to your account. Total: ${newTokens} tokens`);
        document.getElementById('currentTokens').textContent = newTokens;
    }
}

// Make functions globally available
window.purchaseTokens = purchaseTokens;
window.simpleTokenPurchase = simpleTokenPurchase;

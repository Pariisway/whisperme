// Stripe Payment Integration for Whisper+me

let stripe = null;
let currentUser = null;

// Initialize Stripe
function initStripe() {
    stripe = Stripe('pk_test_51SPYHwRvETRK3Zx7mnVDTNyPB3mxT8vbSIcSVQURp8irweK0lGznwFrW9sjgju2GFgmDiQ5GkWYVlUQZZVNrXkJb00q2QOCC3I');
    
    // Check auth
    auth.onAuthStateChanged(user => {
        currentUser = user;
    });
    
    // Setup buy buttons
    setupBuyButtons();
}

// Setup buy buttons
function setupBuyButtons() {
    document.querySelectorAll('.buy-btn').forEach(button => {
        button.addEventListener('click', async function() {
            if (!currentUser) {
                alert('Please login first');
                window.location.href = 'auth.html?type=login';
                return;
            }
            
            const tokens = parseInt(this.getAttribute('data-tokens'));
            const price = parseInt(this.getAttribute('data-price'));
            
            await createCheckoutSession(tokens, price);
        });
    });
}

// Create Stripe Checkout Session via Firebase Function
async function createCheckoutSession(tokens, price) {
    try {
        showPaymentMessage('Creating checkout session...', 'info');
        
        // Call Firebase Function
        const createCheckoutFunction = firebase.functions().httpsCallable('createCheckoutSession');
        const result = await createCheckoutFunction({ tokens: tokens });
        
        // Redirect to Stripe Checkout
        const { error } = await stripe.redirectToCheckout({
            sessionId: result.data.sessionId
        });
        
        if (error) {
            console.error('Stripe redirect error:', error);
            showPaymentMessage('Error: ' + error.message, 'error');
        }
        
    } catch (error) {
        console.error('Error creating checkout:', error);
        showPaymentMessage('Error processing payment', 'error');
    }
}

// Handle payment result from URL
function handlePaymentResult() {
    const urlParams = new URLSearchParams(window.location.search);
    const result = urlParams.get('payment');
    
    if (result === 'success') {
        showPaymentMessage('✅ Payment successful! Tokens added to your account.', 'success');
        // Refresh token display
        if (typeof updateTokenDisplay === 'function') {
            updateTokenDisplay();
        }
    } else if (result === 'cancelled') {
        showPaymentMessage('Payment cancelled', 'info');
    }
}

// Show payment message
function showPaymentMessage(message, type = 'info') {
    const messageDiv = document.getElementById('paymentMessage') || createMessageDiv();
    
    messageDiv.textContent = message;
    messageDiv.className = `alert alert-${type}`;
    messageDiv.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Create message div if it doesn't exist
function createMessageDiv() {
    const div = document.createElement('div');
    div.id = 'paymentMessage';
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        min-width: 300px;
        max-width: 400px;
    `;
    document.body.appendChild(div);
    return div;
}

// Initialize on page load
if (window.location.pathname.includes('payment.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        initStripe();
        handlePaymentResult();
    });
}

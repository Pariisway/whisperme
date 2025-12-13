// Payment and Tokens JavaScript - $15 per token with Stripe
const TOKEN_PRICE = 15; // Fixed price per token

// Stripe Test Keys
const STRIPE_PUBLIC_KEY = 'pk_test_51SPYHwRvETRK3Zx7mnVDTNyPB3mxT8vbSIcSVQURp8irweK0lGznwFrW9sjgju2GFgmDiQ5GkWYVlUQZZVNrXkJb00q2QOCC3I'; // Replace with your actual test key
let stripe = null;
let elements = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log("Payment page loaded");
    
    // Initialize Stripe
    if (typeof Stripe !== 'undefined') {
        stripe = Stripe(STRIPE_PUBLIC_KEY);
        elements = stripe.elements();
        
        // Create card element
        const style = {
            base: {
                color: '#32325d',
                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSmoothing: 'antialiased',
                fontSize: '16px',
                '::placeholder': {
                    color: '#aab7c4'
                }
            },
            invalid: {
                color: '#fa755a',
                iconColor: '#fa755a'
            }
        };
        
        const card = elements.create('card', {style: style});
        card.mount('#card-element');
        
        // Handle real-time validation errors
        card.addEventListener('change', function(event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
                displayError.style.color = 'var(--danger)';
            } else {
                displayError.textContent = '';
            }
        });
    }
    
    // Check authentication
    checkAuth();
    
    // Load payment data
    loadPaymentData();
    
    // Setup event listeners
    setupEventListeners();
});

// Check authentication
function checkAuth() {
    if (typeof auth === 'undefined') return;
    
    auth.onAuthStateChanged(function(user) {
        if (!user) {
            window.location.href = 'auth.html?redirect=payment';
        } else {
            window.currentUserId = user.uid;
            updateUserInfo(user);
        }
    });
}

// Update user info
function updateUserInfo(user) {
    const paypalEmailInput = document.getElementById('paypalEmail');
    if (paypalEmailInput && user.email && !paypalEmailInput.value) {
        paypalEmailInput.value = user.email;
    }
}

// Load payment data
function loadPaymentData() {
    if (!window.currentUserId) return;
    
    // Load from Firestore
    db.collection('profiles').doc(window.currentUserId).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('tokenBalance').innerHTML = 
                    `${data.tokens || 0} <span style="font-size: 1rem; opacity: 0.8;">tokens</span>`;
                document.getElementById('totalEarnings').textContent = 
                    `$${(data.totalEarnings || 0).toFixed(2)}`;
                document.getElementById('tokensUsed').textContent = 
                    data.tokensUsed || 0;
                document.getElementById('availableForPayout').textContent = 
                    `$${(data.availableForPayout || 0).toFixed(2)}`;
                
                // Load transaction history
                loadTransactionHistory();
            }
        })
        .catch(error => {
            console.error("Error loading payment data:", error);
        });
}

// Load transaction history
async function loadTransactionHistory() {
    const container = document.getElementById('transactionList');
    if (!container || !window.currentUserId) return;
    
    try {
        const transactionsSnapshot = await db.collection('transactions')
            .where('userId', '==', window.currentUserId)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        container.innerHTML = '';
        
        if (transactionsSnapshot.empty) {
            container.innerHTML = `
                <div class="no-transactions" style="text-align: center; padding: 2rem; color: var(--gray);">
                    <i class="fas fa-receipt fa-2x" style="margin-bottom: 1rem;"></i>
                    <p>No transactions yet</p>
                </div>
            `;
            return;
        }
        
        transactionsSnapshot.forEach(doc => {
            const transaction = doc.data();
            const item = createTransactionItem(transaction);
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error("Error loading transactions:", error);
        container.innerHTML = `
            <div class="error" style="text-align: center; padding: 2rem; color: var(--danger);">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading transactions</p>
            </div>
        `;
    }
}

// Create transaction item
function createTransactionItem(transaction) {
    const item = document.createElement('div');
    item.className = 'transaction-item';
    item.style.cssText = `
        display: flex;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--light-gray);
        transition: all 0.3s ease;
    `;
    
    const icon = transaction.type === 'token_purchase' ? 'shopping-cart' : 
                 transaction.type === 'earnings' ? 'money-bill-wave' : 
                 transaction.type === 'payout' ? 'external-link-alt' : 'receipt';
    
    const color = transaction.type === 'token_purchase' ? 'var(--primary-blue)' : 
                  transaction.type === 'earnings' ? 'var(--success)' : 
                  transaction.type === 'payout' ? 'var(--accent-yellow)' : 'var(--gray)';
    
    const date = new Date(transaction.timestamp).toLocaleDateString();
    const time = new Date(transaction.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    item.innerHTML = `
        <div style="width: 50px; height: 50px; 
                    background: ${color}; 
                    border-radius: 50%; display: flex; align-items: center; justify-content: center; 
                    color: white; margin-right: 1rem; font-size: 1.25rem;">
            <i class="fas fa-${icon}"></i>
        </div>
        <div style="flex: 1;">
            <h4 style="margin: 0; font-size: 1.1rem;">${transaction.description || 'Transaction'}</h4>
            <p style="margin: 0.25rem 0; color: var(--gray);">${date} ${time}</p>
            <span style="background: var(--light-gray); padding: 0.25rem 0.75rem; border-radius: var(--radius); 
                        font-size: 0.8rem; color: var(--gray-dark);">
                ${transaction.status || 'completed'}
            </span>
        </div>
        <div style="font-weight: bold; color: ${transaction.amount > 0 ? 'var(--success)' : 'var(--danger)'};">
            ${transaction.amount > 0 ? '+' : ''}$${Math.abs(transaction.amount).toFixed(2)}
        </div>
    `;
    
    return item;
}

// Setup event listeners
function setupEventListeners() {
    // Buy token buttons
    const buyButtons = document.querySelectorAll('.buy-btn');
    buyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tokens = parseInt(this.getAttribute('data-tokens'));
            const price = parseInt(this.getAttribute('data-price'));
            showPaymentModal(tokens, price);
        });
    });
    
    // Payout amount input
    const payoutAmountInput = document.getElementById('payoutAmount');
    const payoutBtn = document.getElementById('requestPayoutBtn');
    
    if (payoutAmountInput && payoutBtn) {
        payoutAmountInput.addEventListener('input', function() {
            const amount = parseFloat(this.value) || 0;
            const available = parseFloat(document.getElementById('availableForPayout').textContent.replace('$', '')) || 0;
            
            if (amount >= 20 && amount <= available) {
                payoutBtn.disabled = false;
                payoutBtn.classList.remove('btn-secondary');
                payoutBtn.classList.add('btn-success');
            } else {
                payoutBtn.disabled = true;
                payoutBtn.classList.remove('btn-success');
                payoutBtn.classList.add('btn-secondary');
            }
        });
        
        payoutBtn.addEventListener('click', requestPayout);
    }
    
    // Setup logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof auth !== 'undefined') {
                auth.signOut().then(() => {
                    window.location.href = 'index.html';
                });
            }
        });
    }
}

// Show payment modal
function showPaymentModal(tokens, price) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-body">
                <h3>Purchase ${tokens} Tokens</h3>
                <p>Total: <strong>$${price}</strong> ($${TOKEN_PRICE} per token)</p>
                <p>Each token gives you one 5-minute private conversation.</p>
                
                <div class="token-price-display" style="margin: 1rem 0;">
                    <i class="fas fa-coins"></i> ${tokens} tokens × $${TOKEN_PRICE} = $${price}
                </div>
                
                <div id="card-element" style="margin: 1.5rem 0; padding: 1rem; border: 1px solid var(--light-gray); border-radius: var(--radius);">
                    <!-- Stripe Card Element will be inserted here -->
                </div>
                
                <div id="card-errors" role="alert" style="color: var(--danger); margin: 0.5rem 0; min-height: 20px;"></div>
                
                <div class="form-group">
                    <label for="email"><i class="fas fa-envelope"></i> Email for receipt</label>
                    <input type="email" id="receiptEmail" class="form-control" placeholder="Enter email for receipt" value="${auth.currentUser?.email || ''}">
                </div>
                
                <div class="test-card-info" style="background: var(--light-gray); padding: 1rem; border-radius: var(--radius); margin: 1rem 0;">
                    <h5><i class="fas fa-vial"></i> Test Card Information</h5>
                    <p style="margin: 0.5rem 0; font-size: 0.9rem;">
                        <strong>Card:</strong> 4242 4242 4242 4242<br>
                        <strong>Exp:</strong> 12/34<br>
                        <strong>CVC:</strong> 123<br>
                        <strong>ZIP:</strong> 12345
                    </p>
                </div>
                
                <div class="modal-buttons" style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button id="processPaymentBtn" class="btn btn-primary" style="flex: 1;">
                        <i class="fas fa-lock"></i> Pay $${price}
                    </button>
                    <button id="cancelPaymentBtn" class="btn btn-secondary" style="flex: 1;">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initialize Stripe Elements in modal
    if (stripe && elements) {
        const cardElement = elements.create('card', {
            style: {
                base: {
                    color: '#32325d',
                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '16px',
                    '::placeholder': {
                        color: '#aab7c4'
                    }
                }
            }
        });
        
        // Mount card element in modal
        setTimeout(() => {
            const cardContainer = modal.querySelector('#card-element');
            if (cardContainer) {
                cardElement.mount(cardContainer);
                
                // Handle validation errors
                cardElement.addEventListener('change', function(event) {
                    const displayError = modal.querySelector('#card-errors');
                    if (event.error) {
                        displayError.textContent = event.error.message;
                        displayError.style.color = 'var(--danger)';
                    } else {
                        displayError.textContent = '';
                    }
                });
            }
        }, 100);
        
        // Process payment
        modal.querySelector('#processPaymentBtn').addEventListener('click', async function() {
            await processPayment(tokens, price, cardElement, modal);
        });
    }
    
    // Cancel payment
    modal.querySelector('#cancelPaymentBtn').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Process payment with Stripe
async function processPayment(tokens, price, cardElement, modal) {
    if (!window.currentUserId || !stripe) {
        showMessage('Payment system not available', 'error');
        return;
    }
    
    const processBtn = modal.querySelector('#processPaymentBtn');
    const originalText = processBtn.innerHTML;
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    processBtn.disabled = true;
    
    try {
        // 1. Create payment intent on your backend
        // In a real app, you would call your backend to create a payment intent
        // For demo purposes, we'll simulate this
        
        // Simulate backend call
        const paymentIntent = await simulateCreatePaymentIntent(price, tokens);
        
        // 2. Confirm card payment
        const result = await stripe.confirmCardPayment(paymentIntent.client_secret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    email: modal.querySelector('#receiptEmail').value || auth.currentUser.email
                }
            }
        });
        
        if (result.error) {
            // Show error to customer
            const errorElement = modal.querySelector('#card-errors');
            errorElement.textContent = result.error.message;
            errorElement.style.color = 'var(--danger)';
            
            processBtn.innerHTML = originalText;
            processBtn.disabled = false;
            
        } else {
            // Payment succeeded
            if (result.paymentIntent.status === 'succeeded') {
                // Add tokens to user's account
                await addTokensToAccount(tokens, price);
                
                // Show success message
                showMessage(`Successfully purchased ${tokens} tokens!`, 'success');
                
                // Close modal
                document.body.removeChild(modal);
                
                // Update token balance
                loadPaymentData();
            }
        }
        
    } catch (error) {
        console.error("Payment error:", error);
        showMessage('Payment failed: ' + error.message, 'error');
        
        processBtn.innerHTML = originalText;
        processBtn.disabled = false;
    }
}

// Simulate creating payment intent (replace with actual backend call)
async function simulateCreatePaymentIntent(amount, tokens) {
    // In a real app, you would call your backend:
    // const response = await fetch('/create-payment-intent', {
    //     method: 'POST',
    //     headers: {'Content-Type': 'application/json'},
    //     body: JSON.stringify({amount, tokens, userId: window.currentUserId})
    // });
    // return await response.json();
    
    // For demo, return a simulated payment intent
    return {
        client_secret: 'pi_3Nt5YnF8l52pZgP11e2w8PqN_secret_7Q8H9jLmN6bVc7RtYw3A4sD5',
        id: 'pi_' + Date.now(),
        amount: amount * 100, // Stripe uses cents
        currency: 'usd'
    };
}

// Add tokens to user account
async function addTokensToAccount(tokens, amount) {
    if (!window.currentUserId) return;
    
    try {
        // Update user's token balance
        await db.collection('profiles').doc(window.currentUserId).update({
            tokens: firebase.firestore.FieldValue.increment(tokens),
            totalSpent: firebase.firestore.FieldValue.increment(amount)
        });
        
        // Create transaction record
        const transactionId = 'txn_' + Date.now();
        const transactionData = {
            transactionId: transactionId,
            userId: window.currentUserId,
            type: 'token_purchase',
            amount: amount,
            tokens: tokens,
            description: `Purchase of ${tokens} tokens`,
            status: 'completed',
            timestamp: new Date().toISOString()
        };
        
        await db.collection('transactions').doc(transactionId).set(transactionData);
        
        // Add to transaction history UI
        addTransactionToUI(transactionData);
        
    } catch (error) {
        console.error("Error adding tokens:", error);
        throw error;
    }
}

// Add transaction to UI
function addTransactionToUI(transaction) {
    const container = document.getElementById('transactionList');
    if (!container) return;
    
    const item = createTransactionItem(transaction);
    
    // Add to top of list
    if (container.firstChild) {
        container.insertBefore(item, container.firstChild);
    } else {
        container.appendChild(item);
    }
}

// Request payout
async function requestPayout() {
    const amount = document.getElementById('payoutAmount').value;
    const email = document.getElementById('paypalEmail').value;
    const messageEl = document.getElementById('payoutMessage');
    
    if (!amount || !email) {
        showMessage('Please fill in all fields', 'error', messageEl);
        return;
    }
    
    if (parseFloat(amount) < 20) {
        showMessage('Minimum payout amount is $20', 'error', messageEl);
        return;
    }
    
    // Show loading
    const payoutBtn = document.getElementById('requestPayoutBtn');
    const originalText = payoutBtn.innerHTML;
    payoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    payoutBtn.disabled = true;
    
    try {
        // In a real app, you would call your backend to process payout
        // For demo, we'll simulate it
        
        // Create payout request
        const payoutId = 'payout_' + Date.now();
        const payoutData = {
            payoutId: payoutId,
            userId: window.currentUserId,
            amount: parseFloat(amount),
            email: email,
            status: 'pending',
            requestedAt: new Date().toISOString()
        };
        
        await db.collection('payouts').doc(payoutId).set(payoutData);
        
        // Update available balance
        await db.collection('profiles').doc(window.currentUserId).update({
            availableForPayout: firebase.firestore.FieldValue.increment(-parseFloat(amount))
        });
        
        // Create transaction record
        const transactionId = 'txn_payout_' + Date.now();
        const transactionData = {
            transactionId: transactionId,
            userId: window.currentUserId,
            type: 'payout',
            amount: -parseFloat(amount),
            description: `Payout request to ${email}`,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        
        await db.collection('transactions').doc(transactionId).set(transactionData);
        
        showMessage(`Payout request of $${amount} has been submitted! It will be processed within 3-5 business days.`, 'success', messageEl);
        
        // Reset button
        payoutBtn.innerHTML = originalText;
        payoutBtn.disabled = false;
        
        // Clear form
        document.getElementById('payoutAmount').value = '';
        
        // Update available balance display
        loadPaymentData();
        
    } catch (error) {
        console.error("Error requesting payout:", error);
        showMessage('Error processing payout request: ' + error.message, 'error', messageEl);
        
        payoutBtn.innerHTML = originalText;
        payoutBtn.disabled = false;
    }
}

// Show message
function showMessage(message, type, element) {
    if (!element) {
        // Create global message
        const existingMessages = document.querySelectorAll('.global-alert');
        existingMessages.forEach(msg => msg.remove());
        
        const messageEl = document.createElement('div');
        messageEl.className = `alert alert-${type} global-alert`;
        messageEl.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(messageEl);
        
        if (type === 'success') {
            setTimeout(() => {
                messageEl.remove();
            }, 5000);
        }
    } else {
        element.textContent = message;
        element.className = `alert alert-${type}`;
        element.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }
}

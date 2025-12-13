// Payment and Tokens JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log("Payment page loaded");
    
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
            // Redirect to login if not authenticated
            window.location.href = 'auth.html?redirect=payment';
        } else {
            // Update user info
            updateUserInfo(user);
        }
    });
}

// Update user info
function updateUserInfo(user) {
    const email = user.email;
    const paypalEmailInput = document.getElementById('paypalEmail');
    if (paypalEmailInput && email && !paypalEmailInput.value) {
        paypalEmailInput.value = email;
    }
}

// Load payment data
function loadPaymentData() {
    // Demo data
    setTimeout(() => {
        document.getElementById('tokenBalance').innerHTML = '<h2 style="font-size: 2.5rem; margin: 0;">5 <small style="font-size: 1rem;">tokens</small></h2>';
        document.getElementById('totalEarnings').textContent = '$124.50';
        document.getElementById('callsCompleted').textContent = '12';
        document.getElementById('averageRating').textContent = '4.8 ★';
        document.getElementById('availableForPayout').textContent = '$89.50';
    }, 1000);
}

// Setup event listeners
function setupEventListeners() {
    // Buy token buttons
    const buyButtons = document.querySelectorAll('.buy-btn');
    buyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.package-card');
            const tokens = card.getAttribute('data-tokens');
            const price = card.getAttribute('data-price');
            buyTokens(tokens, price);
        });
    });
    
    // Payout amount input
    const payoutAmountInput = document.getElementById('payoutAmount');
    const payoutBtn = document.getElementById('requestPayoutBtn');
    
    if (payoutAmountInput && payoutBtn) {
        payoutAmountInput.addEventListener('input', function() {
            const amount = parseFloat(this.value) || 0;
            const available = 89.50; // Demo available amount
            
            if (amount >= 20 && amount <= available) {
                payoutBtn.disabled = false;
            } else {
                payoutBtn.disabled = true;
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

// Buy tokens
function buyTokens(tokens, price) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-body">
                <h3>Confirm Purchase</h3>
                <p>You are about to purchase <strong>${tokens} tokens</strong> for <strong>$${price}</strong>.</p>
                <p>This will give you approximately ${tokens} minutes of call time.</p>
                
                <div class="form-group" style="margin-top: 1.5rem;">
                    <label for="cardNumber">Card Number</label>
                    <input type="text" id="cardNumber" class="form-control" placeholder="1234 5678 9012 3456">
                </div>
                
                <div class="form-group">
                    <label for="expiryDate">Expiry Date</label>
                    <input type="text" id="expiryDate" class="form-control" placeholder="MM/YY">
                </div>
                
                <div class="form-group">
                    <label for="cvv">CVV</label>
                    <input type="text" id="cvv" class="form-control" placeholder="123">
                </div>
                
                <div class="modal-buttons" style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button id="confirmPurchaseBtn" class="btn btn-primary" style="flex: 1;">
                        <i class="fas fa-check"></i> Confirm Purchase
                    </button>
                    <button id="cancelPurchaseBtn" class="btn btn-secondary" style="flex: 1;">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // Confirm purchase
    document.getElementById('confirmPurchaseBtn').addEventListener('click', function() {
        // In a real app, this would process payment
        alert(`Successfully purchased ${tokens} tokens for $${price}!`);
        document.body.removeChild(modal);
        
        // Update token balance
        const currentBalance = 5; // Demo current balance
        const newBalance = currentBalance + parseInt(tokens);
        document.getElementById('tokenBalance').innerHTML = `<h2 style="font-size: 2.5rem; margin: 0;">${newBalance} <small style="font-size: 1rem;">tokens</small></h2>`;
        
        // Add to transaction history
        addTransaction(tokens, price);
    });
    
    // Cancel purchase
    document.getElementById('cancelPurchaseBtn').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
}

// Request payout
function requestPayout() {
    const amount = document.getElementById('payoutAmount').value;
    const email = document.getElementById('paypalEmail').value;
    const messageEl = document.getElementById('payoutMessage');
    
    if (!amount || !email) {
        messageEl.textContent = 'Please fill in all fields';
        messageEl.className = 'alert alert-error';
        messageEl.style.display = 'block';
        return;
    }
    
    if (parseFloat(amount) < 20) {
        messageEl.textContent = 'Minimum payout amount is $20';
        messageEl.className = 'alert alert-error';
        messageEl.style.display = 'block';
        return;
    }
    
    // Show loading
    const payoutBtn = document.getElementById('requestPayoutBtn');
    const originalText = payoutBtn.innerHTML;
    payoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    payoutBtn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        messageEl.textContent = `Payout request of $${amount} to ${email} has been submitted! It will be processed within 3-5 business days.`;
        messageEl.className = 'alert alert-success';
        messageEl.style.display = 'block';
        
        // Reset button
        payoutBtn.innerHTML = originalText;
        payoutBtn.disabled = false;
        
        // Clear form
        document.getElementById('payoutAmount').value = '';
        
        // Update available balance
        const currentAvailable = 89.50;
        const newAvailable = currentAvailable - parseFloat(amount);
        document.getElementById('availableForPayout').textContent = `$${newAvailable.toFixed(2)}`;
        
    }, 2000);
}

// Add transaction to history
function addTransaction(tokens, price) {
    const transactionList = document.getElementById('transactionList');
    if (!transactionList) return;
    
    const transaction = document.createElement('div');
    transaction.className = 'transaction-item';
    transaction.innerHTML = `
        <div class="transaction-icon">
            <i class="fas fa-shopping-cart"></i>
        </div>
        <div class="transaction-details">
            <h4>Token Purchase</h4>
            <p>${tokens} tokens - $${price}</p>
            <small class="text-muted">Just now</small>
        </div>
        <div class="transaction-amount negative">
            -$${price}
        </div>
    `;
    
    // Add to top of list
    if (transactionList.firstChild) {
        transactionList.insertBefore(transaction, transactionList.firstChild);
    } else {
        transactionList.appendChild(transaction);
    }
}

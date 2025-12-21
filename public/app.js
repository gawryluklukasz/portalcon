// ============================================
// GLOBAL STATE
// ============================================
let db;
let currentUser = null;
let userRole = null;
let cart = [];
let adminCart = [];
let isRegisterMode = false;
let currentAdminPanel = 'customer';

// ============================================
// MENU DATA
// ============================================
const menuItems = [
    { id: 1, name: 'Pizza Margherita', category: 'food', price: 25 },
    { id: 2, name: 'Pizza Pepperoni', category: 'food', price: 30 },
    { id: 3, name: 'Burger Classic', category: 'food', price: 22 },
    { id: 4, name: 'Burger Bacon', category: 'food', price: 28 },
    { id: 5, name: 'Spaghetti Carbonara', category: 'food', price: 26 },
    { id: 6, name: 'Spaghetti Bolognese', category: 'food', price: 24 },
    { id: 7, name: 'Caesar Salad', category: 'food', price: 18 },
    { id: 8, name: 'Greek Salad', category: 'food', price: 16 },
    { id: 9, name: 'Coca Cola', category: 'drink', price: 8 },
    { id: 10, name: 'Sprite', category: 'drink', price: 8 },
    { id: 11, name: 'Orange Juice', category: 'drink', price: 10 },
    { id: 12, name: 'Apple Juice', category: 'drink', price: 10 },
    { id: 13, name: 'Coffee', category: 'drink', price: 12 },
    { id: 14, name: 'Tea', category: 'drink', price: 10 },
    { id: 15, name: 'Beer', category: 'drink', price: 15 },
    { id: 16, name: 'Wine', category: 'drink', price: 20 }
];

// ============================================
// FIREBASE INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking Firebase...');
    const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            clearInterval(checkFirebase);
            console.log('Firebase loaded successfully');
            db = firebase.firestore();
            console.log('Firestore initialized');
            initAuth();
        }
    }, 100);
});

// ============================================
// AUTHENTICATION
// ============================================
function initAuth() {
    console.log('Initializing auth...');
    firebase.auth().onAuthStateChanged(async (user) => {
        console.log('Auth state changed:', user ? user.email : 'no user');
        if (user) {
            currentUser = user;
            await checkAndSetUserRole(user);
            showViewBasedOnRole();
        } else {
            console.log('No user logged in, showing login view');
            showView('loginView');
        }
    });
}

async function checkAndSetUserRole(user) {
    console.log('Checking user role for:', user.uid);
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            userRole = userDoc.data().role;
            console.log('Existing user role:', userRole);
        } else {
            console.log('New user, creating with customer role');
            userRole = 'customer';
            await db.collection('users').doc(user.uid).set({
                email: user.email,
                name: user.displayName,
                role: 'customer',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('User created successfully');
        }
    } catch (error) {
        console.error('Error checking/setting user role:', error);
        throw error;
    }
}

function showViewBasedOnRole() {
    if (userRole === 'admin') {
        setupAdminView();
        showView('adminView');
    } else if (userRole === 'waiter') {
        setupWaiterView();
        showView('waiterView');
    } else {
        setupCustomerView();
        showView('customerView');
    }
}

function showView(viewId) {
    document.getElementById('loading').style.display = 'none';
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
}

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    const registerFields = document.getElementById('registerFields');
    const emailFormTitle = document.getElementById('emailFormTitle');
    const emailAuthBtn = document.getElementById('emailAuthBtn');
    const toggleAuthText = document.getElementById('toggleAuthText');
    const toggleAuthLink = document.getElementById('toggleAuthLink');
    
    if (isRegisterMode) {
        registerFields.style.display = 'block';
        emailFormTitle.textContent = 'Zarejestruj się';
        emailAuthBtn.innerHTML = '✏️ Zarejestruj się';
        toggleAuthText.textContent = 'Masz już konto?';
        toggleAuthLink.textContent = 'Zaloguj się';
    } else {
        registerFields.style.display = 'none';
        emailFormTitle.textContent = 'Zaloguj się';
        emailAuthBtn.innerHTML = '🔐 Zaloguj się';
        toggleAuthText.textContent = 'Nie masz konta?';
        toggleAuthLink.textContent = 'Zarejestruj się';
    }
}

function emailAuth() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Wypełnij email i hasło!');
        return;
    }
    
    if (isRegisterMode) {
        registerWithEmail(email, password);
    } else {
        loginWithEmail(email, password);
    }
}

async function registerWithEmail(email, password) {
    const name = document.getElementById('registerName').value.trim();
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    if (!name) {
        alert('Podaj imię i nazwisko!');
        return;
    }
    
    if (password !== passwordConfirm) {
        alert('Hasła nie są takie same!');
        return;
    }
    
    if (password.length < 6) {
        alert('Hasło musi mieć minimum 6 znaków!');
        return;
    }
    
    try {
        const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
        await result.user.updateProfile({
            displayName: name
        });
        console.log('Registration successful', result.user);
        alert('Rejestracja zakończona! Możesz się teraz zalogować.');
        
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerName').value = '';
        document.getElementById('registerPasswordConfirm').value = '';
        toggleAuthMode();
    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'Błąd rejestracji: ';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'Ten email jest już używany!';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Nieprawidłowy adres email!';
                break;
            case 'auth/weak-password':
                errorMessage += 'Hasło jest za słabe!';
                break;
            default:
                errorMessage += error.message;
        }
        alert(errorMessage);
    }
}

function loginWithEmail(email, password) {
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((result) => {
            console.log('Login successful', result.user);
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        })
        .catch((error) => {
            console.error('Login error:', error);
            let errorMessage = 'Błąd logowania: ';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage += 'Nie znaleziono użytkownika!';
                    break;
                case 'auth/wrong-password':
                    errorMessage += 'Nieprawidłowe hasło!';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Nieprawidłowy adres email!';
                    break;
                case 'auth/too-many-requests':
                    errorMessage += 'Za dużo prób logowania. Spróbuj później.';
                    break;
                default:
                    errorMessage += error.message;
            }
            alert(errorMessage);
        });
}

function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            console.log('Login successful', result.user);
        })
        .catch((error) => {
            console.error('Login error:', error);
            alert('Błąd logowania: ' + error.message);
        });
}

function logout() {
    firebase.auth().signOut()
        .then(() => {
            currentUser = null;
            userRole = null;
            cart = [];
            adminCart = [];
            currentAdminPanel = 'customer';
            showView('loginView');
        })
        .catch((error) => {
            console.error('Logout error:', error);
        });
}

// ============================================
// HELPER FUNCTIONS - UI
// ============================================
function setButtonActive(button, isActive) {
    if (isActive) {
        button.style.background = '#667eea';
        button.style.color = 'white';
    } else {
        button.style.background = '#e5e7eb';
        button.style.color = '#333';
    }
}

function createOrderCard(order, orderId, options = {}) {
    const { showUserInfo = false, showActions = false } = options;
    const orderCard = document.createElement('div');
    orderCard.className = `order-card status-${order.status}`;
    
    const statusText = order.status === 'pending' ? 'Oczekuje' : 'Przyjęte';
    const statusClass = order.status === 'pending' ? 'pending' : 'accepted';
    const statusIcon = order.status === 'pending' ? '⏳' : '✅';
    
    let itemsHtml = '';
    order.items.forEach(item => {
        itemsHtml += `<div class="order-item">• ${item.name} - ${item.price} zł</div>`;
    });
    
    const createdAt = order.createdAt ? 
        new Date(order.createdAt.seconds * 1000).toLocaleString('pl-PL') : 
        'Teraz';
    
    let userInfoHtml = '';
    if (showUserInfo) {
        userInfoHtml = `
            <div style="margin-bottom: 12px; color: #666; font-size: 14px;">
                👤 ${order.userName}<br>
                📧 ${order.userEmail}<br>
                🕐 ${createdAt}
            </div>
        `;
    } else {
        userInfoHtml = `
            <div style="margin-bottom: 12px; color: #666; font-size: 14px;">
                🕐 ${createdAt}
            </div>
        `;
    }
    
    let actionButton = '';
    if (showActions) {
        if (order.status === 'pending') {
            actionButton = `<button class="btn btn-success" style="width: auto; padding: 8px 16px;" onclick="acceptOrder('${orderId}')">✓ Przyjmij</button>`;
        } else {
            actionButton = `<div style="color: #10b981; font-weight: 600;">✓ Zamówienie przyjęte</div>`;
        }
    } else {
        actionButton = `<div style="font-weight: 700; color: #10b981;">${order.total} zł</div>`;
    }
    
    orderCard.innerHTML = `
        <div class="order-header">
            <div class="order-number">Zamówienie #${orderId.substring(0, 6)}</div>
            <div class="order-status ${statusClass}">${statusIcon} ${statusText}</div>
        </div>
        ${userInfoHtml}
        <div class="order-items">
            ${itemsHtml}
        </div>
        <div class="order-footer">
            <div class="table-number">🪑 Stolik ${order.tableNumber}</div>
            ${actionButton}
        </div>
    `;
    
    return orderCard;
}

function renderOrdersList(orderDocs, listElement, options = {}) {
    if (orderDocs.length === 0) {
        listElement.innerHTML = '<div class="cart-empty">Brak zamówień</div>';
        return;
    }
    
    listElement.innerHTML = '';
    orderDocs.forEach((doc) => {
        const orderCard = createOrderCard(doc.data(), doc.id, options);
        listElement.appendChild(orderCard);
    });
}

function renderMenuGrid(gridElement, items, cartArray, toggleFunction) {
    gridElement.innerHTML = '';
    
    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'menu-item';
        itemDiv.onclick = () => toggleFunction(item);
        
        const categoryEmoji = item.category === 'food' ? '🍽️' : '🥤';
        const categoryText = item.category === 'food' ? 'Jedzenie' : 'Napój';
        
        itemDiv.innerHTML = `
            <div class="category">${categoryEmoji} ${categoryText}</div>
            <h3>${item.name}</h3>
            <div class="price">${item.price} zł</div>
        `;
        
        if (cartArray.some(cartItem => cartItem.id === item.id)) {
            itemDiv.classList.add('selected');
        }
        
        gridElement.appendChild(itemDiv);
    });
}

function updateCartDisplay(cartArray, cartItemsElement, orderFormElement) {
    if (cartArray.length === 0) {
        cartItemsElement.innerHTML = '<div class="cart-empty">Koszyk jest pusty. Wybierz pozycje z menu.</div>';
        orderFormElement.style.display = 'none';
        return;
    }
    
    let html = '';
    let total = 0;
    
    cartArray.forEach(item => {
        html += `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>${item.price} zł</span>
            </div>
        `;
        total += item.price;
    });
    
    html += `
        <div class="cart-item" style="font-weight: 700; border-top: 2px solid #333; margin-top: 8px; padding-top: 16px;">
            <span>Razem:</span>
            <span>${total} zł</span>
        </div>
    `;
    
    cartItemsElement.innerHTML = html;
    orderFormElement.style.display = 'block';
}

// ============================================
// ADMIN VIEW
// ============================================
function setupAdminView() {
    document.getElementById('adminName').textContent = currentUser.displayName;
    document.getElementById('adminAvatar').src = currentUser.photoURL;
    
    switchAdminPanel('customer');
}

function switchAdminPanel(panel) {
    currentAdminPanel = panel;
    const customerPanel = document.getElementById('adminCustomerPanel');
    const waiterPanel = document.getElementById('adminWaiterPanel');
    const customerBtn = document.getElementById('adminCustomerBtn');
    const waiterBtn = document.getElementById('adminWaiterBtn');
    
    if (panel === 'customer') {
        customerPanel.style.display = 'block';
        waiterPanel.style.display = 'none';
        setButtonActive(customerBtn, true);
        setButtonActive(waiterBtn, false);
        
        renderAdminMenu();
        updateAdminCart();
        showAdminCustomerTab('menu');
    } else {
        customerPanel.style.display = 'none';
        waiterPanel.style.display = 'block';
        setButtonActive(customerBtn, false);
        setButtonActive(waiterBtn, true);
        
        loadAdminWaiterOrders();
    }
}

function showAdminCustomerTab(tab) {
    const menuTab = document.getElementById('adminMenuTab');
    const ordersTab = document.getElementById('adminOrdersTab');
    const menuBtn = document.getElementById('adminMenuTabBtn');
    const ordersBtn = document.getElementById('adminOrdersTabBtn');
    
    if (tab === 'menu') {
        menuTab.style.display = 'block';
        ordersTab.style.display = 'none';
        setButtonActive(menuBtn, true);
        setButtonActive(ordersBtn, false);
    } else {
        menuTab.style.display = 'none';
        ordersTab.style.display = 'block';
        setButtonActive(menuBtn, false);
        setButtonActive(ordersBtn, true);
        loadAdminCustomerOrders();
    }
}

function renderAdminMenu() {
    const menuGrid = document.getElementById('adminMenuGrid');
    renderMenuGrid(menuGrid, menuItems, adminCart, toggleAdminMenuItem);
}

function toggleAdminMenuItem(item) {
    const index = adminCart.findIndex(cartItem => cartItem.id === item.id);
    
    if (index > -1) {
        adminCart.splice(index, 1);
    } else {
        adminCart.push({ ...item });
    }
    
    updateAdminCart();
}

function updateAdminCart() {
    const cartItems = document.getElementById('adminCartItems');
    const orderForm = document.getElementById('adminOrderForm');
    updateCartDisplay(adminCart, cartItems, orderForm);
    renderAdminMenu();
}

async function placeOrderAsAdmin() {
    const tableNumber = document.getElementById('adminTableNumber').value;
    
    if (!tableNumber) {
        alert('Wybierz numer stolika!');
        return;
    }
    
    if (adminCart.length === 0) {
        alert('Koszyk jest pusty!');
        return;
    }
    
    try {
        const total = adminCart.reduce((sum, item) => sum + item.price, 0);
        
        await db.collection('orders').add({
            userId: currentUser.uid,
            userName: currentUser.displayName,
            userEmail: currentUser.email,
            tableNumber: parseInt(tableNumber),
            items: adminCart,
            total: total,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Zamówienie zostało złożone! ✅');
        
        adminCart = [];
        document.getElementById('adminTableNumber').value = '';
        updateAdminCart();
        showAdminCustomerTab('orders');
    } catch (error) {
        console.error('Error placing order:', error);
        alert('Błąd składania zamówienia: ' + error.message);
    }
}

function loadAdminCustomerOrders() {
    console.log('Loading admin customer orders for:', currentUser.uid);
    db.collection('orders')
        .where('userId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            console.log('Admin customer orders loaded:', snapshot.docs.length);
            renderAdminCustomerOrders(snapshot.docs);
        }, (error) => {
            console.error('Error loading admin customer orders:', error);
            if (error.code === 'failed-precondition' || error.message.includes('index')) {
                console.warn('Missing index, loading without sorting...');
                db.collection('orders')
                    .where('userId', '==', currentUser.uid)
                    .onSnapshot((snapshot) => {
                        const docs = snapshot.docs.sort((a, b) => {
                            const aTime = a.data().createdAt?.seconds || 0;
                            const bTime = b.data().createdAt?.seconds || 0;
                            return bTime - aTime;
                        });
                        console.log('Admin customer orders loaded (manual sort):', docs.length);
                        renderAdminCustomerOrders(docs);
                    });
            }
        });
}

function renderAdminCustomerOrders(orderDocs) {
    const ordersList = document.getElementById('adminCustomerOrdersList');
    renderOrdersList(orderDocs, ordersList, { showUserInfo: false, showActions: false });
}

function loadAdminWaiterOrders() {
    db.collection('orders')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            renderAdminWaiterOrders(snapshot.docs);
        });
}

function renderAdminWaiterOrders(orderDocs) {
    const ordersList = document.getElementById('adminWaiterOrdersList');
    renderOrdersList(orderDocs, ordersList, { showUserInfo: true, showActions: true });
}

// ============================================
// CUSTOMER VIEW
// ============================================

function setupCustomerView() {
    document.getElementById('customerName').textContent = currentUser.displayName;
    document.getElementById('customerAvatar').src = currentUser.photoURL;
    
    renderMenu();
    updateCart();
    showCustomerTab('menu');
}

function showCustomerTab(tab) {
    if (userRole === 'admin' && currentAdminPanel === 'customer') {
        showAdminCustomerTab(tab);
        return;
    }
    
    const menuTab = document.getElementById('menuTab');
    const ordersTab = document.getElementById('ordersTab');
    const menuBtn = document.getElementById('menuTabBtn');
    const ordersBtn = document.getElementById('ordersTabBtn');
    
    if (tab === 'menu') {
        menuTab.style.display = 'block';
        ordersTab.style.display = 'none';
        setButtonActive(menuBtn, true);
        setButtonActive(ordersBtn, false);
    } else {
        menuTab.style.display = 'none';
        ordersTab.style.display = 'block';
        setButtonActive(menuBtn, false);
        setButtonActive(ordersBtn, true);
        loadCustomerOrders();
    }
}

function loadCustomerOrders() {
    console.log('Loading customer orders for:', currentUser.uid);
    db.collection('orders')
        .where('userId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            console.log('Customer orders loaded:', snapshot.docs.length);
            renderCustomerOrders(snapshot.docs);
        }, (error) => {
            console.error('Error loading customer orders:', error);
            if (error.code === 'failed-precondition' || error.message.includes('index')) {
                console.warn('Missing index, loading without sorting...');
                db.collection('orders')
                    .where('userId', '==', currentUser.uid)
                    .onSnapshot((snapshot) => {
                        const docs = snapshot.docs.sort((a, b) => {
                            const aTime = a.data().createdAt?.seconds || 0;
                            const bTime = b.data().createdAt?.seconds || 0;
                            return bTime - aTime;
                        });
                        console.log('Customer orders loaded (manual sort):', docs.length);
                        renderCustomerOrders(docs);
                    });
            }
        });
}

function renderCustomerOrders(orderDocs) {
    const ordersList = document.getElementById('customerOrdersList');
    renderOrdersList(orderDocs, ordersList, { showUserInfo: false, showActions: false });
}

function renderMenu() {
    const menuGrid = document.getElementById('menuGrid');
    renderMenuGrid(menuGrid, menuItems, cart, toggleMenuItem);
}

function toggleMenuItem(item) {
    const index = cart.findIndex(cartItem => cartItem.id === item.id);
    
    if (index > -1) {
        cart.splice(index, 1);
    } else {
        cart.push({ ...item });
    }
    
    updateCart();
}

function updateCart() {
    const cartItems = document.getElementById('cartItems');
    const orderForm = document.getElementById('orderForm');
    updateCartDisplay(cart, cartItems, orderForm);
    renderMenu();
}

async function placeOrder() {
    const tableNumber = document.getElementById('tableNumber').value;
    
    if (!tableNumber) {
        alert('Wybierz numer stolika!');
        return;
    }
    
    if (cart.length === 0) {
        alert('Koszyk jest pusty!');
        return;
    }
    
    try {
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        
        await db.collection('orders').add({
            userId: currentUser.uid,
            userName: currentUser.displayName,
            userEmail: currentUser.email,
            tableNumber: parseInt(tableNumber),
            items: cart,
            total: total,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Zamówienie zostało złożone! ✅');
        
        cart = [];
        document.getElementById('tableNumber').value = '';
        updateCart();
        showCustomerTab('orders');
    } catch (error) {
        console.error('Error placing order:', error);
        alert('Błąd składania zamówienia: ' + error.message);
    }
}

// ============================================
// WAITER VIEW
// ============================================
function setupWaiterView() {
    document.getElementById('waiterName').textContent = currentUser.displayName;
    document.getElementById('waiterAvatar').src = currentUser.photoURL;
    
    loadOrders();
}

function loadOrders() {
    db.collection('orders')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            renderOrders(snapshot.docs);
        });
}

function renderOrders(orderDocs) {
    const ordersList = document.getElementById('ordersList');
    renderOrdersList(orderDocs, ordersList, { showUserInfo: true, showActions: true });
}

async function acceptOrder(orderId) {
    try {
        await db.collection('orders').doc(orderId).update({
            status: 'accepted',
            acceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
            acceptedBy: currentUser.uid
        });
        
        console.log('Order accepted:', orderId);
    } catch (error) {
        console.error('Error accepting order:', error);
        alert('Błąd przyjmowania zamówienia: ' + error.message);
    }
}

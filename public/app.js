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
let kitchenOpen = true;
let kitchenStatusUnsubscribe = null;
let waiterOrderFilter = 'all';
let adminWaiterOrderFilter = 'all';
let waiterUserFilter = 'all';
let adminWaiterUserFilter = 'all';
let announcementsUnsubscribe = null;
let announcements = [];
let readAnnouncements = [];

// ============================================
// MENU DATA
// ============================================
let menuItems = [];
let menuUnsubscribe = null;

// Initial menu data for migration
const initialMenuItems = [
    { name: 'Pizza Margherita', category: 'food', price: 25, available: true },
    { name: 'Pizza Pepperoni', category: 'food', price: 30, available: true },
    { name: 'Burger Classic', category: 'food', price: 22, available: true },
    { name: 'Burger Bacon', category: 'food', price: 28, available: true },
    { name: 'Spaghetti Carbonara', category: 'food', price: 26, available: true },
    { name: 'Spaghetti Bolognese', category: 'food', price: 24, available: true },
    { name: 'Caesar Salad', category: 'food', price: 18, available: true },
    { name: 'Greek Salad', category: 'food', price: 16, available: true },
    { name: 'Coca Cola', category: 'drink', price: 8, available: true },
    { name: 'Sprite', category: 'drink', price: 8, available: true },
    { name: 'Orange Juice', category: 'drink', price: 10, available: true },
    { name: 'Apple Juice', category: 'drink', price: 10, available: true },
    { name: 'Coffee', category: 'drink', price: 12, available: true },
    { name: 'Tea', category: 'drink', price: 10, available: true },
    { name: 'Beer', category: 'drink', price: 15, available: true },
    { name: 'Wine', category: 'drink', price: 20, available: true }
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
            initializeMenu();
            initKitchenStatus();
            initAuth();
        }
    }, 100);
});

// ============================================
// KITCHEN STATUS MANAGEMENT
// ============================================
async function initKitchenStatus() {
    console.log('Initializing kitchen status...');
    
    try {
        const settingsRef = db.collection('settings').doc('kitchen');
        const settingsDoc = await settingsRef.get();
        
        if (!settingsDoc.exists) {
            console.log('Creating initial kitchen settings...');
            await settingsRef.set({
                open: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        kitchenStatusUnsubscribe = settingsRef.onSnapshot((doc) => {
            if (doc.exists) {
                kitchenOpen = doc.data().open;
                console.log('Kitchen status updated:', kitchenOpen ? 'OPEN' : 'CLOSED');
                updateKitchenStatusUI();
                
                if (currentUser) {
                    if (userRole === 'admin') {
                        if (currentAdminPanel === 'customer') {
                            renderAdminMenu();
                        }
                    } else if (userRole === 'customer') {
                        renderMenu();
                    }
                }
            }
        }, (error) => {
            console.error('Error listening to kitchen status:', error);
        });
    } catch (error) {
        console.error('Error initializing kitchen status:', error);
    }
}

async function toggleKitchenStatus() {
    try {
        await db.collection('settings').doc('kitchen').update({
            open: !kitchenOpen,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error toggling kitchen status:', error);
        alert('Błąd zmiany statusu kuchni: ' + error.message);
    }
}

function updateKitchenStatusUI() {
    const statusBtn = document.getElementById('kitchenStatusBtn');
    const statusText = document.getElementById('kitchenStatusText');
    
    if (!statusBtn || !statusText) return;
    
    if (kitchenOpen) {
        statusText.textContent = '🟢 Otwarta';
        statusBtn.style.background = '#10b981';
        statusBtn.style.color = 'white';
    } else {
        statusText.textContent = '🔴 Zamknięta';
        statusBtn.style.background = '#ef4444';
        statusBtn.style.color = 'white';
    }
    
    updateKitchenStatusMessage();
}

function updateKitchenStatusMessage() {
    const menuTab = document.getElementById('menuTab');
    if (!menuTab) return;
    
    let existingMessage = document.getElementById('kitchenClosedMessage');
    
    if (!kitchenOpen) {
        if (!existingMessage) {
            existingMessage = document.createElement('div');
            existingMessage.id = 'kitchenClosedMessage';
            existingMessage.style.cssText = 'background: #fee2e2; border: 2px solid #ef4444; color: #991b1b; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center; font-weight: bold;';
            existingMessage.innerHTML = '🔴 Kuchnia jest obecnie zamknięta. Zamówienia są tymczasowo niedostępne.';
            menuTab.insertBefore(existingMessage, menuTab.firstChild);
        }
    } else {
        if (existingMessage) {
            existingMessage.remove();
        }
    }
}

// ============================================
// MENU MANAGEMENT
// ============================================
async function initializeMenu() {
    console.log('Initializing menu from Firestore...');
    
    try {
        const menuSnapshot = await db.collection('menu').get();
        
        if (menuSnapshot.empty) {
            console.log('Menu collection is empty, migrating initial data...');
            for (const item of initialMenuItems) {
                await db.collection('menu').add(item);
            }
            console.log('Menu migration completed!');
        }
        
        menuUnsubscribe = db.collection('menu').orderBy('category').orderBy('name')
            .onSnapshot((snapshot) => {
                menuItems = [];
                snapshot.forEach((doc) => {
                    menuItems.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                console.log('Menu updated:', menuItems.length, 'items');
                
                if (currentUser) {
                    if (userRole === 'admin') {
                        if (currentAdminPanel === 'customer') {
                            renderAdminMenu();
                        } else if (currentAdminPanel === 'menu') {
                            renderMenuManagement();
                        }
                    } else {
                        renderMenu();
                    }
                }
            }, (error) => {
                console.error('Error listening to menu changes:', error);
            });
    } catch (error) {
        console.error('Error initializing menu:', error);
    }
}

async function addMenuItem() {
    const name = document.getElementById('newMenuItemName').value.trim();
    const category = document.getElementById('newMenuItemCategory').value;
    const price = parseFloat(document.getElementById('newMenuItemPrice').value);
    
    if (!name) {
        alert('Podaj nazwę pozycji!');
        return;
    }
    
    if (!price || price <= 0 || isNaN(price)) {
        alert('Podaj prawidłową cenę!');
        return;
    }
    
    try {
        await db.collection('menu').add({
            name: name,
            category: category,
            price: price,
            available: true
        });
        
        document.getElementById('newMenuItemName').value = '';
        document.getElementById('newMenuItemPrice').value = '';
        alert('Pozycja została dodana! ✅');
    } catch (error) {
        console.error('Error adding menu item:', error);
        alert('Błąd dodawania pozycji: ' + error.message);
    }
}

async function toggleMenuItemAvailability(itemId, currentAvailability) {
    try {
        await db.collection('menu').doc(itemId).update({
            available: !currentAvailability
        });
    } catch (error) {
        console.error('Error toggling availability:', error);
        alert('Błąd zmiany dostępności: ' + error.message);
    }
}

function openEditMenuItemModal(itemId, currentName, currentPrice, currentCategory) {
    const modal = document.getElementById('editMenuItemModal');
    document.getElementById('editMenuItemId').value = itemId;
    document.getElementById('editMenuItemName').value = currentName;
    document.getElementById('editMenuItemPrice').value = currentPrice;
    document.getElementById('editMenuItemCategory').value = currentCategory;
    modal.style.display = 'flex';
}

function closeEditMenuItemModal() {
    document.getElementById('editMenuItemModal').style.display = 'none';
}

async function saveEditMenuItem() {
    const itemId = document.getElementById('editMenuItemId').value;
    const name = document.getElementById('editMenuItemName').value.trim();
    const category = document.getElementById('editMenuItemCategory').value;
    const price = parseFloat(document.getElementById('editMenuItemPrice').value);
    
    if (!name) {
        alert('Podaj nazwę pozycji!');
        return;
    }
    
    if (!price || price <= 0 || isNaN(price)) {
        alert('Podaj prawidłową cenę!');
        return;
    }
    
    try {
        await db.collection('menu').doc(itemId).update({
            name: name,
            category: category,
            price: price
        });
        
        closeEditMenuItemModal();
        alert('Pozycja została zaktualizowana! ✅');
    } catch (error) {
        console.error('Error updating menu item:', error);
        alert('Błąd aktualizacji pozycji: ' + error.message);
    }
}

async function deleteMenuItem(itemId) {
    if (!confirm('Czy na pewno chcesz usunąć tę pozycję z menu?')) {
        return;
    }
    
    try {
        await db.collection('menu').doc(itemId).delete();
        alert('Pozycja została usunięta!');
    } catch (error) {
        console.error('Error deleting menu item:', error);
        alert('Błąd usuwania pozycji: ' + error.message);
    }
}

function renderMenuManagement() {
    const container = document.getElementById('menuManagementList');
    if (!container) return;
    
    const foodItems = menuItems.filter(item => item.category === 'food');
    const drinkItems = menuItems.filter(item => item.category === 'drink');
    
    let html = '';
    
    if (foodItems.length > 0) {
        html += '<h3 style="margin: 24px 0 12px; color: #333;">🍕 Jedzenie</h3>';
        html += '<div style="display: grid; gap: 12px;">';
        foodItems.forEach(item => {
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: white; border: 1px solid #ddd; border-radius: 8px;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: #333; margin-bottom: 4px;">${item.name}</div>
                        <div style="color: #667eea; font-weight: bold;">${item.price.toFixed(2)} PLN</div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button 
                            class="btn" 
                            onclick="toggleMenuItemAvailability('${item.id}', ${item.available})" 
                            style="padding: 8px 16px; width: auto; background: ${item.available ? '#10b981' : '#ef4444'}; color: white;">
                            ${item.available ? '✓ Dostępne' : '✗ Brak'}
                        </button>
                        <button 
                            class="btn" 
                            onclick="openEditMenuItemModal('${item.id}', '${item.name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', ${item.price}, '${item.category}')" 
                            style="padding: 8px 16px; width: auto; background: #667eea; color: white;">✏️ Edytuj</button>
                        <button 
                            class="btn btn-danger" 
                            onclick="deleteMenuItem('${item.id}')" 
                            style="padding: 8px 16px; width: auto;">🗑️</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    if (drinkItems.length > 0) {
        html += '<h3 style="margin: 24px 0 12px; color: #333;">🥤 Napoje</h3>';
        html += '<div style="display: grid; gap: 12px;">';
        drinkItems.forEach(item => {
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: white; border: 1px solid #ddd; border-radius: 8px;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: #333; margin-bottom: 4px;">${item.name}</div>
                        <div style="color: #667eea; font-weight: bold;">${item.price.toFixed(2)} PLN</div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button 
                            class="btn" 
                            onclick="toggleMenuItemAvailability('${item.id}', ${item.available})" 
                            style="padding: 8px 16px; width: auto; background: ${item.available ? '#10b981' : '#ef4444'}; color: white;">
                            ${item.available ? '✓ Dostępne' : '✗ Brak'}
                        </button>
                        <button 
                            class="btn" 
                            onclick="openEditMenuItemModal('${item.id}', '${item.name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', ${item.price}, '${item.category}')" 
                            style="padding: 8px 16px; width: auto; background: #667eea; color: white;">✏️ Edytuj</button>
                        <button 
                            class="btn btn-danger" 
                            onclick="deleteMenuItem('${item.id}')" 
                            style="padding: 8px 16px; width: auto;">🗑️</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    if (menuItems.length === 0) {
        html = '<p style="text-align: center; color: #999; padding: 40px;">Brak pozycji w menu. Dodaj pierwszą pozycję powyżej.</p>';
    }
    
    container.innerHTML = html;
}

// ============================================
// ANNOUNCEMENTS
// ============================================
function loadAnnouncements() {
    if (announcementsUnsubscribe) {
        announcementsUnsubscribe();
    }
    
    announcementsUnsubscribe = db.collection('announcements')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            announcements = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            loadReadAnnouncements();
        });
}

function loadReadAnnouncements() {
    if (!currentUser) return;
    
    db.collection('users').doc(currentUser.uid).get()
        .then(doc => {
            if (doc.exists) {
                readAnnouncements = doc.data().readAnnouncements || [];
            }
            renderAnnouncements();
        })
        .catch(error => {
            console.error('Error loading read announcements:', error);
            readAnnouncements = [];
            renderAnnouncements();
        });
}

function renderAnnouncements() {
    const containers = ['customerView', 'waiterView', 'adminView'];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container || !container.classList.contains('active')) return;
        
        let announcementContainer = container.querySelector('.announcements-container');
        if (!announcementContainer) {
            announcementContainer = document.createElement('div');
            announcementContainer.className = 'announcements-container';
            const header = container.querySelector('.header');
            if (header && header.nextSibling) {
                header.parentNode.insertBefore(announcementContainer, header.nextSibling);
            }
        }
        
        const unreadAnnouncements = announcements.filter(a => !readAnnouncements.includes(a.id));
        
        let html = '';
        
        unreadAnnouncements.forEach(announcement => {
            html += createAnnouncementHTML(announcement, false);
        });
        
        announcementContainer.innerHTML = html;
    });
}

function createAnnouncementHTML(announcement, isRead) {
    const date = announcement.createdAt ? new Date(announcement.createdAt.seconds * 1000).toLocaleString('pl-PL') : '';
    
    return `
        <div class="announcement ${isRead ? 'read' : 'unread'}">
            <div class="announcement-header">
                <span class="announcement-badge">${isRead ? '📖 Przeczytane' : '📢 Nowe'}</span>
                <span class="announcement-date">${date}</span>
            </div>
            <div class="announcement-content">${announcement.message}</div>
            ${!isRead ? `
                <button class="btn btn-primary" onclick="markAnnouncementAsRead('${announcement.id}')" 
                    style="padding: 8px 16px; width: auto; margin-top: 8px; font-size: 14px;">
                    ✓ Oznacz jako przeczytane
                </button>
            ` : ''}
        </div>
    `;
}

async function markAnnouncementAsRead(announcementId) {
    if (!currentUser) return;
    
    try {
        const newReadList = [...readAnnouncements, announcementId];
        await db.collection('users').doc(currentUser.uid).update({
            readAnnouncements: newReadList
        });
        
        readAnnouncements = newReadList;
        renderAnnouncements();
    } catch (error) {
        console.error('Error marking announcement as read:', error);
        alert('Błąd oznaczania komunikatu: ' + error.message);
    }
}

async function createAnnouncement() {
    const message = document.getElementById('announcementMessage').value.trim();
    
    if (!message) {
        alert('Wpisz treść komunikatu!');
        return;
    }
    
    if (!confirm('Czy na pewno chcesz wysłać ten komunikat do wszystkich użytkowników?')) {
        return;
    }
    
    try {
        await db.collection('announcements').add({
            message: message,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid,
            createdByName: currentUser.displayName
        });
        
        document.getElementById('announcementMessage').value = '';
        alert('Komunikat został wysłany! 📢');
    } catch (error) {
        console.error('Error creating announcement:', error);
        alert('Błąd wysyłania komunikatu: ' + error.message);
    }
}

async function deleteAnnouncement(announcementId) {
    if (!confirm('Czy na pewno chcesz usunąć ten komunikat?')) {
        return;
    }
    
    try {
        await db.collection('announcements').doc(announcementId).delete();
        alert('Komunikat został usunięty!');
    } catch (error) {
        console.error('Error deleting announcement:', error);
        alert('Błąd usuwania komunikatu: ' + error.message);
    }
}

function renderAnnouncementManagement() {
    const container = document.getElementById('announcementManagementList');
    if (!container) return;
    
    let html = '';
    
    if (announcements.length > 0) {
        announcements.forEach(announcement => {
            const date = announcement.createdAt ? new Date(announcement.createdAt.seconds * 1000).toLocaleString('pl-PL') : '';
            html += `
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                                ${date} - ${announcement.createdByName || 'Admin'}
                            </div>
                            <div style="color: #333; font-size: 14px;">
                                ${announcement.message}
                            </div>
                        </div>
                        <button 
                            class="btn btn-danger" 
                            onclick="deleteAnnouncement('${announcement.id}')" 
                            style="padding: 8px 16px; width: auto; margin-left: 12px;">🗑️</button>
                    </div>
                </div>
            `;
        });
    } else {
        html = '<p style="text-align: center; color: #999; padding: 40px;">Brak komunikatów. Stwórz pierwszy komunikat powyżej.</p>';
    }
    
    container.innerHTML = html;
}

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
    loadAnnouncements();
    
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
function saveLastTableNumber(tableNumber) {
    try {
        localStorage.setItem('lastTableNumber', tableNumber);
    } catch (e) {
        console.warn('Could not save table number to localStorage:', e);
    }
}

function restoreLastTableNumber(elementId) {
    try {
        const lastTableNumber = localStorage.getItem('lastTableNumber');
        if (lastTableNumber) {
            const selectElement = document.getElementById(elementId);
            if (selectElement) {
                selectElement.value = lastTableNumber;
            }
        }
    } catch (e) {
        console.warn('Could not restore table number from localStorage:', e);
    }
}

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
    orderCard.className = 'order-card';
    
    const statusClass = order.status === 'pending' ? 'status-pending' : 'status-accepted';
    const statusIcon = order.status === 'pending' ? '⏳' : '✅';
    const statusText = order.status === 'pending' ? 'Oczekuje' : 'Przyjęte';
    
    let userInfoHtml = '';
    if (showUserInfo) {
        userInfoHtml = `
            <div class="order-user-info">
                <div><strong>Klient:</strong> ${order.userName}</div>
                <div><strong>Email:</strong> ${order.userEmail}</div>
            </div>
        `;
    }
    
    let itemsHtml = '<div class="order-items-list">';
    order.items.forEach(item => {
        const quantity = item.quantity || 1;
        const itemTotal = item.price * quantity;
        if (quantity > 1) {
            itemsHtml += `<div class="order-item-line">• ${item.name} <span style="color: #667eea; font-weight: 600;">x${quantity}</span> - ${item.price.toFixed(2)} zł = ${itemTotal.toFixed(2)} zł</div>`;
        } else {
            itemsHtml += `<div class="order-item-line">• ${item.name} - ${item.price.toFixed(2)} zł</div>`;
        }
    });
    itemsHtml += '</div>';
    
    let noteHtml = '';
    if (order.note) {
        noteHtml = `
            <div style="margin-top: 12px; padding: 10px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px;">
                <div style="font-weight: 600; color: #92400e; margin-bottom: 4px;">📝 Notatka:</div>
                <div style="color: #78350f;">${order.note}</div>
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
        actionButton = `<div style="font-weight: 700; color: #10b981;">${order.total.toFixed(2)} zł</div>`;
    }
    
    orderCard.innerHTML = `
        <div class="order-header">
            <div class="order-number">Zamówienie #${orderId.substring(0, 6)}</div>
            <div class="order-status ${statusClass}">${statusIcon} ${statusText}</div>
        </div>
        ${userInfoHtml}
        <div class="order-items">
            ${itemsHtml}
            ${noteHtml}
        </div>
        <div class="order-footer">
            <div class="table-number">🪑 Stolik ${order.tableNumber}</div>
            ${actionButton}
        </div>
    `;
    
    return orderCard;
}

function renderOrdersList(orderDocs, listElement, options = {}) {
    const filterStatus = options.filterStatus || 'all';
    const filterUserId = options.filterUserId || 'all';
    
    let filteredDocs = orderDocs;
    
    if (filterStatus !== 'all') {
        filteredDocs = filteredDocs.filter(doc => doc.data().status === filterStatus);
    }
    
    if (filterUserId !== 'all') {
        filteredDocs = filteredDocs.filter(doc => doc.data().userId === filterUserId);
    }
    
    if (filteredDocs.length === 0) {
        let message = 'Brak zamówień';
        if (filterStatus !== 'all' && filterUserId !== 'all') {
            message = 'Brak zamówień dla wybranych filtrów';
        } else if (filterStatus !== 'all') {
            message = `Brak zamówień ze statusem "${filterStatus === 'pending' ? 'oczekujące' : 'zaakceptowane'}"`;
        } else if (filterUserId !== 'all') {
            message = 'Brak zamówień dla wybranego użytkownika';
        }
        listElement.innerHTML = `<div class="cart-empty">${message}</div>`;
        return;
    }
    
    listElement.innerHTML = '';
    filteredDocs.forEach((doc) => {
        const orderCard = createOrderCard(doc.data(), doc.id, options);
        listElement.appendChild(orderCard);
    });
}

function renderMenuGrid(gridElement, items, cartArray, toggleFunction) {
    gridElement.innerHTML = '';
    
    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'menu-item';
        
        const categoryEmoji = item.category === 'food' ? '🍽️' : '🥤';
        const categoryText = item.category === 'food' ? 'Jedzenie' : 'Napój';
        
        const isKitchenClosedForFood = !kitchenOpen && item.category === 'food';
        const isAvailable = item.available && !isKitchenClosedForFood;
        
        if (isAvailable) {
            itemDiv.onclick = () => toggleFunction(item);
            itemDiv.innerHTML = `
                <div class="category">${categoryEmoji} ${categoryText}</div>
                <h3>${item.name}</h3>
                <div class="price">${item.price.toFixed(2)} zł</div>
            `;
            
            if (cartArray.some(cartItem => cartItem.id === item.id)) {
                itemDiv.classList.add('selected');
            }
        } else {
            itemDiv.style.opacity = '0.5';
            itemDiv.style.cursor = 'not-allowed';
            
            let unavailableText = 'BRAK';
            if (isKitchenClosedForFood) {
                unavailableText = 'KUCHNIA ZAMKNIĘTA';
            }
            
            itemDiv.innerHTML = `
                <div class="category">${categoryEmoji} ${categoryText}</div>
                <h3>${item.name}</h3>
                <div class="price" style="color: #ef4444; font-weight: bold;">${unavailableText}</div>
            `;
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
    
    const isAdminCart = cartItemsElement.id === 'adminCartItems';
    const quantityFunctionPrefix = isAdminCart ? 'Admin' : '';
    
    cartArray.forEach(item => {
        const itemTotal = item.price * (item.quantity || 1);
        total += itemTotal;
        
        html += `
            <div class="cart-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #e5e7eb;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #333;">${item.name}</div>
                    <div style="color: #667eea; font-size: 14px;">${item.price.toFixed(2)} zł x ${item.quantity || 1}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px; background: #f3f4f6; border-radius: 6px; padding: 4px;">
                        <button onclick="${isAdminCart ? 'decreaseAdminQuantity' : 'decreaseQuantity'}('${item.id}')" style="background: white; border: none; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; font-weight: bold; color: #667eea;">−</button>
                        <span style="min-width: 20px; text-align: center; font-weight: 600;">${item.quantity || 1}</span>
                        <button onclick="${isAdminCart ? 'increaseAdminQuantity' : 'increaseQuantity'}('${item.id}')" style="background: white; border: none; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; font-weight: bold; color: #667eea;">+</button>
                    </div>
                    <div style="font-weight: 700; min-width: 60px; text-align: right;">${itemTotal.toFixed(2)} zł</div>
                </div>
            </div>
        `;
    });
    
    html += `
        <div class="cart-item" style="font-weight: 700; border-top: 2px solid #333; margin-top: 8px; padding-top: 16px;">
            <span>Razem:</span>
            <span>${total.toFixed(2)} zł</span>
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
    const menuPanel = document.getElementById('adminMenuPanel');
    const announcementsPanel = document.getElementById('adminAnnouncementsPanel');
    const customerBtn = document.getElementById('adminCustomerBtn');
    const waiterBtn = document.getElementById('adminWaiterBtn');
    const menuBtn = document.getElementById('adminMenuBtn');
    const announcementsBtn = document.getElementById('adminAnnouncementsBtn');
    
    customerPanel.style.display = 'none';
    waiterPanel.style.display = 'none';
    menuPanel.style.display = 'none';
    announcementsPanel.style.display = 'none';
    setButtonActive(customerBtn, false);
    setButtonActive(waiterBtn, false);
    setButtonActive(menuBtn, false);
    setButtonActive(announcementsBtn, false);
    
    if (panel === 'customer') {
        customerPanel.style.display = 'block';
        setButtonActive(customerBtn, true);
        renderAdminMenu();
        updateAdminCart();
        showAdminCustomerTab('menu');
    } else if (panel === 'waiter') {
        waiterPanel.style.display = 'block';
        setButtonActive(waiterBtn, true);
        loadAdminWaiterOrders();
    } else if (panel === 'menu') {
        menuPanel.style.display = 'block';
        setButtonActive(menuBtn, true);
        renderMenuManagement();
    } else if (panel === 'announcements') {
        announcementsPanel.style.display = 'block';
        setButtonActive(announcementsBtn, true);
        renderAnnouncementManagement();
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
        adminCart.push({ ...item, quantity: 1 });
    }
    
    updateAdminCart();
}

function increaseAdminQuantity(itemId) {
    const item = adminCart.find(cartItem => cartItem.id === itemId);
    if (item) {
        item.quantity++;
        updateAdminCart();
    }
}

function decreaseAdminQuantity(itemId) {
    const item = adminCart.find(cartItem => cartItem.id === itemId);
    if (item) {
        if (item.quantity > 1) {
            item.quantity--;
        } else {
            adminCart = adminCart.filter(cartItem => cartItem.id !== itemId);
        }
        updateAdminCart();
    }
}

function updateAdminCart() {
    const cartItems = document.getElementById('adminCartItems');
    const orderForm = document.getElementById('adminOrderForm');
    updateCartDisplay(adminCart, cartItems, orderForm);
    renderAdminMenu();
    if (adminCart.length > 0) {
        restoreLastTableNumber('adminTableNumber');
    }
}

async function placeOrderAsAdmin() {
    if (!kitchenOpen) {
        alert('🔴 Kuchnia jest obecnie zamknięta. Zamówienia są niedostępne.');
        return;
    }
    
    const tableNumber = document.getElementById('adminTableNumber').value;
    const note = document.getElementById('adminOrderNote').value.trim();
    
    if (!tableNumber) {
        alert('Wybierz numer stolika!');
        return;
    }
    
    if (adminCart.length === 0) {
        alert('Koszyk jest pusty!');
        return;
    }
    
    try {
        const total = adminCart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        
        const orderData = {
            userId: currentUser.uid,
            userName: currentUser.displayName,
            userEmail: currentUser.email,
            tableNumber: parseInt(tableNumber),
            items: adminCart,
            total: total,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (note) {
            orderData.note = note;
        }
        
        await db.collection('orders').add(orderData);
        
        alert('Zamówienie zostało złożone! ✅');
        
        saveLastTableNumber(tableNumber);
        adminCart = [];
        document.getElementById('adminTableNumber').value = '';
        document.getElementById('adminOrderNote').value = '';
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
        .orderBy('createdAt', 'asc')
        .onSnapshot((snapshot) => {
            renderAdminWaiterOrders(snapshot.docs);
        });
}

function renderAdminWaiterOrders(orderDocs) {
    const ordersList = document.getElementById('adminWaiterOrdersList');
    
    // Buduj listę użytkowników PRZED filtrowaniem
    buildUserFilterList(orderDocs, 'adminWaiterUserFilter');
    
    renderOrdersList(orderDocs, ordersList, { 
        showUserInfo: true, 
        showActions: true, 
        filterStatus: adminWaiterOrderFilter,
        filterUserId: adminWaiterUserFilter 
    });
}

function setAdminWaiterUserFilter(userId) {
    adminWaiterUserFilter = userId;
    loadAdminWaiterOrders();
}

function setAdminWaiterOrderFilter(filter) {
    adminWaiterOrderFilter = filter;
    
    const allBtn = document.getElementById('adminWaiterFilterAll');
    const pendingBtn = document.getElementById('adminWaiterFilterPending');
    const acceptedBtn = document.getElementById('adminWaiterFilterAccepted');
    
    allBtn.classList.remove('active');
    pendingBtn.classList.remove('active');
    acceptedBtn.classList.remove('active');
    
    if (filter === 'all') allBtn.classList.add('active');
    else if (filter === 'pending') pendingBtn.classList.add('active');
    else if (filter === 'accepted') acceptedBtn.classList.add('active');
    
    loadAdminWaiterOrders();
}

// ============================================
// CUSTOMER VIEW
// ============================================

function setupCustomerView() {
    document.getElementById('customerName').textContent = currentUser.displayName;
    document.getElementById('customerAvatar').src = currentUser.photoURL;
    
    renderMenu();
    updateCart();
    restoreLastTableNumber('tableNumber');
    showCustomerTab('menu');
    updateKitchenStatusMessage();
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
        cart.push({ ...item, quantity: 1 });
    }
    
    updateCart();
    
    if (cart.length > 0) {
        showScrollToCartButton();
    } else {
        hideScrollToCartButton();
    }
}

function showScrollToCartButton() {
    let scrollButton = document.getElementById('scrollToCartButton');
    
    if (!scrollButton) {
        scrollButton = document.createElement('button');
        scrollButton.id = 'scrollToCartButton';
        scrollButton.className = 'scroll-to-cart-btn';
        scrollButton.innerHTML = '👇 Przejdź';
        scrollButton.onclick = scrollToCart;
        document.body.appendChild(scrollButton);
    }
    
    scrollButton.style.display = 'block';
}

function hideScrollToCartButton() {
    const scrollButton = document.getElementById('scrollToCartButton');
    if (scrollButton) {
        scrollButton.style.display = 'none';
    }
}

function scrollToCart() {
    const cartElement = document.querySelector('.cart');
    
    if (cartElement) {
        cartElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
        });
        
        setTimeout(() => {
            hideScrollToCartButton();
        }, 1500);
    }
}

function increaseQuantity(itemId) {
    const item = cart.find(cartItem => cartItem.id === itemId);
    if (item) {
        item.quantity++;
        updateCart();
    }
}

function decreaseQuantity(itemId) {
    const item = cart.find(cartItem => cartItem.id === itemId);
    if (item) {
        if (item.quantity > 1) {
            item.quantity--;
        } else {
            cart = cart.filter(cartItem => cartItem.id !== itemId);
        }
        updateCart();
    }
}

function updateCart() {
    const cartItems = document.getElementById('cartItems');
    const orderForm = document.getElementById('orderForm');
    updateCartDisplay(cart, cartItems, orderForm);
    renderMenu();
    if (cart.length > 0) {
        restoreLastTableNumber('tableNumber');
    }
}

async function placeOrder() {
    if (!kitchenOpen) {
        alert('🔴 Kuchnia jest obecnie zamknięta. Zamówienia są niedostępne.');
        return;
    }
    
    const tableNumber = document.getElementById('tableNumber').value;
    const note = document.getElementById('orderNote').value.trim();
    
    if (!tableNumber) {
        alert('Wybierz numer stolika!');
        return;
    }
    
    if (cart.length === 0) {
        alert('Koszyk jest pusty!');
        return;
    }
    
    try {
        const total = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        
        const orderData = {
            userId: currentUser.uid,
            userName: currentUser.displayName,
            userEmail: currentUser.email,
            tableNumber: parseInt(tableNumber),
            items: cart,
            total: total,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (note) {
            orderData.note = note;
        }
        
        await db.collection('orders').add(orderData);
        
        alert('Zamówienie zostało złożone! ✅');
        
        saveLastTableNumber(tableNumber);
        cart = [];
        document.getElementById('tableNumber').value = '';
        document.getElementById('orderNote').value = '';
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
    
    // Buduj listę użytkowników PRZED filtrowaniem
    buildUserFilterList(orderDocs, 'waiterUserFilter');
    
    renderOrdersList(orderDocs, ordersList, { 
        showUserInfo: true, 
        showActions: true, 
        filterStatus: waiterOrderFilter,
        filterUserId: waiterUserFilter 
    });
}

function buildUserFilterList(orderDocs, selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const users = new Map();
    orderDocs.forEach(doc => {
        const data = doc.data();
        if (data.userId && data.userName) {
            users.set(data.userId, data.userName);
        }
    });
    
    const currentValue = select.value;
    select.innerHTML = '<option value="all">Wszyscy użytkownicy</option>';
    
    Array.from(users.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .forEach(([userId, userName]) => {
            const option = document.createElement('option');
            option.value = userId;
            option.textContent = userName;
            select.appendChild(option);
        });
    
    if (currentValue && users.has(currentValue)) {
        select.value = currentValue;
    }
}

function setWaiterUserFilter(userId) {
    waiterUserFilter = userId;
    loadOrders();
}

function setWaiterOrderFilter(filter) {
    waiterOrderFilter = filter;
    
    const allBtn = document.getElementById('waiterFilterAll');
    const pendingBtn = document.getElementById('waiterFilterPending');
    const acceptedBtn = document.getElementById('waiterFilterAccepted');
    
    allBtn.classList.remove('active');
    pendingBtn.classList.remove('active');
    acceptedBtn.classList.remove('active');
    
    if (filter === 'all') allBtn.classList.add('active');
    else if (filter === 'pending') pendingBtn.classList.add('active');
    else if (filter === 'accepted') acceptedBtn.classList.add('active');
    
    loadOrders();
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

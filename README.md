# Restaurant Order System 🍽️

System zamówień restauracyjnych z logowaniem przez Google, oddzielnymi widokami dla klientów i kelnerów.

## Funkcjonalności

### Autentykacja
- 🔐 Logowanie przez Google
- ✉️ Rejestracja i logowanie przez Email/Password
- 🔄 Automatyczne przypisywanie roli po pierwszym logowaniu

### Dla Klientów
- 📋 Przeglądanie menu (jedzenie i napoje)
- 🛒 Dodawanie pozycji do koszyka
- 🪑 Wybór numeru stolika
- 📦 Składanie zamówień
- 📜 Historia własnych zamówień

### Dla Kelnerów
- 👀 Podgląd wszystkich zamówień w czasie rzeczywistym
- 🔍 Filtrowanie zamówień po statusie (wszystkie, oczekujące, zaakceptowane)
- 👤 Filtrowanie zamówień po użytkowniku (dropdown z listą klientów)
- ✅ Przyjmowanie zamówień (zmiana statusu)
- 📍 Informacja o numerze stolika dla każdego zamówienia
- � Dane klienta przy każdym zamówieniu

### Dla Administratorów
- 👑 Panel administratora z pełną kontrolą
- 🔄 Przełączanie między widokiem klienta i kelnera
- 🍽️ Składanie zamówień jako klient
- 👨‍🍳 Zarządzanie wszystkimi zamówieniami jako kelner
- 📢 Tworzenie i zarządzanie komunikatami dla wszystkich użytkowników
- 🗑️ Usuwanie komunikatów

### Komunikaty
- 📢 Administrator może tworzyć komunikaty widoczne dla wszystkich użytkowników
- 🔝 Nieprzeczytane komunikaty wyświetlane na samej górze
- ✅ Możliwość oznaczenia komunikatu jako przeczytany
- 📖 Przeczytane komunikaty przesuwane na dół z mniejszą widocznością

## Konfiguracja Firebase

### 1. Włącz Authentication
W Firebase Console:
- Przejdź do **Authentication** > **Sign-in method**
- Włącz **Google** jako provider
- Włącz **Email/Password** jako provider
- Dodaj autoryzowane domeny (localhost dla testów)

### 2. Włącz Firestore Database
W Firebase Console:
- Przejdź do **Firestore Database**
- Utwórz bazę danych w trybie testowym lub produkcyjnym
- Dodaj reguły bezpieczeństwa:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    match /orders/{orderId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'waiter' ||
         resource.data.userId == request.auth.uid);
    }
  }
}
```

### 3. Wdróż indeksy Firestore
Projekt zawiera plik `firestore.indexes.json` z definicją wymaganych indeksów.

Wdróż indeksy komendą:
```bash
firebase deploy --only firestore
```

Lub kliknij w link z błędu w konsoli przeglądarki, aby utworzyć indeks automatycznie.

Wymagany indeks:
- Kolekcja: `orders`
- Pola: `userId` (Ascending), `createdAt` (Descending)

## Zarządzanie rolami

Domyślnie wszyscy nowi użytkownicy otrzymują rolę `customer`.

### Dostępne role
- **`customer`** - standardowy klient (domyślna)
- **`waiter`** - kelner z dostępem do panelu zamówień
- **`admin`** - administrator z pełnym dostępem do wszystkich paneli

### Zmiana roli użytkownika
W Firebase Console > Firestore Database:
1. Znajdź kolekcję `users`
2. Znajdź dokument użytkownika (po UID)
3. Zmień pole `role` na `waiter` lub `admin`

Lub przez Firebase CLI/Console:
```javascript
// Zmiana na kelnera
firebase.firestore().collection('users').doc('USER_UID').update({
  role: 'waiter'
})

// Zmiana na admina
firebase.firestore().collection('users').doc('USER_UID').update({
  role: 'admin'
})
```

## Uruchamianie

### Lokalnie
```bash
firebase serve
```
Aplikacja dostępna na: http://localhost:5000

### Deploy na produkcję
```bash
firebase deploy
```

## Struktura danych

### Collection: users
```javascript
{
  email: string,
  name: string,
  role: 'customer' | 'waiter' | 'admin',
  createdAt: timestamp
}
```

### Collection: orders
```javascript
{
  userId: string,
  userName: string,
  userEmail: string,
  tableNumber: number,
  items: [
    {
      id: number,
      name: string,
      category: 'food' | 'drink',
      price: number
    }
  ],
  total: number,
  status: 'pending' | 'accepted',
  createdAt: timestamp,
  acceptedAt: timestamp (optional),
  acceptedBy: string (optional)
}
```

## Menu

Menu jest zdefiniowane w `public/app.js` w tablicy `menuItems`. Aby dodać lub zmienić pozycje menu, edytuj tę tablicę:

```javascript
const menuItems = [
  { id: 1, name: 'Pizza Margherita', category: 'food', price: 25 },
  // ... więcej pozycji
];
```

## Struktura kodu

Plik `public/app.js` (741 linii) jest podzielony na logiczne sekcje:

### 1. Global State (linie 1-10)
Zmienne globalne aplikacji: `db`, `currentUser`, `userRole`, `cart`, `adminCart`

### 2. Menu Data (linie 12-32)
Tablica `menuItems` z definicją menu restauracji

### 3. Firebase Initialization (linie 34-48)
Inicjalizacja Firebase i Firestore

### 4. Authentication (linie 50-260)
- `initAuth()` - obsługa zmian stanu autentykacji
- `checkAndSetUserRole()` - zarządzanie rolami użytkowników
- `toggleAuthMode()`, `emailAuth()`, `registerWithEmail()`, `loginWithEmail()` - autentykacja email/password
- `googleLogin()` - autentykacja Google
- `logout()` - wylogowanie

### 5. Helper Functions - UI (linie 262-406)
Pomocnicze funkcje do eliminacji duplikacji kodu:
- `setButtonActive()` - stylowanie przycisków
- `createOrderCard()` - tworzenie kart zamówień
- `renderOrdersList()` - renderowanie list zamówień
- `renderMenuGrid()` - renderowanie siatki menu
- `updateCartDisplay()` - aktualizacja wyświetlania koszyka

### 6. Admin View (linie 408-570)
Panel administratora z przełączaniem między widokami

### 7. Customer View (linie 572-703)
Panel klienta z menu i historią zamówień

### 8. Waiter View (linie 705-742)
Panel kelnera z zarządzaniem zamówieniami

## Refaktoryzacja

Kod został zoptymalizowany z **906 linii do 741 linii** poprzez:
- ✅ Usunięcie duplikacji (3 różne funkcje renderowania zamówień → 1 uniwersalna)
- ✅ Zunifikowanie renderowania menu i koszyka
- ✅ Dodanie sekcji komentarzowych dla lepszej nawigacji
- ✅ Wydzielenie funkcji pomocniczych

## Technologie

- Firebase Hosting
- Firebase Authentication (Google Sign-In + Email/Password)
- Cloud Firestore (z indeksami composite)
- Vanilla JavaScript (ES6+)
- CSS3 (nowoczesny UI)

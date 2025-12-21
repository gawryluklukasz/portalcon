# Restaurant Order System 🍽️

System zamówień restauracyjnych z logowaniem przez Google, oddzielnymi widokami dla klientów i kelnerów.

## Funkcjonalności

### Dla Klientów
- 🔐 Logowanie przez konto Google
- 📋 Przeglądanie menu (jedzenie i napoje)
- 🛒 Dodawanie pozycji do koszyka
- 🪑 Wybór numeru stolika
- 📦 Składanie zamówień

### Dla Kelnerów
- 👀 Podgląd wszystkich zamówień w czasie rzeczywistym
- ✅ Przyjmowanie zamówień (zmiana statusu)
- 📍 Informacja o numerze stolika dla każdego zamówienia
- 👤 Dane klienta przy każdym zamówieniu

## Konfiguracja Firebase

### 1. Włącz Authentication
W Firebase Console:
- Przejdź do **Authentication** > **Sign-in method**
- Włącz **Google** jako provider
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

### 3. Dodaj indeks dla Firestore
W **Firestore Database** > **Indexes**, utwórz indeks:
- Kolekcja: `orders`
- Pola: `createdAt` (Descending)
- Status zapytania: Enabled

## Zarządzanie rolami

Domyślnie wszyscy nowi użytkownicy otrzymują rolę `customer`.

### Zmiana użytkownika na kelnera
W Firebase Console > Firestore Database:
1. Znajdź kolekcję `users`
2. Znajdź dokument użytkownika (po UID)
3. Zmień pole `role` z `customer` na `waiter`

Lub przez Firebase CLI/Console:
```javascript
firebase.firestore().collection('users').doc('USER_UID').update({
  role: 'waiter'
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
  role: 'customer' | 'waiter',
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

## Technologie

- Firebase Hosting
- Firebase Authentication (Google Sign-In)
- Cloud Firestore
- Vanilla JavaScript
- CSS3 (nowoczesny UI)

document.addEventListener('DOMContentLoaded', () => {
    const app = firebase.app();
});

function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            console.log('Login successful', user);
        })
        .catch((error) => {
            console.error('Login error:', error);
        });
}


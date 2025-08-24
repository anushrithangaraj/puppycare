// Firebase (compat) setup using global 'firebase' from CDN
// Make sure index.html includes firebase-app-compat, firebase-auth-compat, firebase-firestore-compat
(function(){
  const firebaseConfig = {
    apiKey: "AIzaSyD5ZV1oMiFwYgbWuP67ZN3kBCD2x5p20Rw",
    authDomain: "puppycare-1c3ec.firebaseapp.com",
    projectId: "puppycare-1c3ec",
    storageBucket: "puppycare-1c3ec.appspot.com",
    messagingSenderId: "711299437155",
    appId: "1:711299437155:web:f92439a12d543228f7de56",
    measurementId: "G-DKKBGJGS47"
  };
  firebase.initializeApp(firebaseConfig);
  window.FB = {
    auth: firebase.auth(),
    db: firebase.firestore(),
    storage: firebase.storage()
  };
})();
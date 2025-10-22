// public/firebase-messaging-sw.js (Final Version)

// Using a more recent, stable version of the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js');

// This config MUST be for your MAIN project: snaccit-7d853
const firebaseConfig = {
    apiKey: "AIzaSyDDFCPcfBKcvrkjqidsXstHqe8Og_3u36k",
    authDomain: "snaccit-7d853.firebaseapp.com",
    projectId: "snaccit-7d853",
    storageBucket: "snaccit-7d853.firebasestorage.app",
    messagingSenderId: "523142849231",
    appId: "1:523142849231:web:f10e23785d6451f510cdba"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get the Firebase Messaging instance
const messaging = firebase.messaging();

// Optional: Add a background message handler. This is good practice.
messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };
});
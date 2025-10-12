// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js');

// This config is for your MAIN project: snaccit-7d853
const firebaseConfig = {
    apiKey: "AIzaSyAlQLSGguPfp7CbNjrPANssqx31s2X94w4",
    authDomain: "snaccit-7d853.firebaseapp.com",
    projectId: "snaccit-7d853",
    storageBucket: "snaccit-7d853.firebasestorage.app",
    messagingSenderId: "523142849231",
    appId: "1:523142849231:web:f10e23785d6451f510cdba"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
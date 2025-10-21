// src/firebase.js (New Compat Version)

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';
import 'firebase/compat/messaging'; // <-- Important: use compat messaging

const firebaseConfig = {
  apiKey: "AIzaSyDDFCPcfBKcvrkjqidsXstHqe8Og_3u36k",
  authDomain: "snaccit-7d853.firebaseapp.com",
  projectId: "snaccit-7d853",
  storageBucket: "snaccit-7d853.firebasestorage.app",
  messagingSenderId: "523142849231",
  appId: "1:523142849231:web:f10e23785d6451f510cdba"
};

// Initialize Firebase usig the compat syntax
const app = firebase.initializeApp(firebaseConfig);

// Get services using the compat syntax
export const auth = app.auth();
export const db = app.firestore();
export const functionsUs = app.functions('us-central1');
export const functionsAsia = app.functions('asia-south2');
export const messaging = app.messaging(); // <-- Get the messaging instance here
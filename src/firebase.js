// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions"; 
import { getMessaging } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDDFCPcfBKcvrkjqidsXstHqe8Og_3u36k",
  authDomain: "snaccit-7d853.firebaseapp.com",
  projectId: "snaccit-7d853",
  storageBucket: "snaccit-7d853.firebasestorage.app",
  messagingSenderId: "523142849231",
  appId: "1:523142849231:web:f10e23785d6451f510cdba"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services from one place
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1'); 
export const messaging = getMessaging(app); 
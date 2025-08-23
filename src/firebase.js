
// src/firebase.js

// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// Make sure you paste your actual config object here!
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

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
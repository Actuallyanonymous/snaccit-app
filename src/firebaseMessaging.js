// src/firebaseMessaging.js (with debugging)

import { getMessaging, getToken } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from './firebase'; 

export const requestCustomerNotificationPermission = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return; 

  console.log("DEBUG: Starting notification permission request...");

  try {
    const permission = await Notification.requestPermission();
    console.log("DEBUG: Browser permission status:", permission);

    if (permission === 'granted') {
      const messaging = getMessaging();
      console.log("DEBUG: Firebase Messaging object created.");

      const fcmToken = await getToken(messaging, {
        vapidKey: 'PASTE_YOUR_FUNCTIONS_PROJECT_VAPID_KEY_HERE', 
      });
      
      if (fcmToken) {
        console.log("DEBUG: FCM Token received successfully:", fcmToken);
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, { fcmToken: fcmToken });
        console.log("✅ SUCCESS: FCM Token saved to Firestore.");
        alert("Notifications have been enabled!");
      } else {
        console.error("❌ ERROR: No FCM token received. Check service worker and VAPID key.");
      }
    } else {
      console.warn("WARN: User did not grant notification permission.");
    }
  } catch (error) {
    console.error('❌ FATAL ERROR during notification setup:', error);
  }
};
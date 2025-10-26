// src/firebaseMessaging.js (ROBUST TOKEN MANAGEMENT)

import { db, messaging } from './firebase.js';

// This function handles getting permission and/or validating the token.
const initializeNotifications = async (user) => {
    if (!user || !("Notification" in window) || !messaging) {
        console.log("DEBUG: Notifications skipped (No user, browser support, or messaging).");
        return;
    }

    try {
        const userDocRef = db.collection("users").doc(user.uid);
        const permission = Notification.permission;

        if (permission === 'denied') {
            console.warn("DEBUG: Notification permission is denied.");
            return;
        }

        if (permission === 'granted') {
            // Permission is already granted, let's get the token and validate it.
            console.log("DEBUG: Permission granted. Validating token...");
            const currentToken = await messaging.getToken({
                vapidKey: 'BKTiwvssOvfLVbYe3YcRS7jOfopS_gGcV_uO_mdCZ_52Fo91YG231RfU_7VOtPXiBnjw_0PgBVSefnN466cG2wg',
            });

            if (currentToken) {
                // Check if token exists in Firestore and if it's the same
                const userDoc = await userDocRef.get();
                const existingToken = userDoc.data()?.fcmToken;

                if (existingToken === currentToken) {
                    console.log("DEBUG: FCM token is up-to-date.");
                } else {
                    console.log("✅ SUCCESS: FCM Token is new or stale. Updating Firestore.");
                    await userDocRef.set({ fcmToken: currentToken }, { merge: true });
                }
            } else {
                console.error("❌ ERROR: No FCM token received despite granted permission.");
            }
            return; // Exit after validation
        }

        if (permission === 'default') {
            // Permission not yet asked. Check if we've stored a token (from a previous session).
            // This avoids re-asking if they already have a token in Firestore.
            const userDoc = await userDocRef.get();
            const existingToken = userDoc.data()?.fcmToken;

            if (existingToken) {
                console.log("DEBUG: User has token in DB but permission is 'default'. Will validate on next 'granted' load.");
                // We'll let the logic above run on the *next* page load after they re-grant permission.
                // Or, we can try to get the token, which might re-prompt.
                // Let's stick to the explicit request.
            }

            console.log("DEBUG: Requesting notification permission for the first time...");
            const requestedPermission = await Notification.requestPermission();

            if (requestedPermission === 'granted') {
                console.log("DEBUG: Permission just granted. Getting FCM token...");
                const fcmToken = await messaging.getToken({
                    vapidKey: 'BKTiwvssOvfLVbYe3YcRS7jOfopS_gGcV_uO_mdCZ_52Fo91YG231RfU_7VOtPXiBnjw_0PgBVSefnN466cG2wg',
                });

                if (fcmToken) {
                    console.log("✅ SUCCESS: FCM Token saved to Firestore.");
                    await userDocRef.set({ fcmToken: fcmToken }, { merge: true });
                } else {
                    console.error("❌ ERROR: No FCM token received after granting permission.");
                }
            } else {
                console.warn("DEBUG: User did not grant notification permission.");
            }
        }
    } catch (error) {
        console.error('❌ FATAL ERROR during notification setup:', error);
    }
};

// This is the function App.jsx calls
export const requestCustomerNotificationPermission = initializeNotifications;
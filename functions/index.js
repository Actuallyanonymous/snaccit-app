/**
 * snaccit-app/functions/index.js
 * FINAL STABLE VERSION - POINTS SYSTEM + SECURE PAYMENTS
 */

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
const { defineString, defineSecret } = require("firebase-functions/params");

// Initialize Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Define Configuration
const APP_BASE_URL = defineString("APP_BASE_URL");
const PHONEPE_MERCHANT_ID = defineSecret("PHONEPE_MERCHANT_ID");
const PHONEPE_SALT_KEY = defineSecret("PHONEPE_SALT_KEY");
const PHONEPE_SALT_INDEX = defineSecret("PHONEPE_SALT_INDEX");
const PHONEPE_PAY_API_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";

// ======================================================================
// === 1. SECURE ORDER CREATION & PAYMENT (WITH POINTS) ===
// ======================================================================
exports.createOrderAndPay = onCall({
  region: "asia-south2",
  secrets: [PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY, PHONEPE_SALT_INDEX],
  minInstances: 0,
}, async (request) => {
  // 1. Auth Check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Login required.');
  }

  try {
    const userId = request.auth.uid;
    const { 
      restaurantId, 
      items, 
      couponCode, 
      arrivalTime, 
      userName, 
      userPhone, 
      usePoints,
      paymentMethod = 'phonepe', // Default to phonepe for backward compatibility
      orderNote = null // Customer special request note
    } = request.data;

    // --- A. PRICE CALCULATION (SERVER SIDE) ---
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();
    
    if (!restaurantDoc.exists) {
        throw new HttpsError('not-found', 'Restaurant not found');
    }

    // --- COD VALIDATION ---
    if (paymentMethod === 'cod' && !restaurantDoc.data().codEnabled) {
        throw new HttpsError('failed-precondition', 'Cash on Delivery is not available for this restaurant');
    }

    const menuSnapshot = await restaurantRef.collection('menu').get();
    const menuMap = {};
    menuSnapshot.docs.forEach(doc => { 
        menuMap[doc.id] = { id: doc.id, ...doc.data() }; 
    });

    let calculatedSubtotal = 0;
    const secureItems = [];

    // Loop through items to calculate real price
    for (const itemRequest of items) {
        const realItem = menuMap[itemRequest.id];
        if (!realItem) {
            throw new HttpsError('invalid-argument', `Item ${itemRequest.id} not found`);
        }

        const realSize = realItem.sizes.find(s => s.name === itemRequest.size);
        if (!realSize) {
             throw new HttpsError('invalid-argument', `Invalid size for ${realItem.name}`);
        }

        let addonsPrice = 0;
        const validatedAddons = [];
        
        if (itemRequest.addons && Array.isArray(itemRequest.addons)) {
            const availableAddons = realItem.addons || [];
            availableAddons.forEach(a => {
                if (itemRequest.addons.includes(a.name)) {
                    addonsPrice += a.price;
                    validatedAddons.push(a.name);
                }
            });
        }

        const finalItemPrice = realSize.price + addonsPrice;
        calculatedSubtotal += finalItemPrice * itemRequest.quantity;

        secureItems.push({
            id: realItem.id,
            name: realItem.name,
            quantity: itemRequest.quantity,
            price: finalItemPrice,
            size: itemRequest.size,
            addons: validatedAddons,
            });
    }

    // 1. IMPROVED COUPON LOGIC
let couponDiscount = 0;
if (couponCode) {
    const couponDoc = await db.collection('coupons').doc(couponCode.toUpperCase()).get();
    
    if (couponDoc.exists) {
        const coupon = couponDoc.data();
        const now = admin.firestore.Timestamp.now();
        
        // Validation
        const isActive = coupon.isActive !== false;
        const isNotExpired = !coupon.expiryDate || now < coupon.expiryDate;
        const meetsMinOrder = calculatedSubtotal >= (coupon.minOrderValue || 0);

        // Check if user has used this specific "once" coupon before
        let alreadyUsedByUser = false;
        if (coupon.usageLimit === 'once') {
            const usageCheck = await db.collection("orders")
                .where("userId", "==", userId)
                .where("couponCode", "==", couponCode.toUpperCase())
                .where("status", "in", ["pending", "accepted", "preparing", "ready", "completed"])
                .limit(1)
                .get();
            alreadyUsedByUser = !usageCheck.empty;
        }

        if (isActive && isNotExpired && meetsMinOrder && !alreadyUsedByUser) {
            if (coupon.type === 'fixed') {
                couponDiscount = coupon.value;
            } else if (coupon.type === 'percentage') {
                couponDiscount = (calculatedSubtotal * coupon.value) / 100;
            }
        } else {
            // OPTIONAL: Throw error if coupon was sent but failed validation
            // This prevents the user from being charged the full price unexpectedly
            throw new HttpsError('failed-precondition', 'Coupon is no longer valid. Please remove it and try again.');
        }
    }
}

// 2. POINTS LOGIC (Calculate after coupon to avoid negative totals)
let pointsDiscount = 0;
let pointsRedeemed = 0;

if (usePoints) {
    const userDoc = await db.collection('users').doc(userId).get();
    const availablePoints = userDoc.data().points || 0;
    
    if (availablePoints > 0) {
        const potentialPointsDiscount = Math.floor(availablePoints / 10);
        const remainingAfterCoupon = Math.max(0, calculatedSubtotal - couponDiscount);
        pointsDiscount = Math.min(potentialPointsDiscount, remainingAfterCoupon);
        pointsRedeemed = pointsDiscount * 10;
    }
}

const grandTotal = Math.max(0, calculatedSubtotal - couponDiscount - pointsDiscount);

    // --- D. DEDUCT POINTS & CREATE ORDER ---
    if (pointsRedeemed > 0) {
        await db.collection('users').doc(userId).update({
            points: admin.firestore.FieldValue.increment(-pointsRedeemed)
        });
    }

    const orderData = {
        userId, 
        userEmail: request.auth.token.email || null,
        userName: userName || 'Customer', 
        userPhone: userPhone || 'N/A',
        restaurantId, 
        restaurantName: restaurantDoc.data().name,
        items: secureItems,
        subtotal: calculatedSubtotal,
        discount: couponDiscount + pointsDiscount,
        couponCode: couponCode || null,
        pointsRedeemed: pointsRedeemed, 
        pointsValue: pointsDiscount,
        total: grandTotal,
        status: "awaiting_payment",
        arrivalTime,
        orderNote: orderNote || null, // Customer special request note
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        hasReview: false,
    };

    const orderRef = await db.collection("orders").add(orderData);

    // --- E. PAYMENT HANDLING ---
    
    // Case 1: Order is fully paid by points/coupons (Total is 0)
    if (grandTotal === 0) {
        await orderRef.update({ 
            status: 'pending', 
            paymentDetails: { method: 'points_full' } 
        });
        return { redirectUrl: `${APP_BASE_URL.value()}/payment-status?orderId=${orderRef.id}`, orderId: orderRef.id };
    }

    // Case 2: Cash on Delivery (COD) - No PhonePe payment needed
    if (paymentMethod === 'cod') {
        await orderRef.update({ 
            status: 'pending', 
            paymentDetails: { method: 'cod' } 
        });
        return { redirectUrl: `${APP_BASE_URL.value()}/payment-status?orderId=${orderRef.id}`, orderId: orderRef.id };
    }

    // Case 3: PhonePe Payment Required
    const merchantTransactionId = `SNCT_${orderRef.id}`;
    
    // For mobile app: redirect to app-return.html which deep-links back to the Flutter app
    // For web: redirect to the regular payment-status page
    const isMobile = request.data.platform === 'mobile';
    const redirectUrl = isMobile 
      ? `${APP_BASE_URL.value()}/app-return.html?orderId=${orderRef.id}`
      : `${APP_BASE_URL.value()}/payment-status?orderId=${orderRef.id}`;

    const payload = {
      merchantId: PHONEPE_MERCHANT_ID.value(),
      merchantTransactionId: merchantTransactionId,
      merchantUserId: userId,
      amount: Math.round(grandTotal * 100), // PhonePe expects paisa
      redirectUrl: redirectUrl,
      redirectMode: "REDIRECT",
      callbackUrl: `https://asia-south2-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/phonePeCallback`,
      mobileNumber: userPhone || "9999999999",
      paymentInstrument: { type: "PAY_PAGE" },
    };

    // ===== DEBUG LOGGING =====
    logger.info("PHONEPE_DEBUG_PAYLOAD", {
      orderId: orderRef.id,
      merchantTransactionId,
      amount: payload.amount,
      grandTotal,
      callbackUrl: payload.callbackUrl,
      mobileNumber: payload.mobileNumber,
      merchantId: payload.merchantId,
      userId,
      platform: request.data.platform || 'web',
      source: request.rawRequest?.headers?.['user-agent'] || 'unknown',
    });

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const stringToHash = base64Payload + "/pg/v1/pay" + PHONEPE_SALT_KEY.value();
    const sha256Hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const xVerify = sha256Hash + "###" + PHONEPE_SALT_INDEX.value();

    try {
        // Log the transaction in Firestore before payment initiation
        await orderRef.update({ merchantTransactionId });

        // ALWAYS execute the API call on the server to get the redirectUrl
        const response = await axios.post(PHONEPE_PAY_API_URL, { request: base64Payload }, {
            headers: { 
                "Content-Type": "application/json", 
                "X-VERIFY": xVerify 
            }
        });
        
        logger.info("PHONEPE_DEBUG_RESPONSE", {
            orderId: orderRef.id,
            success: response.data.success,
            code: response.data.code,
            fullResponse: JSON.stringify(response.data).substring(0, 1000),
        });

        if (response.data.success) {
            return { redirectUrl: response.data.data.instrumentResponse.redirectInfo.url, orderId: orderRef.id };
        } else {
            throw new Error(response.data.message || "Payment initiation failed");
        }
    } catch (paymentError) {
        // ROLLBACK: Refund points if payment init failed
        if(pointsRedeemed > 0) {
            await db.collection('users').doc(userId).update({ 
                points: admin.firestore.FieldValue.increment(pointsRedeemed) 
            });
        }
        // Mark order as failed init
        await orderRef.update({ status: 'payment_init_failed' });
        
        logger.error("Payment Init Error", paymentError);
        throw new HttpsError('internal', 'Payment Gateway Error');
    }

  } catch (error) {
    logger.error("Create Order Error", error);
    // Rethrow valid HttpsErrors, wrap others
    if (error.code && error.details) throw error;
    throw new HttpsError('internal', error.message || "Internal Server Error");
  }
});

// ======================================================================
// === 2. PHONEPE CALLBACK HANDLER ===
// ======================================================================
exports.phonePeCallback = onRequest({
  region: "asia-south2",
  secrets: [PHONEPE_SALT_KEY, PHONEPE_SALT_INDEX],
}, async (req, res) => {
  if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
  }

  try {
    const xVerifyHeader = req.headers["x-verify"];
    const responsePayload = req.body.response;
    
    // Use .value() for secrets
    const saltKey = PHONEPE_SALT_KEY.value();
    const saltIndex = PHONEPE_SALT_INDEX.value();

    const calculatedHash = crypto.createHash("sha256").update(responsePayload + saltKey).digest("hex");
    const calculatedXVerify = calculatedHash + "###" + saltIndex;

    if (xVerifyHeader !== calculatedXVerify) {
        res.status(400).send("Verification failed");
        return;
    }

    const decoded = JSON.parse(Buffer.from(responsePayload, "base64").toString());
    const merchantTransactionId = decoded.data.merchantTransactionId;
    
    // Find order by transaction ID
    const ordersQuery = await db.collection("orders").where("merchantTransactionId", "==", merchantTransactionId).get();

    if (ordersQuery.empty) {
        res.status(404).send("Order not found");
        return;
    }

    const orderDoc = ordersQuery.docs[0];
    const orderRef = orderDoc.ref;

    if (decoded.code === "PAYMENT_SUCCESS") {
        await orderRef.update({
            status: "pending", 
            paymentDetails: decoded.data
        });
    } else {
        await orderRef.update({
            status: "payment_failed", 
            paymentDetails: decoded.data
        });
    }

    res.status(200).send("OK");

  } catch (error) {
    logger.error("Callback Error", error);
    res.status(500).send("Internal Server Error");
  }
});

// ======================================================================
// === 3. REFERRAL REWARDS (POINTS SYSTEM) ===
// ======================================================================

exports.issueReferralRewards = onDocumentWritten({
  region: "asia-south2", 
  document: "users/{userId}",
}, async (event) => {
  // If document was deleted or doesn't exist, exit
  if (!event.data || !event.data.after.exists) return;

  const after = event.data.after.data();

  // Logic: If user has 'referredBy' field and we haven't given rewards yet
  if (after.referredBy && !after.rewardsIssued) {
    const referrerId = after.referredBy;
    const newUserId = event.params.userId;
    const REWARD_POINTS = 50; // 50 Points = 5 Rupees

    const batch = db.batch();

    // 1. Give Points to Referrer (The friend)
    const referrerRef = db.collection("users").doc(referrerId);
    batch.update(referrerRef, { 
        points: admin.firestore.FieldValue.increment(REWARD_POINTS) 
    });

    // 2. Give Points to New User (The referee)
    const newUserRef = db.collection("users").doc(newUserId);
    batch.update(newUserRef, { 
        points: admin.firestore.FieldValue.increment(REWARD_POINTS),
        rewardsIssued: true 
    });

    await batch.commit();
    logger.info(`Referral Success: Gave ${REWARD_POINTS} points to ${referrerId} and ${newUserId}`);
  }
});

// ======================================================================
// === 4. REWARD/POINT REFUND MANAGER ===
// ======================================================================
exports.manageRewardsOnOrderUpdate = onDocumentUpdated({
  region: "asia-south2",
  document: "orders/{orderId}",
}, async (event) => {
  const after = event.data.after.data();
  const before = event.data.before.data();
  
  // Refund Points Logic
  // If order status changes to failure, AND points were used -> Refund them.
  const failureStatuses = ["payment_failed", "declined", "cancelled"];
  const isNowFailed = failureStatuses.includes(after.status);
  const wasNotFailed = !failureStatuses.includes(before.status);

  if (after.pointsRedeemed > 0 && isNowFailed && wasNotFailed) {
      await db.collection("users").doc(after.userId).update({
          points: admin.firestore.FieldValue.increment(after.pointsRedeemed)
      });
      logger.info(`Refunded ${after.pointsRedeemed} points to user ${after.userId} (Order Failed)`);
  }

  // Coupon Logic (Lock/Unlock)
  if (after.couponCode) {
      // Lock coupon on success
      if (after.status === "pending" && before.status !== "pending") {
          await db.collection("coupons").doc(after.couponCode).update({ isUsed: true });
      }
      // Unlock coupon on failure
      if (isNowFailed && wasNotFailed) {
          await db.collection("coupons").doc(after.couponCode).update({ isUsed: false });
      }
  }
});

// ======================================================================
// === 5. PHONE + PASSWORD AUTHENTICATION (MOBILE ORPHAN ACCOUNTS) ===
// ======================================================================

exports.preparePhoneSignup = onCall({ region: "asia-south2" }, async (request) => {
    const { phoneNumber, password, name } = request.data;
    if (!phoneNumber || !password || !name) {
        throw new HttpsError('invalid-argument', 'Missing required fields.');
    }
    
    // Format to E.164 if missing '+'
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    try {
        const user = await admin.auth().getUserByPhoneNumber(formattedPhone);
        return { exists: true, message: "An account already exists for this phone number. Please log in." };
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            const dummyEmail = `${formattedPhone.replace('+', '')}@snaccit-user.com`;
            try {
                const newUser = await admin.auth().createUser({
                    phoneNumber: formattedPhone,
                    email: dummyEmail,
                    password: password,
                    displayName: name
                });
                
                await db.collection('users').doc(newUser.uid).set({
                    phone: formattedPhone,
                    name: name,
                    points: 0,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });

                return { exists: false, email: dummyEmail };
            } catch (err) {
                if (err.code === 'auth/phone-number-already-exists' || err.code === 'auth/email-already-exists') {
                    return { exists: true, message: "An account already exists for this phone number." };
                }
                throw new HttpsError('internal', err.message);
            }
        }
        throw new HttpsError('internal', e.message);
    }
});

exports.getPhoneAuthEmail = onCall({ region: "asia-south2" }, async (request) => {
    const { phoneNumber } = request.data;
    if (!phoneNumber) {
        throw new HttpsError('invalid-argument', 'Phone number is required.');
    }
    
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    try {
        const user = await admin.auth().getUserByPhoneNumber(formattedPhone);
        const dummyEmail = `${formattedPhone.replace('+', '')}@snaccit-user.com`;
        // Return their actual email if they signed up on Web, otherwise the dummy email
        return { email: user.email || dummyEmail };
    } catch (e) {
        throw new HttpsError('not-found', 'No account found for this phone number.');
    }
});

exports.resetPasswordWithPhone = onCall({ region: "asia-south2" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const { newPassword } = request.data;
    if (!newPassword || newPassword.length < 6) {
        throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
    }

    const callerUid = request.auth.uid;
    const callerPhone = request.auth.token.phone_number;

    if (!callerPhone) {
        throw new HttpsError('failed-precondition', 'No phone number on authenticated session.');
    }

    const dummyEmail = `${callerPhone.replace('+', '')}@snaccit-user.com`;

    try {
        // Check if the caller already has email/password linked
        const callerUser = await admin.auth().getUser(callerUid);
        const hasEmailProvider = callerUser.providerData.some(p => p.providerId === 'password');

        if (hasEmailProvider) {
            // ═══ SCENARIO A: Caller IS the original user (has phone + email/password) ═══
            // signInWithPhoneNumber signed into the existing account — just update password
            await admin.auth().updateUser(callerUid, { password: newPassword });
            const email = callerUser.email || dummyEmail;
            logger.info('resetPasswordWithPhone: Scenario A - updated password on existing user', { uid: callerUid });
            return { success: true, email };
        }

        // Caller only has phone provider — it's a temp user created by signInWithPhoneNumber
        // Try to find the ORIGINAL user who has the email/password credential

        let originalUser = null;
        try {
            originalUser = await admin.auth().getUserByEmail(dummyEmail);
            logger.info('resetPasswordWithPhone: Found original user by email', { originalUid: originalUser.uid, callerUid });
        } catch (e) {
            // No auth user with dummy email — check if it's a legacy user scenario
            logger.info('resetPasswordWithPhone: No auth user with dummy email, checking legacy', { dummyEmail });
        }

        if (originalUser) {
            // ═══ SCENARIO B: Original user exists in Auth with dummy email ═══
            // 1. Delete temp caller to free the phone number
            // 2. Update original user with new password + re-link phone
            await admin.auth().deleteUser(callerUid);
            logger.info('resetPasswordWithPhone: Deleted temp user', { callerUid });

            await admin.auth().updateUser(originalUser.uid, { 
                password: newPassword,
                phoneNumber: callerPhone  // Re-link phone back to original user
            });
            logger.info('resetPasswordWithPhone: Scenario B - updated password + re-linked phone', { uid: originalUser.uid });
            return { success: true, email: dummyEmail };
        }

        // ═══ SCENARIO C: Legacy user — only exists in Firestore, not in Auth ═══
        // The temp caller becomes the permanent user.
        // We need to: add email/password to caller, update Firestore doc.
        
        // Look up old Firestore doc by phone
        const snapshot = await db.collection('users')
            .where('phoneNumber', '==', callerPhone)
            .limit(1)
            .get();

        // Also check 'phone' and 'mobile' fields as fallback
        let firestoreDoc = snapshot.empty ? null : snapshot.docs[0];
        if (!firestoreDoc) {
            const snap2 = await db.collection('users').where('phone', '==', callerPhone).limit(1).get();
            firestoreDoc = snap2.empty ? null : snap2.docs[0];
        }
        if (!firestoreDoc) {
            const snap3 = await db.collection('users').where('mobile', '==', callerPhone).limit(1).get();
            firestoreDoc = snap3.empty ? null : snap3.docs[0];
        }

        // Update the caller: add email/password credential + set password
        await admin.auth().updateUser(callerUid, { 
            email: dummyEmail,
            password: newPassword 
        });
        logger.info('resetPasswordWithPhone: Scenario C - linked email+password to caller', { callerUid, dummyEmail });

        if (firestoreDoc && firestoreDoc.id !== callerUid) {
            // Migrate user data from old Firestore doc to new UID
            const oldData = firestoreDoc.data();
            await db.collection('users').doc(callerUid).set({
                ...oldData,
                phoneNumber: callerPhone,
                phone: callerPhone,
                mobile: callerPhone,
            }, { merge: true });

            // Delete old Firestore doc
            await db.collection('users').doc(firestoreDoc.id).delete();
            logger.info('resetPasswordWithPhone: Migrated Firestore data from legacy user', { 
                oldUid: firestoreDoc.id, newUid: callerUid 
            });
        } else {
            // No Firestore doc found — create a basic one
            await db.collection('users').doc(callerUid).set({
                phoneNumber: callerPhone,
                phone: callerPhone,
                mobile: callerPhone,
            }, { merge: true });
            logger.info('resetPasswordWithPhone: Created basic Firestore doc for caller', { callerUid });
        }

        return { success: true, email: dummyEmail };
    } catch (err) {
        if (err instanceof HttpsError) throw err;
        logger.error('resetPasswordWithPhone error:', err);
        throw new HttpsError('internal', 'Failed to reset password. Please try again.');
    }
});
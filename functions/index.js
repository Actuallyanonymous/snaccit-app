/**
 * snaccit-app/functions/index.js
 * FINAL STABLE VERSION - POINTS SYSTEM + SECURE PAYMENTS
 */

const { onCall, onRequest } = require("firebase-functions/v2/https");
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
    throw new admin.functions.https.HttpsError('unauthenticated', 'Login required.');
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
        throw new admin.functions.https.HttpsError('not-found', 'Restaurant not found');
    }

    // --- COD VALIDATION ---
    if (paymentMethod === 'cod' && !restaurantDoc.data().codEnabled) {
        throw new admin.functions.https.HttpsError('failed-precondition', 'Cash on Delivery is not available for this restaurant');
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
            throw new admin.functions.https.HttpsError('invalid-argument', `Item ${itemRequest.id} not found`);
        }

        const realSize = realItem.sizes.find(s => s.name === itemRequest.size);
        if (!realSize) {
             throw new admin.functions.https.HttpsError('invalid-argument', `Invalid size for ${realItem.name}`);
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
            addons: validatedAddons
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
            throw new admin.functions.https.HttpsError('failed-precondition', 'Coupon is no longer valid. Please remove it and try again.');
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
        // Ensure points don't exceed the REMAINING balance after coupon
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
        return { redirectUrl: `${APP_BASE_URL.value()}/payment-status?orderId=${orderRef.id}` };
    }

    // Case 2: Cash on Delivery (COD) - No PhonePe payment needed
    if (paymentMethod === 'cod') {
        await orderRef.update({ 
            status: 'pending', 
            paymentDetails: { method: 'cod' } 
        });
        return { redirectUrl: `${APP_BASE_URL.value()}/payment-status?orderId=${orderRef.id}` };
    }

    // Case 3: PhonePe Payment Required
    const merchantTransactionId = `SNCT_${orderRef.id}`;
    
    const payload = {
      merchantId: PHONEPE_MERCHANT_ID.value(),
      merchantTransactionId: merchantTransactionId,
      merchantUserId: userId,
      amount: Math.round(grandTotal * 100), // PhonePe expects paisa
      redirectUrl: `${APP_BASE_URL.value()}/payment-status?orderId=${orderRef.id}`,
      redirectMode: "REDIRECT",
      callbackUrl: `https://asia-south2-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/phonePeCallback`,
      mobileNumber: userPhone || "9999999999",
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const stringToHash = base64Payload + "/pg/v1/pay" + PHONEPE_SALT_KEY.value();
    const sha256Hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const xVerify = sha256Hash + "###" + PHONEPE_SALT_INDEX.value();

    try {
        const response = await axios.post(PHONEPE_PAY_API_URL, { request: base64Payload }, {
            headers: { 
                "Content-Type": "application/json", 
                "X-VERIFY": xVerify 
            }
        });
        
        if (response.data.success) {
            await orderRef.update({ merchantTransactionId });
            return { redirectUrl: response.data.data.instrumentResponse.redirectInfo.url };
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
        throw new admin.functions.https.HttpsError('internal', 'Payment Gateway Error');
    }

  } catch (error) {
    logger.error("Create Order Error", error);
    // Rethrow valid HttpsErrors, wrap others
    if (error.code && error.details) throw error;
    throw new admin.functions.https.HttpsError('internal', error.message || "Internal Server Error");
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
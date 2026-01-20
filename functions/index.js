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
}, async (request) => {
  if (!request.auth) throw new admin.functions.https.HttpsError('unauthenticated', 'Login required.');

  try {
    const userId = request.auth.uid;
    const { restaurantId, items, couponCode, arrivalTime, userName, userPhone } = request.data;
    // Explicitly check for boolean true
    const usePoints = request.data.usePoints === true; 

    // 1. Fetch Restaurant & Menu
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();
    if (!restaurantDoc.exists) throw new admin.functions.https.HttpsError('not-found', 'Restaurant not found');

    const menuSnapshot = await restaurantRef.collection('menu').get();
    const menuMap = {};
    menuSnapshot.docs.forEach(doc => { menuMap[doc.id] = doc.data(); });

    // 2. Calculate Real Subtotal
    let calculatedSubtotal = 0;
    const secureItems = [];

    for (const itemReq of items) {
        const realItem = menuMap[itemReq.id];
        if (!realItem) continue;

        const realSize = realItem.sizes.find(s => s.name === itemReq.size);
        if (!realSize) continue;

        let addonsPrice = 0;
        const validatedAddons = [];
        if (itemReq.addons) {
            realItem.addons?.forEach(a => {
                if (itemReq.addons.includes(a.name)) {
                    addonsPrice += a.price;
                    validatedAddons.push(a.name);
                }
            });
        }

        const unitPrice = realSize.price + addonsPrice;
        calculatedSubtotal += unitPrice * itemReq.quantity;
        secureItems.push({ ...itemReq, name: realItem.name, price: unitPrice, addons: validatedAddons });
    }

    // 3. Apply Coupon Discount First (Matches Frontend Logic)
    let couponDiscount = 0;
    if (couponCode) {
        const couponDoc = await db.collection('coupons').doc(couponCode).get();
        if (couponDoc.exists) {
            const cp = couponDoc.data();
            if (cp.isActive && calculatedSubtotal >= (cp.minOrderValue || 0)) {
                couponDiscount = cp.type === 'fixed' ? cp.value : (calculatedSubtotal * cp.value) / 100;
            }
        }
    }

    // 4. Calculate Points Discount (on REMAINING balance)
    let pointsDiscount = 0;
    let pointsRedeemed = 0;
    const remainingAfterCoupon = Math.max(0, calculatedSubtotal - couponDiscount);

    if (usePoints && remainingAfterCoupon > 0) {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const availablePoints = Number(userData?.points || 0); // Force number conversion
        
        if (availablePoints > 0) {
            const potentialDiscount = Math.floor(availablePoints / 10);
            // Points can only discount what's left after the coupon
            pointsDiscount = Math.min(potentialDiscount, remainingAfterCoupon);
            pointsRedeemed = pointsDiscount * 10;
        }
    }

    const grandTotal = Math.max(0, calculatedSubtotal - couponDiscount - pointsDiscount);

    // 5. Update Points and Create Order
    if (pointsRedeemed > 0) {
        await db.collection('users').doc(userId).update({
            points: admin.firestore.FieldValue.increment(-pointsRedeemed)
        });
    }

    const orderRef = await db.collection("orders").add({
        userId, restaurantId, items: secureItems,
        subtotal: calculatedSubtotal, 
        discount: couponDiscount + pointsDiscount,
        pointsRedeemed, pointsValue: pointsDiscount,
        couponCode: couponCode || null,
        total: grandTotal,
        status: grandTotal === 0 ? "pending" : "awaiting_payment",
        arrivalTime, createdAt: admin.firestore.FieldValue.serverTimestamp(),
        restaurantName: restaurantDoc.data().name
    });

    if (grandTotal === 0) {
        return { redirectUrl: `${APP_BASE_URL.value()}/payment-status?orderId=${orderRef.id}` };
    }

    // 6. Initiate PhonePe
    const merchantTransactionId = `SNCT_${orderRef.id}`;
    const payload = {
        merchantId: PHONEPE_MERCHANT_ID.value(),
        merchantTransactionId,
        merchantUserId: userId,
        amount: Math.round(grandTotal * 100), // Paisa
        redirectUrl: `${APP_BASE_URL.value()}/payment-status?orderId=${orderRef.id}`,
        redirectMode: "REDIRECT",
        callbackUrl: `https://asia-south2-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/phonePeCallback`,
        paymentInstrument: { type: "PAY_PAGE" },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const xVerify = crypto.createHash("sha256").update(base64Payload + "/pg/v1/pay" + PHONEPE_SALT_KEY.value()).digest("hex") + "###" + PHONEPE_SALT_INDEX.value();

    const response = await axios.post(PHONEPE_PAY_API_URL, { request: base64Payload }, {
        headers: { "Content-Type": "application/json", "X-VERIFY": xVerify }
    });

    if (response.data.success) {
        await orderRef.update({ merchantTransactionId });
        return { redirectUrl: response.data.data.instrumentResponse.redirectInfo.url };
    } else {
        throw new Error("Gateway Error");
    }

  } catch (error) {
    console.error("Payment Error:", error);
    throw new admin.functions.https.HttpsError('internal', error.message);
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
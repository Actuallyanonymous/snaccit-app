// snaccit-app/functions/index.js (FINAL PAYMENT FUNCTIONS - Corrected ID)

// --- Dependencies ---
const {onRequest, onCall} = require("firebase-functions/v2/https");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
const cors = require("cors")({origin: true});
const {defineString, defineSecret} = require("firebase-functions/params");

// --- Initialization ---
admin.initializeApp();
const db = admin.firestore();

// --- Secrets and Params ---
const APP_BASE_URL = defineString("APP_BASE_URL");
const PHONEPE_MERCHANT_ID = defineSecret("PHONEPE_MERCHANT_ID");
const PHONEPE_SALT_KEY = defineSecret("PHONEPE_SALT_KEY");
const PHONEPE_SALT_INDEX = defineSecret("PHONEPE_SALT_INDEX");
const PHONEPE_PAY_API_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";


// ======================================================================
// === 1. PHONEPE PAYMENT INITIATOR (asia-south2) ===
// ======================================================================
exports.phonePePay = onCall({ // ** MODIFIED: Changed from onRequest to onCall **
  region: "asia-south2",
  secrets: [
      PHONEPE_MERCHANT_ID,
      PHONEPE_SALT_KEY,
      PHONEPE_SALT_INDEX,
  ],
  minInstances: 0,
}, async (req) => { // ** MODIFIED: Removed req, res and cors wrapper **

  // ** MODIFIED: Auth is now checked automatically **
  if (!req.auth) {
      // This throws an error back to the client's .catch() block
      throw new functions.https.HttpsError(
          'unauthenticated', 
          'The function must be called while authenticated.'
      );
  }
  
  try {
    const userId = req.auth.uid; // ** MODIFIED: Get UID from req.auth **

    // ** MODIFIED: Data comes from req.data, not req.body.data **
    const { orderId } = req.data; 
    if (!orderId) {
        throw new functions.https.HttpsError(
            'invalid-argument', 
            'Missing orderId in request.'
        );
    }

    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Order not found.');
    }
    const orderData = orderDoc.data();
    if (orderData.userId !== userId) {
        throw new functions.https.HttpsError(
            'permission-denied', 
            'Permission denied.'
        );
    }

    const amountToPay = orderData.total;
    const merchantTransactionId = `SNCT_${orderId}`;
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;

    const payload = {
      merchantId, merchantTransactionId, merchantUserId: userId,
      amount: Math.round(amountToPay * 100),
      redirectUrl: `${APP_BASE_URL.value()}/payment-status?orderId=${orderId}`,
      redirectMode: "REDIRECT",
      callbackUrl: `https://asia-south2-snaccit-7d853.cloudfunctions.net/phonePeCallback`,
      mobileNumber: "9999999999", // You should probably get this from user's profile
      paymentInstrument: {type: "PAY_PAGE"},
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const stringToHash = base64Payload + "/pg/v1/pay" + saltKey;
    const sha256Hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const xVerify = sha256Hash + "###" + saltIndex;

    const options = {
      method: "POST", url: PHONEPE_PAY_API_URL,
      headers: {"accept": "application/json", "Content-Type": "application/json", "X-VERIFY": xVerify},
      data: {request: base64Payload},
    };

    const response = await axios.request(options);

    if (response.data.success) {
      const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;
      await orderRef.update({merchantTransactionId});
      
      // ** MODIFIED: Return data directly. Firebase wraps it in { data: ... } **
      return { redirectUrl }; 
    } else {
      throw new functions.https.HttpsError(
          'internal', 
          `PhonePe Error: ${response.data.message || "Unknown Error"}`
      );
    }
  } catch (error) {
    logger.error("Error in phonePePay onCall:", error);
    // If it's already an HttpsError, re-throw it. Otherwise, wrap it.
    if (error instanceof functions.https.HttpsError) {
        throw error;
    } else {
        throw new functions.https.HttpsError(
            'internal', 
            error.message || "An internal error occurred."
        );
    }
  }
});

// ======================================================================
// === 2. PHONEPE CALLBACK HANDLER (asia-south2) ===
// ======================================================================
exports.phonePeCallback = onRequest({
  region: "asia-south2",
  secrets: [
    PHONEPE_SALT_KEY,
    PHONEPE_SALT_INDEX,
  ],
}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  try {
    const xVerifyHeader = req.headers["x-verify"];
    const responsePayload = req.body.response;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX;

    const calculatedHash = crypto.createHash("sha256")
        .update(responsePayload + saltKey).digest("hex");
    const calculatedXVerify = calculatedHash + "###" + saltIndex;

    if (xVerifyHeader !== calculatedXVerify) {
      res.status(400).send("Callback verification failed.");
      return;
    }

    const decodedResponse =
      JSON.parse(Buffer.from(responsePayload, "base64").toString());
    const merchantTransactionId = decodedResponse.data.merchantTransactionId;
    const paymentStatus = decodedResponse.code;

    const ordersQuery = db.collection("orders")
        .where("merchantTransactionId", "==", merchantTransactionId);
    const querySnapshot = await ordersQuery.get();

    if (querySnapshot.empty) {
      res.status(404).send("Order not found");
      return;
    }

    const orderDoc = querySnapshot.docs[0];
    if (paymentStatus === "PAYMENT_SUCCESS") {
      await orderDoc.ref.update({status: "pending",
        paymentDetails: decodedResponse.data});
    } else {
      await orderDoc.ref.update({status: "payment_failed",
        paymentDetails: decodedResponse.data});
    }

    res.status(200).send("Callback received successfully.");
  } catch (error) {
    logger.error("Error in PhonePe callback handler:", error);
    res.status(500).send("Internal Server Error");
  }
});

// ======================================================================
// === 3. REFERRAL REWARD TRIGGER (asia-south2) ===
// ======================================================================
// Runs when a user profile is updated (specifically when 'referredBy' is set)

exports.issueReferralRewards = onDocumentUpdated({
  region: "asia-south2", 
  document: "users/{userId}",
}, async (event) => {
  const after = event.data.after.data();
  const before = event.data.before.data();

  // Check if 'referredBy' was just added/changed and we haven't issued rewards yet
  if (after.referredBy && !after.rewardsIssued) {
    const referrerId = after.referredBy;
    const newUserId = event.params.userId;

    // A. Coupon for the NEW USER (The Referee)
    // e.g., "WELCOME-8A2B"
    const newRefereeCode = `WELCOME-${newUserId.slice(0, 4).toUpperCase()}`;
    
    await db.collection("coupons").doc(newRefereeCode).set({
        code: newRefereeCode,
        value: 50, // 50 Rupees
        type: "fixed",
        minOrderValue: 150, // Minimum order
        isActive: true,
        isUsed: false, // Start unused
        assignedTo: newUserId, // Only THIS user can use it
        expiryDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days expiry
        description: "Referral Welcome Bonus"
    });

    // B. Coupon for the REFERRER (The Friend)
    // e.g., "REF-9X1Z-8821" (Unique every time)
    const uniqueSuffix = Date.now().toString().slice(-4);
    const newReferrerCode = `REF-${referrerId.slice(0, 4).toUpperCase()}-${uniqueSuffix}`;
    
    await db.collection("coupons").doc(newReferrerCode).set({
        code: newReferrerCode,
        value: 50,
        type: "fixed",
        minOrderValue: 150,
        isActive: true,
        isUsed: false,
        assignedTo: referrerId, // Only the referrer can use it
        expiryDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)), // 60 days
        description: `Bonus for referring ${after.username || 'a friend'}`
    });

    // C. Mark user as rewarded so we don't loop
    await event.data.after.ref.update({ rewardsIssued: true });

    logger.info(`Issued referral coupons for ${newUserId} and ${referrerId}`);
  }
});

// ======================================================================
// === 4. COUPON STATUS MANAGER (asia-south2) ===
// ======================================================================
// Locks coupon when order is pending. Unlocks if order fails.

exports.manageCouponOnOrderUpdate = onDocumentUpdated({
  region: "asia-south2",
  document: "orders/{orderId}",
}, async (event) => {
  const after = event.data.after.data();
  const before = event.data.before.data();
  
  // If no coupon was used in this order, ignore
  const couponCode = after.couponCode;
  if (!couponCode) return; 

  // Case A: Order moved to 'pending' (Payment Success) -> LOCK COUPON
  if (after.status === "pending" && before.status !== "pending") {
      await db.collection("coupons").doc(couponCode).update({
          isUsed: true,
          usedInOrderId: event.params.orderId
      });
      logger.info(`Coupon ${couponCode} marked as USED for order ${event.params.orderId}`);
  }

  // Case B: Order Failed/Declined -> UNLOCK COUPON
  const failureStatuses = ["payment_failed", "declined", "cancelled"];
  if (failureStatuses.includes(after.status) && !failureStatuses.includes(before.status)) {
      await db.collection("coupons").doc(couponCode).update({
          isUsed: false, // Make it usable again
          usedInOrderId: admin.firestore.FieldValue.delete()
      });
      logger.info(`Coupon ${couponCode} REACTIVATED because order failed/declined.`);
  }
});
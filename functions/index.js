// functions/index.js

// Use the new V2 imports for onCall and onRequest
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger"); // Use the new logger
// Keep your other imports
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
const { defineString } = require('firebase-functions/params');

admin.initializeApp();
const db = admin.firestore();

// Make sure your environment variables are set in Firebase
const PHONEPE_MERCHANT_ID = defineString("PHONEPE_MERCHANT_ID");
const PHONEPE_SALT_KEY = defineString("PHONEPE_SALT_KEY");
const PHONEPE_SALT_INDEX = defineString("PHONEPE_SALT_INDEX");

const PHONEPE_PAY_API_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";
const APP_BASE_URL = "https://snaccit-7d853.web.app";


// --- THIS IS THE MODIFIED LINE ---
// We've added { minInstances: 1 } to keep the function "warm"
exports.phonePePay = onCall({ minInstances: 1 }, async (request) => {
  // The user's authentication data is now in `request.auth`
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  // The data sent from your app is now in `request.data`
  const { orderId, amount } = request.data;
  const userId = request.auth.uid;
  const merchantTransactionId = `SNCT_${orderId}`;

  // ADDED: Log when the function is invoked to see the start time.
  logger.info(`[Order ID: ${orderId}] Function invoked.`);

  const payload = {
    merchantId: PHONEPE_MERCHANT_ID.value(),
    merchantTransactionId: merchantTransactionId,
    merchantUserId: userId,
    amount: amount * 100,
    redirectUrl: `${APP_BASE_URL}/payment-status?orderId=${orderId}`,
    redirectMode: "REDIRECT",
    callbackUrl: `https://us-central1-snaccit-7d853.cloudfunctions.net/phonePeCallback`,
    mobileNumber: "9999999999", // This should ideally be the user's mobile number
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const stringToHash = base64Payload + "/pg/v1/pay" + PHONEPE_SALT_KEY.value();
  const sha256Hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
  const xVerify = sha256Hash + "###" + PHONEPE_SALT_INDEX.value();

  const options = {
    method: "POST",
    url: PHONEPE_PAY_API_URL,
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "X-VERIFY": xVerify,
    },
    data: {
      request: base64Payload,
    },
  };

  try {
    // ADDED: Log right before calling the external API and start a timer.
    logger.info(`[Order ID: ${orderId}] Calling PhonePe API...`);
    const startTime = Date.now();

    const response = await axios.request(options);

    // ADDED: Log right after the external API call finishes and calculate the duration.
    const endTime = Date.now();
    const duration = endTime - startTime;
    logger.info(`[Order ID: ${orderId}] PhonePe API response received. Call duration: ${duration}ms`);


    if (response.data.success) {
      const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;
      db.collection("orders").doc(orderId).update({ merchantTransactionId })
      .catch(err => {
        logger.error(
          `[Order ID: ${orderId}] CRITICAL: Failed to update order with merchantTransactionId after getting PhonePe URL. Error:`, 
          err
        );
      });
      
      // ADDED: Log to confirm successful processing before returning.
      logger.info(`[Order ID: ${orderId}] Successfully processed. Returning redirect URL.`);
      
      return { redirectUrl };
    } else {
      const phonePeMessage = response.data.message || "PhonePe returned an unspecified error.";
      throw new HttpsError("internal", `PhonePe Error: ${phonePeMessage}`);
    }
  } catch (error) {
    logger.error(`[Order ID: ${orderId}] Error calling PhonePe API:`, error);

    if (error.response && error.response.data) {
        const detailedMessage = error.response.data.message || JSON.stringify(error.response.data);
        throw new HttpsError("internal", `Payment API failed: ${detailedMessage}`);
    }
    if (error instanceof HttpsError) {
        throw error;
    }
    throw new HttpsError("internal", "Failed to initiate payment due to an unexpected server error.");
  }
});


exports.phonePeCallback = onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const xVerifyHeader = req.headers["x-verify"];
        const responsePayload = req.body.response;

        const calculatedHash = crypto.createHash("sha256").update(responsePayload + PHONEPE_SALT_KEY.value()).digest("hex");
        const calculatedXVerify = calculatedHash + "###" + PHONEPE_SALT_INDEX.value();

        if (xVerifyHeader !== calculatedXVerify) {
            logger.error("Callback verification failed.");
            res.status(400).send("Callback verification failed.");
            return;
        }

        const decodedResponse = JSON.parse(Buffer.from(responsePayload, "base64").toString());

        const merchantTransactionId = decodedResponse.data.merchantTransactionId;
        const paymentStatus = decodedResponse.code;
        
        // Log the callback status for debugging
        logger.info(`Callback received for MTID: ${merchantTransactionId} with status: ${paymentStatus}`);

        const ordersQuery = db.collection("orders").where("merchantTransactionId", "==", merchantTransactionId);
        const querySnapshot = await ordersQuery.get();

        if (querySnapshot.empty) {
            logger.error(`No order found for transaction ID: ${merchantTransactionId}`);
            res.status(404).send("Order not found");
            return;
        }

        const orderDoc = querySnapshot.docs[0];

        if (paymentStatus === "PAYMENT_SUCCESS") {
            await orderDoc.ref.update({ status: "pending", paymentDetails: decodedResponse.data });
        } else {
            // Includes PAYMENT_ERROR, PAYMENT_PENDING, etc.
            await orderDoc.ref.update({ status: "payment_failed", paymentDetails: decodedResponse.data });
        }

        res.status(200).send("Callback received successfully.");

    } catch (error) {
        logger.error("Error in PhonePe callback handler:", error);
        res.status(500).send("Internal Server Error");
    }
});
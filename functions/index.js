// functions/index.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
const { defineString } = require('firebase-functions/params');

admin.initializeApp();
const db = admin.firestore();

// We only define the NON-sensitive URL as a parameter.
const APP_BASE_URL = defineString("APP_BASE_URL");
const PHONEPE_PAY_API_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";

// phonePePay is a callable function that initiates the payment
exports.phonePePay = onCall({ 
  minInstances: 1,
  // Use 'secrets' for sensitive data. This tells Firebase to inject them.
  secrets: ["PHONEPE_MERCHANT_ID", "PHONEPE_SALT_KEY", "PHONEPE_SALT_INDEX"] 
}, async (request) => {

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  
  const { orderId, amount } = request.data;
  const userId = request.auth.uid;
  const merchantTransactionId = `SNCT_${orderId}`;

  // Access secrets securely from the function's process environment
  const merchantId = process.env.PHONEPE_MERCHANT_ID;
  const saltKey = process.env.PHONEPE_SALT_KEY;
  const saltIndex = process.env.PHONEPE_SALT_INDEX;
  
  const payload = {
    merchantId: merchantId,
    merchantTransactionId: merchantTransactionId,
    merchantUserId: userId,
    amount: amount * 100,
    // Use .value() only for parameters defined with defineString
    redirectUrl: `${APP_BASE_URL.value()}/payment-status?orderId=${orderId}`,
    redirectMode: "REDIRECT",
    callbackUrl: `https://us-central1-snaccit-7d853.cloudfunctions.net/phonePeCallback`,
    mobileNumber: "9999999999",
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const stringToHash = base64Payload + "/pg/v1/pay" + saltKey;
  const sha256Hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
  const xVerify = sha256Hash + "###" + saltIndex;

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
    const response = await axios.request(options);

    if (response.data.success) {
      const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;
      // Update Firestore in the background without making the user wait
      db.collection("orders").doc(orderId).update({ merchantTransactionId })
        .catch(err => {
          logger.error(`[Order ID: ${orderId}] CRITICAL: Failed to update order. Error:`, err);
        });
      return { redirectUrl };
    } else {
      throw new HttpsError("internal", `PhonePe Error: ${response.data.message || 'Unknown Error'}`);
    }
  } catch (error) {
    logger.error(`[Order ID: ${orderId}] Error in phonePePay function:`, error);
    if (error.response && error.response.data) {
        const detailedMessage = error.response.data.message || JSON.stringify(error.response.data);
        throw new HttpsError("internal", `Payment API failed: ${detailedMessage}`);
    }
    if (error instanceof HttpsError) {
        throw error;
    }
    throw new HttpsError("internal", "Failed to initiate payment.");
  }
});

// phonePeCallback handles the server-to-server response from PhonePe
exports.phonePeCallback = onRequest({
    // This function also needs secrets to verify the callback
    secrets: ["PHONEPE_SALT_KEY", "PHONEPE_SALT_INDEX"]
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

        const calculatedHash = crypto.createHash("sha256").update(responsePayload + saltKey).digest("hex");
        const calculatedXVerify = calculatedHash + "###" + saltIndex;
        
        if (xVerifyHeader !== calculatedXVerify) {
            logger.error("Callback verification failed.");
            res.status(400).send("Callback verification failed.");
            return;
        }

        const decodedResponse = JSON.parse(Buffer.from(responsePayload, "base64").toString());
        const merchantTransactionId = decodedResponse.data.merchantTransactionId;
        const paymentStatus = decodedResponse.code;
        
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
            await orderDoc.ref.update({ status: "payment_failed", paymentDetails: decodedResponse.data });
        }
        res.status(200).send("Callback received successfully.");
    } catch (error) {
        logger.error("Error in PhonePe callback handler:", error);
        res.status(500).send("Internal Server Error");
    }
});

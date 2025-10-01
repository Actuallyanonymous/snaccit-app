// functions/index.js (Corrected v2 Syntax)

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
const { defineString } = require('firebase-functions/params');

admin.initializeApp();
const db = admin.firestore();

const APP_BASE_URL = defineString("APP_BASE_URL");
const PHONEPE_PAY_API_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";

exports.phonePePay = onCall({ 
  minInstances: 1,
  secrets: ["PHONEPE_MERCHANT_ID", "PHONEPE_SALT_KEY", "PHONEPE_SALT_INDEX"] 
}, async (request) => {

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  
  const { orderId } = request.data;
  const userId = request.auth.uid;

  // --- SERVER-SIDE VALIDATION ---
  const orderRef = db.collection("orders").doc(orderId);
  const orderDoc = await orderRef.get();

  if (!orderDoc.exists) {
    throw new HttpsError("not-found", "Order not found.");
  }

  const orderData = orderDoc.data();

  if (orderData.userId !== userId) {
    throw new HttpsError("permission-denied", "You do not have permission to pay for this order.");
  }
  
  const amountToPay = orderData.total;
  
  const merchantTransactionId = `SNCT_${orderId}`;
  const merchantId = process.env.PHONEPE_MERCHANT_ID;
  const saltKey = process.env.PHONEPE_SALT_KEY;
  const saltIndex = process.env.PHONEPE_SALT_INDEX;
  
  const payload = {
    merchantId: merchantId,
    merchantTransactionId: merchantTransactionId,
    merchantUserId: userId,
    amount: Math.round(amountToPay * 100),
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
      orderRef.update({ merchantTransactionId })
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
        await orderRef.update({ status: 'payment_failed', errorDetails: detailedMessage });
        throw new HttpsError("internal", `Payment API failed: ${detailedMessage}`);
    }
    if (error instanceof HttpsError) {
        throw error;
    }
    throw new HttpsError("internal", "Failed to initiate payment.");
  }
});

exports.phonePeCallback = onRequest({
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
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

  const payload = {
    merchantId: PHONEPE_MERCHANT_ID.value(),
    merchantTransactionId: merchantTransactionId,
    merchantUserId: userId,
    amount: amount * 100,
    redirectUrl: `${APP_BASE_URL}/payment-status?orderId=${orderId}`,
    redirectMode: "REDIRECT",
    callbackUrl: `https://us-central1-snaccit-7d853.cloudfunctions.net/phonePeCallback`,
    mobileNumber: "9999999999",
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
    const response = await axios.request(options);

    if (response.data.success) {
      const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;
      await db.collection("orders").doc(orderId).update({ merchantTransactionId });
      return { redirectUrl };
    } else {
      const phonePeMessage = response.data.message || "PhonePe returned an unspecified error.";
      throw new HttpsError("internal", `PhonePe Error: ${phonePeMessage}`);
    }
  } catch (error) {
    logger.error("Error calling PhonePe API:", error);

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

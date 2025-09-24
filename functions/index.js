const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
const { defineString } = require('firebase-functions/params');

admin.initializeApp();
const db = admin.firestore();

const PHONEPE_MERCHANT_ID = defineString("PHONEPE_MERCHANT_ID");
const PHONEPE_SALT_KEY = defineString("PHONEPE_SALT_KEY");
const PHONEPE_SALT_INDEX = defineString("PHONEPE_SALT_INDEX");

const PHONEPE_PAY_API_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";
const APP_BASE_URL = "https://snaccit-7d853.web.app"; 

exports.phonePePay = functions.https.onCall(async (data, context) => {
  // ... (keep the top part of the function the same)
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const { orderId, amount } = data;
  const userId = context.auth.uid;
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
      // This case handles non-crashing errors from PhonePe
      const phonePeMessage = response.data.message || "PhonePe returned an unspecified error.";
      throw new functions.https.HttpsError("internal", `PhonePe Error: ${phonePeMessage}`);
    }
  } catch (error) {
    // --- THIS IS THE MODIFIED PART ---
    // This will now catch crashes and provide a detailed reason
    console.error("Error calling PhonePe API:", error);
    
    // Check if this is an error from the PhonePe server
    if (error.response && error.response.data) {
        const detailedMessage = error.response.data.message || JSON.stringify(error.response.data);
        throw new functions.https.HttpsError("internal", `Payment API failed: ${detailedMessage}`);
    }

    // Otherwise, throw a generic error
    throw new functions.https.HttpsError("internal", "Failed to initiate payment due to an unexpected server error.");
  }
});

// ... (keep the phonePeCallback function exactly as it is)
exports.phonePeCallback = functions.https.onRequest(async (req, res) => {
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
            console.error("Callback verification failed.");
            res.status(400).send("Callback verification failed.");
            return;
        }
        
        const decodedResponse = JSON.parse(Buffer.from(responsePayload, "base64").toString());
        
        const merchantTransactionId = decodedResponse.data.merchantTransactionId;
        const paymentStatus = decodedResponse.code;

        const ordersQuery = db.collection("orders").where("merchantTransactionId", "==", merchantTransactionId);
        const querySnapshot = await ordersQuery.get();

        if (querySnapshot.empty) {
            console.error(`No order found for transaction ID: ${merchantTransactionId}`);
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
        console.error("Error in PhonePe callback handler:", error);
        res.status(500).send("Internal Server Error");
    }
});





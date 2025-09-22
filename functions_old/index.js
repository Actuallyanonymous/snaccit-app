const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// --- PhonePe Configuration ---
const PHONEPE_MERCHANT_ID = functions.config().phonepe.merchant_id;
const PHONEPE_SALT_KEY = functions.config().phonepe.salt_key;
const PHONEPE_SALT_INDEX = parseInt(functions.config().phonepe.salt_index, 10);

// PhonePe API endpoint (use UAT/preprod for testing, PROD for live)
const PHONEPE_PAY_API_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";
// Your deployed app's URL
const APP_BASE_URL = "https://snaccit-7d853.web.app"; 

/**
 * @name phonePePay
 * @description Initiates a payment with PhonePe
 */
exports.phonePePay = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  const { orderId, amount } = data;
  const userId = context.auth.uid;
  const merchantTransactionId = `SNCT_${orderId}`;

  const payload = {
    merchantId: PHONEPE_MERCHANT_ID,
    merchantTransactionId: merchantTransactionId,
    merchantUserId: userId,
    amount: amount * 100, // Amount in paise
    redirectUrl: `${APP_BASE_URL}/payment-status?orderId=${orderId}`,
    redirectMode: "REDIRECT",
    // This is the CRUCIAL server-to-server callback URL
    callbackUrl: `https://us-central1-snaccit-7d853.cloudfunctions.net/phonePeCallback`,
    mobileNumber: "9999999999", 
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const stringToHash = base64Payload + "/pg/v1/pay" + PHONEPE_SALT_KEY;
  const sha256Hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
  const xVerify = sha256Hash + "###" + PHONEPE_SALT_INDEX;

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
      throw new functions.https.HttpsError("internal", "PhonePe payment initiation failed.");
    }
  } catch (error) {
    console.error("Error calling PhonePe API:", error);
    throw new functions.https.HttpsError("internal", "Failed to initiate payment.");
  }
});


/**
 * @name phonePeCallback
 * @description Handles the server-to-server callback from PhonePe after payment.
 */
exports.phonePeCallback = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const xVerifyHeader = req.headers["x-verify"];
        const responsePayload = req.body.response; 

        const calculatedHash = crypto.createHash("sha256").update(responsePayload + PHONEPE_SALT_KEY).digest("hex");
        const calculatedXVerify = calculatedHash + "###" + PHONEPE_SALT_INDEX;

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
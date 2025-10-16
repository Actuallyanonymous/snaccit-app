// functions/index.js (Corrected v2 Syntax)

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
const { defineString } = require('firebase-functions/params'); 
const APP_BASE_URL = defineString("APP_BASE_URL");
const cors = require('cors')({origin: true});


admin.initializeApp();
const db = admin.firestore();

const PHONEPE_PAY_API_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";

exports.phonePePay = onRequest({
  region: "asia-south2",
  secrets: ["PHONEPE_MERCHANT_ID", "PHONEPE_SALT_KEY", "PHONEPE_SALT_INDEX"],
  minInstances: 1, // You can keep this on the Blaze plan
}, (req, res) => {
  // This wraps your function in CORS handling
  cors(req, res, async () => {
      // 1. Manually verify the user is authenticated
      if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
          logger.error("Unauthorized: No authorization token was passed.");
          res.status(403).send('Unauthorized');
          return;
      }

      try {
          const idToken = req.headers.authorization.split('Bearer ')[1];
          const decodedToken = await admin.auth().verifyIdToken(idToken);
          const userId = decodedToken.uid;
          
          // 2. Manually get the orderId from the request body
          const { orderId } = req.body.data;
          if (!orderId) {
              res.status(400).send({ error: "Missing orderId in request." });
              return;
          }

          // --- Your original function logic is identical from here ---
          const orderRef = db.collection("orders").doc(orderId);
          const orderDoc = await orderRef.get();

          if (!orderDoc.exists) { throw new Error("Order not found."); }
          const orderData = orderDoc.data();
          if (orderData.userId !== userId) { throw new Error("Permission denied."); }
          
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
              mobileNumber: "9999999999",
              paymentInstrument: { type: "PAY_PAGE" },
          };
          
          const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
          const stringToHash = base64Payload + "/pg/v1/pay" + saltKey;
          const sha256Hash = require("crypto").createHash("sha256").update(stringToHash).digest("hex");
          const xVerify = sha256Hash + "###" + saltIndex;
          
          const options = {
              method: "POST",
              url: "https://api.phonepe.com/apis/hermes/pg/v1/pay",
              headers: { accept: "application/json", "Content-Type": "application/json", "X-VERIFY": xVerify },
              data: { request: base64Payload },
          };

          const response = await require("axios").request(options);

          if (response.data.success) {
              const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;
              await orderRef.update({ merchantTransactionId });
              // 3. Manually send the successful response back
              res.status(200).send({ data: { redirectUrl } });
          } else {
              throw new Error(`PhonePe Error: ${response.data.message || 'Unknown Error'}`);
          }
      } catch (error) {
          logger.error("Error in phonePePay onRequest:", error);
          res.status(500).send({ error: { message: "An internal error occurred.", details: error.message } });
      }
  });
});

exports.phonePeCallback = onRequest({
    region: "asia-south2",
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
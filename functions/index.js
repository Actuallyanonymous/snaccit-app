const functions = require("firebase-functions");
const Razorpay = require("razorpay");

// Initialize Razorpay instance with your key and secret from Firebase environment configuration
// To set these, run in your terminal:
// firebase functions:config:set razorpay.key_id="YOUR_KEY_ID"
// firebase functions:config:set razorpay.key_secret="YOUR_KEY_SECRET"
const razorpay = new Razorpay({
    key_id: functions.config().razorpay.key_id,
    key_secret: functions.config().razorpay.key_secret,
});

exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
    // Check if the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { amount, currency } = data;
    // Create a unique receipt ID for each order
    const receipt = `snaccit_order_${Date.now()}`;

    // Validate the amount
    if (!amount || amount <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a valid "amount".');
    }

    try {
        const options = {
            amount: amount, // Amount is in the smallest currency unit (e.g., paise for INR)
            currency: currency || "INR",
            receipt: receipt,
        };

        const order = await razorpay.orders.create(options);
        
        if (!order) {
            throw new functions.https.HttpsError('internal', 'Could not create Razorpay order.');
        }

        return order;

    } catch (error) {
        console.error("Razorpay order creation failed:", error);
        throw new functions.https.HttpsError("internal", "An error occurred while creating the Razorpay order.");
    }
});


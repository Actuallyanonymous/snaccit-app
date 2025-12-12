// App.jsx (Full, Unabbreviated Version with Email-Only Login)
import firebase from 'firebase/compat/app';
import React, { useState, useEffect, useMemo } from 'react';
import { requestCustomerNotificationPermission } from './firebaseMessaging';
// Update this line at the top of your file:
import { 
    ChefHat, Smartphone, Store, Pizza, Sandwich, Utensils, X, ArrowLeft, 
    Leaf, PlusCircle, MinusCircle, ShoppingCart, Clock, PartyPopper, 
    Search, Star, Award, User, Info, Bell, Loader2, Frown, Copy, TicketPercent,
    Gift, ChevronDown 
} from 'lucide-react';
import 'firebase/compat/auth'; // Ensure Auth compat is imported
import { auth, db, functionsAsia, messaging } from './firebase'; 

// --- Import your local assets here ---
// Make sure these filenames match exactly what is in your src/assets folder
import heroVideo from './assets/Snaccit_Pre_Order_Dinner_Advertisement.mp4';
import butterChickenImg from './assets/butter-chicken.png';
import pizzaImg from './assets/marg-pizza.png';
import sushiImg from './assets/sushi-platter.png';
import burgerImg from './assets/vegan-burger.png';


// --- Notification Component ---
const Notification = ({ message, type, onDismiss }) => {
// ... (rest of the component is unchanged)
    if (!message) return null;
    const baseClasses = "fixed top-5 right-5 p-4 rounded-lg shadow-lg flex items-center z-[100] animate-fade-in-down";
    const typeClasses = {
        success: "bg-green-100 text-green-800",
        error: "bg-red-100 text-red-800",
    };

    useEffect(() => {
        const timer = setTimeout(() => onDismiss(), 8000);
        return () => clearTimeout(timer);
    }, [message, onDismiss]);

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            <Info size={20} className="mr-3" />
            <span>{message}</span>
            <button onClick={onDismiss} className="ml-4 font-bold opacity-70 hover:opacity-100"><X size={18} /></button>
        </div>
    );
};

// --- Brand Logo Component ---
const BrandLogo = ({ className = "" }) => (
    <div className={`inline-flex items-center justify-center space-x-4 ${className}`}>
        <div className="bg-gradient-to-br from-green-400 to-green-600 text-white p-3 rounded-2xl shadow-lg transform -rotate-12 hover:rotate-0 transition-transform duration-300">
            <Utensils size={28} strokeWidth={2.5} />
        </div>
        <div className="text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm leading-none">
                Snaccit
                <span className="text-green-400">.</span> 
            </h1>
        </div>
    </div>
);

// --- Animated Hero Text ---
const AnimatedHeroText = () => (
// ... (rest of the component is unchanged)
    <>
        <style>{`
            @keyframes slide-in { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .slide-in-1 { animation: slide-in 0.8s forwards 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); opacity: 0; }
            .slide-in-2 { animation: slide-in 0.8s forwards 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); opacity: 0; }
            .drawing-circle { stroke: #ef4444; stroke-width: 4; fill: transparent; stroke-dasharray: 1500; stroke-dashoffset: 1500; animation: draw-circle-around 3s ease-in-out infinite; }
            @keyframes draw-circle-around { 0% { stroke-dashoffset: 1500; opacity: 0;} 10% { opacity: 1; } 50% { stroke-dashoffset: 0; opacity: 1;} 90% { opacity: 1; } 100% { stroke-dashoffset: -1500; opacity: 0;} }
        `}</style>
        <h2 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tighter drop-shadow-2xl">
            <span className="slide-in-1 inline-block relative px-4 py-2">
                Skip the wait.
                <svg className="absolute top-0 left-0 w-full h-full overflow-visible"><rect className="drawing-circle" x="0" y="0" width="100%" height="100%" rx="30" /></svg>
            </span>
            <span className="slide-in-2 inline-block ml-4">Savor the moment.</span>
        </h2>
    </>
);

// --- Authentication Modal Component (Detects New User) ---
const AuthModal = ({ isOpen, onClose, onNewUserVerified }) => {
// ... (rest of the component is unchanged - long code omitted for brevity)
// ... (Full component code as provided in previous response) ...
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

    const clearRecaptcha = () => {
        if (window.recaptchaVerifier) {
            try {
                console.log("Clearing reCAPTCHA verifier.");
                window.recaptchaVerifier.clear(); // Call the clear method
                const container = document.getElementById('recaptcha-container');
                 if(container) container.innerHTML = ''; // Clear the container div content
            } catch (error) {
                console.error("Error clearing reCAPTCHA:", error);
            } finally {
                window.recaptchaVerifier = null; // Nullify the global reference
                setRecaptchaVerifier(null); // Nullify state
                 window.recaptchaWidgetId = undefined; // Clear widget ID
            }
        }
    }

    const setupRecaptcha = (retryCount = 0) => {
        console.log(`Attempting to set up reCAPTCHA... (Attempt ${retryCount + 1})`);

        // Check if the reCAPTCHA library script has loaded
        if (typeof window.grecaptcha === 'undefined' || typeof firebase.auth.RecaptchaVerifier === 'undefined') {
            console.warn("reCAPTCHA library (grecaptcha or RecaptchaVerifier) not ready yet.");
            // Retry logic
            if (retryCount < 5) { // Try up to 5 times (total ~500ms)
                console.log("Retrying setup in 100ms...");
                setTimeout(() => setupRecaptcha(retryCount + 1), 100); // Retry after 100ms
                return; // Exit current attempt
            } else {
                console.error("!!! reCAPTCHA library failed to load after multiple retries!");
                setError("Authentication service failed to load. Please refresh and try again.");
                setIsProcessing(false); // Make sure button isn't stuck disabled
                return; // Stop setup
            }
        }

        // Ensure the container exists
        const container = document.getElementById('recaptcha-container');
        if (!container) {
             // Delay slightly and check again, in case React hasn't rendered it yet
             if (retryCount < 3) { // Try a few times
                 console.warn("reCAPTCHA container not found, retrying...");
                 setTimeout(() => setupRecaptcha(retryCount + 1), 150);
                 return;
             }
            console.error("!!! reCAPTCHA container element not found in DOM!");
            setError("UI Error: reCAPTCHA container missing. Please refresh.");
            setIsProcessing(false); // Make sure button isn't stuck disabled
            return;
        }
        container.innerHTML = ''; // Ensure container is empty before rendering

        try {
            console.log("Creating new RecaptchaVerifier instance...");
            // Assign directly to window property
            window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    console.log("reCAPTCHA solved (invisible callback)");
                },
                'expired-callback': () => {
                    console.warn("reCAPTCHA expired.");
                    setError("reCAPTCHA expired. Please try sending OTP again.");
                    setIsProcessing(false);
                    // Expired - try to reset and setup again cleanly
                    clearRecaptcha(); // Clean up expired instance
                    setupRecaptcha(); // Re-initialize
                }
            });

            // Set the state *after* creating the instance on window
            setRecaptchaVerifier(window.recaptchaVerifier);

            // Render immediately
            window.recaptchaVerifier.render().then((widgetId) => {
                window.recaptchaWidgetId = widgetId;
                console.log("reCAPTCHA rendered successfully with widget ID:", widgetId);
                // No need to setRecaptchaVerifier again here
            }).catch(err => {
                console.error("!!! Error rendering reCAPTCHA:", err);
                setError("Failed to initialize reCAPTCHA. Check console for details.");
                setIsProcessing(false);
                clearRecaptcha(); // Clean up failed instance
            });

        } catch (err) {
            console.error("!!! Error creating RecaptchaVerifier instance:", err);
            setError("Failed to create reCAPTCHA verifier. Check console.");
            setIsProcessing(false);
            clearRecaptcha(); // Clean up potentially broken instance
        }
    };

    // Effect for setup on open/step change
    useEffect(() => {
        let isMounted = true;
        let timeoutId;
        // Only setup if open, on step 1, AND if no verifier exists yet
        if (isOpen && step === 1 && !window.recaptchaVerifier) {
             console.log("Effect running: Modal open, step 1, verifier missing. Setting up reCAPTCHA.");
             // Use timeout to ensure DOM element exists after modal transition
             timeoutId = setTimeout(() => { if(isMounted) setupRecaptcha(); }, 150);
        } else {
             console.log("Effect running: Skipping reCAPTCHA setup (isOpen:", isOpen, "step:", step, "verifier exists:", !!window.recaptchaVerifier,")");
        }
        // Cleanup function for when component unmounts, modal closes, OR step changes away from 1
        return () => {
             console.log("Effect cleanup running for [isOpen, step] effect.");
             isMounted = false;
             clearTimeout(timeoutId);
             // Cleanup handled by explicit actions (button click, modal close effect)
        };
    }, [isOpen, step]);

    // Handler for submitting phone or OTP
    const handleAuthAction = async (e) => {
        e.preventDefault();
        setError('');
        setIsProcessing(true);
        console.log("handleAuthAction triggered for step:", step);

        if (step === 1) {
            // --- Step 1: Request OTP ---
            const verifier = window.recaptchaVerifier; // Use window ref
            if (!verifier) {
                console.error("!!! Attempted to send OTP, but window.recaptchaVerifier is null/undefined!");
                setError("reCAPTCHA is not ready. Please wait a moment or refresh.");
                setupRecaptcha(); // Attempt setup again
                setIsProcessing(false);
                return;
            }
            console.log("Proceeding with signInWithPhoneNumber...");
            try {
                // More robust phone number formatting needed for production
                const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber.replace(/\D/g, '')}`; // Remove non-digits just in case
                if (!/^\+[1-9]\d{1,14}$/.test(formattedPhoneNumber)) { // E.164 basic validation
                     throw { code: 'auth/invalid-phone-number', message: 'Invalid format.' };
                }

                const confirmation = await auth.signInWithPhoneNumber(formattedPhoneNumber, verifier);
                console.log("signInWithPhoneNumber successful, confirmation result received.");
                setConfirmationResult(confirmation);
                setStep(2);
                setError('');
                // Note: Do NOT clear reCAPTCHA here, needed for potential resends implicitly handled by Firebase
            } catch (err) {
                console.error("Error sending OTP:", err);
                // Handle different errors
                if (err.code === 'auth/invalid-phone-number') setError(`Invalid phone number format (${err.message}). Include country code (e.g., +91).`);
                else if (err.code === 'auth/too-many-requests') setError('Too many requests. Please try again later.');
                else if (err.code === 'auth/internal-error') setError('Internal auth error during OTP request. Check authorized domains and API key restrictions.');
                else setError(`Failed to send OTP (${err.code || 'Unknown'}). Check number and try again.`);

                 // Attempt to reset the reCAPTCHA widget state without destroying the verifier instance
                 try {
                     const widgetId = window.recaptchaWidgetId; // Use stored ID
                     if (typeof window.grecaptcha !== 'undefined' && widgetId !== undefined) {
                         console.log("Resetting reCAPTCHA widget state:", widgetId);
                         window.grecaptcha.reset(widgetId);
                     } else {
                          console.warn("Could not reset reCAPTCHA widget state (grecaptcha or widgetId undefined)");
                     }
                 } catch (resetError) {
                      console.error("Error resetting reCAPTCHA state:", resetError);
                 }
            }
        } else if (step === 2) {
            // --- Step 2: Verify OTP ---
            if (!confirmationResult) {
                setError("Verification session expired or invalid. Please request OTP again.");
                setIsProcessing(false);
                return;
            }
            try {
                console.log("Attempting to confirm OTP:", otp);
                const userCredential = await confirmationResult.confirm(otp);
                const user = userCredential.user;
                console.log("User signed in successfully via OTP:", user.uid, user.phoneNumber);

                const metadata = user.metadata;
                // Check creationTime against lastSignInTime (within a small tolerance for clock skew)
                const isNewUser = Math.abs(new Date(metadata.creationTime).getTime() - new Date(metadata.lastSignInTime).getTime()) < 1000 * 2; // 2 seconds tolerance
                console.log("Is new user?", isNewUser, "Creation:", metadata.creationTime, "Last Sign In:", metadata.lastSignInTime);
                setError('');

                if (isNewUser) {
                    console.log("Calling onNewUserVerified for new user.");
                    onNewUserVerified(user); // Keep modal open, let parent handle transition
                } else {
                    console.log("Existing user logged in. Closing modal.");
                    onClose(); // Close modal for existing user
                }
            } catch (err) {
                console.error("Error verifying OTP:", err);
                 // Handle specific OTP errors
                if (err.code === 'auth/invalid-verification-code') {
                    setError('Invalid OTP code. Please try again.');
                } else if (err.code === 'auth/code-expired') {
                    setError('Verification code expired. Please request a new OTP.');
                      // Force user back to step 1 cleanly
                      setStep(1);
                      setOtp(''); // Clear OTP field
                      setConfirmationResult(null); // Invalidate confirmation
                      clearRecaptcha(); // Clean up before useEffect runs again for step 1
                 } else {
                     setError(`Failed to verify OTP (${err.code || 'Unknown'}). Please try again.`);
                 }
            }
        }

        setIsProcessing(false);
    };

   // Effect to handle modal closing - ensure cleanup happens
   useEffect(() => {
       if (!isOpen) {
           console.log("AuthModal closed. Running state reset and cleanup effect.");
           // Reset internal state
           setPhoneNumber(''); setOtp(''); setError(''); setStep(1);
           setIsProcessing(false); setConfirmationResult(null);
           clearRecaptcha(); // Ensure cleanup on close
       }
   }, [isOpen]);

   // --- JSX ---
   if (!isOpen) return null;

   return (
       <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
           <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md m-4 relative">
               <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={24} /></button>
               <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
                   {step === 1 ? 'Enter Phone Number' : 'Enter OTP'}
               </h2>
               <p className="text-center text-gray-500 mb-6">
                   {step === 1 ? 'We\'ll send a verification code.' : `Enter the code sent to ${phoneNumber}.`}
               </p>
               <form onSubmit={handleAuthAction}>
                   {/* Phone Input */}
                   {step === 1 && (
                       <div className="mb-4">
                           <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phoneNumber">Phone Number</label>
                           <input
                               type="tel" id="phoneNumber" value={phoneNumber}
                               onChange={(e) => setPhoneNumber(e.target.value)}
                               className="shadow-inner appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
                               placeholder="+91 XXXXXXXXXX" required autoComplete="tel"
                           />
                       </div>
                   )}
                   {/* OTP Input */}
                   {step === 2 && (
                       <div className="mb-6">
                           <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="otp">Verification Code</label>
                           <input
                               type="text" id="otp" value={otp} // Use text for better autofill support
                               onChange={(e) => setOtp(e.target.value)}
                               className="shadow-inner appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
                               placeholder="Enter 6-digit code" required maxLength="6"
                               inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code"
                           />
                       </div>
                   )}

                   {/* reCAPTCHA container - must always be in DOM when verifier might exist */}
                   <div id="recaptcha-container" className="my-4 h-[1px] overflow-hidden"></div> {/* Keep in DOM but visually hidden */}

                   {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

                   {/* Submit Button */}
                   <button type="submit" disabled={isProcessing} className={`bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-full hover:shadow-lg hover:shadow-green-500/40 transition-all duration-300 w-full ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`} >
                        {isProcessing ? <Loader2 className="animate-spin mx-auto" size={24}/> : (step === 1 ? 'Send OTP' : 'Verify OTP & Log In')}
                   </button>
               </form>

               {/* Change/Resend Button */}
               {step === 2 && (
                    <p className="text-center text-sm text-gray-500 mt-4">
                       <button
                           type="button" // Important: Prevent form submission
                           onClick={() => {
                               console.log("Change/Resend button clicked. Clearing reCAPTCHA first.");
                               clearRecaptcha(); // Explicit cleanup first
                               // Now update state which will trigger useEffect later
                               setStep(1);
                               setError('');
                               setOtp('');
                               setConfirmationResult(null);
                           }}
                           className="font-bold text-green-600 hover:text-green-700"
                           disabled={isProcessing} // Disable if already processing something
                       >
                          Change Phone Number or Resend OTP
                       </button>
                   </p>
               )}
           </div>
       </div>
   );
};

// --- [MODIFIED] Login Modal (Email/Password ONLY) ---
const LoginModal = ({ isOpen, onClose, showNotification }) => {
// ... (rest of the component is unchanged - long code omitted for brevity)
    // Note: onSelectOtpLogin prop is no longer needed
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        // Reset state when modal opens
        if (isOpen) {
            setEmail('');
            setPassword('');
            setError('');
            setIsProcessing(false);
        }
    }, [isOpen]);

     const handleEmailPasswordLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsProcessing(true);
        try {
            await auth.signInWithEmailAndPassword(email, password);
            showNotification("Logged in successfully!", "success");
            onClose(); // Close modal on success
        } catch (err) {
            console.error("Error signing in with email/password:", err);
            switch (err.code) {
                case 'auth/invalid-email': setError('Please enter a valid email address.'); break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential': setError('Invalid email or password.'); break;
                 case 'auth/user-disabled': setError('This account has been disabled.'); break;
                default: setError(`Login failed (${err.code}). Please try again.`); break;
            }
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md m-4 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={24} /></button>
                
                {/* --- Email/Password Form --- */}
                <>
                    <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Log In</h2>
                    <p className="text-center text-gray-500 mb-6">Enter your email and password.</p>
                    <form onSubmit={handleEmailPasswordLogin}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="login-email">Email</label>
                            <input type="email" id="login-email" value={email} onChange={(e) => setEmail(e.target.value)} className="shadow-inner appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="you@example.com" required autoComplete="email" />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="login-password">Password</label>
                            <input type="password" id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} className="shadow-inner appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="••••••••••" required autoComplete="current-password" />
                            {/* Optional: Add Forgot Password link */}
                        </div>
                        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                        <button type="submit" disabled={isProcessing} className={`bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-full hover:shadow-lg hover:shadow-green-500/40 transition-all duration-300 w-full ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {isProcessing ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Log In'}
                        </button>
                    </form>
                    {/* Note: No "Back to login options" button needed now */}
                </>
            </div>
        </div>
    );
};

// --- [UPDATED] Set Credentials Modal (With Success Screen) ---
const SetCredentialsModal = ({ isOpen, onClose, newUser, showNotification }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [referralInput, setReferralInput] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false); // <--- NEW STATE

    const { EmailAuthProvider } = firebase.auth;

    useEffect(() => {
        if (isOpen) {
            setEmail(''); setPassword(''); setUsername(''); setReferralInput('');
            setError(''); setIsProcessing(false); setShowSuccess(false); // Reset on open
        }
    }, [isOpen]);

    const handleSetCredentials = async (e) => {
        e.preventDefault();
        setError('');
        setIsProcessing(true);

        if (!newUser) { setError("User session is invalid. Please try signing up again."); setIsProcessing(false); return; }
        if (password.length < 6) { setError('Password should be at least 6 characters long.'); setIsProcessing(false); return; }
        if (!username.trim()) { setError('Please enter a username.'); setIsProcessing(false); return; }

        try {
            // --- 1. REFERRAL CHECK ---
            let referredByUid = null;
            if (referralInput.trim()) {
                const codeToCheck = referralInput.trim().toUpperCase();
                const usersRef = db.collection("users");
                const snapshot = await usersRef.where("myReferralCode", "==", codeToCheck).limit(1).get();
                
                if (snapshot.empty) {
                    setError("Invalid referral code.");
                    setIsProcessing(false);
                    return;
                }
                if (snapshot.docs[0].id === newUser.uid) {
                     setError("You cannot use your own code.");
                     setIsProcessing(false);
                     return;
                }
                referredByUid = snapshot.docs[0].id;
            }

            // --- 2. GENERATE NEW CODE FOR THIS USER ---
            const cleanName = username.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
            const uidSuffix = newUser.uid.slice(-5).toUpperCase(); 
            const myNewCode = `${cleanName}${uidSuffix}`;

            // --- 3. LINK AUTH ---
            const credential = EmailAuthProvider.credential(email, password);
            const currentUser = auth.currentUser;
            if (!currentUser || currentUser.uid !== newUser.uid) {
                 throw { code: 'auth/user-mismatch', message: "User state mismatch. Please log in again." };
            }
            await currentUser.linkWithCredential(credential);

            // --- 4. SAVE TO FIRESTORE ---
            const userDocRef = db.collection("users").doc(currentUser.uid);
            await userDocRef.set({
                username: username.trim(),
                email: email.toLowerCase(),
                phoneNumber: currentUser.phoneNumber,
                mobile: currentUser.phoneNumber,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                myReferralCode: myNewCode,
                referredBy: referredByUid,
                rewardsIssued: false
            }, { merge: true });

            // --- SUCCESS STATE TRIGGER ---
            setShowSuccess(true); // Show the success screen instead of closing immediately

        } catch (err) {
            console.error("Error setting credentials:", err);
            switch (err.code) {
                case 'auth/email-already-in-use': setError('This email is already associated with another account.'); break;
                case 'auth/credential-already-in-use': setError('This email/credential is already linked to a user.'); break;
                case 'auth/weak-password': setError('Password should be at least 6 characters long.'); break;
                case 'auth/requires-recent-login': setError('Security check required. Please try signing up again.'); break;
                case 'auth/user-mismatch': setError(err.message); break;
                default: setError(`An unexpected error occurred (${err.code}). Please try again.`); break;
            }
            setIsProcessing(false); // Only stop processing on error
        } 
    };

    const handleFinalClose = () => {
        // We reload to ensure the main App fetches the new profile data cleanly
        window.location.reload();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-md relative overflow-hidden">
                
                {showSuccess ? (
                    /* --- SUCCESS SCREEN --- */
                    <div className="text-center py-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 animate-bounce">
                            <PartyPopper size={40} className="text-green-600" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Welcome to Snaccit!</h2>
                        <p className="text-gray-500 mb-8">Your account has been created successfully.</p>
                        
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 mb-8 text-left space-y-4">
                            <div className="flex items-start">
                                <div className="bg-white p-1.5 rounded-full shadow-sm mr-3 mt-0.5"><TicketPercent size={18} className="text-amber-500"/></div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">Discount Coupon</h4>
                                    <p className="text-xs text-gray-600 mt-0.5">Check the <strong>"My Rewards"</strong> section in your Profile to find your coupon!</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <div className="bg-white p-1.5 rounded-full shadow-sm mr-3 mt-0.5"><Copy size={18} className="text-blue-500"/></div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">Your Referral Code</h4>
                                    <p className="text-xs text-gray-600 mt-0.5">Find your unique code in your Profile. Share it to earn more rewards!</p>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleFinalClose} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-green-500/30">
                            Let's Eat!
                        </button>
                    </div>
                ) : (
                    /* --- FORM SCREEN --- */
                    <>
                        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700"><X size={24} /></button>
                        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Complete Your Account</h2>
                        <p className="text-center text-gray-500 mb-6">Set your details to finish setup.</p>
                        <form onSubmit={handleSetCredentials}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="setup-email">Email</label>
                                <input type="email" id="setup-email" value={email} onChange={(e) => setEmail(e.target.value)} className="shadow-inner appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="you@example.com" required autoComplete="email" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="setup-password">Password</label>
                                <input type="password" id="setup-password" value={password} onChange={(e) => setPassword(e.target.value)} className="shadow-inner appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="•••••••••• (min. 6 characters)" required autoComplete="new-password" />
                            </div>
                            <div className="mb-6">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="setup-username">Username</label>
                                <input type="text" id="setup-username" value={username} onChange={(e) => setUsername(e.target.value)} className="shadow-inner appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Choose a username" required autoComplete="username" />
                            </div>

                            {/* --- REFERRAL INPUT --- */}
                            <div className="mb-6 pt-2 border-t border-gray-100">
                                <label className="block text-green-700 text-sm font-bold mb-2 mt-2">Have a Referral Code?</label>
                                <input 
                                    type="text" 
                                    value={referralInput} 
                                    onChange={(e) => setReferralInput(e.target.value.toUpperCase())} 
                                    className="shadow-inner appearance-none border-2 border-green-100 bg-green-50/50 rounded-xl w-full py-3 px-4 text-green-800 font-bold tracking-widest leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 placeholder:font-normal placeholder:text-gray-400" 
                                    placeholder="Enter code (Optional)" 
                                />
                                <p className="text-xs text-gray-500 mt-1">Get ₹50 off your first order if you use a friend's code!</p>
                            </div>

                            {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                            <button type="submit" disabled={isProcessing} className={`bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-full hover:shadow-lg hover:shadow-green-500/40 transition-all duration-300 w-full ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {isProcessing ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Save & Continue'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

// --- Privacy Policy Page ---
const PrivacyPolicyPage = () => {
// ... (rest of the component is unchanged - long code omitted for brevity)
    return (
        <div className="bg-white py-16 sm:py-24">
            <div className="container mx-auto px-6">
                <article className="prose lg:prose-lg max-w-4xl mx-auto">
                    <h1>Privacy Policy for Snaccit</h1>
                    <p><strong>Last Updated:</strong> [Date]</p>
                    <p>Snaccit ("us", "we", or "our") operates the Snaccit web application (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.</p>
                    <h2>1. Information Collection and Use</h2>
                    <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>
                    <h3>Types of Data Collected:</h3>
                    <ul>
                        <li><strong>Personal Data:</strong> While using our Service, we may ask you to provide us with certain personally identifiable information ("Personal Data"). This may include: Email address, Username, Phone number, Order history, and Usage Data.</li>
                        <li><strong>Usage Data:</strong> We collect information on how the Service is accessed and used (IP address, browser type/version, pages visited, time spent, device identifiers).</li>
                    </ul>
                    <h2>2. Use of Data</h2>
                    <p>Snaccit uses the collected data to: Provide and maintain the Service; Notify you about changes; Process orders and manage your account; Send order status notifications; Provide customer support; Improve the Service; Monitor usage; Detect and address technical issues.</p>
                    <h2>3. Data Sharing and Disclosure</h2>
                    <p>We do not sell your Personal Data. We share information only: With Restaurants (name, order, arrival time); With Service Providers (e.g., Firebase, PhonePe) to facilitate the Service, under obligation not to disclose or use it otherwise; For Legal Requirements if necessary.</p>
                    <h2>4. Data Security</h2>
                    <p>We use industry-standard methods (Firebase Auth/Firestore Security Rules) but cannot guarantee absolute security as no internet transmission is 100% secure.</p>
                    <h2>5. Your Data Rights</h2>
                    <p>You can access, update, or request deletion of your data via your profile or by contacting us.</p>
                    <h2>6. Children's Privacy</h2>
                    <p>Our Service is not intended for children under 13. We do not knowingly collect their data. Contact us if you believe your child has provided data.</p>
                    <h2>7. Changes to This Privacy Policy</h2>
                    <p>We may update this policy. Changes are effective when posted here. Review periodically.</p>
                    <h2>8. Contact Us</h2>
                    <p>If you have questions, contact us at: [Your Support Email Address]</p>
                </article>
            </div>
        </div>
    );
};

// --- Terms of Service Page ---
const TermsOfServicePage = () => {
// ... (rest of the component is unchanged - long code omitted for brevity)
    return (
        <div className="bg-white py-16 sm:py-24">
            <div className="container mx-auto px-6">
                <article className="prose lg:prose-lg max-w-4xl mx-auto">
                    <h1>Terms of Service for Snaccit</h1>
                    <p><strong>Last Updated:</strong> [Date]</p>
                    <p>Welcome to Snaccit! These Terms govern your use of our web application ("Service") operated by [Your Company Name] ("us", "we"). By using the Service, you agree to these Terms. Do not use the Service if you disagree.</p>
                    <h2>1. Accounts</h2>
                    <p>Provide accurate, current info. You are responsible for password security and account activity. Notify us of unauthorized use.</p>
                    <h2>2. The Service</h2>
                    <p>Snaccit connects users with Restaurants for pre-orders. Your order contract is directly with the Restaurant. We are not responsible for food preparation or quality; the Restaurant is. We transmit orders and payments.</p>
                    <h2>3. Orders and Payment</h2>
                    <p>You agree to pay the full price. Payments via PhonePe. We don't store full payment details. Accepted orders generally cannot be canceled. Refunds follow our policy and PhonePe's.</p>
                    <h2>4. User Conduct</h2>
                    <p>Do not use the Service to: Violate laws; Harm minors; Impersonate others; Restrict others' use.</p>
                    <h2>5. Intellectual Property</h2>
                    <p>The Service and its original content are owned by [Your Company Name] and protected by law.</p>
                    <h2>6. Termination</h2>
                    <p>We may terminate your account without notice if you breach these Terms.</p>
                    <h2>7. Limitation of Liability</h2>
                    <p>Snaccit is not liable for indirect, incidental, or consequential damages arising from your use of the Service, conduct of third parties (including Restaurants), or unauthorized access to your data.</p>
                    <h2>8. Governing Law</h2>
                    <p>Terms governed by laws of [Your Country/State].</p>
                    <h2>9. Changes</h2>
                    <p>We may modify Terms anytime. Changes posted here. Continued use means acceptance.</p>
                    <h2>10. Contact Us</h2>
                    <p>Questions? Contact us at: [Your Support Email Address]</p>
                </article>
            </div>
        </div>
    );
};

// --- [FINAL REVISED] HomePage Component ---
const HomePage = ({ allRestaurants, isLoading, onRestaurantClick, onGoToProfile }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('restaurant');
    const [activeFilter, setActiveFilter] = useState('all');
    const [showAllRestaurants, setShowAllRestaurants] = useState(false);

    // Filter Logic
    const filteredResults = useMemo(() => {
        let restaurantsToFilter = allRestaurants;
        if (activeFilter === 'topRated') restaurantsToFilter = restaurantsToFilter.filter(r => r.rating >= 4.5);
        if (activeFilter === 'veg') restaurantsToFilter = restaurantsToFilter.filter(r => r.isPureVeg === true);
        if (!searchTerm) return searchType === 'restaurant' ? restaurantsToFilter : [];
        
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        if (searchType === 'dish') {
            return restaurantsToFilter.flatMap(resto => 
                (resto.menu || []).map(item => ({ ...item, restaurantId: resto.id, restaurantName: resto.name, restaurantCuisine: resto.cuisine, restaurantImageUrl: resto.imageUrl }))
            ).filter(item => item.name.toLowerCase().includes(lowercasedSearchTerm));
        }
        return restaurantsToFilter.filter(resto => resto.name.toLowerCase().includes(lowercasedSearchTerm) || resto.cuisine.toLowerCase().includes(lowercasedSearchTerm));
    }, [searchTerm, searchType, allRestaurants, activeFilter]);

    const displayList = (searchTerm || searchType === 'dish' || showAllRestaurants) ? filteredResults : filteredResults.slice(0, 6); 

    const topDishes = [
          { name: "Butter Chicken", restaurant: "Curry Kingdom", imageUrl: butterChickenImg },
          { name: "Margherita Pizza", restaurant: "Pizza Palace", imageUrl: pizzaImg },
          { name: "Sushi Platter", restaurant: "Tokyo Bites", imageUrl: sushiImg },
          { name: "Vegan Burger", restaurant: "The Vurger Co.", imageUrl: burgerImg },
    ];

    const handleDishClick = (dish) => {
        const restaurant = allRestaurants.find(r => r.name === dish.restaurant);
        if (restaurant) onRestaurantClick(restaurant);
    };

    return (
        <>
            {/* 1. HERO SECTION */}
            <main className="relative h-[500px] flex items-center justify-center text-white overflow-hidden">
                <div className="absolute inset-0 bg-black/50 z-10"></div>
                <video className="absolute inset-0 w-full h-full object-cover" src={heroVideo} autoPlay loop muted playsInline />                  
                <div className="relative z-20 text-center px-6">
                    <AnimatedHeroText />
                    <p className="mt-4 max-w-xl mx-auto text-lg text-gray-200 drop-shadow-xl slide-in-2 font-medium">
                        Pre-order now. Arrive later. Eat instantly.
                    </p>
                    <div className="mt-8 slide-in-2">
                        <button onClick={() => {
                            document.getElementById('restaurants')?.scrollIntoView({ behavior: 'smooth' });
                        }} className="bg-white text-green-700 font-extrabold py-3 px-8 rounded-full hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 transition-all duration-300 shadow-lg text-lg">
                            Order Now
                        </button>
                    </div>
                </div>
            </main>

            {/* 2. RESTAURANTS SECTION */}
            <section id="restaurants" className="relative py-16 bg-gray-50/50">
                <div className="container relative mx-auto px-6 z-10">
                    <div className="text-center mb-10">
                        <h3 className="text-sm font-bold uppercase text-green-600 tracking-widest">Hungry?</h3>
                        <h2 className="mt-1 text-3xl font-extrabold text-gray-900">Explore Restaurants</h2>
                    </div>

                    {/* Search & Filters */}
                    <div className="max-w-4xl mx-auto mb-10">
                        <div className="relative mb-6 group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Search className="text-gray-400 group-focus-within:text-green-500 transition-colors" size={20} />
                            </div>
                            <input type="text" placeholder="Search restaurants..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full py-3 pl-12 pr-6 text-lg bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all"
                            />
                        </div>
                        <div className="flex flex-wrap justify-center gap-3">
                            <button onClick={() => setActiveFilter('all')} className={`px-5 py-2 rounded-xl font-bold text-sm border transition-all ${activeFilter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>All</button>
                            <button onClick={() => setActiveFilter('topRated')} className={`px-5 py-2 rounded-xl font-bold text-sm border transition-all flex items-center ${activeFilter === 'topRated' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'}`}><Award size={16} className="mr-2"/> Top Rated</button>
                            <button onClick={() => setActiveFilter('veg')} className={`px-5 py-2 rounded-xl font-bold text-sm border transition-all flex items-center ${activeFilter === 'veg' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}><Leaf size={16} className="mr-2"/> Pure Veg</button>
                        </div>
                    </div>

                    {/* Restaurant Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        {isLoading ? (
                            <div className="col-span-full text-center py-20"><Loader2 className="animate-spin mx-auto text-green-600" size={40} /></div>
                        ) : (
                            displayList.map((item) => (
                                <div key={item.id} onClick={() => onRestaurantClick(item)} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col group">
                                    <div className="relative h-44 overflow-hidden">
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        {item.rating >= 4.5 && <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-amber-600 text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm flex items-center"><Star size={10} className="mr-1 fill-current"/> Top Rated</div>}
                                    </div>
                                    <div className="p-5 flex flex-col flex-grow">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-lg font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                                            {item.rating && <div className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded flex items-center"><Star size={12} className="mr-1 fill-current"/>{item.rating.toFixed(1)}</div>}
                                        </div>
                                        <p className="text-gray-500 text-sm font-medium mb-3 line-clamp-1">{item.cuisine}</p>
                                        <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
                                            <span className="text-gray-900 font-bold text-sm">{item.price}</span>
                                            <span className="text-green-600 text-xs font-bold group-hover:translate-x-1 transition-transform inline-flex items-center">View Menu <ArrowLeft className="rotate-180 ml-1" size={14}/></span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {!isLoading && !searchTerm && !showAllRestaurants && filteredResults.length > 6 && (
                        <div className="mt-10 text-center">
                             <button onClick={() => setShowAllRestaurants(true)} className="group bg-white border-2 border-green-600 text-green-600 font-bold py-2 px-8 rounded-full hover:bg-green-600 hover:text-white transition-all duration-300 inline-flex items-center gap-2 shadow-sm">
                                Show All Restaurants <ChevronDown size={18} className="group-hover:translate-y-1 transition-transform" />
                             </button>
                        </div>
                    )}
                </div>
            </section>
            
            {/* 3. TOP DISHES SECTION */}
            <section id="top-dishes" className="relative py-20 bg-white">
                <div className="container relative mx-auto px-6 z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                        <div>
                            <h3 className="text-sm font-bold uppercase text-orange-500 tracking-widest drop-shadow-sm">Visual Delight</h3>
                            <h2 className="mt-1 text-3xl font-extrabold text-gray-900">Fan Favorites</h2>
                        </div>
                        <p className="text-gray-500 font-medium pb-2">Top picked dishes this week</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {topDishes.map((dish, index) => (
                            <div key={index} onClick={() => handleDishClick(dish)} className="relative rounded-3xl overflow-hidden group cursor-pointer shadow-lg transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl h-72">
                                <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                                <div className="absolute bottom-0 left-0 p-5 text-white w-full">
                                    <h4 className="text-xl font-bold leading-tight mb-1">{dish.name}</h4>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs font-medium text-gray-300">{dish.restaurant}</p>
                                        <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-full"><PlusCircle size={18} className="text-white"/></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4. REFER & WIN SECTION (REDESIGNED: GOLDEN & SIMPLE) */}
            <section className="relative py-24 overflow-hidden bg-gray-900">
                {/* Subtle Background Pattern */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")` }}></div>
                
                {/* Golden Glow Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[120px]"></div>

                <div className="container relative mx-auto px-6 z-10 flex flex-col md:flex-row items-center justify-between gap-16">
                    
                    {/* Text Side */}
                    <div className="text-center md:text-left md:w-1/2">
                        <div className="inline-flex items-center gap-2 bg-yellow-500/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-yellow-500/30 mb-6 animate-fade-in-down">
                            <Gift size={16} className="text-yellow-400" />
                            <span className="text-sm font-bold tracking-wide uppercase text-yellow-100">Snaccit Rewards</span>
                        </div>
                        
                        <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight text-white">
                            Refer Friends.<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500">Collect Points.</span>
                        </h2>
                        
                        <p className="text-lg text-gray-300 mb-10 leading-relaxed max-w-lg mx-auto md:mx-0">
                            Grab your unique code from your Profile. Share it with your squad.
                            When they sign up and order, <span className="text-white font-bold">you BOTH get 50 Snaccit Points instantly!</span>
                        </p>

                        <button 
                            onClick={onGoToProfile}
                            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-extrabold py-4 px-10 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:shadow-[0_0_40px_rgba(234,179,8,0.5)] hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 mx-auto md:mx-0 text-lg"
                        >
                            Get My Referral Code <ArrowLeft className="rotate-180" size={20} />
                        </button>
                    </div>
                    
                    {/* Visual Card Side */}
                    <div className="md:w-1/2 flex justify-center perspective-1000">
                        <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-[2.5rem] shadow-2xl border border-gray-700/50 rotate-3 hover:rotate-0 transition-transform duration-500 max-w-sm w-full">
                             {/* Floating Badge */}
                             <div className="absolute -top-6 -right-6 bg-yellow-500 text-yellow-900 font-black px-6 py-3 rounded-2xl shadow-lg rotate-[10deg] animate-bounce border-4 border-gray-900">
                                 +50 POINTS
                             </div>

                             {/* Step 1 */}
                             <div className="flex items-start gap-5 mb-8">
                                <div className="bg-gray-700 p-4 rounded-2xl shadow-inner">
                                    <User className="text-yellow-400" size={28}/>
                                </div>
                                <div>
                                    <p className="text-white font-bold text-xl mb-1">Share Code</p>
                                    <p className="text-sm text-gray-400">Find it in your profile.</p>
                                </div>
                             </div>

                             {/* Connector Line */}
                             <div className="ml-9 h-8 border-l-2 border-dashed border-gray-600 -my-4"></div>

                             {/* Step 2 */}
                             <div className="flex items-start gap-5 mt-8">
                                <div className="bg-yellow-500/20 p-4 rounded-2xl border border-yellow-500/30">
                                    <Award className="text-yellow-400" size={28}/>
                                </div>
                                <div>
                                    <p className="text-white font-bold text-xl mb-1">Earn Points</p>
                                    <p className="text-sm text-gray-400">Redeem for discounts anytime.</p>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. FEATURES SECTION */}
            <section id="features" className="relative py-24 bg-gradient-to-b from-amber-50 to-white overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-orange-200/40 rounded-full blur-3xl mix-blend-multiply pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-yellow-200/40 rounded-full blur-3xl mix-blend-multiply pointer-events-none"></div>

                <div className="container relative mx-auto px-6 z-10">
                    <div className="text-center mb-16">
                        <h3 className="text-sm font-bold uppercase text-orange-600 tracking-widest">Simple & Fast</h3>
                        <h2 className="mt-2 text-3xl md:text-4xl font-extrabold text-gray-900">How Snaccit Works</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                        {[{ icon: <Smartphone className="w-10 h-10 text-white" />, title: "1. Pre-order", description: "Explore menus and add items to your cart before you leave.", color: "from-blue-400 to-blue-600" }, 
                          { icon: <Clock className="w-10 h-10 text-white" />, title: "2. Set Time", description: "Select your arrival time so we know when to cook.", color: "from-orange-400 to-orange-600" }, 
                          { icon: <Utensils className="w-10 h-10 text-white" />, title: "3. Eat Instantly", description: "Walk in, sit down, and your food is served immediately.", color: "from-green-400 to-green-600" }
                        ].map((step, i) => (
                            <div key={i} className="group relative bg-white p-8 rounded-[2.5rem] shadow-xl border border-white/50 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                                <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${step.color} rounded-2xl shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300 rotate-[-5deg] group-hover:rotate-0`}>
                                    {step.icon}
                                </div>
                                <h4 className="text-2xl font-bold mb-3 text-gray-900">{step.title}</h4>
                                <p className="text-gray-600 leading-relaxed font-medium">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
};

// --- Star Rating Display Component ---
const StarRating = ({ rating }) => {
    const stars = [];
    const roundedRating = Math.round(rating * 2) / 2;
    for (let i = 1; i <= 5; i++) {
        let starClass = 'text-gray-300';
        if (i <= roundedRating) {
            starClass = 'text-amber-400 fill-current';
        }
        stars.push(<Star key={i} size={20} className={starClass} />);
    }
    return <div className="flex">{stars}</div>;
};

// --- MenuPage Component ---
const MenuPage = ({ restaurant, onBackClick, onSelectItem }) => {
// ... (rest of the component is unchanged - long code omitted for brevity)
    const [menuItems, setMenuItems] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!restaurant) return;
        setIsLoading(true);
        let unsubMenu = () => {};
        let unsubReviews = () => {};

        try {
            const menuCollectionRef = db.collection("restaurants").doc(restaurant.id).collection("menu");
            unsubMenu = menuCollectionRef.onSnapshot((snapshot) => {
                const allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const availableItems = allItems.filter(item => item.isAvailable !== false);
                
                setMenuItems(availableItems);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching menu snapshot: ", error);
                setIsLoading(false);
            });

            const reviewsQuery = db.collection("reviews").where("restaurantId", "==", restaurant.id).orderBy("createdAt", "desc").limit(10);
            unsubReviews = reviewsQuery.onSnapshot((snapshot) => {
                setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (error) => {
                 console.error("Error fetching reviews snapshot: ", error);
            });
        } catch (error) {
             console.error("Error setting up listeners:", error);
             setIsLoading(false);
        }

        return () => {
             console.log("Cleaning up MenuPage listeners for", restaurant.id);
            unsubMenu();
            unsubReviews();
        };
    }, [restaurant]);

     if (!restaurant) {
         return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-green-600" size={48} /></div>;
     }

    return (
        <div className="container mx-auto px-6 py-12 min-h-screen">
            <button onClick={onBackClick} className="flex items-center text-gray-600 hover:text-green-600 font-semibold mb-8"><ArrowLeft className="mr-2" size={20} />Back to all restaurants</button>
            <div className="flex flex-col md:flex-row items-center mb-12">
                <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full md:w-48 h-48 rounded-3xl object-cover shadow-lg"/>
                <div className="md:ml-8 mt-6 md:mt-0 text-center md:text-left">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800">{restaurant.name}</h1>
                    <p className="text-lg sm:text-xl text-gray-500 mt-2">{restaurant.cuisine}</p>
                    <div className="mt-4 flex flex-col sm:flex-row justify-center md:justify-start items-center space-y-2 sm:space-y-0 sm:space-x-3">
                        <span className="text-amber-500 font-bold flex items-center text-lg"><Star size={20} className="mr-1 fill-current"/>{restaurant.rating ? restaurant.rating.toFixed(1) : 'New'} ({restaurant.reviewCount || 0} reviews)</span>
                        <span className="text-gray-400 hidden sm:inline">|</span>
                        <span className="text-gray-800 font-semibold text-lg">{restaurant.price}</span>
                    </div>
                </div>
            </div>
            <div className="max-w-4xl mx-auto">
                <div className="mb-12">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Reviews</h2>
                    {reviews.length > 0 ? (
                        <div className="space-y-4">
                            {reviews.map(review => (
                                <div key={review.id} className="bg-white p-4 rounded-lg shadow-sm border">
                                    <div className="flex justify-between items-center mb-1">
                                        <StarRating rating={review.rating} />
                                        <span className="text-xs text-gray-400">{review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Date unavailable'}</span>
                                    </div>
                                     {review.text && <p className="text-gray-600 mt-2 text-sm">{review.text}</p> }
                                    <p className="text-xs text-gray-500 mt-2 font-semibold">- {review.userEmail ? review.userEmail.split('@')[0] : 'Anonymous'}</p>
                                </div>
                            ))}
                        </div>
                    ) : (<p className="text-gray-500 italic">No reviews yet.</p>)}
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Menu</h2>
                {isLoading ? (<div className="flex justify-center"><Loader2 className="animate-spin text-green-600" size={32} /></div>) : menuItems.length > 0 ? (
                    <div className="space-y-4">
                        {menuItems.map((item) => (
                            <div key={item.id} className="bg-white rounded-2xl shadow-md p-4 flex items-center justify-between transition-shadow hover:shadow-lg">
                                <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
                                     {item.description && <p className="text-gray-600 text-sm mt-1">{item.description}</p>}
                                    <span className="font-semibold text-md text-gray-800 mt-2 block">
                                         {item.sizes && item.sizes.length > 0 ? `₹${item.sizes[0].price}${item.sizes.length > 1 ? '+' : ''}` : 'Price unavailable'}
                                    </span>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                    <div className="relative w-24 h-24">
                                        <img src={item.imageUrl || 'https://placehold.co/100x100/cccccc/ffffff?text=Food'} alt={item.name} className="w-full h-full rounded-lg object-cover"/>
                                         {item.sizes && item.sizes.length > 0 && (
                                            <button onClick={() => onSelectItem(item)} className="absolute -bottom-2 -right-2 bg-white text-green-700 p-1 rounded-full shadow-md hover:bg-green-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1">
                                                <PlusCircle size={28}/>
                                            </button>
                                         )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (<p className="text-gray-500 italic">Menu not available for this restaurant.</p>)}
            </div>
        </div>
    );
};

// --- Item Customization Modal ---
const ItemCustomizationModal = ({ isOpen, onClose, item, onConfirmAddToCart }) => {
// ... (rest of the component is unchanged - long code omitted for brevity)
    if (!isOpen || !item) return null;
    const initialSize = item.sizes && item.sizes.length > 0 ? item.sizes[0] : null;
    const [selectedSize, setSelectedSize] = useState(initialSize);
    const [selectedAddons, setSelectedAddons] = useState([]);

    useEffect(() => {
        if (item) {
            const firstSize = item.sizes && item.sizes.length > 0 ? item.sizes[0] : null;
            setSelectedSize(firstSize);
            setSelectedAddons([]);
        }
    }, [item]);

    const handleAddonToggle = (addon) => {
        setSelectedAddons(prev =>
            prev.find(a => a.name === addon.name)
                ? prev.filter(a => a.name !== addon.name)
                : [...prev, addon]
        );
    };

    const totalPrice = useMemo(() => {
        if (!selectedSize) return 0;
        const addonsPrice = selectedAddons.reduce((total, addon) => total + addon.price, 0);
        return selectedSize.price + addonsPrice;
    }, [selectedSize, selectedAddons]);

    const handleAddToCartClick = () => {
        if (!selectedSize) { alert("Please select a size."); return; }
        const cartItem = {
            ...item,
             cartItemId: `${item.id}-${selectedSize.name}-${selectedAddons.map(a => a.name).sort().join('-')}`,
            selectedSize: selectedSize,
            selectedAddons: selectedAddons,
            finalPrice: totalPrice,
        };
        onConfirmAddToCart(cartItem);
    };

    if (!item || !initialSize) {
         console.warn("ItemCustomizationModal: Invalid item or no sizes available.", item);
         return null;
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="p-6 border-b relative">
                    <h2 className="text-xl font-bold">{item.name}</h2>
                    {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    {item.sizes && item.sizes.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-lg mb-3">Choose Size</h3>
                            <div className="space-y-2">
                                {item.sizes.map(size => (
                                    <label key={size.name} className={`flex justify-between items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedSize?.name === size.name ? 'border-green-500 bg-green-50 shadow-inner' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <div>
                                            <span className="font-medium">{size.name}</span>
                                            <span className="text-sm text-gray-500 ml-2">(₹{size.price})</span>
                                        </div>
                                        <input type="radio" name="size" checked={selectedSize?.name === size.name} onChange={() => setSelectedSize(size)} className="form-radio h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300"/>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                     {item.addons && item.addons.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-lg mb-3">Add-ons</h3>
                            <div className="space-y-2">
                                {item.addons.map(addon => (
                                    <label key={addon.name} className={`flex justify-between items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedAddons.find(a => a.name === addon.name) ? 'border-green-500 bg-green-50 shadow-inner' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <div>
                                            <span className="font-medium">{addon.name}</span>
                                            <span className="text-sm text-gray-500 ml-2">+ ₹{addon.price}</span>
                                        </div>
                                        <input type="checkbox" checked={!!selectedAddons.find(a => a.name === addon.name)} onChange={() => handleAddonToggle(addon)} className="form-checkbox h-5 w-5 text-green-600 rounded border-gray-300 focus:ring-green-500" />
                                    </label>
                                ))}
                            </div>
                        </div>
                     )}
                </div>
                <div className="p-4 mt-auto border-t bg-gray-50">
                    <button onClick={handleAddToCartClick} disabled={!selectedSize}
                        className={`w-full bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-3 rounded-full hover:shadow-lg flex justify-between items-center px-6 text-lg transition-opacity ${!selectedSize ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <span>Add to Cart</span>
                        <span>₹{totalPrice.toFixed(2)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Cart Sidebar Component ---
const CartSidebar = ({ isOpen, onClose, cart, onUpdateQuantity, onCheckout }) => {
// ... (rest of the component is unchanged - long code omitted for brevity)
    const subtotal = useMemo(() => cart.reduce((total, item) => total + item.finalPrice * item.quantity, 0), [cart]);

    return (
        <>
            <div className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800">Your Order</h2><button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={24} /></button></div>
                    <div className="flex-grow p-4 sm:p-6 overflow-y-auto">
                        {cart.length === 0 ? (<p className="text-gray-500 text-center mt-8 italic">Your cart is empty.</p>) : (
                            <div className="space-y-4">
                                {cart.map(item => (
                                    <div key={item.cartItemId} className="flex items-start border-b pb-3 last:border-b-0">
                                        <div className="flex-grow pr-2">
                                            <p className="font-semibold text-sm">{item.name} <span className="text-xs font-normal text-gray-500">({item.selectedSize.name})</span></p>
                                            {item.selectedAddons && item.selectedAddons.length > 0 && item.selectedAddons.map(addon => (
                                                <p key={addon.name} className="text-xs text-gray-500 pl-2">+ {addon.name}</p>
                                            ))}
                                            <p className="text-sm text-gray-700 font-bold mt-1">₹{item.finalPrice.toFixed(2)}</p>
                                        </div>
                                        <div className="flex items-center flex-shrink-0">
                                            <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)} className="text-gray-500 hover:text-red-600 p-1 rounded-full"><MinusCircle size={20}/></button>
                                            <span className="w-8 text-center font-semibold text-sm mx-1">{item.quantity}</span>
                                            <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)} className="text-gray-500 hover:text-green-600 p-1 rounded-full"><PlusCircle size={20}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {cart.length > 0 && (
                        <div className="p-4 sm:p-6 border-t bg-gray-50">
                            <div className="flex justify-between items-center mb-4"><span className="text-md font-semibold text-gray-800">Subtotal</span><span className="text-lg font-bold text-gray-900">₹{subtotal.toFixed(2)}</span></div>
                            <button onClick={onCheckout} className="w-full bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-3 rounded-full hover:shadow-lg hover:shadow-green-500/40 transition-all duration-300 text-md">
                                Choose Arrival Time
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

// --- Time Slot Picker Component ---
const TimeSlotPicker = ({ selectedTime, onTimeSelect, restaurant }) => {
    const generateTimeSlots = (openingTimeStr, closingTimeStr) => {
        if (!openingTimeStr || !closingTimeStr) return [];

        const slots = [];
        const now = new Date();
        const intervalMinutes = 15;
        // Minimum time to prepare first specific slot (e.g., 15 mins from now)
        const minimumLeadTimeMinutes = 15;

        // Parse opening and closing times into today's date objects
        const [openHours, openMinutes] = openingTimeStr.split(':').map(Number);
        const openingTime = new Date();
        openingTime.setHours(openHours, openMinutes, 0, 0);

        const [closeHours, closeMinutes] = closingTimeStr.split(':').map(Number);
        const closingTime = new Date();
        closingTime.setHours(closeHours, closeMinutes, 0, 0);

        // If it's already past closing time today, show nothing.
        if (now >= closingTime) {
             return [];
        }

        // --- 1. ALWAYS Add the distinct "ASAP" option first ---
        // This sends the literal string 'ASAP' as the arrival time value.
        slots.push({ display: 'ASAP', value: 'ASAP' });


        // --- 2. Generate specific future time slots ---
        // Calculate start time for numerical slots: Now + lead time...
        let startTime = new Date(now.getTime() + minimumLeadTimeMinutes * 60000);

        // ...rounded up to the next 15-minute interval mark.
        const minutes = startTime.getMinutes();
        const remainder = minutes % intervalMinutes;
        if (remainder !== 0) {
            // Add minutes to reach the next interval mark, reset seconds
            startTime.setMinutes(minutes + (intervalMinutes - remainder), 0, 0);
        } else {
            // Already on an interval mark, just clean up seconds
            startTime.setSeconds(0, 0);
        }

        // Ensure the first numerical slot doesn't start *before* opening time.
        // If calculated start time is too early, bump it to opening time.
        if (startTime < openingTime) {
            startTime = openingTime;
        }

        // Loop to generate numerical slots until closing time
        while (startTime < closingTime) {
            const displayFormat = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            // Add the numerical slot
            slots.push({ display: displayFormat, value: displayFormat });
            // Move to next interval
            startTime.setMinutes(startTime.getMinutes() + intervalMinutes);
        }

        return slots;
    };

    const timeSlots = useMemo(() => generateTimeSlots(restaurant?.openingTime, restaurant?.closingTime), [restaurant]);

    if (!restaurant?.openingTime || !restaurant?.closingTime) {
        return <div className="text-center p-4 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200"><p className="font-semibold">Restaurant hours not set.</p><p className="text-sm">Pre-orders unavailable.</p></div>;
    }

    if (timeSlots.length === 0) {
        return <div className="text-center p-4 bg-red-50 text-red-700 rounded-lg border border-red-200"><p className="font-semibold">Sorry, restaurant is closed for pre-orders now.</p><p className="text-sm">Hours: {restaurant.openingTime} - {restaurant.closingTime}</p></div>;
    }

    return (
        <div>
            <label className="block text-gray-700 text-sm font-bold mb-3 flex items-center"><Clock className="inline mr-2" size={16} />Estimated Arrival Time</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                {timeSlots.map((slot, index) => {
                    // Special styling for the ASAP button (the first one)
                    const isASAP = index === 0 && slot.display === 'ASAP';
                    const isSelected = selectedTime === slot.value;

                    let buttonClasses = `p-2 sm:p-3 text-sm sm:text-base rounded-lg font-semibold text-center transition-all duration-200 border-2 focus:outline-none focus:ring-1 focus:ring-green-500 `;

                    if (isSelected) {
                        buttonClasses += `bg-green-600 text-white border-green-600 shadow-md ring-2 ring-green-300 ring-offset-1 `;
                    } else if (isASAP) {
                        // Distinct style for unselected ASAP button
                        buttonClasses += `bg-green-50 text-green-800 border-green-300 hover:border-green-500 hover:bg-green-100 `;
                    } else {
                        buttonClasses += `bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:text-green-700 `;
                    }

                    return (
                        <button
                            type="button"
                            key={slot.value} // Use the time value as the key
                            onClick={() => onTimeSelect(slot.value)}
                            className={buttonClasses}
                        >
                            {slot.display}
                        </button>
                    );
                })}
            </div>
            {/* Helper text to show the actual time for ASAP */}
            {selectedTime && timeSlots[0]?.display === 'ASAP' && selectedTime === timeSlots[0].value && (
                 <p className="text-xs text-green-600 mt-2 ml-1">
                    Goal arrival time: <strong>{selectedTime}</strong>
                </p>
            )}
        </div>
    );
};

// --- Checkout Modal Component (With Points Redemption) ---
const CheckoutModal = ({ isOpen, onClose, onPlaceOrder, cart, restaurant }) => {
    const [arrivalTime, setArrivalTime] = useState('');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    
    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [discount, setDiscount] = useState(0); // Coupon discount amount
    const [couponError, setCouponError] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [isValidating, setIsValidating] = useState(false);

    // Points State (NEW)
    const [usePoints, setUsePoints] = useState(false);
    const [userPoints, setUserPoints] = useState(0);

    // Calculate Subtotal
    const subtotal = useMemo(() => cart.reduce((total, item) => total + item.finalPrice * item.quantity, 0), [cart]);

    // Calculate Points Value (10 Points = 1 Rupee)
    // Logic: If toggle ON, discount is points/10, but cannot exceed the remaining subtotal
    const pointsDiscountValue = useMemo(() => {
        if (!usePoints || userPoints <= 0) return 0;
        const potentialDiscount = Math.floor(userPoints / 10);
        // Ensure we don't discount more than the subtotal (after coupon)
        const remainingToPay = Math.max(0, subtotal - discount); 
        return Math.min(potentialDiscount, remainingToPay);
    }, [usePoints, userPoints, subtotal, discount]);

    // Final Total Calculation
    const grandTotal = Math.max(0, subtotal - discount - pointsDiscountValue);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setArrivalTime(''); 
            setCouponCode(''); 
            setDiscount(0);
            setCouponError(''); 
            setAppliedCoupon(null);
            setUsePoints(false);
            setIsPlacingOrder(false);

            // Fetch User Points
            if (auth.currentUser) {
                db.collection("users").doc(auth.currentUser.uid).get().then(doc => {
                    if(doc.exists) {
                        setUserPoints(doc.data().points || 0);
                    }
                }).catch(err => console.error("Error fetching points:", err));
            }
        }
    }, [isOpen]);

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setIsValidating(true);
        setCouponError('');
        setDiscount(0);
        setAppliedCoupon(null);
        try {
            const code = couponCode.toUpperCase();
            const couponRef = db.collection("coupons").doc(code);
            const couponSnap = await couponRef.get();
            
            if (!couponSnap.exists) {
                setCouponError("Invalid coupon code.");
                return;
            }
            const coupon = couponSnap.data();
            const now = new Date();
            
            // --- VALIDATION LOGIC ---
            if (!coupon.isActive) { 
                setCouponError("This coupon is no longer active."); 
            }
            else if (coupon.isUsed) { 
                 setCouponError("This coupon has already been used."); 
            }
            else if (coupon.assignedTo && coupon.assignedTo !== auth.currentUser?.uid) {
                setCouponError("This coupon is not valid for your account.");
            }
            else if (coupon.expiryDate && now > coupon.expiryDate.toDate()) { 
                setCouponError("This coupon has expired."); 
            }
            else if (subtotal < coupon.minOrderValue) { 
                setCouponError(`A minimum order of ₹${coupon.minOrderValue} is required.`); 
            }
            else {
                // Apply Discount
                let calculatedDiscount = 0;
                if (coupon.type === 'fixed') { calculatedDiscount = coupon.value; }
                else if (coupon.type === 'percentage') { calculatedDiscount = (subtotal * coupon.value) / 100; }
                
                // If points are already active, re-check logic? 
                // For simplicity, coupon applies first, then points cover the rest.
                setDiscount(Math.min(calculatedDiscount, subtotal));
                setAppliedCoupon({ code, ...coupon });
            }
        } catch (error) {
            console.error("Error validating coupon:", error);
            setCouponError("Could not validate coupon. Please try again.");
        } finally {
            setIsValidating(false);
        }
    };

    const handleConfirm = async () => {
        if (!arrivalTime) { alert("Please select an arrival time."); return; }
        setIsPlacingOrder(true);
        // PASS 'usePoints' TO THE PARENT FUNCTION HERE
        await onPlaceOrder(arrivalTime, subtotal, discount, appliedCoupon?.code, usePoints);
        setIsPlacingOrder(false); 
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg m-4 relative flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 z-10"><X size={24} /></button>
                <div className="p-6 sm:p-8 border-b">
                    <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Confirm Your Pre-order</h2>
                    <p className="text-center text-gray-500 text-sm">Ordering from <span className="font-semibold">{restaurant?.name || 'Restaurant'}</span>.</p>
                </div>
                
                <div className="px-6 sm:px-8 py-6 overflow-y-auto">
                    <TimeSlotPicker selectedTime={arrivalTime} onTimeSelect={setArrivalTime} restaurant={restaurant} />
                </div>

                <div className="mt-auto border-t p-4 sm:p-6 bg-gray-50 rounded-b-3xl">
                    {/* Coupon Input */}
                    <div className="flex gap-2 mb-4">
                        <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter Coupon Code" className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-green-500 focus:border-green-500" disabled={!!appliedCoupon} />
                        <button type="button" onClick={handleApplyCoupon} disabled={isValidating || !!appliedCoupon || !couponCode.trim()} className="bg-gray-200 text-gray-700 font-semibold px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm flex-shrink-0">
                            {isValidating ? <Loader2 className="animate-spin h-5 w-5" /> : appliedCoupon ? 'Applied' : 'Apply'}
                        </button>
                    </div>
                    {couponError && <p className="text-red-500 text-xs italic mb-4 -mt-2">{couponError}</p>}
                    {appliedCoupon && !couponError && <p className="text-green-600 text-xs italic mb-4 -mt-2">Coupon "{appliedCoupon.code}" applied!</p>}

                    {/* NEW: Points Redemption Toggle */}
                    {userPoints > 0 && (
                        <div className="flex items-center justify-between bg-amber-50 p-3 rounded-lg border border-amber-200 mb-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 p-2 rounded-full text-amber-600"><Award size={20}/></div>
                                <div>
                                    <p className="font-bold text-amber-900 text-sm">Redeem Points</p>
                                    <p className="text-xs text-amber-700 font-medium">Available: {userPoints} (Save ₹{Math.floor(userPoints/10)})</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                    )}

                    {/* Totals Breakdown */}
                    <div className="space-y-1 mb-4 text-sm">
                        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                        
                        {discount > 0 && (
                            <div className="flex justify-between text-green-600 font-semibold">
                                <span>Coupon Discount</span>
                                <span>- ₹{discount.toFixed(2)}</span>
                            </div>
                        )}
                        
                        {usePoints && pointsDiscountValue > 0 && (
                            <div className="flex justify-between text-amber-600 font-semibold">
                                <span>Points Redeemed ({pointsDiscountValue * 10} pts)</span>
                                <span>- ₹{pointsDiscountValue.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2 text-gray-900">
                            <span>Grand Total</span>
                            <span>₹{grandTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <button onClick={handleConfirm} disabled={isPlacingOrder || !arrivalTime} className={`w-full bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-3 rounded-full hover:shadow-lg transition-all disabled:opacity-50 flex justify-center items-center px-6 ${!arrivalTime ? 'cursor-not-allowed' : ''}`}>
                         {isPlacingOrder ? <Loader2 className="animate-spin" size={24} /> : (
                             <span className="flex justify-between w-full items-center">
                                 <span>{grandTotal === 0 ? 'Confirm (Paid by Points)' : 'Proceed to Payment'}</span>
                                 <span>₹{grandTotal.toFixed(2)}</span>
                             </span>
                         )}
                    </button>
                    {!arrivalTime && <p className="text-xs text-center text-red-500 mt-2">Please select an arrival time.</p>}
                </div>
            </div>
        </div>
    );
};

// --- Order Confirmation Component ---
const OrderConfirmation = ({ onGoHome }) => (
// ... (rest of the component is unchanged)
    <div className="container mx-auto px-6 py-20 text-center flex flex-col items-center justify-center min-h-[60vh]">
        <PartyPopper size={64} className="text-green-500 mb-6" />
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Order Placed Successfully!</h1>
        <p className="text-lg text-gray-600 mt-4 max-w-md">The restaurant has been notified. Your food will be ready when you arrive.</p>
        <button onClick={onGoHome} className="mt-8 bg-green-600 text-white font-bold py-3 px-8 rounded-full hover:bg-green-700 transition-colors">Browse More Restaurants</button>
    </div>
);

// --- [FIXED] Payment Status Page Component ---
const PaymentStatusPage = ({ onGoHome }) => {
    const [orderStatus, setOrderStatus] = useState('awaiting_payment');
    const [orderId, setOrderId] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const currentOrderId = params.get('orderId');
        setOrderId(currentOrderId);

        if (!currentOrderId) {
            setOrderStatus('error');
            return;
        }

        const orderRef = db.collection('orders').doc(currentOrderId);
        
        // 1. Real-time listener for status updates
        const unsubscribe = orderRef.onSnapshot((docSnapshot) => {
            if (docSnapshot.exists) {
                const newStatus = docSnapshot.data().status;
                setOrderStatus(newStatus);
            } else {
                setOrderStatus('error');
            }
        });

        // 2. Timer for "Taking longer than usual" message (30s)
        // We store this ID so we can clear it if success happens early
        const delayTimer = setTimeout(() => {
            setOrderStatus((currentStatus) => {
                // Only switch to 'delayed' if we are STILL waiting
                if (currentStatus === 'awaiting_payment') {
                    return 'delayed';
                }
                return currentStatus;
            });
        }, 30000);

        return () => {
            unsubscribe();
            clearTimeout(delayTimer);
        };
    }, []);

    // 3. NEW: Auto-redirect effect when Payment is Successful
    useEffect(() => {
        if (orderStatus === 'pending') {
            // If payment is successful ('pending'), wait 5 seconds then go home automatically
            const successRedirectTimer = setTimeout(() => {
                onGoHome();
            }, 5000); // 5 seconds delay so they can read "Success" message
            return () => clearTimeout(successRedirectTimer);
        }
    }, [orderStatus, onGoHome]);


    const renderContent = () => {
        switch (orderStatus) {
            case 'awaiting_payment': return <><Loader2 size={64} className="text-blue-500 mb-6 animate-spin" /><h1 className="text-4xl font-bold text-gray-800">Processing Payment...</h1><p className="text-lg text-gray-600 mt-4">Please wait, we are confirming your payment.</p></>;
            case 'pending': return <><PartyPopper size={64} className="text-green-500 mb-6 animate-bounce" /><h1 className="text-4xl font-bold text-gray-800">Order Placed Successfully!</h1><p className="text-lg text-gray-600 mt-4">Redirecting you to home in a moment...</p></>;
            case 'payment_failed': return <><Frown size={64} className="text-red-500 mb-6" /><h1 className="text-4xl font-bold text-gray-800">Payment Failed</h1><p className="text-lg text-gray-600 mt-4">There was an issue with your payment. Please try again.</p></>;
            case 'delayed': return <><Clock size={64} className="text-amber-500 mb-6" /><h1 className="text-4xl font-bold text-gray-800">Payment is Processing</h1><p className="text-lg text-gray-600 mt-4 max-w-2xl">Your payment is taking longer than usual. You can safely close this window; we will update your order status in your profile once confirmed.</p></>;
            default: return <><Info size={64} className="text-yellow-500 mb-6" /><h1 className="text-4xl font-bold text-gray-800">Something Went Wrong</h1><p className="text-lg text-gray-600 mt-4">We couldn't find your order details.</p></>;
        }
    };

    return (
        <div className="container mx-auto px-6 py-20 text-center flex flex-col items-center justify-center min-h-[60vh]">
            {renderContent()}
            <button onClick={onGoHome} className="mt-8 bg-green-600 text-white font-bold py-3 px-8 rounded-full hover:bg-green-700 transition-colors">
                {orderStatus === 'pending' ? 'Return Home Now' : 'Go Back Home'}
            </button>
        </div>
    );
};

// --- [FINAL POLISHED] Profile Page Component ---
const ProfilePage = ({ currentUser, showNotification, onReorder, onRateOrder }) => {
    const [orders, setOrders] = useState([]);
    const [profile, setProfile] = useState({ username: '', mobile: '', myReferralCode: '', points: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ username: '', mobile: '' });

    useEffect(() => {
        if (!currentUser) return;
        setIsLoading(true);

        const userDocRef = db.collection("users").doc(currentUser.uid);
        const unsubProfile = userDocRef.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                setProfile(data);
                setFormData(data);
            }
        });

        const ordersQuery = db.collection("orders").where("userId", "==", currentUser.uid).orderBy("createdAt", "desc").limit(20);
        const unsubOrders = ordersQuery.onSnapshot((snapshot) => {
            const userOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));
            setOrders(userOrders);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching user orders:", error);
            showNotification("Could not load order history.", "error");
            setIsLoading(false);
        });

        return () => { unsubProfile(); unsubOrders(); };
    }, [currentUser]);

    const handleProfileChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSaveProfile = async () => {
          if (!formData.username || !formData.mobile) {
              showNotification("Username and mobile number cannot be empty.", "error");
              return;
          }
        const userDocRef = db.collection("users").doc(currentUser.uid);
        try {
            await userDocRef.set(formData, { merge: true });
            showNotification("Profile updated successfully!", "success");
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile: ", error);
            showNotification("Failed to update profile.", "error");
        }
    };

    const handleCancelEdit = () => {
        setFormData(profile);
        setIsEditing(false);
    };

    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        showNotification("Code copied to clipboard!", "success");
    };

    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-800', accepted: 'bg-blue-100 text-blue-800',
        preparing: 'bg-indigo-100 text-indigo-800', ready: 'bg-green-100 text-green-800',
        completed: 'bg-gray-100 text-gray-800', declined: 'bg-red-100 text-red-800',
        payment_failed: 'bg-red-100 text-red-800',
    };

    return (
        <div className="container mx-auto px-6 py-12 min-h-screen">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-8">My Profile</h1>
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/3 space-y-8">
                    
                    {/* 1. Personal Details Card */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Personal Details</h2>
                            {!isEditing && <button onClick={() => setIsEditing(true)} className="text-sm font-bold text-green-600 hover:text-green-700 bg-green-50 px-3 py-1 rounded-full">Edit</button>}
                        </div>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>
                                <p className="text-gray-700 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">{currentUser?.email || 'Not set'}</p>
                            </div>
                             <div>
                                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</label>
                                 <p className="text-gray-700 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">{currentUser?.phoneNumber || profile.mobile || 'Not set'}</p>
                             </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Username</label>
                                {isEditing ? <input type="text" name="username" value={formData.username || ''} onChange={handleProfileChange} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-green-500 outline-none font-medium"/> : <p className="text-gray-900 font-bold text-lg pl-1">{profile.username || 'Not set'}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Mobile (Alternate)</label>
                                {isEditing ? <input type="tel" name="mobile" value={formData.mobile || ''} onChange={handleProfileChange} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-green-500 outline-none font-medium"/> : <p className="text-gray-900 font-medium pl-1">{profile.mobile || 'Not set'}</p>}
                            </div>
                            
                            {isEditing && (
                                <div className="flex gap-3 pt-2">
                                    <button onClick={handleSaveProfile} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors">Save</button>
                                    <button onClick={handleCancelEdit} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. MY POINTS SECTION (Golden & Clean) */}
                    {!isEditing && (
                        <div className="bg-gradient-to-br from-amber-100 to-yellow-50 p-6 rounded-[2rem] shadow-sm border border-amber-200 relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-yellow-300/30 rounded-full blur-2xl"></div>
                            <h2 className="text-xl font-extrabold text-amber-900 mb-4 flex items-center">✨ Snaccit Points</h2>
                            
                            <div className="flex flex-col items-center justify-center py-6">
                                <div className="text-6xl font-black text-amber-500 mb-2 drop-shadow-sm">
                                    {profile.points || 0}
                                </div>
                                <p className="text-amber-800 font-bold text-lg">Available Points</p>
                            </div>
                            
                            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-amber-100 text-center">
                                <p className="text-xs text-amber-900 font-bold">Redeem for Instant Discounts!</p>
                                <p className="text-xs text-amber-700/80">Toggle points at checkout to save on your order.</p>
                            </div>
                        </div>
                    )}

                    {/* 3. REFERRAL SECTION (Updated Copy) */}
                    {!isEditing && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-[2rem] shadow-sm border border-green-100 relative overflow-hidden">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-200/50 rounded-full blur-xl"></div>
                            <h3 className="text-green-800 font-extrabold text-lg mb-1">Refer & Earn 50 Points</h3>
                            <p className="text-green-600/80 text-sm mb-4 leading-snug">
                                Share your code. When a friend signs up and orders, you BOTH get <span className="font-bold text-green-700">50 Snaccit Points!</span>
                            </p>
                            
                            <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-green-200 shadow-sm">
                                <div className="flex-grow text-center font-mono font-black text-xl text-gray-800 tracking-widest">
                                    {profile.myReferralCode || <span className="text-sm text-gray-400 font-sans font-normal">Loading...</span>}
                                </div>
                                <button onClick={() => copyToClipboard(profile.myReferralCode)} className="bg-green-100 p-2 rounded-lg text-green-700 hover:bg-green-200 transition-colors" title="Copy Code">
                                    <Copy size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                 </div>

                 {/* RIGHT COLUMN: Order History */}
                <div className="lg:w-2/3">
                    <h2 className="text-2xl font-bold mb-4">Order History</h2>
                    <div className="space-y-6">
                        {isLoading ? (<div className="flex justify-center"><Loader2 className="animate-spin text-green-600" size={32} /></div>) : orders.length > 0 ? (
                            orders.map(order => (
                                <div key={order.id} className="bg-white rounded-2xl shadow-md p-5 sm:p-6 border border-gray-100">
                                    <div className="flex flex-col sm:flex-row justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{order.restaurantName}</h3>
                                            <p className="text-xs text-gray-500">
                                                Ordered on {order.createdAt?.toLocaleDateString() || 'N/A'} at {order.createdAt?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) || ''}
                                            </p>
                                            <p className="text-xs text-gray-500 font-medium mt-1">Arrival: <span className="text-blue-600">{order.arrivalTime}</span></p>
                                        </div>
                                        <span className={`mt-2 sm:mt-0 px-3 py-1 text-xs sm:text-sm font-bold rounded-full capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>{order.status.replace('_', ' ')}</span>
                                    </div>
                                    <div className="border-t border-b py-3 my-3 text-sm space-y-1">
                                        {order.items.map((item, index) => (
                                            <p key={index} className="text-gray-700 flex justify-between">
                                                <span>{item.quantity} x {item.name} {item.size && `(${item.size})`}</span>
                                                <span className="font-medium">₹{item.price * item.quantity}</span>
                                            </p>
                                        ))}
                                    </div>
                                    <div className="flex flex-col sm:flex-row justify-between items-center mt-3">
                                        <div>
                                            {order.pointsRedeemed > 0 && <p className="text-xs text-amber-600 font-bold">Points Redeemed: {order.pointsRedeemed} (Saved ₹{order.pointsValue})</p>}
                                            {order.couponCode && <p className="text-xs text-green-600 font-bold">Coupon Applied: {order.couponCode}</p>}
                                            <span className="font-black text-xl text-gray-900">Total: ₹{order.total.toFixed(2)}</span>
                                        </div>
                                        <div className="flex gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
                                            {order.status === 'completed' && !order.hasReview && <button onClick={() => onRateOrder(order)} className="flex-1 sm:flex-none bg-blue-50 text-blue-600 font-bold py-2 px-4 rounded-xl hover:bg-blue-100 flex items-center justify-center gap-2 text-sm transition-colors"><Star size={16} /> Rate</button>}
                                            <button onClick={() => onReorder(order)} className="flex-1 sm:flex-none bg-green-50 text-green-700 font-bold py-2 px-4 rounded-xl hover:bg-green-100 flex items-center justify-center gap-2 text-sm transition-colors"><PlusCircle size={16} /> Reorder</button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white rounded-[2rem] shadow-sm p-12 text-center border border-gray-100">
                                <p className="text-gray-400 italic">You haven't placed any orders yet.</p>
                                <p className="text-sm text-gray-300 mt-2">Your food journey begins now!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- [FINAL FIXED] Review Modal Component ---
const ReviewModal = ({ isOpen, onClose, order, onSubmitReview }) => {
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setRating(0);
            setReviewText('');
        }
    }, [isOpen, order]);

    const handleSubmit = () => {
        if (rating === 0) { 
            alert("Please select a star rating."); 
            return; 
        }
        onSubmitReview(order, { rating, text: reviewText });
    };

    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-down">
                {/* Header */}
                <div className="p-6 border-b relative bg-gray-50">
                    <h2 className="text-2xl font-bold text-gray-800">Leave a Review</h2>
                    <p className="text-sm text-gray-500 mt-1">For your order at <span className="font-semibold">{order.restaurantName}</span></p>
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 p-2 bg-white rounded-full text-gray-400 hover:text-gray-700 shadow-sm transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Star Rating */}
                    <div className="text-center">
                        <h3 className="font-semibold text-gray-700 mb-3">How was your food?</h3>
                        <div className="flex items-center justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button 
                                    key={star} 
                                    onClick={() => setRating(star)}
                                    className="focus:outline-none transform hover:scale-110 transition-transform"
                                >
                                    <Star 
                                        size={36} 
                                        className={`transition-colors duration-200 ${rating >= star ? 'text-amber-400 fill-current' : 'text-gray-200'}`} 
                                    />
                                </button>
                            ))}
                        </div>
                        <p className="text-sm text-amber-600 font-medium mt-2 h-5">
                            {rating === 1 && "Terrible"}
                            {rating === 2 && "Bad"}
                            {rating === 3 && "Okay"}
                            {rating === 4 && "Good"}
                            {rating === 5 && "Excellent!"}
                        </p>
                    </div>

                    {/* Review Text */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Write a Review (Optional)</label>
                        <textarea 
                            value={reviewText} 
                            onChange={(e) => setReviewText(e.target.value)} 
                            rows="3" 
                            placeholder="Tell us what you liked..." 
                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none bg-gray-50 focus:bg-white transition-colors"
                        ></textarea>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0">
                    <button 
                        onClick={handleSubmit} 
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:from-green-600 hover:to-green-700 transition-all transform active:scale-95"
                    >
                        Submit Review
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Payment Redirect Overlay Component ---
const PaymentRedirectOverlay = ({ isOpen }) => {
// ... (rest of the component is unchanged)
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="text-center text-white p-8">
                <Loader2 size={64} className="mx-auto animate-spin mb-6" />
                <h2 className="text-2xl font-bold mb-2">Connecting to Payment Gateway...</h2>
                <p className="text-lg opacity-80">Please wait, you are being redirected securely.</p>
            </div>
        </div>
    );
};


// --- Main App Component (Integrates New Modals) ---
const App = () => {
    // --- State ---
    const [view, setView] = useState('home');
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [restaurants, setRestaurants] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Loading restaurants state
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [itemToCustomize, setItemToCustomize] = useState(null);
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [scrollToSection, setScrollToSection] = useState(null);
    const [orderToReview, setOrderToReview] = useState(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false); // Auth loading state
    const [isAuthModalOpen, setAuthModalOpen] = useState(false); // Used for OTP sign-up/login
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false); // New: For choosing login method
    const [isSetCredentialsModalOpen, setIsSetCredentialsModalOpen] = useState(false); // New: After first sign-up
    const [newUserObject, setNewUserObject] = useState(null); // Temp store user after OTP verify

    const showNotification = (message, type) => setNotification({ message, type });

    // --- Effects ---
    useEffect(() => {
        // Handle routing based on path
        const path = window.location.pathname;
        console.log("Initial path:", path); // Debug path
        if (path === '/payment-status') setView('paymentStatus');
        else if (path === '/privacy-policy') setView('privacy');
        else if (path === '/terms-of-service') setView('terms');
        else setView('home'); // Default to home if no match

        // Fetch initial restaurant data
        const fetchRestaurantsAndMenus = async () => {
             setIsLoading(true); // Start loading
             try {
                 console.log("Fetching restaurants...");
                 const restaurantsCollection = db.collection("restaurants");
                 const restaurantSnapshot = await restaurantsCollection.get();
                 console.log(`Fetched ${restaurantSnapshot.docs.length} restaurants.`);
                 const restaurantListPromises = restaurantSnapshot.docs.map(async (doc) => {
                     const restaurantData = { id: doc.id, ...doc.data() };
                     try { // Fetch menu for each restaurant individually
                         const menuCollectionRef = db.collection("restaurants").doc(doc.id).collection("menu");
                         const menuSnapshot = await menuCollectionRef.get();
                         restaurantData.menu = menuSnapshot.docs.map(menuDoc => ({ id: menuDoc.id, ...menuDoc.data() }));
                     } catch (menuError) {
                          console.error(`Error fetching menu for restaurant ${doc.id}:`, menuError);
                          restaurantData.menu = []; // Assign empty menu on error
                     }
                     return restaurantData;
                 });
                 const restaurantList = await Promise.all(restaurantListPromises);
                 setRestaurants(restaurantList);
                 console.log("Finished fetching restaurants and menus.");
             } catch (error) {
                 console.error("Error fetching restaurants: ", error);
                 showNotification("Could not load restaurants.", "error"); // Show error to user
             } finally {
                 setIsLoading(false); // Stop loading
             }
         };
        fetchRestaurantsAndMenus();

        // Firebase Auth state listener
        console.log("Setting up auth state listener...");
        const unsubAuth = auth.onAuthStateChanged(async (user) => {
            console.log("Auth state changed. User:", user ? user.uid : 'null');
            setCurrentUser(user);
            setIsAuthReady(true); // Auth state is now known
            if (user) {
                // Request notification permission only if user is logged in
                requestCustomerNotificationPermission(user);

                try {
                    const userDoc = await db.collection("users").doc(user.uid).get();
                    if (userDoc.exists) {
                        setUserProfile(userDoc.data());
                        console.log("User profile loaded into App state.");
                    } else {
                         // Profile might not exist yet if they just signed up and haven't finished the second modal
                        console.log("User logged in, but Firestore profile doc not found yet.");
                        setUserProfile(null);
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                }

            } else {
                // Reset user-specific state on logout
                console.log("User logged out, resetting cart and selection.");
                setCart([]);
                setSelectedRestaurant(null);
                // Close modals that require login
                setIsCartOpen(false);
                setIsCheckoutOpen(false);
                setOrderToReview(null);
                setIsSetCredentialsModalOpen(false); // Close credential modal if open
                setNewUserObject(null); // Clear new user object
            }
        });

        // Firebase Messaging foreground listener
        let unsubscribeMessaging = null;
        if (messaging) {
            try {
                console.log("Setting up foreground messaging listener...");
                unsubscribeMessaging = messaging.onMessage((payload) => {
                    console.log('Foreground message received: ', payload);
                    const notificationTitle = payload.notification?.title; // Use optional chaining
                    const notificationBody = payload.notification?.body;
                     if(notificationTitle && notificationBody) {
                        showNotification(`${notificationTitle}: ${notificationBody}`, 'success');
                     } else {
                         console.warn("Foreground message received without title/body:", payload);
                     }
                });
            } catch (error) {
                 console.error("Error setting up foreground message handler:", error);
            }
        }
        // Cleanup function for auth and messaging listeners
        return () => {
             console.log("Cleaning up App listeners.");
             unsubAuth();
             if (unsubscribeMessaging) {
                 console.log("Cleaning up messaging listener.");
                 unsubscribeMessaging();
             }
        };
    }, []); // Run only once on initial mount

    // Effect for scrolling to section after view changes to 'home'
    useEffect(() => {
        if (view === 'home' && scrollToSection) {
            const timer = setTimeout(() => { // Timeout ensures DOM update before scroll attempt
                const element = document.getElementById(scrollToSection);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    console.log("Scrolled to section:", scrollToSection);
                 } else {
                     console.warn("Element not found for scrolling:", scrollToSection);
                 }
                setScrollToSection(null); // Clear target after attempting
            }, 100);
             return () => clearTimeout(timer); // Cleanup timeout
        }
    }, [view, scrollToSection]);

    // Effect for managing body scroll based on modal visibility
    useEffect(() => {
        const anyModalOpen = isCartOpen || isCheckoutOpen || !!itemToCustomize || isAuthModalOpen || isLoginModalOpen || isSetCredentialsModalOpen;
        // console.log("Modal state changed, anyModalOpen:", anyModalOpen); // Can be noisy
        document.body.style.overflow = anyModalOpen ? 'hidden' : 'auto';
        // Cleanup function resets on unmount
        return () => { document.body.style.overflow = 'auto'; };
    }, [isCartOpen, isCheckoutOpen, itemToCustomize, isAuthModalOpen, isLoginModalOpen, isSetCredentialsModalOpen]);

    // --- Core App Handlers ---
    const handleSelectItemForCustomization = (item) => setItemToCustomize(item);

    const handleConfirmAddToCart = (customizedItem) => {
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(item => item.cartItemId === customizedItem.cartItemId);
            if (existingItemIndex > -1) {
                 const updatedCart = [...prevCart];
                 updatedCart[existingItemIndex] = { ...updatedCart[existingItemIndex], quantity: updatedCart[existingItemIndex].quantity + 1 };
                 return updatedCart;
            } else {
                return [...prevCart, { ...customizedItem, quantity: 1 }];
            }
        });
        setItemToCustomize(null);
        showNotification(`${customizedItem.name} added to cart!`, "success");
    };

    const handleUpdateQuantity = (cartItemId, newQuantity) => {
        if (newQuantity <= 0) {
            setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId));
        } else {
            setCart(prevCart => prevCart.map(item => item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item));
        }
    };

const handlePlaceOrder = async (arrivalTime, subtotal, discount, couponCode, usePoints) => { // <--- Added usePoints
    if (!currentUser) { showNotification("Please log in to place an order.", "error"); return; }
    if (!userProfile) { showNotification("Please wait for profile to load.", "error"); return; }
    
    setIsRedirecting(true); 
    setIsCheckoutOpen(false);

    try {
        console.log("Calling secure backend to create order...");
        
        const orderPayload = {
            restaurantId: selectedRestaurant.id,
            arrivalTime: arrivalTime,
            couponCode: couponCode || null,
            usePoints: usePoints, // <--- Pass to backend
            userName: userProfile?.username || 'Customer',
            userPhone: userProfile?.mobile || currentUser.phoneNumber,
            items: cart.map(item => ({
                id: item.id,
                quantity: item.quantity,
                size: item.selectedSize.name,
                addons: item.selectedAddons ? item.selectedAddons.map(a => a.name) : []
            }))
        };

        const createOrderAndPay = functionsAsia.httpsCallable('createOrderAndPay');
        const result = await createOrderAndPay(orderPayload);
        
        const { redirectUrl } = result.data;
        if (redirectUrl) {
            window.location.href = redirectUrl;
        } else {
            throw new Error("No payment URL received.");
        }

    } catch (error) {
        console.error("Error during order creation:", error);
        let errorMessage = "Failed to place order.";
        if (error.details) errorMessage = error.details;
        else if (error.message) errorMessage = error.message;
        
        showNotification(errorMessage, "error");
        setIsRedirecting(false);
    }
};

    const handleSubmitReview = async (order, reviewData) => {
         if (!currentUser) return;
         console.log("Submitting review for order:", order.id);
         const review = {
             ...reviewData, userId: currentUser.uid, userEmail: currentUser.email || currentUser.phoneNumber,
             restaurantId: order.restaurantId, orderId: order.id, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
         };
         try {
             await db.collection("reviews").add(review);
             const orderDocRef = db.collection("orders").doc(order.id);
             await orderDocRef.update({ hasReview: true });
             const restaurantDocRef = db.collection("restaurants").doc(order.restaurantId);
             await db.runTransaction(async (transaction) => {
                 const restaurantDoc = await transaction.get(restaurantDocRef);
                 if (!restaurantDoc.exists) throw "Restaurant not found!";
                 const currentRating = restaurantDoc.data().rating || 0;
                 const currentReviewCount = restaurantDoc.data().reviewCount || 0;
                 const newReviewCount = currentReviewCount + 1;
                 const newTotalRating = (currentRating * currentReviewCount) + reviewData.rating;
                 const newAvgRating = newTotalRating / newReviewCount;
                 transaction.update(restaurantDocRef, { rating: newAvgRating, reviewCount: newReviewCount });
             });
             showNotification("Thank you for your review!", "success");
             setOrderToReview(null);
         } catch (error) { console.error("Error submitting review:", error); showNotification("Could not submit review.", "error"); }
     };

     const handleReorder = async (order) => {
         console.log("Attempting to reorder:", order.id);
         const restaurant = restaurants.find(r => r.id === order.restaurantId);
         if (!restaurant) { showNotification("Restaurant not found.", "error"); return; }
         setIsLoading(true);
         let currentMenu = [];
         try {
            const menuCollectionRef = db.collection("restaurants").doc(restaurant.id).collection("menu");
            const menuSnapshot = await menuCollectionRef.get();
            currentMenu = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         } catch (error) { console.error("Error fetching menu for reorder:", error); showNotification("Could not fetch menu.", "error"); setIsLoading(false); return; }
         finally { setIsLoading(false); }
         setSelectedRestaurant(restaurant);
         const newCart = []; let allItemsFound = true; let itemsChanged = false;
         for (const orderedItem of order.items) {
             const menuItem = currentMenu.find(item => item.id === orderedItem.id);
             if (menuItem) {
                 const selectedSize = menuItem.sizes?.find(s => s.name === orderedItem.size);
                 if (!selectedSize) { allItemsFound = false; itemsChanged = true; continue; }
                 const selectedAddons = menuItem.addons ? menuItem.addons.filter(addon => (orderedItem.addons || []).includes(addon.name)) : [];
                 if (menuItem.addons && (orderedItem.addons || []).length !== selectedAddons.length) { itemsChanged = true; }
                 const currentAddonsPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
                 const currentFinalPrice = selectedSize.price + currentAddonsPrice;
                 if (currentFinalPrice !== orderedItem.price) { itemsChanged = true; }
                 newCart.push({ ...menuItem, cartItemId: `${menuItem.id}-${selectedSize.name}-${selectedAddons.map(a => a.name).sort().join('-')}`, selectedSize, selectedAddons, finalPrice: currentFinalPrice, quantity: orderedItem.quantity });
             } else { allItemsFound = false; itemsChanged = true; }
         }
         if (!allItemsFound) showNotification("Some items unavailable.", "error");
         else if (itemsChanged) showNotification("Items/prices may have changed.", "success");
         else showNotification("Order added to cart!", "success");
         setCart(newCart); setView('menu'); setTimeout(() => setIsCartOpen(true), 100);
     };

    const cartItemCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);

    const handleLogout = async () => {
         console.log("Logging out...");
         try {
             await auth.signOut();
             showNotification("Logged out successfully.", "success");
             setView('home');
             window.scrollTo({ top: 0, behavior: 'smooth' });
         } catch (error) { console.error("Error signing out: ", error); showNotification("Logout failed.", "error"); }
     };

    const handleRestaurantClick = (restaurant) => {
         setSelectedRestaurant(restaurant);
         setView('menu');
         setCart([]);
     };

    const handleBackClick = () => {
         setSelectedRestaurant(null);
         setView('home');
     };

    const handleGoHome = (sectionId = null) => {
         if (view === 'home') {
            if (sectionId) {
                 const element = document.getElementById(sectionId);
                 if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else { window.scrollTo({ top: 0, behavior: 'smooth' }); }
         } else {
            setView('home');
            if (sectionId) setScrollToSection(sectionId);
            else setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
         }
     };

     // --- Auth Flow Handlers ---
    const handleNewUserVerified = (user) => {
        console.log("App received new user from AuthModal:", user.uid);
        setNewUserObject(user);
        setAuthModalOpen(false);
        setIsSetCredentialsModalOpen(true);
    };

    // renderView function:

const renderView = () => {
    if (!isAuthReady || (view !== 'home' && view !== 'privacy' && view !== 'terms' && isLoading)) {
        return <div className="min-h-[calc(100vh-200px)] flex itemgit pushs-center justify-center"><Loader2 className="animate-spin text-green-600" size={48} /></div>;
    }
    switch(view) {
        // --- UPDATE THIS LINE ---
        case 'home': 
            return <HomePage 
                allRestaurants={restaurants} 
                isLoading={isLoading} 
                onRestaurantClick={handleRestaurantClick} 
                onGoToProfile={() => setView('profile')} // <--- ADD THIS PROP
            />;
        // ------------------------
        
        case 'menu': return selectedRestaurant ? <MenuPage restaurant={selectedRestaurant} onBackClick={handleBackClick} onSelectItem={handleSelectItemForCustomization} /> : <HomePage allRestaurants={restaurants} isLoading={isLoading} onRestaurantClick={handleRestaurantClick} onGoToProfile={() => setView('profile')} />;

        // ... rest of the cases remain the same
        case 'confirmation': return <OrderConfirmation onGoHome={() => handleGoHome()} />;
        case 'paymentStatus': return <PaymentStatusPage onGoHome={() => handleGoHome()} />;
        case 'privacy': return <PrivacyPolicyPage />;
        case 'terms': return <TermsOfServicePage />;
        case 'profile': return currentUser ? <ProfilePage currentUser={currentUser} showNotification={showNotification} onReorder={handleReorder} onRateOrder={setOrderToReview} /> : <HomePage allRestaurants={restaurants} isLoading={isLoading} onRestaurantClick={handleRestaurantClick} onGoToProfile={() => setView('profile')} />;
        default: return <HomePage allRestaurants={restaurants} isLoading={isLoading} onRestaurantClick={handleRestaurantClick} onGoToProfile={() => setView('profile')} />;
    }
};

    // --- Main JSX Return ---
    return (
        <>
            <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification({ message: '', type: ''})} />
             <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} onNewUserVerified={handleNewUserVerified} />
             {/* MODIFIED: LoginModal props updated */}
             <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                // onSelectOtpLogin prop removed
                showNotification={showNotification}
            />
             <SetCredentialsModal isOpen={isSetCredentialsModalOpen} onClose={() => setIsSetCredentialsModalOpen(false)} newUser={newUserObject} showNotification={showNotification} />
             <ItemCustomizationModal isOpen={!!itemToCustomize} onClose={() => setItemToCustomize(null)} item={itemToCustomize} onConfirmAddToCart={handleConfirmAddToCart} />
             <CartSidebar 
    isOpen={isCartOpen} 
    onClose={() => setIsCartOpen(false)} 
    cart={cart} 
    onUpdateQuantity={handleUpdateQuantity} 
    onCheckout={() => {
        // --- THIS CHECK PREVENTS THE CRASH ---
        if (!selectedRestaurant) {
            showNotification("Please go back to the restaurant's menu to proceed to checkout.", "error");
            setIsCartOpen(false); // Close the cart
            return; // Stop
        }
        // --- END CHECK ---

        setIsCartOpen(false); 
        setIsCheckoutOpen(true); 
    }} 
/>
             <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} onPlaceOrder={handlePlaceOrder} cart={cart} restaurant={selectedRestaurant} />
             <ReviewModal isOpen={!!orderToReview} onClose={() => setOrderToReview(null)} order={orderToReview} onSubmitReview={handleSubmitReview} />
             <PaymentRedirectOverlay isOpen={isRedirecting} />

            <div className="bg-cream-50 font-sans text-slate-800 min-h-screen flex flex-col">
                <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-200/80">
                    <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                        <h1 onClick={() => handleGoHome()} className="text-3xl font-bold text-green-700 tracking-tight cursor-pointer">Snaccit</h1>
                        <div className="flex items-center space-x-4">
                            <button onClick={() => handleGoHome('restaurants')} className="text-gray-600 hover:text-green-600 p-2 rounded-full hover:bg-gray-100"><Search size={22} /></button>
                            {!isAuthReady ? (
                                 <Loader2 className="animate-spin text-gray-500" size={22} />
                            ) : currentUser ? (
                                <>
                                    <button onClick={() => setIsCartOpen(true)} className="relative text-gray-600 hover:text-green-600 p-2 rounded-full hover:bg-gray-100">
                                        <ShoppingCart size={22} />
                                        {cartItemCount > 0 && <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">{cartItemCount}</span>}
                                    </button>
                                    <button onClick={() => setView('profile')} className="text-gray-600 hover:text-green-600 p-2 rounded-full hover:bg-gray-100"><User size={22} /></button>
                                    <button onClick={handleLogout} className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-red-600 py-2 px-3 rounded-md hover:bg-gray-100">Log Out</button>                                </>
                            ) : (
                                <>
                                    <button onClick={() => setIsLoginModalOpen(true)} className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-green-600 py-2 px-3 rounded-md hover:bg-gray-100">Log In</button>
                                    <button onClick={() => setAuthModalOpen(true)} className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-2 px-5 rounded-full text-sm hover:shadow-lg hover:shadow-green-500/40 transition-shadow">Sign Up</button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-grow">
                    {renderView()}
                </main>

                <footer className="bg-emerald-950 text-white relative z-40 pt-24 pb-12 overflow-hidden">
    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[800px] h-[400px] bg-green-600/20 rounded-[100%] blur-[100px] pointer-events-none"></div>

    <div className="container mx-auto px-6 relative z-10 text-center">
        <BrandLogo className="scale-125 origin-center mb-8" />
        <p className="text-green-200/80 text-lg max-w-md mx-auto mb-12 font-medium leading-relaxed">Skip the wait. Savor the moment. The future of dining is here.</p>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-12">
            <a href="/terms-of-service" onClick={(e) => { e.preventDefault(); setView('terms'); window.history.pushState({}, '', '/terms-of-service'); }} className="text-base text-green-100 hover:text-white font-bold transition-colors relative group">Terms of Service<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-400 transition-all group-hover:w-full"></span></a>
            <a href="/privacy-policy" onClick={(e) => { e.preventDefault(); setView('privacy'); window.history.pushState({}, '', '/privacy-policy'); }} className="text-base text-green-100 hover:text-white font-bold transition-colors relative group">Privacy Policy<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-400 transition-all group-hover:w-full"></span></a>
            <a href="#" className="text-base text-green-100 hover:text-white font-bold transition-colors relative group">Contact Us<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-green-400 transition-all group-hover:w-full"></span></a>
        </div>
        <div className="border-t border-green-800/50 pt-8">
            <p className="text-green-300/60 text-sm font-medium">© 2024 Snaccit Inc. All rights reserved. Crafted with hunger.</p>
        </div>
    </div>
</footer>
            </div>
        </>
    );
};

export default App;
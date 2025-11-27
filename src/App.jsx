// App.jsx (Full, Unabbreviated Version with Email-Only Login)
import firebase from 'firebase/compat/app';
import React, { useState, useEffect, useMemo } from 'react';
import { requestCustomerNotificationPermission } from './firebaseMessaging';
import {
    ChefHat, Smartphone, Store, Pizza, Sandwich, Utensils, X, ArrowLeft,
    Leaf, PlusCircle, MinusCircle, ShoppingCart, Clock, PartyPopper,
    Search, Star, Award, User, Info, Bell, Loader2, Frown
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

// --- [NEW] Set Credentials Modal (After First Phone Sign-Up) ---
const SetCredentialsModal = ({ isOpen, onClose, newUser, showNotification }) => {
// ... (rest of the component is unchanged - long code omitted for brevity)
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Import EmailAuthProvider directly from firebase compat namespace
    const { EmailAuthProvider } = firebase.auth;

    useEffect(() => {
        // Reset form when modal opens
        if (isOpen) {
            setEmail('');
            setPassword('');
            setUsername('');
            setError('');
            setIsProcessing(false);
        }
    }, [isOpen]);

    const handleSetCredentials = async (e) => {
        e.preventDefault();
        setError('');
        setIsProcessing(true);

        if (!newUser) {
            setError("User session is invalid. Please try signing up again.");
            setIsProcessing(false);
            return;
        }

        if (password.length < 6) {
             setError('Password should be at least 6 characters long.');
             setIsProcessing(false);
             return;
        }
         if (!username.trim()) {
             setError('Please enter a username.');
             setIsProcessing(false);
             return;
         }

        try {
            // 1. Create email/password credential
            const credential = EmailAuthProvider.credential(email, password);

            // 2. Link credential to the currently signed-in user (newUser)
            console.log("Attempting to link email/password credential...");
            // Ensure the user object is still valid and reflects the current auth state
            const currentUser = auth.currentUser;
            if (!currentUser || currentUser.uid !== newUser.uid) {
                 throw { code: 'auth/user-mismatch', message: "User state mismatch. Please log in again." }; // Safety check
            }
            await currentUser.linkWithCredential(credential);
            console.log("Email/Password linked successfully.");

            // 3. Create/Update Firestore document
            const userDocRef = db.collection("users").doc(currentUser.uid);
            console.log("Updating Firestore document with username and email...");
            await userDocRef.set({
                // Set initial data or merge with potentially existing phone data
                username: username.trim(),
                email: email.toLowerCase(), // Store email consistently
                phoneNumber: currentUser.phoneNumber, // Get from current user after linking
                mobile: currentUser.phoneNumber,
                // Add createdAt only if creating the document for the first time
                // Using merge: true handles both cases (creation and update)
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log("Firestore document updated.");

            showNotification("Account setup complete! You can now log in.", "success");
            onClose(); // Close the modal on success

        } catch (err) {
            console.error("Error setting credentials:", err);
            switch (err.code) {
                case 'auth/invalid-email': setError('Please enter a valid email address.'); break;
                case 'auth/email-already-in-use': setError('This email is already associated with another account.'); break;
                case 'auth/credential-already-in-use': setError('This email/credential is already linked to a user.'); break;
                case 'auth/weak-password': setError('Password should be at least 6 characters long.'); break;
                case 'auth/requires-recent-login': setError('Security check required. Please try signing up again.'); break; // Force re-auth
                 case 'auth/user-mismatch': setError(err.message); break; // Show custom error
                default: setError(`An unexpected error occurred (${err.code}). Please try again.`); break;
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
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Complete Your Account</h2>
                <p className="text-center text-gray-500 mb-6">Set your email, password, and username.</p>
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
                    {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                    <button type="submit" disabled={isProcessing} className={`bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-full hover:shadow-lg hover:shadow-green-500/40 transition-all duration-300 w-full ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                         {isProcessing ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Save & Continue'}
                    </button>
                </form>
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

// --- HomePage Component ---
const HomePage = ({ allRestaurants, isLoading, onRestaurantClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('restaurant');
    const [activeFilter, setActiveFilter] = useState('all');

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

    const topDishes = [
          { 
              name: "Butter Chicken", 
              restaurant: "Curry Kingdom", 
              imageUrl: butterChickenImg 
          },
          { 
              name: "Margherita Pizza", 
              restaurant: "Pizza Palace", 
              imageUrl: pizzaImg 
          },
          { 
              name: "Sushi Platter", 
              restaurant: "Tokyo Bites", 
              imageUrl: sushiImg 
          },
          { 
              name: "Vegan Burger", 
              restaurant: "The Vurger Co.", 
              imageUrl: burgerImg 
          },
    ];

    const handleDishClick = (dish) => {
        const restaurant = allRestaurants.find(r => r.id === dish.restaurantId);
        if (restaurant) onRestaurantClick(restaurant);
    };

    return (
        <>
            <main className="relative h-[600px] flex items-center justify-center text-white overflow-hidden">
                <div className="absolute inset-0 bg-black/50 z-10"></div>
<video
                    className="absolute inset-0 w-full h-full object-cover"
                    src={heroVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                />                <div className="relative z-20 text-center px-6">
                    <AnimatedHeroText />
                    <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-200 drop-shadow-xl slide-in-2">Pre-order your meal with Snaccit and have it served the moment you arrive. No more waiting, just eating.</p>
                    <div className="mt-10 slide-in-2"><button className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-4 px-10 rounded-full hover:shadow-xl hover:shadow-green-400/50 hover:scale-105 transition-all duration-300 shadow-lg text-lg">Find My Next Meal</button></div>
                </div>
            </main>
            <section id="features" className="relative py-24 overflow-hidden bg-gradient-to-b from-cream-50 via-white to-cream-50">
    {/* Decorative background blobs */}
    <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-green-100/40 rounded-full blur-3xl mix-blend-multiply animate-blob pointer-events-none"></div>
    <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000 pointer-events-none"></div>

    <div className="container relative mx-auto px-6 z-10">
        <div className="text-center mb-16">
            <h3 className="text-sm font-bold uppercase text-green-600 tracking-widest">A Seamless Experience</h3>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold text-gray-900">Get served in 3 simple steps</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
                { icon: <Store className="w-8 h-8 text-green-700" />, title: "Choose & Pre-order", description: "Explore menus and select your dishes before you even leave the house." },
                { icon: <Smartphone className="w-8 h-8 text-green-700" />, title: "Set Arrival Time", description: "Let the restaurant know exactly when you'll be there for perfectly timed food." },
                { icon: <ChefHat className="w-8 h-8 text-green-700" />, title: "Arrive and Dine", description: "Walk in, sit down, and have your freshly prepared meal served immediately." }
            ].map((step, i) => (
                <div key={i} className="group relative bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(5,150,105,0.2)] hover:border-green-200">
                    <div className="relative inline-block mb-6">
                        {/* Icon Container */}
                        <div className="bg-green-50 p-6 rounded-full border border-green-100 group-hover:bg-green-100 group-hover:scale-110 transition-all duration-300">
                            {step.icon}
                        </div>
                        {/* Step Number Badge */}
                        <div className="absolute -top-2 -right-2 bg-gradient-to-br from-green-500 to-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md ring-4 ring-white">
                            {i + 1}
                        </div>
                    </div>
                    <h4 className="text-xl font-bold mb-3 text-gray-900">{step.title}</h4>
                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
            ))}
        </div>
    </div>
</section>
            <section className="relative py-28 bg-gradient-to-br from-green-900 via-green-800 to-green-950 overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.3)]">
    <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>

    <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-green-600/20 rounded-full blur-3xl mix-blend-overlay animate-pulse"></div>
    <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl mix-blend-overlay animate-pulse animation-delay-2000"></div>

    <div className="relative container mx-auto px-6 text-center z-10 flex flex-col items-center">
        <BrandLogo className="scale-110 md:scale-125 origin-center" />
        <div className="mt-8 h-1 w-24 bg-green-500/50 rounded-full"></div>
        <p className="text-green-200 mt-6 text-xl max-w-lg mx-auto font-medium leading-relaxed drop-shadow">
            The fastest way to your favorite food.
            <br />
            <span className="text-white/80 text-base font-normal">Skip the line, savor the time.</span>
        </p>
    </div>
</section>
            <section id="top-dishes" className="py-20 sm:py-24 bg-cream-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16"><h3 className="text-sm font-bold uppercase text-green-600 tracking-widest">Fan Favorites</h3><h2 className="mt-2 text-3xl md:text-4xl font-bold text-gray-800">Most Popular Dishes</h2></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {topDishes.map((dish, index) => (
                             <div key={index} className="relative rounded-3xl overflow-hidden group cursor-pointer shadow-lg transform hover:scale-105 transition-transform duration-300">
                                <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 p-6 text-white"><h4 className="text-xl font-bold drop-shadow-lg">{dish.name}</h4><p className="text-sm opacity-80">{dish.restaurant}</p></div>
                             </div>
                        ))}
                    </div>
                </div>
            </section>
            <section id="restaurants" className="py-20 sm:py-24 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-8"><h3 className="text-sm font-bold uppercase text-green-600 tracking-widest">Find Your Craving</h3><h2 className="mt-2 text-3xl md:text-4xl font-bold text-gray-800">Explore Restaurants</h2></div>
                    <div className="max-w-3xl mx-auto mb-12">
                          <div className="flex justify-center mb-4 space-x-2 bg-gray-200 p-1 rounded-full">
                              <button onClick={() => setSearchType('restaurant')} className={`px-6 py-2 rounded-full font-semibold transition-colors ${searchType === 'restaurant' ? 'bg-white text-green-600 shadow' : 'text-gray-600'}`}>Restaurants</button>
                              <button onClick={() => setSearchType('dish')} className={`px-6 py-2 rounded-full font-semibold transition-colors ${searchType === 'dish' ? 'bg-white text-green-600 shadow' : 'text-gray-600'}`}>Dishes</button>
                          </div>
                          <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="text-gray-400" /></div>
                              <input type="text" placeholder={searchType === 'restaurant' ? 'Search restaurants or cuisine...' : 'Search dishes...'} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full py-4 pl-12 pr-4 text-lg border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
                          </div>
                          <div className="flex justify-center mt-6 space-x-4">
                              <button onClick={() => setActiveFilter('all')} className={`px-5 py-2 rounded-full font-semibold transition-colors flex items-center ${activeFilter === 'all' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-700'}`}>All</button>
                              <button onClick={() => setActiveFilter('topRated')} className={`px-5 py-2 rounded-full font-semibold transition-colors flex items-center ${activeFilter === 'topRated' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-700'}`}><Award size={16} className="mr-2"/>Top Rated</button>
                              <button onClick={() => setActiveFilter('veg')} className={`px-5 py-2 rounded-full font-semibold transition-colors flex items-center ${activeFilter === 'veg' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-700'}`}><Leaf size={16} className="mr-2"/>Pure Veg</button>
                          </div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {isLoading ? (
                            <div className="md:col-span-2 lg:col-span-4 text-center"><Loader2 className="animate-spin mx-auto text-green-600" size={32} /></div>
                        ) : (
                            searchType === 'restaurant' ? (
                                filteredResults.map((resto, index) => (
                                    <div key={resto.id} onClick={() => onRestaurantClick(resto)} className="bg-white rounded-3xl shadow-md overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 ease-in-out group border hover:shadow-xl hover:border-green-300 cursor-pointer animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                                        <div className="relative"><img src={resto.imageUrl} alt={resto.name} className="w-full h-48 object-cover" />{resto.rating >= 4.5 && <div className="absolute top-3 right-3 bg-amber-400 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center"><Star size={12} className="mr-1"/>TOP RATED</div>}</div>
                                        <div className="p-6"><h4 className="text-xl font-bold text-gray-900 truncate">{resto.name}</h4><p className="text-gray-500 mt-1">{resto.cuisine}</p><div className="mt-4 flex justify-between items-center"><span className="text-amber-500 font-bold flex items-center"><Star size={16} className="mr-1"/>{resto.rating ? resto.rating.toFixed(1) : 'New'}</span><span className="text-gray-800 font-semibold">{resto.price}</span></div></div>
                                    </div>
                                ))
                            ) : (
                                filteredResults.map((dish, index) => (
                                     <div key={`${dish.restaurantId}-${dish.id}`} onClick={() => handleDishClick(dish)} className="bg-white rounded-3xl shadow-md overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 ease-in-out group border hover:shadow-xl hover:border-green-300 cursor-pointer animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                                         <div className="relative"><img src={dish.imageUrl || 'https://placehold.co/400x400/cccccc/ffffff?text=No+Image'} alt={dish.name} className="w-full h-48 object-cover" /></div>
                                         <div className="p-6"><h4 className="text-xl font-bold text-gray-900 truncate">{dish.name}</h4><p className="text-gray-500 mt-1">from {dish.restaurantName}</p><div className="mt-4 flex justify-between items-center"><span className="font-bold text-lg">₹{dish.sizes && dish.sizes[0] ? dish.sizes[0].price : 'N/A'}</span></div></div>
                                     </div>
                                ))
                            )
                        )}
                        {!isLoading && filteredResults.length === 0 && (<p className="md:col-span-2 lg:col-span-4 text-center text-gray-500">No results found matching your criteria.</p>)}
                    </div>
                </div>
            </section>
        </>
    );
};
// ... (rest of the component is unchanged - long code omitted for brevity)
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
                setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
// ... (rest of the component is unchanged - long code omitted for brevity)
    const generateTimeSlots = (openingTimeStr, closingTimeStr) => {
        const slots = [], now = new Date();
        const intervalMinutes = 15;
        const minimumLeadTimeMinutes = 15;
        if (!openingTimeStr || !closingTimeStr || !/^\d{2}:\d{2}$/.test(openingTimeStr) || !/^\d{2}:\d{2}$/.test(closingTimeStr)) return [];
        const [openHours, openMinutes] = openingTimeStr.split(':').map(Number);
        const openingTime = new Date(); openingTime.setHours(openHours, openMinutes, 0, 0);
        const [closeHours, closeMinutes] = closingTimeStr.split(':').map(Number);
        const closingTime = new Date(); closingTime.setHours(closeHours, closeMinutes, 0, 0);
        const earliestOrderTime = new Date(now.getTime() + minimumLeadTimeMinutes * 60000);
        const minutes = earliestOrderTime.getMinutes();
        const remainder = minutes % intervalMinutes;
        if (remainder !== 0) earliestOrderTime.setMinutes(minutes + (intervalMinutes - remainder), 0, 0);
        else earliestOrderTime.setSeconds(0, 0);
        let startTime = earliestOrderTime > openingTime ? earliestOrderTime : openingTime;
        if (startTime >= closingTime) return [];
        while (startTime < closingTime) {
            const slotTime = new Date(startTime);
            const displayFormat = slotTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            const valueFormat = displayFormat;
            slots.push({ display: displayFormat, value: valueFormat });
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
            <label className="block text-gray-700 text-sm font-bold mb-3 flex items-center"><Clock className="inline mr-2" size={16}/>Estimated Arrival Time</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                {timeSlots.map(slot => <button type="button" key={slot.value} onClick={() => onTimeSelect(slot.value)} className={`p-2 sm:p-3 text-sm sm:text-base rounded-lg font-semibold text-center transition-all duration-200 border-2 ${selectedTime === slot.value ? 'bg-green-600 text-white border-green-600 shadow-md ring-2 ring-green-300 ring-offset-1' : 'bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:text-green-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500'}`}>{slot.display}</button>)}
            </div>
        </div>
    );
};

// --- Checkout Modal Component ---
const CheckoutModal = ({ isOpen, onClose, onPlaceOrder, cart, restaurant }) => {
// ... (rest of the component is unchanged - long code omitted for brevity)
    const [arrivalTime, setArrivalTime] = useState('');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const subtotal = useMemo(() => cart.reduce((total, item) => total + item.finalPrice * item.quantity, 0), [cart]);
    const [couponCode, setCouponCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [couponError, setCouponError] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const grandTotal = subtotal - discount;

    useEffect(() => {
        if (isOpen) {
            setArrivalTime(''); setCouponCode(''); setDiscount(0);
            setCouponError(''); setAppliedCoupon(null);
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
            if (!coupon.isActive) { setCouponError("This coupon is no longer active."); }
            else if (new Date() > coupon.expiryDate.toDate()) { setCouponError("This coupon has expired."); }
            else if (subtotal < coupon.minOrderValue) { setCouponError(`A minimum order of ₹${coupon.minOrderValue} is required to use this coupon.`); }
            else {
                let calculatedDiscount = 0;
                if (coupon.type === 'fixed') { calculatedDiscount = coupon.value; }
                else if (coupon.type === 'percentage') { calculatedDiscount = (subtotal * coupon.value) / 100; }
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
        await onPlaceOrder(arrivalTime, subtotal, discount, appliedCoupon?.code);
        setIsPlacingOrder(false); // Only re-enable if payment redirect fails in handlePlaceOrder
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
                    <div className="flex gap-2 mb-4">
                        <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter Coupon Code" className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-green-500 focus:border-green-500" disabled={!!appliedCoupon} />
                        <button type="button" onClick={handleApplyCoupon} disabled={isValidating || !!appliedCoupon || !couponCode.trim()} className="bg-gray-200 text-gray-700 font-semibold px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm flex-shrink-0">
                            {isValidating ? <Loader2 className="animate-spin h-5 w-5" /> : appliedCoupon ? 'Applied' : 'Apply'}
                        </button>
                    </div>
                      {couponError && <p className="text-red-500 text-xs italic mb-2 -mt-2">{couponError}</p>}
                      {appliedCoupon && !couponError && <p className="text-green-600 text-xs italic mb-2 -mt-2">Coupon "{appliedCoupon.code}" applied!</p>}
                    <div className="space-y-1 mb-4 text-sm">
                        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                        {discount > 0 && <div className="flex justify-between text-green-600 font-semibold"><span>Discount ({appliedCoupon.code})</span><span>- ₹{discount.toFixed(2)}</span></div>}
                        <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2 text-gray-900"><span >Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
                    </div>
                    <button onClick={handleConfirm} disabled={isPlacingOrder || !arrivalTime} className={`w-full bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-3 rounded-full hover:shadow-lg transition-all disabled:opacity-50 flex justify-center items-center px-6 ${!arrivalTime ? 'cursor-not-allowed' : ''}`}>
                         {isPlacingOrder ? <Loader2 className="animate-spin" size={24} /> : (
                             <span className="flex justify-between w-full items-center">
                                 <span>Proceed to Payment</span>
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

// --- Payment Status Page Component ---
const PaymentStatusPage = ({ onGoHome }) => {
// ... (rest of the component is unchanged - long code omitted for brevity)
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
        const unsubscribe = orderRef.onSnapshot((docSnapshot) => {
            if (docSnapshot.exists) {
                setOrderStatus(docSnapshot.data().status);
            } else {
                setOrderStatus('error');
            }
        });

        // Timeout to handle if payment response is severely delayed
        const timer = setTimeout(() => {
            if (orderStatus === 'awaiting_payment') {
                setOrderStatus('delayed');
            }
        }, 30000); // 30 seconds

        return () => { // Cleanup
            unsubscribe();
            clearTimeout(timer);
        };
    }, []); // Run only once

    const renderContent = () => {
        switch (orderStatus) {
            case 'awaiting_payment': return <><Loader2 size={64} className="text-blue-500 mb-6 animate-spin" /><h1 className="text-4xl font-bold text-gray-800">Processing Payment...</h1><p className="text-lg text-gray-600 mt-4">Please wait, we are confirming your payment.</p></>;
            case 'pending': return <><PartyPopper size={64} className="text-green-500 mb-6" /><h1 className="text-4xl font-bold text-gray-800">Order Placed Successfully!</h1><p className="text-lg text-gray-600 mt-4">The restaurant has been notified.</p></>;
            case 'payment_failed': return <><Frown size={64} className="text-red-500 mb-6" /><h1 className="text-4xl font-bold text-gray-800">Payment Failed</h1><p className="text-lg text-gray-600 mt-4">There was an issue with your payment. Please try again.</p></>;
            case 'delayed': return <><Clock size={64} className="text-amber-500 mb-6" /><h1 className="text-4xl font-bold text-gray-800">Payment is Processing</h1><p className="text-lg text-gray-600 mt-4 max-w-2xl">Your payment is taking longer than usual. We will update your order status in your profile once confirmed.</p></>;
            default: return <><Info size={64} className="text-yellow-500 mb-6" /><h1 className="text-4xl font-bold text-gray-800">Something Went Wrong</h1><p className="text-lg text-gray-600 mt-4">We couldn't find your order details.</p></>;
        }
    };

    return (
        <div className="container mx-auto px-6 py-20 text-center flex flex-col items-center justify-center min-h-[60vh]">
            {renderContent()}
            <button onClick={onGoHome} className="mt-8 bg-green-600 text-white font-bold py-3 px-8 rounded-full hover:bg-green-700 transition-colors">
                {orderStatus === 'pending' ? 'Browse More' : 'Go Back Home'}
            </button>
        </div>
    );
};

// --- Profile Page Component ---
const ProfilePage = ({ currentUser, showNotification, onReorder, onRateOrder }) => {
// ... (rest of the component is unchanged - long code omitted for brevity)
    const [orders, setOrders] = useState([]);
    const [profile, setProfile] = useState({ username: '', mobile: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ username: '', mobile: '' });


    useEffect(() => {
        if (!currentUser) return;
        
        setIsLoading(true); // Start loading when user changes
        const userDocRef = db.collection("users").doc(currentUser.uid);
        const unsubProfile = userDocRef.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                setProfile(data);
                setFormData(data); // Initialize form data
            } else {
                 console.log("No user profile found in Firestore, may need creation.");
                 // User might exist in Auth but not Firestore if linking failed?
                 // Or, if email/pass was primary, this doc might be empty initially.
            }
        });

        const ordersQuery = db.collection("orders").where("userId", "==", currentUser.uid).orderBy("createdAt", "desc").limit(20);
        const unsubOrders = ordersQuery.onSnapshot((snapshot) => {
            const userOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() // Keep as Date object initially
            }));
            setOrders(userOrders);
            setIsLoading(false); // Stop loading after orders are fetched
        }, (error) => {
            console.error("Error fetching user orders:", error);
            showNotification("Could not load order history.", "error");
            setIsLoading(false); // Stop loading on error
        });

        return () => { // Cleanup listeners
             console.log("Cleaning up ProfilePage listeners.");
             unsubProfile();
             unsubOrders();
         };
    }, [currentUser]); // Re-run only when currentUser object changes

    const handleProfileChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSaveProfile = async () => {
          if (!formData.username || !formData.mobile) { // Basic validation
              showNotification("Username and mobile number cannot be empty.", "error");
              return;
          }
        const userDocRef = db.collection("users").doc(currentUser.uid);
        try {
            await userDocRef.set(formData, { merge: true }); // Merge to avoid overwriting other fields
            showNotification("Profile updated successfully!", "success");
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile: ", error);
            showNotification("Failed to update profile.", "error");
        }
    };

    const handleCancelEdit = () => {
        setFormData(profile); // Reset form data to last saved state
        setIsEditing(false);
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
                 {/* Personal Details Card */}
                <div className="lg:w-1/3">
                    <div className="bg-white p-6 rounded-2xl shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Personal Details</h2>
                            {!isEditing && <button onClick={() => setIsEditing(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Change</button>}
                        </div>
                        <div className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <p className="text-gray-600 mt-1 p-2 bg-gray-100 rounded-md text-sm">{currentUser?.email || 'Not set'}</p>
                            </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700">Phone</label>
                                 <p className="text-gray-600 mt-1 p-2 bg-gray-100 rounded-md text-sm">{currentUser?.phoneNumber || profile.mobile || 'Not set'}</p>
                             </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700" htmlFor="username">Username</label>
                                {isEditing ? <input type="text" name="username" id="username" value={formData.username || ''} onChange={handleProfileChange} className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm"/> : <p className="text-gray-900 mt-1 p-2 font-medium">{profile.username || 'Not set'}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700" htmlFor="mobile">Mobile (Other)</label>
                                {isEditing ? <input type="tel" name="mobile" id="mobile" value={formData.mobile || ''} onChange={handleProfileChange} className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm"/> : <p className="text-gray-900 mt-1 p-2 font-medium">{profile.mobile || 'Not set'}</p>}
                            </div>
                            {isEditing && <div className="flex gap-2 pt-2"><button onClick={handleSaveProfile} className="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 text-sm">Save</button><button onClick={handleCancelEdit} className="w-full bg-gray-200 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-300 text-sm">Cancel</button></div>}
                        </div>
                    </div>
                 </div>
                 {/* Order History Card */}
                <div className="lg:w-2/3">
                    <h2 className="text-2xl font-bold mb-4">Order History</h2>
                    <div className="space-y-6">
                        {isLoading ? (<div className="flex justify-center"><Loader2 className="animate-spin text-green-600" size={32} /></div>) : orders.length > 0 ? (
                            orders.map(order => (
                                <div key={order.id} className="bg-white rounded-2xl shadow-md p-5 sm:p-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-lg sm:text-xl font-bold">{order.restaurantName}</h3>
                                                <p className="text-xs text-gray-500">
                                                    Ordered on {order.createdAt?.toLocaleDateString() || 'N/A'} at {order.createdAt?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) || ''}
                                                </p>                                                            <p className="text-xs text-gray-500">Arrival Time: {order.arrivalTime}</p>
                                        </div>
                                        <span className={`mt-2 sm:mt-0 px-3 py-1 text-xs sm:text-sm font-bold rounded-full capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>{order.status.replace('_', ' ')}</span>
                                    </div>
                                    <div className="border-t border-b py-3 my-3 text-sm">
                                        {order.items.map((item, index) => <p key={index} className="text-gray-700">{item.quantity} x {item.name} {item.size && `(${item.size})`}</p>)}
                                    </div>
                                    <div className="flex flex-col sm:flex-row justify-between items-center mt-3">
                                        <span className="font-bold text-lg order-2 sm:order-1 mt-2 sm:mt-0">Total: ₹{order.total.toFixed(2)}</span>
                                        <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                                            {order.status === 'completed' && !order.hasReview && <button onClick={() => onRateOrder(order)} className="flex-1 sm:flex-none bg-blue-100 text-blue-700 font-semibold py-2 px-3 sm:px-4 rounded-lg hover:bg-blue-200 flex items-center justify-center gap-2 text-xs sm:text-sm"><Star size={16} /> Rate</button>}
                                            <button onClick={() => onReorder(order)} className="flex-1 sm:flex-none bg-green-100 text-green-700 font-semibold py-2 px-3 sm:px-4 rounded-lg hover:bg-green-200 flex items-center justify-center gap-2 text-xs sm:text-sm"><PlusCircle size={16} /> Reorder</button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white rounded-2xl shadow-md p-12 text-center"><p className="text-gray-500 italic">You haven't placed any orders yet.</p></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Review Modal Component ---
const ReviewModal = ({ isOpen, onClose, order, onSubmitReview }) => {
// ... (rest of the component is unchanged - long code omitted for brevity)
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
     if (!isOpen || !order) return null;

     // Reset state when modal opens (or order changes)
     useEffect(() => {
         if(isOpen) {
             setRating(0);
             setReviewText('');
         }
     }, [isOpen, order]);

    const handleSubmit = () => {
        if (rating === 0) { alert("Please select a star rating."); return; }
        onSubmitReview(order, { rating, text: reviewText });
    };
    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="p-6 border-b relative">
                    <h2 className="text-2xl font-bold">Leave a Review</h2>
                    <p className="text-sm text-gray-500 mt-1">For your order at {order.restaurantName}</p>
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2">Your Rating</h3>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(star => <button key={star} onClick={() => setRating(star)}><Star size={32} className={`cursor-pointer transition-colors ${rating >= star ? 'text-amber-400 fill-current' : 'text-gray-300'}`} /></button>)}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Your Review (Optional)</h3>
                        <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows="4" placeholder="Tell us about your experience..." className="w-full border border-gray-300 rounded-md p-2 focus:ring-green-500 focus:border-green-500"></textarea>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-b-2xl"><button onClick={handleSubmit} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors">Submit Review</button></div>
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
        const unsubAuth = auth.onAuthStateChanged((user) => {
            console.log("Auth state changed. User:", user ? user.uid : 'null');
            setCurrentUser(user);
            setIsAuthReady(true); // Auth state is now known
            if (user) {
                // Request notification permission only if user is logged in
                requestCustomerNotificationPermission(user);
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

    const handlePlaceOrder = async (arrivalTime, subtotal, discount, couponCode) => {
        if (!currentUser) { showNotification("Please log in to place an order.", "error"); return; }
        setIsRedirecting(true); setIsCheckoutOpen(false);
        const grandTotal = subtotal - discount;
        const orderData = {
            userId: currentUser.uid, userEmail: currentUser.email || null,
            restaurantId: selectedRestaurant.id, restaurantName: selectedRestaurant.name,
            items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.finalPrice, size: item.selectedSize.name, addons: item.selectedAddons.map(a => a.name) })),
            subtotal, discount, couponCode: couponCode || null, total: grandTotal, status: "awaiting_payment", arrivalTime,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), hasReview: false,
        };
        try {
            console.log("Creating order document...");
            const orderRef = await db.collection("orders").add(orderData);
            console.log("Order document created:", orderRef.id);
            if (!functionsAsia) throw new Error("Asia functions instance not available.");
            const phonePePay = functionsAsia.httpsCallable('phonePePay');
            console.log("Calling phonePePay function for order:", orderRef.id);
            const response = await phonePePay({ orderId: orderRef.id });
            console.log("phonePePay response:", response);
            const { redirectUrl } = response.data|| {}; 
            if (redirectUrl) { console.log("Redirecting to payment URL..."); window.location.href = redirectUrl; }
            else { throw new Error("Could not get payment redirect URL from function response."); }
        } catch (error) {
            console.error("Error during payment process:", error);
            let errorMessage = "Failed to initiate payment. Please try again.";
            if (error.code === 'functions/unauthenticated') errorMessage = "Payment failed. Try disabling browser extensions or using a private window.";
            else if (error.message) errorMessage = error.message;
            else if (error.details) errorMessage = error.details;
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

    // --- Render View Logic ---
    const renderView = () => {
        if (!isAuthReady || (view !== 'home' && view !== 'privacy' && view !== 'terms' && isLoading)) {
            return <div className="min-h-[calc(100vh-200px)] flex items-center justify-center"><Loader2 className="animate-spin text-green-600" size={48} /></div>;
        }
        switch(view) {
            case 'home': return <HomePage allRestaurants={restaurants} isLoading={isLoading} onRestaurantClick={handleRestaurantClick} />;
            case 'menu': return selectedRestaurant ? <MenuPage restaurant={selectedRestaurant} onBackClick={handleBackClick} onSelectItem={handleSelectItemForCustomization} /> : <HomePage allRestaurants={restaurants} isLoading={isLoading} onRestaurantClick={handleRestaurantClick} />;
            case 'confirmation': return <OrderConfirmation onGoHome={() => handleGoHome()} />;
            case 'paymentStatus': return <PaymentStatusPage onGoHome={() => handleGoHome()} />;
            case 'privacy': return <PrivacyPolicyPage />;
            case 'terms': return <TermsOfServicePage />;
            case 'profile': return currentUser ? <ProfilePage currentUser={currentUser} showNotification={showNotification} onReorder={handleReorder} onRateOrder={setOrderToReview} /> : <HomePage allRestaurants={restaurants} isLoading={isLoading} onRestaurantClick={handleRestaurantClick} />;
            default: return <HomePage allRestaurants={restaurants} isLoading={isLoading} onRestaurantClick={handleRestaurantClick} />;
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

                <footer className="bg-white border-t border-gray-200">
                    <div className="container mx-auto px-6 py-12 text-center">
                        <BrandLogo />
                        <p className="text-gray-500 mt-4">Skip the wait. Savor the moment.</p>
                        <div className="mt-6 flex justify-center space-x-6">
                            <a href="/terms-of-service" onClick={(e) => { e.preventDefault(); setView('terms'); window.history.pushState({}, '', '/terms-of-service'); }} className="text-sm text-gray-500 hover:text-green-600">Terms of Service</a>
                            <a href="/privacy-policy" onClick={(e) => { e.preventDefault(); setView('privacy'); window.history.pushState({}, '', '/privacy-policy'); }} className="text-sm text-gray-500 hover:text-green-600">Privacy Policy</a>
                            <a href="#" className="text-sm text-gray-500 hover:text-green-600">Contact</a>
                        </div>
                        <p className="text-gray-400 mt-8 text-xs">© 2024 Snaccit Inc. All rights reserved.</p>
                    </div>
                </footer>
            </div>
        </>
    );
};

export default App;
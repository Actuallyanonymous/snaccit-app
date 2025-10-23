// App.jsx (Fully Refactored to Compat SDK - Complete)
import firebase from 'firebase/compat/app';
import React, { useState, useEffect, useMemo } from 'react';
import { requestCustomerNotificationPermission } from './firebaseMessaging';
import {
    ChefHat, Smartphone, Store, Pizza, Sandwich, Utensils, X, ArrowLeft,
    Leaf, PlusCircle, MinusCircle, ShoppingCart, Clock, PartyPopper,
    Search, Star, Award, User, Info, Bell, Loader2, Frown
} from 'lucide-react';
import 'firebase/compat/auth';
import { auth, db, functionsAsia, messaging } from './firebase';

// --- Notification Component ---
const Notification = ({ message, type, onDismiss }) => {
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
const BrandLogo = () => (
    <img
        src="https://placehold.co/250x80/059669/FFFFFF?text=Snaccit&font=poppins"
        alt="Snaccit Logo"
        className="mx-auto"
    />
);


// --- Animated Hero Text ---
const AnimatedHeroText = () => (
    <>
        <style>{`
            @keyframes slide-in {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .slide-in-1 { animation: slide-in 0.8s forwards 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); opacity: 0; }
            .slide-in-2 { animation: slide-in 0.8s forwards 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); opacity: 0; }
            
            .drawing-circle {
                stroke: #ef4444;
                stroke-width: 4;
                fill: transparent;
                stroke-dasharray: 1500;
                stroke-dashoffset: 1500;
                animation: draw-circle-around 3s ease-in-out infinite;
            }
            @keyframes draw-circle-around {
                0% { stroke-dashoffset: 1500; opacity: 0;}
                10% { opacity: 1; }
                50% { stroke-dashoffset: 0; opacity: 1;}
                90% { opacity: 1; }
                100% { stroke-dashoffset: -1500; opacity: 0;}
            }
        `}</style>
        <h2 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tighter drop-shadow-2xl">
            <span className="slide-in-1 inline-block relative px-4 py-2">
                Skip the wait.
                <svg className="absolute top-0 left-0 w-full h-full overflow-visible">
                    <rect className="drawing-circle" x="0" y="0" width="100%" height="100%" rx="30" />
                </svg>
            </span>
            <span className="slide-in-2 inline-block ml-4">
                Savor the moment.
            </span>
        </h2>
    </>
);

// --- Authentication Modal Component (Added reCAPTCHA Debug Logging) ---
const AuthModal = ({ isOpen, onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

  const setupRecaptcha = (retryCount = 0) => { // Added retryCount
    console.log(`Attempting to set up reCAPTCHA... (Attempt ${retryCount + 1})`);

    // Check if the reCAPTCHA library script has loaded
    if (typeof window.grecaptcha === 'undefined' || typeof firebase.auth.RecaptchaVerifier === 'undefined') {
        console.warn("reCAPTCHA library (grecaptcha or RecaptchaVerifier) not ready yet.");

        // *** NEW: Retry logic ***
        if (retryCount < 5) { // Try up to 5 times (total ~500ms)
            console.log("Retrying setup in 100ms...");
            setTimeout(() => setupRecaptcha(retryCount + 1), 100); // Retry after 100ms
            return; // Exit current attempt
        } else {
            console.error("!!! reCAPTCHA library failed to load after multiple retries!");
            setError("Authentication service failed to load. Please refresh and try again.");
            setIsProcessing(false);
            return; // Stop setup
        }
        // *** END: Retry logic ***
    }
      // Ensure the container exists
     const container = document.getElementById('recaptcha-container');
     if (!container) {
         console.error("!!! reCAPTCHA container element not found in DOM!");
         setError("UI Error: reCAPTCHA container missing. Please refresh.");
         setIsProcessing(false);
         return;
     }

     try {
         if (window.recaptchaVerifier) {
             console.log("Clearing previous reCAPTCHA verifier.");
             window.recaptchaVerifier.clear();
         }

         console.log("Creating new RecaptchaVerifier instance...");
         window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
             'size': 'invisible',
             'callback': (response) => {
                 console.log("reCAPTCHA solved (invisible callback)");
             },
             'expired-callback': () => {
                 console.warn("reCAPTCHA expired.");
                 setError("reCAPTCHA expired. Please try sending OTP again.");
                 setIsProcessing(false);
                 if(window.recaptchaVerifier) window.recaptchaVerifier.clear();
                 setupRecaptcha(); // Try setting up again without incrementing retry, maybe just expired
             }
         });

         // Render the verifier immediately
         window.recaptchaVerifier.render().then((widgetId) => {
             window.recaptchaWidgetId = widgetId;
             console.log("reCAPTCHA rendered successfully with widget ID:", widgetId);
             setRecaptchaVerifier(window.recaptchaVerifier);
         }).catch(err => {
             console.error("!!! Error rendering reCAPTCHA:", err);
             setError("Failed to initialize reCAPTCHA. Check console for details.");
             setIsProcessing(false);
         });

     } catch (err) {
         console.error("!!! Error creating RecaptchaVerifier instance:", err);
         setError("Failed to create reCAPTCHA verifier. Check console.");
         setIsProcessing(false);
     }
 };

  // Effect to set up reCAPTCHA
  useEffect(() => {
      let didSetup = false; // Flag to prevent setup running twice on strict mode mount/unmount/mount
      if (isOpen && step === 1 && !recaptchaVerifier && !didSetup) {
           didSetup = true;
           // Add a small delay to ensure the div is definitely in the DOM
           const timerId = setTimeout(() => {
               setupRecaptcha();
           }, 100); // 100ms delay
            return () => clearTimeout(timerId); // Clear timeout if component unmounts quickly
      }
      // Cleanup
      return () => {
          if (window.recaptchaVerifier) {
              console.log("Cleaning up reCAPTCHA verifier on effect cleanup.");
              window.recaptchaVerifier.clear();
              setRecaptchaVerifier(null);
          }
      };
  // Removed recaptchaVerifier from dependency array to prevent potential loops on error/reset
  }, [isOpen, step]);

  const handleAuthAction = async (e) => {
      e.preventDefault();
      setError('');
      setIsProcessing(true);

      // *** NEW DEBUG LOG ***
      console.log("handleAuthAction triggered for step:", step);

      if (step === 1) {
          // *** NEW DEBUG CHECK ***
          if (!recaptchaVerifier) {
              console.error("!!! Attempted to send OTP, but recaptchaVerifier state is null!");
              setError("reCAPTCHA is not ready. Please wait or refresh.");
              setIsProcessing(false);
              return;
          }
           console.log("Proceeding with signInWithPhoneNumber...");
          try {
              const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
              const confirmation = await auth.signInWithPhoneNumber(formattedPhoneNumber, recaptchaVerifier);
              console.log("signInWithPhoneNumber successful, confirmation result received."); // *** NEW DEBUG LOG ***
              setConfirmationResult(confirmation);
              setStep(2);
              setError('');
          } catch (err) {
              // Keep existing error handling...
              console.error("Error sending OTP:", err);
              if (err.code === 'auth/invalid-phone-number') {
                  setError('Invalid phone number format. Please include country code (e.g., +91).');
              } else if (err.code === 'auth/too-many-requests') {
                  setError('Too many requests. Please try again later.');
              } else if (err.code === 'auth/internal-error'){
                   // Give a more specific hint for internal error during OTP send
                   setError('Internal auth error during OTP request. Check authorized domains and API key restrictions.');
              }
               else {
                  setError('Failed to send OTP. Please check the number and try again.');
              }
               // Try resetting reCAPTCHA on error
               try {
                   const widgetId = window.recaptchaWidgetId; // Use stored ID
                   if (typeof window.grecaptcha !== 'undefined' && widgetId !== undefined) {
                       console.log("Resetting reCAPTCHA widget:", widgetId);
                       window.grecaptcha.reset(widgetId);
                   } else {
                        console.log("Could not reset reCAPTCHA (grecaptcha or widgetId undefined)");
                        // Maybe need to fully re-init?
                        if(recaptchaVerifier) recaptchaVerifier.clear();
                        setupRecaptcha();
                   }
               } catch (resetError) {
                    console.error("Error resetting reCAPTCHA:", resetError);
               }
          }
      } else if (step === 2) {
          // Step 2 logic remains the same...
          if (!confirmationResult) {
              setError("Verification session expired. Please go back and request OTP again.");
              setIsProcessing(false);
              return;
          }
          try {
              const userCredential = await confirmationResult.confirm(otp);
              const user = userCredential.user;
              console.log("User signed in successfully:", user);
              const userDocRef = db.collection("users").doc(user.uid);
              const userDoc = await userDocRef.get();
              if (!userDoc.exists) {
                  await userDocRef.set({
                      phoneNumber: user.phoneNumber,
                      username: '',
                      mobile: user.phoneNumber,
                      createdAt: firebase.firestore.FieldValue.serverTimestamp()
                  }, { merge: true });
                  console.log("New user document created in Firestore for:", user.uid);
              } else {
                  console.log("Existing user logged in:", user.uid);
              }
              setError('');
              onClose();
          } catch (err) {
              // Keep existing error handling...
               console.error("Error verifying OTP:", err);
              if (err.code === 'auth/invalid-verification-code') {
                  setError('Invalid OTP code. Please try again.');
              } else if (err.code === 'auth/code-expired') {
                  setError('Verification code expired. Please request a new one.');
              } else {
                  setError('Failed to verify OTP. Please try again.');
              }
          }
      }

      setIsProcessing(false);
  };

   // Reset state when modal is closed or opened - simplified cleanup
   useEffect(() => {
       if (!isOpen) {
           // Cleanup on close
           if (window.recaptchaVerifier) {
               console.log("Cleaning up reCAPTCHA verifier on modal close.");
               window.recaptchaVerifier.clear();
               setRecaptchaVerifier(null);
           }
           // Reset other states
           setPhoneNumber('');
           setOtp('');
           setError('');
           setStep(1);
           setIsProcessing(false);
           setConfirmationResult(null);
       }
       // No need to setup reCAPTCHA here, the other effect handles it on open + step 1
   }, [isOpen]);

  // JSX remains largely the same... make sure the recaptcha-container div is there
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
                   {step === 1 && (
                       <div className="mb-4">
                           <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phoneNumber">Phone Number</label>
                           <input
                               type="tel"
                               id="phoneNumber"
                               value={phoneNumber}
                               onChange={(e) => setPhoneNumber(e.target.value)}
                               className="shadow-inner appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
                               placeholder="+91 XXXXXXXXXX"
                               required
                           />
                       </div>
                   )}
                   {step === 2 && (
                       <div className="mb-6">
                           <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="otp">Verification Code</label>
                           <input
                               type="number"
                               id="otp"
                               value={otp}
                               onChange={(e) => setOtp(e.target.value)}
                               className="shadow-inner appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
                               placeholder="Enter 6-digit code"
                               required
                               maxLength="6"
                               pattern="\d*"
                           />
                       </div>
                   )}
                   {/* Ensure this container is always rendered when the modal is open */}
                   <div id="recaptcha-container" className="my-4"></div>
                   {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                   <button
                       type="submit"
                       disabled={isProcessing}
                       className={`bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-full hover:shadow-lg hover:shadow-green-500/40 transition-all duration-300 w-full ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                   >
                       {/* ... button content ... */}
                        {isProcessing ? (
                           <Loader2 className="animate-spin mx-auto" />
                       ) : (
                           step === 1 ? 'Send OTP' : 'Verify OTP & Log In'
                       )}
                   </button>
               </form>
               {step === 2 && (
                    <p className="text-center text-sm text-gray-500 mt-4">
                       <button
                           onClick={() => {
                               setStep(1);
                               setError('');
                               setOtp('');
                               setConfirmationResult(null);
                               // Need to setup reCAPTCHA again when going back
                               if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
                               // The useEffect hook will handle calling setupRecaptcha because step changes to 1
                           }}
                           className="font-bold text-green-600 hover:text-green-700">
                          Change Phone Number or Resend OTP
                       </button>
                   </p>
               )}
           </div>
       </div>
   );
};
// --- HomePage Component ---
const HomePage = ({ allRestaurants, isLoading, onRestaurantClick }) => {
    // This component does not use Firebase, so no changes are needed.
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('restaurant');
    const [activeFilter, setActiveFilter] = useState('all');

    const filteredResults = useMemo(() => {
        let restaurantsToFilter = allRestaurants;
        
        if (activeFilter === 'topRated') {
            restaurantsToFilter = restaurantsToFilter.filter(r => r.rating >= 4.5);
        }
        if (activeFilter === 'veg') {
            restaurantsToFilter = restaurantsToFilter.filter(r => r.isPureVeg === true);
        }

        if (!searchTerm) {
            return searchType === 'restaurant' ? restaurantsToFilter : [];
        }

        const lowercasedSearchTerm = searchTerm.toLowerCase();

        if (searchType === 'dish') {
            return restaurantsToFilter
                .flatMap(resto => 
                    (resto.menu || []).map(item => ({
                        ...item,
                        restaurantId: resto.id,
                        restaurantName: resto.name,
                        restaurantCuisine: resto.cuisine,
                        restaurantImageUrl: resto.imageUrl,
                    }))
                )
                .filter(item => item.name.toLowerCase().includes(lowercasedSearchTerm));
        }
        
        return restaurantsToFilter.filter(
            (resto) =>
                resto.name.toLowerCase().includes(lowercasedSearchTerm) ||
                resto.cuisine.toLowerCase().includes(lowercasedSearchTerm)
        );
    }, [searchTerm, searchType, allRestaurants, activeFilter]);

    const topDishes = [
        { name: "Butter Chicken", restaurant: "Curry Kingdom", imageUrl: "https://placehold.co/400x400/f59e0b/FFFFFF?text=Butter+Chicken" },
        { name: "Margherita Pizza", restaurant: "Pizza Palace", imageUrl: "https://placehold.co/400x400/16a34a/FFFFFF?text=Pizza" },
        { name: "Sushi Platter", restaurant: "Tokyo Bites", imageUrl: "https://placehold.co/400x400/3b82f6/FFFFFF?text=Sushi" },
        { name: "Vegan Burger", restaurant: "The Vurger Co.", imageUrl: "https://placehold.co/400x400/22c55e/FFFFFF?text=Vegan+Burger" },
    ];

    const handleDishClick = (dish) => {
        const restaurant = allRestaurants.find(r => r.id === dish.restaurantId);
        if (restaurant) {
            onRestaurantClick(restaurant);
        }
    };

    return (
        <>
            <main className="relative h-[600px] flex items-center justify-center text-white overflow-hidden">
                <div className="absolute inset-0 bg-black/50 z-10"></div>
                <img src="https://placehold.co/1600x900/222222/555555?text=Snaccit+Hero" alt="Hero background" className="absolute inset-0 w-full h-full object-cover"/>
                <div className="relative z-20 text-center px-6">
                    <AnimatedHeroText />
                    <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-200 drop-shadow-xl slide-in-2">Pre-order your meal with Snaccit and have it served the moment you arrive. No more waiting, just eating.</p>
                    <div className="mt-10 slide-in-2"><button className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-4 px-10 rounded-full hover:shadow-xl hover:shadow-green-400/50 hover:scale-105 transition-all duration-300 shadow-lg text-lg">Find My Next Meal</button></div>
                </div>
            </main>
            <section id="features" className="bg-cream-50 py-20 sm:py-24">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h3 className="text-sm font-bold uppercase text-green-600 tracking-widest">A Seamless Experience</h3>
                        <h2 className="mt-2 text-3xl md:text-4xl font-bold text-gray-800">Get served in 3 simple steps</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: <Store className="w-10 h-10 text-green-600" />, title: "1. Choose & Pre-order", description: "Explore menus from top local restaurants and select your favorite dishes." },
                            { icon: <Smartphone className="w-10 h-10 text-green-600" />, title: "2. Set Your Arrival Time", description: "Let the restaurant know when you'll be there. We handle the rest." },
                            { icon: <ChefHat className="w-10 h-10 text-green-600" />, title: "3. Arrive and Dine", description: "Your food is freshly prepared and served right as you take your seat." },
                        ].map((step, i) => (
                            <div key={i} className="bg-white p-8 rounded-3xl shadow-lg border border-gray-200 text-center transform hover:-translate-y-2 transition-transform duration-300">
                                <div className="inline-block bg-green-100 p-5 rounded-full mb-5 border-2 border-green-200">{step.icon}</div>
                                <h4 className="text-xl font-semibold mb-2 text-gray-800">{step.title}</h4>
                                <p className="text-gray-600">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            
            <section className="py-20 bg-white">
                <BrandLogo />
            </section>

            <section id="top-dishes" className="py-20 sm:py-24 bg-cream-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16"><h3 className="text-sm font-bold uppercase text-green-600 tracking-widest">Fan Favorites</h3><h2 className="mt-2 text-3xl md:text-4xl font-bold text-gray-800">Most Popular Dishes</h2></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {topDishes.map((dish, index) => (
                            <div key={index} className="relative rounded-3xl overflow-hidden group cursor-pointer shadow-lg transform hover:scale-105 transition-transform duration-300">
                                <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 p-6 text-white">
                                    <h4 className="text-xl font-bold drop-shadow-lg">{dish.name}</h4>
                                    <p className="text-sm opacity-80">{dish.restaurant}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="restaurants" className="py-20 sm:py-24 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-8">
                        <h3 className="text-sm font-bold uppercase text-green-600 tracking-widest">Find Your Craving</h3>
                        <h2 className="mt-2 text-3xl md:text-4xl font-bold text-gray-800">Explore Restaurants</h2>
                    </div>
                    <div className="max-w-3xl mx-auto mb-12">
                        <div className="flex justify-center mb-4 space-x-2 bg-gray-200 p-1 rounded-full">
                            <button onClick={() => setSearchType('restaurant')} className={`px-6 py-2 rounded-full font-semibold transition-colors ${searchType === 'restaurant' ? 'bg-white text-green-600 shadow' : 'text-gray-600'}`}>Restaurants</button>
                            <button onClick={() => setSearchType('dish')} className={`px-6 py-2 rounded-full font-semibold transition-colors ${searchType === 'dish' ? 'bg-white text-green-600 shadow' : 'text-gray-600'}`}>Dishes</button>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="text-gray-400" /></div>
                            <input type="text" placeholder={searchType === 'restaurant' ? 'Search by restaurant or cuisine...' : 'Search for your favorite dish...'} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full py-4 pl-12 pr-4 text-lg border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
                        </div>
                        <div className="flex justify-center mt-6 space-x-4">
                            <button onClick={() => setActiveFilter('all')} className={`px-5 py-2 rounded-full font-semibold transition-colors flex items-center ${activeFilter === 'all' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-700'}`}>All</button>
                            <button onClick={() => setActiveFilter('topRated')} className={`px-5 py-2 rounded-full font-semibold transition-colors flex items-center ${activeFilter === 'topRated' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-700'}`}><Award size={16} className="mr-2"/>Top Rated</button>
                            <button onClick={() => setActiveFilter('veg')} className={`px-5 py-2 rounded-full font-semibold transition-colors flex items-center ${activeFilter === 'veg' ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-gray-700'}`}><Leaf size={16} className="mr-2"/>Pure Veg</button>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {isLoading ? (<p>Loading...</p>) : (
                            searchType === 'restaurant' ? (
                                filteredResults.map((resto, index) => (
                                    <div key={resto.id} onClick={() => onRestaurantClick(resto)} className="bg-white rounded-3xl shadow-md overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 ease-in-out group border hover:shadow-xl hover:border-green-300 cursor-pointer animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                                        <div className="relative">
                                            <img src={resto.imageUrl} alt={resto.name} className="w-full h-48 object-cover" />
                                            {resto.rating >= 4.5 && <div className="absolute top-3 right-3 bg-amber-400 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center"><Star size={12} className="mr-1"/>TOP RATED</div>}
                                        </div>
                                        <div className="p-6">
                                            <h4 className="text-xl font-bold text-gray-900 truncate">{resto.name}</h4>
                                            <p className="text-gray-500 mt-1">{resto.cuisine}</p>
                                            <div className="mt-4 flex justify-between items-center">
                                                <span className="text-amber-500 font-bold flex items-center"><Star size={16} className="mr-1"/>{resto.rating ? resto.rating.toFixed(1) : 'New'}</span>
                                                <span className="text-gray-800 font-semibold">{resto.price}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                filteredResults.map((dish, index) => (
                                    <div key={`${dish.restaurantId}-${dish.id}`} onClick={() => handleDishClick(dish)} className="bg-white rounded-3xl shadow-md overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 ease-in-out group border hover:shadow-xl hover:border-green-300 cursor-pointer animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                                        <div className="relative">
                                            <img src={dish.imageUrl || 'https://placehold.co/400x400/cccccc/ffffff?text=No+Image'} alt={dish.name} className="w-full h-48 object-cover" />
                                        </div>
                                        <div className="p-6">
                                            <h4 className="text-xl font-bold text-gray-900 truncate">{dish.name}</h4>
                                            <p className="text-gray-500 mt-1">from {dish.restaurantName}</p>
                                            <div className="mt-4 flex justify-between items-center">
                                                <span className="font-bold text-lg">₹{dish.sizes[0].price}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )
                        )}
                        {!isLoading && filteredResults.length === 0 && (
                            <p className="md:col-span-2 lg:col-span-4 text-center text-gray-500">No results found matching your criteria.</p>
                        )}
                    </div>
                </div>
            </section>
        </>
    );
};


// --- Star Rating Display Component ---
const StarRating = ({ rating }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        stars.push(
            <Star key={i} size={20} className={i <= rating ? 'text-amber-400 fill-current' : 'text-gray-300'} />
        );
    }
    return <div className="flex">{stars}</div>;
};


// --- MenuPage Component (Refactored) ---
const MenuPage = ({ restaurant, onBackClick, onSelectItem }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!restaurant) return;
        setIsLoading(true);

        // FIRESTORE REFACTOR (compat syntax)
        const menuCollectionRef = db.collection("restaurants").doc(restaurant.id).collection("menu");
        const unsubMenu = menuCollectionRef.onSnapshot((snapshot) => {
            setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching menu: ", error);
            setIsLoading(false);
        });

        // FIRESTORE REFACTOR (compat syntax)
        const reviewsQuery = db.collection("reviews").where("restaurantId", "==", restaurant.id).orderBy("createdAt", "desc");
        const unsubReviews = reviewsQuery.onSnapshot((snapshot) => {
            setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubMenu();
            unsubReviews();
        };
    }, [restaurant]);

    return (
        <div className="container mx-auto px-6 py-12 min-h-screen">
            <button onClick={onBackClick} className="flex items-center text-gray-600 hover:text-green-600 font-semibold mb-8"><ArrowLeft className="mr-2" size={20} />Back to all restaurants</button>
            <div className="flex flex-col md:flex-row items-center mb-12">
                <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full md:w-48 h-48 rounded-3xl object-cover shadow-lg"/>
                <div className="md:ml-8 mt-6 md:mt-0 text-center md:text-left">
                    <h1 className="text-5xl font-bold text-gray-800">{restaurant.name}</h1>
                    <p className="text-xl text-gray-500 mt-2">{restaurant.cuisine}</p>
                    <div className="mt-4 flex justify-center md:justify-start items-center">
                        <span className="text-amber-500 font-bold flex items-center text-lg"><Star size={20} className="mr-1"/>{restaurant.rating ? restaurant.rating.toFixed(1) : 'New'} ({restaurant.reviewCount || 0} reviews)</span>
                        <span className="text-gray-400 mx-3">|</span>
                        <span className="text-gray-800 font-semibold text-lg">{restaurant.price}</span>
                    </div>
                </div>
            </div>
            <div className="max-w-4xl mx-auto">
                <div className="mb-12">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">Reviews</h2>
                    {reviews.length > 0 ? (
                        <div className="space-y-4">
                            {reviews.map(review => (
                                <div key={review.id} className="bg-white p-4 rounded-lg shadow-sm border">
                                    <div className="flex justify-between items-center">
                                        <StarRating rating={review.rating} />
                                        {/* Compat returns a Timestamp object, must call toDate() */}
                                        <span className="text-xs text-gray-400">{review.createdAt && review.createdAt.toDate().toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-gray-600 mt-2">{review.text}</p>
                                    <p className="text-xs text-gray-500 mt-2 font-semibold">- {review.userEmail.split('@')[0]}</p>
                                </div>
                            ))}
                        </div>
                    ) : (<p className="text-gray-500">No reviews yet. Be the first to leave one!</p>)}
                </div>

                <h2 className="text-3xl font-bold text-gray-800 mb-6">Menu</h2>
                {isLoading ? (<p>Loading menu...</p>) : menuItems.length > 0 ? (
                    <div className="space-y-4">
                        {menuItems.map((item) => (
                            <div key={item.id} className="bg-white rounded-2xl shadow-md p-4 flex items-center justify-between transition-shadow hover:shadow-lg">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
                                    <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                                    <span className="font-semibold text-md text-gray-800 mt-2 block">
                                        ₹{item.sizes && item.sizes[0] ? item.sizes[0].price : 'N/A'}
                                    </span>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                    <div className="relative">
                                        <img src={item.imageUrl || 'https://placehold.co/100x100/cccccc/ffffff?text=No+Image'} alt={item.name} className="w-24 h-24 rounded-lg object-cover"/>
                                        <button onClick={() => onSelectItem(item)} className="absolute -bottom-2 -right-2 bg-white text-green-700 p-1 rounded-full shadow-md hover:bg-green-100 transition-colors">
                                            <PlusCircle size={28}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (<p>No menu items found for this restaurant.</p>)}
            </div>
        </div>
    );
};


// --- Item Customization Modal ---
const ItemCustomizationModal = ({ isOpen, onClose, item, onConfirmAddToCart }) => {
    if (!isOpen || !item) return null;

    const [selectedSize, setSelectedSize] = useState(item.sizes[0]);
    const [selectedAddons, setSelectedAddons] = useState([]);

    useEffect(() => {
        if (item) {
            setSelectedSize(item.sizes[0]);
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
        const addonsPrice = selectedAddons.reduce((total, addon) => total + addon.price, 0);
        return selectedSize.price + addonsPrice;
    }, [selectedSize, selectedAddons]);

    const handleAddToCartClick = () => {
        const cartItem = {
            ...item,
            cartItemId: `${item.id}-${selectedSize.name}-${selectedAddons.map(a => a.name).join('-')}`,
            selectedSize: selectedSize,
            selectedAddons: selectedAddons,
            finalPrice: totalPrice,
        };
        onConfirmAddToCart(cartItem);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="p-6 border-b relative">
                    <h2 className="text-2xl font-bold">{item.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div>
                        <h3 className="font-semibold text-lg mb-3">Choose Size</h3>
                        <div className="space-y-2">
                            {item.sizes.map(size => (
                                <label key={size.name} className={`flex justify-between items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedSize.name === size.name ? 'border-green-500 bg-green-50 shadow-inner' : 'border-gray-200'}`}>
                                    <span className="font-medium">{size.name}</span>
                                    <span className="font-semibold">₹{size.price}</span>
                                    <input type="radio" name="size" checked={selectedSize.name === size.name} onChange={() => setSelectedSize(size)} className="hidden"/>
                                </label>
                            ))}
                        </div>
                    </div>
                    {item.addons && item.addons.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-lg mb-3">Add-ons</h3>
                            <div className="space-y-2">
                                {item.addons.map(addon => (
                                    <label key={addon.name} className={`flex justify-between items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedAddons.find(a => a.name === addon.name) ? 'border-green-500 bg-green-50 shadow-inner' : 'border-gray-200'}`}>
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
                    <button onClick={handleAddToCartClick} className="w-full bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-4 rounded-full hover:shadow-lg flex justify-between items-center px-6 text-lg">
                        <span>Add to Cart</span>
                        <span>₹{totalPrice}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Cart Sidebar Component ---
const CartSidebar = ({ isOpen, onClose, cart, onUpdateQuantity, onCheckout }) => {
    const subtotal = useMemo(() => cart.reduce((total, item) => total + item.finalPrice * item.quantity, 0), [cart]);

    return (
        <>
            <div className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-800">Your Order</h2><button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={24} /></button></div>
                    <div className="flex-grow p-6 overflow-y-auto">
                        {cart.length === 0 ? (<p className="text-gray-500 text-center mt-8">Your cart is empty.</p>) : (
                            <div className="space-y-4">
                                {cart.map(item => (
                                    <div key={item.cartItemId} className="flex items-start">
                                        <div className="flex-grow">
                                            <p className="font-bold">{item.name} <span className="text-sm font-normal text-gray-500">({item.selectedSize.name})</span></p>
                                            {item.selectedAddons.map(addon => (
                                                <p key={addon.name} className="text-xs text-gray-500 pl-2">+ {addon.name}</p>
                                            ))}
                                            <p className="text-sm text-gray-600 font-semibold mt-1">₹{item.finalPrice}</p>
                                        </div>
                                        <div className="flex items-center">
                                            <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)} className="text-gray-500 p-1"><MinusCircle size={20}/></button>
                                            <span className="w-8 text-center font-bold">{item.quantity}</span>
                                            <button onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)} className="text-gray-500 p-1"><PlusCircle size={20}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {cart.length > 0 && (
                        <div className="p-6 border-t bg-gray-50">
                            <div className="flex justify-between items-center mb-4"><span className="text-lg font-semibold text-gray-800">Subtotal</span><span className="text-lg font-bold text-gray-800">₹{subtotal.toFixed(2)}</span></div>
                            <button onClick={onCheckout} className="w-full bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-3 rounded-full hover:shadow-lg hover:shadow-green-500/40 transition-all duration-300">Choose Arrival Time</button>
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
        const slots = [], now = new Date();
        if (!openingTimeStr || !closingTimeStr) return [];
        const [openHours, openMinutes] = openingTimeStr.split(':').map(Number);
        const openingTime = new Date();
        openingTime.setHours(openHours, openMinutes, 0, 0);
        const [closeHours, closeMinutes] = closingTimeStr.split(':').map(Number);
        const closingTime = new Date();
        closingTime.setHours(closeHours, closeMinutes, 0, 0);
        const minutes = now.getMinutes(), remainder = minutes % 15;
        const roundedUpNow = new Date(now);
        roundedUpNow.setMinutes(minutes + (15 - remainder), 0, 0);
        let startTime = roundedUpNow > openingTime ? roundedUpNow : openingTime;
        if (startTime >= closingTime) return [];
        while (startTime < closingTime) {
            const slotTime = new Date(startTime);
            const displayFormat = slotTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            const valueFormat = slotTime.toTimeString().substring(0, 5);
            slots.push({ display: displayFormat, value: valueFormat });
            startTime.setMinutes(startTime.getMinutes() + 15);
        }
        return slots;
    };

    const timeSlots = useMemo(() => generateTimeSlots(restaurant?.openingTime, restaurant?.closingTime), [restaurant]);
    if (!restaurant?.openingTime || !restaurant?.closingTime) {
        return <div className="text-center p-4 bg-yellow-50 text-yellow-700 rounded-lg"><p className="font-semibold">This restaurant has not set its operating hours.</p><p className="text-sm">Pre-orders are currently unavailable.</p></div>;
    }
    if (timeSlots.length === 0) {
        return <div className="text-center p-4 bg-red-50 text-red-700 rounded-lg"><p className="font-semibold">Sorry, this restaurant is currently closed for pre-orders.</p><p className="text-sm">Operating hours: {restaurant.openingTime} - {restaurant.closingTime}</p></div>;
    }
    return (
        <div>
            <label className="block text-gray-700 text-sm font-bold mb-3"><Clock className="inline mr-2" size={16}/>Estimated Arrival Time</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {timeSlots.map(slot => <button key={slot.value} onClick={() => onTimeSelect(slot.value)} className={`p-3 rounded-lg font-semibold text-center transition-all duration-200 border-2 ${selectedTime === slot.value ? 'bg-green-600 text-white border-green-600 shadow-lg' : 'bg-white text-gray-700 border-gray-200 hover:border-green-500 hover:text-green-600'}`}>{slot.display}</button>)}
            </div>
        </div>
    );
};

// --- Checkout Modal Component (Refactored) ---
const CheckoutModal = ({ isOpen, onClose, onPlaceOrder, cart, restaurant }) => {
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
            setArrivalTime('');
            setCouponCode('');
            setDiscount(0);
            setCouponError('');
            setAppliedCoupon(null);
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
        } finally { setIsValidating(false); }
    };

    const handleConfirm = async () => {
        if (!arrivalTime) { alert("Please select an arrival time."); return; }
        setIsPlacingOrder(true);
        await onPlaceOrder(arrivalTime, subtotal, discount, appliedCoupon?.code);
        setIsPlacingOrder(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg m-4 relative flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={24} /></button>
                <div className="p-8">
                    <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">Confirm Your Pre-order</h2>
                    <p className="text-center text-gray-500 mb-6">You're ordering from <span className="font-bold">{restaurant.name}</span>.</p>
                </div>
                <div className="px-8 pb-6 overflow-y-auto"><TimeSlotPicker selectedTime={arrivalTime} onTimeSelect={setArrivalTime} restaurant={restaurant} /></div>
                <div className="mt-auto border-t p-6 bg-gray-50">
                    <div className="flex gap-2 mb-4">
                        <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter Coupon Code" className="w-full border rounded-lg p-2" disabled={appliedCoupon} />
                        <button onClick={handleApplyCoupon} disabled={isValidating || appliedCoupon} className="bg-gray-200 font-semibold px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50">{isValidating ? <Loader2 className="animate-spin" /> : 'Apply'}</button>
                    </div>
                    {couponError && <p className="text-red-500 text-sm mb-2">{couponError}</p>}
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                        {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount ({appliedCoupon.code})</span><span>- ₹{discount.toFixed(2)}</span></div>}
                        <div className="flex justify-between font-bold text-xl border-t pt-2"><span >Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
                    </div>
                    <button onClick={handleConfirm} disabled={isPlacingOrder || !arrivalTime} className="w-full bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-3 rounded-full hover:shadow-lg transition-all disabled:opacity-50 flex justify-between px-6">
                        <span>{isPlacingOrder ? 'Processing...' : 'Proceed to Payment'}</span>
                        <span>₹{grandTotal.toFixed(2)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Order Confirmation Component ---
const OrderConfirmation = ({ onGoHome }) => (
    <div className="container mx-auto px-6 py-20 text-center flex flex-col items-center justify-center min-h-[60vh]">
        <PartyPopper size={64} className="text-green-500 mb-6" />
        <h1 className="text-4xl font-bold text-gray-800">Order Placed Successfully!</h1>
        <p className="text-lg text-gray-600 mt-4">The restaurant has been notified. Your food will be ready when you arrive.</p>
        <button onClick={onGoHome} className="mt-8 bg-green-600 text-white font-bold py-3 px-8 rounded-full hover:bg-green-700 transition-colors">Browse More Restaurants</button>
    </div>
);

// --- Payment Status Page Component (Refactored) ---
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
        const unsubscribe = orderRef.onSnapshot((docSnapshot) => {
            if (docSnapshot.exists) { setOrderStatus(docSnapshot.data().status); }
            else { setOrderStatus('error'); }
        });

        const timer = setTimeout(() => {
            if (orderStatus === 'awaiting_payment') { setOrderStatus('delayed'); }
        }, 25000);

        return () => { unsubscribe(); clearTimeout(timer); };
    }, []);

    const renderContent = () => {
        switch (orderStatus) {
            case 'awaiting_payment': return <><Loader2 size={64} className="text-blue-500 mb-6 animate-spin" /><h1 className="text-4xl font-bold text-gray-800">Processing Payment...</h1><p className="text-lg text-gray-600 mt-4">Please wait, we are confirming your payment with the bank.</p></>;
            case 'pending': return <><PartyPopper size={64} className="text-green-500 mb-6" /><h1 className="text-4xl font-bold text-gray-800">Order Placed Successfully!</h1><p className="text-lg text-gray-600 mt-4">The restaurant has been notified. Your food will be ready when you arrive.</p></>;
            case 'payment_failed': return <><Frown size={64} className="text-red-500 mb-6" /><h1 className="text-4xl font-bold text-gray-800">Payment Failed</h1><p className="text-lg text-gray-600 mt-4">There was an issue with your payment. Please try again.</p></>;
            case 'delayed': return <><Clock size={64} className="text-amber-500 mb-6" /><h1 className="text-4xl font-bold text-gray-800">Payment is Processing</h1><p className="text-lg text-gray-600 mt-4 max-w-2xl">Your payment is taking longer than usual to confirm. You can safely leave this page. We will update your order status in your profile once it's complete.</p></>;
            default: return <><Info size={64} className="text-yellow-500 mb-6" /><h1 className="text-4xl font-bold text-gray-800">Something Went Wrong</h1><p className="text-lg text-gray-600 mt-4">We couldn't find your order details.</p></>;
        }
    };

    return (
        <div className="container mx-auto px-6 py-20 text-center flex flex-col items-center justify-center min-h-[60vh]">
            {renderContent()}
            <button onClick={onGoHome} className="mt-8 bg-green-600 text-white font-bold py-3 px-8 rounded-full hover:bg-green-700 transition-colors">{orderStatus === 'pending' ? 'Browse More Restaurants' : 'Go Back Home'}</button>
        </div>
    );
};


// --- Profile Page Component (Refactored) ---
const ProfilePage = ({ currentUser, showNotification, onReorder, onRateOrder }) => {
    const [orders, setOrders] = useState([]);
    const [profile, setProfile] = useState({ username: '', mobile: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ username: '', mobile: '' });

    useEffect(() => {
        if (!currentUser) return;
        
        const userDocRef = db.collection("users").doc(currentUser.uid);
        const unsubProfile = userDocRef.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                setProfile(data);
                setFormData(data);
            }
        });

        const q = db.collection("orders").where("userId", "==", currentUser.uid).orderBy("createdAt", "desc");
        const unsubOrders = q.onSnapshot((snapshot) => {
            const userOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt.toDate().toLocaleDateString(),
            }));
            setOrders(userOrders);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching user orders:", error);
            setIsLoading(false);
        });

        return () => { unsubProfile(); unsubOrders(); };
    }, [currentUser]);

    const handleProfileChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSaveProfile = async () => {
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

    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-800', accepted: 'bg-blue-100 text-blue-800',
        preparing: 'bg-indigo-100 text-indigo-800', ready: 'bg-green-100 text-green-800',
        completed: 'bg-gray-100 text-gray-800', declined: 'bg-red-100 text-red-800',
    };

    return (
        <div className="container mx-auto px-6 py-12 min-h-screen">
            <h1 className="text-4xl font-bold text-gray-800 mb-8">My Profile</h1>
            <div className="flex flex-col gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Personal Details</h2>
                        {!isEditing && <button onClick={() => setIsEditing(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Change</button>}
                    </div>
                    <div className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <p className="text-gray-500 mt-1 p-2 bg-gray-100 rounded-md">{currentUser.email}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Username</label>
                            {isEditing ? <input type="text" name="username" value={formData.username || ''} onChange={handleProfileChange} className="mt-1 w-full border border-gray-300 rounded-md p-2"/> : <p className="text-gray-900 mt-1 p-2">{profile.username || 'Not set'}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                            {isEditing ? <input type="tel" name="mobile" value={formData.mobile || ''} onChange={handleProfileChange} className="mt-1 w-full border border-gray-300 rounded-md p-2"/> : <p className="text-gray-900 mt-1 p-2">{profile.mobile || 'Not set'}</p>}
                        </div>
                        {isEditing && <div className="flex gap-2 pt-2"><button onClick={handleSaveProfile} className="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700">Save Changes</button><button onClick={handleCancelEdit} className="w-full bg-gray-200 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-300">Cancel</button></div>}
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl font-bold mb-4">Order History</h2>
                    <div className="space-y-6">
                        {isLoading ? <p>Loading your orders...</p> : orders.length > 0 ? (
                            orders.map(order => (
                                <div key={order.id} className="bg-white rounded-2xl shadow-md p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold">{order.restaurantName}</h3>
                                            <p className="text-sm text-gray-500">Ordered on {order.createdAt}</p>
                                        </div>
                                        <span className={`px-3 py-1 text-sm font-bold rounded-full capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>{order.status}</span>
                                    </div>
                                    <div className="border-t border-b py-4 my-4">
                                        {order.items.map((item, index) => <p key={index} className="text-gray-700">{item.quantity} x {item.name} {item.size && `(${item.size})`}</p>)}
                                    </div>
                                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                                        <span className="font-bold text-lg">Total: ₹{order.total.toFixed(2)}</span>
                                        <div className="flex gap-2">
                                            {order.status === 'completed' && !order.hasReview && <button onClick={() => onRateOrder(order)} className="bg-blue-100 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 flex items-center gap-2"><Star size={18} /> Rate Order</button>}
                                            <button onClick={() => onReorder(order)} className="bg-green-100 text-green-700 font-semibold py-2 px-4 rounded-lg hover:bg-green-200 flex items-center gap-2"><PlusCircle size={18} /> Reorder</button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white rounded-2xl shadow-md p-12 text-center"><p className="text-gray-500">You haven't placed any orders yet.</p></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Review Modal Component (Refactored) ---
const ReviewModal = ({ isOpen, onClose, order, onSubmitReview }) => {
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    if (!isOpen) return null;
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
                        <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows="4" placeholder="Tell us about your experience..." className="w-full border border-gray-300 rounded-md p-2"></textarea>
                    </div>
                </div>
                <div className="p-4 bg-gray-50"><button onClick={handleSubmit} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700">Submit Review</button></div>
            </div>
        </div>
    );
};

// --- Privacy Policy & Terms Pages ---
// These are static and don't need changes. Minified for brevity.
// const PrivacyPolicyPage = () => { return (<div className="bg-white py-16 sm:py-24"><div className="container mx-auto px-6"><article className="prose lg:prose-lg max-w-4xl mx-auto"><h1>Privacy Policy</h1><p>...</p></article></div></div>); };
// const TermsOfServicePage = () => { return (<div className="bg-white py-16 sm:py-24"><div className="container mx-auto px-6"><article className="prose lg:prose-lg max-w-4xl mx-auto"><h1>Terms of Service</h1><p>...</p></article></div></div>); };


// --- [NEW] Privacy Policy Page ---
const PrivacyPolicyPage = () => {
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
                        <li><strong>Personal Data:</strong> While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). This may include, but is not limited to:
                            <ul>
                                <li>Email address</li>
                                <li>First name and last name (as 'username')</li>
                                <li>Phone number ('mobile')</li>
                                <li>Order history</li>
                                <li>Usage Data</li>
                            </ul>
                        </li>
                        <li><strong>Usage Data:</strong> We may also collect information on how the Service is accessed and used ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</li>
                    </ul>

                    <h2>2. Use of Data</h2>
                    <p>Snaccit uses the collected data for various purposes:</p>
                    <ul>
                        <li>To provide and maintain our Service</li>
                        <li>To notify you about changes to our Service</li>
                        <li>To process your orders and manage your account</li>
                        <li>To send notifications related to your order status (e.g., "accepted", "ready")</li>
                        <li>To provide customer support</li>
                        <li>To gather analysis or valuable information so that we can improve our Service</li>
                        <li>To monitor the usage of our Service</li>
                        <li>To detect, prevent and address technical issues</li>
                    </ul>

                    <h2>3. Data Sharing and Disclosure</h2>
                    <p>We do not sell your Personal Data. We only share information as described below:</p>
                    <ul>
                        <li><strong>With Restaurants:</strong> To fulfill your order, we provide necessary details (such as your name, order items, and arrival time) to the restaurant you are ordering from.</li>
                        <li><strong>Service Providers:</strong> We employ third-party companies to facilitate our Service (e.g., payment processors, notification services). These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose. (e.g., Firebase, PhonePe).</li>
                        <li><strong>Legal Requirements:</strong> We may disclose your Personal Data in the good faith belief that such action is necessary to comply with a legal obligation, protect and defend the rights or property of Snaccit, or protect the personal safety of users.</li>
                    </ul>

                    <h2>4. Data Security</h2>
                    <p>The security of your data is important to us. We use industry-standard methods (like Firebase Authentication and Firestore Security Rules) to protect your data. However, remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.</p>

                    <h2>5. Your Data Rights</h2>
                    <p>You have the right to access, update, or delete the information we have on you. You can do this directly within your profile settings section. If you are unable to perform these actions yourself, please contact us to assist you.</p>

                    <h2>6. Children's Privacy</h2>
                    <p>Our Service does not address anyone under the age of 13 ("Children"). We do not knowingly collect personally identifiable information from anyone under the age of 13. If you are a parent or guardian and you are aware that your Children has provided us with Personal Data, please contact us.</p>
                    
                    <h2>7. Changes to This Privacy Policy</h2>
                    <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>
                    
                    <h2>8. Contact Us</h2>
                    <p>If you have any questions about this Privacy Policy, please contact us at: [Your Support Email Address]</p>
                </article>
            </div>
        </div>
    );
};

// --- [NEW] Terms of Service Page ---
const TermsOfServicePage = () => {
    return (
        <div className="bg-white py-16 sm:py-24">
            <div className="container mx-auto px-6">
                <article className="prose lg:prose-lg max-w-4xl mx-auto">
                    <h1>Terms of Service for Snaccit</h1>
                    <p><strong>Last Updated:</strong> [Date]</p>
                    
                    <p>Welcome to Snaccit! These Terms of Service ("Terms") govern your use of our web application (the "Service") operated by [Your Company Name] ("us", "we", or "our").</p>
                    <p>Please read these Terms carefully before using our Service. By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.</p>

                    <h2>1. Accounts</h2>
                    <p>When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
                    <p>You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>

                    <h2>2. The Service</h2>
                    <p>Snaccit provides a platform to connect users with restaurants ("Restaurants") to pre-order food and beverages. When you place an order, you are entering into a contract directly with the Restaurant.</p>
                    <p>We are not responsible for the preparation, quality, or delivery of the food. All food-related fulfillment is the sole responsibility of the Restaurant. We are responsible for transmitting your order and payment to the Restaurant.</p>

                    <h2>3. Orders and Payment</h2>
                    <p>By placing an order, you agree to pay the full price for all items in your order. All payments are processed through our third-party payment gateway (PhonePe). We do not store your full credit card or bank account details.</p>
                    <p>Once an order is placed and its status becomes "Accepted" by the restaurant, it generally cannot be canceled. Refunds for declined orders or payment failures will be processed according to our refund policy and the policies of our payment gateway.</p>

                    <h2>4. User Conduct</h2>
                    <p>You agree not to use the Service:</p>
                    <ul>
                        <li>In any way that violates any applicable local, national, or international law.</li>
                        <li>To exploit, harm, or attempt to exploit or harm minors in any way.</li>
                        <li>To impersonate or attempt to impersonate Snaccit, a Snaccit employee, another user, or any other person or entity.</li>
                        <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Service.</li>
                    </ul>

                    <h2>5. Intellectual Property</h2>
                    <p>The Service and its original content (excluding content provided by users or restaurants), features, and functionality are and will remain the exclusive property of [Your Company Name] and its licensors. The Service is protected by copyright, trademark, and other laws of both [Your Country] and foreign countries.</p>

                    <h2>6. Termination</h2>
                    <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
                    <p>Upon termination, your right to use the Service will immediately cease.</p>

                    <h2>7. Limitation of Liability</h2>
                    <p>In no event shall Snaccit, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service (including Restaurants); (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content.</p>

                    <h2>8. Governing Law</h2>
                    <p>These Terms shall be governed and construed in accordance with the laws of [Your Country/State], without regard to its conflict of law provisions.</p>
                    
                    <h2>9. Changes</h2>
                    <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.</p>

                    <h2>10. Contact Us</h2>
                    <p>If you have any questions about these Terms, please contact us at: [Your Support Email Address]</p>
                </article>
            </div>
        </div>
    );
};


// --- Main App Component (The Router - Refactored) ---
const App = () => {
    const [view, setView] = useState('home');
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [restaurants, setRestaurants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [itemToCustomize, setItemToCustomize] = useState(null);
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [scrollToSection, setScrollToSection] = useState(null);
    const [orderToReview, setOrderToReview] = useState(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);

    const showNotification = (message, type) => setNotification({ message, type });

    useEffect(() => {
        const path = window.location.pathname;
        if (path === '/payment-status') { setView('paymentStatus'); }
        else if (path === '/privacy-policy') { setView('privacy'); }
        else if (path === '/terms-of-service') { setView('terms'); }

        const fetchRestaurantsAndMenus = async () => {
            try {
                const restaurantsCollection = db.collection("restaurants");
                const restaurantSnapshot = await restaurantsCollection.get();
                const restaurantListPromises = restaurantSnapshot.docs.map(async (doc) => {
                    const restaurantData = { id: doc.id, ...doc.data() };
                    const menuCollectionRef = db.collection("restaurants").doc(doc.id).collection("menu");
                    const menuSnapshot = await menuCollectionRef.get();
                    restaurantData.menu = menuSnapshot.docs.map(menuDoc => ({ id: menuDoc.id, ...menuDoc.data() }));
                    return restaurantData;
                });
                const restaurantList = await Promise.all(restaurantListPromises);
                setRestaurants(restaurantList);
            } catch (error) { console.error("Error fetching restaurants: ", error); }
            finally { setIsLoading(false); }
        };
        fetchRestaurantsAndMenus();

        const unsubAuth = auth.onAuthStateChanged((user) => {
            setCurrentUser(user);
            setIsAuthReady(true);
            
            if (user) { 
                console.log("User logged in. Requesting notification permission.");
                requestCustomerNotificationPermission(user); 
            }
        });

        if (messaging) {
            messaging.onMessage((payload) => {
                console.log('Foreground message received: ', payload);
        
                // Use your existing notification component to show the message
                const notificationTitle = payload.notification.title;
                const notificationBody = payload.notification.body;
                showNotification(`${notificationTitle}: ${notificationBody}`, 'success');
            });
        }
        return () => unsubAuth();
    }, []);

    useEffect(() => {
        if (view === 'home' && scrollToSection) {
            setTimeout(() => {
                const element = document.getElementById(scrollToSection);
                if (element) { element.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
                setScrollToSection(null);
            }, 100);
        }
    }, [view, scrollToSection]);

    useEffect(() => {
        if (isCartOpen || isCheckoutOpen || itemToCustomize || isAuthModalOpen) { document.body.style.overflow = 'hidden'; }
        else { document.body.style.overflow = 'auto'; }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isCartOpen, isCheckoutOpen, itemToCustomize, isAuthModalOpen]);

    const handleSelectItemForCustomization = (item) => setItemToCustomize(item);

    const handleConfirmAddToCart = (customizedItem) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.cartItemId === customizedItem.cartItemId);
            if (existingItem) { return prevCart.map(item => item.cartItemId === customizedItem.cartItemId ? { ...item, quantity: item.quantity + 1 } : item); }
            return [...prevCart, { ...customizedItem, quantity: 1 }];
        });
        setItemToCustomize(null);
    };

    const handleUpdateQuantity = (cartItemId, newQuantity) => {
        if (newQuantity <= 0) { setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId)); }
        else { setCart(prevCart => prevCart.map(item => item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item)); }
    };

    const handlePlaceOrder = async (arrivalTime, subtotal, discount, couponCode) => {
        setIsRedirecting(true);
        if (!isAuthReady || !currentUser) { showNotification("Please log in to place an order.", "error"); setIsRedirecting(false); return; }
        setIsCheckoutOpen(false);
        const grandTotal = subtotal - discount;
        const orderData = {
            userId: currentUser.uid, userEmail: currentUser.email, restaurantId: selectedRestaurant.id, restaurantName: selectedRestaurant.name,
            items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.finalPrice, size: item.selectedSize.name, addons: item.selectedAddons.map(a => a.name) })),
            subtotal, discount, couponCode: couponCode || null, total: grandTotal, status: "awaiting_payment", arrivalTime,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            hasReview: false,
        };
        try {
            const orderRef = await db.collection("orders").add(orderData);
            const phonePePay = functionsAsia.httpsCallable('phonePePay');
            const response = await phonePePay({ orderId: orderRef.id }); 
            const { redirectUrl } = response.data;
            if (redirectUrl) { window.location.href = redirectUrl; }
            else { throw new Error("Could not get payment redirect URL."); }
        } catch (error) {
            console.error("Error during payment process:", error);
            let errorMessage = "Failed to initiate payment. Please try again.";
            if (error.code === 'functions/unauthenticated') { errorMessage = "Payment failed. This can be caused by browser extensions. Please try disabling them or using a private window."; }
            else if (error.message) { errorMessage = error.message; }
            showNotification(errorMessage, "error");
            setIsRedirecting(false);
        }
    };
    
    const handleSubmitReview = async (order, reviewData) => {
        const review = {
            ...reviewData, userId: currentUser.uid, userEmail: currentUser.email,
            restaurantId: order.restaurantId, orderId: order.id,
            createdAt: db.FieldValue.serverTimestamp(),
        };
        try {
            await db.collection("reviews").add(review);
            const orderDocRef = db.collection("orders").doc(order.id);
            await orderDocRef.update({ hasReview: true });
            
            const q = db.collection("reviews").where("restaurantId", "==", order.restaurantId);
            const querySnapshot = await q.get();
            const reviews = querySnapshot.docs.map(doc => doc.data());
            const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = totalRating / reviews.length;
            
            const restaurantDocRef = db.collection("restaurants").doc(order.restaurantId);
            await restaurantDocRef.update({ rating: avgRating, reviewCount: reviews.length });
            showNotification("Thank you for your review!", "success");
            setOrderToReview(null);
        } catch (error) {
            console.error("Error submitting review: ", error);
            showNotification("Could not submit review.", "error");
        }
    };

    const handleReorder = async (order) => {
        const restaurant = restaurants.find(r => r.id === order.restaurantId);
        if (!restaurant) { showNotification("Sorry, this restaurant is no longer available.", "error"); return; }
        setSelectedRestaurant(restaurant);
        setCart([]);
        const menuCollectionRef = db.collection("restaurants").doc(restaurant.id).collection("menu");
        const menuSnapshot = await menuCollectionRef.get();
        const currentMenu = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const newCart = [];
        let allItemsFound = true;
        for (const orderedItem of order.items) {
            const menuItem = currentMenu.find(item => item.id === orderedItem.id);
            if (menuItem) {
                const selectedSize = menuItem.sizes.find(s => s.name === orderedItem.size);
                const selectedAddons = menuItem.addons ? menuItem.addons.filter(addon => (orderedItem.addons || []).includes(addon.name)) : [];
                if (selectedSize) {
                    const finalPrice = selectedSize.price + selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
                    newCart.push({ ...menuItem, cartItemId: `${menuItem.id}-${selectedSize.name}-${selectedAddons.map(a => a.name).join('-')}`, selectedSize, selectedAddons, finalPrice, quantity: orderedItem.quantity });
                } else { allItemsFound = false; }
            } else { allItemsFound = false; }
        }
        if (!allItemsFound) { showNotification("Some items from your past order have changed. Please review your cart.", "error"); }
        else { showNotification("Order added to your cart!", "success"); }
        setCart(newCart);
        setView('menu');
        setIsCartOpen(true);
    };

    const cartItemCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);
    const handleLogout = async () => { setView('home'); try { await auth.signOut(); } catch (error) { console.error("Error signing out: ", error); } };
    const handleRestaurantClick = (restaurant) => { setSelectedRestaurant(restaurant); setView('menu'); setCart([]); };
    const handleBackClick = () => { setSelectedRestaurant(null); setView('home'); };
    const handleGoHome = (sectionId = null) => { setView('home'); if (sectionId) { setScrollToSection(sectionId); } };

    const renderView = () => {
        switch(view) {
            case 'home': return <HomePage allRestaurants={restaurants} isLoading={isLoading} onRestaurantClick={handleRestaurantClick} />;
            case 'menu': return <MenuPage restaurant={selectedRestaurant} onBackClick={handleBackClick} onSelectItem={handleSelectItemForCustomization} />;
            case 'confirmation': return <OrderConfirmation onGoHome={() => handleGoHome()} />;
            case 'paymentStatus': return <PaymentStatusPage onGoHome={() => handleGoHome()} />;
            case 'privacy': return <PrivacyPolicyPage />;
            case 'terms': return <TermsOfServicePage />;
            case 'profile': return <ProfilePage currentUser={currentUser} showNotification={showNotification} onReorder={handleReorder} onRateOrder={setOrderToReview} />;
            default: return <HomePage allRestaurants={restaurants} isLoading={isLoading} onRestaurantClick={handleRestaurantClick} />;
        }
    };

    return (
        <>
            <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification({ message: '', type: ''})} />
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
            <ItemCustomizationModal isOpen={!!itemToCustomize} onClose={() => setItemToCustomize(null)} item={itemToCustomize} onConfirmAddToCart={handleConfirmAddToCart} />
            <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cart={cart} onUpdateQuantity={handleUpdateQuantity} onCheckout={() => setIsCheckoutOpen(true)} />
            <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} onPlaceOrder={handlePlaceOrder} cart={cart} restaurant={selectedRestaurant} />
            <ReviewModal isOpen={!!orderToReview} onClose={() => setOrderToReview(null)} order={orderToReview} onSubmitReview={handleSubmitReview} />
            <PaymentRedirectOverlay isOpen={isRedirecting} />
            <div className="bg-cream-50 font-sans text-slate-800">
                <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-200/80">
                    <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                        <h1 onClick={() => handleGoHome()} className="text-3xl font-bold text-green-700 tracking-tight cursor-pointer">Snaccit</h1>
                        <div className="flex items-center space-x-4">
                            <button onClick={() => handleGoHome('restaurants')} className="text-gray-600 hover:text-green-600 p-2 rounded-full hover:bg-gray-100"><Search size={22} /></button>
                            {currentUser ? (
                                <>
                                    <button onClick={() => setIsCartOpen(true)} className="relative text-gray-600 hover:text-green-600">
                                        <ShoppingCart size={24} />
                                        {cartItemCount > 0 && <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{cartItemCount}</span>}
                                    </button>
                                    <button onClick={() => setView('profile')} className="text-gray-600 hover:text-green-600"><User size={22} /></button>
                                    <button onClick={handleLogout} className="hidden sm:block text-gray-600 font-semibold hover:text-green-600 py-2 px-4">Log Out</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setAuthModalOpen(true)} className="hidden sm:block text-gray-600 font-semibold hover:text-green-600 py-2 px-4">Log In</button>
                                    <button onClick={() => setAuthModalOpen(true)} className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-2.5 px-6 rounded-full hover:shadow-lg hover:shadow-green-500/40">Sign Up</button>
                                </>
                            )}
                        </div>
                    </div>
                </header>
                {renderView()}
                <footer className="bg-white border-t border-gray-200">
                    <div className="container mx-auto px-6 py-12 text-center">
                        <BrandLogo />
                        <p className="text-gray-500 mt-4">Skip the wait. Savor the moment.</p>
                        <div className="mt-6 flex justify-center space-x-6">
                            <a href="/terms-of-service" onClick={(e) => { e.preventDefault(); setView('terms'); window.history.pushState({}, '', '/terms-of-service'); }} className="text-gray-500 hover:text-green-600">Terms of Service</a>
                            <a href="/privacy-policy" onClick={(e) => { e.preventDefault(); setView('privacy'); window.history.pushState({}, '', '/privacy-policy'); }} className="text-gray-500 hover:text-green-600">Privacy Policy</a>
                            <a href="#" className="text-gray-500 hover:text-green-600">Contact</a>
                        </div>
                        <p className="text-gray-400 mt-8 text-sm">© 2024 Snaccit Inc. All rights reserved.</p>
                    </div>
                </footer>
            </div>
        </>
    );
};

// --- Payment Redirect Overlay Component ---
const PaymentRedirectOverlay = ({ isOpen }) => {
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

export default App;
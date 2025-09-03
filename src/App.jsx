import React, { useState, useEffect, useMemo } from 'react';
import { ChefHat, Smartphone, Store, Pizza, Sandwich, Utensils, X, ArrowLeft, Leaf, PlusCircle, MinusCircle, ShoppingCart, Clock, PartyPopper, Search, Star, Award, User, Info, Bell } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getAuth,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, onSnapshot, query, where, orderBy, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDDFCPcfBKcvrkjqidsXstHqe8Og_3u36k",
  authDomain: "snaccit-7d853.firebaseapp.com",
  projectId: "snaccit-7d853",
  storageBucket: "snaccit-7d853.appspot.com",
  messagingSenderId: "523142849231",
  appId: "1:523142849231:web:f10e23785d6451f510cdba"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --- Notification Component ---
const Notification = ({ message, type, onDismiss }) => {
    if (!message) return null;
    const baseClasses = "fixed top-5 right-5 p-4 rounded-lg shadow-lg flex items-center z-[100] animate-fade-in-down";
    const typeClasses = {
        success: "bg-green-100 text-green-800",
        error: "bg-red-100 text-red-800",
    };

    useEffect(() => {
        const timer = setTimeout(() => onDismiss(), 3000);
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


// --- Authentication Modal Component ---
const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
            email: user.email,
            username: '',
            mobile: '',
            createdAt: serverTimestamp()
        }, { merge: true });
      }
      onClose();
    } catch (err) {
      switch (err.code) {
        case 'auth/invalid-email': setError('Please enter a valid email address.'); break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential': setError('Invalid email or password.'); break;
        case 'auth/email-already-in-use': setError('An account with this email already exists.'); break;
        case 'auth/weak-password': setError('Password should be at least 6 characters long.'); break;
        default: setError('An unexpected error occurred. Please try again.'); break;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md m-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={24} /></button>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">{isLogin ? 'Welcome Back!' : 'Create an Account'}</h2>
        <p className="text-center text-gray-500 mb-6">{isLogin ? 'Log in to continue.' : 'Get started for free.'}</p>
        <form onSubmit={handleAuthAction}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="shadow-inner appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="you@example.com" required />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="shadow-inner appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="••••••••••" required />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <button type="submit" className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-full hover:shadow-lg hover:shadow-green-500/40 transition-all duration-300 w-full">{isLogin ? 'Log In' : 'Sign Up'}</button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-bold text-green-600 hover:text-green-700 ml-2">{isLogin ? 'Sign Up' : 'Log In'}</button>
        </p>
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

// --- MenuPage Component ---
const MenuPage = ({ restaurant, onBackClick, onSelectItem }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!restaurant) return;
    setIsLoading(true);

    const menuCollectionRef = collection(db, "restaurants", restaurant.id, "menu");
    const unsubMenu = onSnapshot(menuCollectionRef, (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching menu: ", error);
      setIsLoading(false);
    });

    const reviewsQuery = query(collection(db, "reviews"), where("restaurantId", "==", restaurant.id), orderBy("createdAt", "desc"));
    const unsubReviews = onSnapshot(reviewsQuery, (snapshot) => {
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
                                <span className="text-xs text-gray-400">{review.createdAt.toDate().toLocaleDateString()}</span>
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
// Helper function to generate time slots
const generateTimeSlots = (openingTimeStr, closingTimeStr) => {
  const slots = [];
  const now = new Date();

  // Return empty array if restaurant hours are not set
  if (!openingTimeStr || !closingTimeStr) {
    return [];
  }
  
  // Create Date objects for opening and closing times for today
  const [openHours, openMinutes] = openingTimeStr.split(':').map(Number);
  const openingTime = new Date();
  openingTime.setHours(openHours, openMinutes, 0, 0);

  const [closeHours, closeMinutes] = closingTimeStr.split(':').map(Number);
  const closingTime = new Date();
  closingTime.setHours(closeHours, closeMinutes, 0, 0);
  
  // Determine the start time for generating slots
  // It should be the later of now (rounded up) or the opening time
  const minutes = now.getMinutes();
  const remainder = minutes % 15;
  const roundedUpNow = new Date(now);
  roundedUpNow.setMinutes(minutes + (15 - remainder), 0, 0);

  let startTime = roundedUpNow > openingTime ? roundedUpNow : openingTime;
  
  // If the current time is already past closing time, no slots are available
  if (startTime > closingTime) {
    return [];
  }

  // Generate slots in 15-minute intervals until closing time
  while (startTime < closingTime) {
    const slotTime = new Date(startTime);
    
    const displayFormat = slotTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    
    const valueFormat = slotTime.toTimeString().substring(0, 5);
    slots.push({ display: displayFormat, value: valueFormat });

    // Move to the next 15-minute slot
    startTime.setMinutes(startTime.getMinutes() + 15);
  }

  return slots;
};


const TimeSlotPicker = ({ selectedTime, onTimeSelect, restaurant }) => {
  const timeSlots = useMemo(() => {
      return generateTimeSlots(restaurant?.openingTime, restaurant?.closingTime);
  }, [restaurant]);
  
  if (timeSlots.length === 0) {
    return (
        <div className="text-center p-4 bg-red-50 text-red-700 rounded-lg">
            <p className="font-semibold">Sorry, this restaurant is currently closed for pre-orders.</p>
            <p className="text-sm">Please check back during their operating hours: {restaurant?.openingTime} - {restaurant?.closingTime}</p>
        </div>
    );
  }

  return (
    <div>
        <label className="block text-gray-700 text-sm font-bold mb-3">
          <Clock className="inline mr-2" size={16}/>Estimated Arrival Time
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {timeSlots.map(slot => (
                <button
                    key={slot.value}
                    onClick={() => onTimeSelect(slot.value)}
                    className={`p-3 rounded-lg font-semibold text-center transition-all duration-200 border-2 ${
                        selectedTime === slot.value
                            ? 'bg-green-600 text-white border-green-600 shadow-lg'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-green-500 hover:text-green-600'
                    }`}
                >
                    {slot.display}
                </button>
            ))}
        </div>
    </div>
  );
};


// --- Checkout Modal Component ---
const CheckoutModal = ({ isOpen, onClose, onPlaceOrder, cart, restaurant }) => {
  const [arrivalTime, setArrivalTime] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const subtotal = useMemo(() => cart.reduce((total, item) => total + item.finalPrice * item.quantity, 0), [cart]);
  
  // Reset arrival time when modal opens
  useEffect(() => {
    if (isOpen) {
        setArrivalTime('');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!arrivalTime) {
      alert("Please select an arrival time.");
      return;
    }
    setIsPlacingOrder(true);
    await onPlaceOrder(arrivalTime, subtotal);
    setIsPlacingOrder(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg m-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={24} /></button>
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">Confirm Your Pre-order</h2>
        <p className="text-center text-gray-500 mb-6">You're ordering from <span className="font-bold">{restaurant.name}</span>.</p>
        
        <div className="bg-gray-50 rounded-xl p-4 mb-6 max-h-48 overflow-y-auto">
          <h3 className="font-bold mb-2">Your Items:</h3>
          {cart.map(item => (
            <p key={item.cartItemId} className="text-sm">{item.quantity} x {item.name} ({item.selectedSize.name})</p>
          ))}
          <p className="font-bold mt-2 text-right">Total: ₹{subtotal.toFixed(2)}</p>
        </div>

        <div className="mb-6">
          <TimeSlotPicker selectedTime={arrivalTime} onTimeSelect={setArrivalTime} restaurant={restaurant} />
        </div>
        
        <button onClick={handleConfirm} disabled={isPlacingOrder || !arrivalTime} className="w-full bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-3 rounded-full hover:shadow-lg hover:shadow-green-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
          {isPlacingOrder ? 'Placing Order...' : 'Confirm Pre-order'}
        </button>
      </div>
    </div>
  );
};


// --- Order Confirmation Component ---
const OrderConfirmation = ({ onGoHome }) => {
  return (
    <div className="container mx-auto px-6 py-20 text-center flex flex-col items-center justify-center min-h-[60vh]">
      <PartyPopper size={64} className="text-green-500 mb-6" />
      <h1 className="text-4xl font-bold text-gray-800">Order Placed Successfully!</h1>
      <p className="text-lg text-gray-600 mt-4">The restaurant has been notified. Your food will be ready when you arrive.</p>
      <button onClick={onGoHome} className="mt-8 bg-green-600 text-white font-bold py-3 px-8 rounded-full hover:bg-green-700 transition-colors">Browse More Restaurants</button>
    </div>
  );
};

// --- Profile Page Component ---
const ProfilePage = ({ currentUser, showNotification, onReorder, onRateOrder }) => {
    const [orders, setOrders] = useState([]);
    const [profile, setProfile] = useState({ username: '', mobile: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ username: '', mobile: '' });

    useEffect(() => {
        if (!currentUser) return;
        
        const userDocRef = doc(db, "users", currentUser.uid);
        const unsubProfile = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setProfile(data);
                setFormData(data);
            }
        });

        const q = query(
            collection(db, "orders"), 
            where("userId", "==", currentUser.uid), 
            orderBy("createdAt", "desc")
        );
        const unsubOrders = onSnapshot(q, (snapshot) => {
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

        return () => {
            unsubProfile();
            unsubOrders();
        };
    }, [currentUser]);

    const handleProfileChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSaveProfile = async () => {
        const userDocRef = doc(db, "users", currentUser.uid);
        try {
            await setDoc(userDocRef, formData, { merge: true });
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
        pending: 'bg-yellow-100 text-yellow-800',
        accepted: 'bg-blue-100 text-blue-800',
        preparing: 'bg-indigo-100 text-indigo-800',
        ready: 'bg-green-100 text-green-800',
        completed: 'bg-gray-100 text-gray-800',
        declined: 'bg-red-100 text-red-800',
    };

    return (
        <div className="container mx-auto px-6 py-12 min-h-screen">
            <h1 className="text-4xl font-bold text-gray-800 mb-8">My Profile</h1>
            
            <div className="flex flex-col gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Personal Details</h2>
                        {!isEditing && (
                            <button onClick={() => setIsEditing(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Change</button>
                        )}
                    </div>
                    <div className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <p className="text-gray-500 mt-1 p-2 bg-gray-100 rounded-md">{currentUser.email}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Username</label>
                            {isEditing ? (
                                <input type="text" name="username" value={formData.username || ''} onChange={handleProfileChange} className="mt-1 w-full border border-gray-300 rounded-md p-2"/>
                            ) : (
                                <p className="text-gray-900 mt-1 p-2">{profile.username || 'Not set'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                             {isEditing ? (
                                <input type="tel" name="mobile" value={formData.mobile || ''} onChange={handleProfileChange} className="mt-1 w-full border border-gray-300 rounded-md p-2"/>
                            ) : (
                                <p className="text-gray-900 mt-1 p-2">{profile.mobile || 'Not set'}</p>
                            )}
                        </div>
                        {isEditing && (
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSaveProfile} className="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 transition-colors">Save Changes</button>
                                <button onClick={handleCancelEdit} className="w-full bg-gray-200 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h2 className="text-2xl font-bold mb-4">Order History</h2>
                    <div className="space-y-6">
                        {isLoading ? (
                            <p>Loading your orders...</p>
                        ) : orders.length > 0 ? (
                            orders.map(order => (
                                <div key={order.id} className="bg-white rounded-2xl shadow-md p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold">{order.restaurantName}</h3>
                                            <p className="text-sm text-gray-500">Ordered on {order.createdAt}</p>
                                        </div>
                                        <span className={`px-3 py-1 text-sm font-bold rounded-full capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <div className="border-t border-b py-4 my-4">
                                        {order.items.map((item, index) => (
                                            <p key={index} className="text-gray-700">{item.quantity} x {item.name} {item.size && `(${item.size})`}</p>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                                        <span className="font-bold text-lg">Total: ₹{order.total.toFixed(2)}</span>
                                        <div className="flex gap-2">
                                            {order.status === 'completed' && !order.hasReview && (
                                                <button 
                                                    onClick={() => onRateOrder(order)}
                                                    className="bg-blue-100 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                                                >
                                                    <Star size={18} /> Rate Order
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => onReorder(order)}
                                                className="bg-green-100 text-green-700 font-semibold py-2 px-4 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2"
                                            >
                                                <PlusCircle size={18} /> Reorder
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white rounded-2xl shadow-md p-12 text-center">
                                <p className="text-gray-500">You haven't placed any orders yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Review Modal Component ---
const ReviewModal = ({ isOpen, onClose, order, onSubmitReview }) => {
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (rating === 0) {
            alert("Please select a star rating.");
            return;
        }
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
                            {[1, 2, 3, 4, 5].map(star => (
                                <button key={star} onClick={() => setRating(star)}>
                                    <Star size={32} className={`cursor-pointer transition-colors ${rating >= star ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Your Review (Optional)</h3>
                        <textarea 
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            rows="4"
                            placeholder="Tell us about your experience..."
                            className="w-full border border-gray-300 rounded-md p-2"
                        ></textarea>
                    </div>
                </div>
                <div className="p-4 bg-gray-50">
                    <button onClick={handleSubmit} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700">Submit Review</button>
                </div>
            </div>
        </div>
    );
};


// --- Main App Component (The Router) ---
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

  const showNotification = (message, type) => {
    setNotification({ message, type });
  };

  useEffect(() => {
    const fetchRestaurantsAndMenus = async () => {
        try {
            const restaurantsCollection = collection(db, "restaurants");
            const restaurantSnapshot = await getDocs(restaurantsCollection);
            const restaurantListPromises = restaurantSnapshot.docs.map(async (doc) => {
                const restaurantData = { id: doc.id, ...doc.data() };
                const menuCollectionRef = collection(db, "restaurants", doc.id, "menu");
                const menuSnapshot = await getDocs(menuCollectionRef);
                restaurantData.menu = menuSnapshot.docs.map(menuDoc => ({ id: menuDoc.id, ...menuDoc.data() }));
                return restaurantData;
            });
            const restaurantList = await Promise.all(restaurantListPromises);
            setRestaurants(restaurantList);
        } catch (error) { console.error("Error fetching restaurants: ", error); } 
        finally { setIsLoading(false); }
    };
    fetchRestaurantsAndMenus();

    const unsubAuth = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
      if (view === 'home' && scrollToSection) {
          setTimeout(() => {
              const element = document.getElementById(scrollToSection);
              if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
              setScrollToSection(null);
          }, 100);
      }
  }, [view, scrollToSection]);

  useEffect(() => {
    if (isCartOpen || isCheckoutOpen || itemToCustomize || isAuthModalOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
    return () => {
        document.body.style.overflow = 'auto';
    };
  }, [isCartOpen, isCheckoutOpen, itemToCustomize, isAuthModalOpen]);

  const handleSelectItemForCustomization = (item) => {
    setItemToCustomize(item);
  };
  
  const handleConfirmAddToCart = (customizedItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.cartItemId === customizedItem.cartItemId);
      if (existingItem) {
        return prevCart.map(item => item.cartItemId === customizedItem.cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prevCart, { ...customizedItem, quantity: 1 }];
    });
    setItemToCustomize(null); // Close modal
  };

  const handleUpdateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId));
    } else {
      setCart(prevCart => prevCart.map(item => item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item));
    }
  };

  const handlePlaceOrder = async (arrivalTime, subtotal) => {
    if (!currentUser) {
      alert("Please log in to place an order.");
      return;
    }
    const orderData = {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name,
      items: cart.map(item => ({ 
          id: item.id, 
          name: item.name, 
          quantity: item.quantity, 
          price: item.finalPrice, 
          size: item.selectedSize.name,
          addons: item.selectedAddons.map(a => a.name)
      })),
      total: subtotal,
      status: "pending",
      arrivalTime: arrivalTime,
      createdAt: serverTimestamp(),
      hasReview: false,
    };

    try {
      await addDoc(collection(db, "orders"), orderData);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      setCart([]);
      setView('confirmation');
    } catch (error) {
      console.error("Error placing order: ", error);
      alert("There was an error placing your order. Please try again.");
    }
  };
  
  const handleSubmitReview = async (order, reviewData) => {
    const review = {
        ...reviewData,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        restaurantId: order.restaurantId,
        orderId: order.id,
        createdAt: serverTimestamp(),
    };
    try {
        await addDoc(collection(db, "reviews"), review);
        const orderDocRef = doc(db, "orders", order.id);
        await updateDoc(orderDocRef, { hasReview: true });
        
        const q = query(collection(db, "reviews"), where("restaurantId", "==", order.restaurantId));
        const querySnapshot = await getDocs(q);
        const reviews = querySnapshot.docs.map(doc => doc.data());
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = totalRating / reviews.length;
        
        const restaurantDocRef = doc(db, "restaurants", order.restaurantId);
        await updateDoc(restaurantDocRef, { rating: avgRating, reviewCount: reviews.length });

        showNotification("Thank you for your review!", "success");
        setOrderToReview(null);
    } catch (error) {
        console.error("Error submitting review: ", error);
        showNotification("Could not submit review.", "error");
    }
  };

  const handleReorder = async (order) => {
    const restaurant = restaurants.find(r => r.id === order.restaurantId);
    if (!restaurant) {
      showNotification("Sorry, this restaurant is no longer available.", "error");
      return;
    }

    setSelectedRestaurant(restaurant);
    setCart([]);

    const menuCollectionRef = collection(db, "restaurants", restaurant.id, "menu");
    const menuSnapshot = await getDocs(menuCollectionRef);
    const currentMenu = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const newCart = [];
    let allItemsFound = true;

    for (const orderedItem of order.items) {
      const menuItem = currentMenu.find(item => item.id === orderedItem.id);
      if (menuItem) {
        const selectedSize = menuItem.sizes.find(s => s.name === orderedItem.size);
        const selectedAddons = menuItem.addons.filter(addon => (orderedItem.addons || []).includes(addon.name));

        if (selectedSize) {
          const finalPrice = selectedSize.price + selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
          const cartItem = {
            ...menuItem,
            cartItemId: `${menuItem.id}-${selectedSize.name}-${selectedAddons.map(a => a.name).join('-')}`,
            selectedSize: selectedSize,
            selectedAddons: selectedAddons,
            finalPrice: finalPrice,
            quantity: orderedItem.quantity,
          };
          newCart.push(cartItem);
        } else {
          allItemsFound = false;
        }
      } else {
        allItemsFound = false;
      }
    }

    if (!allItemsFound) {
        showNotification("Some items from your past order have changed. Please review your cart.", "error");
    } else {
        showNotification("Order added to your cart!", "success");
    }
    
    setCart(newCart);
    setView('menu');
    setIsCartOpen(true);
  };

  const cartItemCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);

  const handleLogout = async () => {
    setView('home'); 
    try { await signOut(auth); } catch (error) { console.error("Error signing out: ", error); }
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
    setView('home');
    if (sectionId) {
        setScrollToSection(sectionId);
    }
  };

  const renderView = () => {
    switch(view) {
      case 'home':
        return <HomePage allRestaurants={restaurants} isLoading={isLoading} onRestaurantClick={handleRestaurantClick} />;
      case 'menu':
        return <MenuPage restaurant={selectedRestaurant} onBackClick={handleBackClick} onSelectItem={handleSelectItemForCustomization} />;
      case 'confirmation':
        return <OrderConfirmation onGoHome={() => handleGoHome()} />;
      case 'profile':
        return <ProfilePage currentUser={currentUser} showNotification={showNotification} onReorder={handleReorder} onRateOrder={setOrderToReview} />;
      default:
        return <HomePage allRestaurants={restaurants} isLoading={isLoading} onRestaurantClick={handleRestaurantClick} />;
    }
  };

  return (
    <>
      <Notification 
        message={notification.message} 
        type={notification.type} 
        onDismiss={() => setNotification({ message: '', type: ''})} 
      />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
      <ItemCustomizationModal 
        isOpen={!!itemToCustomize} 
        onClose={() => setItemToCustomize(null)} 
        item={itemToCustomize} 
        onConfirmAddToCart={handleConfirmAddToCart}
      />
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cart={cart} onUpdateQuantity={handleUpdateQuantity} onCheckout={() => setIsCheckoutOpen(true)} />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} onPlaceOrder={handlePlaceOrder} cart={cart} restaurant={selectedRestaurant} />
      <ReviewModal isOpen={!!orderToReview} onClose={() => setOrderToReview(null)} order={orderToReview} onSubmitReview={handleSubmitReview} />
      
      <div className="bg-cream-50 font-sans text-slate-800">
        <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-200/80">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <h1 onClick={() => handleGoHome()} className="text-3xl font-bold text-green-700 tracking-tight cursor-pointer">Snaccit</h1>
            <div className="flex items-center space-x-4">
               <button onClick={() => handleGoHome('restaurants')} className="text-gray-600 hover:text-green-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Search size={22} />
              </button>
              {currentUser ? (
                <>
                  <button onClick={() => setIsCartOpen(true)} className="relative text-gray-600 hover:text-green-600">
                    <ShoppingCart size={24} />
                    {cartItemCount > 0 && <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{cartItemCount}</span>}
                  </button>
                  <button onClick={() => setView('profile')} className="text-gray-600 hover:text-green-600"><User size={22} /></button>
                  <button onClick={handleLogout} className="hidden sm:block text-gray-600 font-semibold hover:text-green-600 py-2 px-4 transition-colors duration-300">Log Out</button>
                </>
              ) : (
                <>
                  <button onClick={() => setAuthModalOpen(true)} className="hidden sm:block text-gray-600 font-semibold hover:text-green-600 py-2 px-4 transition-colors duration-300">Log In</button>
                  <button onClick={() => setAuthModalOpen(true)} className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-2.5 px-6 rounded-full hover:shadow-lg hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 shadow-md">Sign Up</button>
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
               <a href="#" className="text-gray-500 hover:text-green-600">Terms of Service</a>
               <a href="#" className="text-gray-500 hover:text-green-600">Privacy Policy</a>
               <a href="#" className="text-gray-500 hover:text-green-600">Contact</a>
             </div>
             <p className="text-gray-400 mt-8 text-sm">© 2024 Snaccit Inc. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default App;
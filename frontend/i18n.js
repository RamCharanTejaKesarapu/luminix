/* ═══════════════════════════════════════════════════════════════════
   LUMINIX — Global Multi-Language / i18n Engine
   Supports 16 languages with lazy loading, RTL, fallback, and
   locale-aware formatting. Single source of truth for language state.
   ═══════════════════════════════════════════════════════════════════ */

// ── Supported Language Configuration ──────────────────────────────
const LUMINIX_LANGUAGES = [
    { code: 'en',  locale: 'en-US',  name: 'English',    nativeName: 'English',    direction: 'ltr', flag: '🇺🇸' },
    { code: 'te',  locale: 'te-IN',  name: 'Telugu',     nativeName: 'తెలుగు',      direction: 'ltr', flag: '🇮🇳' },
    { code: 'hi',  locale: 'hi-IN',  name: 'Hindi',      nativeName: 'हिन्दी',      direction: 'ltr', flag: '🇮🇳' },
    { code: 'zh',  locale: 'zh-CN',  name: 'Chinese',    nativeName: '中文',         direction: 'ltr', flag: '🇨🇳' },
    { code: 'es',  locale: 'es-ES',  name: 'Spanish',    nativeName: 'Español',    direction: 'ltr', flag: '🇪🇸' },
    { code: 'fr',  locale: 'fr-FR',  name: 'French',     nativeName: 'Français',   direction: 'ltr', flag: '🇫🇷' },
    { code: 'de',  locale: 'de-DE',  name: 'German',     nativeName: 'Deutsch',    direction: 'ltr', flag: '🇩🇪' },
    { code: 'ru',  locale: 'ru-RU',  name: 'Russian',    nativeName: 'Русский',    direction: 'ltr', flag: '🇷🇺' },
    { code: 'tr',  locale: 'tr-TR',  name: 'Turkish',    nativeName: 'Türkçe',     direction: 'ltr', flag: '🇹🇷' },
    { code: 'ar',  locale: 'ar-SA',  name: 'Arabic',     nativeName: 'العربية',    direction: 'rtl', flag: '🇸🇦' },
    { code: 'pt',  locale: 'pt-PT',  name: 'Portuguese', nativeName: 'Português',  direction: 'ltr', flag: '🇵🇹' },
    { code: 'ja',  locale: 'ja-JP',  name: 'Japanese',   nativeName: '日本語',       direction: 'ltr', flag: '🇯🇵' },
    { code: 'ko',  locale: 'ko-KR',  name: 'Korean',     nativeName: '한국어',       direction: 'ltr', flag: '🇰🇷' },
    { code: 'it',  locale: 'it-IT',  name: 'Italian',    nativeName: 'Italiano',   direction: 'ltr', flag: '🇮🇹' },
    { code: 'fil', locale: 'fil-PH', name: 'Filipino',   nativeName: 'Tagalog',    direction: 'ltr', flag: '🇵🇭' },
    { code: 'ur',  locale: 'ur-PK',  name: 'Urdu',       nativeName: 'اردو',       direction: 'rtl', flag: '🇵🇰' }
];

const DEFAULT_EN_TRANSLATIONS = {
  "common": {
    "appName": "LUMINIX",
    "tagline": "AI FITNESS // WELLNESS OS",
    "version": "v4.3",
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "delete": "Delete",
    "edit": "Edit",
    "continue": "Continue",
    "back": "Back",
    "next": "Next",
    "start": "Start",
    "stop": "Stop",
    "retry": "Retry",
    "close": "Close",
    "search": "Search",
    "loading": "Loading...",
    "processing": "Processing...",
    "success": "Success",
    "failed": "Failed",
    "error": "Error",
    "noData": "No data available",
    "noResults": "No results found",
    "somethingWentWrong": "Something went wrong",
    "tryAgain": "Try again",
    "yes": "Yes",
    "no": "No",
    "ok": "OK",
    "submit": "Submit",
    "reset": "Reset",
    "download": "Download",
    "upload": "Upload",
    "share": "Share",
    "copyLink": "COPY LINK",
    "copied": "Copied!",
    "viewMore": "View More",
    "viewLess": "View Less",
    "learnMore": "Learn More",
    "explore": "Explore",
    "skipForNow": "Skip for now",
    "accept": "Accept",
    "decline": "Decline",
    "send": "SEND",
    "transmit": "TRANSMIT MESSAGE →",
    "scrollToTop": "Back to top",
    "contact": "CONTACT",
    "exploreSystem": "EXPLORE SYSTEM ↓",
    "exploreSanctuary": "Explore Sanctuary ↓",
    "scrollToEnter": "Scroll to Enter",
    "breadcrumbSanctuary": "Sanctuary",
    "breadcrumbModules": "Modules",
    "skipToContent": "Skip to Sanctuary Content",
    "searchChambersPlaceholder": "Search chambers, 17 yoga asanas, gym exercises, nutrition...",
    "navigate": "Navigate",
    "select": "Select",
    "dismiss": "Dismiss",
    "bannerRelease": "KYOTO SPRING RELEASE",
    "bannerDetails": "— 60 FPS Camera Biomechanics & Adaptive Discrete State Counter v4.3 Active.",
    "footerTagline": "A night walk through Kyoto biomechanics. Charred cypress, lantern light, and a vermilion moon, rendered live in WebGL. Connected to full-stack health intelligence.",
    "footerChapters": "Chapters",
    "footerDisciplines": "Disciplines",
    "footerIntelligence": "Intelligence",
    "footerSovereignty": "Sovereignty",
    "footerHeroLink": "The Threshold",
    "footerGateLink": "The Sanmon",
    "footerPathwaysLink": "Still Gardens",
    "footerLessonsLink": "Sacred Craft",
    "footerEternityLink": "Afterlight",
    "footerFaqLink": "Frequent Inquiries",
    "footerCreatorLink": "The Architect",
    "footerLivePoseLink": "60 FPS Live Pose",
    "footerGymLink": "Adaptive Gym Engine",
    "footerYogaLink": "17 Yoga Asanas",
    "footerBmiLink": "Metabolic Matrix",
    "footerFoodLink": "Food & Hydration",
    "footerLunaLink": "Luna AI Assistant",
    "footerExportLink": "Clinical PDF Export",
    "footerDocsLink": "FastAPI Swagger Docs",
    "footerHealthLink": "Firewall Status",
    "footerShareLink": "📢 Share Platform",
    "footerPrivacyLink": "Zero-Leak Privacy",
    "footerTermsLink": "Terms of Service",
    "footerAccessLink": "Accessibility Statement",
    "footerCookieLink": "Cookie Preferences",
    "footerRobotsLink": "Robots Index",
    "footerZeroLeakLink": "Zero-Leak Privacy",
    "footerAccessibilityLink": "Accessibility Statement",
    "footerCookieSettingsLink": "Cookie Preferences",
    "footerCopyright": "© 2026 LUMINIX. Sovereign Intelligence Platform. Kyoto Biomechanics.",
    "footerBuildInfo": "Luminix Release v4.3.0 · Kyoto Engine · Zero Cloud Biometrics Leak",
    "footerPhilosophy": "Engineered in Kyoto & Global Labs. Preserving the harmony between biological posture and artificial intelligence.",
    "privacy": "Privacy Policy",
    "terms": "Terms of Service",
    "accessibility": "Accessibility Statement",
    "quickGuestAccess": "Quick Guest Access",
    "done": "Done"
  },
  "auth": {
    "login": "Login",
    "register": "Register",
    "createAccount": "Create Account",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "forgotPassword": "Forgot Password?",
    "resetPassword": "Reset Password",
    "signIn": "Sign In",
    "signOut": "Sign Out",
    "signUp": "Sign Up",
    "googleSignIn": "Sign in with Google",
    "githubSignIn": "Sign in with GitHub",
    "continueWith": "Continue with",
    "orContinueWith": "Or continue with",
    "rememberMe": "Remember Me",
    "loading": "Authenticating...",
    "error": "Authentication Error",
    "invalidCredentials": "Invalid email or password",
    "accountCreated": "Account created successfully",
    "emailVerification": "Please verify your email address",
    "sessionExpired": "Your session has expired. Please sign in again.",
    "logout": "Logout",
    "logoutConfirm": "Are you sure you want to sign out?",
    "profile": "Profile",
    "security": "Security",
    "firewallStatus": "Firewall Status",
    "firewallActive": "ACTIVE",
    "firewallInactive": "INACTIVE",
    "emailRequired": "Email is required",
    "passwordRequired": "Password is required",
    "passwordMinLength": "Password must be at least 6 characters",
    "passwordsDoNotMatch": "Passwords do not match",
    "invalidEmail": "Please enter a valid email address",
    "accountExists": "An account with this email already exists",
    "networkError": "Network error. Please check your connection.",
    "welcomeBack": "Welcome back",
    "newHere": "New here?",
    "alreadyHaveAccount": "Already have an account?",
    "termsAgree": "I accept the Luminix Biometric Processing Terms & Conditions.",
    "privacyCovenant": "ZERO-LEAK PRIVACY COVENANT",
    "privacyDescription": "We guarantee that all personal biometric information is strictly protected. Your information will NEVER be leaked, rented, sold, or shared with third parties.",
    "acceptTermsError": "Please accept the terms & privacy guarantee before continuing.",
    "sanctuaryMember": "Sanctuary Member",
    "viewProfileTitle": "View profile, biometrics & security",
    "intelligence": "Intelligence",
    "subtitle": "Biomechanical Sanctuary & AI Health Ecosystem",
    "fullName": "Full Name",
    "createPassword": "Create Password",
    "forgotInstructions": "Enter your registered email address to receive password reset credentials.",
    "generateResetToken": "Generate Reset Token",
    "resetInstructions": "Enter the reset token generated for your account along with your new password.",
    "resetToken": "Reset Token",
    "newPassword": "New Password",
    "securityCovenant": "Zero-Leak Privacy & Local Vault Security",
    "user": "User",
    "enterSanctuary": "Enter Sanctuary",
    "resetVault": "Reset Vault"
  },
  "dashboard": {
    "title": "Sanctuary System",
    "pageTitle": "Luminix — Autonomous AI Health & Biomechanical Sanctuary",
    "chapterZero": "Chapter 00 — The Hidden Gate // Biomechanics Sanctuary",
    "heroLine1": "Where stillness",
    "heroLine2": "reveals the",
    "heroLine3": "unseen.",
    "heroSub": "Enter Luminix through its quiet thresholds: an intelligent sanctuary of 60 FPS computer vision, adaptive strength protocols, yoga alignment, and Luna AI.",
    "launchVision": "⚡ LAUNCH 60 FPS VISION →",
    "startWorkout": "🏋️ START WORKOUT →",
    "thresholds": "Thresholds",
    "thresholdsDesc": "Real-time 60 FPS vision tracking & joint vector biomechanics.",
    "stillGardens": "Still Gardens",
    "stillGardensDesc": "Adaptive gym routines, automated rep counter & rest intervals.",
    "sacredCraft": "Sacred Craft",
    "sacredCraftDesc": "{{count}} guided yoga asana poses with hold duration checking.",
    "nightRituals": "Night Rituals",
    "nightRitualsDesc": "Metabolic intelligence, BMR, TDEE & macro nutrition matrices.",
    "systemIndex": "SYSTEM INDEX",
    "systemIndexDesc": "Comprehensive map of all Luminix intelligence chambers.",
    "welcomeMessage": "Welcome to Luminix",
    "healthOverview": "Health Overview",
    "healthScore": "Health Score",
    "activity": "Activity",
    "steps": "Steps",
    "calories": "Calories",
    "heartRate": "Heart Rate",
    "bloodPressure": "Blood Pressure",
    "sleep": "Sleep",
    "weight": "Weight",
    "bmi": "BMI",
    "bodyMeasurements": "Body Measurements",
    "workoutStatistics": "Workout Statistics",
    "recentActivity": "Recent Activity",
    "recommendations": "Recommendations",
    "healthInsights": "Health Insights",
    "warnings": "Warnings",
    "trends": "Trends",
    "progress": "Progress",
    "connectWithLumi": "CONNECT WITH",
    "lumiWord": "LUMI.",
    "wearableSync": "CHAMBER 07 // WEARABLE & BLUETOOTH SYNC",
    "wearableSub": "Pair Authentic Health Hardware: Bluetooth BLE Smartwatch / Heart Rate Monitor, Dedicated Blood Pressure Cuff, or Mobile Companion.",
    "bloodOxygen": "BLOOD OXYGEN (SpO2)",
    "bloodPressureMeasurement": "LATEST AVAILABLE BP MEASUREMENT",
    "restingPulse": "RESTING PULSE",
    "hrv": "HEART RATE VAR (HRV)",
    "sleepArchitecture": "SLEEP ARCHITECTURE",
    "stepGoalCalories": "STEP GOAL & CALORIES",
    "fetchLatestData": "FETCH LATEST DATA",
    "startLiveMonitoring": "START LIVE MONITORING",
    "stopLiveMonitoring": "STOP LIVE MONITORING",
    "pairPhone": "PAIR PHONE",
    "pairBluetoothDevice": "PAIR BLUETOOTH DEVICE",
    "scanBle": "SCAN BLE",
    "switchDevice": "SWITCH DEVICE",
    "disconnect": "DISCONNECT",
    "noDeviceConnected": "No Health Device Connected",
    "noRecentMeasurement": "No recent measurement",
    "liveTelemetryStream": "LIVE TELEMETRY STREAM",
    "awaitingHardwareLink": "AWAITING HARDWARE LINK",
    "processingTelemetry": "PROCESSING TELEMETRY…",
    "realHardwareLinked": "REAL HARDWARE LINKED",
    "noRealDeviceConnected": "NO REAL DEVICE CONNECTED",
    "unlinkRealDevice": "UNLINK REAL DEVICE",
    "pairRealDevice": "PAIR REAL DEVICE",
    "profileSyncTitle": "Synchronized Biometric Profile & Metabolic Engine",
    "editBiometricProfile": "EDIT BIOMETRIC PROFILE",
    "registeredAge": "REGISTERED AGE",
    "bodyWeight": "BODY WEIGHT",
    "bodyHeight": "BODY HEIGHT",
    "calorieIntake": "CALORIE INTAKE",
    "basalRate": "BASAL RATE (BMR)",
    "heroTitle": "Where stillness reveals what the eyes cannot see.",
    "sanmonTitle": "The Sanmon",
    "sanmonSubtitle": "山門 // BIOMECHANICAL VISION",
    "sanmonHeading": "Charred cypress, worn stone, 60 FPS vision tracking.",
    "sanmonLead": "Luminix begins where the physical body meets algorithmic precision: 33 skeletal landmarks tracked at 60 frames per second directly in the browser with zero cloud latency. Biomechanical vector geometry measures joint flexion, spinal deviation, and lateral shoulder tilt in real-time.",
    "sanmonBody": "Move through squats, overhead presses, or lunges with immediate audible and visual risk indicators. Nothing is hidden. Every kinematic degree is rendered live.",
    "sanmonCta": "Cross the threshold (Launch Live Pose)",
    "sanmonStatModules": "Modules",
    "sanmonStatFps": "FPS Vision",
    "sanmonStatAsanas": "Yoga Asanas",
    "sanmonStatIntel": "Intelligence",
    "gardensTitle": "Still Gardens",
    "gardensSubtitle": "庭園 // PERFORMANCE CHAMBERS",
    "cardApproach": "Approach",
    "cardApproachSub": "Adaptive Gym Splits • Auto Reps",
    "cardApproachDesc": "Biomechanical 5-phase rep state machine, automated 60s rest intervals, and muscle splits.",
    "cardLanterns": "Lanterns",
    "cardLanternsSub": "17 Guided Asanas • Hold Timer",
    "cardLanternsDesc": "Real-time posture validation, target muscle highlights, and countdown hold verification.",
    "cardMoonwater": "Moonwater",
    "cardMoonwaterSub": "Metabolic Matrix • Food Engine",
    "cardMoonwaterDesc": "Dual BMR formulas, TDEE, macro target ratios, and Gemini AI natural language food scanning.",
    "craftTitle": "Sacred Craft",
    "craftSubtitle": "手業 // SYSTEM CURRICULUM",
    "craftHeading": "Six disciplines. One connected health intelligence.",
    "craftLead": "Each module functions as an autonomous engineering discipline, connected by unified biometric event telemetry and clinical precision.",
    "disciplineVision": "Biomechanical Vision",
    "disciplineVisionDesc": "Real-time 33-joint skeleton tracking, spine inclination telemetry & risk alarms.",
    "disciplineStrength": "Adaptive Strength",
    "disciplineStrengthDesc": "Categorized muscle group splits, automated camera rep counter, and rest timer.",
    "disciplineEquilibrium": "Asana Equilibrium",
    "disciplineEquilibriumDesc": "17 structured yoga poses with joint angle validation and posture hold check.",
    "disciplineAlchemy": "Metabolic Alchemy",
    "disciplineAlchemyDesc": "Precision Mifflin-St Jeor and Harris-Benedict BMR, TDEE, and macro targets.",
    "disciplineSustenance": "Daily Sustenance",
    "disciplineSustenanceDesc": "Daily meal logging, hydration water tracker, and Gemini AI natural language food analysis.",
    "disciplineOracle": "The Oracle",
    "disciplineOracleDesc": "Luna AI conversational coaching, injury recovery advice, and custom fitness regimens.",
    "oracleTitle": "The Oracle",
    "oracleSubtitle": "知性 // CONVERSATIONAL REASONING",
    "oracleHeading": "Ask Luna anything about training, biomechanics or diet.",
    "oracleLead": "Powered by multi-model Gemini fallbacks, Luna provides conversational coaching, kinematic posture analysis, and personalized metabolic strategies.",
    "oraclePrompt1Label": "Hypertrophy Macro Split",
    "oraclePrompt1Desc": "Calculate protein, carb and fat targets tailored to progressive overload.",
    "oraclePrompt2Label": "Squat Kinematics Fix",
    "oraclePrompt2Desc": "Biomechanical advice for knee flexion and maintaining neutral spine.",
    "oraclePrompt3Label": "7-Day Recovery Diet",
    "oraclePrompt3Desc": "Nutrient-dense recipes to accelerate tissue repair and joint mobility.",
    "oracleCta": "OPEN LUNA AI CONVERSATION →",
    "afterlightEyebrow": "Chapter 05 — Afterlight // Clinical Dossier",
    "afterlightTitle": "Afterlight",
    "afterlightLead": "The gate does not close behind you. Take your health intelligence wherever you go: export clinical PDF reports, dispatch email dossiers, or generate HD explainer video briefings.",
    "afterlightCta": "Open Export Studio",
    "faqTitle": "Inquiries",
    "faqSubtitle": "質疑 // CLINICAL & BIOMECHANICAL FAQS",
    "faqHeading": "Biomechanical Precision & System Architecture.",
    "faqLead": "Everything you need to know about zero-server privacy, 60 FPS vision telemetry, kinematic joints, and clinical exports.",
    "faqQ1": "How does Luminix maintain 60 FPS computer vision without sending camera feeds to servers?",
    "faqA1": "Luminix executes 100% of its MediaPipe machine learning inference client-side inside your browser via WebAssembly (WASM) and WebGL hardware acceleration. Not a single pixel or video stream is ever uploaded to external servers. Only anonymous mathematical joint angles and repetition counters can be optionally synchronized with your encrypted vault.",
    "faqQ2": "What camera hardware is required for 33-point biomechanics?",
    "faqA2": "Any standard 720p or 1080p webcam, laptop integrated camera, or smartphone mobile browser camera works natively. Luminix adaptive smoothing algorithms normalize frame jitter and lighting variations in real time, delivering consistent 60 FPS pose estimation.",
    "faqQ3": "How does the Adaptive Gym Engine detect discrete rep states?",
    "faqA3": "Rather than simple peak-detection, our engine uses deterministic finite state machines (FSM) measuring vector dot-products between proximal and distal limbs (e.g. hip-knee-ankle for squats, shoulder-elbow-wrist for push-ups and bicep curls). Reps are only incremented when complete eccentric depth and concentric lockout are achieved.",
    "faqQ4": "How are Basal Metabolic Rate (BMR) and macro splits calculated?",
    "faqA4": "We apply the clinically validated Revised Harris-Benedict and Mifflin-St Jeor metabolic equations, scaled by your physical activity multiplier (PAL) to derive Total Daily Energy Expenditure (TDEE). Protein, carbohydrate, and fat targets are then dynamically balanced to match your progressive overload goals.",
    "faqQ5": "Are clinical PDF reports and health exports secure?",
    "faqA5": "All exported PDF dossiers adhere to institutional health summary guidelines. Client data is protected by Argon2 password hashing, JWT HS256 authentication tokens, and our backend Web Application Firewall (WAF) threat shield with rate-limiting.",
    "architectTitle": "The Architect",
    "architectSubtitle": "創造主 // SYSTEM CREATOR & CRAFT",
    "architectHeading": "Crafted by Ram Charan Teja with Uncompromising Vision.",
    "architectLead": "Behind Luminix is an obsession with merging high-frequency client-side computer vision, clinical biomechanics, and a bespoke Kyoto cyber aesthetic into an autonomous health intelligence platform.",
    "architectRole": "⚡ ARCHITECT",
    "architectTagline": "Full-Stack AI Systems Architect, Computer Vision Engineer & Creative Technologist. Sole creator and builder of the Luminix ecosystem.",
    "architectViewDossier": "View Full Creator Dossier & Tech Arsenal",
    "architectDonate": "Donate to Creator",
    "peekSanmonStudio": "SANMON — 60 FPS Vision Studio",
    "peekPreviewLabel": "Preview: Sanmon Vision Camera",
    "architectSupport": "Architect & Support",
    "viewCreatorDossier": "View Full Creator Dossier & Tech Arsenal",
    "donateCreator": "Donate to Creator",
    "metabolicMatrix": "Metabolic Matrix & BMR",
    "workoutProgress": "Workout Progress",
    "workout": "Workout",
    "autoSync": "Auto Sync",
    "memberSince": "Member Since",
    "lastActive": "Last Active"
  },
  "nav": {
    "system": "SYSTEM",
    "livePose": "LIVE POSE",
    "yoga": "YOGA",
    "gym": "GYM",
    "nutrition": "NUTRITION",
    "food": "FOOD",
    "lunaExport": "LUNA & EXPORT",
    "connect": "CONNECT",
    "about": "ABOUT",
    "vision": "Vision",
    "metrics": "Metrics",
    "luna": "Luna",
    "sync": "Sync",
    "sanctuarySystem": "Sanctuary System",
    "livePoseEngine": "Live Pose Engine (60 FPS)",
    "adaptiveGymEngine": "Adaptive Gym Engine",
    "sacredYogaAsanas": "17 Sacred Yoga Asanas",
    "metabolicMatrix": "Metabolic Matrix & BMR",
    "foodHydration": "Food & Hydration Tracking",
    "lunaAIClinical": "Luna AI & Clinical Studio",
    "connectWearables": "Connect with Lumi (Wearables)",
    "aboutVision": "About Luminix & Vision",
    "quickShortcuts": "QUICK SHORTCUTS",
    "searchShortcut": "Search (⌘K)",
    "toggleTheme": "Toggle Theme",
    "chambersDisciplines": "CHAMBERS & DISCIPLINES",
    "architectSupport": "ARCHITECT & SUPPORT",
    "disciplineDirectory": "LUMINIX // DISCIPLINE DIRECTORY",
    "viewCreatorDossier": "View Creator Dossier",
    "donateCreator": "Donate & Support Creator",
    "sanctuary": "Sanctuary"
  },
  "gym": {
    "title": "Adaptive Gym Engine",
    "pageTitle": "Adaptive Gym Engine — Kinetic Discrete State Counter | Luminix",
    "moduleTag": "MODULE 02 // KINETIC DISCRETE STATE COUNTER",
    "workout": "Workout",
    "exercise": "Exercise",
    "sets": "Sets",
    "reps": "Reps",
    "repetitions": "Repetitions",
    "weight": "Weight",
    "rest": "Rest",
    "duration": "Duration",
    "difficulty": "Difficulty",
    "muscleGroup": "Muscle Group",
    "strength": "Strength",
    "progress": "Progress",
    "workoutHistory": "Workout History",
    "startWorkout": "Start Workout",
    "pauseWorkout": "Pause Workout",
    "finishWorkout": "Finish Workout",
    "resumeWorkout": "Resume Workout",
    "stopWorkout": "Stop Workout",
    "exerciseInstructions": "Exercise Instructions",
    "recommendations": "Recommendations",
    "safetyWarnings": "Safety Warnings",
    "repCounter": "Rep Counter",
    "currentReps": "Current Reps",
    "targetReps": "Target Reps",
    "formScore": "Form Score",
    "excellent": "Excellent",
    "good": "Good",
    "fair": "Fair",
    "poor": "Poor",
    "selectExercise": "Select Exercise",
    "noExerciseSelected": "No exercise selected",
    "squats": "Squats",
    "pushups": "Push-ups",
    "lunges": "Lunges",
    "bicepCurls": "Bicep Curls",
    "shoulderPress": "Shoulder Press",
    "deadlifts": "Deadlifts",
    "male": "Male",
    "female": "Female",
    "other": "Other"
  },
  "luna": {
    "title": "Luna AI & Clinical Studio",
    "pageTitle": "Luna AI & Clinical Studio — Health Intelligence & Reporting | Luminix",
    "moduleTag": "MODULE 07 // CLINICAL INTELLIGENCE & EXPORT STUDIO",
    "heading": "LUNA AI & <span class=\"text-vermilion font-display font-extrabold\">CLINICAL STUDIO.</span>",
    "subtitle": "Conversational health intelligence, personalized meal telemetry, and automated engineering-grade clinical PDF exports.",
    "downloadPDF": "DOWNLOAD CLINICAL PDF ↓",
    "connectWearables": "CONNECT WEARABLES →",
    "aiModelLabel": "GEMINI AI MODEL:",
    "aiModelActive": "gemini-flash-lite-latest (ACTIVE)",
    "apiKeySettings": "🔑 API Key Settings",
    "customApiKey": "CUSTOM GEMINI API KEY",
    "apiKeyDescription": "Luna AI connects directly to Google Gemini using this API key. Changes apply across Luna Chat and the Smart Fridge automatically.",
    "apiKeyPlaceholder": "Paste your Gemini API key (AQ... or AIza...)",
    "saveKey": "SAVE KEY",
    "resetKey": "RESET",
    "greeting": "Hello! I am Luna, your Luminix health & nutrition intelligence assistant. You can ask me anything about:",
    "greetingNutrition": "<strong>Nutrition & Diet:</strong> Optimal macros, meal planning, caloric deficits, protein synthesis, food tracking.",
    "greetingMealAnalysis": "<strong>Meal Analysis:</strong> Type any meal (e.g. <em>\"200g chicken, quinoa, and avocado\"</em>) for instant macro breakdowns.",
    "greetingExercise": "<strong>Exercise & Biomechanics:</strong> Posture correction, gym programming, and yoga form analysis.",
    "greetingWearable": "<strong>Wearable Telemetry:</strong> Ask about your live SpO2, sleep recovery, blood pressure, or step goal calories.",
    "quickOptimalProtein": "🥗 Optimal Protein & Macros",
    "quickAnalyzeMeal": "🥑 Analyze Meal",
    "quickMealPlan": "📋 1-Day Meal Plan",
    "quickSleepVitals": "💤 Sleep & Vitals",
    "inputPlaceholder": "Ask Luna any nutrition, food, or workout questions...",
    "send": "SEND",
    "youLabel": "You",
    "lunaLabel": "Luna AI",
    "thinking": "Luna AI is synthesizing response with Google Gemini...",
    "clinicalExport": "CLINICAL EXPORT",
    "pdfEngine": "PDF ENGINE v4.2",
    "automatedReport": "Automated Biometric Report",
    "reportDescription": "Compiles posture kinematics, BMI/BMR, wearable telemetry, and custom nutrition plans into an engineering-grade PDF document.",
    "downloadReport": "DOWNLOAD PDF REPORT ↓",
    "emailDelivery": "Email Delivery",
    "emailReportDesc": "Send your compiled clinical report directly to your email.",
    "emailPlaceholder": "your@email.com",
    "sendReport": "SEND REPORT →",
    "wearableSnapshot": "Wearable Snapshot",
    "noDeviceConnected": "No device connected"
  },
  "notifications": {
    "success": "Success",
    "warning": "Warning",
    "error": "Error",
    "info": "Information",
    "healthAlert": "Health Alert",
    "deviceConnected": "Device connected successfully",
    "deviceDisconnected": "Device disconnected",
    "connectionFailed": "Connection failed",
    "syncComplete": "Synchronization complete",
    "syncFailed": "Synchronization failed",
    "dataExported": "Data exported successfully",
    "reportGenerated": "Report generated successfully",
    "reportFailed": "Report generation failed",
    "emailSent": "Email sent successfully",
    "emailFailed": "Failed to send email",
    "profileUpdated": "Profile updated successfully",
    "profileUpdateFailed": "Failed to update profile",
    "settingsSaved": "Settings saved",
    "workoutComplete": "Workout complete!",
    "sessionEnded": "Session ended",
    "cameraAccessDenied": "Camera access denied",
    "cameraAccessGranted": "Camera access granted",
    "biometricAlert": "BIOMETRIC LIMIT EXCEEDED",
    "biometricAlertDesc": "Vitals have exceeded safety thresholds. Resting baseline required.",
    "acknowledgeMonitor": "ACKNOWLEDGE & MONITOR",
    "syncRealTelemetry": "SYNC REAL TELEMETRY",
    "watchTelemetryTriggered": "⌚ WATCH TELEMETRY TRIGGERED",
    "kyotoSpringRelease": "KYOTO SPRING RELEASE",
    "releaseDescription": "60 FPS Camera Biomechanics & Adaptive Discrete State Counter v4.2 Active.",
    "launchVision": "LAUNCH VISION →",
    "cookieTitle": "BIOMETRIC SOVEREIGNTY & COOKIES",
    "cookieBody": "We enforce zero camera uploads and local WebAssembly telemetry. We use strictly essential cookies for secure token sessions and optional client telemetry to optimize frame smoothness.",
    "acceptAll": "ACCEPT ALL",
    "essentialOnly": "ESSENTIAL ONLY",
    "customize": "CUSTOMIZE",
    "confirmAction": "Confirm Action",
    "areYouSure": "Are you certain you wish to proceed?",
    "proceed": "Proceed",
    "shareLuminix": "SHARE LUMINIX INTELLIGENCE",
    "shareDescription": "Transmit the autonomous 60 FPS private health platform across your network.",
    "contactTitle": "Contact Architect & Support",
    "contactTag": "ENCRYPTED TRANSMISSION",
    "nameCallsign": "NAME / CALLSIGN",
    "emailAddress": "EMAIL ADDRESS",
    "inquiryType": "INQUIRY TYPE",
    "message": "MESSAGE",
    "clinicalIntegration": "Clinical Integration & Biomechanics",
    "computerVision": "Computer Vision & Latency",
    "productFeedback": "Product Feedback & Feature Request",
    "creatorTribute": "Creator Tribute / Sponsorship",
    "securityBugReport": "Security / Bug Report",
    "messagePlaceholder": "Specify your inquiry, telemetry feedback, or institutional request...",
    "telemetryPreferences": "Telemetry & Storage Preferences",
    "telemetryDescription": "Configure your browser-side consent parameters below.",
    "essentialAuth": "Essential Authentication (JWT)",
    "essentialAuthDesc": "Required for login sessions & cryptographic token security.",
    "clientTelemetry": "Client Telemetry & Frame Analytics",
    "clientTelemetryDesc": "Measures 60 FPS performance, MediaPipe load times, and error telemetry.",
    "localCaching": "Local Unit & Theme Caching",
    "localCachingDesc": "Persists dark/white mode and metric unit selections locally.",
    "savePreferences": "SAVE PREFERENCES"
  },
  "nutrition": {
    "title": "Metabolic Matrix & Nutrition",
    "pageTitle": "Metabolic Matrix & Nutrition Calculator | Luminix",
    "moduleTag": "MODULE 04 // METABOLIC INTELLIGENCE MATRIX",
    "calories": "Calories",
    "protein": "Protein",
    "carbohydrates": "Carbohydrates",
    "carbs": "Carbs",
    "fat": "Fat",
    "fiber": "Fiber",
    "water": "Water",
    "meals": "Meals",
    "breakfast": "Breakfast",
    "lunch": "Lunch",
    "dinner": "Dinner",
    "snacks": "Snacks",
    "food": "Food",
    "nutritionAnalysis": "Nutrition Analysis",
    "recommendations": "Recommendations",
    "mealSuggestions": "Meal Suggestions",
    "dailyTarget": "Daily Target",
    "progress": "Progress",
    "bmr": "BMR",
    "tdee": "TDEE",
    "bmi": "BMI",
    "basalMetabolicRate": "Basal Metabolic Rate",
    "totalDailyEnergy": "Total Daily Energy Expenditure",
    "bodyMassIndex": "Body Mass Index",
    "macroSplit": "Macro Split",
    "caloricDeficit": "Caloric Deficit",
    "caloricSurplus": "Caloric Surplus",
    "maintenance": "Maintenance",
    "calculate": "Calculate",
    "age": "Age",
    "weight": "Weight",
    "height": "Height",
    "gender": "Gender",
    "male": "Male",
    "female": "Female",
    "nonBinary": "Non-Binary / Custom",
    "activityLevel": "Activity Level",
    "sedentary": "Sedentary",
    "lightlyActive": "Lightly Active",
    "moderatelyActive": "Moderately Active",
    "veryActive": "Very Active",
    "extremelyActive": "Extremely Active",
    "goal": "Goal",
    "loseFat": "Lose Fat",
    "maintain": "Maintain",
    "buildMuscle": "Build Muscle",
    "underweight": "Underweight",
    "normal": "Normal",
    "overweight": "Overweight",
    "obese": "Obese",
    "foodTracker": "Food Tracker",
    "addMeal": "Add Meal",
    "logFood": "Log Food",
    "hydration": "Hydration",
    "waterIntake": "Water Intake",
    "glasses": "glasses",
    "dailyGoal": "Daily Goal",
    "remaining": "Remaining",
    "consumed": "Consumed"
  },
  "pose": {
    "title": "60 FPS Live Pose Engine",
    "pageTitle": "Live Pose Engine (60 FPS) — Biomechanical Kinematics | Luminix",
    "moduleTag": "MODULE 01 // BIOMECHANICAL KINEMATICS ENGINE",
    "poseAnalysis": "Pose Analysis",
    "startAnalysis": "Start Analysis",
    "stopAnalysis": "Stop Analysis",
    "cameraPermissions": "Camera Permission Required",
    "cameraInstructions": "Allow camera access to begin real-time pose detection.",
    "grantAccess": "Grant Camera Access",
    "bodyTracking": "Body Tracking",
    "poseDetection": "Pose Detection",
    "jointTracking": "Joint Tracking",
    "movementTracking": "Movement Tracking",
    "posture": "Posture",
    "form": "Form",
    "alignment": "Alignment",
    "riskDetection": "Risk Detection",
    "riskLevel": "Risk Level",
    "movementQuality": "Movement Quality",
    "recommendations": "Recommendations",
    "warnings": "Warnings",
    "exerciseFeedback": "Exercise Feedback",
    "analysisResults": "Analysis Results",
    "processing": "Processing...",
    "analysisComplete": "Analysis Complete",
    "fps": "FPS",
    "confidence": "Confidence",
    "jointAngles": "Joint Angles",
    "toggleMirror": "Toggle Mirror",
    "toggleAngles": "Toggle Angle Labels",
    "riskAlert": "RISK ALERT",
    "highRisk": "High Risk",
    "mediumRisk": "Medium Risk",
    "lowRisk": "Low Risk",
    "safeForm": "Safe Form",
    "sessionDuration": "Session Duration",
    "alertCount": "Alert Count"
  },
  "settings": {
    "title": "Settings",
    "profile": "Profile",
    "account": "Account",
    "language": "Language",
    "appearance": "Appearance",
    "theme": "Theme",
    "darkMode": "Dark Mode",
    "lightMode": "Light Mode",
    "notifications": "Notifications",
    "privacy": "Privacy",
    "security": "Security",
    "connectedDevices": "Connected Devices",
    "healthDevices": "Health Devices",
    "data": "Data",
    "aiSettings": "AI Settings",
    "logout": "Logout",
    "deleteAccount": "Delete Account",
    "deleteAccountConfirm": "Are you sure you want to delete your account? This action cannot be undone.",
    "saveChanges": "Save Changes",
    "changesSaved": "Changes saved successfully",
    "fullName": "FULL NAME / CODENAME",
    "age": "AGE (YEARS)",
    "bodyWeight": "BODY WEIGHT (KG)",
    "heightCm": "HEIGHT (CM)",
    "gender": "GENDER",
    "selectGender": "Select Gender",
    "primaryGoal": "PRIMARY BIOMECHANICAL GOAL",
    "hypertrophy": "Hypertrophy & Lean Muscle Mass",
    "fatLoss": "Aggressive Caloric Deficit & Fat Loss",
    "biomechanics": "Zero-Lag Pose Kinematics & Posture",
    "endurance": "Cardiovascular Health & Restorative Sleep",
    "customProfilePicture": "Custom Profile Picture",
    "storedSecurely": "Stored securely in Firebase Storage Vault.",
    "selectAvatarImage": "SELECT AVATAR IMAGE…",
    "saveInitialize": "SAVE & INITIALIZE VAULT ✓",
    "personalizeSanctuary": "PERSONALIZE YOUR",
    "sanctuaryWord": "SANCTUARY.",
    "biometricRegistry": "SYSTEM // BIOMETRIC REGISTRY",
    "biometricDescription": "Register your biometric baseline, custom avatar, and weight for real-time calorie telemetry.",
    "terms": "Terms of Service",
    "accessibility": "Accessibility",
    "reconfigure": "Reconfigure"
  },
  "yoga": {
    "title": "17 Sacred Yoga Asanas",
    "pageTitle": "17 Sacred Yoga Asanas — Kinematic Form Guidance | Luminix",
    "moduleTag": "MODULE 03 // SACRED POSTURE KINEMATICS",
    "pose": "Pose",
    "breathing": "Breathing",
    "duration": "Duration",
    "difficulty": "Difficulty",
    "instructions": "Instructions",
    "startSession": "Start Session",
    "endSession": "End Session",
    "beginner": "Beginner",
    "intermediate": "Intermediate",
    "advanced": "Advanced",
    "safetyWarnings": "Safety Warnings",
    "recommendations": "Recommendations",
    "progress": "Progress",
    "holdTime": "Hold Time",
    "holdDuration": "Hold Duration",
    "poseGuide": "Pose Guide",
    "alignmentTips": "Alignment Tips",
    "benefits": "Benefits",
    "asanaLibrary": "Asana Library",
    "selectedPose": "Selected Pose",
    "formAccuracy": "Form Accuracy",
    "breathingPattern": "Breathing Pattern",
    "inhale": "Inhale",
    "exhale": "Exhale",
    "hold": "Hold",
    "relax": "Relax",
    "warrior": "Warrior II"
  }
};

// ── i18n State ────────────────────────────────────────────────────
const _i18nState = {
    currentLang: 'en',
    currentLocale: 'en-US',
    currentDirection: 'ltr',
    translations: {
        'en': DEFAULT_EN_TRANSLATIONS
    },
    loadingPromises: {},    // prevent duplicate fetches
    listeners: [],          // onChange callbacks
    initialized: false
};

// Translation file namespaces per language
const I18N_NAMESPACES = [
    'common', 'auth', 'dashboard', 'nav', 'pose', 'gym', 'yoga',
    'nutrition', 'luna', 'settings', 'notifications'
];

// ── Utility: Deep object access by dot-path ───────────────────────
function _getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
        if (result == null || typeof result !== 'object') return undefined;
        result = result[key];
    }
    return result;
}

// ── Core Translation Function ─────────────────────────────────────
/**
 * Translate a key with optional interpolation.
 * @param {string} key — Dot-path translation key, e.g. "gym.startWorkout"
 * @param {Object} [params] — Interpolation params, e.g. { count: 5 }
 * @returns {string}
 */
function t(key, params) {
    const lang = _i18nState.currentLang;
    let value;

    // 1. Try current language
    if (_i18nState.translations[lang]) {
        value = _getNestedValue(_i18nState.translations[lang], key);
    }

    // 2. Fallback to English
    if (value === undefined && lang !== 'en' && _i18nState.translations['en']) {
        value = _getNestedValue(_i18nState.translations['en'], key);
    }

    // 3. Ultimate fallback — return the key itself (never expose undefined)
    if (value === undefined) {
        if (lang !== 'en') {
            console.warn(`[i18n] Missing translation: "${key}" for locale "${lang}"`);
        }
        // Convert "gym.startWorkout" to "Start Workout" as display fallback
        const lastPart = key.split('.').pop() || key;
        return lastPart.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    }

    // 4. Interpolation: replace {{param}} placeholders
    if (params && typeof value === 'string') {
        return value.replace(/\{\{(\w+)\}\}/g, (_, k) => {
            return params[k] !== undefined ? String(params[k]) : `{{${k}}}`;
        });
    }

    return value;
}

// Make t() globally available
window.t = t;

// ── Load Translation Files ────────────────────────────────────────
async function _loadLanguageTranslations(langCode) {
    if (_i18nState.translations[langCode] && Object.keys(_i18nState.translations[langCode]).length > 0) {
        return _i18nState.translations[langCode];
    }

    // Prevent duplicate parallel loads
    if (_i18nState.loadingPromises[langCode]) {
        return _i18nState.loadingPromises[langCode];
    }

    const loadPromise = (async () => {
        let merged = {};

        // 1. Try single unified language file first (support both /locales and /static/locales)
        const possibleUrls = [
            `/locales/${langCode}.json?v=6.0`,
            `/static/locales/${langCode}.json?v=6.0`
        ];
        for (const unifiedUrl of possibleUrls) {
            try {
                const unifiedRes = await fetch(unifiedUrl);
                if (unifiedRes.ok) {
                    const unifiedData = await unifiedRes.json();
                    if (unifiedData && typeof unifiedData === 'object' && Object.keys(unifiedData).length > 0) {
                        merged = unifiedData;
                        _i18nState.translations[langCode] = merged;
                        delete _i18nState.loadingPromises[langCode];
                        return;
                    }
                }
            } catch (_) {}
        }

        // 2. Fallback: load individual namespace files
        const basePaths = ['/locales/' + langCode, '/static/locales/' + langCode];
        for (const basePath of basePaths) {
            let loadedAny = false;
            for (const ns of I18N_NAMESPACES) {
                try {
                    const url = `${basePath}/${ns}.json?v=6.0`;
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        Object.assign(merged, data);
                        loadedAny = true;
                    }
                } catch (_) {}
            }
            if (loadedAny) break;
        }

        _i18nState.translations[langCode] = merged;
        delete _i18nState.loadingPromises[langCode];
    })();

    _i18nState.loadingPromises[langCode] = loadPromise;
    return loadPromise;
}

// ── Get Language Config ───────────────────────────────────────────
function getLangConfig(code) {
    return LUMINIX_LANGUAGES.find(l => l.code === code) || LUMINIX_LANGUAGES[0];
}

function getCurrentLang() {
    return _i18nState.currentLang;
}

function getCurrentLocale() {
    return _i18nState.currentLocale;
}

function getCurrentDirection() {
    return _i18nState.currentDirection;
}

function getSupportedLanguages() {
    return LUMINIX_LANGUAGES;
}

// ── Apply RTL / LTR Direction ─────────────────────────────────────
function _applyDirection(direction) {
    const html = document.documentElement;
    html.setAttribute('dir', direction);
    html.setAttribute('lang', _i18nState.currentLang);

    // Remove any previous luminix-lang-* classes
    html.className = html.className.replace(/\bluminix-lang-\w+\b/g, '').trim();
    html.classList.add(`luminix-lang-${_i18nState.currentLang}`);

    // Toggle RTL class for CSS styling hooks
    if (direction === 'rtl') {
        document.body.classList.add('luminix-rtl');
        document.body.classList.remove('luminix-ltr');
    } else {
        document.body.classList.add('luminix-ltr');
        document.body.classList.remove('luminix-rtl');
    }
}

// ── Update All Static HTML Elements with data-i18n ────────────────
function _updateStaticTranslations() {
    // Elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (!key) return;
        if (key.startsWith('[placeholder]')) {
            el.placeholder = t(key.slice(13));
        } else if (key.startsWith('[title]')) {
            el.title = t(key.slice(7));
        } else if (key.startsWith('[aria]')) {
            el.setAttribute('aria-label', t(key.slice(6)));
        } else {
            el.textContent = t(key);
        }
    });

    // Update user profile pill in header
    try { window.updateUserProfileUI?.(); } catch (_) {}

    // Elements with data-i18n-placeholder get placeholder replaced
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) {
            el.placeholder = t(key);
        }
    });

    // Elements with data-i18n-title get title replaced
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) {
            el.title = t(key);
        }
    });

    // Elements with data-i18n-aria-label
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        if (key) {
            el.setAttribute('aria-label', t(key));
        }
    });

    // Elements with data-i18n-html get innerHTML replaced (use carefully)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (key) {
            el.innerHTML = t(key);
        }
    });
}

// ── Language Persistence ──────────────────────────────────────────
const I18N_STORAGE_KEY = 'luminix_language_preference';

function _saveLanguagePreference(langCode, locale) {
    try {
        localStorage.setItem(I18N_STORAGE_KEY, JSON.stringify({
            language: langCode,
            locale: locale,
            timestamp: Date.now()
        }));
    } catch (_) {}

    // For authenticated users, also save to profile in Firebase
    if (window.luminixAuth?.isAuthenticated?.() && window.luminixFirebase?.saveLanguagePreference) {
        window.luminixFirebase.saveLanguagePreference(langCode, locale);
    }
}

function _getSavedLanguagePreference() {
    try {
        const raw = localStorage.getItem(I18N_STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (data && data.language) return data;
        }
    } catch (_) {}
    return null;
}

// ── Browser Language Detection ────────────────────────────────────
function _detectBrowserLanguage() {
    try {
        const browserLang = navigator.language || navigator.languages?.[0] || '';
        if (!browserLang) return null;

        const langCode = browserLang.split('-')[0].toLowerCase();

        // Direct match
        const directMatch = LUMINIX_LANGUAGES.find(l => l.code === langCode);
        if (directMatch) return directMatch.code;

        // Locale-based match (e.g. "fil-PH" → "fil")
        const localeMatch = LUMINIX_LANGUAGES.find(l => 
            browserLang.toLowerCase().startsWith(l.code.toLowerCase())
        );
        if (localeMatch) return localeMatch.code;

    } catch (_) {}
    return null;
}

// ── Change Language ───────────────────────────────────────────────
/**
 * Switch the entire application to a new language.
 * @param {string} langCode — Language code (e.g. 'te', 'de', 'ar')
 * @returns {Promise<void>}
 */
async function setLanguage(langCode) {
    const config = getLangConfig(langCode);
    if (!config) {
        console.warn(`[i18n] Unsupported language code: "${langCode}"`);
        return;
    }

    // Load translations for the target language
    await _loadLanguageTranslations(config.code);

    // Update state
    _i18nState.currentLang = config.code;
    _i18nState.currentLocale = config.locale;
    _i18nState.currentDirection = config.direction;

    // Apply RTL/LTR
    _applyDirection(config.direction);

    // Persist preference
    _saveLanguagePreference(config.code, config.locale);

    // Update static translations in DOM
    _updateStaticTranslations();

    // Update language selector display
    _updateLanguageSelectorDisplay();

    // Notify all registered listeners
    _i18nState.listeners.forEach(fn => {
        try { fn(config.code, config.locale, config.direction); } catch (e) {
            console.error('[i18n] Listener error:', e);
        }
    });

    // Also dispatch custom DOM event for decoupled modules
    try {
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: config.code, locale: config.locale, direction: config.direction }
        }));
    } catch (_) {}

    // Re-render current view if nav function exists
    if (window.currentView && window.nav) {
        window.nav(window.currentView);
    }
}

// ── Register Language Change Listener ─────────────────────────────
function onLanguageChange(callback) {
    if (typeof callback === 'function') {
        _i18nState.listeners.push(callback);
    }
}

// ── Locale-Aware Formatting ───────────────────────────────────────
function formatNumber(value, options) {
    try {
        return new Intl.NumberFormat(_i18nState.currentLocale, options).format(value);
    } catch (_) {
        return String(value);
    }
}

function formatDate(date, options) {
    try {
        const d = date instanceof Date ? date : new Date(date);
        return new Intl.DateTimeFormat(_i18nState.currentLocale, options).format(d);
    } catch (_) {
        return String(date);
    }
}

function formatTime(date, options) {
    try {
        const d = date instanceof Date ? date : new Date(date);
        return new Intl.DateTimeFormat(_i18nState.currentLocale, {
            hour: '2-digit',
            minute: '2-digit',
            ...options
        }).format(d);
    } catch (_) {
        return String(date);
    }
}

// ── Luna AI Language Context ──────────────────────────────────────
/**
 * Get language context for Luna AI system prompt injection.
 */
function getLunaLanguageContext() {
    const config = getLangConfig(_i18nState.currentLang);
    return {
        language: config.code,
        locale: config.locale,
        languageName: config.name,
        nativeName: config.nativeName,
        direction: config.direction,
        systemInstruction: _buildLunaLanguageInstruction(config)
    };
}

function _buildLunaLanguageInstruction(config) {
    if (config.code === 'en') {
        return ''; // No special instruction needed for English
    }
    return `
LANGUAGE DIRECTIVE:
The user's current Luminix language is ${config.nativeName} (${config.name}).
The user's locale is ${config.locale}.

Always respond in ${config.nativeName} (${config.name}) unless the user explicitly requests another language.
Use natural, fluent ${config.name} appropriate for native speakers.
Do not unnecessarily mix English with ${config.name}.
Preserve the original meaning and accuracy of the response.
Preserve numerical values, measurements, units, scientific information, exercise terminology, and health information accurately.
When an English technical term is commonly used in ${config.name}, you may include the English term in parentheses when helpful.
Do not ask the user to translate the response.
Do not tell the user that Luna supports multiple languages.
Follow the selected language automatically.`;
}

// ── Language Selector UI ──────────────────────────────────────────
let _langSelectorOpen = false;

function _createLanguageSelector() {
    // Check if it already exists
    if (document.getElementById('luminix-lang-selector')) return;

    const selectorContainer = document.createElement('div');
    selectorContainer.id = 'luminix-lang-selector';
    selectorContainer.className = 'lang-selector-container';
    selectorContainer.innerHTML = `
        <button type="button" id="lang-selector-trigger" class="lang-selector-trigger header-action-btn" 
                onclick="window.toggleLanguageSelector()" 
                title="Change language" 
                aria-label="Select language" 
                aria-expanded="false" 
                aria-haspopup="listbox">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="lang-globe-icon">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span id="lang-selector-current-name" class="lang-selector-name">English</span>
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" class="lang-chevron">
                <polyline points="6 9 12 15 18 9"/>
            </svg>
        </button>
        <div id="lang-selector-dropdown" class="lang-selector-dropdown hidden" role="listbox" aria-label="Language selection">
            <div class="lang-dropdown-header">
                <span class="lang-dropdown-title">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:6px;">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    Language
                </span>
            </div>
            <div class="lang-search-wrap">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" class="lang-search-icon">
                    <circle cx="11" cy="11" r="6"/>
                    <line x1="20" y1="20" x2="16" y2="16"/>
                </svg>
                <input type="text" id="lang-search-input" class="lang-search-input" 
                       placeholder="Search language..." 
                       autocomplete="off" spellcheck="false"
                       oninput="window._filterLanguages(this.value)"
                       onkeydown="window._handleLangKeydown(event)" />
            </div>
            <ul id="lang-options-list" class="lang-options-list" role="listbox">
                <!-- Populated dynamically -->
            </ul>
        </div>
    `;

    return selectorContainer;
}

function _renderLanguageOptions(filter) {
    const list = document.getElementById('lang-options-list');
    if (!list) return;

    const filterLower = (filter || '').toLowerCase().trim();
    const currentLang = _i18nState.currentLang;

    let html = '';
    let focusIndex = 0;

    LUMINIX_LANGUAGES.forEach((lang, idx) => {
        const matchesFilter = !filterLower || 
            lang.name.toLowerCase().includes(filterLower) || 
            lang.nativeName.toLowerCase().includes(filterLower) ||
            lang.code.toLowerCase().includes(filterLower);

        if (!matchesFilter) return;

        const isActive = lang.code === currentLang;
        html += `
            <li class="lang-option ${isActive ? 'lang-option-active' : ''}" 
                role="option" 
                aria-selected="${isActive}"
                data-lang-code="${lang.code}"
                data-lang-idx="${idx}"
                tabindex="-1"
                onclick="window._selectLanguage('${lang.code}')">
                <span class="lang-option-flag">${lang.flag}</span>
                <span class="lang-option-names">
                    <span class="lang-option-native">${lang.nativeName}</span>
                    <span class="lang-option-english">${lang.name}</span>
                </span>
                ${isActive ? '<span class="lang-option-check">✓</span>' : ''}
            </li>
        `;
    });

    if (!html) {
        html = '<li class="lang-option-empty">No matching languages</li>';
    }

    list.innerHTML = html;
}

function _updateLanguageSelectorDisplay() {
    const config = getLangConfig(_i18nState.currentLang);
    const nameEl = document.getElementById('lang-selector-current-name');
    if (nameEl) {
        nameEl.textContent = config.nativeName;
    }
    // Re-render options to update checkmark
    if (_langSelectorOpen) {
        _renderLanguageOptions(document.getElementById('lang-search-input')?.value || '');
    }
}

// ── Toggle Dropdown ───────────────────────────────────────────────
window.toggleLanguageSelector = function() {
    const dropdown = document.getElementById('lang-selector-dropdown');
    const trigger = document.getElementById('lang-selector-trigger');
    if (!dropdown) return;

    _langSelectorOpen = !_langSelectorOpen;

    if (_langSelectorOpen) {
        dropdown.classList.remove('hidden');
        dropdown.classList.add('lang-dropdown-open');
        trigger?.setAttribute('aria-expanded', 'true');
        _renderLanguageOptions('');
        // Focus search input
        setTimeout(() => {
            const searchInput = document.getElementById('lang-search-input');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
        }, 50);
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', _closeLangSelectorOnOutsideClick);
            document.addEventListener('keydown', _closeLangSelectorOnEsc);
        }, 10);
    } else {
        _closeLanguageSelector();
    }
};

function _closeLanguageSelector() {
    const dropdown = document.getElementById('lang-selector-dropdown');
    const trigger = document.getElementById('lang-selector-trigger');
    if (dropdown) {
        dropdown.classList.add('hidden');
        dropdown.classList.remove('lang-dropdown-open');
    }
    if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
    }
    _langSelectorOpen = false;
    document.removeEventListener('click', _closeLangSelectorOnOutsideClick);
    document.removeEventListener('keydown', _closeLangSelectorOnEsc);
}

function _closeLangSelectorOnOutsideClick(e) {
    const container = document.getElementById('luminix-lang-selector');
    if (container && !container.contains(e.target)) {
        _closeLanguageSelector();
    }
}

function _closeLangSelectorOnEsc(e) {
    if (e.key === 'Escape') {
        _closeLanguageSelector();
    }
}

window._filterLanguages = function(value) {
    _renderLanguageOptions(value);
};

window._handleLangKeydown = function(e) {
    const list = document.getElementById('lang-options-list');
    if (!list) return;
    const items = list.querySelectorAll('.lang-option');
    if (!items.length) return;

    let currentIdx = -1;
    items.forEach((item, idx) => {
        if (item.classList.contains('lang-option-focused')) currentIdx = idx;
    });

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = currentIdx < items.length - 1 ? currentIdx + 1 : 0;
        items.forEach(item => item.classList.remove('lang-option-focused'));
        items[nextIdx].classList.add('lang-option-focused');
        items[nextIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : items.length - 1;
        items.forEach(item => item.classList.remove('lang-option-focused'));
        items[prevIdx].classList.add('lang-option-focused');
        items[prevIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const focusedItem = list.querySelector('.lang-option-focused');
        if (focusedItem) {
            const code = focusedItem.dataset.langCode;
            if (code) window._selectLanguage(code);
        }
    }
};

window._selectLanguage = async function(langCode) {
    _closeLanguageSelector();
    if (langCode === _i18nState.currentLang) return;

    // Show a subtle transition overlay
    const overlay = document.createElement('div');
    overlay.className = 'lang-switch-overlay';
    overlay.innerHTML = `<div class="lang-switch-spinner"></div>`;
    document.body.appendChild(overlay);

    try {
        await setLanguage(langCode);
    } catch (err) {
        console.error('[i18n] Language switch failed:', err);
    }

    // Remove overlay after a brief animation
    setTimeout(() => {
        overlay.classList.add('lang-switch-fade-out');
        setTimeout(() => overlay.remove(), 300);
    }, 200);
};

// ── Inject Selector Into Header ───────────────────────────────────
function _injectLanguageSelectorIntoHeader() {
    // Desktop header: insert before theme toggle
    const headerRight = document.querySelector('.header-right');
    const themeBtn = document.getElementById('header-theme-btn');
    
    if (headerRight && themeBtn && !document.getElementById('luminix-lang-selector')) {
        const selectorEl = _createLanguageSelector();
        themeBtn.parentNode.insertBefore(selectorEl, themeBtn);
    }
}

// ── Initialize i18n System ────────────────────────────────────────
async function initI18n() {
    if (_i18nState.initialized) return;

    // Ensure English base is always populated synchronously
    if (!_i18nState.translations['en'] || Object.keys(_i18nState.translations['en']).length === 0) {
        _i18nState.translations['en'] = DEFAULT_EN_TRANSLATIONS;
    }

    // Determine language: Saved preference → English (strict default)
    let targetLang = 'en';

    // Check user preference if explicitly saved previously
    const savedPref = _getSavedLanguagePreference();
    if (savedPref && savedPref.language) {
        const config = getLangConfig(savedPref.language);
        if (config) targetLang = config.code;
    }

    // Load target language if not English
    if (targetLang !== 'en') {
        await _loadLanguageTranslations(targetLang);
    }

    // Set state
    const config = getLangConfig(targetLang);
    _i18nState.currentLang = config.code;
    _i18nState.currentLocale = config.locale;
    _i18nState.currentDirection = config.direction;

    // Apply direction
    _applyDirection(config.direction);

    // Inject language selector into header
    _injectLanguageSelectorIntoHeader();

    // Update static translations
    _updateStaticTranslations();

    // Update selector display
    _updateLanguageSelectorDisplay();

    _i18nState.initialized = true;

    // If an active dynamic view was already mounted, re-render with fresh translations
    if (window.currentView && window.nav && window.luminixAuth?.isAuthenticated?.()) {
        try {
            window.nav(window.currentView);
        } catch (_) {}
    }

    console.log(`[i18n] Initialized: ${config.name} (${config.code}) — ${config.direction.toUpperCase()}`);
}

// ── Expose API Globally & Start Initialization Immediately ─────────
const _initPromise = initI18n();

window.luminixI18n = {
    ready: _initPromise,
    t,
    setLanguage,
    getCurrentLang,
    getCurrentLocale,
    getCurrentDirection,
    getSupportedLanguages,
    getLangConfig,
    getLunaLanguageContext,
    onLanguageChange,
    formatNumber,
    formatDate,
    formatTime,
    initI18n,
    createLanguageSelector: _createLanguageSelector,
    LUMINIX_LANGUAGES
};

// Also ensure header elements and static text are synced once DOM is completely parsed
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        _injectLanguageSelectorIntoHeader();
        _updateStaticTranslations();
        _updateLanguageSelectorDisplay();
    });
}

#!/usr/bin/env node
/**
 * Luminix Translation Generator
 * Generates all 16 language translation files from the English base.
 * Uses carefully reviewed translations for natural, native-quality text.
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const NAMESPACES = ['common', 'auth', 'dashboard', 'pose', 'gym', 'yoga', 'nutrition', 'luna', 'settings', 'notifications'];

// Load English base
function loadEnglish() {
    const merged = {};
    for (const ns of NAMESPACES) {
        const filePath = path.join(LOCALES_DIR, 'en', `${ns}.json`);
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            Object.assign(merged, data);
        }
    }
    return merged;
}

// ──────────────────────────────────────────────────────────────────
// TRANSLATIONS FOR ALL 15 NON-ENGLISH LANGUAGES
// Each language has carefully crafted, natural translations
// ──────────────────────────────────────────────────────────────────

const TRANSLATIONS = {};

// ── TELUGU (te) ───────────────────────────────────────────────────
TRANSLATIONS['te'] = {
    common: {
        appName: "LUMINIX", tagline: "AI ఫిట్‌నెస్ // వెల్‌నెస్ OS", version: "v4.3",
        save: "భద్రపరచు", cancel: "రద్దు చేయి", confirm: "నిర్ధారించు", delete: "తొలగించు",
        edit: "సవరించు", continue: "కొనసాగించు", back: "వెనుకకు", next: "తదుపరి",
        start: "ప్రారంభించు", stop: "ఆపు", retry: "మళ్ళీ ప్రయత్నించు", close: "మూసివేయి",
        search: "వెతుకు", loading: "లోడ్ అవుతోంది...", processing: "ప్రాసెస్ అవుతోంది...",
        success: "విజయం", failed: "విఫలమైంది", error: "లోపం",
        noData: "డేటా అందుబాటులో లేదు", noResults: "ఫలితాలు కనుగొనబడలేదు",
        somethingWentWrong: "ఏదో తప్పు జరిగింది", tryAgain: "మళ్ళీ ప్రయత్నించండి",
        yes: "అవును", no: "కాదు", ok: "సరే", submit: "సమర్పించు", reset: "రీసెట్",
        download: "డౌన్‌లోడ్", upload: "అప్‌లోడ్", share: "షేర్ చేయి",
        copyLink: "లింక్ కాపీ చేయి", copied: "కాపీ అయింది!",
        viewMore: "మరింత చూడండి", viewLess: "తక్కువ చూడండి", learnMore: "మరింత తెలుసుకోండి",
        explore: "అన్వేషించండి", skipForNow: "ప్రస్తుతానికి దాటవేయి",
        accept: "అంగీకరించు", decline: "తిరస్కరించు", send: "పంపించు",
        transmit: "సందేశం పంపించు →", scrollToTop: "పైకి వెళ్ళండి",
        contact: "సంప్రదించండి", exploreSystem: "వ్యవస్థ అన్వేషించండి ↓",
        exploreSanctuary: "శరణాలయం అన్వేషించండి ↓", scrollToEnter: "ప్రవేశించడానికి స్క్రోల్ చేయండి",
        breadcrumbSanctuary: "శరణాలయం", breadcrumbModules: "మాడ్యూల్స్",
        skipToContent: "విషయానికి వెళ్ళండి"
    },
    auth: {
        login: "ప్రవేశించు", register: "నమోదు చేసుకోండి", createAccount: "ఖాతా సృష్టించు",
        email: "ఇమెయిల్", password: "పాస్‌వర్డ్", confirmPassword: "పాస్‌వర్డ్ నిర్ధారించు",
        forgotPassword: "పాస్‌వర్డ్ మర్చిపోయారా?", resetPassword: "పాస్‌వర్డ్ రీసెట్ చేయి",
        signIn: "సైన్ ఇన్", signOut: "సైన్ అవుట్", signUp: "సైన్ అప్",
        googleSignIn: "Google తో సైన్ ఇన్", githubSignIn: "GitHub తో సైన్ ఇన్",
        rememberMe: "నన్ను గుర్తుంచుకో", loading: "ప్రమాణీకరిస్తోంది...",
        error: "ప్రమాణీకరణ లోపం", invalidCredentials: "చెల్లని ఇమెయిల్ లేదా పాస్‌వర్డ్",
        accountCreated: "ఖాతా విజయవంతంగా సృష్టించబడింది", sessionExpired: "మీ సెషన్ ముగిసింది. దయచేసి మళ్ళీ సైన్ ఇన్ చేయండి.",
        logout: "లాగ్ అవుట్", logoutConfirm: "మీరు నిజంగా సైన్ అవుట్ చేయాలనుకుంటున్నారా?",
        profile: "ప్రొఫైల్", security: "భద్రత",
        firewallStatus: "ఫైర్‌వాల్ స్థితి", firewallActive: "క్రియాశీలం",
        welcomeBack: "తిరిగి స్వాగతం", newHere: "కొత్తగా వచ్చారా?",
        alreadyHaveAccount: "ఇప్పటికే ఖాతా ఉందా?"
    },
    dashboard: {
        title: "శరణాలయ వ్యవస్థ", chapterZero: "అధ్యాయం 00 — రహస్య ద్వారం // బయోమెకానిక్స్ శరణాలయం",
        heroLine1: "నిశ్చలత", heroLine2: "కనిపించనిది", heroLine3: "వెల్లడిస్తుంది.",
        heroSub: "60 FPS కంప్యూటర్ విజన్, అడాప్టివ్ శక్తి ప్రోటోకాల్స్, యోగా అలైన్‌మెంట్ మరియు Luna AI యొక్క తెలివైన శరణాలయంలోకి ప్రవేశించండి.",
        launchVision: "⚡ 60 FPS విజన్ ప్రారంభించు →", startWorkout: "🏋️ వర్కౌట్ ప్రారంభించు →",
        thresholds: "పరిధులు", stillGardens: "ప్రశాంత తోటలు", sacredCraft: "పవిత్ర కళ", nightRituals: "రాత్రి ఆచారాలు",
        systemIndex: "వ్యవస్థ సూచిక", welcomeMessage: "Luminix కు స్వాగతం",
        healthOverview: "ఆరోగ్య అవలోకనం", healthScore: "ఆరోగ్య స్కోరు",
        activity: "కార్యాచరణ", steps: "అడుగులు", calories: "కేలరీలు",
        heartRate: "హృదయ స్పందన రేటు", bloodPressure: "రక్తపోటు", sleep: "నిద్ర",
        weight: "బరువు", progress: "పురోగతి"
    },
    nav: {
        system: "వ్యవస్థ", livePose: "లైవ్ పోజ్", yoga: "యోగా", gym: "జిమ్",
        nutrition: "పోషణ", food: "ఆహారం", lunaExport: "LUNA & ఎగుమతి",
        connect: "కనెక్ట్", about: "గురించి", vision: "విజన్", metrics: "కొలమానాలు",
        luna: "Luna", sync: "సింక్", sanctuarySystem: "శరణాలయ వ్యవస్థ",
        livePoseEngine: "లైవ్ పోజ్ ఇంజిన్ (60 FPS)", adaptiveGymEngine: "అడాప్టివ్ జిమ్ ఇంజిన్",
        sacredYogaAsanas: "17 పవిత్ర యోగాసనాలు", metabolicMatrix: "జీవక్రియ మ్యాట్రిక్స్ & BMR",
        foodHydration: "ఆహారం & హైడ్రేషన్ ట్రాకింగ్", lunaAIClinical: "Luna AI & క్లినికల్ స్టూడియో",
        connectWearables: "Lumi తో కనెక్ట్ చేయి (వేరబుల్స్)", aboutVision: "Luminix గురించి & విజన్",
        quickShortcuts: "త్వరిత షార్ట్‌కట్లు", toggleTheme: "థీమ్ మార్చు",
        chambersDisciplines: "గదులు & విభాగాలు", architectSupport: "ఆర్కిటెక్ట్ & సహాయం",
        disciplineDirectory: "LUMINIX // విభాగ డైరెక్టరీ"
    },
    pose: {
        title: "60 FPS లైవ్ పోజ్ ఇంజిన్", poseAnalysis: "పోజ్ విశ్లేషణ",
        startAnalysis: "విశ్లేషణ ప్రారంభించు", stopAnalysis: "విశ్లేషణ ఆపు",
        cameraPermissions: "కెమెరా అనుమతి అవసరం", bodyTracking: "శరీర ట్రాకింగ్",
        poseDetection: "పోజ్ గుర్తింపు", jointTracking: "కీలు ట్రాకింగ్",
        posture: "భంగిమ", form: "రూపం", alignment: "అమరిక",
        riskDetection: "ప్రమాద గుర్తింపు", riskLevel: "ప్రమాద స్థాయి",
        movementQuality: "కదలిక నాణ్యత", recommendations: "సిఫార్సులు",
        warnings: "హెచ్చరికలు", analysisComplete: "విశ్లేషణ పూర్తయింది"
    },
    gym: {
        title: "అడాప్టివ్ జిమ్ ఇంజిన్", workout: "వర్కౌట్", exercise: "వ్యాయామం",
        sets: "సెట్లు", reps: "రెప్స్", repetitions: "పునరావృతాలు", weight: "బరువు",
        rest: "విశ్రాంతి", duration: "వ్యవధి", difficulty: "కష్టతరం",
        muscleGroup: "కండర సమూహం", strength: "బలం", progress: "పురోగతి",
        startWorkout: "వర్కౌట్ ప్రారంభించు", pauseWorkout: "వర్కౌట్ ఆపు",
        finishWorkout: "వర్కౌట్ పూర్తి చేయి", repCounter: "రెప్ కౌంటర్",
        formScore: "ఫార్మ్ స్కోరు", excellent: "అద్భుతం", good: "మంచిది",
        squats: "స్క్వాట్స్", pushups: "పుష్-అప్స్", lunges: "లంజ్‌లు"
    },
    yoga: {
        title: "17 పవిత్ర యోగాసనాలు", pose: "ఆసనం", breathing: "శ్వాసక్రియ",
        duration: "వ్యవధి", difficulty: "కష్టతరం", instructions: "సూచనలు",
        startSession: "సెషన్ ప్రారంభించు", endSession: "సెషన్ ముగించు",
        beginner: "ప్రారంభకుడు", intermediate: "మధ్యస్థం", advanced: "అధునాతనం",
        safetyWarnings: "భద్రత హెచ్చరికలు", holdTime: "పట్టు సమయం",
        benefits: "ప్రయోజనాలు", inhale: "పీల్చు", exhale: "వదిలివేయి", hold: "పట్టు", relax: "విశ్రాంతి"
    },
    nutrition: {
        title: "జీవక్రియ మ్యాట్రిక్స్ & పోషణ", calories: "కేలరీలు", protein: "ప్రోటీన్",
        carbohydrates: "కార్బోహైడ్రేట్లు", fat: "కొవ్వు", fiber: "ఫైబర్", water: "నీళ్ళు",
        meals: "భోజనాలు", breakfast: "అల్పాహారం", lunch: "మధ్యాహ్న భోజనం",
        dinner: "రాత్రి భోజనం", snacks: "స్నాక్స్", food: "ఆహారం",
        bmr: "BMR", tdee: "TDEE", bmi: "BMI",
        age: "వయస్సు", weight: "బరువు", height: "ఎత్తు",
        gender: "లింగం", male: "పురుషుడు", female: "స్త్రీ",
        calculate: "లెక్కించు", dailyTarget: "రోజువారీ లక్ష్యం",
        foodTracker: "ఆహార ట్రాకర్", addMeal: "భోజనం చేర్చు", hydration: "హైడ్రేషన్",
        waterIntake: "నీటి తీసుకోలు", glasses: "గ్లాసులు"
    },
    luna: {
        title: "Luna AI & క్లినికల్ స్టూడియో", downloadPDF: "క్లినికల్ PDF డౌన్‌లోడ్ ↓",
        connectWearables: "వేరబుల్స్ కనెక్ట్ →", apiKeySettings: "🔑 API కీ సెట్టింగ్స్",
        saveKey: "కీ భద్రపరచు", resetKey: "రీసెట్",
        greeting: "నమస్కారం! నేను Luna, మీ Luminix ఆరోగ్య & పోషణ తెలివి సహాయకురాలిని. మీరు ఏదైనా అడగవచ్చు:",
        inputPlaceholder: "Luna ను ఏదైనా పోషణ, ఆహారం లేదా వర్కౌట్ ప్రశ్నలు అడగండి...",
        send: "పంపించు", thinking: "Luna AI Google Gemini తో ప్రతిస్పందన సంశ్లేషిస్తోంది...",
        automatedReport: "స్వయంచాలక బయోమెట్రిక్ నివేదిక", downloadReport: "PDF నివేదిక డౌన్‌లోడ్ ↓"
    },
    settings: {
        title: "సెట్టింగ్స్", profile: "ప్రొఫైల్", account: "ఖాతా", language: "భాష",
        appearance: "రూపం", theme: "థీమ్", darkMode: "డార్క్ మోడ్", lightMode: "లైట్ మోడ్",
        notifications: "నోటిఫికేషన్లు", privacy: "గోప్యత", security: "భద్రత",
        connectedDevices: "కనెక్ట్ చేసిన పరికరాలు", logout: "లాగ్ అవుట్",
        deleteAccount: "ఖాతా తొలగించు", saveChanges: "మార్పులు భద్రపరచు",
        fullName: "పూర్తి పేరు / కోడ్ నేమ్", age: "వయస్సు (సంవత్సరాలు)",
        bodyWeight: "శరీర బరువు (KG)", heightCm: "ఎత్తు (CM)",
        personalizeSanctuary: "మీ శరణాలయాన్ని", sanctuaryWord: "వ్యక్తిగతీకరించండి."
    },
    notifications: {
        success: "విజయం", warning: "హెచ్చరిక", error: "లోపం", info: "సమాచారం",
        healthAlert: "ఆరోగ్య హెచ్చరిక", deviceConnected: "పరికరం విజయవంతంగా కనెక్ట్ అయింది",
        syncComplete: "సమకాలీకరణ పూర్తయింది", profileUpdated: "ప్రొఫైల్ నవీకరించబడింది",
        workoutComplete: "వర్కౌట్ పూర్తయింది!", confirmAction: "చర్య నిర్ధారించు",
        areYouSure: "మీరు నిజంగా కొనసాగించాలనుకుంటున్నారా?", proceed: "కొనసాగించు",
        acceptAll: "అన్నీ అంగీకరించు", essentialOnly: "అవసరమైనవి మాత్రమే",
        customize: "అనుకూలీకరించు", savePreferences: "ప్రాధాన్యతలు భద్రపరచు"
    }
};

// ── HINDI (hi) ────────────────────────────────────────────────────
TRANSLATIONS['hi'] = {
    common: {
        appName: "LUMINIX", tagline: "AI फिटनेस // वेलनेस OS", version: "v4.3",
        save: "सहेजें", cancel: "रद्द करें", confirm: "पुष्टि करें", delete: "हटाएं",
        edit: "संपादित करें", continue: "जारी रखें", back: "वापस", next: "अगला",
        start: "शुरू करें", stop: "रोकें", retry: "पुनः प्रयास करें", close: "बंद करें",
        search: "खोजें", loading: "लोड हो रहा है...", processing: "प्रोसेस हो रहा है...",
        success: "सफल", failed: "विफल", error: "त्रुटि",
        noData: "कोई डेटा उपलब्ध नहीं", noResults: "कोई परिणाम नहीं मिला",
        somethingWentWrong: "कुछ गलत हो गया", tryAgain: "पुनः प्रयास करें",
        yes: "हाँ", no: "नहीं", ok: "ठीक है", submit: "जमा करें", reset: "रीसेट",
        download: "डाउनलोड", upload: "अपलोड", share: "शेयर करें",
        copyLink: "लिंक कॉपी करें", copied: "कॉपी हो गया!",
        send: "भेजें", transmit: "संदेश भेजें →", scrollToTop: "ऊपर जाएं",
        contact: "संपर्क", exploreSystem: "सिस्टम देखें ↓",
        exploreSanctuary: "सैंक्चुअरी खोजें ↓", scrollToEnter: "प्रवेश के लिए स्क्रॉल करें",
        breadcrumbSanctuary: "सैंक्चुअरी", breadcrumbModules: "मॉड्यूल",
        skipToContent: "सामग्री पर जाएं"
    },
    auth: {
        login: "लॉगिन", register: "रजिस्टर", createAccount: "खाता बनाएं",
        email: "ईमेल", password: "पासवर्ड", confirmPassword: "पासवर्ड पुष्टि करें",
        forgotPassword: "पासवर्ड भूल गए?", resetPassword: "पासवर्ड रीसेट करें",
        signIn: "साइन इन", signOut: "साइन आउट", signUp: "साइन अप",
        googleSignIn: "Google से साइन इन", githubSignIn: "GitHub से साइन इन",
        rememberMe: "मुझे याद रखें", loading: "प्रमाणित कर रहा है...",
        error: "प्रमाणीकरण त्रुटि", invalidCredentials: "अमान्य ईमेल या पासवर्ड",
        accountCreated: "खाता सफलतापूर्वक बनाया गया", sessionExpired: "आपका सत्र समाप्त हो गया। कृपया पुनः साइन इन करें।",
        logout: "लॉग आउट", logoutConfirm: "क्या आप वाकई साइन आउट करना चाहते हैं?",
        profile: "प्रोफ़ाइल", security: "सुरक्षा", welcomeBack: "वापसी पर स्वागत है"
    },
    dashboard: {
        title: "सैंक्चुअरी सिस्टम", heroLine1: "जहाँ स्थिरता", heroLine2: "अदृश्य को", heroLine3: "प्रकट करती है।",
        heroSub: "60 FPS कंप्यूटर विज़न, एडेप्टिव स्ट्रेंथ प्रोटोकॉल, योग अलाइनमेंट और Luna AI के बुद्धिमान अभयारण्य में प्रवेश करें।",
        launchVision: "⚡ 60 FPS विज़न लॉन्च करें →", startWorkout: "🏋️ वर्कआउट शुरू करें →",
        thresholds: "सीमाएं", stillGardens: "शांत उद्यान", sacredCraft: "पवित्र कला", nightRituals: "रात्रि अनुष्ठान",
        welcomeMessage: "Luminix में आपका स्वागत है", healthOverview: "स्वास्थ्य अवलोकन",
        steps: "कदम", calories: "कैलोरी", heartRate: "हृदय गति", sleep: "नींद", weight: "वज़न", progress: "प्रगति"
    },
    nav: {
        system: "सिस्टम", livePose: "लाइव पोज़", yoga: "योग", gym: "जिम",
        nutrition: "पोषण", food: "भोजन", lunaExport: "LUNA & एक्सपोर्ट",
        connect: "कनेक्ट", about: "परिचय", vision: "विज़न", metrics: "मेट्रिक्स",
        luna: "Luna", sync: "सिंक"
    },
    pose: {
        title: "60 FPS लाइव पोज़ इंजन", poseAnalysis: "पोज़ विश्लेषण",
        startAnalysis: "विश्लेषण शुरू करें", cameraPermissions: "कैमरा अनुमति आवश्यक",
        posture: "मुद्रा", alignment: "संरेखण", riskDetection: "जोखिम पहचान", warnings: "चेतावनियाँ"
    },
    gym: {
        title: "एडेप्टिव जिम इंजन", workout: "वर्कआउट", exercise: "व्यायाम",
        sets: "सेट", reps: "रेप्स", weight: "वज़न", rest: "आराम",
        startWorkout: "वर्कआउट शुरू करें", progress: "प्रगति",
        squats: "स्क्वाट्स", pushups: "पुश-अप्स"
    },
    yoga: {
        title: "17 पवित्र योगासन", pose: "आसन", breathing: "श्वसन",
        startSession: "सत्र शुरू करें", endSession: "सत्र समाप्त करें",
        beginner: "शुरुआती", intermediate: "मध्यम", advanced: "उन्नत",
        inhale: "श्वास लें", exhale: "श्वास छोड़ें", hold: "रोकें", relax: "आराम करें"
    },
    nutrition: {
        title: "मेटाबॉलिक मैट्रिक्स & पोषण", calories: "कैलोरी", protein: "प्रोटीन",
        carbohydrates: "कार्बोहाइड्रेट", fat: "वसा", fiber: "फाइबर", water: "पानी",
        breakfast: "नाश्ता", lunch: "दोपहर का भोजन", dinner: "रात का भोजन", snacks: "स्नैक्स",
        calculate: "गणना करें", weight: "वज़न", height: "ऊँचाई", age: "उम्र",
        male: "पुरुष", female: "महिला", foodTracker: "भोजन ट्रैकर", hydration: "हाइड्रेशन"
    },
    luna: {
        title: "Luna AI & क्लिनिकल स्टूडियो", downloadPDF: "क्लिनिकल PDF डाउनलोड ↓",
        greeting: "नमस्ते! मैं Luna हूँ, आपकी Luminix स्वास्थ्य और पोषण बुद्धिमत्ता सहायक। आप मुझसे कुछ भी पूछ सकते हैं:",
        inputPlaceholder: "Luna से कोई भी पोषण, भोजन या वर्कआउट प्रश्न पूछें...",
        send: "भेजें", thinking: "Luna AI Google Gemini के साथ प्रतिक्रिया तैयार कर रहा है..."
    },
    settings: {
        title: "सेटिंग्स", profile: "प्रोफ़ाइल", language: "भाषा", theme: "थीम",
        notifications: "सूचनाएं", privacy: "गोपनीयता", security: "सुरक्षा",
        logout: "लॉग आउट", deleteAccount: "खाता हटाएं", saveChanges: "परिवर्तन सहेजें"
    },
    notifications: {
        success: "सफल", warning: "चेतावनी", error: "त्रुटि",
        confirmAction: "कार्रवाई की पुष्टि करें", areYouSure: "क्या आप निश्चित हैं?",
        proceed: "आगे बढ़ें", acceptAll: "सभी स्वीकार करें"
    }
};

// ── CHINESE SIMPLIFIED (zh) ──────────────────────────────────────
TRANSLATIONS['zh'] = {
    common: {
        appName: "LUMINIX", tagline: "AI 健身 // 健康操作系统", version: "v4.3",
        save: "保存", cancel: "取消", confirm: "确认", delete: "删除",
        edit: "编辑", continue: "继续", back: "返回", next: "下一步",
        start: "开始", stop: "停止", retry: "重试", close: "关闭",
        search: "搜索", loading: "加载中...", processing: "处理中...",
        success: "成功", failed: "失败", error: "错误",
        noData: "暂无数据", noResults: "未找到结果",
        somethingWentWrong: "出了些问题", tryAgain: "重试",
        yes: "是", no: "否", ok: "确定", submit: "提交", reset: "重置",
        download: "下载", upload: "上传", share: "分享", send: "发送",
        copyLink: "复制链接", copied: "已复制！", scrollToTop: "回到顶部",
        contact: "联系", breadcrumbSanctuary: "圣殿", breadcrumbModules: "模块",
        scrollToEnter: "滚动进入"
    },
    auth: {
        login: "登录", register: "注册", createAccount: "创建账户",
        email: "邮箱", password: "密码", confirmPassword: "确认密码",
        forgotPassword: "忘记密码？", signIn: "登录", signOut: "退出",
        googleSignIn: "使用 Google 登录", githubSignIn: "使用 GitHub 登录",
        rememberMe: "记住我", loading: "认证中...", error: "认证错误",
        invalidCredentials: "邮箱或密码无效", accountCreated: "账户创建成功",
        logout: "退出登录", profile: "个人资料", security: "安全", welcomeBack: "欢迎回来"
    },
    dashboard: {
        title: "圣殿系统", heroLine1: "在宁静中", heroLine2: "揭示", heroLine3: "未见之物。",
        heroSub: "通过60帧实时计算机视觉、自适应力量方案、瑜伽对齐和Luna AI的智能圣殿进入Luminix。",
        launchVision: "⚡ 启动60帧视觉 →", startWorkout: "🏋️ 开始锻炼 →",
        welcomeMessage: "欢迎来到 Luminix", healthOverview: "健康概览",
        steps: "步数", calories: "卡路里", heartRate: "心率", sleep: "睡眠", weight: "体重", progress: "进度"
    },
    nav: {
        system: "系统", livePose: "实时姿态", yoga: "瑜伽", gym: "健身",
        nutrition: "营养", food: "饮食", lunaExport: "LUNA & 导出",
        connect: "连接", about: "关于", vision: "视觉", metrics: "指标", luna: "Luna", sync: "同步"
    },
    pose: { title: "60帧实时姿态引擎", poseAnalysis: "姿态分析", startAnalysis: "开始分析", posture: "姿势", alignment: "对齐", riskDetection: "风险检测", warnings: "警告" },
    gym: { title: "自适应健身引擎", workout: "锻炼", exercise: "运动", sets: "组数", reps: "次数", weight: "重量", rest: "休息", startWorkout: "开始锻炼", progress: "进度", squats: "深蹲", pushups: "俯卧撑" },
    yoga: { title: "17式瑜伽体式", pose: "体式", breathing: "呼吸", startSession: "开始课程", beginner: "初学者", intermediate: "中级", advanced: "高级", inhale: "吸气", exhale: "呼气" },
    nutrition: { title: "代谢矩阵与营养", calories: "卡路里", protein: "蛋白质", carbohydrates: "碳水化合物", fat: "脂肪", water: "水", breakfast: "早餐", lunch: "午餐", dinner: "晚餐", calculate: "计算", foodTracker: "饮食追踪" },
    luna: { title: "Luna AI & 临床工作室", greeting: "你好！我是Luna，你的Luminix健康与营养智能助手。你可以向我询问任何问题：", inputPlaceholder: "向Luna询问营养、饮食或锻炼问题...", send: "发送", thinking: "Luna AI 正在通过 Google Gemini 生成回复..." },
    settings: { title: "设置", profile: "个人资料", language: "语言", theme: "主题", notifications: "通知", privacy: "隐私", security: "安全", logout: "退出登录", deleteAccount: "删除账户", saveChanges: "保存更改" },
    notifications: { success: "成功", warning: "警告", error: "错误", confirmAction: "确认操作", areYouSure: "您确定要继续吗？", proceed: "继续", acceptAll: "全部接受" }
};

// ── SPANISH (es) ──────────────────────────────────────────────────
TRANSLATIONS['es'] = {
    common: { save: "Guardar", cancel: "Cancelar", confirm: "Confirmar", delete: "Eliminar", edit: "Editar", continue: "Continuar", back: "Volver", next: "Siguiente", start: "Iniciar", stop: "Detener", retry: "Reintentar", close: "Cerrar", search: "Buscar", loading: "Cargando...", processing: "Procesando...", success: "Éxito", failed: "Fallido", error: "Error", noData: "No hay datos disponibles", noResults: "No se encontraron resultados", somethingWentWrong: "Algo salió mal", tryAgain: "Intentar de nuevo", yes: "Sí", no: "No", ok: "Aceptar", submit: "Enviar", send: "ENVIAR", download: "Descargar", share: "Compartir", copyLink: "COPIAR ENLACE", copied: "¡Copiado!", scrollToEnter: "Desplázate para entrar", breadcrumbSanctuary: "Santuario", breadcrumbModules: "Módulos", contact: "CONTACTO" },
    auth: { login: "Iniciar sesión", register: "Registrarse", createAccount: "Crear cuenta", email: "Correo electrónico", password: "Contraseña", confirmPassword: "Confirmar contraseña", forgotPassword: "¿Olvidaste tu contraseña?", signIn: "Iniciar sesión", signOut: "Cerrar sesión", googleSignIn: "Iniciar sesión con Google", githubSignIn: "Iniciar sesión con GitHub", loading: "Autenticando...", error: "Error de autenticación", invalidCredentials: "Correo electrónico o contraseña inválidos", logout: "Cerrar sesión", profile: "Perfil", security: "Seguridad", welcomeBack: "Bienvenido de vuelta" },
    dashboard: { title: "Sistema del Santuario", heroLine1: "Donde la quietud", heroLine2: "revela lo", heroLine3: "invisible.", heroSub: "Entra en Luminix a través de sus umbrales silenciosos: un santuario inteligente de visión por computadora a 60 FPS, protocolos de fuerza adaptativos, alineación de yoga y Luna AI.", launchVision: "⚡ LANZAR VISIÓN 60 FPS →", startWorkout: "🏋️ INICIAR ENTRENAMIENTO →", welcomeMessage: "Bienvenido a Luminix", healthOverview: "Resumen de salud", steps: "Pasos", calories: "Calorías", heartRate: "Frecuencia cardíaca", sleep: "Sueño", weight: "Peso", progress: "Progreso" },
    nav: { system: "SISTEMA", livePose: "POSE EN VIVO", yoga: "YOGA", gym: "GIMNASIO", nutrition: "NUTRICIÓN", food: "ALIMENTOS", lunaExport: "LUNA Y EXPORTAR", connect: "CONECTAR", about: "ACERCA DE", vision: "Visión", metrics: "Métricas", luna: "Luna", sync: "Sincronizar" },
    pose: { title: "Motor de Pose en Vivo 60 FPS", poseAnalysis: "Análisis de Pose", startAnalysis: "Iniciar Análisis", posture: "Postura", alignment: "Alineación", riskDetection: "Detección de Riesgo", warnings: "Advertencias" },
    gym: { title: "Motor Adaptativo de Gimnasio", workout: "Entrenamiento", exercise: "Ejercicio", sets: "Series", reps: "Repeticiones", weight: "Peso", rest: "Descanso", startWorkout: "Iniciar Entrenamiento", progress: "Progreso", squats: "Sentadillas", pushups: "Flexiones" },
    yoga: { title: "17 Asanas Sagradas de Yoga", pose: "Postura", breathing: "Respiración", startSession: "Iniciar Sesión", beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado", inhale: "Inhalar", exhale: "Exhalar" },
    nutrition: { title: "Matriz Metabólica y Nutrición", calories: "Calorías", protein: "Proteína", carbohydrates: "Carbohidratos", fat: "Grasa", water: "Agua", breakfast: "Desayuno", lunch: "Almuerzo", dinner: "Cena", calculate: "Calcular", foodTracker: "Rastreador de Alimentos" },
    luna: { title: "Luna AI y Estudio Clínico", greeting: "¡Hola! Soy Luna, tu asistente de inteligencia en salud y nutrición de Luminix. Puedes preguntarme cualquier cosa sobre:", inputPlaceholder: "Pregunta a Luna sobre nutrición, comida o ejercicio...", send: "ENVIAR", thinking: "Luna AI está sintetizando la respuesta con Google Gemini..." },
    settings: { title: "Ajustes", profile: "Perfil", language: "Idioma", theme: "Tema", notifications: "Notificaciones", privacy: "Privacidad", security: "Seguridad", logout: "Cerrar sesión", deleteAccount: "Eliminar cuenta", saveChanges: "Guardar cambios" },
    notifications: { success: "Éxito", warning: "Advertencia", error: "Error", confirmAction: "Confirmar acción", areYouSure: "¿Estás seguro de que deseas continuar?", proceed: "Continuar", acceptAll: "ACEPTAR TODO" }
};

// ── FRENCH (fr) ───────────────────────────────────────────────────
TRANSLATIONS['fr'] = {
    common: { save: "Enregistrer", cancel: "Annuler", confirm: "Confirmer", delete: "Supprimer", edit: "Modifier", continue: "Continuer", back: "Retour", next: "Suivant", start: "Démarrer", stop: "Arrêter", retry: "Réessayer", close: "Fermer", search: "Rechercher", loading: "Chargement...", processing: "Traitement...", success: "Succès", failed: "Échec", error: "Erreur", noData: "Aucune donnée disponible", noResults: "Aucun résultat trouvé", somethingWentWrong: "Une erreur s'est produite", tryAgain: "Réessayer", yes: "Oui", no: "Non", ok: "OK", submit: "Soumettre", send: "ENVOYER", download: "Télécharger", share: "Partager", copyLink: "COPIER LE LIEN", copied: "Copié !", scrollToEnter: "Défiler pour entrer", breadcrumbSanctuary: "Sanctuaire", breadcrumbModules: "Modules", contact: "CONTACT" },
    auth: { login: "Connexion", register: "S'inscrire", createAccount: "Créer un compte", email: "E-mail", password: "Mot de passe", forgotPassword: "Mot de passe oublié ?", signIn: "Se connecter", signOut: "Se déconnecter", googleSignIn: "Se connecter avec Google", githubSignIn: "Se connecter avec GitHub", loading: "Authentification...", error: "Erreur d'authentification", invalidCredentials: "E-mail ou mot de passe invalide", logout: "Déconnexion", profile: "Profil", security: "Sécurité", welcomeBack: "Bienvenue" },
    dashboard: { title: "Système du Sanctuaire", heroLine1: "Là où l'immobilité", heroLine2: "révèle", heroLine3: "l'invisible.", heroSub: "Entrez dans Luminix à travers ses seuils silencieux : un sanctuaire intelligent de vision par ordinateur à 60 FPS, protocoles de force adaptatifs, alignement yoga et Luna AI.", launchVision: "⚡ LANCER LA VISION 60 FPS →", startWorkout: "🏋️ DÉMARRER L'ENTRAÎNEMENT →", welcomeMessage: "Bienvenue sur Luminix", steps: "Pas", calories: "Calories", heartRate: "Fréquence cardiaque", sleep: "Sommeil", weight: "Poids", progress: "Progrès" },
    nav: { system: "SYSTÈME", livePose: "POSE EN DIRECT", yoga: "YOGA", gym: "SALLE DE SPORT", nutrition: "NUTRITION", food: "ALIMENTATION", lunaExport: "LUNA & EXPORT", connect: "CONNECTER", about: "À PROPOS", vision: "Vision", metrics: "Métriques", luna: "Luna", sync: "Sync" },
    gym: { title: "Moteur Adaptatif de Salle de Sport", workout: "Entraînement", exercise: "Exercice", sets: "Séries", reps: "Répétitions", weight: "Poids", rest: "Repos", startWorkout: "Démarrer l'entraînement", progress: "Progrès", squats: "Squats", pushups: "Pompes" },
    yoga: { title: "17 Asanas Sacrées de Yoga", pose: "Posture", breathing: "Respiration", startSession: "Démarrer la séance", beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé", inhale: "Inspirer", exhale: "Expirer" },
    nutrition: { title: "Matrice Métabolique & Nutrition", calories: "Calories", protein: "Protéines", carbohydrates: "Glucides", fat: "Lipides", water: "Eau", breakfast: "Petit-déjeuner", lunch: "Déjeuner", dinner: "Dîner", calculate: "Calculer", foodTracker: "Suivi Alimentaire" },
    luna: { title: "Luna AI & Studio Clinique", greeting: "Bonjour ! Je suis Luna, votre assistante d'intelligence santé et nutrition Luminix. Vous pouvez me poser des questions sur :", inputPlaceholder: "Posez à Luna vos questions sur la nutrition, l'alimentation ou l'exercice...", send: "ENVOYER", thinking: "Luna AI synthétise la réponse avec Google Gemini..." },
    settings: { title: "Paramètres", profile: "Profil", language: "Langue", theme: "Thème", notifications: "Notifications", privacy: "Confidentialité", security: "Sécurité", logout: "Déconnexion", deleteAccount: "Supprimer le compte", saveChanges: "Enregistrer les modifications" },
    notifications: { success: "Succès", warning: "Avertissement", error: "Erreur", confirmAction: "Confirmer l'action", areYouSure: "Êtes-vous certain de vouloir continuer ?", proceed: "Poursuivre", acceptAll: "TOUT ACCEPTER" }
};

// ── GERMAN (de) ───────────────────────────────────────────────────
TRANSLATIONS['de'] = {
    common: { save: "Speichern", cancel: "Abbrechen", confirm: "Bestätigen", delete: "Löschen", edit: "Bearbeiten", continue: "Fortfahren", back: "Zurück", next: "Weiter", start: "Starten", stop: "Stoppen", retry: "Erneut versuchen", close: "Schließen", search: "Suchen", loading: "Wird geladen...", processing: "Verarbeitung...", success: "Erfolg", failed: "Fehlgeschlagen", error: "Fehler", noData: "Keine Daten verfügbar", noResults: "Keine Ergebnisse gefunden", somethingWentWrong: "Etwas ist schiefgelaufen", tryAgain: "Erneut versuchen", yes: "Ja", no: "Nein", ok: "OK", submit: "Absenden", send: "SENDEN", download: "Herunterladen", share: "Teilen", copyLink: "LINK KOPIEREN", copied: "Kopiert!", scrollToEnter: "Scrollen zum Eintreten", breadcrumbSanctuary: "Heiligtum", breadcrumbModules: "Module", contact: "KONTAKT" },
    auth: { login: "Anmelden", register: "Registrieren", createAccount: "Konto erstellen", email: "E-Mail", password: "Passwort", forgotPassword: "Passwort vergessen?", signIn: "Anmelden", signOut: "Abmelden", googleSignIn: "Mit Google anmelden", githubSignIn: "Mit GitHub anmelden", loading: "Authentifizierung...", error: "Authentifizierungsfehler", logout: "Abmelden", profile: "Profil", security: "Sicherheit", welcomeBack: "Willkommen zurück" },
    dashboard: { title: "Heiligtum-System", heroLine1: "Wo Stille", heroLine2: "das Unsichtbare", heroLine3: "enthüllt.", heroSub: "Betreten Sie Luminix durch seine stillen Schwellen: ein intelligentes Heiligtum mit 60-FPS-Computer-Vision, adaptiven Kraftprotokollen, Yoga-Ausrichtung und Luna AI.", launchVision: "⚡ 60 FPS VISION STARTEN →", startWorkout: "🏋️ TRAINING STARTEN →", welcomeMessage: "Willkommen bei Luminix", steps: "Schritte", calories: "Kalorien", heartRate: "Herzfrequenz", sleep: "Schlaf", weight: "Gewicht", progress: "Fortschritt" },
    nav: { system: "SYSTEM", livePose: "LIVE-POSE", yoga: "YOGA", gym: "FITNESS", nutrition: "ERNÄHRUNG", food: "ESSEN", lunaExport: "LUNA & EXPORT", connect: "VERBINDEN", about: "ÜBER UNS", vision: "Vision", metrics: "Metriken", luna: "Luna", sync: "Sync" },
    gym: { title: "Adaptiver Fitness-Motor", workout: "Training", exercise: "Übung", sets: "Sätze", reps: "Wiederholungen", weight: "Gewicht", rest: "Pause", startWorkout: "Training starten", progress: "Fortschritt", squats: "Kniebeugen", pushups: "Liegestütze" },
    yoga: { title: "17 Heilige Yoga-Asanas", pose: "Haltung", breathing: "Atmung", startSession: "Sitzung starten", beginner: "Anfänger", intermediate: "Mittelstufe", advanced: "Fortgeschritten", inhale: "Einatmen", exhale: "Ausatmen" },
    nutrition: { title: "Stoffwechselmatrix & Ernährung", calories: "Kalorien", protein: "Protein", carbohydrates: "Kohlenhydrate", fat: "Fett", water: "Wasser", breakfast: "Frühstück", lunch: "Mittagessen", dinner: "Abendessen", calculate: "Berechnen", foodTracker: "Ernährungstracker" },
    luna: { title: "Luna AI & Klinisches Studio", greeting: "Hallo! Ich bin Luna, Ihre Luminix Gesundheits- und Ernährungsintelligenz-Assistentin. Sie können mich alles fragen über:", inputPlaceholder: "Fragen Sie Luna zu Ernährung, Essen oder Training...", send: "SENDEN", thinking: "Luna AI synthetisiert die Antwort mit Google Gemini..." },
    settings: { title: "Einstellungen", profile: "Profil", language: "Sprache", theme: "Design", notifications: "Benachrichtigungen", privacy: "Datenschutz", security: "Sicherheit", logout: "Abmelden", deleteAccount: "Konto löschen", saveChanges: "Änderungen speichern" },
    notifications: { success: "Erfolg", warning: "Warnung", error: "Fehler", confirmAction: "Aktion bestätigen", areYouSure: "Sind Sie sicher, dass Sie fortfahren möchten?", proceed: "Fortfahren", acceptAll: "ALLE AKZEPTIEREN" }
};

// ── RUSSIAN (ru) ──────────────────────────────────────────────────
TRANSLATIONS['ru'] = {
    common: { save: "Сохранить", cancel: "Отмена", confirm: "Подтвердить", delete: "Удалить", edit: "Редактировать", continue: "Продолжить", back: "Назад", next: "Далее", start: "Начать", stop: "Остановить", retry: "Повторить", close: "Закрыть", search: "Поиск", loading: "Загрузка...", processing: "Обработка...", success: "Успешно", failed: "Ошибка", error: "Ошибка", noData: "Нет данных", noResults: "Ничего не найдено", somethingWentWrong: "Что-то пошло не так", tryAgain: "Попробовать снова", yes: "Да", no: "Нет", ok: "ОК", submit: "Отправить", send: "ОТПРАВИТЬ", download: "Скачать", share: "Поделиться", copyLink: "КОПИРОВАТЬ ССЫЛКУ", copied: "Скопировано!", scrollToEnter: "Прокрутите для входа", breadcrumbSanctuary: "Святилище", breadcrumbModules: "Модули", contact: "СВЯЗАТЬСЯ" },
    auth: { login: "Войти", register: "Регистрация", createAccount: "Создать аккаунт", email: "Электронная почта", password: "Пароль", forgotPassword: "Забыли пароль?", signIn: "Войти", signOut: "Выйти", googleSignIn: "Войти через Google", githubSignIn: "Войти через GitHub", loading: "Аутентификация...", error: "Ошибка аутентификации", logout: "Выйти", profile: "Профиль", security: "Безопасность", welcomeBack: "С возвращением" },
    dashboard: { title: "Система Святилища", heroLine1: "Где тишина", heroLine2: "раскрывает", heroLine3: "невидимое.", launchVision: "⚡ ЗАПУСТИТЬ ЗРЕНИЕ 60 FPS →", startWorkout: "🏋️ НАЧАТЬ ТРЕНИРОВКУ →", welcomeMessage: "Добро пожаловать в Luminix", steps: "Шаги", calories: "Калории", heartRate: "Пульс", sleep: "Сон", weight: "Вес", progress: "Прогресс" },
    nav: { system: "СИСТЕМА", livePose: "ЖИВАЯ ПОЗА", yoga: "ЙОГА", gym: "ТРЕНАЖЁР", nutrition: "ПИТАНИЕ", food: "ЕДА", lunaExport: "LUNA И ЭКСПОРТ", connect: "ПОДКЛЮЧИТЬ", about: "О НАС", vision: "Зрение", metrics: "Метрики", luna: "Luna", sync: "Синхр." },
    gym: { title: "Адаптивный Тренажёрный Двигатель", workout: "Тренировка", exercise: "Упражнение", sets: "Подходы", reps: "Повторения", weight: "Вес", rest: "Отдых", startWorkout: "Начать тренировку", squats: "Приседания", pushups: "Отжимания" },
    yoga: { title: "17 Священных Асан Йоги", pose: "Поза", breathing: "Дыхание", startSession: "Начать занятие", beginner: "Начинающий", intermediate: "Средний", advanced: "Продвинутый", inhale: "Вдох", exhale: "Выдох" },
    nutrition: { title: "Метаболическая Матрица и Питание", calories: "Калории", protein: "Белок", carbohydrates: "Углеводы", fat: "Жиры", water: "Вода", breakfast: "Завтрак", lunch: "Обед", dinner: "Ужин", calculate: "Рассчитать", foodTracker: "Трекер питания" },
    luna: { title: "Luna AI и Клиническая Студия", greeting: "Привет! Я Luna, ваш помощник по здоровью и питанию Luminix. Вы можете спросить меня о:", inputPlaceholder: "Спросите Luna о питании, еде или тренировках...", send: "ОТПРАВИТЬ", thinking: "Luna AI синтезирует ответ с Google Gemini..." },
    settings: { title: "Настройки", profile: "Профиль", language: "Язык", theme: "Тема", notifications: "Уведомления", privacy: "Конфиденциальность", security: "Безопасность", logout: "Выйти", deleteAccount: "Удалить аккаунт", saveChanges: "Сохранить изменения" },
    notifications: { success: "Успешно", warning: "Предупреждение", error: "Ошибка", confirmAction: "Подтвердить действие", areYouSure: "Вы уверены, что хотите продолжить?", proceed: "Продолжить", acceptAll: "ПРИНЯТЬ ВСЁ" }
};

// ── TURKISH (tr) ──────────────────────────────────────────────────
TRANSLATIONS['tr'] = {
    common: { save: "Kaydet", cancel: "İptal", confirm: "Onayla", delete: "Sil", edit: "Düzenle", continue: "Devam et", back: "Geri", next: "İleri", start: "Başla", stop: "Dur", retry: "Tekrar dene", close: "Kapat", search: "Ara", loading: "Yükleniyor...", processing: "İşleniyor...", success: "Başarılı", failed: "Başarısız", error: "Hata", noData: "Veri bulunamadı", noResults: "Sonuç bulunamadı", somethingWentWrong: "Bir şeyler yanlış gitti", tryAgain: "Tekrar dene", yes: "Evet", no: "Hayır", ok: "Tamam", submit: "Gönder", send: "GÖNDER", download: "İndir", share: "Paylaş", copyLink: "BAĞLANTIYI KOPYALA", copied: "Kopyalandı!", scrollToEnter: "Girmek için kaydırın", breadcrumbSanctuary: "Sığınak", breadcrumbModules: "Modüller", contact: "İLETİŞİM" },
    auth: { login: "Giriş Yap", register: "Kayıt Ol", createAccount: "Hesap Oluştur", email: "E-posta", password: "Şifre", forgotPassword: "Şifrenizi mi unuttunuz?", signIn: "Giriş Yap", signOut: "Çıkış Yap", googleSignIn: "Google ile Giriş Yap", githubSignIn: "GitHub ile Giriş Yap", loading: "Kimlik doğrulanıyor...", error: "Kimlik doğrulama hatası", logout: "Çıkış", profile: "Profil", security: "Güvenlik", welcomeBack: "Tekrar hoş geldiniz" },
    dashboard: { title: "Sığınak Sistemi", heroLine1: "Sessizliğin", heroLine2: "görünmeyeni", heroLine3: "ortaya çıkardığı yer.", launchVision: "⚡ 60 FPS GÖRÜŞÜ BAŞLAT →", startWorkout: "🏋️ ANTRENMANA BAŞLA →", welcomeMessage: "Luminix'e hoş geldiniz", steps: "Adım", calories: "Kalori", heartRate: "Kalp atış hızı", sleep: "Uyku", weight: "Ağırlık", progress: "İlerleme" },
    nav: { system: "SİSTEM", livePose: "CANLI POZ", yoga: "YOGA", gym: "SPOR SALONU", nutrition: "BESLENME", food: "YİYECEK", lunaExport: "LUNA VE DIŞA AKTARMA", connect: "BAĞLAN", about: "HAKKINDA", vision: "Görüş", metrics: "Metrikler", luna: "Luna", sync: "Senkronize" },
    gym: { title: "Uyarlanabilir Spor Salonu Motoru", workout: "Antrenman", exercise: "Egzersiz", sets: "Set", reps: "Tekrar", weight: "Ağırlık", rest: "Dinlenme", startWorkout: "Antrenmana Başla", squats: "Squatlar", pushups: "Şınav" },
    yoga: { title: "17 Kutsal Yoga Asanası", startSession: "Oturumu Başlat", beginner: "Başlangıç", intermediate: "Orta", advanced: "İleri", inhale: "Nefes al", exhale: "Nefes ver" },
    nutrition: { title: "Metabolik Matris ve Beslenme", calories: "Kalori", protein: "Protein", carbohydrates: "Karbonhidrat", fat: "Yağ", water: "Su", breakfast: "Kahvaltı", lunch: "Öğle yemeği", dinner: "Akşam yemeği", calculate: "Hesapla", foodTracker: "Yemek Takipçisi" },
    luna: { title: "Luna AI ve Klinik Stüdyo", greeting: "Merhaba! Ben Luna, Luminix sağlık ve beslenme zekâ asistanınızım. Bana her şeyi sorabilirsiniz:", inputPlaceholder: "Luna'ya beslenme, yemek veya egzersiz soruları sorun...", send: "GÖNDER", thinking: "Luna AI Google Gemini ile yanıt sentezliyor..." },
    settings: { title: "Ayarlar", profile: "Profil", language: "Dil", theme: "Tema", notifications: "Bildirimler", privacy: "Gizlilik", security: "Güvenlik", logout: "Çıkış", deleteAccount: "Hesabı Sil", saveChanges: "Değişiklikleri Kaydet" },
    notifications: { success: "Başarılı", warning: "Uyarı", error: "Hata", confirmAction: "Eylemi Onayla", areYouSure: "Devam etmek istediğinizden emin misiniz?", proceed: "Devam Et", acceptAll: "HEPSİNİ KABUL ET" }
};

// ── ARABIC (ar) — RTL ─────────────────────────────────────────────
TRANSLATIONS['ar'] = {
    common: { save: "حفظ", cancel: "إلغاء", confirm: "تأكيد", delete: "حذف", edit: "تعديل", continue: "متابعة", back: "رجوع", next: "التالي", start: "بدء", stop: "إيقاف", retry: "إعادة المحاولة", close: "إغلاق", search: "بحث", loading: "جاري التحميل...", processing: "جاري المعالجة...", success: "نجاح", failed: "فشل", error: "خطأ", noData: "لا توجد بيانات", noResults: "لم يتم العثور على نتائج", somethingWentWrong: "حدث خطأ ما", tryAgain: "حاول مرة أخرى", yes: "نعم", no: "لا", ok: "حسناً", submit: "إرسال", send: "إرسال", download: "تنزيل", share: "مشاركة", copyLink: "نسخ الرابط", copied: "تم النسخ!", scrollToEnter: "مرر للدخول", breadcrumbSanctuary: "الحرم", breadcrumbModules: "الوحدات", contact: "اتصل بنا" },
    auth: { login: "تسجيل الدخول", register: "إنشاء حساب", createAccount: "إنشاء حساب جديد", email: "البريد الإلكتروني", password: "كلمة المرور", forgotPassword: "نسيت كلمة المرور؟", signIn: "تسجيل الدخول", signOut: "تسجيل الخروج", googleSignIn: "تسجيل الدخول عبر Google", githubSignIn: "تسجيل الدخول عبر GitHub", loading: "جاري التحقق...", error: "خطأ في التحقق", logout: "خروج", profile: "الملف الشخصي", security: "الأمان", welcomeBack: "مرحباً بعودتك" },
    dashboard: { title: "نظام الحرم", heroLine1: "حيث السكون", heroLine2: "يكشف", heroLine3: "المخفي.", launchVision: "⚡ تشغيل الرؤية 60 FPS →", startWorkout: "🏋️ بدء التمرين →", welcomeMessage: "مرحباً بك في Luminix", steps: "خطوات", calories: "سعرات حرارية", heartRate: "معدل نبض القلب", sleep: "النوم", weight: "الوزن", progress: "التقدم" },
    nav: { system: "النظام", livePose: "الوضعية المباشرة", yoga: "يوغا", gym: "صالة الرياضة", nutrition: "التغذية", food: "الطعام", lunaExport: "LUNA والتصدير", connect: "اتصال", about: "حول", vision: "الرؤية", metrics: "المقاييس", luna: "Luna", sync: "مزامنة" },
    gym: { title: "محرك صالة الرياضة التكيفي", workout: "تمرين", exercise: "تمارين", sets: "مجموعات", reps: "تكرارات", weight: "وزن", rest: "راحة", startWorkout: "بدء التمرين", squats: "القرفصاء", pushups: "الضغط" },
    yoga: { title: "١٧ وضعية يوغا مقدسة", startSession: "بدء الجلسة", beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم", inhale: "شهيق", exhale: "زفير" },
    nutrition: { title: "مصفوفة الأيض والتغذية", calories: "سعرات حرارية", protein: "بروتين", carbohydrates: "كربوهيدرات", fat: "دهون", water: "ماء", breakfast: "فطور", lunch: "غداء", dinner: "عشاء", calculate: "احسب", foodTracker: "متتبع الطعام" },
    luna: { title: "Luna AI والاستوديو السريري", greeting: "مرحباً! أنا Luna، مساعدتك الذكية للصحة والتغذية في Luminix. يمكنك سؤالي عن أي شيء:", inputPlaceholder: "اسأل Luna عن التغذية أو الطعام أو التمارين...", send: "إرسال", thinking: "Luna AI تقوم بتجميع الرد عبر Google Gemini..." },
    settings: { title: "الإعدادات", profile: "الملف الشخصي", language: "اللغة", theme: "المظهر", notifications: "الإشعارات", privacy: "الخصوصية", security: "الأمان", logout: "تسجيل الخروج", deleteAccount: "حذف الحساب", saveChanges: "حفظ التغييرات" },
    notifications: { success: "نجاح", warning: "تحذير", error: "خطأ", confirmAction: "تأكيد الإجراء", areYouSure: "هل أنت متأكد أنك تريد المتابعة؟", proceed: "متابعة", acceptAll: "قبول الكل" }
};

// ── PORTUGUESE (pt) ───────────────────────────────────────────────
TRANSLATIONS['pt'] = {
    common: { save: "Salvar", cancel: "Cancelar", confirm: "Confirmar", delete: "Excluir", edit: "Editar", continue: "Continuar", back: "Voltar", next: "Próximo", start: "Iniciar", stop: "Parar", retry: "Tentar novamente", close: "Fechar", search: "Pesquisar", loading: "Carregando...", processing: "Processando...", success: "Sucesso", failed: "Falhou", error: "Erro", noData: "Sem dados disponíveis", noResults: "Nenhum resultado encontrado", somethingWentWrong: "Algo deu errado", tryAgain: "Tente novamente", yes: "Sim", no: "Não", ok: "OK", submit: "Enviar", send: "ENVIAR", download: "Baixar", share: "Compartilhar", copyLink: "COPIAR LINK", copied: "Copiado!", scrollToEnter: "Role para entrar", breadcrumbSanctuary: "Santuário", breadcrumbModules: "Módulos", contact: "CONTATO" },
    auth: { login: "Entrar", register: "Registrar", createAccount: "Criar conta", email: "E-mail", password: "Senha", forgotPassword: "Esqueceu a senha?", signIn: "Entrar", signOut: "Sair", googleSignIn: "Entrar com Google", githubSignIn: "Entrar com GitHub", loading: "Autenticando...", error: "Erro de autenticação", logout: "Sair", profile: "Perfil", security: "Segurança", welcomeBack: "Bem-vindo de volta" },
    dashboard: { title: "Sistema do Santuário", heroLine1: "Onde a quietude", heroLine2: "revela o", heroLine3: "invisível.", launchVision: "⚡ LANÇAR VISÃO 60 FPS →", startWorkout: "🏋️ INICIAR TREINO →", welcomeMessage: "Bem-vindo ao Luminix", steps: "Passos", calories: "Calorias", heartRate: "Frequência cardíaca", sleep: "Sono", weight: "Peso", progress: "Progresso" },
    nav: { system: "SISTEMA", livePose: "POSE AO VIVO", yoga: "YOGA", gym: "ACADEMIA", nutrition: "NUTRIÇÃO", food: "ALIMENTOS", lunaExport: "LUNA E EXPORTAR", connect: "CONECTAR", about: "SOBRE", vision: "Visão", metrics: "Métricas", luna: "Luna", sync: "Sincronizar" },
    gym: { title: "Motor Adaptativo de Academia", workout: "Treino", exercise: "Exercício", sets: "Séries", reps: "Repetições", weight: "Peso", rest: "Descanso", startWorkout: "Iniciar Treino", squats: "Agachamentos", pushups: "Flexões" },
    nutrition: { title: "Matriz Metabólica e Nutrição", calories: "Calorias", protein: "Proteína", carbohydrates: "Carboidratos", fat: "Gordura", water: "Água", breakfast: "Café da manhã", lunch: "Almoço", dinner: "Jantar", calculate: "Calcular", foodTracker: "Rastreador de Alimentos" },
    luna: { title: "Luna AI e Estúdio Clínico", greeting: "Olá! Sou Luna, sua assistente de inteligência em saúde e nutrição da Luminix. Pode me perguntar qualquer coisa sobre:", inputPlaceholder: "Pergunte à Luna sobre nutrição, comida ou exercícios...", send: "ENVIAR", thinking: "Luna AI está sintetizando a resposta com Google Gemini..." },
    settings: { title: "Configurações", profile: "Perfil", language: "Idioma", theme: "Tema", notifications: "Notificações", privacy: "Privacidade", security: "Segurança", logout: "Sair", deleteAccount: "Excluir conta", saveChanges: "Salvar alterações" },
    notifications: { success: "Sucesso", warning: "Aviso", error: "Erro", confirmAction: "Confirmar ação", proceed: "Prosseguir", acceptAll: "ACEITAR TUDO" }
};

// ── JAPANESE (ja) ──────────────────────────────────────────────────
TRANSLATIONS['ja'] = {
    common: { save: "保存", cancel: "キャンセル", confirm: "確認", delete: "削除", edit: "編集", continue: "続行", back: "戻る", next: "次へ", start: "開始", stop: "停止", retry: "再試行", close: "閉じる", search: "検索", loading: "読み込み中...", processing: "処理中...", success: "成功", failed: "失敗", error: "エラー", noData: "データがありません", noResults: "結果が見つかりません", somethingWentWrong: "問題が発生しました", tryAgain: "再試行してください", yes: "はい", no: "いいえ", ok: "OK", submit: "送信", send: "送信", download: "ダウンロード", share: "共有", copyLink: "リンクをコピー", copied: "コピーしました！", scrollToEnter: "スクロールして入る", breadcrumbSanctuary: "サンクチュアリ", breadcrumbModules: "モジュール", contact: "お問い合わせ" },
    auth: { login: "ログイン", register: "新規登録", createAccount: "アカウント作成", email: "メールアドレス", password: "パスワード", forgotPassword: "パスワードを忘れた方", signIn: "サインイン", signOut: "サインアウト", googleSignIn: "Googleでサインイン", githubSignIn: "GitHubでサインイン", loading: "認証中...", error: "認証エラー", logout: "ログアウト", profile: "プロフィール", security: "セキュリティ", welcomeBack: "お帰りなさい" },
    dashboard: { title: "サンクチュアリシステム", heroLine1: "静寂が", heroLine2: "見えないものを", heroLine3: "明らかにする。", launchVision: "⚡ 60FPSビジョン起動 →", startWorkout: "🏋️ ワークアウト開始 →", welcomeMessage: "Luminixへようこそ", steps: "歩数", calories: "カロリー", heartRate: "心拍数", sleep: "睡眠", weight: "体重", progress: "進捗" },
    nav: { system: "システム", livePose: "ライブポーズ", yoga: "ヨガ", gym: "ジム", nutrition: "栄養", food: "食事", lunaExport: "LUNA & エクスポート", connect: "接続", about: "概要", vision: "ビジョン", metrics: "メトリクス", luna: "Luna", sync: "同期" },
    gym: { title: "アダプティブジムエンジン", workout: "ワークアウト", exercise: "エクササイズ", sets: "セット", reps: "レップ", weight: "ウェイト", rest: "休憩", startWorkout: "ワークアウト開始", squats: "スクワット", pushups: "腕立て伏せ" },
    nutrition: { title: "代謝マトリクス & 栄養", calories: "カロリー", protein: "タンパク質", carbohydrates: "炭水化物", fat: "脂質", water: "水", breakfast: "朝食", lunch: "昼食", dinner: "夕食", calculate: "計算", foodTracker: "食事トラッカー" },
    luna: { title: "Luna AI & クリニカルスタジオ", greeting: "こんにちは！私はLuna、Luminixの健康・栄養インテリジェンスアシスタントです。何でもお聞きください：", inputPlaceholder: "Lunaに栄養、食事、トレーニングについて質問...", send: "送信", thinking: "Luna AIがGoogle Geminiで回答を生成中..." },
    settings: { title: "設定", profile: "プロフィール", language: "言語", theme: "テーマ", notifications: "通知", privacy: "プライバシー", security: "セキュリティ", logout: "ログアウト", deleteAccount: "アカウント削除", saveChanges: "変更を保存" },
    notifications: { success: "成功", warning: "警告", error: "エラー", confirmAction: "操作を確認", areYouSure: "続行してもよろしいですか？", proceed: "続行", acceptAll: "すべて同意" }
};

// ── KOREAN (ko) ───────────────────────────────────────────────────
TRANSLATIONS['ko'] = {
    common: { save: "저장", cancel: "취소", confirm: "확인", delete: "삭제", edit: "편집", continue: "계속", back: "뒤로", next: "다음", start: "시작", stop: "중지", retry: "재시도", close: "닫기", search: "검색", loading: "로딩 중...", processing: "처리 중...", success: "성공", failed: "실패", error: "오류", noData: "데이터 없음", noResults: "결과 없음", somethingWentWrong: "문제가 발생했습니다", tryAgain: "다시 시도", yes: "예", no: "아니오", ok: "확인", submit: "제출", send: "전송", download: "다운로드", share: "공유", copyLink: "링크 복사", copied: "복사됨!", scrollToEnter: "스크롤하여 입장", breadcrumbSanctuary: "성소", breadcrumbModules: "모듈", contact: "문의" },
    auth: { login: "로그인", register: "회원가입", createAccount: "계정 만들기", email: "이메일", password: "비밀번호", forgotPassword: "비밀번호를 잊으셨나요?", signIn: "로그인", signOut: "로그아웃", googleSignIn: "Google로 로그인", githubSignIn: "GitHub로 로그인", loading: "인증 중...", error: "인증 오류", logout: "로그아웃", profile: "프로필", security: "보안", welcomeBack: "다시 오신 것을 환영합니다" },
    dashboard: { title: "성소 시스템", heroLine1: "고요함이", heroLine2: "보이지 않는 것을", heroLine3: "드러내는 곳.", launchVision: "⚡ 60FPS 비전 시작 →", startWorkout: "🏋️ 운동 시작 →", welcomeMessage: "Luminix에 오신 것을 환영합니다", steps: "걸음수", calories: "칼로리", heartRate: "심박수", sleep: "수면", weight: "체중", progress: "진행" },
    nav: { system: "시스템", livePose: "라이브 포즈", yoga: "요가", gym: "헬스", nutrition: "영양", food: "음식", lunaExport: "LUNA & 내보내기", connect: "연결", about: "소개", vision: "비전", metrics: "지표", luna: "Luna", sync: "동기화" },
    gym: { title: "적응형 헬스 엔진", workout: "운동", exercise: "운동", sets: "세트", reps: "반복", weight: "무게", rest: "휴식", startWorkout: "운동 시작", squats: "스쿼트", pushups: "팔굽혀펴기" },
    nutrition: { title: "대사 매트릭스 & 영양", calories: "칼로리", protein: "단백질", carbohydrates: "탄수화물", fat: "지방", water: "물", breakfast: "아침", lunch: "점심", dinner: "저녁", calculate: "계산", foodTracker: "식단 추적기" },
    luna: { title: "Luna AI & 임상 스튜디오", greeting: "안녕하세요! 저는 Luna, Luminix 건강 및 영양 지능 어시스턴트입니다. 무엇이든 물어보세요:", inputPlaceholder: "Luna에게 영양, 음식 또는 운동에 대해 질문하세요...", send: "전송", thinking: "Luna AI가 Google Gemini로 응답을 생성 중..." },
    settings: { title: "설정", profile: "프로필", language: "언어", theme: "테마", notifications: "알림", privacy: "개인정보", security: "보안", logout: "로그아웃", deleteAccount: "계정 삭제", saveChanges: "변경 저장" },
    notifications: { success: "성공", warning: "경고", error: "오류", confirmAction: "작업 확인", areYouSure: "계속하시겠습니까?", proceed: "진행", acceptAll: "모두 수락" }
};

// ── ITALIAN (it) ──────────────────────────────────────────────────
TRANSLATIONS['it'] = {
    common: { save: "Salva", cancel: "Annulla", confirm: "Conferma", delete: "Elimina", edit: "Modifica", continue: "Continua", back: "Indietro", next: "Avanti", start: "Avvia", stop: "Ferma", retry: "Riprova", close: "Chiudi", search: "Cerca", loading: "Caricamento...", processing: "Elaborazione...", success: "Successo", failed: "Fallito", error: "Errore", noData: "Nessun dato disponibile", noResults: "Nessun risultato trovato", somethingWentWrong: "Qualcosa è andato storto", tryAgain: "Riprova", yes: "Sì", no: "No", ok: "OK", submit: "Invia", send: "INVIA", download: "Scarica", share: "Condividi", copyLink: "COPIA LINK", copied: "Copiato!", scrollToEnter: "Scorri per entrare", breadcrumbSanctuary: "Santuario", breadcrumbModules: "Moduli", contact: "CONTATTO" },
    auth: { login: "Accedi", register: "Registrati", createAccount: "Crea account", email: "E-mail", password: "Password", forgotPassword: "Password dimenticata?", signIn: "Accedi", signOut: "Esci", googleSignIn: "Accedi con Google", githubSignIn: "Accedi con GitHub", loading: "Autenticazione...", error: "Errore di autenticazione", logout: "Esci", profile: "Profilo", security: "Sicurezza", welcomeBack: "Bentornato" },
    dashboard: { title: "Sistema del Santuario", heroLine1: "Dove la quiete", heroLine2: "rivela", heroLine3: "l'invisibile.", launchVision: "⚡ AVVIA VISIONE 60 FPS →", startWorkout: "🏋️ INIZIA ALLENAMENTO →", welcomeMessage: "Benvenuto su Luminix", steps: "Passi", calories: "Calorie", heartRate: "Frequenza cardiaca", sleep: "Sonno", weight: "Peso", progress: "Progresso" },
    nav: { system: "SISTEMA", livePose: "POSE DAL VIVO", yoga: "YOGA", gym: "PALESTRA", nutrition: "NUTRIZIONE", food: "CIBO", lunaExport: "LUNA E ESPORTA", connect: "CONNETTI", about: "INFO", vision: "Visione", metrics: "Metriche", luna: "Luna", sync: "Sincronizza" },
    gym: { title: "Motore Palestra Adattivo", workout: "Allenamento", exercise: "Esercizio", sets: "Serie", reps: "Ripetizioni", weight: "Peso", rest: "Riposo", startWorkout: "Inizia Allenamento", squats: "Squat", pushups: "Flessioni" },
    nutrition: { title: "Matrice Metabolica e Nutrizione", calories: "Calorie", protein: "Proteine", carbohydrates: "Carboidrati", fat: "Grassi", water: "Acqua", breakfast: "Colazione", lunch: "Pranzo", dinner: "Cena", calculate: "Calcola", foodTracker: "Tracker Alimentare" },
    luna: { title: "Luna AI e Studio Clinico", greeting: "Ciao! Sono Luna, la tua assistente di intelligenza sanitaria e nutrizionale Luminix. Puoi chiedermi qualsiasi cosa su:", inputPlaceholder: "Chiedi a Luna informazioni su nutrizione, cibo o allenamento...", send: "INVIA", thinking: "Luna AI sta sintetizzando la risposta con Google Gemini..." },
    settings: { title: "Impostazioni", profile: "Profilo", language: "Lingua", theme: "Tema", notifications: "Notifiche", privacy: "Privacy", security: "Sicurezza", logout: "Esci", deleteAccount: "Elimina account", saveChanges: "Salva modifiche" },
    notifications: { success: "Successo", warning: "Avviso", error: "Errore", confirmAction: "Conferma azione", areYouSure: "Sei sicuro di voler continuare?", proceed: "Procedi", acceptAll: "ACCETTA TUTTO" }
};

// ── FILIPINO / TAGALOG (fil) ──────────────────────────────────────
TRANSLATIONS['fil'] = {
    common: { save: "I-save", cancel: "Kanselahin", confirm: "Kumpirmahin", delete: "Tanggalin", edit: "I-edit", continue: "Ipagpatuloy", back: "Bumalik", next: "Susunod", start: "Simulan", stop: "Itigil", retry: "Subukan muli", close: "Isara", search: "Maghanap", loading: "Naglo-load...", processing: "Pinoproseso...", success: "Tagumpay", failed: "Nabigo", error: "May error", noData: "Walang data na magagamit", noResults: "Walang nahanap na resulta", somethingWentWrong: "May nangyaring mali", tryAgain: "Subukan muli", yes: "Oo", no: "Hindi", ok: "OK", submit: "Isumite", send: "IPADALA", download: "I-download", share: "Ibahagi", copyLink: "KOPYAHIN ANG LINK", copied: "Nakopya na!", scrollToEnter: "Mag-scroll upang pumasok", breadcrumbSanctuary: "Santuwaryo", breadcrumbModules: "Mga Modyul", contact: "KONTAKIN" },
    auth: { login: "Mag-login", register: "Magrehistro", createAccount: "Gumawa ng Account", email: "Email", password: "Password", forgotPassword: "Nakalimutan ang password?", signIn: "Mag-sign in", signOut: "Mag-sign out", googleSignIn: "Mag-sign in sa Google", githubSignIn: "Mag-sign in sa GitHub", loading: "Nagpapatunay...", error: "Error sa pagpapatunay", logout: "Mag-logout", profile: "Profile", security: "Seguridad", welcomeBack: "Maligayang pagbabalik" },
    dashboard: { title: "Sistema ng Santuwaryo", heroLine1: "Kung saan ang katahimikan", heroLine2: "ay nagbubunyag", heroLine3: "ng hindi nakikita.", launchVision: "⚡ ILUNSAD ANG 60 FPS VISION →", startWorkout: "🏋️ SIMULAN ANG WORKOUT →", welcomeMessage: "Maligayang pagdating sa Luminix", steps: "Mga hakbang", calories: "Mga kalori", heartRate: "Tibok ng puso", sleep: "Tulog", weight: "Timbang", progress: "Progreso" },
    nav: { system: "SISTEMA", livePose: "LIVE POSE", yoga: "YOGA", gym: "GYM", nutrition: "NUTRISYON", food: "PAGKAIN", lunaExport: "LUNA AT I-EXPORT", connect: "KUMONEKTA", about: "TUNGKOL", vision: "Bisyon", metrics: "Mga Sukatan", luna: "Luna", sync: "I-sync" },
    gym: { title: "Adaptive Gym Engine", workout: "Workout", exercise: "Ehersisyo", sets: "Mga Set", reps: "Mga Rep", weight: "Timbang", rest: "Pahinga", startWorkout: "Simulan ang Workout", squats: "Squats", pushups: "Push-ups" },
    nutrition: { title: "Metabolic Matrix at Nutrisyon", calories: "Mga Kalori", protein: "Protina", carbohydrates: "Karbohidrato", fat: "Taba", water: "Tubig", breakfast: "Almusal", lunch: "Tanghalian", dinner: "Hapunan", calculate: "Kalkulahin", foodTracker: "Food Tracker" },
    luna: { title: "Luna AI at Clinical Studio", greeting: "Kumusta! Ako si Luna, ang iyong Luminix health at nutrition intelligence assistant. Pwede mo akong tanungin tungkol sa kahit ano:", inputPlaceholder: "Magtanong kay Luna tungkol sa nutrisyon, pagkain, o ehersisyo...", send: "IPADALA", thinking: "Gumagawa ng sagot si Luna AI gamit ang Google Gemini..." },
    settings: { title: "Mga Setting", profile: "Profile", language: "Wika", theme: "Tema", notifications: "Mga Notipikasyon", privacy: "Privacy", security: "Seguridad", logout: "Mag-logout", deleteAccount: "Burahin ang Account", saveChanges: "I-save ang mga pagbabago" },
    notifications: { success: "Tagumpay", warning: "Babala", error: "Error", confirmAction: "Kumpirmahin ang Aksyon", areYouSure: "Sigurado ka bang gusto mong magpatuloy?", proceed: "Magpatuloy", acceptAll: "TANGGAPIN LAHAT" }
};

// ── URDU (ur) — RTL ───────────────────────────────────────────────
TRANSLATIONS['ur'] = {
    common: { save: "محفوظ کریں", cancel: "منسوخ", confirm: "تصدیق", delete: "حذف کریں", edit: "ترمیم", continue: "جاری رکھیں", back: "واپس", next: "اگلا", start: "شروع", stop: "رکیں", retry: "دوبارہ کوشش", close: "بند کریں", search: "تلاش", loading: "لوڈ ہو رہا ہے...", processing: "پروسیس ہو رہا ہے...", success: "کامیاب", failed: "ناکام", error: "خرابی", noData: "کوئی ڈیٹا دستیاب نہیں", noResults: "کوئی نتائج نہیں ملے", somethingWentWrong: "کچھ غلط ہو گیا", tryAgain: "دوبارہ کوشش کریں", yes: "ہاں", no: "نہیں", ok: "ٹھیک ہے", submit: "جمع کریں", send: "بھیجیں", download: "ڈاؤن لوڈ", share: "شیئر کریں", copyLink: "لنک کاپی کریں", copied: "کاپی ہو گیا!", scrollToEnter: "داخل ہونے کے لیے سکرول کریں", breadcrumbSanctuary: "حرم", breadcrumbModules: "ماڈیولز", contact: "رابطہ" },
    auth: { login: "لاگ ان", register: "رجسٹر کریں", createAccount: "اکاؤنٹ بنائیں", email: "ای میل", password: "پاس ورڈ", forgotPassword: "پاس ورڈ بھول گئے؟", signIn: "سائن ان", signOut: "سائن آؤٹ", googleSignIn: "Google سے سائن ان", githubSignIn: "GitHub سے سائن ان", loading: "تصدیق ہو رہی ہے...", error: "تصدیق کی خرابی", logout: "لاگ آؤٹ", profile: "پروفائل", security: "سیکیورٹی", welcomeBack: "واپسی پر خوش آمدید" },
    dashboard: { title: "حرم نظام", heroLine1: "جہاں خاموشی", heroLine2: "نادیدہ کو", heroLine3: "ظاہر کرتی ہے۔", launchVision: "⚡ 60 FPS ویژن شروع کریں →", startWorkout: "🏋️ ورزش شروع کریں →", welcomeMessage: "Luminix میں خوش آمدید", steps: "قدم", calories: "کیلوریز", heartRate: "دل کی دھڑکن", sleep: "نیند", weight: "وزن", progress: "پیش رفت" },
    nav: { system: "نظام", livePose: "لائیو پوز", yoga: "یوگا", gym: "جم", nutrition: "غذائیت", food: "کھانا", lunaExport: "LUNA اور ایکسپورٹ", connect: "جڑیں", about: "کے بارے میں", vision: "ویژن", metrics: "میٹرکس", luna: "Luna", sync: "مطابقت" },
    gym: { title: "ایڈاپٹو جم انجن", workout: "ورزش", exercise: "ایکسرسائز", sets: "سیٹ", reps: "ریپس", weight: "وزن", rest: "آرام", startWorkout: "ورزش شروع کریں", squats: "اسکواٹس", pushups: "پش اپس" },
    nutrition: { title: "میٹابولک میٹرکس اور غذائیت", calories: "کیلوریز", protein: "پروٹین", carbohydrates: "کاربوہائیڈریٹس", fat: "چربی", water: "پانی", breakfast: "ناشتہ", lunch: "دوپہر کا کھانا", dinner: "رات کا کھانا", calculate: "حساب لگائیں", foodTracker: "فوڈ ٹریکر" },
    luna: { title: "Luna AI اور کلینیکل اسٹوڈیو", greeting: "السلام علیکم! میں Luna ہوں، آپ کی Luminix صحت اور غذائیت کی ذہین معاون۔ آپ مجھ سے کچھ بھی پوچھ سکتے ہیں:", inputPlaceholder: "Luna سے غذائیت، کھانے یا ورزش کے بارے میں پوچھیں...", send: "بھیجیں", thinking: "Luna AI گوگل جیمنائی کے ساتھ جواب تیار کر رہی ہے..." },
    settings: { title: "ترتیبات", profile: "پروفائل", language: "زبان", theme: "تھیم", notifications: "اطلاعات", privacy: "رازداری", security: "سیکیورٹی", logout: "لاگ آؤٹ", deleteAccount: "اکاؤنٹ حذف کریں", saveChanges: "تبدیلیاں محفوظ کریں" },
    notifications: { success: "کامیاب", warning: "انتباہ", error: "خرابی", confirmAction: "عمل کی تصدیق", areYouSure: "کیا آپ واقعی جاری رکھنا چاہتے ہیں؟", proceed: "جاری رکھیں", acceptAll: "سب قبول کریں" }
};

// ──────────────────────────────────────────────────────────────────
// WRITE ALL TRANSLATION FILES
// ──────────────────────────────────────────────────────────────────

function writeTranslations() {
    const allLangs = Object.keys(TRANSLATIONS);
    
    for (const lang of allLangs) {
        const langData = TRANSLATIONS[lang];
        const langDir = path.join(LOCALES_DIR, lang);
        
        // Ensure directory exists
        if (!fs.existsSync(langDir)) {
            fs.mkdirSync(langDir, { recursive: true });
        }
        
        // Write each namespace as a separate file
        for (const ns of NAMESPACES) {
            if (langData[ns]) {
                const nsData = {};
                nsData[ns] = langData[ns];
                
                const filePath = path.join(langDir, `${ns}.json`);
                fs.writeFileSync(filePath, JSON.stringify(nsData, null, 4), 'utf8');
                console.log(`✓ Written: ${lang}/${ns}.json`);
            }
        }
    }
    
    console.log(`\n✅ Generated translations for ${allLangs.length} languages.`);
}

writeTranslations();

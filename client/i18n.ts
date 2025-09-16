import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      hero: {
        titlePrefix: "Discover Safer Journeys —",
        titleHighlight: "Explore Confidently",
        description: "Real-time safety insights, localized advisories and trusted resources to help travelers and communities make better decisions. Built for tourists, local responders and planners."
      },
      cta: {
        getStarted: "Get Started",
        viewLive: "View Live Data"
      },
      supportsLine: "Supports English and local languages — Real-time monitoring — 24/7 support",
      features: {
        aiSafety: { title: "AI Safety Scoring", desc: "Real-time risk assessment" },
        instantAlerts: { title: "Instant Alerts", desc: "Emergency response system" },
        community: { title: "Community Network", desc: "Connected safety ecosystem" },
        cultural: { title: "Cultural Guidance", desc: "Local insights & tips" }
      },
      live: {
        statusLabel: "Live System Status",
        uptime: "Uptime",
        responseTime: "Response Time"
      },
      trust: {
        title: "Why people trust us",
        subtitle: "Trusted by thousands of travelers and supported by government authorities"
      },
      testimonials: {
        title: "What travellers say",
        subtitle: "Real experiences from tourists and responders using our platform",
        items: [
          {
            quote: "The live map helped me choose safer routes every day — super handy and easy to use. I felt much more confident exploring new places.",
            author: "Asha",
            role: "International Tourist"
          },
          {
            quote: "Local alerts were clear and timely — improved coordination for our team. The real-time updates made our response much more effective.",
            author: "Inspector R.",
            role: "Local Law Enforcement"
          },
          {
            quote: "The bilingual labels are a lifesaver for communicating with locals. My clients love the cultural sensitivity and safety features.",
            author: "Marco",
            role: "Professional Tour Guide"
          }
        ]
      },
      faq: {
        title: "Frequently asked questions",
        subtitle: "Everything you need to know about YatraRakshak",
        items: [
          {
            question: "Is the data verified?",
            answer: "We aggregate from official sources and community reports; critical alerts are escalated through partner channels and verified by government authorities."
          },
          {
            question: "Can I contribute local updates?",
            answer: "Yes — community reporting tools are available in the app and reviewed before publish. We value local insights while maintaining data quality."
          },
          {
            question: "Which languages are supported?",
            answer: "English and Hindi for full interface, with local languages for place names. More languages planned based on demand and community feedback."
          },
          {
            question: "How secure is my data?",
            answer: "We use blockchain technology for identity verification and AI for anonymized safety scoring. Your personal data is encrypted and never shared without consent."
          }
        ]
      },
      appName: "YatraRakshak",
      tagline: "Real-time monitoring & instant response",
      ctaGetId: "Get Digital ID",
      ctaLogin: "Police/Admin Login",
      heroSubtitle: "Futuristic safety with live maps, AI insights and rapid alerts.",
      nav: {
        home: "Home",
        tourist: "Tourist",
        police: "Police",
        admin: "Admin",
        privacy: "Privacy",
        terms: "Terms"
      },
      dashboard: {
        panic: "Panic",
        safetyScore: "Safety Score",
        alerts: "Alerts",
        itinerary: "Itinerary",
        contacts: "Emergency contacts"
      }
    }
  },
  hi: {
    translation: {
      hero: {
        titlePrefix: "सुरक्षित यात्राओं की खोज —",
        titleHighlight: "आत्मविश्वास के साथ खोजें",
        description: "रियल-टाइम सुरक्षा सूचनाएं, स्थानीय सलाह और विश्वसनीय संसाधन जो यात्रियों और समुदायों को बेहतर निर्णय लेने में मदद करते हैं।"
      },
      cta: {
        getStarted: "शुरू करें",
        viewLive: "लाइव डेटा देखें"
      },
      supportsLine: "अंग्रेज़ी और स्थानीय भाषाओं के लिए समर्थन — रियल-टाइम मॉनिटरिंग — 24/7 सहायता",
      features: {
        aiSafety: { title: "एआई सुरक्षा स्कोरिंग", desc: "रियल-टाइम जोखिम आकलन" },
        instantAlerts: { title: "तुरंत अलर्ट", desc: "आपातकालीन प्रतिक्रिया प्रणाली" },
        community: { title: "सामुदायिक नेटवर्क", desc: "जुड़ी हुई सुरक्षा पारिस्थितिकी" },
        cultural: { title: "सांस्कृतिक मार्गदर्शन", desc: "स्थानीय जानकारी और सुझाव" }
      },
      live: {
        statusLabel: "लाइव सिस्टम स्थिति",
        uptime: "अपटाइम",
        responseTime: "प्रतिक्रिया समय"
      },
      trust: {
        title: "लोग हम पर भरोसा क्यों करते हैं",
        subtitle: "हज़ारों यात्रियों द्वारा भरोसा और सरकारी प्राधिकरणों द्वारा समर्थित"
      },
      testimonials: {
        title: "यात्रियों की राय",
        subtitle: "हमारे प्लेटफ़ॉर्म का उपयोग करने वाले यात्रियों और प्रत्युत्तरकर्ताओं के अनुभव",
        items: [
          { quote: "लाइव मैप ने मुझे हर दिन सुरक्षित रास्ते चुनने में मदद की — बहुत उपयोगी और उपयोग में आसान।", author: "आशा", role: "अंतरराष्ट्रीय यात्री" },
          { quote: "स्थानीय अलर्ट स्पष्ट और समय पर थे — हमारी टीम के समन्वय में सुधार हुआ।", author: "इंस्पेक्टर R.", role: "स्थानीय कानून प्रवर्तन" },
          { quote: "द्विभाषी लेबल स्थानीय लोगों के साथ संवाद के लिए जीवन रक्षक हैं।", author: "मार्को", role: "प्रोफेशनल टूर गाइड" }
        ]
      },
      faq: {
        title: "अक्सर पूछे जाने वाले प्रश्न",
        subtitle: "YatraRakshak के बारे में जो कुछ आपको जानना चाहिए",
        items: [
          { question: "क्या डेटा सत्यापित होता है?", answer: "हम आधिकारिक स्रोतों और समुदाय की रिपोर्टों से संकलित करते हैं; महत्वपूर्ण अलर्ट साझेदार चैनलों के माध्यम से प्रचारित और सरकारी प्राधिकरणों द्वारा सत्यापित होते हैं।" },
          { question: "क्या मैं स्थानीय अपडेट योगदान कर सकता/सकती हूँ?", answer: "हाँ — community reporting उपकरण उपलब्ध हैं और प्रकाशित होने से पहले समीक्षा किए जाते हैं।" },
          { question: "किस भाषाओं का समर्थन है?", answer: "पूर्ण इंटरफ़ेस के लिए अंग्रेज़ी और हिंदी, और स्थान नामों के लिए स्थानीय भाषाएँ।" },
          { question: "मेरा डेटा कितना सुरक्षित है?", answer: "हम पहचान सत्यापन के लिए ब्लॉकचेन और गुमनाम सुरक्षा स्कोरिंग के लिए एआई का उपयोग करते हैं। आपका व्यक्तिगत डेटा एन्क्रिप्ट किया जाता है।" }
        ]
      },
      appName: "यात्रा रक्षक (YatraRakshak)",
      tagline: "रियल-टाइम निगरानी और त्वरित प्रतिक्रिया",
      ctaGetId: "डिजिटल आईडी प्राप्त करें",
      ctaLogin: "पुलिस/एडमिन लॉगिन",
      heroSubtitle: "लाइव मैप, एआई इनसाइट्स और तेज़ अलर्ट के साथ सुरक्षित यात्रा।",
      nav: {
        home: "होम",
        tourist: "पर्यटक",
        police: "पुलिस",
        admin: "एडमिन",
        privacy: "गोपनीयता",
        terms: "नियम"
      },
      dashboard: {
        panic: "पैनिक",
        safetyScore: "सेफ़्टी स्कोर",
        alerts: "अलर्ट",
        itinerary: "यात्रा योजना",
        contacts: "आपातकालीन संपर्क"
      }
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false }
});

export default i18n;

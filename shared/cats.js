// The one list of complaint categories. The form, the admin panel, the server checks and the WhatsApp,
// Telegram and push messages all read it. `icon` is an icon name from src/components/ui.jsx, `ex` is a short example line.
export const CATS = [
  { id: "road", ta: "சாலை", en: "Road", icon: "road", ex: { ta: "குழி, சேதமடைந்த சாலை", en: "Potholes, damaged road" } },
  { id: "water", ta: "குடிநீர்", en: "Drinking water", icon: "water", ex: { ta: "தண்ணீர் வரவில்லை, கசிவு", en: "No supply, leakage" } },
  { id: "drain", ta: "கழிவுநீர்", en: "Drainage", icon: "drain", ex: { ta: "அடைப்பு, நிரம்பி வழிதல்", en: "Blocked, overflowing" } },
  { id: "light", ta: "தெருவிளக்கு", en: "Streetlight", icon: "light", ex: { ta: "விளக்கு எரியவில்லை", en: "Light not working" } },
  { id: "trash", ta: "குப்பை", en: "Garbage", icon: "trash", ex: { ta: "குப்பை அள்ளப்படவில்லை", en: "Garbage not cleared" } },
  { id: "power", ta: "மின்சாரம்", en: "Electricity", icon: "power", ex: { ta: "மின்தடை, சாய்ந்த கம்பம்", en: "Outage, leaning pole" } },
  { id: "toilet", ta: "கழிப்பறை", en: "Public toilet", icon: "toilet", ex: { ta: "சுத்தம், தண்ணீர் இல்லை", en: "Cleanliness, no water" } },
  { id: "health", ta: "சுகாதாரம்", en: "Health and hygiene", icon: "health", ex: { ta: "கொசு, தொற்று அபாயம்", en: "Mosquitoes, infection risk" } },
  { id: "animal", ta: "தெருநாய் / கால்நடை", en: "Stray animals", icon: "animal", ex: { ta: "நாய்த் தொல்லை, மாடுகள்", en: "Dogs, cattle on road" } },
  { id: "encroach", ta: "ஆக்கிரமிப்பு", en: "Encroachment", icon: "encroach", ex: { ta: "சாலை, நடைபாதை", en: "Roads, footpaths" } },
  { id: "tree", ta: "மரம்", en: "Tree", icon: "tree", ex: { ta: "விழுந்த, ஆபத்தான மரம்", en: "Fallen or risky tree" } },
  { id: "park", ta: "பூங்கா", en: "Park", icon: "park", ex: { ta: "பராமரிப்பு, விளையாட்டு இடம்", en: "Upkeep, playground" } },
  { id: "bus", ta: "பேருந்து நிறுத்தம்", en: "Bus stop", icon: "bus", ex: { ta: "நிழற்குடை, வசதி", en: "Shelter, facilities" } },
  { id: "safety", ta: "பாதுகாப்பு", en: "Safety", icon: "safety", ex: { ta: "இரவு பாதுகாப்பு, தொல்லை", en: "Night safety, nuisance" } },
  { id: "other", ta: "பிற", en: "Something else", icon: "other", ex: { ta: "மேலே இல்லாத வேறு பிரச்சனை", en: "Any other problem" } }
];
export const CAT_IDS = CATS.map(c => c.id);
export const catLabels = lang => Object.fromEntries(CATS.map(c => [c.id, c[lang]]));

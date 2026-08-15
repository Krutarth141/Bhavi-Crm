export interface InquiryFieldDef {
    id: string;
    label: string;
    type: 'select' | 'text';
    opts?: string[];
    placeholder?: string;
}

export interface ServiceDef {
    icon: string;
    name: string;
    price: string;
    type: 'repair' | 'inquiry';
    repairCat?: 'printer' | 'scanner';
    sub?: string;
    includes?: string[];
    inqType?: string;
    fields?: InquiryFieldDef[];
}

export const SERVICES: Record<string, ServiceDef> = {
    'printer-repair': { icon: '🖨️', name: 'Printer Repair', price: 'Starting ₹413/-', type: 'repair', repairCat: 'printer' },
    'scanner-repair': { icon: '🖻', name: 'Scanner Service', price: 'Starting ₹413/-', type: 'repair', repairCat: 'scanner' },
    'camera-repair': {
        icon: '📷', name: 'Camera Repair', price: 'Starting ₹1500/-', type: 'inquiry',
        sub: 'Expert repair for all major camera brands',
        includes: ['All major brands: Canon, Fujifilm, Panasonic, Nikon, Sony', 'Camera body & lens repair', 'Water damage assessment', 'Shutter, sensor & display repair', 'Detailed estimate before any work begins', 'Repaired at our certified service centre'],
        inqType: 'Camera Repair',
        fields: [
            { id: 'inq-brand', label: 'Camera Brand', type: 'select', opts: ['Canon', 'Fujifilm', 'Panasonic', 'Nikon', 'Sony', 'Other'] },
            { id: 'inq-model', label: 'Camera Model', type: 'text', placeholder: 'e.g. Canon EOS 1500D' },
            { id: 'inq-issue', label: 'Issue', type: 'select', opts: ['Not Turning On', 'Lens Error / Stuck Lens', 'Auto-Focus Not Working', 'Display / Screen Broken', 'Water Damage', 'Physical Damage', 'Shutter Issue', 'Error on Display', 'Other'] },
        ],
    },
    'printer-amc': {
        icon: '📋', name: 'Printer AMC', price: 'Starting ₹5000/- per year', type: 'inquiry',
        sub: 'Annual Maintenance Contract for your office printer',
        includes: ['Scheduled service visits throughout the year', 'Head cleaning & alignment', 'Minor adjustments & tune-up', 'Priority support response', 'Flexible plans: 1 year / 2 year', 'Ink, toner & spare parts charged separately'],
        inqType: 'Printer AMC',
        fields: [
            { id: 'inq-qty', label: 'Number of Printers', type: 'select', opts: ['1', '2', '3', '4', '5 or more'] },
            { id: 'inq-prmodel', label: 'Printer Brand / Model', type: 'text', placeholder: 'e.g. Canon PIXMA G3010' },
            { id: 'inq-usage', label: 'Usage Level', type: 'select', opts: ['Light (Home use)', 'Medium (Small office)', 'Heavy (Commercial / High volume)'] },
        ],
    },
    'home-automation': {
        icon: '🏠', name: 'Home Automation', price: 'Starting ₹3000/-', type: 'inquiry',
        sub: 'Transform your home with smart controls',
        includes: ['Control lights, fans & appliances via app or voice', 'Works with Google Home, Alexa & Apple Siri', 'Curtain & blind automation', 'Smart door locks & security', 'Professional installation by certified team', 'No rewiring required for most setups'],
        inqType: 'Home Automation',
        fields: [
            { id: 'inq-proptype', label: 'Property Type', type: 'select', opts: ['Flat / Apartment', 'Bungalow / Villa', 'Office', 'Shop / Showroom', 'Other'] },
            { id: 'inq-automation', label: 'What do you want to automate?', type: 'select', opts: ['Lights & Fans', 'Curtains / Blinds', 'Security & Door Locks', 'Full Home (All of the above)', 'Not sure — need guidance'] },
            { id: 'inq-rooms', label: 'Number of Rooms / Points', type: 'select', opts: ['1 – 5', '6 – 10', '11 – 20', 'More than 20'] },
        ],
    },
    'cctv-install': {
        icon: '📹', name: 'CCTV Installation', price: 'Starting ₹2500/-', type: 'inquiry',
        sub: 'Professional security camera installation',
        includes: ['Supply & installation of HD / IP cameras', 'DVR / NVR setup & configuration', 'Mobile app for remote live view', 'Covers homes, offices, shops & warehouses', 'Indoor & outdoor weatherproof cameras', '1 year installation warranty'],
        inqType: 'CCTV Installation',
        fields: [
            { id: 'inq-proptype', label: 'Property Type', type: 'select', opts: ['Home / Residence', 'Office', 'Shop / Showroom', 'Warehouse / Factory', 'Other'] },
            { id: 'inq-camcount', label: 'No. of Cameras Needed', type: 'select', opts: ['2 cameras', '4 cameras', '6 cameras', '8 cameras', 'More than 8 (we will advise)'] },
            { id: 'inq-camtype', label: 'Preferred Camera Type', type: 'select', opts: ['Basic HD (720p / 1080p)', 'Full HD (2MP / 4MP)', '4K / IP Camera', 'Not Sure — as per budget'] },
        ],
    },
};

export const SERVICE_ORDER = ['printer-repair', 'scanner-repair', 'camera-repair', 'printer-amc', 'home-automation', 'cctv-install'];

export type Lang = 'en' | 'hi' | 'gu';

export const TL: Record<Lang, Record<string, string>> = {
    en: { 'mobile-title': 'Enter your mobile number', 'mobile-lbl': 'Mobile Number', check: 'Check →', 'cust-title': 'Please fill your details', back: 'Back', fname: 'First Name', lname: 'Last Name', mob: 'Mobile', alt: 'Alternate No', addr: 'Address Line 1', pin: 'Pin Code', city: 'City', state: 'State', 'save-cont': 'Save & Continue →', 'warr-title': 'Is your product under warranty?', w1: 'Warranty', w1s: 'My product is under manufacturer warranty', w2: 'Out of Warranty', w2s: 'Warranty period has expired', w3: 'Not Sure', w3s: 'I am not sure about the warranty status', 'prod-title': 'Enter product information', model: 'Model Number', serial: 'Serial Number', problem: 'Problem', remarks: 'Remarks / Description', 'model-hint': 'Start typing to search or enter manually', 'sign-title': 'Sign to confirm your request', 'clear-sign': 'Clear Signature', 'sign-note': 'By signing, you confirm the details are correct.', submit: '✅ Submit', 'inq-title': 'Tell us about your requirement', 'inq-remarks': 'Additional Remarks' },
    hi: { 'mobile-title': 'मोबाइल नंबर दर्ज करें', 'mobile-lbl': 'मोबाइल नंबर', check: 'जाँचें →', 'cust-title': 'कृपया अपनी जानकारी भरें', back: 'वापस', fname: 'पहला नाम', lname: 'अंतिम नाम', mob: 'मोबाइल', alt: 'वैकल्पिक नंबर', addr: 'पूरा पता', pin: 'पिन कोड', city: 'शहर', state: 'राज्य', 'save-cont': 'सहेजें और जारी रखें →', 'warr-title': 'क्या आपका उत्पाद वारंटी में है?', w1: 'वारंटी', w1s: 'मेरा उत्पाद वारंटी में है', w2: 'वारंटी समाप्त', w2s: 'वारंटी अवधि समाप्त', w3: 'पता नहीं', w3s: 'वारंटी की जानकारी नहीं', 'prod-title': 'उत्पाद की जानकारी दर्ज करें', model: 'मॉडल नंबर', serial: 'सीरियल नंबर', problem: 'समस्या', remarks: 'टिप्पणी', 'model-hint': 'खोजने के लिए टाइप करें', 'sign-title': 'अपनी शिकायत की पुष्टि के लिए हस्ताक्षर करें', 'clear-sign': 'साफ़ करें', 'sign-note': 'हस्ताक्षर करके, आप पुष्टि करते हैं कि जानकारी सही है।', submit: '✅ सबमिट करें', 'inq-title': 'अपनी आवश्यकता बताएं', 'inq-remarks': 'अतिरिक्त टिप्पणी' },
    gu: { 'mobile-title': 'મોબાઈલ નંબર દાખલ કરો', 'mobile-lbl': 'મોબાઈલ નંબર', check: 'તપાસો →', 'cust-title': 'કૃપા કરી વિગત ભરો', back: 'પાછળ', fname: 'પ્રથમ નામ', lname: 'અટક', mob: 'મોબાઈલ', alt: 'વૈકલ્પિક નંબર', addr: 'સંપૂર્ણ સરનામું', pin: 'પિન કોડ', city: 'શહેર', state: 'રાજ્ય', 'save-cont': 'સેવ કરો અને ચાલુ →', 'warr-title': 'Product warranty માં છે?', w1: 'Warranty', w1s: 'Product manufacturer warranty માં છે', w2: 'Warranty સમાપ્ત', w2s: 'Warranty expire થઈ ગઈ', w3: 'ખ્યાલ નથી', w3s: 'Warranty status ની ખબર નથી', 'prod-title': 'Product ની માહિતી', model: 'Model Number', serial: 'Serial Number', problem: 'સમસ્યા', remarks: 'રિમાર્ક', 'model-hint': 'Search કરો અથવા type કરો', 'sign-title': 'Request confirm કરવા signature', 'clear-sign': 'Clear', 'sign-note': 'Signature કરીને confirm કરો.', submit: '✅ Submit', 'inq-title': 'તમારી જરૂરિયાત જણાવો', 'inq-remarks': 'વધારાની માહિતી' },
};

export const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi',
];

export const PROBLEM_OPTIONS = [
    'Paper Jam', 'Not Printing', 'Ink / Toner Not Recognized', 'Poor Print Quality', 'Scanner Not Working',
    'Connectivity Issue (WiFi / USB)', 'Display / Panel Not Working', 'Error Code / Blinking Lights',
    'Head Cleaning Required', 'Physical Damage', 'Noise / Sound Issue', 'Not Turning On', 'Other',
];

export type WarrantyType = 'warranty' | 'out_of_warranty' | 'not_sure';
export type RepairType = 'onsite' | 'carry-in';

export interface ExistingCustomer {
    cname?: string;
    address?: string;
    city?: string;
    pin?: string;
    state?: string;
    alt_mobile?: string;
}
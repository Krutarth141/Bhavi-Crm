export type WizardLang = 'en' | 'gu' | 'hi';

export interface WizardCategory {
    id: string;
    icon: string;
    label: Record<WizardLang, string>;
    sub: Record<WizardLang, string>;
    hasBrand: boolean;
    wc?: 'ICP' | 'CSP';
    purchase?: boolean;
}

export const CATS: WizardCategory[] = [
    {
        id: 'camera', icon: '📷',
        label: { en: 'Camera', gu: 'કૅમેરા', hi: 'कैमरा' },
        sub: { en: 'Canon, Panasonic, Fujifilm, Instax', gu: 'Canon, Panasonic, Fujifilm, Instax', hi: 'Canon, Panasonic, Fujifilm, Instax' },
        hasBrand: true,
    },
    {
        id: 'printer', icon: '🖨️',
        label: { en: 'Printer / Scanner', gu: 'પ્રિન્ટર / સ્કૅનર', hi: 'प्रिंटर / स्कैनर' },
        sub: { en: 'Canon Printers & Scanners', gu: 'Canon Printers & Scanners', hi: 'Canon Printers & Scanners' },
        hasBrand: false, wc: 'CSP',
    },
    {
        id: 'flash', icon: '⚡',
        label: { en: 'Flash / Lights', gu: 'ફ્લૅશ / લાઇટ', hi: 'फ्लैश / लाइट' },
        sub: { en: 'Canon, Godox', gu: 'Canon, Godox', hi: 'Canon, Godox' },
        hasBrand: true,
    },
    {
        id: 'projector', icon: '📽️',
        label: { en: 'Projectors', gu: 'પ્રોજૅક્ટર', hi: 'प्रोजेक्टर' },
        sub: { en: 'Casio, Other Brands', gu: 'Casio, Other Brands', hi: 'Casio, Other Brands' },
        hasBrand: true,
    },
    {
        id: 'music', icon: '🎵',
        label: { en: 'Musical Instruments', gu: 'સ્સ્ સ્ સ્ Musical Instruments', hi: 'संगीत वाद्य' },
        sub: { en: 'All brands', gu: 'All brands', hi: 'All brands' },
        hasBrand: false, wc: 'ICP',
    },
    {
        id: 'accessories', icon: '🎒',
        label: { en: 'Accessories', gu: 'Accessories (ICP)', hi: 'Accessories (ICP)' },
        sub: { en: 'Bags, Straps, Filters, Tripods & more', gu: 'Bags, Straps, Filters, Tripods & more', hi: 'Bags, Straps, Filters, Tripods & more' },
        hasBrand: false, wc: 'ICP', purchase: true,
    },
    {
        id: 'ink', icon: '🖨️',
        label: { en: 'Ink, Cartridge & Parts', gu: 'Ink, Cartridge & Parts (CSP)', hi: 'Ink, Cartridge & Parts (CSP)' },
        sub: { en: 'Ink tanks, cartridges, printer parts', gu: 'Ink tanks, cartridges, printer parts', hi: 'Ink tanks, cartridges, printer parts' },
        hasBrand: false, wc: 'CSP', purchase: true,
    },
];

export interface WizardBrand { name: string; emoji: string; wc: 'ICP' | 'CSP'; }

export const BRANDS: Record<string, WizardBrand[]> = {
    camera: [
        { name: 'Canon', emoji: '🔴', wc: 'ICP' },
        { name: 'Panasonic', emoji: '🔵', wc: 'ICP' },
        { name: 'Fujifilm', emoji: '🟢', wc: 'CSP' },
        { name: 'Instax', emoji: '🟡', wc: 'CSP' },
    ],
    flash: [
        { name: 'Canon', emoji: '🔴', wc: 'ICP' },
        { name: 'Godox', emoji: '🟠', wc: 'ICP' },
    ],
    projector: [
        { name: 'Casio', emoji: '🔵', wc: 'ICP' },
        { name: 'Other Brands', emoji: '⚪', wc: 'ICP' },
    ],
};

export const PROBLEM_OPTS: Record<string, string[]> = {
    camera: ['Not turning on', 'Display / Screen issue', 'Lens error / Stuck lens', 'Not capturing / AF issue', 'Water damage', 'Physical damage', 'Error code', 'Cleaning required', 'Other'],
    printer: ['Paper jam', 'Not printing', 'Ink not recognized', 'Poor print quality', 'Scanner not working', 'Error code / Blinking lights', 'Physical damage', 'Service / Cleaning required', 'Other'],
    flash: ['Not firing', 'Power / Charging issue', 'Hot shoe damage', 'Display not working', 'Physical damage', 'Other'],
    projector: ['No display / No signal', 'Lamp warning', 'Remote not working', 'Poor image quality', 'Physical damage', 'Other'],
    music: ['Not working', 'Sound issue', 'Physical damage', 'Service required', 'Other'],
};

export type WizardPurposeId = 'repair' | 'eol' | 'cleaning' | 'delivery';

export const PURPOSES: { id: WizardPurposeId; type: 'Inward' | 'Outward' }[] = [
    { id: 'repair', type: 'Inward' },
    { id: 'eol', type: 'Inward' },
    { id: 'cleaning', type: 'Inward' },
    { id: 'delivery', type: 'Outward' },
];

export const T: Record<WizardLang, Record<string, string>> = {
    gu: {
        mobile_hdr: 'સ્વાગત છે', mobile_sub: 'આગળ વધવા માટે આપનો મોબાઇલ નંબર દાખલ કરો',
        lbl_mobile: 'મોબાઇલ નંબર',
        customer_hdr: 'આપની માહિતી', customer_sub: 'કૃપા કરીને આપની વિગત ભરો',
        lbl_found: 'આવકાર! અમારી પાસે આપની નોંધ છે:', lbl_name: 'પૂરું નામ',
        lbl_state: 'રાજ્ય', lbl_city: 'શહેર', lbl_pin: 'પિન કોડ', lbl_area: 'વિસ્તાર', lbl_address: 'સરનામું',
        confirm: 'પ્રમાણિત કરો →',
        category_hdr: 'Product Category પસંદ કરો', category_sub: 'આજે કયો Product લઈ આવ્યા?',
        brand_hdr: 'Brand પસંદ કરો', brand_sub: 'આપનો Product Brand પસંદ કરો',
        purpose_hdr: 'મુલાકાતનો હેતુ', purpose_sub: 'આજે શેના માટે આવ્યા?',
        lbl_repair: 'ઉત્પાદનમાં ખામી — સમારકામ માટે', lbl_repair_sub: 'Product ની ખામી સર્વિસ માટે સોંપો',
        lbl_eol: 'EOL ઉત્પાદ — જૂના Products', lbl_eol_sub: 'End-of-life અથવા જૂના Product ની સર્વિસ',
        lbl_cleaning: 'સર્વિસ / ક્લિનિંગ જોઈએ', lbl_cleaning_sub: 'Product ની Routine Service/Cleaning',
        lbl_delivery: 'Product Delivery — Collection', lbl_delivery_sub: 'સમારેલ Product લઈ જવા',
        product_hdr: 'Product ની વિગત', product_sub: 'Product ની માહિતી ભરો',
        lbl_warranty: 'વૉરન્ટી સ્થિતિ',
        w_yes: 'વૉરન્ટી', w_no: 'વૉ. બહાર', w_other: 'ખ્યાલ નથી',
        lbl_model: 'Model Number', lbl_serial: 'Serial No (જો ખ્યાલ હોય)',
        lbl_problem_sel: 'સમસ્યાનો પ્રકાર', lbl_problem_text: 'સમસ્યા જણાવો', lbl_problem_detail: 'વધુ માહિતી (optional)',
        submit: 'Check-in પૂર્ણ કરો ✓',
        success_hdr: 'Check-in સફળ!', success_sub: 'અમારી ટીમ ટૂંક સમયમાં સહાય કરશે',
        token_label: 'આપનો Token Number',
        wait_msg: '🙏 કૃપા કરી બેઠક ગ્રહણ કરો. Team આપનો Token Number બોલાવે ત્યારે આવો.',
        new_entry: 'નવી નોંધણી', back: 'પાછળ', next: 'આગળ',
        err_mobile: '10 અંકનો મોબાઇલ નંબર દાખલ કરો',
        err_name: 'નામ ભરો',
        err_warranty: 'વૉરન્ટી સ્થિતિ પસંદ કરો',
        err_model: 'Model Number ભરો',
        delivery_hdr: 'Product Collection', delivery_pg_sub: 'આજે કયો Product લઈ જવો છે?',
        lbl_delivery_submit: 'Collection Confirm કરો ✓',
    },
    hi: {
        mobile_hdr: 'आपका स्वागत है', mobile_sub: 'कृपया अपना मोबाइल नंबर दर्ज करें',
        lbl_mobile: 'मोबाइल नंबर',
        customer_hdr: 'आपकी जानकारी', customer_sub: 'कृपया अपनी जानकारी भरें',
        lbl_found: 'आपका स्वागत! हमारे पास आपकी जानकारी है:', lbl_name: 'पूरा नाम',
        lbl_state: 'राज्य', lbl_city: 'शहर', lbl_pin: 'पिन कोड', lbl_area: 'क्षेत्र', lbl_address: 'पता',
        confirm: 'पुष्टि करें →',
        category_hdr: 'Product Category चुनें', category_sub: 'आज कौन-सा Product लाए हैं?',
        brand_hdr: 'Brand चुनें', brand_sub: 'अपना Product Brand चुनें',
        purpose_hdr: 'यात्रा का उद्देश्य', purpose_sub: 'आज किस कारण आए हैं?',
        lbl_repair: 'Product में खराबी — मरम्मत हेतु', lbl_repair_sub: 'Product की खराबी सर्विस के लिए जमा करें',
        lbl_eol: 'EOL उत्पाद — पुराने Products', lbl_eol_sub: 'End-of-life या पुराने Product की सर्विस',
        lbl_cleaning: 'सर्विस / सफाई चाहिए', lbl_cleaning_sub: 'Product की Routine Service/Cleaning',
        lbl_delivery: 'Product Delivery — Collection', lbl_delivery_sub: 'मरम्मत किया हुआ Product लेना',
        product_hdr: 'Product की जानकारी', product_sub: 'Product का विवरण भरें',
        lbl_warranty: 'वारंटी स्थिति',
        w_yes: 'वारंटी में', w_no: 'वारंटी बाहर', w_other: 'ज्ञात नहीं',
        lbl_model: 'Model Number', lbl_serial: 'Serial No (यदि मालूम हो)',
        lbl_problem_sel: 'समस्या का प्रकार', lbl_problem_text: 'समस्या बताएं', lbl_problem_detail: 'अतिरिक्त जानकारी (optional)',
        submit: 'Check-in पूर्ण करें ✓',
        success_hdr: 'Check-in सफल!', success_sub: 'हमारी टीम शीघ्र सहायता करेगी',
        token_label: 'आपका Token Number',
        wait_msg: '🙏 कृपया बैठें। टीम आपका Token Number बुलाए तब पधारें।',
        new_entry: 'नई प्रविष्टि', back: 'वापस', next: 'आगे',
        err_mobile: '10 अंकों का मोबाइल नंबर दर्ज करें',
        err_name: 'नाम भरें',
        err_warranty: 'वारंटी स्थिति चुनें',
        err_model: 'Model Number भरें',
        delivery_hdr: 'Product Collection', delivery_pg_sub: 'आज कौन-सा product लेना है?',
        lbl_delivery_submit: 'Collection Confirm करें ✓',
    },
    en: {
        mobile_hdr: 'Welcome', mobile_sub: 'Enter your mobile number to proceed',
        lbl_mobile: 'Mobile Number',
        customer_hdr: 'Your Details', customer_sub: 'Please confirm or fill in your information',
        lbl_found: 'Welcome back! We found your details:', lbl_name: 'Full Name',
        lbl_state: 'State', lbl_city: 'City', lbl_pin: 'Pin Code', lbl_area: 'Area / Society', lbl_address: 'Address',
        confirm: 'Confirm & Continue →',
        category_hdr: 'Select Product Category', category_sub: 'What product are you bringing today?',
        brand_hdr: 'Select Brand', brand_sub: 'Choose your product brand',
        purpose_hdr: 'Purpose of Visit', purpose_sub: 'What do you need help with today?',
        lbl_repair: 'Problem in Product — Submit for Repair', lbl_repair_sub: 'Product has an issue and needs service',
        lbl_eol: 'EOL Products — Old Products', lbl_eol_sub: 'End-of-life or discontinued product service',
        lbl_cleaning: 'Service / Cleaning Required', lbl_cleaning_sub: 'Product needs routine service or cleaning',
        lbl_delivery: 'Product Delivery — Collection', lbl_delivery_sub: 'Collect your repaired product',
        product_hdr: 'Product Information', product_sub: 'Please provide your product details',
        lbl_warranty: 'Warranty Status',
        w_yes: 'In Warranty', w_no: 'Out of Warranty', w_other: 'Not Sure',
        lbl_model: 'Model Number', lbl_serial: 'Serial No (if known)',
        lbl_problem_sel: 'Problem Type', lbl_problem_text: 'Describe Problem', lbl_problem_detail: 'Additional Details (optional)',
        submit: 'Complete Check-in ✓',
        success_hdr: 'Check-in Successful!', success_sub: 'Our team will assist you shortly',
        token_label: 'Your Token Number',
        wait_msg: '🙏 Please be seated. Our team will call your token number shortly.',
        new_entry: 'New Check-in', back: 'Back', next: 'Next',
        err_mobile: 'Please enter a valid 10-digit mobile number',
        err_name: 'Full name is required',
        err_warranty: 'Please select warranty status',
        err_model: 'Model number is required',
        delivery_hdr: 'Product Collection', delivery_pg_sub: 'Select what you are collecting today',
        lbl_delivery_submit: 'Confirm Collection ✓',
    },
};

export function t(lang: WizardLang, key: string): string {
    return T[lang]?.[key] || T.en[key] || key;
}

export function purposeLabel(lang: WizardLang, id: WizardPurposeId): string {
    const map: Record<WizardPurposeId, string> = {
        repair: t(lang, 'lbl_repair'), eol: t(lang, 'lbl_eol'), cleaning: t(lang, 'lbl_cleaning'), delivery: t(lang, 'lbl_delivery'),
    };
    return map[id];
}
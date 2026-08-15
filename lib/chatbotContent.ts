import { Lang } from '@/types/bookingPortal';
import { ChatOption, ChatStep, DeviceDef, KBEntry, MenuDef, ChatFlowDef } from '@/types/chatbot';

export const LANG: Record<Lang, Record<string, string>> = {
    gu: {
        greeting: "નમસ્તે! 👋 Bhavi Electronics & Automation માં તમારું સ્વાગત છે.\n\nહું Bhavi AI Assistant છું — sales, service અને automation ને લગતી કોઈ પણ જરૂરિયાત માટે હું હાજર છું.\n\n✨ Where Customer Delight is First",
        askLanguage: "શરૂઆત કરવા માટે, કૃપા કરી તમારી પસંદગીની ભાષા પસંદ કરો:",
        langConfirmed: "બરાબર, હવેથી આપણે ગુજરાતીમાં વાત કરીશું ✅",
        mainMenuTitle: "📋 મુખ્ય મેનુ — શું કામ કરવું છે?",
        backMain: "🏠 મુખ્ય મેનુ",
        restart: "⟳ ફરી શરૂ કરો",
        placeholder: "તમારો જવાબ ટાઈપ કરો...",
        chooseOption: "નીચેથી એક વિકલ્પ પસંદ કરો:",
        errorFallback: "માફ કરજો, આ request હું process કરી ના શક્યો 🙏 ચાલો આપણે Main Menu પરથી પાછા શરૂ કરીએ, જેથી હું સાચી રીતે તમારી મદદ કરી શકું.",
        skip: "છોડો / નથી",
        notProvided: "—",
        p_name: "તમારું નામ શું છે?",
        p_mobile: "તમારો મોબાઈલ નંબર આપો:",
        p_city: "તમે કયા શહેર/વિસ્તારમાં છો?",
        p_budget: "તમારું અંદાજિત બજેટ શું છે? (છોડી પણ શકો છો)",
        p_date: "તમારી પસંદગીની તારીખ/સમય જણાવો:",
        p_model: "Product/Model નંબર ખબર હોય તો આપો (વૈકલ્પિક):",
        p_serial: "Serial નંબર ખબર હોય તો આપો (વૈકલ્પિક):",
        p_problem: "Problem વિશે થોડું વધારે વિગતવાર જણાવો:",
        p_photo: "Problem નો photo store visit વખતે બતાવશો કે અત્યારે share કરશો?",
        p_invoice: "Purchase invoice/bill તમારી પાસે છે?",
        p_location: "Site/property નું location (વિસ્તાર/શહેર):",
        p_requirement: "તમારી જરૂરિયાત ટૂંકમાં જણાવો:",
        p_propertyType: "Property type પસંદ કરો:",
        p_roomSize: "Room ની અંદાજિત size (sq.ft અથવા feet માં):",
        p_technology: "Automation કઈ technology થી જોઈએ છે?",
        p_monthlyPrint: "મહિનામાં આશરે કેટલા prints થાય છે?",
        p_needType: "તમારે શું જોઈએ છે?",
        p_connectivity: "Connectivity કઈ જોઈએ છે?",
        p_scannerType: "કયા type નું scanner જોઈએ છે?",
        p_dailyScan: "રોજના આશરે કેટલા scan થાય છે?",
        p_duplex: "Duplex (બંને બાજુ) scanning જોઈએ છે?",
        p_photoUsage: "Photo printer કયા માટે જોઈએ છે?",
        p_paperSize: "કયું paper size જોઈએ છે?",
        p_instaxOccasion: "કયા occasion માટે જોઈએ છે? (gift, party, travel, વગેરે)",
        p_projectorNeeds: "Projector સાથે બીજું શું જોઈએ છે?",
        p_roomType: "Living room કે dedicated theatre room?",
        p_displayType: "TV જોઈએ કે Projector?",
        p_priority: "સૌથી વધારે શું use થશે?",
        p_acoustic: "Acoustic treatment (sound-proofing/design) જોઈએ છે?",
        p_automationIntegration: "Home automation સાથે integrate કરવું છે?",
        p_jobOrMobile: "Job Sheet Number અથવા Mobile Number ટાઈપ કરો:",
        msg_ticketCreated: "✅ તમારું Service Ticket બની ગયું છે!\n\nTicket ID: {ticketId}\nDevice: {device}\nIssue: {issue}\n\nઅમારો engineer તરત જ assign થશે અને તમને call/WhatsApp પર update મળશે.",
        msg_leadCreated: "✅ આભાર {name}! તમારી details save થઈ ગઈ છે. અમારી team {mobile} પર તરત contact કરશે.",
        msg_expertConnect: "✅ આભાર {name}! {expert} તમને {mobile} પર તરત contact કરશે.",
        msg_siteVisitAssigned: "✅ આભાર! તમારી site visit request નોંધાઈ ગઈ છે. Consultant {date} ના રોજ contact કરશે.",
        msg_companyInfo: "🏠 Bhavi Electronics & Automation\n\n✅ Authorized Service Centre (All Gujarat): Canon Camera, Panasonic Camera, Fujifilm Camera, Godox, Casio Keyboard\n✅ Sales & Service (Ahmedabad & Nearby): Canon Printer, Scanner, Photo Printer, Projectors\n✅ Fujifilm Instax: All Gujarat\n✅ Automation: Home, Office, Security, Entertainment & Business Solutions",
        chip_getQuotation: "📄 Quotation મેળવો",
        chip_talkToSales: "☎ Sales સાથે વાત કરો",
        chip_trackRepair: "📦 Repair Track કરો",
        chip_bookSiteVisit: "📅 Site Visit Book કરો",
        chip_contactExpert: "☎ Expert નો Contact કરો",
        recommendIntro: "🤖 તમારી જરૂરિયાત ના આધારે, અમારી professional ભલામણ:",
        lbl_city: "શહેર",
        profileFound: "👤 તમે અમારી સાથે પહેલેથી registered છો:\n\nનામ: {name}\nMobile: {mobile}{cityLine}\n\nશું હું આ details use કરું, કે નવી details લઉં?",
        useSaved: "✅ હા, આ Details Use Karo",
        enterNew: "✏️ ના, નવી Details આપવી છે",
        kbFollowup: "વધુ કોઈ પ્રશ્ન હોય તો પૂછો, અથવા નીચેથી આગળ વધો:",
        p_serviceMode: "તમે Service કઈ રીતે કરાવવા માંગો છો? (આ પસંદ કરવું ફરજિયાત છે)",
        opt_onsite: "🏠 Onsite Service (Engineer તમારા સ્થળે આવશે)",
        opt_carryIn: "🏬 Carry-In Service (તમે product store પર લાવશો)",
        lbl_serviceMode: "Service Mode",
        lbl_serviceCharge: "Service Charge",
        chargeTBD: "અમારી team આપને confirm કરશે",
        confirmChargeIntro: "📋 Booking confirm કરતા પહેલા, નીચેની service details ચકાસો:",
        msg_onsiteNotAvailable: "ℹ️ માફ કરશો, આ model માટે Onsite service available નથી — Carry-In service ના rates બતાવ્યા છે.",
        chip_approveBook: "✅ Approve & Book કરો",
        chip_cancelBooking: "❌ Cancel કરો",
        p_warrantyStatus: "Product Warranty માં છે કે Non-Warranty માં? (આ પસંદ કરવું ફરજિયાત છે)",
        opt_warranty: "🛡 Under Warranty",
        opt_nonWarranty: "💳 Non-Warranty (Chargeable)",
        p_invoiceAvailable: "Purchase invoice/bill તમારી પાસે છે?",
        p_invoiceDate: "Purchase invoice/bill ની તારીખ જણાવો:",
        lbl_warranty: "Warranty Status",
        lbl_invoiceDate: "Invoice Date",
        msg_warrantyCheck: "🔍 અમારો engineer product અને invoice check કરશે અને warranty eligibility confirm કરશે — જો warranty valid હોય તો કોઈ charge લાગશે નહીં.",
        msg_noInvoiceNote: "invoice ના હોવાથી warranty verify કરી શકાય નહીં, એટલે standard service charge લાગુ થશે.",
        opt_photoLater: "🏬 Store Visit વખતે બતાવીશ",
        opt_photoNow: "📸 અત્યારે Share કરીશ",
        menuTitle_buy: "🛒 Buy Products — કયું product જોઈએ છે?",
        menuTitle_printerType: "🖨 Canon Printer — કયા use માટે જોઈએ છે?",
        menuTitle_instax: "📸 Fujifilm Instax — શું જોઈએ છે?",
        menuTitle_buyProjector: "📽 Projector કયા માટે જોઈએ છે?",
        menuTitle_projectorsTop: "📽 Projectors — શું જોઈએ છે?",
        menuTitle_serviceDevice: "🛠 Book Service — કયા device માટે?",
        menuTitle_automation: "🏡 Automation Solutions — કયો type જોઈએ છે?",
        menuTitle_vdp: "📹 Video Door Phone — property type?",
        menuTitle_panel: "🖥 Interactive Panels — ક્યાં માટે જોઈએ છે?",
        menuTitle_cctv: "📹 CCTV & Security — property type?",
        menuTitle_hometheatre: "🎬 Home Theatre & Custom AV — શું જોઈએ છે?",
        menuTitle_contactExpert: "☎ Contact Expert — કયા expert સાથે વાત કરવી છે?",
        dynTitle_deviceIssue: "🛠 {device} — problem પસંદ કરો:",
        dynTitle_cctvOptions: "📹 CCTV ({property}) — શું જોઈએ છે?",
        dynTitle_cctvIssue: "🛠 CCTV ({property}) — issue પસંદ કરો:",
        invalidMobile: "કૃપા કરી સાચો 10-અંકનો Mobile Number આપો.",
        trackNotFound: "આ Mobile Number / Job Sheet Number સાથે કોઈ complaint મળી નહીં.",
        trackFoundIntro: "તમારી Complaint(s) ની Live Status:",
        lbl_engineer: "Engineer",
    },
    hi: {
        greeting: "Namaste! 👋 Bhavi Electronics & Automation mein aapka swagat hai.\n\nMain Bhavi AI Assistant hoon — sales, service aur automation se judi kisi bhi zaroorat ke liye yahan hoon.\n\n✨ Where Customer Delight is First",
        askLanguage: "Shuru karne ke liye, apni preferred bhasha select karein:",
        langConfirmed: "Theek hai, ab hum Hindi mein baat karenge ✅",
        mainMenuTitle: "📋 Main Menu — kya karna hai?",
        backMain: "🏠 Main Menu",
        restart: "⟳ Restart",
        placeholder: "Apna jawab type karein...",
        chooseOption: "Neeche se ek option select karein:",
        errorFallback: "Maaf kijiye, main is request ko process nahi kar paaya 🙏 Chaliye Main Menu se dobara shuru karte hain, taaki main sahi tarah madad kar sakoon.",
        skip: "Skip / Nahi",
        notProvided: "—",
        p_name: "Aapka naam kya hai?",
        p_mobile: "Apna mobile number dein:",
        p_city: "Aap kis city/area mein hain?",
        p_budget: "Aapka approx budget kya hai? (Skip bhi kar sakte hain)",
        p_date: "Preferred date/time jaisa aap chahein:",
        p_model: "Product/Model number pata ho to dein (optional):",
        p_serial: "Serial number pata ho to dein (optional):",
        p_problem: "Problem ke baare mein thoda aur detail mein bataayein:",
        p_photo: "Problem ka photo store visit ke time dikhayenge ya abhi share karenge?",
        p_invoice: "Purchase invoice/bill aapke paas hai?",
        p_location: "Site/property ka location (area/city):",
        p_requirement: "Apni requirement short mein batayein:",
        p_propertyType: "Property type select karein:",
        p_roomSize: "Room ka approx size (sq.ft ya feet mein):",
        p_technology: "Automation kis technology se chahiye?",
        p_monthlyPrint: "Monthly kitne prints hote hain?",
        p_needType: "Aapko kya chahiye?",
        p_connectivity: "Connectivity kaunsi chahiye?",
        p_scannerType: "Kaunsa scanner type chahiye?",
        p_dailyScan: "Daily kitne scan hote hain? (approx)",
        p_duplex: "Duplex (both-side) scanning chahiye?",
        p_photoUsage: "Photo printer kis liye chahiye?",
        p_paperSize: "Kaunsa paper size chahiye?",
        p_instaxOccasion: "Kis occasion ke liye chahiye? (gift, party, travel, etc.)",
        p_projectorNeeds: "Projector ke saath aur kya chahiye?",
        p_roomType: "Living room ya dedicated theatre room?",
        p_displayType: "TV chahiye ya Projector?",
        p_priority: "Sabse zyada kya use hoga?",
        p_acoustic: "Acoustic treatment (sound-proofing/design) chahiye?",
        p_automationIntegration: "Home automation ke saath integrate karna hai?",
        p_jobOrMobile: "Job Sheet Number ya Mobile Number type karein:",
        msg_ticketCreated: "✅ Aapka Service Ticket ban gaya hai!\n\nTicket ID: {ticketId}\nDevice: {device}\nIssue: {issue}\n\nHamara engineer turant assign hoga aur aapko call/WhatsApp par update milega.",
        msg_leadCreated: "✅ Dhanyavaad {name}! Aapki details save ho gayi hain. Hamari team {mobile} par turant contact karegi.",
        msg_expertConnect: "✅ Dhanyavaad {name}! {expert} aapko {mobile} par turant contact karenge.",
        msg_siteVisitAssigned: "✅ Dhanyavaad! Aapka site visit request note ho gaya hai. Consultant {date} ko contact karega.",
        msg_companyInfo: "🏠 Bhavi Electronics & Automation\n\n✅ Authorized Service Centre (All Gujarat): Canon Camera, Panasonic Camera, Fujifilm Camera, Godox, Casio Keyboard\n✅ Sales & Service (Ahmedabad & Nearby): Canon Printer, Scanner, Photo Printer, Projectors\n✅ Fujifilm Instax: All Gujarat\n✅ Automation: Home, Office, Security, Entertainment & Business Solutions",
        chip_getQuotation: "📄 Quotation Lein",
        chip_talkToSales: "☎ Talk to Sales",
        chip_trackRepair: "📦 Track Repair",
        chip_bookSiteVisit: "📅 Book Site Visit",
        chip_contactExpert: "☎ Contact Expert",
        recommendIntro: "🤖 Aapki zaroorat ke aadhar par, hamari professional recommendation:",
        lbl_city: "City",
        profileFound: "👤 Aap hamare saath pehle se registered hain:\n\nNaam: {name}\nMobile: {mobile}{cityLine}\n\nKya main yehi details use karoon, ya naye details lein?",
        useSaved: "✅ Haan, Yehi Details Use Karo",
        enterNew: "✏️ Nahi, Naye Details Denge",
        kbFollowup: "Aur koi sawaal ho to poochein, ya neeche se aage badhein:",
        p_serviceMode: "Aap Service kaise karwana chahte hain? (Ye select karna zaroori hai)",
        opt_onsite: "🏠 Onsite Service (Engineer aapke sthaan par aayega)",
        opt_carryIn: "🏬 Carry-In Service (Aap product store le aayenge)",
        lbl_serviceMode: "Service Mode",
        lbl_serviceCharge: "Service Charge",
        chargeTBD: "Hamari team aapko confirm karegi",
        confirmChargeIntro: "📋 Booking confirm karne se pehle, neeche di gayi service details check karein:",
        msg_onsiteNotAvailable: "ℹ️ Maaf kijiye, is model ke liye Onsite service available nahi hai — Carry-In service ke rates dikhaye hain.",
        chip_approveBook: "✅ Approve & Book Karein",
        chip_cancelBooking: "❌ Cancel Karein",
        p_warrantyStatus: "Product Warranty mein hai ya Non-Warranty mein? (Ye select karna zaroori hai)",
        opt_warranty: "🛡 Under Warranty",
        opt_nonWarranty: "💳 Non-Warranty (Chargeable)",
        p_invoiceAvailable: "Purchase invoice/bill aapke paas hai?",
        p_invoiceDate: "Purchase invoice/bill ki date bataayein:",
        lbl_warranty: "Warranty Status",
        lbl_invoiceDate: "Invoice Date",
        msg_warrantyCheck: "🔍 Hamara engineer product aur invoice check karega aur warranty eligibility confirm karega — agar warranty valid hai to koi charge nahi lagega.",
        msg_noInvoiceNote: "invoice na hone se warranty verify nahi ho sakti, isliye standard service charge lagu hoga.",
        opt_photoLater: "🏬 Store Visit ke waqt dikhaunga",
        opt_photoNow: "📸 Abhi Share Karunga",
        menuTitle_buy: "🛒 Buy Products — कौनसा product चाहिए?",
        menuTitle_printerType: "🖨 Canon Printer — किस use ke liye chahiye?",
        menuTitle_instax: "📸 Fujifilm Instax — क्या चाहिए?",
        menuTitle_buyProjector: "📽 Projector kis liye chahiye?",
        menuTitle_projectorsTop: "📽 Projectors — क्या चाहिए?",
        menuTitle_serviceDevice: "🛠 Book Service — किस device ke liye?",
        menuTitle_automation: "🏡 Automation Solutions — कौनसा type chahiye?",
        menuTitle_vdp: "📹 Video Door Phone — property type?",
        menuTitle_panel: "🖥 Interactive Panels — kahaan ke liye chahiye?",
        menuTitle_cctv: "📹 CCTV & Security — property type?",
        menuTitle_hometheatre: "🎬 Home Theatre & Custom AV — क्या चाहिए?",
        menuTitle_contactExpert: "☎ Contact Expert — kis expert se baat karni hai?",
        dynTitle_deviceIssue: "🛠 {device} — problem चुनें:",
        dynTitle_cctvOptions: "📹 CCTV ({property}) — क्या चाहिए?",
        dynTitle_cctvIssue: "🛠 CCTV ({property}) — issue चुनें:",
        invalidMobile: "Kripya sahi 10-ank ka Mobile Number dein.",
        trackNotFound: "Is Mobile Number / Job Sheet Number se koi complaint nahi mili.",
        trackFoundIntro: "Aapki Complaint(s) ki Live Status:",
        lbl_engineer: "Engineer",
    },
    en: {
        greeting: "Hello! 👋 Welcome to Bhavi Electronics & Automation.\n\nI'm your Bhavi AI Assistant — here to help with sales, service, and automation needs.\n\n✨ Where Customer Delight is First",
        askLanguage: "To get started, please select your preferred language:",
        langConfirmed: "Great, we'll continue in English ✅",
        mainMenuTitle: "📋 Main Menu — how can I help?",
        backMain: "🏠 Main Menu",
        restart: "⟳ Restart",
        placeholder: "Type your reply...",
        chooseOption: "Please select an option below:",
        errorFallback: "I'm sorry, I wasn't able to process that request 🙏 Let's return to the Main Menu so I can assist you properly.",
        skip: "Skip",
        notProvided: "—",
        p_name: "What's your name?",
        p_mobile: "Please share your mobile number:",
        p_city: "Which city/area are you in?",
        p_budget: "What's your approximate budget? (you can skip)",
        p_date: "Preferred date/time:",
        p_model: "Product/model number if known (optional):",
        p_serial: "Serial number if known (optional):",
        p_problem: "Please describe the problem in a bit more detail:",
        p_photo: "Will you share a photo now, or show it at store visit?",
        p_invoice: "Do you have the purchase invoice/bill?",
        p_location: "Site/property location (area/city):",
        p_requirement: "Briefly describe your requirement:",
        p_propertyType: "Select property type:",
        p_roomSize: "Approx room size (sq.ft or feet):",
        p_technology: "Which automation technology do you prefer?",
        p_monthlyPrint: "How many prints per month approx?",
        p_needType: "What do you need?",
        p_connectivity: "Which connectivity do you need?",
        p_scannerType: "Which scanner type do you need?",
        p_dailyScan: "How many scans per day approx?",
        p_duplex: "Do you need duplex (both-side) scanning?",
        p_photoUsage: "What's the photo printer for?",
        p_paperSize: "Which paper size do you need?",
        p_instaxOccasion: "What's the occasion? (gift, party, travel, etc.)",
        p_projectorNeeds: "What else do you need with the projector?",
        p_roomType: "Living room or a dedicated theatre room?",
        p_displayType: "TV or Projector?",
        p_priority: "What will it mostly be used for?",
        p_acoustic: "Do you need acoustic treatment (sound-proofing/design)?",
        p_automationIntegration: "Do you want it integrated with home automation?",
        p_jobOrMobile: "Type your Job Sheet Number or Mobile Number:",
        msg_ticketCreated: "✅ Your Service Ticket has been created!\n\nTicket ID: {ticketId}\nDevice: {device}\nIssue: {issue}\n\nAn engineer will be assigned shortly and you'll get updates via call/WhatsApp.",
        msg_leadCreated: "✅ Thank you {name}! Your details are saved. Our team will contact you shortly on {mobile}.",
        msg_expertConnect: "✅ Thank you {name}! {expert} will contact you shortly on {mobile}.",
        msg_siteVisitAssigned: "✅ Thank you! Your site visit request is noted. Our consultant will contact you on {date}.",
        msg_companyInfo: "🏠 Bhavi Electronics & Automation\n\n✅ Authorized Service Centre (All Gujarat): Canon Camera, Panasonic Camera, Fujifilm Camera, Godox, Casio Keyboard\n✅ Sales & Service (Ahmedabad & Nearby): Canon Printer, Scanner, Photo Printer, Projectors\n✅ Fujifilm Instax: All Gujarat\n✅ Automation: Home, Office, Security, Entertainment & Business Solutions",
        chip_getQuotation: "📄 Get Quotation",
        chip_talkToSales: "☎ Talk to Sales",
        chip_trackRepair: "📦 Track Repair",
        chip_bookSiteVisit: "📅 Book Site Visit",
        chip_contactExpert: "☎ Contact Expert",
        recommendIntro: "🤖 Based on your requirements, here is our professional recommendation:",
        lbl_city: "City",
        profileFound: "👤 Welcome back — we already have your details on file:\n\nName: {name}\nMobile: {mobile}{cityLine}\n\nShould I use these saved details, or would you like to provide new ones?",
        useSaved: "✅ Yes, Use These Details",
        enterNew: "✏️ No, Enter New Details",
        kbFollowup: "Happy to help with anything else — feel free to ask, or continue below:",
        p_serviceMode: "How would you like the service done? (This selection is mandatory)",
        opt_onsite: "🏠 Onsite Service (engineer visits you)",
        opt_carryIn: "🏬 Carry-In Service (you bring it to our store)",
        lbl_serviceMode: "Service Mode",
        lbl_serviceCharge: "Service Charge",
        chargeTBD: "Our team will confirm this with you",
        confirmChargeIntro: "📋 Before we confirm your booking, please review the service details below:",
        msg_onsiteNotAvailable: "ℹ️ Sorry, Onsite service is not available for this model — showing Carry-In service rates instead.",
        chip_approveBook: "✅ Approve & Book",
        chip_cancelBooking: "❌ Cancel",
        p_warrantyStatus: "Is the product under Warranty or Non-Warranty? (This selection is mandatory)",
        opt_warranty: "🛡 Under Warranty",
        opt_nonWarranty: "💳 Non-Warranty (Chargeable)",
        p_invoiceAvailable: "Do you have the purchase invoice/bill?",
        p_invoiceDate: "Please provide the purchase invoice/bill date:",
        lbl_warranty: "Warranty Status",
        lbl_invoiceDate: "Invoice Date",
        msg_warrantyCheck: "🔍 Our engineer will inspect the product and invoice to confirm warranty eligibility — if the warranty is valid, no charge will apply.",
        msg_noInvoiceNote: "without an invoice, warranty cannot be verified, so the standard service charge will apply.",
        opt_photoLater: "🏬 I'll show it at store visit",
        opt_photoNow: "📸 I'll share it now",
        menuTitle_buy: "🛒 Buy Products — which product do you need?",
        menuTitle_printerType: "🖨 Canon Printer — what will you use it for?",
        menuTitle_instax: "📸 Fujifilm Instax — what do you need?",
        menuTitle_buyProjector: "📽 What's the projector for?",
        menuTitle_projectorsTop: "📽 Projectors — what do you need?",
        menuTitle_serviceDevice: "🛠 Book Service — which device?",
        menuTitle_automation: "🏡 Automation Solutions — which type do you need?",
        menuTitle_vdp: "📹 Video Door Phone — property type?",
        menuTitle_panel: "🖥 Interactive Panels — where do you need it?",
        menuTitle_cctv: "📹 CCTV & Security — property type?",
        menuTitle_hometheatre: "🎬 Home Theatre & Custom AV — what do you need?",
        menuTitle_contactExpert: "☎ Contact Expert — which expert would you like to talk to?",
        dynTitle_deviceIssue: "🛠 {device} — select the issue:",
        dynTitle_cctvOptions: "📹 CCTV ({property}) — what do you need?",
        dynTitle_cctvIssue: "🛠 CCTV ({property}) — select the issue:",
        invalidMobile: "Please enter a valid 10-digit Mobile Number.",
        trackNotFound: "No complaints found for this Mobile Number / Job Sheet Number.",
        trackFoundIntro: "Live status for your complaint(s):",
        lbl_engineer: "Engineer",
    },
};

export function t(lang: Lang, key: string): string {
    return LANG[lang]?.[key] || LANG.en[key] || key;
}

export function fmt(str: string, vars: Record<string, string>): string {
    return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

export function YN(lang: Lang): [string, string] {
    return lang === 'gu' ? ['હા', 'ના'] : lang === 'hi' ? ['हाँ', 'नहीं'] : ['Yes', 'No'];
}

export function opts(arr: string[]): ChatOption[] {
    return arr.map((v) => ({ label: v, value: v }));
}

export const DEVICES: DeviceDef[] = [
    { id: 'canonCamera', label: 'Canon Camera', issues: ['Camera Not ON', 'Lens Error', 'Focus Issue', 'Sensor Cleaning', 'Firmware Update', 'Repair Estimate', 'Courier Service'] },
    { id: 'panasonicCamera', label: 'Panasonic Camera', issues: ['Camera Not ON', 'Lens Issue', 'Focus Issue', 'General Service', 'Repair Estimate', 'Courier Service'] },
    { id: 'fujifilmCamera', label: 'Fujifilm Camera', issues: ['Camera Error', 'Lens Issue', 'Sensor Cleaning', 'Repair Estimate', 'Courier Service'] },
    { id: 'canonPrinterSvc', label: 'Canon Printer', issues: ['Not Printing', 'Paper Jam', 'Offline', 'Ink Error', 'Wi-Fi Issue', 'Installation', 'Driver', 'Book Engineer'], serviceModeApplicable: true },
    { id: 'scannerSvc', label: 'Canon Scanner', issues: ['Not Scanning', 'Driver', 'Paper Jam', 'ADF Issue', 'Book Engineer'], serviceModeApplicable: true },
    { id: 'projectorSvc', label: 'Projector', issues: ['Lamp Issue', 'Image Problem', 'HDMI Issue', 'Installation', 'AMC', 'Engineer Visit'] },
    { id: 'godox', label: 'Godox', issues: ['Flash Not ON', 'Trigger Issue', 'LED Issue', 'Estimate', 'Courier'] },
    { id: 'casio', label: 'Casio Keyboard', issues: ['No Power', 'Key Problem', 'No Sound', 'Display Error', 'Estimate'] },
    { id: 'instaxSvc', label: 'Fujifilm Instax', issues: ['Camera Repair', 'Film Issue', 'Warranty', 'Book Service'] },
];

export const CCTV_REPAIR_ISSUES = ['Camera Not Working', 'DVR/NVR Issue', 'Cable Issue', 'Night Vision Issue', 'Installation', 'AMC'];

export const SERVICE_CHARGES: Record<string, { Onsite: number | null; CarryIn: number | null }> = {
    'Canon Printer': { Onsite: 649, CarryIn: 413 },
    'Canon Scanner': { Onsite: null, CarryIn: null },
};

export const KB: KBEntry[] = [
    {
        kw: ['authorized', 'genuine', 'original', 'dealer', 'official', 'authentic'],
        a: {
            gu: "Ha, ame Canon, Panasonic, Fujifilm, Godox ane Casio na officially Authorized Service Centre chhiye All Gujarat mate. Etle spare parts genuine hoy chhe ane manufacturer warranty valid rahe chhe.",
            hi: "Ji haan, hum Canon, Panasonic, Fujifilm, Godox aur Casio ke officially Authorized Service Centre hain, poore Gujarat ke liye. Isliye spare parts genuine hote hain aur manufacturer warranty valid rehti hai.",
            en: "Yes, we are the officially Authorized Service Centre for Canon, Panasonic, Fujifilm, Godox, and Casio across all of Gujarat. This means all spare parts used are genuine and your manufacturer warranty remains valid."
        }
    },
    {
        kw: ['warranty', 'guarantee'],
        a: {
            gu: "Brand-authorized products par manufacturer warranty malshe, ane amara automation/installation kaam par ame separate service warranty aapiye chhiye. Exact duration product ane service type par depend kare chhe — quotation vakhte clearly jaNaavishu.",
            hi: "Brand-authorized products par manufacturer warranty milegi, aur hamare automation/installation kaam par hum alag se service warranty dete hain. Exact duration product aur service type par depend karti hai — quotation ke samay clearly bataayenge.",
            en: "Brand-authorized products carry the manufacturer's warranty, and our automation/installation work comes with a separate service warranty. Exact duration depends on the product and service type — we'll clarify this in your quotation."
        }
    },
    {
        kw: ['area', 'coverage', 'location', 'kya area', 'gujarat mate', 'service kya'],
        a: {
            gu: "Camera, lighting ane keyboard service — All Gujarat ma available chhe. Printer, scanner, photo printer ane projector ni sales/service — Ahmedabad & Nearby area ma. CCTV/Automation/Home Theatre — site visit thi confirm thay chhe.",
            hi: "Camera, lighting aur keyboard service — poore Gujarat mein available hai. Printer, scanner, photo printer aur projector ki sales/service — Ahmedabad & Nearby area mein. CCTV/Automation/Home Theatre — site visit se confirm hoti hai.",
            en: "Camera, lighting, and keyboard service is available across all of Gujarat. Printer, scanner, photo printer, and projector sales/service cover Ahmedabad & Nearby areas. CCTV/Automation/Home Theatre coverage is confirmed via site visit."
        }
    },
    {
        kw: ['price', 'pricing', 'cost', 'rate', 'kharch', 'quotation kevi', 'kitna'],
        a: {
            gu: "Pricing product/service ane requirement mujab vary thay chhe, etle ame fix rate quote nathi karta baar exact quotation vagar. Tame jo product/service ma interested chho tenu naam jaNaavo, hu tarat quotation process shaRu karu.",
            hi: "Pricing product/service aur requirement ke hisaab se vary karti hai, isliye hum bina exact quotation ke fix rate quote nahi karte. Aap jis product/service mein interested hain uska naam batayein, main turant quotation process shuru karta hoon.",
            en: "Pricing varies by product, service, and specific requirement, so we don't quote a fixed rate without a proper assessment. Let me know which product or service you're interested in, and I'll start the quotation process right away."
        }
    },
    {
        kw: ['wireless', 'hybrid', 'fully wired', 'difference', 'technology automation'],
        a: {
            gu: "Automation ma trane options male chhe:\n\n🔹 Wireless — koi wiring todva vagar existing ghar ma easily install thay, thodu costlier per-device hoy chhe.\n🔹 Fully Wired — new construction mate best, sauthi reliable ane long-term, pan wiring jaruri chhe.\n🔹 Hybrid — banne no mix, jya wiring possible hoy tya wired ane baki wireless.\n\nAmaro consultant tamari property joi ne best option suggest karshe.",
            hi: "Automation mein teen options milte hain:\n\n🔹 Wireless — bina wiring todhe existing ghar mein aasani se install hoti hai, per-device thodi costlier hoti hai.\n🔹 Fully Wired — new construction ke liye best, sabse reliable aur long-term, lekin wiring zaroori hai.\n🔹 Hybrid — dono ka mix, jahan wiring possible ho wahan wired aur baaki wireless.\n\nHamara consultant aapki property dekh kar best option suggest karega.",
            en: "There are three automation technology options:\n\n🔹 Wireless — installs easily in existing homes with no wiring disruption, slightly higher cost per device.\n🔹 Fully Wired — ideal for new construction, most reliable long-term, but requires wiring.\n🔹 Hybrid — a mix of both, wired where feasible and wireless elsewhere.\n\nOur consultant will assess your property and recommend the best fit."
        }
    },
    {
        kw: ['amc', 'annual maintenance', 'maintenance contract'],
        a: {
            gu: "AMC (Annual Maintenance Contract) etle ek yearly plan jema regular servicing, priority support ane certain repairs cover thay chhe — jethi tamaru equipment (CCTV, Projector, etc.) lambo samay sudhi smoothly chale ane unexpected repair cost ochho aave.",
            hi: "AMC (Annual Maintenance Contract) ek yearly plan hai jisme regular servicing, priority support aur kuch repairs cover hote hain — taaki aapka equipment (CCTV, Projector, etc.) lambe samay tak smoothly chale aur unexpected repair cost kam aaye.",
            en: "An AMC (Annual Maintenance Contract) is a yearly plan that covers regular servicing, priority support, and certain repairs — helping your equipment (CCTV, Projector, etc.) run smoothly long-term while reducing unexpected repair costs."
        }
    },
    {
        kw: ['dolby atmos', 'surround sound', 'speaker layout'],
        a: {
            gu: "Dolby Atmos ek advanced surround sound technology chhe je overhead (ceiling) speakers thi 3D, immersive audio experience aape chhe — movies ane gaming banne mate perfect. Amara Home Theatre team room size mujab ideal speaker layout design kare chhe.",
            hi: "Dolby Atmos ek advanced surround sound technology hai jo overhead (ceiling) speakers se 3D, immersive audio experience deti hai — movies aur gaming dono ke liye perfect. Hamari Home Theatre team room size ke hisaab se ideal speaker layout design karti hai.",
            en: "Dolby Atmos is an advanced surround sound technology that uses overhead (ceiling) speakers to deliver a 3D, immersive audio experience — ideal for both movies and gaming. Our Home Theatre team designs the ideal speaker layout based on your room size."
        }
    },
    {
        kw: ['lumens', 'brightness', 'projector kai lai'],
        a: {
            gu: "Projector select karta vakhte 'lumens' (brightness) ane 'resolution' agatya na chhe. Dark room mate 2000-3000 lumens paNa chalse, pan vadhare light hoy tya (jem ke office/hall) 3500+ lumens joiye. Amara team site visit karine exact recommend karshe.",
            hi: "Projector select karte waqt 'lumens' (brightness) aur 'resolution' zaroori hain. Dark room ke liye 2000-3000 lumens bhi chal jaate hain, lekin zyada light wale area (jaise office/hall) mein 3500+ lumens chahiye. Hamari team site visit karke exact recommend karegi.",
            en: "When choosing a projector, 'lumens' (brightness) and resolution matter most. A dark room works fine with 2000–3000 lumens, but brighter spaces (like offices/halls) need 3500+ lumens. Our team will do a site visit and recommend the exact model."
        }
    },
    {
        kw: ['sensor cleaning', 'kevi vaar', 'how often', 'cleaning frequency'],
        a: {
            gu: "Camera sensor cleaning normally 6 mahina thi 1 varsh ma ek vaar karavvi joiye — vadhare use (especially lens change vaarNvaar karta hoy) to vahelu karavvu saru. Dust spots photos ma dekhay to tarat service karavo.",
            hi: "Camera sensor cleaning normally 6 mahine se 1 saal mein ek baar karani chahiye — zyada use (khaaskar baar-baar lens change karte hain to) jaldi karana behtar hai. Dust spots photos mein dikhein to turant service karayein.",
            en: "Camera sensor cleaning is typically recommended every 6 months to 1 year — more frequently if you change lenses often. If you notice dust spots in your photos, get it serviced right away."
        }
    },
    {
        kw: ['cctv footage', 'data privacy', 'recording storage', 'how long footage'],
        a: {
            gu: "CCTV footage storage duration DVR/NVR na storage capacity par depend kare chhe — normally 15-30 days sudhi footage save rahe chhe. Tame requirement mujab bigger storage/cloud backup paN add karavi shako chho.",
            hi: "CCTV footage storage duration DVR/NVR ki storage capacity par depend karta hai — normally 15-30 din tak footage save rehti hai. Aap requirement ke hisaab se bigger storage/cloud backup bhi add kara sakte hain.",
            en: "CCTV footage retention depends on your DVR/NVR's storage capacity — typically 15–30 days. You can opt for larger storage or cloud backup based on your requirement."
        }
    },
    {
        kw: ['track repair kevi rite', 'job sheet number', 'how to track'],
        a: {
            gu: "Repair status track karva mate 'Track Repair' option use karo ane tamaru Job Sheet Number athva Mobile Number aapo — hu tamne live status batavish.",
            hi: "Repair status track karne ke liye 'Track Repair' option use karein aur apna Job Sheet Number ya Mobile Number dein — main aapko live status dikhaunga.",
            en: "To track your repair status, use the 'Track Repair' option and provide your Job Sheet Number or Mobile Number — I'll show you the live status."
        }
    },
    {
        kw: ['payment', 'emi', 'installment'],
        a: {
            gu: "Payment options product ane order value mujab vary thay chhe — tamari sales executive quotation vakhte badha available options (cash, card, UPI, EMI jya applicable hoy) jaNaavshe.",
            hi: "Payment options product aur order value ke hisaab se vary karte hain — hamara sales executive quotation ke samay sabhi available options (cash, card, UPI, EMI jahan applicable ho) bataayega.",
            en: "Payment options vary by product and order value — our sales executive will share all available options (cash, card, UPI, EMI where applicable) at the time of quotation."
        }
    },
    {
        kw: ['demo', 'free demo', 'trial'],
        a: {
            gu: "Ha, Home Theatre, Automation ane CCTV jeva solutions mate demo/site visit available chhe — jethi tame kharidva pehla actual setup experience kari shako. 'Book Site Visit' option thi schedule kari shako chho.",
            hi: "Ji haan, Home Theatre, Automation aur CCTV jaise solutions ke liye demo/site visit available hai — taaki aap kharidne se pehle actual setup experience kar sakein. 'Book Site Visit' option se schedule kar sakte hain.",
            en: "Yes, demos/site visits are available for Home Theatre, Automation, and CCTV solutions — so you can experience the actual setup before purchasing. You can schedule one via the 'Book Site Visit' option."
        }
    },
];

export function searchKB(text: string): KBEntry | null {
    const norm = text.trim().toLowerCase();
    if (norm.length < 3) return null;
    let best: KBEntry | null = null;
    let bestScore = 0;
    KB.forEach((entry) => {
        let score = 0;
        entry.kw.forEach((k) => { if (norm.includes(k.toLowerCase())) score += k.split(' ').length; });
        if (score > bestScore) { bestScore = score; best = entry; }
    });
    return bestScore > 0 ? best : null;
}

export const MENUS: Record<string, MenuDef> = {
    main: {
        titleKey: 'mainMenuTitle',
        options: [
            { label: '🏠 Home / Company Info', action: { type: 'info', key: 'msg_companyInfo' } },
            { label: '🛒 Buy Products', action: { type: 'menu', id: 'buy' } },
            { label: '🛠 Book Service', action: { type: 'menu', id: 'serviceDevice' } },
            { label: '🏡 Automation Solutions', action: { type: 'menu', id: 'automation' } },
            { label: '🎬 Home Theatre & AV', action: { type: 'menu', id: 'hometheatre' } },
            { label: '📽 Projectors', action: { type: 'menu', id: 'projectorsTop' } },
            { label: '📹 CCTV & Security', action: { type: 'menu', id: 'cctvProperty' } },
            { label: '📦 Track Repair', action: { type: 'flow', id: 'trackRepair' } },
            { label: '📅 Book Site Visit', action: { type: 'flow', id: 'siteVisit' } },
            { label: '☎ Contact Expert', action: { type: 'menu', id: 'contactExpert' } },
        ],
    },
    buy: {
        titleKey: 'menuTitle_buy',
        options: [
            { label: 'Canon Printers', action: { type: 'menu', id: 'printerType' } },
            { label: 'Canon Scanners', action: { type: 'flow', id: 'scannerQualify' } },
            { label: 'Canon Photo Printers', action: { type: 'flow', id: 'photoPrinterQualify' } },
            { label: 'Fujifilm Instax', action: { type: 'menu', id: 'instaxMenu' } },
            { label: 'Projectors', action: { type: 'menu', id: 'buyProjectorCategory' } },
            { label: 'Talk to Sales', action: { type: 'flow', id: 'leadCapture', ctx: { source: 'Buy Products' } } },
        ],
    },
    printerType: {
        titleKey: 'menuTitle_printerType',
        options: [
            { label: 'Home Use', action: { type: 'flow', id: 'printerQualify', ctx: { usage: 'Home Use' } } },
            { label: 'Office Use', action: { type: 'flow', id: 'printerQualify', ctx: { usage: 'Office Use' } } },
            { label: 'School / College', action: { type: 'flow', id: 'printerQualify', ctx: { usage: 'School / College' } } },
            { label: 'Shop', action: { type: 'flow', id: 'printerQualify', ctx: { usage: 'Shop' } } },
            { label: 'Photo Printing', action: { type: 'flow', id: 'photoPrinterQualify' } },
            { label: 'Heavy Printing', action: { type: 'flow', id: 'printerQualify', ctx: { usage: 'Heavy Printing' } } },
            { label: 'Suggest Me', action: { type: 'flow', id: 'printerQualify', ctx: { usage: 'Suggest Me' } } },
        ],
    },
    instaxMenu: {
        titleKey: 'menuTitle_instax',
        options: [
            { label: 'Camera', action: { type: 'flow', id: 'instaxQualify', ctx: { itemType: 'Camera' } } },
            { label: 'Film', action: { type: 'flow', id: 'instaxQualify', ctx: { itemType: 'Film' } } },
            { label: 'Accessories', action: { type: 'flow', id: 'instaxQualify', ctx: { itemType: 'Accessories' } } },
            { label: 'Gift Pack', action: { type: 'flow', id: 'instaxQualify', ctx: { itemType: 'Gift Pack' } } },
        ],
    },
    buyProjectorCategory: {
        titleKey: 'menuTitle_buyProjector',
        options: [
            { label: 'Office', action: { type: 'flow', id: 'projectorQualify', ctx: { use: 'Office' } } },
            { label: 'School', action: { type: 'flow', id: 'projectorQualify', ctx: { use: 'School' } } },
            { label: 'Conference Room', action: { type: 'flow', id: 'projectorQualify', ctx: { use: 'Conference Room' } } },
            { label: 'Home Theatre', action: { type: 'flow', id: 'projectorQualify', ctx: { use: 'Home Theatre' } } },
            { label: 'Temple', action: { type: 'flow', id: 'projectorQualify', ctx: { use: 'Temple' } } },
            { label: 'Event', action: { type: 'flow', id: 'projectorQualify', ctx: { use: 'Event' } } },
        ],
    },
    projectorsTop: {
        titleKey: 'menuTitle_projectorsTop',
        options: [
            { label: 'Business', action: { type: 'flow', id: 'projectorQualify', ctx: { use: 'Business' } } },
            { label: 'Education', action: { type: 'flow', id: 'projectorQualify', ctx: { use: 'Education' } } },
            { label: 'Home Theatre', action: { type: 'flow', id: 'projectorQualify', ctx: { use: 'Home Theatre' } } },
            { label: 'Installation', action: { type: 'flow', id: 'serviceTicket', ctx: { device: 'Projector', issue: 'Installation' } } },
            { label: 'Repair', action: { type: 'flow', id: 'serviceTicket', ctx: { device: 'Projector', issue: 'Repair' } } },
            { label: 'AMC', action: { type: 'flow', id: 'serviceTicket', ctx: { device: 'Projector', issue: 'AMC' } } },
            { label: 'Lamp Replacement', action: { type: 'flow', id: 'serviceTicket', ctx: { device: 'Projector', issue: 'Lamp Replacement' } } },
        ],
    },
    serviceDevice: {
        titleKey: 'menuTitle_serviceDevice',
        options: DEVICES.map((d) => ({ label: d.label, action: { type: 'dynIssueMenu' as const, deviceId: d.id } })),
    },
    automation: {
        titleKey: 'menuTitle_automation',
        options: [
            { label: 'Home Automation', action: { type: 'flow', id: 'automationQualify', ctx: { atype: 'Home Automation' } } },
            { label: 'Office Automation', action: { type: 'flow', id: 'automationQualify', ctx: { atype: 'Office Automation' } } },
            { label: 'Lighting Automation', action: { type: 'flow', id: 'automationQualify', ctx: { atype: 'Lighting Automation' } } },
            { label: 'Climate Control', action: { type: 'flow', id: 'automationQualify', ctx: { atype: 'Climate Control' } } },
            { label: 'Curtain Automation', action: { type: 'flow', id: 'automationQualify', ctx: { atype: 'Curtain Automation' } } },
            { label: 'Video Door Phone', action: { type: 'menu', id: 'vdpMenu' } },
            { label: 'Interactive Panels', action: { type: 'menu', id: 'panelMenu' } },
        ],
    },
    vdpMenu: {
        titleKey: 'menuTitle_vdp',
        options: ['Apartment', 'Villa', 'Office', 'Society'].map((p) => ({ label: p, action: { type: 'flow' as const, id: 'automationQualify', ctx: { atype: 'Video Door Phone — ' + p } } })),
    },
    panelMenu: {
        titleKey: 'menuTitle_panel',
        options: ['School', 'College', 'Office', 'Conference Room'].map((p) => ({ label: p, action: { type: 'flow' as const, id: 'automationQualify', ctx: { atype: 'Interactive Panel — ' + p } } })),
    },
    cctvProperty: {
        titleKey: 'menuTitle_cctv',
        options: ['Home', 'Office', 'Factory', 'School', 'Hospital', 'Warehouse'].map((p) => ({ label: p, action: { type: 'dynCctvServiceMenu' as const, property: p } })),
    },
    hometheatre: {
        titleKey: 'menuTitle_hometheatre',
        options: ['Movies', 'Music', 'Gaming', 'Dolby Atmos', 'Stereo Hi-Fi', 'Projector Theatre', 'Customized Audio & Video', 'Acoustic Design', 'AV Consultation', 'Demo', 'Site Visit'].map((p) => ({ label: p, action: { type: 'flow' as const, id: 'hometheatreQualify', ctx: { focus: p } } })),
    },
    contactExpert: {
        titleKey: 'menuTitle_contactExpert',
        options: ['Sales Expert', 'Service Expert', 'Automation Consultant', 'Home Theatre Consultant', 'Accounts'].map((p) => ({ label: p, action: { type: 'flow' as const, id: 'contactCapture', ctx: { expert: p } } })),
    },
};
export const FLOWS: Record<string, ChatFlowDef> = {
    printerQualify: {
        steps: [
            { key: 'monthlyPrint', type: 'choice', prompt: 'p_monthlyPrint', options: opts(['< 100', '100–300', '300–500', '500+']) },
            { key: 'needType', type: 'choice', prompt: 'p_needType', options: opts(['Print Only', 'Print + Scan + Copy']) },
            { key: 'connectivity', type: 'choice', prompt: 'p_connectivity', options: opts(['USB', 'Wi-Fi']) },
            { key: 'budget', type: 'text', prompt: 'p_budget', optional: true },
        ],
        complete: (a, ctx, lang) => {
            const usage = ctx.usage || 'General';
            const msg = `${t(lang, 'recommendIntro')}\n\n📌 Use: ${usage}\n📌 Monthly Prints: ${a.monthlyPrint}\n📌 Need: ${a.needType}\n📌 Connectivity: ${a.connectivity}\n\n👉 ${a.needType.includes('Scan') ? 'Canon PIXMA / MAXIFY All-in-One' : 'Canon PIXMA Single Function'} series tamara mate best rahese (${a.connectivity} sathe).`;
            return {
                message: msg, chips: [
                    { label: t(lang, 'chip_getQuotation'), action: { type: 'flow', id: 'leadCapture', ctx: { source: 'Canon Printer — ' + usage } } },
                    { label: t(lang, 'chip_talkToSales'), action: { type: 'flow', id: 'leadCapture', ctx: { source: 'Canon Printer — Talk to Sales' } } },
                ]
            };
        },
    },
    photoPrinterQualify: {
        steps: [
            { key: 'usage', type: 'choice', prompt: 'p_photoUsage', options: opts(['Studio', 'Event', 'Passport Photo', 'Personal Use']) },
            { key: 'paperSize', type: 'choice', prompt: 'p_paperSize', options: opts(['4x6', 'A4', 'Both']) },
            { key: 'budget', type: 'text', prompt: 'p_budget', optional: true },
        ],
        complete: (a, ctx, lang) => {
            const msg = `${t(lang, 'recommendIntro')}\n\n📌 Usage: ${a.usage}\n📌 Paper Size: ${a.paperSize}\n\n👉 Canon SELPHY (compact photo) ya Canon PIXMA Photo series suggest kariye chhiye — ink & paper cost-per-print details quotation ma malshe.`;
            return { message: msg, chips: [{ label: t(lang, 'chip_getQuotation'), action: { type: 'flow', id: 'leadCapture', ctx: { source: 'Canon Photo Printer' } } }] };
        },
    },
    scannerQualify: {
        steps: [
            { key: 'stype', type: 'choice', prompt: 'p_scannerType', options: opts(['Flatbed', 'Document', 'High Speed', 'Office', 'Photo']) },
            { key: 'dailyVolume', type: 'text', prompt: 'p_dailyScan', optional: true },
            { key: 'duplex', type: 'choice', prompt: 'p_duplex', dynamicOptions: 'YN' },
        ],
        complete: (a, ctx, lang) => {
            const msg = `${t(lang, 'recommendIntro')}\n\n📌 Type: ${a.stype}\n📌 Duplex: ${a.duplex}\n\n👉 Canon imageFORMULA series (${a.stype}) tamara volume mate suggest kariye chhiye.`;
            return {
                message: msg, chips: [
                    { label: t(lang, 'chip_getQuotation'), action: { type: 'flow', id: 'leadCapture', ctx: { source: 'Canon Scanner' } } },
                    { label: '🎥 Demo Book Karo', action: { type: 'flow', id: 'leadCapture', ctx: { source: 'Canon Scanner Demo' } } },
                ]
            };
        },
    },
    instaxQualify: {
        steps: [{ key: 'occasion', type: 'text', prompt: 'p_instaxOccasion', optional: true }],
        complete: (a, ctx, lang) => {
            const item = ctx.itemType || 'Instax';
            const msg = `${t(lang, 'recommendIntro')}\n\n📌 Item: ${item}\n📌 Occasion: ${a.occasion || t(lang, 'notProvided')}\n\n👉 Fujifilm Instax Mini / Wide series + bundle offer (film + case) tamara mate suggest kariye chhiye.`;
            return { message: msg, chips: [{ label: t(lang, 'chip_getQuotation'), action: { type: 'flow', id: 'leadCapture', ctx: { source: 'Fujifilm Instax — ' + item } } }] };
        },
    },
    projectorQualify: {
        steps: [
            { key: 'roomSize', type: 'text', prompt: 'p_roomSize', optional: true },
            { key: 'needs', type: 'choice', prompt: 'p_projectorNeeds', options: opts(['Screen + Mount + Installation', 'Only Projector']) },
        ],
        complete: (a, ctx, lang) => {
            const use = ctx.use || 'General';
            const msg = `${t(lang, 'recommendIntro')}\n\n📌 Use: ${use}\n📌 Room Size: ${a.roomSize || t(lang, 'notProvided')}\n📌 Needs: ${a.needs}\n\n👉 Brightness & resolution mujab suitable projector model suggest karishu — site visit thi exact recommendation aapishu.`;
            return {
                message: msg, chips: [
                    { label: t(lang, 'chip_getQuotation'), action: { type: 'flow', id: 'leadCapture', ctx: { source: 'Projector — ' + use } } },
                    { label: t(lang, 'chip_bookSiteVisit'), action: { type: 'flow', id: 'siteVisit', ctx: { source: 'Projector — ' + use } } },
                ]
            };
        },
    },
    automationQualify: {
        steps: [
            { key: 'technology', type: 'choice', prompt: 'p_technology', options: opts(['Wireless', 'Hybrid', 'Fully Wired']) },
            { key: 'budget', type: 'text', prompt: 'p_budget', optional: true },
            { key: 'date', type: 'text', prompt: 'p_date', optional: true },
            { key: 'name', type: 'text', prompt: 'p_name' },
            { key: 'mobile', type: 'text', prompt: 'p_mobile' },
            { key: 'city', type: 'text', prompt: 'p_city' },
        ],
        complete: async (a, ctx, lang) => {
            const atype = ctx.atype || 'Automation';
            const desc = 'Automation inquiry via Bhavi AI Assistant\nType: ' + atype + '\nTechnology: ' + a.technology + (a.budget ? ('\nBudget: ' + a.budget) : '') + (a.date ? ('\nPreferred Date: ' + a.date) : '');
            const { submitAutoInquiry } = await import('@/services/chatbotService');
            await submitAutoInquiry({ inquiryType: atype, name: a.name, mobile: a.mobile, city: a.city, description: desc });
            const msg = `${fmt(t(lang, 'msg_leadCreated'), { name: a.name, mobile: a.mobile })}\n\n📌 Type: ${atype}\n📌 Technology: ${a.technology}`;
            return { message: msg, chips: [{ label: t(lang, 'chip_bookSiteVisit'), action: { type: 'flow', id: 'siteVisit', ctx: { source: atype } } }] };
        },
    },
    hometheatreQualify: {
        steps: [
            { key: 'roomSize', type: 'text', prompt: 'p_roomSize', optional: true },
            { key: 'roomType', type: 'choice', prompt: 'p_roomType', options: opts(['Living Room', 'Dedicated Theatre']) },
            { key: 'displayType', type: 'choice', prompt: 'p_displayType', options: opts(['TV', 'Projector']) },
            { key: 'budget', type: 'text', prompt: 'p_budget', optional: true },
            { key: 'priority', type: 'choice', prompt: 'p_priority', options: opts(['Movies', 'Music', 'Gaming']) },
            { key: 'acoustic', type: 'choice', prompt: 'p_acoustic', dynamicOptions: 'YN' },
            { key: 'automationIntegration', type: 'choice', prompt: 'p_automationIntegration', dynamicOptions: 'YN' },
            { key: 'name', type: 'text', prompt: 'p_name' },
            { key: 'mobile', type: 'text', prompt: 'p_mobile' },
        ],
        complete: async (a, ctx, lang) => {
            const suggested = (a.priority === 'Movies' ? '5.1 Dolby Atmos Speaker Layout + AV Receiver' : 'Stereo Hi-Fi Setup') + ' + ' + a.displayType + ' + Subwoofer';
            const desc = 'Home Theatre inquiry via Bhavi AI Assistant\nRoom: ' + a.roomType + ' (' + (a.roomSize || '-') + ')\nDisplay: ' + a.displayType + '\nPriority: ' + a.priority + '\nAcoustic Treatment: ' + a.acoustic + '\nAutomation Integration: ' + a.automationIntegration + (a.budget ? ('\nBudget: ' + a.budget) : '') + '\nSuggested Setup: ' + suggested;
            const { submitAutoInquiry } = await import('@/services/chatbotService');
            await submitAutoInquiry({ inquiryType: 'Home Theatre', name: a.name, mobile: a.mobile, city: '', description: desc });
            const msg = `${t(lang, 'recommendIntro')}\n\n📌 Room: ${a.roomType} (${a.roomSize || t(lang, 'notProvided')})\n📌 Display: ${a.displayType}\n📌 Priority: ${a.priority}\n📌 Acoustic Treatment: ${a.acoustic}\n\n👉 Suggested Setup: ${suggested}\n\n${fmt(t(lang, 'msg_leadCreated'), { name: a.name, mobile: a.mobile })}`;
            return { message: msg, chips: [{ label: t(lang, 'chip_bookSiteVisit'), action: { type: 'flow', id: 'siteVisit', ctx: { source: 'Home Theatre' } } }] };
        },
    },
    serviceTicket: {
        steps: (ctx, lang) => {
            const s: ChatStep[] = [
                { key: 'name', type: 'text', prompt: 'p_name' },
                { key: 'mobile', type: 'text', prompt: 'p_mobile' },
                { key: 'city', type: 'text', prompt: 'p_city' },
            ];
            if (ctx && ctx.serviceModeApplicable) {
                s.push({
                    key: 'serviceMode', type: 'choice', prompt: 'p_serviceMode', options: [
                        { label: t(lang, 'opt_onsite'), value: 'Onsite' },
                        { label: t(lang, 'opt_carryIn'), value: 'CarryIn' },
                    ]
                });
            }
            s.push(
                { key: 'model', type: 'text', prompt: 'p_model', optional: true },
                { key: 'serial', type: 'text', prompt: 'p_serial', optional: true },
                { key: 'problem', type: 'text', prompt: 'p_problem', optional: true },
                {
                    key: 'photo', type: 'choice', prompt: 'p_photo', options: [
                        { label: t(lang, 'opt_photoLater'), value: 'Store Visit' },
                        { label: t(lang, 'opt_photoNow'), value: 'Share Now' },
                    ]
                },
                {
                    key: 'warrantyStatus', type: 'choice', prompt: 'p_warrantyStatus',
                    options: [
                        { label: t(lang, 'opt_warranty'), value: 'Warranty' },
                        { label: t(lang, 'opt_nonWarranty'), value: 'NonWarranty' },
                    ],
                    branch: (value, _answers, branchLang) => {
                        if (value === 'Warranty') {
                            const yn = YN(branchLang);
                            return [{
                                key: 'invoiceAvailable', type: 'choice', prompt: 'p_invoiceAvailable',
                                options: [{ label: yn[0], value: 'Yes' }, { label: yn[1], value: 'No' }],
                                branch: (v) => (v === 'Yes' ? [{ key: 'invoiceDate', type: 'text', prompt: 'p_invoiceDate' }] : []),
                            }];
                        }
                        return [];
                    },
                },
                { key: 'date', type: 'text', prompt: 'p_date', optional: true },
            );
            return s;
        },
        complete: async (a, ctx, lang) => {
            const { checkOnsiteAvailability, resolveCharge, bookServiceTicket } = await import('@/services/chatbotService');
            const onsiteSwapped = await checkOnsiteAvailability(a.serviceMode, a.model);
            if (onsiteSwapped) a.serviceMode = 'CarryIn';
            const isFreeWarranty = a.warrantyStatus === 'Warranty' && a.invoiceAvailable === 'Yes';
            if (isFreeWarranty) return bookServiceTicket(a, ctx, onsiteSwapped, 0, lang);

            const resolved = await resolveCharge(a.serviceMode, a.model, ctx.device);
            const modeLabel = a.serviceMode ? (a.serviceMode === 'Onsite' ? t(lang, 'opt_onsite') : t(lang, 'opt_carryIn')) : '';
            const warrantyLine = a.warrantyStatus === 'Warranty'
                ? `${t(lang, 'lbl_warranty')}: ${t(lang, 'opt_warranty')} — ${t(lang, 'msg_noInvoiceNote')}`
                : `${t(lang, 'lbl_warranty')}: ${t(lang, 'opt_nonWarranty')}`;
            const chargeText = resolved.amount != null ? `₹${resolved.amount}` : t(lang, 'chargeTBD');
            const msg = `${t(lang, 'confirmChargeIntro')}\n\n`
                + `📱 ${ctx.device || ''} — ${ctx.issue || ''}\n`
                + (onsiteSwapped ? `${t(lang, 'msg_onsiteNotAvailable')}\n` : '')
                + (modeLabel ? `${t(lang, 'lbl_serviceMode')}: ${modeLabel}\n` : '')
                + `${warrantyLine}\n`
                + `${t(lang, 'lbl_serviceCharge')}: *${chargeText}*`;
            return {
                message: msg, chips: [
                    { label: t(lang, 'chip_approveBook'), action: { type: 'confirmServiceTicket', a, ctx: { ...ctx, __chargeAmount: resolved.amount ?? 0, __onsiteSwapped: onsiteSwapped } } },
                    { label: t(lang, 'chip_cancelBooking'), action: { type: 'menu', id: 'main' } },
                ]
            };
        },
    },
    leadCapture: {
        steps: [
            { key: 'name', type: 'text', prompt: 'p_name' },
            { key: 'mobile', type: 'text', prompt: 'p_mobile' },
            { key: 'city', type: 'text', prompt: 'p_city', optional: true },
        ],
        complete: async (a, ctx, lang) => {
            const { submitAutoInquiry } = await import('@/services/chatbotService');
            await submitAutoInquiry({ inquiryType: ctx.source || 'General Inquiry', name: a.name, mobile: a.mobile, city: a.city, description: 'Lead via Bhavi AI Assistant — Interested In: ' + (ctx.source || 'General') });
            const msg = fmt(t(lang, 'msg_leadCreated'), { name: a.name, mobile: a.mobile }) + (ctx.source ? `\n\n📌 Interested In: ${ctx.source}` : '');
            return { message: msg, chips: [] };
        },
    },
    contactCapture: {
        steps: [
            { key: 'name', type: 'text', prompt: 'p_name' },
            { key: 'mobile', type: 'text', prompt: 'p_mobile' },
        ],
        complete: async (a, ctx, lang) => {
            const { submitAutoInquiry } = await import('@/services/chatbotService');
            await submitAutoInquiry({ inquiryType: 'Contact Expert — ' + ctx.expert, name: a.name, mobile: a.mobile, city: '', description: 'Contact request via Bhavi AI Assistant — wants to speak with: ' + ctx.expert });
            const msg = fmt(t(lang, 'msg_expertConnect'), { name: a.name, expert: ctx.expert, mobile: a.mobile });
            return { message: msg, chips: [] };
        },
    },
    trackRepair: {
        steps: [{ key: 'ref', type: 'text', prompt: 'p_jobOrMobile' }],
        complete: async (a, _ctx, lang) => {
            const { trackLookup } = await import('@/services/chatbotService');
            const tickets = await trackLookup(a.ref);
            if (!tickets || !tickets.length) {
                return { message: t(lang, 'trackNotFound'), chips: [{ label: t(lang, 'chip_contactExpert'), action: { type: 'menu', id: 'contactExpert' } }] };
            }
            const lines = tickets.slice(0, 5).map((tk: any) => {
                let l = '🧾 ' + tk.id + ' — ' + (tk.status || '');
                if (tk.model) l += '\n   🖨️ ' + tk.model + (tk.serial ? ' · ' + tk.serial : '');
                if (tk.problem) l += '\n   ⚠️ ' + tk.problem;
                if (tk.assigned_name) l += '\n   👷 ' + t(lang, 'lbl_engineer') + ': ' + tk.assigned_name;
                return l;
            });
            const msg = '📦 ' + t(lang, 'trackFoundIntro') + '\n\n' + lines.join('\n\n');
            return { message: msg, chips: [{ label: t(lang, 'chip_contactExpert'), action: { type: 'menu', id: 'contactExpert' } }] };
        },
    },
    siteVisit: {
        steps: [
            { key: 'location', type: 'text', prompt: 'p_location' },
            { key: 'propertyType', type: 'choice', prompt: 'p_propertyType', options: opts(['Home', 'Office', 'Other']) },
            { key: 'requirement', type: 'text', prompt: 'p_requirement', optional: true },
            { key: 'budget', type: 'text', prompt: 'p_budget', optional: true },
            { key: 'date', type: 'text', prompt: 'p_date' },
            { key: 'name', type: 'text', prompt: 'p_name' },
            { key: 'mobile', type: 'text', prompt: 'p_mobile' },
        ],
        complete: async (a, ctx, lang) => {
            const src = ctx && ctx.source ? (' — ' + ctx.source) : '';
            const desc = 'Site Visit request via Bhavi AI Assistant' + src + '\nLocation: ' + a.location + '\nProperty Type: ' + a.propertyType + (a.requirement ? ('\nRequirement: ' + a.requirement) : '') + (a.budget ? ('\nBudget: ' + a.budget) : '') + '\nPreferred Date: ' + a.date;
            const { submitAutoInquiry } = await import('@/services/chatbotService');
            await submitAutoInquiry({ inquiryType: 'Site Visit' + src, name: a.name, mobile: a.mobile, city: a.location, description: desc });
            const msg = fmt(t(lang, 'msg_siteVisitAssigned'), { date: a.date });
            return { message: msg, chips: [] };
        },
    },
};
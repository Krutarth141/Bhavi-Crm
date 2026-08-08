const VOICE_KEY = 'wi_token_voice_name';

export function getSavedVoiceName(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(VOICE_KEY) || '';
}

export function setSavedVoiceName(name: string): void {
    localStorage.setItem(VOICE_KEY, name);
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    const voices = window.speechSynthesis.getVoices();
    const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    return enVoices.length ? enVoices : voices;
}

export function announceToken(num: number): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`Token number ${num}. Token number ${num}, please proceed to the service counter.`);
    u.lang = 'en-IN';
    u.rate = 0.88;
    const savedName = getSavedVoiceName();
    if (savedName) {
        const match = window.speechSynthesis.getVoices().find((v) => v.name === savedName);
        if (match) u.voice = match;
    }
    window.speechSynthesis.speak(u);
}
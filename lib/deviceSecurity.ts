export const getDeviceId = () => {
    try {
        const saved = window.localStorage.getItem('bhavi_device_id');
        if (saved) return saved;
        const generated = `dev_${window.crypto?.randomUUID?.() || `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`}`;
        window.localStorage.setItem('bhavi_device_id', generated);
        return generated;
    } catch {
        return 'dev_nostorage';
    }
};

export const getDeviceLabel = () => {
    const ua = navigator.userAgent || '';
    let os = 'Unknown OS';
    let browser = 'Browser';

    if (/Android/i.test(ua)) {
        const match = ua.match(/Android [\d.]+;\s*([^)]+?)\)/);
        os = `Android${match ? ` (${match[1].replace(/ Build.*/, '')})` : ''}`;
    } else if (/iPad/i.test(ua)) os = 'iPad';
    else if (/iPhone|iPod/i.test(ua)) os = 'iPhone';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac OS X/i.test(ua)) os = 'Mac';
    else if (/CrOS/i.test(ua)) os = 'ChromeOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
    else if (/Firefox\/|FxiOS/.test(ua)) browser = 'Firefox';
    else if (/Chrome\/|CriOS/.test(ua)) browser = 'Chrome';
    else if (/Safari\//.test(ua)) browser = 'Safari';

    return `${browser} on ${os}`;
};

export const deviceCall = async (body: Record<string, unknown>, timeout = 6000) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch('/api/device-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    } finally {
        window.clearTimeout(timer);
    }
};

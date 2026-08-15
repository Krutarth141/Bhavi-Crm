'use client';

import { useRef, useState } from 'react';
import { Lang } from '@/types/bookingPortal';
import { ChatAction, ChatBubble, ChatFlowResult, ChatOption, ChatStep } from '@/types/chatbot';
import { MENUS, FLOWS, DEVICES, CCTV_REPAIR_ISSUES, t, fmt, YN, opts, searchKB } from '@/lib/chatbotContent';
import { bookServiceTicket } from '@/services/chatbotService';

interface ChipRenderItem {
    label: string;
    variant?: 'alt' | 'main';
    onClick: () => void;
}

interface FlowRuntime {
    id: string;
    def: typeof FLOWS[string];
    steps: ChatStep[];
    idx: number;
    answers: Record<string, string>;
    ctx: Record<string, any>;
}

interface EngineState {
    lang: Lang | null;
    mode: 'awaiting_lang' | 'menu' | 'flow';
    currentMenuId: string | null;
    currentMenuCtx: Record<string, any>;
    currentDynamic: { title: string; options: { label: string; onSelect: () => void }[] } | null;
    flow: FlowRuntime | null;
    profile: { name: string; mobile: string; city: string };
}

const COLORS = {
    ink: '#161A20', panel: '#1D222B', panel2: '#242A34', line: 'rgba(232,228,219,0.10)',
    paper: '#F3EFE6', paperDim: '#B9B4A8', amber: '#E8A33D', teal: '#3FCBB0', tealDim: '#2A8E7A',
};

export default function ChatbotWidget() {
    const [open, setOpen] = useState(false);
    const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
    const [chips, setChipsState] = useState<ChipRenderItem[] | null>(null);
    const [chipsDisabled, setChipsDisabled] = useState(false);
    const [typing, setTyping] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [placeholder, setPlaceholder] = useState('Type message...');
    const chatRef = useRef<HTMLDivElement>(null);
    const nextId = useRef(0);
    const engine = useRef<EngineState>({
        lang: null, mode: 'awaiting_lang', currentMenuId: null, currentMenuCtx: {},
        currentDynamic: null, flow: null, profile: { name: '', mobile: '', city: '' },
    });

    const scrollBottom = () => { setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 0); };

    const addBot = (text: string) => { setBubbles((b) => [...b, { id: nextId.current++, role: 'bot', text }]); scrollBottom(); };
    const addUser = (text: string) => { setBubbles((b) => [...b, { id: nextId.current++, role: 'user', text }]); scrollBottom(); };
    const setChips = (items: ChipRenderItem[] | null) => { setChipsState(items); setChipsDisabled(false); };
    const clickChip = (item: ChipRenderItem) => { setChipsDisabled(true); item.onClick(); };

    const botSay = (text: string, then?: () => void) => {
        setTyping(true);
        setChips(null);
        scrollBottom();
        setTimeout(() => {
            setTyping(false);
            addBot(text);
            then?.();
        }, 380 + Math.random() * 280);
    };

    // ---------- Language stage ----------
    const startApp = () => {
        engine.current.mode = 'awaiting_lang';
        botSay('નમસ્તે! 👋 Bhavi Electronics & Automation માં તમારું સ્વાગત છે.\nनमस्ते! आपका स्वागत है!\nWelcome!\n\n✨ Where Customer Delight is First', () => {
            botSay('કૃપા કરી તમારી ભાષા પસંદ કરો\nकृपया अपनी भाषा चुनें\nPlease select your language:', () => {
                setChips([
                    { label: 'ગુજરાતી', onClick: () => selectLanguage('gu') },
                    { label: 'हिंदी', onClick: () => selectLanguage('hi') },
                    { label: 'English', onClick: () => selectLanguage('en') },
                ]);
            });
        });
    };

    const selectLanguage = (lang: Lang) => {
        engine.current.lang = lang;
        addUser(lang === 'gu' ? 'ગુજરાતી' : lang === 'hi' ? 'हिंदी' : 'English');
        setPlaceholder(t(lang, 'placeholder'));
        botSay(t(lang, 'greeting'), () => goMainMenu());
    };

    // ---------- Menu rendering ----------
    const goMainMenu = () => {
        if (!engine.current.lang) { startApp(); return; }
        engine.current.mode = 'menu'; engine.current.flow = null; engine.current.currentMenuId = 'main'; engine.current.currentMenuCtx = {}; engine.current.currentDynamic = null;
        renderMenu('main', {});
    };

    const openMenu = (menuId: string, ctx: Record<string, any>) => {
        engine.current.mode = 'menu'; engine.current.flow = null; engine.current.currentMenuId = menuId; engine.current.currentMenuCtx = ctx || {}; engine.current.currentDynamic = null;
        renderMenu(menuId, ctx || {});
    };

    const renderMenu = (menuId: string, ctx: Record<string, any>) => {
        const lang = engine.current.lang!;
        const menu = MENUS[menuId];
        const title = t(lang, menu.titleKey);
        botSay(title, () => {
            const items: ChipRenderItem[] = menu.options.map((o) => ({ label: o.label, onClick: () => { addUser(o.label); handleAction(o.action, ctx); } }));
            if (menuId !== 'main') items.push({ label: t(lang, 'backMain'), variant: 'main', onClick: () => { addUser(t(lang, 'backMain')); goMainMenu(); } });
            setChips(items);
        });
    };

    const renderDynamicMenu = (title: string, options: { label: string; onSelect: () => void }[]) => {
        const lang = engine.current.lang!;
        engine.current.mode = 'menu';
        engine.current.currentDynamic = { title, options };
        botSay(title, () => {
            const items: ChipRenderItem[] = options.map((o) => ({ label: o.label, onClick: () => { addUser(o.label); o.onSelect(); } }));
            items.push({ label: t(lang, 'backMain'), variant: 'main', onClick: () => { addUser(t(lang, 'backMain')); goMainMenu(); } });
            setChips(items);
        });
    };

    const handleAction = (action: ChatAction, parentCtx: Record<string, any>) => {
        const lang = engine.current.lang!;
        parentCtx = parentCtx || {};
        if (action.type === 'menu') {
            openMenu(action.id, { ...parentCtx, ...(action.ctx || {}) });
        } else if (action.type === 'flow') {
            startFlow(action.id, { ...parentCtx, ...(action.ctx || {}) });
        } else if (action.type === 'info') {
            botSay(t(lang, action.key), () => {
                setChips([{ label: t(lang, 'backMain'), variant: 'main', onClick: () => { addUser(t(lang, 'backMain')); goMainMenu(); } }]);
            });
            engine.current.mode = 'menu'; engine.current.currentMenuId = 'main';
        } else if (action.type === 'dynIssueMenu') {
            const device = DEVICES.find((d) => d.id === action.deviceId)!;
            renderDynamicMenu(fmt(t(lang, 'dynTitle_deviceIssue'), { device: device.label }), device.issues.map((iss) => ({
                label: iss, onSelect: () => startFlow('serviceTicket', { device: device.label, issue: iss, serviceModeApplicable: !!device.serviceModeApplicable }),
            })));
        } else if (action.type === 'dynCctvServiceMenu') {
            const property = action.property;
            renderDynamicMenu(fmt(t(lang, 'dynTitle_cctvOptions'), { property }), [
                { label: 'Need Site Survey', onSelect: () => startFlow('automationQualify', { atype: `CCTV Site Survey — ${property}` }) },
                {
                    label: 'Repair', onSelect: () => renderDynamicMenu(fmt(t(lang, 'dynTitle_cctvIssue'), { property }), CCTV_REPAIR_ISSUES.map((iss) => ({
                        label: iss, onSelect: () => startFlow('serviceTicket', { device: `CCTV (${property})`, issue: iss }),
                    })))
                },
                { label: 'AMC', onSelect: () => startFlow('automationQualify', { atype: `CCTV AMC — ${property}` }) },
            ]);
        } else if (action.type === 'confirmServiceTicket') {
            engine.current.mode = 'flow';
            renderResult(bookServiceTicket(action.a, action.ctx, !!action.ctx.__onsiteSwapped, action.ctx.__chargeAmount ?? 0, lang));
        }
    };

    // ---------- Flow engine ----------
    const startFlow = (flowId: string, ctx: Record<string, any>) => {
        const lang = engine.current.lang!;
        const def = FLOWS[flowId];
        const flowCtx = ctx || {};
        engine.current.mode = 'flow';
        const steps = typeof def.steps === 'function' ? def.steps(flowCtx, lang) : def.steps.slice();
        engine.current.flow = { id: flowId, def, steps, idx: 0, answers: {}, ctx: flowCtx };

        const contactKeys = steps.filter((s) => ['name', 'mobile', 'city'].includes(s.key)).map((s) => s.key);
        const hasSavedProfile = !!(engine.current.profile.name && engine.current.profile.mobile);

        if (contactKeys.length && hasSavedProfile) offerSavedProfile(contactKeys);
        else askCurrentStep();
    };

    const offerSavedProfile = (contactKeys: string[]) => {
        const lang = engine.current.lang!;
        const p = engine.current.profile;
        const cityLine = p.city ? `\n${t(lang, 'lbl_city')}: ${p.city}` : '';
        const msg = fmt(t(lang, 'profileFound'), { name: p.name, mobile: p.mobile, cityLine });
        botSay(msg, () => {
            setChips([
                { label: t(lang, 'useSaved'), onClick: () => { addUser(t(lang, 'useSaved')); applySavedProfile(contactKeys); } },
                { label: t(lang, 'enterNew'), onClick: () => { addUser(t(lang, 'enterNew')); askCurrentStep(); } },
            ]);
        });
    };

    const applySavedProfile = (contactKeys: string[]) => {
        const f = engine.current.flow!;
        const p = engine.current.profile as any;
        contactKeys.forEach((k) => { if (p[k]) f.answers[k] = p[k]; });
        f.steps = f.steps.filter((s) => !(contactKeys.includes(s.key) && p[s.key]));
        f.idx = 0;
        if (f.steps.length === 0) finishFlow();
        else askCurrentStep();
    };

    const resolveStepOptions = (step: ChatStep): ChatOption[] => {
        const lang = engine.current.lang!;
        if (step.dynamicOptions === 'YN') return opts(YN(lang));
        return step.options || [];
    };

    const askCurrentStep = () => {
        const lang = engine.current.lang!;
        const f = engine.current.flow!;
        const step = f.steps[f.idx];
        const promptText = t(lang, step.prompt) + (step.optional ? `  (${t(lang, 'skip')} OK)` : '');
        botSay(promptText, () => {
            if (step.type === 'choice') {
                const stepOptions = resolveStepOptions(step);
                const items: ChipRenderItem[] = stepOptions.map((o) => ({ label: o.label, onClick: () => { addUser(o.label); recordAnswer(step.key, o.value); } }));
                if (step.optional) items.push({ label: t(lang, 'skip'), variant: 'alt', onClick: () => { addUser(t(lang, 'skip')); recordAnswer(step.key, ''); } });
                setChips(items);
            } else if (step.optional) {
                setChips([{ label: t(lang, 'skip'), variant: 'alt', onClick: () => { addUser(t(lang, 'skip')); recordAnswer(step.key, ''); } }]);
            } else {
                setChips(null);
            }
        });
    };

    const recordAnswer = (key: string, value: string) => {
        const lang = engine.current.lang!;
        const f = engine.current.flow!;
        const currentStep = f.steps[f.idx];
        f.answers[key] = value;
        if (['name', 'mobile', 'city'].includes(key) && value) (engine.current.profile as any)[key] = value;
        f.idx++;
        if (currentStep && typeof currentStep.branch === 'function') {
            const extraSteps = currentStep.branch(value, f.answers, lang) || [];
            if (extraSteps.length) f.steps.splice(f.idx, 0, ...extraSteps);
        }
        if (f.idx >= f.steps.length) finishFlow();
        else askCurrentStep();
    };

    const finishFlow = async () => {
        const lang = engine.current.lang!;
        const f = engine.current.flow!;
        await renderResult(Promise.resolve(f.def.complete(f.answers, f.ctx, lang)));
    };

    const renderResult = async (resultPromise: Promise<ChatFlowResult> | ChatFlowResult) => {
        const lang = engine.current.lang!;
        setTyping(true);
        setChips(null);
        scrollBottom();
        let result: ChatFlowResult;
        try {
            result = await resultPromise;
        } catch (e: any) {
            result = { message: t(lang, 'errorFallback') + '\n\n(Error: ' + e.message + ')', chips: [] };
        }
        setTyping(false);
        addBot(result.message);
        const items: ChipRenderItem[] = (result.chips || []).map((c) => ({ label: c.label, onClick: () => { addUser(c.label); handleAction(c.action, {}); } }));
        items.push({ label: t(lang, 'backMain'), variant: 'main', onClick: () => { addUser(t(lang, 'backMain')); goMainMenu(); } });
        setChips(items);
        scrollBottom();
        engine.current.mode = 'menu'; engine.current.flow = null; engine.current.currentMenuId = 'main';
    };

    // ---------- Fuzzy match + free text ----------
    const fuzzyMatchOption = (text: string, labels: string[]): number => {
        const norm = text.trim().toLowerCase();
        if (!norm) return -1;
        let idx = labels.findIndex((l) => l.toLowerCase() === norm);
        if (idx >= 0) return idx;
        idx = labels.findIndex((l) => l.toLowerCase().includes(norm) || norm.includes(l.toLowerCase()));
        if (idx >= 0) return idx;
        const num = parseInt(norm, 10);
        if (!isNaN(num) && num >= 1 && num <= labels.length) return num - 1;
        return -1;
    };

    const triggerError = () => {
        const lang = engine.current.lang!;
        botSay(t(lang, 'errorFallback'), () => goMainMenu());
    };

    const handleSend = () => {
        const val = inputValue.trim();
        if (!val) return;
        setInputValue('');
        const lang = engine.current.lang;

        if (engine.current.mode === 'awaiting_lang') {
            addUser(val);
            botSay('કૃપા કરી નીચેના બટનથી ભાષા પસંદ કરો 🙏\nकृपया नीचे दिए बटन से भाषा चुनें\nPlease select a language using the buttons below');
            return;
        }

        if (engine.current.mode === 'flow') {
            const f = engine.current.flow!;
            const step = f.steps[f.idx];
            addUser(val);
            if (step.type === 'text') {
                if (step.key === 'mobile') {
                    const digits = val.replace(/\D/g, '');
                    if (digits.length !== 10) { botSay(t(lang!, 'invalidMobile')); return; }
                    recordAnswer(step.key, digits);
                    return;
                }
                recordAnswer(step.key, val);
            } else {
                const stepOptions = resolveStepOptions(step);
                const labels = stepOptions.map((o) => o.label);
                const idx = fuzzyMatchOption(val, labels);
                if (idx >= 0) { recordAnswer(step.key, stepOptions[idx].value); return; }
                const kbHit = searchKB(val);
                if (kbHit) botSay(kbHit.a[lang!] || kbHit.a.en, () => askCurrentStep());
                else triggerError();
            }
            return;
        }

        if (engine.current.mode === 'menu') {
            addUser(val);
            let labels: string[];
            let execute: (idx: number) => void;
            if (engine.current.currentDynamic) {
                const dyn = engine.current.currentDynamic;
                labels = dyn.options.map((o) => o.label);
                execute = (idx) => dyn.options[idx].onSelect();
            } else {
                const menu = MENUS[engine.current.currentMenuId!];
                labels = menu.options.map((o) => o.label);
                execute = (idx) => handleAction(menu.options[idx].action, engine.current.currentMenuCtx);
            }
            const idx = fuzzyMatchOption(val, labels);
            if (idx >= 0) { execute(idx); return; }

            const kbHit = searchKB(val);
            if (kbHit) {
                botSay(kbHit.a[lang!] || kbHit.a.en, () => {
                    botSay(t(lang!, 'kbFollowup'), () => {
                        if (engine.current.currentDynamic) {
                            const dyn = engine.current.currentDynamic;
                            const items: ChipRenderItem[] = dyn.options.map((o) => ({ label: o.label, onClick: () => { addUser(o.label); o.onSelect(); } }));
                            items.push({ label: t(lang!, 'backMain'), variant: 'main', onClick: () => { addUser(t(lang!, 'backMain')); goMainMenu(); } });
                            setChips(items);
                        } else {
                            const menu = MENUS[engine.current.currentMenuId!];
                            const items: ChipRenderItem[] = menu.options.map((o) => ({ label: o.label, onClick: () => { addUser(o.label); handleAction(o.action, engine.current.currentMenuCtx); } }));
                            if (engine.current.currentMenuId !== 'main') items.push({ label: t(lang!, 'backMain'), variant: 'main', onClick: () => { addUser(t(lang!, 'backMain')); goMainMenu(); } });
                            setChips(items);
                        }
                    });
                });
                return;
            }
            triggerError();
        }
    };

    // ---------- Open / close ----------
    const fullRestart = () => {
        setBubbles([]);
        setChips(null);
        nextId.current = 0;
        engine.current = { lang: null, mode: 'awaiting_lang', currentMenuId: null, currentMenuCtx: {}, currentDynamic: null, flow: null, profile: { name: '', mobile: '', city: '' } };
        setPlaceholder('Type message...');
        startApp();
    };

    const openChat = () => { setOpen(true); fullRestart(); };
    const closeChat = () => setOpen(false);
    const goMainMenuFromHeader = () => { if (engine.current.lang) goMainMenu(); else startApp(); };

    if (!open) {
        return (
            <button onClick={openChat} style={{
                position: 'fixed', bottom: 76, right: 16, zIndex: 8000,
                background: 'linear-gradient(135deg,#1d4ed8,#1a3fa8)', color: '#fff', border: 'none', borderRadius: 50,
                padding: '11px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 18px rgba(29,78,216,.45)',
                display: 'flex', alignItems: 'center', gap: 7, letterSpacing: 0.2,
            }}>
                <span style={{ fontSize: 18 }}>💬</span> Help / Chat
            </button>
        );
    }

    return (
        <div onClick={(e) => { if (e.target === e.currentTarget) closeChat(); }} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,.55)' }}>
            <style>{'@keyframes bhaiBlink{0%,80%,100%{opacity:.25;}40%{opacity:1;}}'}</style>
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', maxWidth: 520, margin: '0 auto', height: '88vh', maxHeight: '88vh',
                background: COLORS.panel, borderRadius: '22px 22px 0 0', border: `1px solid ${COLORS.line}`, borderBottom: 'none',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -8px 40px rgba(0,0,0,.35)',
                fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: COLORS.paper,
            }}>
                <div style={{ padding: '16px 16px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${COLORS.line}`, background: `linear-gradient(180deg, ${COLORS.panel2}, ${COLORS.panel})`, flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, background: 'linear-gradient(135deg,#3FCBB0,#2A8E7A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>🤖</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, color: COLORS.paper }}>
                            Bhavi AI Assistant <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.teal, boxShadow: '0 0 0 3px rgba(63,203,176,0.18)', flexShrink: 0, display: 'inline-block' }} />
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.paperDim, marginTop: 2 }}>Sales · Service · Automation</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={goMainMenuFromHeader} title="Main Menu" style={iconBtnStyle}>🏠</button>
                        <button onClick={fullRestart} title="Restart" style={iconBtnStyle}>⟳</button>
                        <button onClick={closeChat} title="Close" style={iconBtnStyle}>✕</button>
                    </div>
                </div>

                <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {bubbles.map((b) => (
                        <div key={b.id} style={{ display: 'flex', gap: 8, maxWidth: '100%', justifyContent: b.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            {b.role === 'bot' && (
                                <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, background: COLORS.panel2, border: `1px solid ${COLORS.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                                    <BotIcon />
                                </div>
                            )}
                            <div style={{
                                padding: '10px 12px', borderRadius: 13, fontSize: 13.3, lineHeight: 1.55, maxWidth: '82%', whiteSpace: 'pre-wrap',
                                background: b.role === 'bot' ? COLORS.panel2 : COLORS.amber,
                                border: b.role === 'bot' ? `1px solid ${COLORS.line}` : 'none',
                                color: b.role === 'bot' ? COLORS.paper : '#241705',
                                fontWeight: b.role === 'bot' ? 400 : 500,
                                borderTopLeftRadius: b.role === 'bot' ? 4 : 13,
                                borderTopRightRadius: b.role === 'user' ? 4 : 13,
                            }}>
                                {b.text}
                            </div>
                        </div>
                    ))}
                    {typing && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, background: COLORS.panel2, border: `1px solid ${COLORS.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                                <BotIcon />
                            </div>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '11px 12px', background: COLORS.panel2, border: `1px solid ${COLORS.line}`, borderRadius: 13, borderTopLeftRadius: 4, width: 'fit-content' }}>
                                <TypingDot delay={0} /><TypingDot delay={0.2} /><TypingDot delay={0.4} />
                            </div>
                        </div>
                    )}
                    {chips && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2, paddingLeft: 32, opacity: chipsDisabled ? 0.55 : 1 }}>
                            {chips.map((c, idx) => (
                                <button
                                    key={idx}
                                    disabled={chipsDisabled}
                                    onClick={() => clickChip(c)}
                                    style={{
                                        padding: '7px 12px', borderRadius: 10, background: 'transparent',
                                        border: `1px solid ${c.variant === 'alt' ? 'rgba(232,163,61,0.55)' : c.variant === 'main' ? 'rgba(232,228,219,0.30)' : COLORS.tealDim}`,
                                        color: c.variant === 'alt' ? COLORS.amber : c.variant === 'main' ? COLORS.paper : COLORS.teal,
                                        fontSize: 12, cursor: chipsDisabled ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'left',
                                        fontWeight: c.variant === 'main' ? 600 : 400,
                                    }}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 8, padding: '12px 14px 14px', borderTop: `1px solid ${COLORS.line}`, background: COLORS.panel, flexShrink: 0 }}>
                    <input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                        placeholder={placeholder}
                        autoComplete="off"
                        style={{ flex: 1, background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.paper, padding: '11px 14px', borderRadius: 12, fontSize: 13.3, fontFamily: 'inherit', outline: 'none' }}
                    />
                    <button onClick={handleSend} style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 12, border: 'none', background: COLORS.teal, color: '#0E1712', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 24 24" fill="none" width={18} height={18}><path d="M4 12L20 4L14 20L11 13L4 12Z" fill="#0E1712" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

const iconBtnStyle: React.CSSProperties = {
    background: 'transparent', border: `1px solid ${COLORS.line}`, color: COLORS.paperDim,
    fontSize: 14, width: 30, height: 30, borderRadius: 9, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};

function BotIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" width={13} height={13}>
            <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#3FCBB0" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#E8A33D" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#E8A33D" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#3FCBB0" />
        </svg>
    );
}

function TypingDot({ delay }: { delay: number }) {
    return (
        <span style={{
            width: 5, height: 5, borderRadius: '50%', background: COLORS.paperDim,
            display: 'inline-block', animation: `bhaiBlink 1.2s infinite ease-in-out`, animationDelay: `${delay}s`,
        }} />
    );
}
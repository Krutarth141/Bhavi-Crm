'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { insertWalkIn, getNextToken, searchPincodes, PincodeMatch } from '@/services/walkInService';
import { WalkInEntry, WalkInProduct } from '@/types/walkin';
import { CATS, BRANDS, PROBLEM_OPTS, PURPOSES, WizardLang, WizardPurposeId, t, purposeLabel } from './publicWalkin/walkInWizardConfig';

type Step = 'lang' | 'mobile' | 'customer' | 'category' | 'brand' | 'purpose' | 'product' | 'delivery' | 'success';

interface ExtraProduct { model: string; serial: string; problemSel: string; problemOther: string; }
interface DeliveryItem { logId: string; prod: WalkInProduct; date: string; time: string; }
interface SummaryRow { icon: string; label: string; val: string; }

export default function PublicWalkInScreen() {
    const [step, setStep] = useState<Step>('lang');
    const [lang, setLang] = useState<WizardLang>('en');

    const [mobile, setMobile] = useState('');
    const [isNewCustomer, setIsNewCustomer] = useState(true);
    const [foundName, setFoundName] = useState('');

    const [name, setName] = useState('');
    const [address1, setAddress1] = useState('');
    const [address2, setAddress2] = useState('');
    const [stateVal, setStateVal] = useState('Gujarat');
    const [city, setCity] = useState('');
    const [pin, setPin] = useState('');
    const [area, setArea] = useState('');

    const [catId, setCatId] = useState('');
    const [brandName, setBrandName] = useState('');
    const [purposeId, setPurposeId] = useState<WizardPurposeId | ''>('');
    const [purposeType, setPurposeType] = useState<'Inward' | 'Outward' | ''>('');

    const [warranty, setWarranty] = useState('');
    const [model, setModel] = useState('');
    const [serial, setSerial] = useState('');
    const [problemSel, setProblemSel] = useState('');
    const [problemOther, setProblemOther] = useState('');
    const [problemDetail, setProblemDetail] = useState('');
    const [extraProducts, setExtraProducts] = useState<ExtraProduct[]>([]);

    const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);
    const [selectedDelivery, setSelectedDelivery] = useState<Set<number>>(new Set());
    const [loadingDelivery, setLoadingDelivery] = useState(false);

    const [token, setToken] = useState<number | null>(null);
    const [summary, setSummary] = useState<SummaryRow[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [allModels, setAllModels] = useState<{ id: string; brand_id: string | null; model_no: string; model_name: string | null }[]>([]);
    const [allBrands, setAllBrands] = useState<{ id: string; name: string }[]>([]);
    const [dbProblems, setDbProblems] = useState<string[]>([]);
    const [modelSug, setModelSug] = useState<{ id: string | null; text: string }[]>([]);

    const [pinResults, setPinResults] = useState<PincodeMatch[]>([]);
    const [pinDdOpen, setPinDdOpen] = useState(false);

    useEffect(() => {
        supabase.from('brands').select('id,name').order('name').then(({ data }) => setAllBrands(data || []));
        supabase.from('models').select('id,brand_id,model_no,model_name').order('model_no').limit(1000).then(({ data }) => setAllModels(data || []));
        supabase.from('problem_types').select('problem').eq('is_active', true).order('problem').then(({ data }) => {
            if (data && data.length) setDbProblems(data.map((r: any) => r.problem));
        });
    }, []);

    const selectedCategory = CATS.find((c) => c.id === catId) || null;
    const selectedBrandWc = brandName ? (BRANDS[catId] || []).find((b) => b.name === brandName)?.wc : undefined;

    const filteredModels = useMemo(() => {
        if (brandName) {
            const b = allBrands.find((x) => x.name.toLowerCase() === brandName.toLowerCase());
            return b ? allModels.filter((m) => m.brand_id === b.id) : allModels;
        }
        const brandList = BRANDS[catId];
        if (!brandList || !brandList.length) return allModels;
        const ids = allBrands.filter((b) => brandList.some((x) => x.name.toLowerCase() === b.name.toLowerCase())).map((b) => b.id);
        return ids.length ? allModels.filter((m) => m.brand_id && ids.includes(m.brand_id)) : allModels;
    }, [brandName, catId, allModels, allBrands]);

    const problemOptions = dbProblems.length ? dbProblems : (PROBLEM_OPTS[catId] || PROBLEM_OPTS.camera);

    const handleModelInput = (val: string) => {
        setModel(val);
        const q = val.trim().toLowerCase();
        if (!q) { setModelSug([]); return; }
        const matches = filteredModels.filter((m) => (m.model_no || '').toLowerCase().includes(q) || (m.model_name || '').toLowerCase().includes(q)).slice(0, 15);
        setModelSug(matches.map((m) => ({ id: m.id, text: m.model_no + (m.model_name ? ` — ${m.model_name}` : '') })));
    };

    // ── STEP: MOBILE ────────────────────────────────────────────────────────
    const [mobileLoading, setMobileLoading] = useState(false);
    const submitMobile = async () => {
        if (!/^\d{10}$/.test(mobile)) { setError(t(lang, 'err_mobile')); return; }
        setError('');
        setMobileLoading(true);
        try {
            let found = '';
            try {
                const { data } = await supabase.from('customers').select('name,city').eq('mobile', mobile).order('created_at', { ascending: false }).limit(1);
                if (data && data.length && data[0].name) { found = data[0].name; setCity(data[0].city || ''); }
            } catch { /* ignore */ }
            if (!found) {
                try {
                    const { data } = await supabase.from('walkin_log').select('customer_name').eq('mobile', mobile).order('created_at', { ascending: false }).limit(1);
                    if (data && data.length && data[0].customer_name) found = data[0].customer_name;
                } catch { /* ignore */ }
            }
            if (found) {
                setFoundName(found);
                setName(found);
                setIsNewCustomer(false);
            } else {
                setIsNewCustomer(true);
                setName('');
            }
            setStep('customer');
        } finally {
            setMobileLoading(false);
        }
    };

    // ── STEP: CUSTOMER ──────────────────────────────────────────────────────
    const handlePinInput = (val: string) => {
        setPin(val);
        if (!val.trim()) { setPinResults([]); setPinDdOpen(false); return; }
        const timer = setTimeout(async () => {
            const rows = await searchPincodes(val, stateVal);
            setPinResults(rows);
            setPinDdOpen(rows.length > 0);
        }, 200);
        return () => clearTimeout(timer);
    };

    const selectPin = (row: PincodeMatch) => {
        setPin(row.pincode);
        if (row.area) setArea(row.area);
        setPinDdOpen(false);
    };

    const submitCustomer = () => {
        if (!isNewCustomer) { setStep('category'); return; }
        if (!name.trim()) { alert(t(lang, 'err_name')); return; }
        setStep('category');
    };

    // ── STEP: CATEGORY ──────────────────────────────────────────────────────
    const selectCategory = (id: string) => {
        const cat = CATS.find((c) => c.id === id);
        if (!cat) return;
        setCatId(id);
        setBrandName('');
        setModel(''); setSerial(''); setProblemSel(''); setProblemOther(''); setProblemDetail(''); setWarranty('');
        setExtraProducts([]);

        if (cat.purchase) {
            submitPurchaseEntry(cat);
            return;
        }
        if (cat.hasBrand) {
            setStep('brand');
        } else {
            setStep('purpose');
        }
    };

    // ── STEP: BRAND ─────────────────────────────────────────────────────────
    const selectBrand = (name_: string) => {
        setBrandName(name_);
        setStep('purpose');
    };

    // ── STEP: PURPOSE ───────────────────────────────────────────────────────
    const selectPurpose = async (id: WizardPurposeId) => {
        const purpose = PURPOSES.find((p) => p.id === id)!;
        setPurposeId(id);
        setPurposeType(purpose.type);
        setModel(''); setSerial(''); setProblemSel(''); setProblemOther(''); setProblemDetail(''); setWarranty('');
        setExtraProducts([]);

        if (id === 'delivery') {
            setLoadingDelivery(true);
            setStep('delivery');
            try {
                const { data } = await supabase.from('walkin_log').select('*').eq('mobile', mobile).order('created_at', { ascending: false }).limit(30);
                const items: DeliveryItem[] = [];
                (data || []).forEach((l: any) => {
                    const prods: WalkInProduct[] = Array.isArray(l.products) ? l.products : [];
                    prods.forEach((p) => {
                        if (p.type === 'Inward' || p.type === 'For Checking Only') {
                            items.push({ logId: l.id, prod: p, date: l.visit_date, time: l.arrival_time });
                        }
                    });
                });
                setDeliveryItems(items);
                setSelectedDelivery(new Set());
                if (!items.length) setStep('product');
            } finally {
                setLoadingDelivery(false);
            }
            return;
        }
        setStep('product');
    };

    const backFromPurpose = () => setStep(selectedCategory?.hasBrand ? 'brand' : 'category');

    // ── SUBMIT: purchase-category direct entry ──────────────────────────────
    const resolveWcId = (): { wc_id: string; wc_name: string } => {
        const directWc = selectedCategory?.wc;
        const wc = directWc || selectedBrandWc || 'ICP';
        const wc_id = `SELF_CHECKIN_${wc}`;
        const wc_name = wc === 'CSP' ? 'Self Check-in (CSP)' : wc === 'ICP' ? 'Self Check-in (ICP)' : 'Self Check-in';
        return { wc_id, wc_name };
    };

    const submitPurchaseEntry = async (cat: typeof CATS[number]) => {
        setSaving(true);
        setError('');
        try {
            const today = new Date().toLocaleDateString('en-CA');
            const tokenNo = await getNextToken(today);
            const { wc_id, wc_name } = { wc_id: `SELF_CHECKIN_${cat.wc || 'ICP'}`, wc_name: cat.wc === 'CSP' ? 'Self Check-in (CSP)' : 'Self Check-in (ICP)' };
            const product: WalkInProduct = { brand: cat.label[lang] || cat.label.en, model: '', type: 'Purchase', warranty: '', subtype: 'purchase', remarks: '', serial: '' };

            const entry: Omit<WalkInEntry, 'id' | 'created_at'> = {
                wc_id, wc_name,
                visit_date: today, mobile, customer_name: name || foundName,
                address: (address1 + (address2 ? `, ${address2}` : '')) || null,
                state: stateVal || null, city: city || null, pin: pin || null, area: area || null,
                arrival_time: new Date().toTimeString().slice(0, 5), departure_time: null,
                products: [product], product_count: 1, token_no: tokenNo,
            };
            const result = await insertWalkIn(entry);
            if (!result.success) throw new Error(result.error || 'Failed to submit check-in');

            setToken(tokenNo);
            setSummary([
                { icon: '👤', label: 'Name', val: name || foundName },
                { icon: '📱', label: 'Mobile', val: mobile },
                { icon: cat.icon, label: 'Category', val: cat.label[lang] || cat.label.en },
            ]);
            setStep('success');
        } catch (err: any) {
            setError(err.message || 'Failed to submit check-in');
        } finally {
            setSaving(false);
        }
    };

    // ── SUBMIT: normal product-detail entry ─────────────────────────────────
    const addExtraProduct = () => setExtraProducts((prev) => [...prev, { model: '', serial: '', problemSel: '', problemOther: '' }]);
    const removeExtraProduct = (idx: number) => setExtraProducts((prev) => prev.filter((_, i) => i !== idx));
    const updateExtraProduct = (idx: number, patch: Partial<ExtraProduct>) =>
        setExtraProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

    const submitProductDetails = async () => {
        if (purposeType === 'Inward' && !warranty) { setError(t(lang, 'err_warranty')); return; }
        if (!model.trim()) { setError(t(lang, 'err_model')); return; }
        setError('');
        await submitEntry();
    };

    const submitEntry = async () => {
        setSaving(true);
        setError('');
        try {
            const today = new Date().toLocaleDateString('en-CA');
            const tokenNo = await getNextToken(today);
            const { wc_id, wc_name } = resolveWcId();

            const problem = problemSel === 'Other' ? (problemOther || problemSel) : problemSel;
            const remarksArr = [selectedCategory?.label[lang] || selectedCategory?.label.en || ''];
            if (brandName) remarksArr.push(brandName);
            remarksArr.push(purposeId ? purposeLabel(lang, purposeId) : '');
            if (problem) remarksArr.push(problem);
            if (problemDetail) remarksArr.push(problemDetail);
            const remarks = remarksArr.filter(Boolean).join(' | ');

            const mainProduct: WalkInProduct = {
                brand: brandName || (selectedCategory?.label[lang] || selectedCategory?.label.en || ''),
                model: model.trim(),
                type: (purposeType || 'Inward') as WalkInProduct['type'],
                warranty: warranty || '',
                subtype: purposeId,
                remarks,
                serial: serial.trim(),
            };

            const allProducts: WalkInProduct[] = [mainProduct];
            extraProducts.forEach((ep) => {
                if (!ep.model.trim()) return;
                const epProblem = ep.problemSel === 'Other' ? (ep.problemOther || ep.problemSel) : ep.problemSel;
                allProducts.push({
                    brand: mainProduct.brand, model: ep.model.trim(), type: mainProduct.type,
                    warranty: warranty || '', subtype: purposeId, remarks: epProblem || remarks, serial: ep.serial.trim(),
                });
            });

            const entry: Omit<WalkInEntry, 'id' | 'created_at'> = {
                wc_id, wc_name,
                visit_date: today, mobile, customer_name: name || foundName,
                address: (address1 + (address2 ? `, ${address2}` : '')) || null,
                state: stateVal || null, city: city || null, pin: pin || null, area: area || null,
                arrival_time: new Date().toTimeString().slice(0, 5), departure_time: null,
                products: allProducts, product_count: allProducts.length, token_no: tokenNo,
            };
            const result = await insertWalkIn(entry);
            if (!result.success) throw new Error(result.error || 'Failed to submit check-in');

            const rows: SummaryRow[] = [
                { icon: '👤', label: 'Name', val: name || foundName },
                { icon: '📱', label: 'Mobile', val: mobile },
                { icon: '🎯', label: 'Purpose', val: purposeId ? purposeLabel(lang, purposeId) : '' },
            ];
            allProducts.forEach((p, i) => rows.push({ icon: '🔖', label: `Product ${i + 1}`, val: p.model + (p.serial ? ` (S/N: ${p.serial})` : '') + (p.remarks ? ` — ${p.remarks}` : '') }));
            if (warranty) rows.push({ icon: '🛡️', label: 'Warranty', val: warranty });
            rows.push({ icon: '🏢', label: 'Service', val: wc_name.replace('Self Check-in ', '') });

            setToken(tokenNo);
            setSummary(rows);
            setStep('success');
        } catch (err: any) {
            setError(err.message || 'Failed to submit check-in');
        } finally {
            setSaving(false);
        }
    };

    // ── SUBMIT: delivery / collection ───────────────────────────────────────
    const toggleDeliveryItem = (idx: number) => {
        setSelectedDelivery((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx); else next.add(idx);
            return next;
        });
    };

    const submitDeliveryEntry = async () => {
        if (!selectedDelivery.size) { setError('Please select at least one product.'); return; }
        setSaving(true);
        setError('');
        try {
            const today = new Date().toLocaleDateString('en-CA');
            const tokenNo = await getNextToken(today);
            const { wc_id, wc_name } = resolveWcId();
            const products: WalkInProduct[] = Array.from(selectedDelivery).map((i) => ({ ...deliveryItems[i].prod, type: 'Outward' }));

            const entry: Omit<WalkInEntry, 'id' | 'created_at'> = {
                wc_id, wc_name,
                visit_date: today, mobile, customer_name: name || foundName,
                state: stateVal || null, city: city || null,
                arrival_time: new Date().toTimeString().slice(0, 5), departure_time: null,
                products, product_count: products.length, token_no: tokenNo,
            };
            const result = await insertWalkIn(entry);
            if (!result.success) throw new Error(result.error || 'Failed to submit check-in');

            const rows: SummaryRow[] = [
                { icon: '👤', label: 'Name', val: name || foundName },
                { icon: '📱', label: 'Mobile', val: mobile },
                { icon: '📤', label: 'Purpose', val: 'Product Collection / Delivery' },
            ];
            products.forEach((p, i) => rows.push({ icon: '📦', label: `Item ${i + 1}`, val: `${p.brand ? p.brand + ' ' : ''}${p.model || '—'}` }));

            setToken(tokenNo);
            setSummary(rows);
            setStep('success');
        } catch (err: any) {
            setError(err.message || 'Submission failed. Please ask our staff.');
        } finally {
            setSaving(false);
        }
    };

    // ── RESET ────────────────────────────────────────────────────────────────
    const startOver = () => {
        setStep('lang'); setLang('en'); setMobile(''); setIsNewCustomer(true); setFoundName('');
        setName(''); setAddress1(''); setAddress2(''); setStateVal('Gujarat'); setCity(''); setPin(''); setArea('');
        setCatId(''); setBrandName(''); setPurposeId(''); setPurposeType('');
        setWarranty(''); setModel(''); setSerial(''); setProblemSel(''); setProblemOther(''); setProblemDetail('');
        setExtraProducts([]); setDeliveryItems([]); setSelectedDelivery(new Set());
        setToken(null); setSummary([]); setError('');
    };

    // ── RENDER ──────────────────────────────────────────────────────────────
    if (step === 'success') {
        return (
            <div style={styles.page}>
                <div style={styles.panel}>
                    <div style={styles.successIcon}>✅</div>
                    <h1 style={styles.title}>{t(lang, 'success_hdr')}</h1>
                    <p style={styles.subtitle}>{t(lang, 'success_sub')}</p>
                    <div style={styles.tokenCard}>
                        <div style={styles.tokenLabel}>{t(lang, 'token_label')}</div>
                        <div style={styles.tokenValue}>{token}</div>
                    </div>
                    <div style={styles.summaryBox}>
                        {summary.map((r, i) => (
                            <div key={i} style={styles.summaryRow}>
                                <span style={{ width: 24 }}>{r.icon}</span>
                                <span style={styles.summaryLabel}>{r.label}</span>
                                <span style={styles.summaryVal}>{r.val}</span>
                            </div>
                        ))}
                    </div>
                    <div style={styles.waitBox}>{t(lang, 'wait_msg')}</div>
                    <div style={styles.actions}>
                        <button type="button" onClick={startOver} style={styles.primaryButton}>{t(lang, 'new_entry')}</button>
                        <Link href="/" style={styles.secondaryButton}>Back to Home</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.panel}>
                <div style={styles.header}>
                    <div>
                        <div style={styles.kicker}>Customer Check-in</div>
                        <h1 style={styles.title}>Walk in, register, and get a token.</h1>
                    </div>
                    <Link href="/" style={styles.backLink}>Home</Link>
                </div>

                {step === 'lang' && (
                    <>
                        <div style={styles.sectionTitle}>Select Language / ભાષા પસંદ કરો / भाषा चुनें</div>
                        <div style={styles.langGrid}>
                            {(['gu', 'hi', 'en'] as WizardLang[]).map((l) => (
                                <button key={l} type="button" onClick={() => { setLang(l); setStep('mobile'); }} style={styles.langBtn}>
                                    <div style={styles.choiceMain}>{l === 'gu' ? 'ગુજરાતી' : l === 'hi' ? 'हिन्दी' : 'English'}</div>
                                    <div style={styles.choiceSub}>{l === 'gu' ? 'Gujarati' : l === 'hi' ? 'Hindi' : 'English'}</div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {step === 'mobile' && (
                    <>
                        <button type="button" onClick={() => setStep('lang')} style={styles.backBtn}>← {t(lang, 'back')}</button>
                        <div style={styles.sectionTitle}>{t(lang, 'mobile_hdr')}</div>
                        <p style={{ ...styles.subtitle, marginTop: 0 }}>{t(lang, 'mobile_sub')}</p>
                        <Field label={t(lang, 'lbl_mobile')} value={mobile} onChange={(v) => setMobile(v.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" type="tel" />
                        {error && <div style={styles.error}>{error}</div>}
                        <div style={styles.actions}>
                            <button type="button" onClick={submitMobile} disabled={mobileLoading} style={styles.primaryButton}>
                                {mobileLoading ? '...' : `${t(lang, 'next')} →`}
                            </button>
                        </div>
                    </>
                )}

                {step === 'customer' && (
                    <>
                        <button type="button" onClick={() => setStep('mobile')} style={styles.backBtn}>← {t(lang, 'back')}</button>
                        <div style={styles.sectionTitle}>{t(lang, 'customer_hdr')}</div>
                        {!isNewCustomer ? (
                            <div style={styles.customerCard}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6 }}>{t(lang, 'lbl_found')}</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#166534' }}>{foundName}</div>
                                <div style={{ fontSize: 12, color: '#16a34a', marginTop: 3 }}>📱 {mobile}</div>
                            </div>
                        ) : (
                            <>
                                <Field label={t(lang, 'lbl_name')} value={name} onChange={setName} placeholder="Full name" />
                                <Field label={t(lang, 'lbl_address')} value={address1} onChange={setAddress1} placeholder="House No, Street, Building..." full />
                                <Field label="Address Line 2" value={address2} onChange={setAddress2} placeholder="Society, Landmark, Colony..." full />
                                <div style={styles.grid}>
                                    <SelectField label={t(lang, 'lbl_state')} value={stateVal} onChange={setStateVal} options={['Gujarat', 'Rajasthan', 'Maharashtra']} />
                                    <Field label={t(lang, 'lbl_city')} value={city} onChange={setCity} placeholder="City" />
                                    <div style={{ ...styles.field, position: 'relative' }}>
                                        <span style={styles.label}>{t(lang, 'lbl_pin')}</span>
                                        <input value={pin} onChange={(e) => handlePinInput(e.target.value)} onFocus={() => setPinDdOpen(pinResults.length > 0)} placeholder="Pin or area" style={styles.input} />
                                        {pinDdOpen && pinResults.length > 0 && (
                                            <div style={styles.pinDropdown}>
                                                {pinResults.map((r) => (
                                                    <div key={r.pincode} onClick={() => selectPin(r)} style={styles.pinDropdownRow}>
                                                        <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{r.area ? `${r.area} - ` : ''}{r.pincode}</span>
                                                        {r.district && <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.district}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <Field label={t(lang, 'lbl_area')} value={area} onChange={setArea} placeholder="Auto-filled from pin" />
                                </div>
                            </>
                        )}
                        <div style={styles.actions}>
                            <button type="button" onClick={submitCustomer} style={styles.primaryButton}>{t(lang, 'confirm')}</button>
                        </div>
                    </>
                )}

                {step === 'category' && (
                    <>
                        <button type="button" onClick={() => setStep('customer')} style={styles.backBtn}>← {t(lang, 'back')}</button>
                        <div style={styles.sectionTitle}>{t(lang, 'category_hdr')}</div>
                        <p style={{ ...styles.subtitle, marginTop: 0 }}>{t(lang, 'category_sub')}</p>
                        <div style={styles.choiceGrid}>
                            {CATS.map((c) => (
                                <button key={c.id} type="button" onClick={() => selectCategory(c.id)} style={styles.choiceCard}>
                                    <div style={styles.choiceIcon}>{c.icon}</div>
                                    <div style={styles.choiceMain}>{c.label[lang] || c.label.en}</div>
                                    <div style={styles.choiceSub}>{c.sub[lang] || c.sub.en}</div>
                                </button>
                            ))}
                        </div>
                        {saving && <div style={{ marginTop: 12, color: '#64748b' }}>Submitting...</div>}
                        {error && <div style={styles.error}>{error}</div>}
                    </>
                )}

                {step === 'brand' && selectedCategory && (
                    <>
                        <button type="button" onClick={() => setStep('category')} style={styles.backBtn}>← {t(lang, 'back')}</button>
                        <div style={styles.sectionTitle}>{t(lang, 'brand_hdr')}</div>
                        <div style={styles.ctxPill}>{selectedCategory.icon} {selectedCategory.label[lang] || selectedCategory.label.en}</div>
                        <div style={styles.choiceGrid}>
                            {(BRANDS[catId] || []).map((b) => (
                                <button key={b.name} type="button" onClick={() => selectBrand(b.name)} style={styles.choiceCard}>
                                    <div style={styles.choiceIcon}>{b.emoji}</div>
                                    <div style={styles.choiceMain}>{b.name}</div>
                                    <div style={styles.choiceSub}>{b.wc} Service Center</div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {step === 'purpose' && (
                    <>
                        <button type="button" onClick={backFromPurpose} style={styles.backBtn}>← {t(lang, 'back')}</button>
                        <div style={styles.sectionTitle}>{t(lang, 'purpose_hdr')}</div>
                        {brandName && <div style={styles.ctxPill}>{selectedCategory?.icon} {selectedCategory?.label[lang] || selectedCategory?.label.en} › {brandName}</div>}
                        {(['repair', 'eol', 'cleaning', 'delivery'] as WizardPurposeId[]).map((pid) => (
                            <div key={pid} onClick={() => selectPurpose(pid)} style={styles.optCard}>
                                <div style={styles.optIcon}>{pid === 'repair' ? '🔧' : pid === 'eol' ? '📦' : pid === 'cleaning' ? '🧹' : '📤'}</div>
                                <div>
                                    <div style={styles.optTitle}>{t(lang, `lbl_${pid}`)}</div>
                                    <div style={styles.optSub}>{t(lang, `lbl_${pid}_sub`)}</div>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {step === 'product' && (
                    <>
                        <button type="button" onClick={() => setStep('purpose')} style={styles.backBtn}>← {t(lang, 'back')}</button>
                        <div style={styles.sectionTitle}>{t(lang, 'product_hdr')}</div>

                        {purposeType === 'Inward' && (
                            <div style={{ marginBottom: 14 }}>
                                <span style={styles.label}>{t(lang, 'lbl_warranty')}</span>
                                <div style={styles.warrantyRow}>
                                    {(['In Warranty', 'Out of Warranty', 'Other'] as const).map((w) => (
                                        <div key={w} onClick={() => setWarranty(w)} style={{ ...styles.wBtn, ...(warranty === w ? styles.wBtnActive : {}) }}>
                                            <div style={{ fontSize: 20 }}>{w === 'In Warranty' ? '✅' : w === 'Out of Warranty' ? '⚠️' : '❓'}</div>
                                            <div>{t(lang, w === 'In Warranty' ? 'w_yes' : w === 'Out of Warranty' ? 'w_no' : 'w_other')}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ ...styles.field, position: 'relative' }}>
                            <span style={styles.label}>{t(lang, 'lbl_model')}</span>
                            <input value={model} onChange={(e) => handleModelInput(e.target.value)} placeholder="Type to search model..." style={styles.input} />
                            {modelSug.length > 0 && (
                                <div style={styles.pinDropdown}>
                                    {modelSug.map((m, i) => (
                                        <div key={i} onClick={() => { setModel(m.text.split(' — ')[0]); setModelSug([]); }} style={styles.pinDropdownRow}>{m.text}</div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Field label={t(lang, 'lbl_serial')} value={serial} onChange={setSerial} placeholder="Found on product label..." />

                        {purposeType === 'Inward' && (
                            <>
                                <SelectField label={t(lang, 'lbl_problem_sel')} value={problemSel} onChange={setProblemSel} options={['', ...problemOptions]} />
                                {problemSel === 'Other' && (
                                    <Field label={t(lang, 'lbl_problem_text')} value={problemOther} onChange={setProblemOther} placeholder="Describe the issue..." full />
                                )}
                                <Field label={t(lang, 'lbl_problem_detail')} value={problemDetail} onChange={setProblemDetail} placeholder="Any additional information..." full />
                            </>
                        )}

                        {extraProducts.map((ep, idx) => (
                            <div key={idx} style={styles.extraCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Product {idx + 2}</span>
                                    <button type="button" onClick={() => removeExtraProduct(idx)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>×</button>
                                </div>
                                <Field label="Model Number" value={ep.model} onChange={(v) => updateExtraProduct(idx, { model: v })} placeholder="Type to search model..." />
                                <Field label="Serial No (optional)" value={ep.serial} onChange={(v) => updateExtraProduct(idx, { serial: v })} placeholder="Found on product label..." />
                                <SelectField label="Problem Type" value={ep.problemSel} onChange={(v) => updateExtraProduct(idx, { problemSel: v })} options={['', ...problemOptions]} />
                                {ep.problemSel === 'Other' && (
                                    <Field label="Describe Problem" value={ep.problemOther} onChange={(v) => updateExtraProduct(idx, { problemOther: v })} placeholder="Describe the issue..." full />
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addExtraProduct} style={styles.secondaryButton}>+ Add Another Product</button>

                        {error && <div style={styles.error}>{error}</div>}
                        <div style={styles.actions}>
                            <button type="button" onClick={submitProductDetails} disabled={saving} style={styles.primaryButton}>
                                {saving ? 'Submitting...' : t(lang, 'submit')}
                            </button>
                        </div>
                    </>
                )}

                {step === 'delivery' && (
                    <>
                        <button type="button" onClick={backFromPurpose} style={styles.backBtn}>← {t(lang, 'back')}</button>
                        <div style={styles.sectionTitle}>{t(lang, 'delivery_hdr')}</div>
                        <p style={{ ...styles.subtitle, marginTop: 0 }}>{t(lang, 'delivery_pg_sub')}</p>
                        {loadingDelivery ? (
                            <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Loading...</div>
                        ) : (
                            <>
                                {deliveryItems.map((item, i) => (
                                    <label key={i} style={{ ...styles.deliveryRow, ...(selectedDelivery.has(i) ? styles.deliveryRowActive : {}) }}>
                                        <input type="checkbox" checked={selectedDelivery.has(i)} onChange={() => toggleDeliveryItem(i)} style={{ marginTop: 3, width: 18, height: 18 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{item.prod.brand ? `${item.prod.brand} ` : ''}{item.prod.model || 'Unknown model'}</div>
                                            {item.prod.remarks && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.prod.remarks}</div>}
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>📅 Submitted: {item.date}{item.time ? ` at ${item.time}` : ''}</div>
                                        </div>
                                    </label>
                                ))}
                                {error && <div style={styles.error}>{error}</div>}
                                <div style={styles.actions}>
                                    <button type="button" onClick={submitDeliveryEntry} disabled={saving} style={styles.primaryButton}>
                                        {saving ? 'Submitting...' : t(lang, 'lbl_delivery_submit')}
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function Field({ label, value, onChange, placeholder, type = 'text', full = false }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; full?: boolean }) {
    return (
        <label style={{ ...styles.field, ...(full ? styles.full : {}) }}>
            <span style={styles.label}>{label}</span>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={styles.input} />
        </label>
    );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
    return (
        <label style={styles.field}>
            <span style={styles.label}>{label}</span>
            <select value={value} onChange={(e) => onChange(e.target.value)} style={styles.input}>
                {options.map((o) => <option key={o || 'empty'} value={o}>{o || 'Select'}</option>)}
            </select>
        </label>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', padding: 16, background: 'linear-gradient(180deg, #0f172a 0%, #edf3ff 22%, #f8fbff 100%)' },
    panel: { maxWidth: 640, margin: '0 auto', background: '#fff', borderRadius: 28, padding: 24, boxShadow: '0 24px 80px rgba(15, 23, 42, 0.16)' },
    header: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap' },
    kicker: { textTransform: 'uppercase', letterSpacing: '0.16em', color: '#1d4ed8', fontSize: 12, fontWeight: 900 },
    title: { margin: '6px 0 0', fontSize: 26, color: '#0f172a', lineHeight: 1.15 },
    subtitle: { margin: '10px 0 0', color: '#475569', lineHeight: 1.6 },
    backLink: { textDecoration: 'none', color: '#1d4ed8', fontWeight: 900, background: '#eff6ff', padding: '10px 14px', borderRadius: 12 },
    backBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 16 },
    sectionTitle: { fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 },
    langGrid: { display: 'flex', flexDirection: 'column', gap: 10 },
    langBtn: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: 16, border: '1.5px solid #e2e8f0', borderRadius: 14, background: '#fff', cursor: 'pointer', textAlign: 'left' },
    choiceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 },
    choiceCard: { border: '1px solid #dbe4f0', background: '#f8fbff', padding: 14, borderRadius: 18, textAlign: 'left', cursor: 'pointer' },
    choiceMain: { fontSize: 15, fontWeight: 900, color: '#0f172a' },
    choiceSub: { marginTop: 6, fontSize: 12, opacity: 0.8, color: '#475569' },
    choiceIcon: { fontSize: 28, marginBottom: 10 },
    optCard: { display: 'flex', alignItems: 'center', gap: 14, padding: 15, border: '1.5px solid #e2e8f0', borderRadius: 14, cursor: 'pointer', marginBottom: 10, background: '#fff' },
    optIcon: { width: 48, height: 48, borderRadius: 12, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 },
    optTitle: { fontSize: 14, fontWeight: 700, color: '#1e293b' },
    optSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
    ctxPill: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#1e40af', marginBottom: 14 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 14 },
    field: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
    full: { gridColumn: '1 / -1' },
    label: { fontSize: 12, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' },
    input: { border: '1px solid #dbe4f0', borderRadius: 14, padding: '12px 14px', fontSize: 15, outline: 'none', background: '#fbfdff', width: '100%', boxSizing: 'border-box' },
    pinDropdown: { position: 'absolute', zIndex: 500, background: '#fff', border: '1.5px solid #1a56db', borderRadius: 10, maxHeight: 200, overflowY: 'auto', width: '100%', boxShadow: '0 4px 16px rgba(0,0,0,.12)', top: '100%', left: 0, marginTop: 2 },
    pinDropdownRow: { padding: '10px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' },
    warrantyRow: { display: 'flex', gap: 8, marginTop: 6 },
    wBtn: { flex: 1, padding: '12px 6px', border: '1.5px solid #e2e8f0', borderRadius: 10, textAlign: 'center', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b' },
    wBtnActive: { borderColor: '#2563eb', background: '#eff6ff', color: '#1d4ed8' },
    customerCard: { background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #86efac', borderRadius: 14, padding: 14, marginBottom: 16 },
    extraCard: { border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 14, marginTop: 12, marginBottom: 4 },
    deliveryRow: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: 13, border: '1.5px solid #e2e8f0', borderRadius: 14, marginBottom: 10, cursor: 'pointer' },
    deliveryRowActive: { borderColor: '#2563eb', background: '#eff6ff' },
    actions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18, flexWrap: 'wrap' },
    primaryButton: { border: 'none', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: '#fff', padding: '12px 18px', borderRadius: 14, fontWeight: 900, cursor: 'pointer' },
    secondaryButton: { border: '1px solid #dbe4f0', background: '#fff', color: '#0f172a', padding: '10px 16px', borderRadius: 14, fontWeight: 700, textDecoration: 'none', cursor: 'pointer', marginTop: 4, fontSize: 13 },
    error: { marginTop: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: 12, borderRadius: 14 },
    successIcon: { fontSize: 54, marginBottom: 8, textAlign: 'center' },
    tokenCard: { marginTop: 18, background: 'linear-gradient(135deg, #0f172a, #1d4ed8)', color: '#fff', borderRadius: 20, padding: 18, textAlign: 'center' },
    tokenLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.75 },
    tokenValue: { fontSize: 48, fontWeight: 900, marginTop: 6 },
    summaryBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, marginTop: 16 },
    summaryRow: { display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: 13, alignItems: 'flex-start' },
    summaryLabel: { color: '#64748b', fontWeight: 600, width: 90, flexShrink: 0 },
    summaryVal: { color: '#1e293b', fontWeight: 500 },
    waitBox: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 14, textAlign: 'center', fontSize: 14, color: '#1e40af', fontWeight: 600, lineHeight: 1.6, marginTop: 14 },
};
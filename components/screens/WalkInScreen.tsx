'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { WalkInEntry } from '@/types/walkin';
import { useWalkIn } from '@/hooks/useWalkIn';
import {
  insertWalkIn,
  updateWalkIn,
  getNextToken,
  findTodayWalkInByMobile,
  mergeWalkInProducts,
} from '@/services/walkInService';
import { announceToken } from '@/utils/tokenVoice';
import TokenBoard from './walkin/TokenBoard';
import WalkInForm from './walkin/WalkInForm';
import WalkInList from './walkin/WalkInList';
import { colors, styles } from '@/styles/ticketsStyles';

function getTodayKey(): string {
  return `wi_serving_token_${new Date().toLocaleDateString('en-CA')}`;
}

function getToday(): string {
  return new Date().toLocaleDateString('en-CA');
}

export default function WalkInScreen() {
  const { data: session } = useSession();
  const currentUserRole = (session?.user as any)?.roleType;
  const currentUserId = (session?.user as any)?.email ?? '';
  const currentUserName = (session?.user as any)?.name ?? '';

  const { todayLogs, loading, refetch, fetchLogsForDate } = useWalkIn(currentUserRole ?? '', currentUserId, currentUserName);

  const [nowServing, setNowServing] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<WalkInEntry | null>(null);
  const [nextToken, setNextToken] = useState(1);
  const [showQR, setShowQR] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Walk-in History date navigator — mirrors HTML's "📋 Walk-in History"
  // card + loadWIDateView() (index.html:16615-16679). Defaults to today, in
  // which case we just reuse todayLogs (already fetched for the token
  // board); any other date is fetched on demand.
  const [histDate, setHistDate] = useState(getToday());
  const [histLogs, setHistLogs] = useState<WalkInEntry[] | null>(null);
  const [histLoading, setHistLoading] = useState(false);
  const isHistToday = histDate === getToday();

  const loadHistView = useCallback(async () => {
    if (histDate === getToday()) { setHistLogs(null); return; }
    setHistLoading(true);
    const logs = await fetchLogsForDate(histDate);
    setHistLogs(logs);
    setHistLoading(false);
  }, [histDate, fetchLogsForDate]);

  useEffect(() => { loadHistView(); }, [loadHistView]);

  const displayLogs = isHistToday ? todayLogs : (histLogs ?? []);
  const displayLoading = isHistToday ? loading : histLoading;

  const refreshLists = useCallback(async () => {
    await refetch();
    if (!isHistToday) await loadHistView();
  }, [refetch, isHistToday, loadHistView]);

  useEffect(() => {
    const stored = localStorage.getItem(getTodayKey());
    setNowServing(stored ? parseInt(stored, 10) : 0);
  }, []);

  const handleCallNext = useCallback(() => {
    const cur = parseInt(localStorage.getItem(getTodayKey()) || '0', 10) || 0;
    const tokens = todayLogs.map((e) => e.token_no).filter((t): t is number => !!t).sort((a, b) => a - b);
    let next = tokens.find((t) => t > cur);
    if (next === undefined) {
      if (!tokens.length) { alert('No customers in queue today.'); return; }
      if (!confirm(`All tokens have been called. Reset and start from #${tokens[0]} again?`)) return;
      next = tokens[0];
    }
    localStorage.setItem(getTodayKey(), String(next));
    setNowServing(next);
    announceToken(next);
  }, [todayLogs]);

  const handleCallAgain = useCallback(() => {
    if (!nowServing) { alert('No token is currently being served. Click "Call Next" first.'); return; }
    announceToken(nowServing);
  }, [nowServing]);

  const handleAddClick = async () => {
    const token = await getNextToken(getToday());
    setNextToken(token);
    setEditEntry(null);
    setModalOpen(true);
  };

  const handleEditEntry = async (entry: WalkInEntry) => {
    setEditEntry(entry);
    setModalOpen(true);
  };

  const handleSave = async (data: any) => {
    const today = getToday();
    let wcId = currentUserId;
    let wcName = currentUserName;
    if (data.route === 'ICP') { wcId = 'SELF_CHECKIN_ICP'; wcName = 'Self Check-in (ICP)'; }
    else if (data.route === 'CSP') { wcId = 'SELF_CHECKIN_CSP'; wcName = 'Self Check-in (CSP)'; }

    if (editEntry) {
      const result = await updateWalkIn(editEntry.id, {
        customer_name: data.customer_name,
        mobile: data.mobile,
        arrival_time: data.arrival_time,
        departure_time: data.departure_time,
        address: data.address,
        state: data.state,
        city: data.city,
        pin: data.pin,
        area: data.area,
        products: data.products,
        product_count: data.product_count,
      });
      if (!result.success) {
        alert('❌ Failed to update: ' + result.error);
        return;
      }
      alert('✅ Updated!');
    } else {
      // Duplicate check: same mobile today? — mirrors HTML's saveWalkIn
      // (index.html:16926-16942). If found, ask whether to merge the new
      // products into the existing entry or create a separate one.
      const dup = await findTodayWalkInByMobile(data.mobile, today);
      if (dup) {
        const choice = confirm(
          `⚠️ Aa customer aaj already registered chhe!\n\nCustomer: ${dup.customer_name}\nToken: #${dup.token_no || '—'} | Time: ${dup.arrival_time}\n\nOK = Existing entry ma products add karo\nCancel = New separate entry banavo`
        );
        if (choice) {
          const mergedProds = [...(dup.products || []), ...data.products];
          const mergeResult = await mergeWalkInProducts(dup.id, mergedProds);
          if (!mergeResult.success) {
            alert('❌ Failed to merge: ' + mergeResult.error);
            return;
          }
          alert('✅ Products existing entry ma add kari didhaj!');
          setModalOpen(false);
          setEditEntry(null);
          await refreshLists();
          return;
        }
      }

      const result = await insertWalkIn({
        token_no: data.token_no,
        customer_name: data.customer_name,
        mobile: data.mobile,
        visit_date: today,
        arrival_time: data.arrival_time,
        departure_time: data.departure_time || null,
        address: data.address,
        state: data.state,
        city: data.city,
        pin: data.pin,
        area: data.area,
        wc_id: wcId,
        wc_name: wcName,
        products: data.products,
        product_count: data.product_count,
      });
      if (!result.success) {
        alert('❌ Failed to save: ' + result.error);
        return;
      }
      alert('✅ Walk-in added!');
    }

    setModalOpen(false);
    setEditEntry(null);
    await refreshLists();
  };

  // "⏰ Set Departure" — mirrors HTML's updateWIDeparture (index.html:16973-16982).
  const handleDeparture = async (entry: WalkInEntry) => {
    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (!confirm(`Set departure time to: ${now}?`)) return;
    setBusyId(entry.id);
    const result = await updateWalkIn(entry.id, { departure_time: now });
    setBusyId(null);
    if (!result.success) {
      alert('❌ Error: ' + result.error);
      return;
    }
    await refreshLists();
  };

  const queue = todayLogs.map((e) => ({ token: e.token_no, name: e.customer_name }));
  const canManage = currentUserRole === 'admin' || currentUserRole === 'work_controller';
  const checkinUrl = typeof window !== 'undefined' ? `${window.location.origin}/walk-in` : '';

  const histDateLabel = new Date(`${histDate}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>🔔 Walk-in Register</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {canManage && (
            <button
              style={{ ...styles.btn, ...styles.btnOutline }}
              onClick={() => setShowQR(true)}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnOutlineHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnOutline)}
            >
              📱 Self Check-in QR
            </button>
          )}
          {canManage && (
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={handleAddClick}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnPrimaryHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnPrimary)}
            >
              ➕ New Walk-in
            </button>
          )}
        </div>
      </div>

      {/* Token Board */}
      <TokenBoard
        nowServing={nowServing}
        queue={queue}
        onCallNext={handleCallNext}
        onCallAgain={handleCallAgain}
      />

      {/* Walk-in History — date-navigable list, defaults to today */}
      <div style={{ ...styles.card, marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          <h3 style={{ ...styles.sectionTitle, fontSize: '15px', margin: 0 }}>
            📋 Walk-in History
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="date"
              value={histDate}
              onChange={(e) => setHistDate(e.target.value)}
              style={{ border: `1px solid ${colors.border}`, borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none', cursor: 'pointer' }}
            />
            <button
              style={{ ...styles.btn, ...styles.btnOutline, ...styles.btnSm }}
              onClick={() => loadHistView()}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnOutlineHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnOutline)}
            >
              🔄
            </button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>
          <b>{displayLogs.length}</b> entries for <b>{histDateLabel}</b>{isHistToday ? ' (Today)' : ''}
        </div>
        {displayLoading ? (
          <div style={styles.loadingText}>Loading...</div>
        ) : (
          <WalkInList
            entries={displayLogs}
            onEdit={handleEditEntry}
            onDeparture={handleDeparture}
            onJobCreated={refreshLists}
            busyId={busyId}
          />
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <WalkInForm
          entry={editEntry}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditEntry(null); }}
          nextToken={nextToken}
        />
      )}

      {/* QR Modal */}
      {showQR && (
        <div style={styles.modalOverlay} onClick={() => setShowQR(false)}>
          <div style={{ ...styles.modal, maxWidth: 360, textAlign: 'center', padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>📱 Customer Self Check-in</h3>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(checkinUrl)}`}
              alt="Self check-in QR"
              style={{ width: 240, height: 240, margin: '0 auto', display: 'block' }}
            />
            <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 12 }}>Customers can scan this to check themselves in.</p>
            <button
              onClick={() => setShowQR(false)}
              style={{ ...styles.btn, ...styles.btnOutline, marginTop: 8 }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.btnOutlineHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.btnOutline)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
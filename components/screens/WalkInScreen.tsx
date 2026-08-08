'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { WalkInEntry } from '@/types/walkin';
import { useWalkIn } from '@/hooks/useWalkIn';
import { insertWalkIn, updateWalkIn, deleteWalkIn, getNextToken } from '@/services/walkInService';
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
  const currentUserId = (session?.user as any)?.id ?? '';
  const currentUserName = (session?.user as any)?.name ?? '';

  const { todayLogs, loading, refetch } = useWalkIn(currentUserRole ?? '', currentUserId);

  const [nowServing, setNowServing] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<WalkInEntry | null>(null);
  const [nextToken, setNextToken] = useState(1);
  const [showQR, setShowQR] = useState(false);

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
    await refetch();
  };

  const handleDelete = async (id: string) => {
    const result = await deleteWalkIn(id);
    if (!result.success) {
      alert('❌ Failed to delete: ' + result.error);
      return;
    }
    await refetch();
  };

  const queue = todayLogs.map((e) => ({ token: e.token_no, name: e.customer_name }));
  const canManage = currentUserRole === 'admin' || currentUserRole === 'work_controller';
  const checkinUrl = typeof window !== 'undefined' ? `${window.location.origin}/walk-in` : '';

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

      {/* Today's List */}
      <div style={{ marginTop: '8px' }}>
        <h3 style={{ ...styles.sectionTitle, fontSize: '15px', marginBottom: '12px' }}>
          📋 Today's Entries
        </h3>
        {loading ? (
          <div style={styles.loadingText}>Loading...</div>
        ) : (
          <WalkInList
            entries={todayLogs}
            onEdit={handleEditEntry}
            onDelete={handleDelete}
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
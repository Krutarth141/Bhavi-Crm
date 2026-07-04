'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { WalkInEntry } from '@/types/walkin';
import { useWalkIn } from '@/hooks/useWalkIn';
import { insertWalkIn, updateWalkIn, deleteWalkIn, getNextToken } from '@/services/walkInService';
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

  // Read nowServing from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(getTodayKey());
    setNowServing(stored ? parseInt(stored, 10) : 0);
  }, []);

  const handleCallNext = useCallback(() => {
    setNowServing((prev) => {
      const next = prev + 1;
      localStorage.setItem(getTodayKey(), String(next));
      return next;
    });
  }, []);

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

    if (editEntry) {
      const result = await updateWalkIn(editEntry.id, {
        customer_name: data.customer_name,
        mobile: data.mobile,
        arrival_time: data.arrival_time,
        products: data.products,
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
        departure_time: '',
        wc_id: currentUserId,
        wc_name: currentUserName,
        products: data.products,
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

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>🔔 Walk-in Register</h2>
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

      {/* Token Board */}
      <TokenBoard
        nowServing={nowServing}
        queue={queue}
        onCallNext={handleCallNext}
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
    </div>
  );
}

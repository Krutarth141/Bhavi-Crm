'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useCourier } from '@/hooks/useCourier';
import {
  insertCourierEntry,
  updateCourierStatus,
  insertReceiver,
  updateReceiver,
  deleteReceiver,
} from '@/services/courierService';
import { CourierReceiver } from '@/types/courier';
import CourierInwardForm from '@/components/screens/courier/CourierInwardForm';
import CourierOutwardForm from '@/components/screens/courier/CourierOutwardForm';
import CourierList from '@/components/screens/courier/CourierList';
import ReceiversTab from '@/components/screens/courier/ReceiversTab';
import { colors, styles } from '@/styles/ticketsStyles';

type ActiveTab = 'inward' | 'outward' | 'receivers';

export default function CourierScreen() {
  const { data: session } = useSession();
  const { entries, receivers, loading, refetch, refetchReceivers } = useCourier();

  const [activeTab, setActiveTab] = useState<ActiveTab>('inward');
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wcId = (session?.user as any)?.id ?? '';
  const wcName = (session?.user as any)?.name ?? '';
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  const handleInwardSave = async (data: any) => {
    setSaveLoading(true);
    setError(null);
    try {
      const result = await insertCourierEntry({
        type: 'Inward',
        entry_date: todayStr,
        wc_id: wcId,
        wc_name: wcName,
        status: 'pending',
        ...data,
      });
      if (!result.success) throw new Error(result.error);
      await refetch();
    } catch (err: any) {
      setError(err.message ?? String(err));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleOutwardSave = async (data: any) => {
    setSaveLoading(true);
    setError(null);
    try {
      const result = await insertCourierEntry({
        type: 'Outward',
        entry_date: todayStr,
        wc_id: wcId,
        wc_name: wcName,
        status: 'pending',
        ...data,
      });
      if (!result.success) throw new Error(result.error);
      await refetch();
    } catch (err: any) {
      setError(err.message ?? String(err));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'pending' | 'received' | 'dispatched') => {
    const result = await updateCourierStatus(id, status);
    if (!result.success) {
      alert('❌ Failed to update status: ' + result.error);
      return;
    }
    await refetch();
  };

  const handleAddReceiver = async (data: { name: string; address: string; mobile: string }) => {
    const result = await insertReceiver(data);
    if (!result.success) {
      alert('❌ Failed to add receiver: ' + result.error);
      return;
    }
    await refetchReceivers();
  };

  const handleEditReceiver = async (id: string, data: Partial<CourierReceiver>) => {
    const result = await updateReceiver(id, data);
    if (!result.success) {
      alert('❌ Failed to update receiver: ' + result.error);
      return;
    }
    await refetchReceivers();
  };

  const handleDeleteReceiver = async (id: string) => {
    const result = await deleteReceiver(id);
    if (!result.success) {
      alert('❌ Failed to delete receiver: ' + result.error);
      return;
    }
    await refetchReceivers();
  };

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'inward', label: '📥 Inward' },
    { key: 'outward', label: '📤 Outward' },
    { key: 'receivers', label: '📋 Receivers' },
  ];

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>📦 Courier Register</h2>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>❌ {error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '20px',
          borderBottom: `2px solid ${colors.border}`,
          paddingBottom: '0',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.btn,
              borderRadius: '8px 8px 0 0',
              borderBottom: 'none',
              paddingBottom: '10px',
              backgroundColor: activeTab === tab.key ? colors.primary : 'transparent',
              color: activeTab === tab.key ? '#fff' : colors.textMuted,
              fontWeight: activeTab === tab.key ? 700 : 500,
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={styles.loadingText}>Loading courier data...</div>
      )}

      {!loading && (
        <>
          {/* Inward Tab */}
          {activeTab === 'inward' && (
            <>
              <CourierInwardForm onSave={handleInwardSave} loading={saveLoading} />
              <CourierList entries={entries} receivers={receivers} onStatusChange={handleStatusChange} />
            </>
          )}

          {/* Outward Tab */}
          {activeTab === 'outward' && (
            <>
              <CourierOutwardForm receivers={receivers} onSave={handleOutwardSave} loading={saveLoading} />
              <CourierList entries={entries} receivers={receivers} onStatusChange={handleStatusChange} />
            </>
          )}

          {/* Receivers Tab */}
          {activeTab === 'receivers' && (
            <ReceiversTab
              receivers={receivers}
              onAdd={handleAddReceiver}
              onEdit={handleEditReceiver}
              onDelete={handleDeleteReceiver}
            />
          )}
        </>
      )}
    </div>
  );
}

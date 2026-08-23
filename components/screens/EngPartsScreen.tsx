'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useEngParts } from '@/hooks/useEngParts';
import EngPartsAdmin from './eng-parts/EngPartsAdmin';
import EngPartsEngineer from './eng-parts/EngPartsEngineer';
import { styles, colors } from '@/styles/ticketsStyles';
import { isCspManager } from '@/lib/permissions';

interface Props {
  isEngineerView?: boolean;
}

export default function EngPartsScreen({ isEngineerView }: Props) {
  const { data: session } = useSession();
  const roleType = (session?.user as any)?.roleType ?? '';
  const userName = (session?.user as any)?.name ?? '';
  const engineerId = (session?.user as any)?.email ?? '';

  const {
    inventory,
    engStock,
    movements,
    requests,
    engineers,
    pendingRequests,
    loading,
    error,
    refetch,
  } = useEngParts();

  const isEngRole = isEngineerView === true || roleType === 'engineer';
  const cspMgr = isEngRole && isCspManager(session);
  // HTML: isFullAccess = isAdmin || isCspMgr — CSP managers get the SAME full
  // admin page as a real admin (stock overview, issue/use/warranty/return
  // tools, approve+reject on any request), not a cut-down view.
  const showEngineerView = isEngRole && !cspMgr;

  // CSP managers ALSO keep their own self-service — "📥 Request Parts (Self)",
  // "↩️ Return My Parts", and a "📋 My Requests" tab alongside the full admin
  // page (index.html:10142-10144). Reuses EngPartsEngineer's already-built
  // My Stock/My Requests/Request/Return views rather than re-implementing
  // them inside EngPartsAdmin.
  const [cspView, setCspView] = useState<'admin' | 'self'>('admin');

  if (loading) return <div style={styles.loadingText}>Loading parts data...</div>;
  if (error) return <div style={{ padding: '20px', color: colors.danger }}>❌ {error}</div>;

  const selfServiceView = (
    <EngPartsEngineer
      engName={userName}
      engineerId={engineerId}
      inventory={inventory}
      myStock={engStock.filter(s => s.owner === userName)}
      myRequests={requests.filter(r => r.engineer_name === userName)}
      onRefetch={refetch}
    />
  );

  if (showEngineerView) return selfServiceView;

  if (cspMgr) {
    const toggleStyle = (key: 'admin' | 'self'): React.CSSProperties => ({
      padding: '8px 16px', border: 'none', borderRadius: '8px 8px 0 0',
      background: cspView === key ? '#fff' : 'transparent',
      color: cspView === key ? colors.primary : colors.textMuted,
      fontWeight: cspView === key ? 700 : 400, fontSize: 13, cursor: 'pointer',
      borderBottom: `2px solid ${cspView === key ? colors.primary : 'transparent'}`,
    });
    return (
      <div style={{ background: colors.bg, minHeight: '100vh' }}>
        <div style={{ display: 'flex', gap: 4, padding: '16px 20px 0' }}>
          <button style={toggleStyle('admin')} onClick={() => setCspView('admin')}>🛠️ Manage Parts</button>
          <button style={toggleStyle('self')} onClick={() => setCspView('self')}>👤 My Requests (Self)</button>
        </div>
        {cspView === 'admin' ? (
          <EngPartsAdmin
            inventory={inventory}
            engStock={engStock}
            movements={movements}
            engineers={engineers}
            pendingRequests={pendingRequests}
            onRefetch={refetch}
          />
        ) : selfServiceView}
      </div>
    );
  }

  return (
    <EngPartsAdmin
      inventory={inventory}
      engStock={engStock}
      movements={movements}
      engineers={engineers}
      pendingRequests={pendingRequests}
      onRefetch={refetch}
    />
  );
}
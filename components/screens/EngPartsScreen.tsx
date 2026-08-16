'use client';
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
  const showCspManagerView = isEngRole && isCspManager(session);
  const showEngineerView = isEngRole && !showCspManagerView;

  if (loading) return <div style={styles.loadingText}>Loading parts data...</div>;
  if (error) return <div style={{ padding: '20px', color: colors.danger }}>❌ {error}</div>;

  if (showCspManagerView) {
    // HTML: isEng && isCspMgr → Pending Requests–only view (approve/reject
    // any engineer's Receive/Return request), not the plain self-service view.
    return (
      <EngPartsAdmin
        inventory={inventory}
        engStock={engStock}
        movements={movements}
        engineers={engineers}
        pendingRequests={pendingRequests}
        onRefetch={refetch}
        cspManagerMode
      />
    );
  }

  return showEngineerView
    ? (
      <EngPartsEngineer
        engName={userName}
        engineerId={engineerId}
        inventory={inventory}
        myStock={engStock.filter(s => s.owner === userName)}
        myRequests={requests.filter(r => r.engineer_name === userName)}
        onRefetch={refetch}
      />
    )
    : (
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
'use client';
import { useSession } from 'next-auth/react';
import { useEngParts } from '@/hooks/useEngParts';
import EngPartsAdmin from './eng-parts/EngPartsAdmin';
import EngPartsEngineer from './eng-parts/EngPartsEngineer';
import { styles, colors } from '@/styles/ticketsStyles';

interface Props {
  isEngineerView?: boolean;
}

export default function EngPartsScreen({ isEngineerView }: Props) {
  const { data: session } = useSession();
  const roleType = (session?.user as any)?.roleType ?? '';
  const userName = (session?.user as any)?.name ?? '';

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

  const showEngineerView = isEngineerView === true || roleType === 'engineer';

  if (loading) return <div style={styles.loadingText}>Loading parts data...</div>;
  if (error) return <div style={{ padding: '20px', color: colors.danger }}>❌ {error}</div>;

  return showEngineerView
    ? (
      <EngPartsEngineer
        engName={userName}
        inventory={inventory}
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
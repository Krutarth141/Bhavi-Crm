'use client';

import { useSession } from 'next-auth/react';
import { useEngParts } from '@/hooks/useEngParts';
import { isCspManager } from '@/lib/permissions';
import EngPartsAdmin from './eng-parts/EngPartsAdmin';
import EngPartsEngineer from './eng-parts/EngPartsEngineer';

export default function EngPartsScreen() {
  const { data: session } = useSession();
  const roleType = (session?.user as any)?.roleType;
  const isAdmin = roleType === 'admin';
  const cspMgr = isCspManager(session);
  const engineerId = (session?.user as any)?.email ?? '';
  const engName = (session?.user as any)?.name ?? '';

  const { inventory, engStock, movements, engineers, pendingRequests, myRequests, loading, error, refetch } = useEngParts(engineerId);

  if (loading) return <p style={{ padding: 20, color: '#6b7280' }}>Loading...</p>;
  if (error) return <div style={{ padding: 20, color: '#ef4444' }}>Error: {error}</div>;

  if (isAdmin || cspMgr) {
    return (
      <EngPartsAdmin
        inventory={inventory}
        engStock={engStock}
        movements={movements}
        engineers={engineers}
        pendingRequests={pendingRequests}
        onRefetch={refetch}
        cspManagerMode={!isAdmin && cspMgr}
      />
    );
  }

  const myStock = engStock.filter((s) => s.owner === engName);
  return (
    <EngPartsEngineer
      engName={engName}
      engineerId={engineerId}
      inventory={inventory}
      myStock={myStock}
      myRequests={myRequests}
      onRefetch={refetch}
    />
  );
}
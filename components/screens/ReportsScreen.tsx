'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useReports } from '@/hooks/useReports';
import { REPORT_TABS } from '@/types/reports';

// Tab components
import FilterDownloadTab from '@/components/screens/reports/FilterDownloadTab';
import RevenueTab from '@/components/screens/reports/RevenueTab';
import DailyReportsTab from '@/components/screens/reports/DailyReportsTab';
import WCDailyReportsTab from '@/components/screens/reports/WCDailyReportsTab';
import ImportCallsTab from '@/components/screens/reports/ImportCallsTab';
import TatReportScreen from '@/components/screens/TatReportScreen';

export default function ReportsScreen() {
  const { data: session } = useSession();
  const currentUserName = (session?.user as any)?.name ?? 'Admin';

  const {
    // tab
    activeTab, setActiveTab,
    // tickets
    ticketsLoading,
    // daily
    dailyReports, dailyLoading,
    // wc
    wcReports, wcLoading,
    // import
    importProgress, importTotal, importRunning, importResult, handleImport,
    // filter tab
    filterFields, setFilterFields,
    filterSearched, filterResults,
    runFilteredSearch,
    engineers,
    // tickets
    allTickets,
    // actions
    handleDownload,
    handlePrint,
    // retry (loading-timeout safeguard)
    retryTickets,
    retryDaily,
    retryWc,
  } = useReports();

  // ── Loading-timeout safeguard (index.html:9230-9236 switchReportTab) ───────
  const isTicketTab = activeTab === 'filter' || activeTab === 'revenue';
  const currentTabLoading =
    (isTicketTab && ticketsLoading) ||
    (activeTab === 'daily' && dailyLoading) ||
    (activeTab === 'wcdaily' && wcLoading);

  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    setLoadTimedOut(false);
    const timer = setTimeout(() => setLoadTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [activeTab, retryTick]);

  const handleRetryLoad = () => {
    setLoadTimedOut(false);
    setRetryTick((t) => t + 1);
    if (isTicketTab) retryTickets();
    else if (activeTab === 'daily') retryDaily();
    else if (activeTab === 'wcdaily') retryWc();
  };

  return (
    <div className="content-section">
      {/* Header */}
      <div className="section-header">
        <h2>📈 Reports</h2>
        {activeTab === 'filter' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline btn-sm" onClick={handleDownload}>📊 Excel</button>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>🖨️ Print</button>
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '18px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: activeTab === tab.key ? 700 : 500,
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none',
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state for ticket-based tabs, with a 10s timeout + retry safeguard */}
      {currentTabLoading && loadTimedOut ? (
        <div className="alert alert-warning">
          ⚠️ Loading timeout. <button className="btn btn-sm btn-primary" onClick={handleRetryLoad}>🔄 Retry</button>
        </div>
      ) : ticketsLoading && ['filter', 'revenue'].includes(activeTab) ? (
        <p className="loading">Loading report data...</p>
      ) : (
        <>
          {activeTab === 'filter' && (
            <FilterDownloadTab
              fields={filterFields}
              setFields={setFilterFields}
              engineers={engineers}
              searched={filterSearched}
              results={filterResults}
              runSearch={runFilteredSearch}
              handleDownload={handleDownload}
              handlePrint={handlePrint}
            />
          )}

          {activeTab === 'revenue' && (
            <RevenueTab tickets={allTickets} />
          )}

          {activeTab === 'daily' && (
            <DailyReportsTab
              reports={dailyReports}
              loading={dailyLoading}
            />
          )}

          {activeTab === 'wcdaily' && (
            <WCDailyReportsTab
              reports={wcReports}
              loading={wcLoading}
            />
          )}

          {activeTab === 'import' && (
            <ImportCallsTab
              importRunning={importRunning}
              importProgress={importProgress}
              importTotal={importTotal}
              importResult={importResult}
              onImport={handleImport}
              currentUserName={currentUserName}
            />
          )}

          {activeTab === 'tat' && <TatReportScreen />}
        </>
      )}
    </div>
  );
}
'use client';

import { useReports } from '@/hooks/useReports';
import { REPORT_TABS } from '@/types/reports';

// Tab components
import OverviewTab from '@/components/screens/reports/OverviewTab';
import FilterDownloadTab from '@/components/screens/reports/FilterDownloadTab';
import RevenueTab from '@/components/screens/reports/RevenueTab';
import TasksTab from '@/components/screens/reports/TasksTab';
import PunchLogsTab from '@/components/screens/reports/PunchLogsTab';
import DailyReportsTab from '@/components/screens/reports/DailyReportsTab';
import WCDailyReportsTab from '@/components/screens/reports/WCDailyReportsTab';
import ImportCallsTab from '@/components/screens/reports/ImportCallsTab';

// Replace with real session user in your app (e.g. from useSession / context)
const CURRENT_USER_NAME = 'Admin';

export default function ReportsScreen() {
  const {
    // tab
    activeTab, setActiveTab,
    // tickets
    ticketsLoading,
    // punch logs
    punchLogs, punchLoading, handleVerifyPunch,
    // daily
    dailyReports, dailyLoading,
    // wc
    wcReports, wcLoading,
    // import
    importProgress, importTotal, importRunning, importResult, handleImport,
    // filter state
    period, setPeriod,
    customFrom, setCustomFrom,
    customTo, setCustomTo,
    filters, setFilters,
    reportType, setReportType,
    // derived
    filtered,
    engineers,
    engData,
    totalCalls,
    totalClosed,
    totalRevenue,
    closureRate,
    statusChartData,
    callTypeChartData,
    engineerChartData,
    revenueChartData,
    getTrendData,
    // actions
    handleDownload,
    handlePrint,
  } = useReports();

  return (
    <div className="content-section">
      {/* Header */}
      <div className="section-header">
        <h2>📈 Reports</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={handleDownload}>📊 Excel</button>
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>🖨️ Print</button>
        </div>
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

      {/* Loading state for ticket-based tabs */}
      {ticketsLoading && ['overview', 'filter', 'revenue', 'tasks'].includes(activeTab) ? (
        <p className="loading">Loading report data...</p>
      ) : (
        <>
          {activeTab === 'overview' && (
            <OverviewTab
              totalCalls={totalCalls}
              totalClosed={totalClosed}
              totalRevenue={totalRevenue}
              closureRate={closureRate}
              getTrendData={getTrendData}
              callTypeChartData={callTypeChartData}
              statusChartData={statusChartData}
            />
          )}

          {activeTab === 'filter' && (
            <FilterDownloadTab
              period={period}
              setPeriod={setPeriod}
              customFrom={customFrom}
              setCustomFrom={setCustomFrom}
              customTo={customTo}
              setCustomTo={setCustomTo}
              filters={filters}
              setFilters={setFilters}
              engineers={engineers}
              filtered={filtered}
              totalClosed={totalClosed}
              totalRevenue={totalRevenue}
              reportType={reportType}
              setReportType={setReportType}
              callTypeChartData={callTypeChartData}
              statusChartData={statusChartData}
              engineerChartData={engineerChartData}
              revenueChartData={revenueChartData}
              engData={engData}
              handleDownload={handleDownload}
              handlePrint={handlePrint}
            />
          )}

          {activeTab === 'revenue' && (
            <RevenueTab
              filtered={filtered}
              totalRevenue={totalRevenue}
              revenueChartData={revenueChartData}
              engData={engData}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksTab
              filtered={filtered}
              engineers={engineers}
            />
          )}

          {activeTab === 'punch' && (
            <PunchLogsTab
              logs={punchLogs}
              loading={punchLoading}
              onVerify={handleVerifyPunch}
              currentUserName={CURRENT_USER_NAME}
            />
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
              currentUserName={CURRENT_USER_NAME}
            />
          )}
        </>
      )}
    </div>
  );
}
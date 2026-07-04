# Implementation Tasks: Missing CRM Screens (Phase 1)

## Task Dependency Graph

```
T1 (types) → T2 (services) → T3 (hooks) → T4–T10 (screens) → T11 (dashboards)
```

---

- [ ] **Task 1: Create TypeScript type files**
  - Create `types/walkin.ts` — `WalkInProduct`, `WalkInEntry` interfaces
  - Create `types/courier.ts` — `CourierReceiver`, `CourierEntry` interfaces
  - Create `types/engParts.ts` — `EngStock`, `EngStockLog` interfaces
  - Create `types/myCalls.ts` — `WorkLog`, `PunchLog` interfaces

- [ ] **Task 2: Create service files**
  Depends on: Task 1
  - Create `services/walkInService.ts` — `insertWalkIn`, `updateWalkIn`, `deleteWalkIn`, `getNextToken`
  - Create `services/courierService.ts` — `insertCourierEntry`, `updateCourierStatus`, `insertReceiver`, `updateReceiver`, `deleteReceiver`
  - Create `services/engPartsService.ts` — `issueToEngineer`, `recordUsage`, `engineerReturn`, `warrantyReturn`, `directWarrantyIssue`, `requestParts`, `approveRequest`, `rejectRequest`
  - Create `services/myCallsService.ts` — `punchIn`, `punchOut`, `saveWorkLog`, `deleteWorkLog`

- [ ] **Task 3: Create custom hooks**
  Depends on: Task 2
  - Create `hooks/useWalkIn.ts` — fetches `walkin_log` by date + role, provides CRUD
  - Create `hooks/useCourier.ts` — fetches `courier_log` (last 30 days) + `courier_receivers`
  - Create `hooks/useEngParts.ts` — fetches `eng_stock`, `eng_stock_log`, `inventory`
  - Create `hooks/usePendingList.ts` — fetches open tickets + engineers list
  - Create `hooks/useMyCalls.ts` — parallel fetch: punch_logs, work_logs, assigned tickets, assigned tasks

- [ ] **Task 4: Walk-in Register screen**
  Depends on: Task 3
  - Create `components/screens/walkin/TokenBoard.tsx` — "Now Serving" display, Call Next button, today's queue list
  - Create `components/screens/walkin/WalkInForm.tsx` — modal form: customer_name, mobile, products list (add/remove rows), arrival_time
  - Create `components/screens/walkin/WalkInList.tsx` — table of today's entries with edit/delete
  - Create `components/screens/WalkInScreen.tsx` — assembles TokenBoard + WalkInList + WalkInForm modal

- [ ] **Task 5: Walk-in Report screen**
  Depends on: Task 1
  - Create `components/screens/WalkInReportScreen.tsx`
  - Date range filter (from/to), text search (customer_name, mobile)
  - Table: token_no, visit_date, customer_name, mobile, arrival_time, departure_time, wc_name, products count
  - Excel export using `xlsx`

- [ ] **Task 6: Courier Register screen**
  Depends on: Task 3
  - Create `components/screens/courier/CourierInwardForm.tsx` — AWB, agency, sender, from_place, weight, description
  - Create `components/screens/courier/CourierOutwardForm.tsx` — AWB, agency, receiver dropdown, to_place, weight
  - Create `components/screens/courier/CourierList.tsx` — last 30 days table with inline status dropdown
  - Create `components/screens/courier/ReceiversTab.tsx` — CRUD table + add form for courier_receivers
  - Create `components/screens/CourierScreen.tsx` — 3 tabs: Inward, Outward, Receivers

- [ ] **Task 7: Courier Report screen**
  Depends on: Task 1
  - Create `components/screens/CourierReportScreen.tsx`
  - Date range filter + type filter (All/Inward/Outward)
  - Table: entry_date, type, awb_no, agency, sender_name, from_place, to_place, receiver name, weight, description, status, wc_name
  - Excel export using `xlsx`

- [ ] **Task 8: Engineer Parts Stock screen**
  Depends on: Task 3
  - Create `components/screens/eng-parts/IssueModal.tsx` — select engineer, select part, qty, optional ticket_id
  - Create `components/screens/eng-parts/UseModal.tsx` — select engineer, select part, qty, ticket_id, note
  - Create `components/screens/eng-parts/ReturnModal.tsx` — handles both Engineer Return and Warranty Return
  - Create `components/screens/eng-parts/EngPartsAdmin.tsx` — tabs: Stock Overview (searchable), Engineer Analysis (card grid), Pending Approvals (approve/reject), Log (full movement log); action buttons for all modals
  - Create `components/screens/eng-parts/EngPartsEngineer.tsx` — tabs: My Requests (own eng_stock_log entries), Self Service (request parts from inventory)
  - Create `components/screens/EngPartsScreen.tsx` — renders `EngPartsAdmin` or `EngPartsEngineer` based on `isEngineerView` prop or `roleType`

- [ ] **Task 9: Pending List screen**
  Depends on: Task 3
  - Create `components/screens/PendingListScreen.tsx`
  - Load all open tickets (status not in closed list)
  - Count badge in header
  - "Ready for Pickup" section at top (status = Repaired)
  - Filters: WC Type, service type, brand search, free text
  - Table: ticket ID, date, customer, mobile, brand/model, area/PIN, status badge, assigned engineer (inline dropdown), TAT date, quick status dropdown
  - Excel export

- [ ] **Task 10: My Calls — Engineer daily view**
  Depends on: Task 3
  - Create `components/screens/MyCallsScreen.tsx`
  - Punch bar: Punch In button (prompts start_meter) / Punch Out button (prompts end_meter), shows punch_in_time when active
  - KPI row: total tickets, active, closed, tasks count
  - Today's route: assigned tickets sorted by sequence_no, non-closed status
  - Today's active tasks list
  - Work log entry form: from_time select, to_time select, task_description input, save button
  - Today's work log list: from_time–to_time, task_description, delete button
  - WhatsApp share button: opens wa.me with encoded daily summary

- [ ] **Task 11: Dashboard navigation updates**
  Depends on: Tasks 4–10
  - Update `components/dashboard/admin/AdminDashboard.tsx`:
    - Extend `AdminTab` type with: `'walkin' | 'walkin-report' | 'courier' | 'courier-report' | 'eng-parts' | 'pending-list'`
    - Add 6 sidebar buttons
    - Add 6 conditional renders in dashboard-content
  - Update `components/dashboard/work-controller/WorkControllerDashboard.tsx`:
    - Extend type with: `'walkin' | 'courier' | 'pending-list'`
    - Add 3 sidebar buttons + renders
  - Update `components/dashboard/engineer/EngineerDashboard.tsx`:
    - Extend type with: `'my-calls' | 'eng-parts'`
    - Add 2 sidebar buttons
    - Render `MyCallsScreen` and `EngPartsScreen` with `isEngineerView={true}`

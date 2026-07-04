# Design Document: Missing CRM Screens (Phase 1)

## Overview

This document covers the technical design for porting 7 missing screens from the reference HTML CRM into the Next.js application. All new code follows the established project conventions: `'use client'` components, custom hooks in `hooks/`, service functions in `services/`, TypeScript types in `types/`, inline styles for component-specific styling, and the `supabase` client from `lib/supabase.ts`.

---

## File Structure

```
components/screens/
  WalkInScreen.tsx
  WalkInReportScreen.tsx
  CourierScreen.tsx
  CourierReportScreen.tsx
  EngPartsScreen.tsx
  PendingListScreen.tsx
  MyCallsScreen.tsx
  walkin/
    TokenBoard.tsx
    WalkInForm.tsx
    WalkInList.tsx
  courier/
    CourierInwardForm.tsx
    CourierOutwardForm.tsx
    CourierList.tsx
    ReceiversTab.tsx
  eng-parts/
    EngPartsAdmin.tsx
    EngPartsEngineer.tsx
    IssueModal.tsx
    UseModal.tsx
    ReturnModal.tsx

hooks/
  useWalkIn.ts
  useCourier.ts
  useEngParts.ts
  usePendingList.ts
  useMyCalls.ts

services/
  walkInService.ts
  courierService.ts
  engPartsService.ts
  myCallsService.ts

types/
  walkin.ts
  courier.ts
  engParts.ts
  myCalls.ts
```

---

## Data Models

### `types/walkin.ts`
```ts
export interface WalkInProduct {
  type: 'Inward' | 'Outward' | 'For Checking Only';
  brand: string;
  model: string;
  serial: string;
  problem: string;
}

export interface WalkInEntry {
  id: string;
  token_no: number;
  customer_name: string;
  mobile: string;
  visit_date: string;       // YYYY-MM-DD
  arrival_time: string;     // HH:MM
  departure_time?: string;
  wc_id: string;
  wc_name: string;
  products: WalkInProduct[];
  created_at: string;
}
```

### `types/courier.ts`
```ts
export interface CourierReceiver {
  id: string;
  name: string;
  address: string;
  mobile: string;
}

export interface CourierEntry {
  id: string;
  entry_date: string;
  type: 'Inward' | 'Outward';
  awb_no: string;
  agency: string;
  sender_name?: string;
  from_place?: string;
  to_place?: string;
  receiver_id?: string;
  weight?: number;
  description?: string;
  status: 'pending' | 'received' | 'dispatched';
  wc_id: string;
  wc_name: string;
  created_at: string;
}
```

### `types/engParts.ts`
```ts
export interface EngStock {
  id: string;
  owner: string;       // engineer name
  part_id: string;     // FK → inventory.id
  qty: number;
}

export interface EngStockLog {
  id: string;
  action: 'Issue' | 'Use' | 'Return' | 'Warranty Return' | 'Direct Warranty Issue' | 'Request' | 'Adjust';
  part_id: string;
  eng_name: string;
  qty: number;
  ticket_id?: string;
  note?: string;
  status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
```

### `types/myCalls.ts`
```ts
export interface WorkLog {
  id: string;
  eng_id: string;
  eng_name: string;
  member_role: string;
  log_date: string;
  from_time: string;
  to_time: string;
  task_description: string;
  log_type?: string;
  created_at: string;
}

export interface PunchLog {
  id: string;
  eng_id: string;
  eng_name: string;
  log_date: string;
  punch_in_time?: string;
  start_meter?: number;
  punch_out_time?: string;
  end_meter?: number;
  notes?: string;
  created_at: string;
}
```

---

## Component Design

### WalkInScreen

**State:**
- `todayLogs: WalkInEntry[]`
- `loading: boolean`
- `nowServing: number` — stored in `localStorage` key `wi_serving_token_<date>`
- `modalOpen: boolean`
- `editEntry: WalkInEntry | null`

**Data flow:** `useWalkIn` hook → fetches `walkin_log` filtered by date + role → `WalkInScreen` renders `TokenBoard`, `WalkInList`, opens `WalkInForm` modal on add/edit.

**Token board:** reads `localStorage` for current token, increments on "Call Next", shows entry name.

---

### CourierScreen

**State:** `activeTab: 'inward' | 'outward' | 'receivers'`, `entries: CourierEntry[]`, `receivers: CourierReceiver[]`

**Data flow:** `useCourier` hook → provides entries (last 30 days) + receivers list → tab components render forms + `CourierList`.

---

### EngPartsScreen

**Props:** `isEngineerView?: boolean`

**State:** `activeTab`, `inventory: InventoryItem[]`, `engStock: EngStock[]`, `engStockLog: EngStockLog[]`

**Data flow:** `useEngParts` hook → admin sees all tabs; engineer (via `isEngineerView` prop or `roleType`) sees My Requests + Self Service.

**Admin action modals:** `IssueModal`, `UseModal`, `ReturnModal` — each writes to `eng_stock_log` and updates `eng_stock`.

---

### PendingListScreen

**State:** `tickets`, `engineers`, `filters: { wcType, serviceType, brand, search }`, `loading`

**Data flow:** `usePendingList` hook → fetches all open tickets + engineers list → inline dropdowns call `updateTicket` directly → optimistic row refresh on success.

**Sections:** "Ready for Pickup" (Repaired) at top, remaining open tickets below.

---

### MyCallsScreen

**State:** `punchLog: PunchLog | null`, `workLogs: WorkLog[]`, `myTickets`, `myTasks`, `loading`

**Data flow:** `useMyCalls` hook → parallel fetches punch_logs (today), work_logs (today), tickets (assigned), tasks (assigned) → renders punch bar + route + work log form + today's log list.

**Time slots:** generated client-side `07:00` to `21:30` in 30-min steps.

**WhatsApp share:** builds `wa.me/?text=...` URL with encoded daily summary.

---

## Dashboard Updates

### AdminDashboard tab type extension

```ts
type AdminTab = 'overview' | 'tickets' | 'inventory' | 'tasks' | 'customers' |
  'reports' | 'worklogs' | 'master' | 'users' | 'settings' |
  'walkin' | 'walkin-report' | 'courier' | 'courier-report' | 'eng-parts' | 'pending-list';
```

New sidebar items added: Walk-in, Walk-in Report, Courier, Courier Report, Eng. Parts, Pending List.

### WorkControllerDashboard tab type extension

```ts
type WorkControllerTab = 'tasks' | 'tickets' | 'customers' | 'reports' |
  'walkin' | 'courier' | 'pending-list';
```

### EngineerDashboard tab type extension

```ts
type EngineerTab = 'tasks' | 'tickets' | 'reports' | 'my-calls' | 'eng-parts';
```

`EngPartsScreen` rendered with `isEngineerView={true}` from engineer dashboard.

---

## Styling

- All new screens use inline styles matching the pattern in `ticketsStyles.ts` and existing screens
- Reuse CSS class names from `dashboard.css`: `.card`, `.btn`, `.btn-primary`, `.tabs`, `.tab`, `.badge-*`
- Badge colors from existing system: open=blue, closed=green, pending=red, hold=purple
- KPI cards follow `kpi-card` class pattern
- Modal overlay pattern from `TicketsScreen` (fixed overlay + centered modal box)

---

## Key Technical Decisions

1. **Token state** — stored in `localStorage` keyed by `wi_serving_token_<YYYY-MM-DD>`. No DB column needed. Resets daily.
2. **Punch state** — stored in `punch_logs` table. On mount, query today's row; if `punch_in_time` exists and `punch_out_time` is null → punched in.
3. **Time slots** — generated client-side array `['07:00', '07:30', ..., '21:30']`.
4. **Excel export** — all exports use `xlsx` package, following pattern from `utils/workLogExcel.ts`.
5. **Role detection** — `useSession` → `session.user.roleType`. EngParts also accepts `isEngineerView` prop.
6. **Inline status/engineer update** in PendingList — calls `supabase.from('tickets').update(...)` directly (or via `ticketService`) on dropdown change, refreshes only that row.
7. **products field** in walkin_log — stored as JSONB. Serialized/deserialized with `JSON.stringify/parse`.

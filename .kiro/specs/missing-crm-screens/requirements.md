# Requirements Document

## Introduction

This feature ports seven missing screens from a reference vanilla HTML/JS CRM into the existing Next.js 16 / React 19 / Supabase / TailwindCSS v4 application at `bhavi`. The screens cover walk-in customer registration, courier management, engineer parts stock, a pending-ticket list, and an engineer daily-calls view. Each screen must match the project's established conventions: `'use client'` components, custom hooks in `hooks/`, service functions returning `{ success, error, data }`, inline styles for component-specific styling, CSS classes from `dashboard.css` for layout, `useSession` from `next-auth/react` for role/user info, and no new npm packages beyond those already installed.

The six new screens (plus their report variants) are:
1. Walk-in Register (`WalkInScreen`)
2. Walk-in Report (`WalkInReportScreen`)
3. Courier Register (`CourierScreen`)
4. Courier Report (`CourierReportScreen`)
5. Engineer Parts Stock (`EngPartsScreen`)
6. Pending List (`PendingListScreen`)
7. My Calls — Engineer View (`MyCallsScreen`)

After all screens are implemented, each role-based dashboard (`AdminDashboard`, `WorkControllerDashboard`, `EngineerDashboard`) must be updated to expose them through the existing sidebar navigation.

---

## Glossary

- **WalkIn_Register**: The `WalkInScreen` component and its sub-components under `components/screens/walkin/`.
- **WalkIn_Report**: The `WalkInReportScreen` component.
- **Courier_Register**: The `CourierScreen` component and its sub-components under `components/screens/courier/`.
- **Courier_Report**: The `CourierReportScreen` component.
- **EngParts_Screen**: The `EngPartsScreen` component and its sub-components under `components/screens/eng-parts/`.
- **PendingList_Screen**: The `PendingListScreen` component.
- **MyCalls_Screen**: The `MyCallsScreen` component.
- **Admin_Dashboard**: `components/dashboard/admin/AdminDashboard.tsx`.
- **WC_Dashboard**: `components/dashboard/work-controller/WorkControllerDashboard.tsx`.
- **Engineer_Dashboard**: `components/dashboard/engineer/EngineerDashboard.tsx`.
- **Token_Board**: The "Now Serving" display and queue panel within `WalkIn_Register`.
- **walkin_log**: Supabase table with columns: `id`, `token_no`, `customer_name`, `mobile`, `visit_date`, `arrival_time`, `departure_time`, `wc_id`, `wc_name`, `products` (JSON array).
- **courier_log**: Supabase table with columns: `id`, `entry_date`, `type`, `awb_no`, `agency`, `sender_name`, `from_place`, `to_place`, `receiver_id`, `weight`, `description`, `status`, `wc_id`, `wc_name`, `created_at`.
- **courier_receivers**: Supabase table with columns: `id`, `name`, `address`, `mobile`.
- **eng_stock**: Supabase table with columns: `id`, `owner`, `part_id`, `qty`.
- **eng_stock_log**: Supabase table with columns: `id`, `action`, `part_id`, `eng_name`, `qty`, `ticket_id`, `note`, `created_at`.
- **work_logs**: Supabase table with columns: `id`, `eng_id`, `eng_name`, `member_role`, `log_date`, `from_time`, `to_time`, `task_description`, `log_type`, `created_at`.
- **punch_logs**: Supabase table with columns: `id`, `eng_id`, `eng_name`, `log_date`, `punch_in_time`, `start_meter`, `punch_out_time`, `end_meter`, `notes`, `created_at`.
- **Open_Ticket**: A ticket whose `status` is not one of: `Closed`, `Rejected`, `Cancelled`, `Delivered`, `Repaired`, `Call Cancel`.
- **Session_User**: The shape `{ id, name, roleType: 'admin' | 'work_controller' | 'engineer', eng_id, user_id }` returned by `useSession` from `next-auth/react`.
- **Service_Result**: The return shape `{ success: boolean, error?: string, data?: any }` used by all service functions.
- **xlsx**: The already-installed `xlsx` npm package used for Excel export.

---

## Requirements

### Requirement 1: Walk-in Register — Token Board

**User Story:** As a work controller or admin, I want to see a live "Now Serving" token board for today's walk-in queue, so that customers know when they are being called.

#### Acceptance Criteria

1. WHEN the `WalkIn_Register` screen is rendered, THE `Token_Board` SHALL display the token number and customer name of the walk-in entry currently being served.
2. WHEN the admin or work controller clicks "Call Next", THE `WalkIn_Register` SHALL increment the currently-served token to the next entry in today's `walkin_log` ordered by `token_no` ascending.
3. WHEN there are no further entries in today's queue, THE `WalkIn_Register` SHALL display only a "No more entries" message in the `Token_Board`; THE `WalkIn_Register` SHALL NOT display the last-served token alongside this message.
4. THE `WalkIn_Register` SHALL display a list of all walk-in entries for today's date, showing `token_no`, `customer_name`, `mobile`, `arrival_time`, and `products` count for each row.
5. WHILE the `Session_User` has `roleType` equal to `'work_controller'`, THE `WalkIn_Register` SHALL display only those `walkin_log` entries where `wc_id` matches `Session_User.id`.
6. WHILE the `Session_User` has `roleType` equal to `'admin'`, THE `WalkIn_Register` SHALL display all `walkin_log` entries for today.

---

### Requirement 2: Walk-in Register — New Entry Form

**User Story:** As a work controller or admin, I want to register a new walk-in customer with an auto-generated token, so that the queue is tracked accurately.

#### Acceptance Criteria

1. WHEN the user opens the new walk-in entry form, THE `WalkIn_Register` SHALL auto-populate `token_no` with the next available token number for today (maximum existing `token_no` for today plus one, starting at 1 if none exist).
2. WHEN the user submits the walk-in entry form with `customer_name` and `mobile` provided, THE `WalkIn_Register` SHALL insert a new row into `walkin_log` with the current date as `visit_date`, the current time as `arrival_time`, and `wc_id` / `wc_name` set from `Session_User`.
3. IF `customer_name` or `mobile` is empty when the form is submitted, THEN THE `WalkIn_Register` SHALL display a validation error and SHALL NOT insert into `walkin_log`.
4. THE `WalkIn_Register` SHALL allow the user to add one or more products to a walk-in entry, where each product has `type` (one of `Inward`, `Outward`, `For Checking Only`), `brand`, `model`, `serial`, and `problem` fields.
5. WHEN a walk-in entry is successfully saved, THE `WalkIn_Register` SHALL refresh the today's walk-in list and token board without a full page reload.
6. THE `WalkIn_Register` SHALL allow the user to edit the fields of an existing `walkin_log` entry and save the changes back to Supabase.
7. THE `WalkIn_Register` SHALL allow the user to delete an existing `walkin_log` entry after confirmation.

---

### Requirement 3: Walk-in Report

**User Story:** As an admin, I want to filter and export walk-in log entries by date range and search term, so that I can review historical walk-in traffic.

#### Acceptance Criteria

1. WHEN the `WalkIn_Report` screen is rendered, THE `WalkIn_Report` SHALL display a date-range filter (from date, to date) and a text search input.
2. WHEN the user applies filters, THE `WalkIn_Report` SHALL query `walkin_log` and display all entries where `visit_date` falls within the selected range and where `customer_name` or `mobile` matches the search term (case-insensitive partial match).
3. THE `WalkIn_Report` SHALL display results in a table with columns: `token_no`, `visit_date`, `customer_name`, `mobile`, `arrival_time`, `departure_time`, `wc_name`, and products count.
4. WHEN the user clicks the Excel export button, THE `WalkIn_Report` SHALL generate and download an `.xlsx` file containing all currently filtered results using the `xlsx` package.

---

### Requirement 4: Courier Register — Inward / Outward Tabs

**User Story:** As a work controller or admin, I want to log incoming and outgoing courier packages, so that courier movement is tracked.

#### Acceptance Criteria

1. THE `Courier_Register` SHALL display three tabs: "Inward", "Outward", and "Receivers".
2. WHEN the user is on the "Inward" tab and submits the form with `awb_no` and `agency` provided, THE `Courier_Register` SHALL insert a new row into `courier_log` with `type` set to `'Inward'`, `entry_date` set to the current date, and `wc_id` / `wc_name` set from `Session_User`.
3. WHEN the user is on the "Outward" tab and submits the form with `awb_no`, `agency`, and a selected receiver provided, THE `Courier_Register` SHALL insert a new row into `courier_log` with `type` set to `'Outward'` and `receiver_id` set to the selected receiver's id.
4. IF `awb_no` or `agency` is empty when the Inward or Outward form is submitted, THEN THE `Courier_Register` SHALL display a validation error and SHALL NOT insert into `courier_log`; validation errors SHALL be suppressed until the user first attempts to submit the form.
5. THE `Courier_Register` SHALL display the last 30 days of `courier_log` entries in a table showing `entry_date`, `type`, `awb_no`, `agency`, `sender_name` or receiver name, `weight`, and `status`.
6. WHEN the user changes the `status` of a `courier_log` entry inline (to one of `received`, `dispatched`, `pending`), THE `Courier_Register` SHALL update the `status` column in Supabase immediately regardless of which user or session originally created the entry.

---

### Requirement 5: Courier Register — Receivers Management

**User Story:** As a work controller or admin, I want to maintain a list of regular courier receivers, so that I can select them quickly when logging outward shipments.

#### Acceptance Criteria

1. WHEN the user navigates to the "Receivers" tab, THE `Courier_Register` SHALL display all rows from `courier_receivers` in a table showing `name`, `address`, and `mobile`.
2. WHEN the user submits the add-receiver form with `name` provided, THE `Courier_Register` SHALL insert a new row into `courier_receivers`.
3. IF `name` is empty when the add-receiver form is submitted, THEN THE `Courier_Register` SHALL display a validation error and SHALL NOT insert into `courier_receivers`; validation errors SHALL be suppressed until the user first attempts to submit the form.
4. THE `Courier_Register` SHALL allow the user to edit an existing receiver row and save changes to `courier_receivers`.
5. THE `Courier_Register` SHALL allow the user to delete a receiver row after confirmation.

---

### Requirement 6: Courier Report

**User Story:** As an admin, I want to filter and export courier log entries by date range and type, so that I can review courier history.

#### Acceptance Criteria

1. THE `Courier_Report` SHALL display a date-range filter and a type filter (All / Inward / Outward).
2. WHEN the user applies filters, THE `Courier_Report` SHALL query `courier_log` and display all entries matching the date range and selected type; IF the query fails or times out, THE `Courier_Report` SHALL display an error message and SHALL NOT display partial or stale results.
3. THE `Courier_Report` SHALL display results in a table with columns: `entry_date`, `type`, `awb_no`, `agency`, `sender_name`, `from_place`, `to_place`, receiver name, `weight`, `description`, `status`, `wc_name`.
4. WHEN the user clicks the Excel export button and file generation succeeds, THE `Courier_Report` SHALL download the `.xlsx` file; IF file generation fails, THE `Courier_Report` SHALL display an error message and SHALL NOT trigger a download.

---

### Requirement 7: Engineer Parts Stock — Admin View

**User Story:** As an admin, I want to view and manage engineer parts stock across the entire team, so that I can track inventory distribution and approve part requests.

#### Acceptance Criteria

1. THE `EngParts_Screen` SHALL display four tabs for the admin role: "Stock Overview", "Engineer Analysis", "Pending Approvals", and "Log".
2. WHEN the admin navigates to "Stock Overview", THE `EngParts_Screen` SHALL display a searchable table of all `inventory` parts with a per-engineer stock breakdown derived from `eng_stock`.
3. WHEN the admin navigates to "Engineer Analysis", THE `EngParts_Screen` SHALL display a card grid showing each engineer's name and total stock value (sum of `qty × unit_price` from `eng_stock` joined with `inventory`).
4. WHEN the admin navigates to "Pending Approvals", THE `EngParts_Screen` SHALL display all `eng_stock_log` entries where `action` is `'Request'` and status is pending, allowing the admin to approve or reject each.
5. WHEN the admin navigates to "Log", THE `EngParts_Screen` SHALL display all rows from `eng_stock_log` ordered by `created_at` descending.
6. THE `EngParts_Screen` SHALL provide action buttons for: Issue to Engineer, Record Usage, Warranty Return, Direct Warranty Issue, and Engineer Return — each opening a form modal that writes to `eng_stock_log` and updates `eng_stock`.

---

### Requirement 8: Engineer Parts Stock — Engineer View

**User Story:** As an engineer, I want to view my own parts stock and request parts from available inventory, so that I can manage my materials.

#### Acceptance Criteria

1. WHILE the `Session_User` has `roleType` equal to `'engineer'`, THE `EngParts_Screen` SHALL display two tabs: "My Requests" and "Self Service".
2. WHEN the engineer navigates to "My Requests", THE `EngParts_Screen` SHALL display all `eng_stock_log` entries where `eng_name` matches `Session_User.name`, ordered by `created_at` descending.
3. WHEN the engineer navigates to "Self Service", THE `EngParts_Screen` SHALL display available `inventory` parts with current stock quantity and a "Request" button for each.
4. WHEN the engineer submits a part request, THE `EngParts_Screen` SHALL insert a new row into `eng_stock_log` with `action` set to `'Request'` and `eng_name` set from `Session_User`.
5. IF the requested quantity exceeds the available `qty_in_stock` in `inventory`, or IF the requested quantity is zero, or IF `qty_in_stock` is zero, THEN THE `EngParts_Screen` SHALL display an error message and SHALL NOT insert the request.

---

### Requirement 9: Pending List

**User Story:** As an admin or work controller, I want to see all open tickets in one filterable list with quick inline actions, so that I can monitor and progress outstanding work efficiently.

#### Acceptance Criteria

1. WHEN the `PendingList_Screen` is rendered, THE `PendingList_Screen` SHALL load all tickets whose `status` is not in `['Closed', 'Rejected', 'Cancelled', 'Delivered', 'Repaired', 'Call Cancel']`.
2. THE `PendingList_Screen` SHALL display a count badge showing the total number of loaded open tickets.
3. THE `PendingList_Screen` SHALL display a separate "Ready for Pickup" section at the top of the list containing only tickets with `status` equal to `'Repaired'`.
4. THE `PendingList_Screen` SHALL display filter controls for: WC Type (`CSP` / `ICP`), service type (`On Site` / `Carry In`), brand search, and free-text search across ticket ID, customer name, and mobile.
5. THE `PendingList_Screen` SHALL display filtered results in a table with columns: ticket ID, date, customer name, mobile, brand/model, area/PIN, status badge, assigned engineer, TAT date, and action buttons.
6. WHEN the user changes the engineer assignment via an inline dropdown for a ticket row and the update service call succeeds, THE `PendingList_Screen` SHALL refresh that row; IF the service call fails or no actual change was made, THE `PendingList_Screen` SHALL NOT refresh the row.
7. WHEN the user changes the status via an inline dropdown for a ticket row and the update service call succeeds, THE `PendingList_Screen` SHALL refresh that row; IF the service call fails or no actual change was made, THE `PendingList_Screen` SHALL NOT refresh the row.
8. WHEN the user clicks the Excel export button, THE `PendingList_Screen` SHALL generate and download an `.xlsx` file of the currently filtered and displayed tickets using the `xlsx` package.

---

### Requirement 10: My Calls — Punch In / Out

**User Story:** As an engineer, I want to punch in and out with meter readings, so that my attendance and travel distance are recorded each day.

#### Acceptance Criteria

1. WHEN the `MyCalls_Screen` is rendered, THE `MyCalls_Screen` SHALL display a punch bar showing whether the engineer is currently punched in or out for today.
2. WHEN the engineer is punched out and clicks "Punch In", THE `MyCalls_Screen` SHALL prompt for `start_meter` and insert a new row into `punch_logs` with `log_date` set to today, `punch_in_time` set to the current time, and `eng_id` / `eng_name` set from `Session_User`.
3. WHEN the engineer is punched in and clicks "Punch Out", THE `MyCalls_Screen` SHALL prompt for `end_meter` and update the existing `punch_logs` row for today with `punch_out_time` and `end_meter`.
4. IF the engineer attempts to punch in when a `punch_logs` row already exists for today with a `punch_in_time` set, THEN THE `MyCalls_Screen` SHALL display an informational message and SHALL NOT insert a duplicate row.

---

### Requirement 11: My Calls — Today's Route and Tasks

**User Story:** As an engineer, I want to see my assigned tickets and tasks for today in one view, so that I can plan my daily route.

#### Acceptance Criteria

1. WHEN the `MyCalls_Screen` is rendered, THE `MyCalls_Screen` SHALL display all tickets assigned to the current engineer (matching `assigned_to` equal to `Session_User.id`) that are not in a closed/cancelled/rejected status, sorted by `sequence_no` ascending.
2. WHEN the `MyCalls_Screen` is rendered, THE `MyCalls_Screen` SHALL display all open tasks assigned to the current engineer, fetched from the `tasks` table.
3. THE `MyCalls_Screen` SHALL display KPI stats: total assigned tickets, active (non-closed) tickets, closed tickets, and total tasks.

---

### Requirement 12: My Calls — Work Log Entry

**User Story:** As an engineer, I want to log my work activities for the day with time slots, so that my daily work is recorded for reporting.

#### Acceptance Criteria

1. THE `MyCalls_Screen` SHALL display a work log entry form with fields: `from_time` (a select of 30-minute time slots from `07:00` to `21:30`), `to_time` (same slots), `task_description`, and `log_type`.
2. WHEN the engineer submits the work log entry form with `from_time`, `to_time`, and `task_description` provided, THE `MyCalls_Screen` SHALL insert a new row into `work_logs` with `log_date` set to today, and `eng_id` / `eng_name` set from `Session_User`.
3. IF `from_time`, `to_time`, or `task_description` is empty when the work log form is submitted, THEN THE `MyCalls_Screen` SHALL display a validation error and SHALL NOT insert into `work_logs`.
4. THE `MyCalls_Screen` SHALL display today's work log entries in a list, showing `from_time`, `to_time`, `task_description`, and `log_type` for each entry.
5. WHEN the engineer confirms a deletion prompt, THE `MyCalls_Screen` SHALL delete the selected work log entry; THE `MyCalls_Screen` SHALL NOT delete the entry unless the engineer explicitly confirms.
6. WHEN the engineer clicks the WhatsApp share button, THE `MyCalls_Screen` SHALL open a `wa.me` URL pre-filled with a text summary of today's work log entries, punch times, and ticket count.

---

### Requirement 13: Dashboard Integration — Admin

**User Story:** As an admin, I want all new screens accessible from my dashboard sidebar, so that I can navigate to them without leaving the app.

#### Acceptance Criteria

1. THE `Admin_Dashboard` SHALL add sidebar navigation items for: Walk-in, Walk-in Report, Courier, Courier Report, Eng. Parts, and Pending List.
2. WHEN the admin clicks any of the new sidebar items and that item is not already active, THE `Admin_Dashboard` SHALL render the corresponding screen component in the dashboard content area, replacing the previously visible content; WHEN the admin clicks an already-active sidebar item, THE `Admin_Dashboard` SHALL leave the current screen unchanged.
3. THE `Admin_Dashboard` SHALL preserve all existing sidebar navigation items and their behaviour unchanged.

---

### Requirement 14: Dashboard Integration — Work Controller

**User Story:** As a work controller, I want Walk-in Entry, Courier Entry, and Pending List accessible from my dashboard, so that I can manage daily operations from one place.

#### Acceptance Criteria

1. THE `WC_Dashboard` SHALL add sidebar navigation items for: Walk-in Entry, Courier Entry, and Pending List.
2. WHEN the work controller clicks any of the new sidebar items, THE `WC_Dashboard` SHALL render the corresponding screen component in the dashboard content area; IF rendering fails, THE `WC_Dashboard` SHALL display an error message or fallback content.
3. THE `WC_Dashboard` SHALL preserve all existing sidebar navigation items and their behaviour unchanged.

---

### Requirement 15: Dashboard Integration — Engineer

**User Story:** As an engineer, I want My Calls and Eng. Parts (self-service view) accessible from my dashboard, so that I can manage my daily calls and part requests in one place.

#### Acceptance Criteria

1. THE `Engineer_Dashboard` SHALL add sidebar navigation items for: My Calls and Eng. Parts.
2. WHEN the engineer clicks "My Calls", THE `Engineer_Dashboard` SHALL render the `MyCalls_Screen` component in the dashboard content area.
3. WHEN the engineer clicks "Eng. Parts", THE `Engineer_Dashboard` SHALL render the `EngParts_Screen` component in engineer-role view (tabs: My Requests, Self Service); the engineer-role view SHALL be displayed only when the screen is accessed via the "Eng. Parts" sidebar item in the `Engineer_Dashboard`, not based solely on `Session_User.roleType`.
4. THE `Engineer_Dashboard` SHALL preserve all existing sidebar navigation items and their behaviour unchanged.

---

### Requirement 16: Coding Conventions and Constraints

**User Story:** As a developer, I want all new components to follow established project conventions, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE `WalkIn_Register` SHALL be implemented as `components/screens/WalkInScreen.tsx` with sub-components in `components/screens/walkin/`, a hook in `hooks/useWalkIn.ts`, and a service in `services/walkInService.ts`.
2. THE `WalkIn_Report` SHALL be implemented as `components/screens/WalkInReportScreen.tsx`.
3. THE `Courier_Register` SHALL be implemented as `components/screens/CourierScreen.tsx` with sub-components in `components/screens/courier/`, a hook in `hooks/useCourier.ts`, and a service in `services/courierService.ts`.
4. THE `Courier_Report` SHALL be implemented as `components/screens/CourierReportScreen.tsx`.
5. THE `EngParts_Screen` SHALL be implemented as `components/screens/EngPartsScreen.tsx` with sub-components in `components/screens/eng-parts/`, a hook in `hooks/useEngParts.ts`, and a service in `services/engPartsService.ts`.
6. THE `PendingList_Screen` SHALL be implemented as `components/screens/PendingListScreen.tsx` with a hook in `hooks/usePendingList.ts`.
7. THE `MyCalls_Screen` SHALL be implemented as `components/screens/MyCallsScreen.tsx` with a hook in `hooks/useMyCalls.ts` and a service in `services/myCallsService.ts`.
8. THE System SHALL place `'use client'` as the first line of every new screen and sub-component file.
9. THE System SHALL use the `supabase` client exported from `lib/supabase.ts` for all direct Supabase queries; no new Supabase client instances SHALL be created.
10. THE System SHALL NOT introduce any npm packages not already present in `package.json`.
11. THE System SHALL use `useSession` from `next-auth/react` to obtain `Session_User` in every component that requires role or identity information.
12. WHERE a new TypeScript type file is needed, THE System SHALL create it in the `types/` directory following the patterns established in `types/tickets.ts` and `types/tasks.ts`.

# Remaining Screens and Parity Gaps

This document lists the reference-repo screens that are still not fully matched in the Next.js app, plus the screens that exist but are currently simplified or shell-only.

## Status Legend

- `DONE` - matching route/screen exists and is functionally implemented.
- `PARTIAL` - route/screen exists, but behavior is simplified or not 1:1 with the reference repo.
- `MISSING` - no matching route/screen was present before this pass.

## Current Remaining Gaps

### Public / Customer Flow

These screens now exist as routes, but they are still simplified compared with the legacy HTML flow.

| Reference screen              | Current route / component                                                                   | Status  | What is still left                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| Home / Services / Shop / Cart | [components/screens/PublicHomeScreen.tsx](../components/screens/PublicHomeScreen.tsx)       | PARTIAL | Shop/cart is simplified and does not fully mirror the legacy cart drawer and product-order flow. |
| Service Details               | [app/service-request/page.tsx](../app/service-request/page.tsx)                             | PARTIAL | The full legacy step-by-step service wizard is not fully reproduced.                             |
| Repair Type                   | [app/service-request/repair-type/page.tsx](../app/service-request/repair-type/page.tsx)     | PARTIAL | Legacy cards and transitions are not implemented 1:1.                                            |
| Terms & Conditions            | [app/service-request/terms/page.tsx](../app/service-request/terms/page.tsx)                 | PARTIAL | The full terms copy and confirmation behavior are simplified.                                    |
| Warranty Status               | [app/service-request/warranty/page.tsx](../app/service-request/warranty/page.tsx)           | PARTIAL | The original warranty branching logic is not fully ported.                                       |
| Warranty Info                 | [app/service-request/warranty-info/page.tsx](../app/service-request/warranty-info/page.tsx) | PARTIAL | Canon support handoff is only a placeholder route.                                               |
| Product Details               | [app/service-request/product/page.tsx](../app/service-request/product/page.tsx)             | PARTIAL | Signature/photo/serial behavior is simplified.                                                   |
| Inquiry Form                  | [app/service-request/inquiry/page.tsx](../app/service-request/inquiry/page.tsx)             | PARTIAL | The full inquiry-specific form logic is not implemented.                                         |
| Signature                     | [app/service-request/signature/page.tsx](../app/service-request/signature/page.tsx)         | PARTIAL | No real signature capture is wired yet.                                                          |
| Delivery                      | [app/service-request/delivery/page.tsx](../app/service-request/delivery/page.tsx)           | PARTIAL | The outward collection branch is only surfaced as a route.                                       |
| Complete Order                | [app/service-request/order/page.tsx](../app/service-request/order/page.tsx)                 | PARTIAL | Checkout/order submission logic is not fully recreated.                                          |
| Order Success                 | [app/service-request/order-success/page.tsx](../app/service-request/order-success/page.tsx) | PARTIAL | This is a success shell rather than a full order result flow.                                    |
| Customer Check-in             | [components/screens/PublicWalkInScreen.tsx](../components/screens/PublicWalkInScreen.tsx)   | PARTIAL | The multi-step walk-in wizard is simplified versus the legacy HTML.                              |
| My Account                    | [app/account/page.tsx](../app/account/page.tsx)                                             | PARTIAL | The self-service account dashboard is a placeholder surface.                                     |
| My Orders                     | [app/my-orders/page.tsx](../app/my-orders/page.tsx)                                         | PARTIAL | Order tracking is not fully implemented.                                                         |

### Admin / Operations Screens

These screens are now visible in the dashboard or as routes, but most are shell-level placeholders rather than full data-backed ports.

| Reference screen | Current route / component                                             | Status  | What is still left                                                 |
| ---------------- | --------------------------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| Live Map         | [app/live-map/page.tsx](../app/live-map/page.tsx)                     | PARTIAL | No live geospatial tracking or map integration yet.                |
| Attendance       | [app/attendance/page.tsx](../app/attendance/page.tsx)                 | PARTIAL | Attendance views are not data-backed yet.                          |
| Targets          | [app/targets/page.tsx](../app/targets/page.tsx)                       | PARTIAL | No target management logic yet.                                    |
| AMC              | [app/amc/page.tsx](../app/amc/page.tsx)                               | PARTIAL | AMC management is not fully ported.                                |
| Feedback         | [app/feedback/page.tsx](../app/feedback/page.tsx)                     | PARTIAL | Feedback capture/review is not wired to a dedicated dataset.       |
| Profit           | [app/profit/page.tsx](../app/profit/page.tsx)                         | PARTIAL | Profit calculations are not implemented.                           |
| Weekly Report    | [app/weekly-report/page.tsx](../app/weekly-report/page.tsx)           | PARTIAL | Weekly aggregation/reporting is still a shell.                     |
| Sales            | [app/sales/page.tsx](../app/sales/page.tsx)                           | PARTIAL | Sales reporting is not fully implemented.                          |
| Parts Catalog    | [app/parts-catalog/page.tsx](../app/parts-catalog/page.tsx)           | PARTIAL | Catalog browsing is only loosely covered by inventory/master data. |
| Fault Finder     | [app/fault-finder/page.tsx](../app/fault-finder/page.tsx)             | PARTIAL | No diagnostic engine or lookup rules yet.                          |
| Route Planning   | [app/route-planning/page.tsx](../app/route-planning/page.tsx)         | PARTIAL | Route optimization/planning is not implemented.                    |
| Inquiries        | [app/inquiries/page.tsx](../app/inquiries/page.tsx)                   | PARTIAL | Inquiry queue/listing is not wired to a dataset.                   |
| Auto Inventory   | [app/auto-inventory/page.tsx](../app/auto-inventory/page.tsx)         | PARTIAL | Automation outputs are not present.                                |
| Auto Sites       | [app/auto-sites/page.tsx](../app/auto-sites/page.tsx)                 | PARTIAL | Automation outputs are not present.                                |
| Visit Report     | [app/auto-visits-report/page.tsx](../app/auto-visits-report/page.tsx) | PARTIAL | Visit analytics are not present.                                   |
| Virtual AI Agent | [app/ai-agent/page.tsx](../app/ai-agent/page.tsx)                     | PARTIAL | No agent runtime or prompt tooling yet.                            |
| AI Analysis      | [app/ai-analysis/page.tsx](../app/ai-analysis/page.tsx)               | PARTIAL | No AI analysis backend yet.                                        |

### Legacy Modal / Workflow Surfaces

These were modal or inline workflows in the reference app. They are now represented as routes, but not full interactive clones.

| Reference workflow | Current route / component                                           | Status  | What is still left                              |
| ------------------ | ------------------------------------------------------------------- | ------- | ----------------------------------------------- |
| Report Edit        | [app/report-edit/page.tsx](../app/report-edit/page.tsx)             | PARTIAL | Approval/edit state machine is not implemented. |
| Customer Approval  | [app/customer-approval/page.tsx](../app/customer-approval/page.tsx) | PARTIAL | Estimate approval logic is not implemented.     |
| Engineer Update    | [app/engineer-update/page.tsx](../app/engineer-update/page.tsx)     | PARTIAL | Technician update workflow is not implemented.  |
| Part Request       | [app/part-request/page.tsx](../app/part-request/page.tsx)           | PARTIAL | Part-request modal logic is not implemented.    |

## What Is Fully Visible Now

These screens are already present and no longer need route exposure work:

- Dashboard
- Tickets
- Pending List
- Inventory
- Eng. Parts
- Tasks
- Customers
- Reports
- Work Logs
- Engineers
- Master Data
- Settings
- Walk-in Report
- Courier
- Courier Report

## Summary

The biggest remaining work is not route creation anymore. It is full behavioral parity for the public service wizard, the public walk-in wizard, and the admin utility/workflow pages that are currently shell-only.

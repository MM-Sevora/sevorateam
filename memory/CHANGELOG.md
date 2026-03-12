# Sevora Internal Tools - Changelog

## March 12, 2026

### Payment Requests Module Redesign
- Converted to sortable/filterable table view
- Added 15 payment categories: Rent, Utilities, Payroll, Tools, Reimbursement, Software, Services, Travel, Supplies, Training, Insurance, Telecom, Maintenance, Vendor, Other
- New form fields: Payment Method, Account Details, Department, Reference Number
- Added View Details dialog with action buttons
- Stats cards: Pending, Approved, Processing, Completed, This Month

### VMS Data Fixes
- Fixed old Work Orders missing `order_type` field (8 one-time, 7 recurring)
- Fixed old Vendors missing `vendor_type` field (all set to "vendor")

### VMS Recurring Work Improvements
- Added "Generate Work Order" button to recurring schedules
- Fixed status filtering (All, Active, Paused, Overdue)
- Fixed executions count column
- Work orders generated from recurring now have `order_type: "recurring"`

### Work Orders Enhancements
- Added Payment Status column (Paid/Partial/Pending/No Payments)
- Added Vendor Type filter to New Work Order dialog

### Backend Fixes
- Fixed `ProposalCreate` model (removed redundant `requirement_id`)
- Updated `PaymentRequestCreate` model with new fields

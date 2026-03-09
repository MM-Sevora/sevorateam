# Microsoft Graph API Email Setup Guide

This guide helps you configure the Microsoft Graph API integration for sending expense claim email notifications.

## Current Status

✅ Email notifications are integrated into the Expense & Reimbursement module
✅ Emails are sent using Microsoft Graph API
✅ Beautiful HTML email templates are implemented

**Note:** The existing Azure credentials in the environment are being used for email sending. If emails are not being delivered, follow this guide to configure proper permissions.

## Azure AD Application Setup

### Step 1: Access Azure Portal

1. Go to https://portal.azure.com
2. Sign in with your organization admin account
3. Navigate to **Azure Active Directory** → **App registrations**

### Step 2: Update Existing App or Create New App

If using the existing app (Client ID: `ec50e216-1abe-4c0f-af5c-1f4d50d51234`):

1. Find the app in your registrations
2. Go to **API permissions**
3. Click **Add a permission** → **Microsoft Graph** → **Application permissions**
4. Search for and add **Mail.Send**
5. Click **Grant admin consent for [Your Organization]**

### Step 3: Configure Mailbox Permissions

For the application to send emails on behalf of a specific mailbox (e.g., `hr@sevora.com`):

1. Open **Exchange Admin Center** (https://admin.exchange.microsoft.com)
2. Go to **Recipients** → **Mailboxes**
3. Select the sender mailbox (e.g., hr@sevora.com)
4. Go to **Delegation** → **Send As**
5. Add the service principal for your Azure AD app

### Step 4: Environment Configuration

Add these environment variables to `/app/backend/.env`:

```
# Microsoft Graph API for Email Notifications
GRAPH_SENDER_EMAIL=hr@sevora.com
HR_NOTIFICATION_EMAIL=hr@sevora.com
```

The existing Azure credentials are already in the .env file:
- AZURE_TENANT_ID
- AZURE_CLIENT_ID
- AZURE_CLIENT_SECRET

## Email Notification Behavior

### When Claims are Submitted
- An email is sent to the HR notification email (configured in `HR_NOTIFICATION_EMAIL`)
- Subject: "New Expense Claim Submitted - {claim_id}"
- Contains: Employee details, claim amount, expense entries

### When Claims are Approved
- An email is sent to the employee who submitted the claim
- Subject: "Your Expense Claim {claim_id} Has Been Approved"
- Contains: Approved amount, HR notes if any

### When Claims are Rejected
- An email is sent to the employee who submitted the claim
- Subject: "Your Expense Claim {claim_id} Requires Attention"
- Contains: Rejection reason, HR notes if any

## Fallback Behavior

If the Microsoft Graph API is not properly configured:
- Email notifications are **logged** but not sent
- In-app notifications still work (via the notifications system)
- Claims can still be submitted and processed

## Troubleshooting

### Emails Not Being Sent

1. Check the backend logs: `tail -f /var/log/supervisor/backend.err.log`
2. Look for "Graph Email Service" messages
3. Verify Azure AD permissions have admin consent

### Common Errors

**403 Forbidden**: The app doesn't have Mail.Send permission or admin consent wasn't granted

**404 Not Found**: The sender email address doesn't exist in your tenant

**401 Unauthorized**: Client credentials are invalid or expired

## Testing

Test the email functionality using curl:

```bash
# Login and get token
TOKEN=$(curl -s -X POST "https://sevora-hub.preview.emergentagent.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@sevora.com","password":"superadmin123"}' | jq -r .access_token)

# Submit a test claim
curl -X POST "https://sevora-hub.preview.emergentagent.com/api/expense/claims" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entries": [{"expense_date_from": "2026-03-01", "category": "travel", "description": "Test", "amount": 100}],
    "declaration_accepted": true
  }'
```

Check the backend logs to see if the email was sent successfully.

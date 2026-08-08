# Circle Pay

# Build a Mobile-First Offline-First Social Finance & Settlement Web App

Build a **mobile-first, responsive Progressive Web App (PWA)** for managing shared expenses, bills, borrowing, lending, and settlements between friends and family.

The app should be inspired by the usefulness of apps like eSewa Circle, but **must NOT be a wallet and must NOT process or hold money**.

The core purpose is:

> **Track who owes whom, why they owe it, and make settling that debt easy by showing the recipient's preferred payment QR code.**

Actual payments happen externally through eSewa, Khalti, bank apps, cash, or other payment methods.

---

# 1. Product Concept

Create a social finance app where users can:

* Create private groups/circles with friends and family.

* Add shared expenses and bills.

* Split expenses equally or using custom amounts.

* Record money they have lent to someone.

* Record money they have borrowed.

* Track who owes whom.

* Request settlement.

* View another person's saved payment QR code.

* Pay externally using that QR.

* Mark the payment as made.

* Require the lender/recipient to confirm the payment.

* Keep a complete history of expenses, debts, repayments, and confirmations.

* Continue using the app even when offline.

The app should feel simple enough for everyday use but have a reliable financial ledger underneath.

---

# 2. Critical Product Principle

This app is **NOT a digital wallet**.

Do NOT implement:

* Wallet balances

* Deposits

* Withdrawals

* Money transfers through the app

* Payment gateway processing

* Holding user funds

* Bank integrations for actual payment processing

Instead, the app manages:

**People → Expenses → Debts → Settlement Requests → Payment Confirmation**

Actual money movement happens outside the app.

---

# 3. Target Users

Primary users:

* Friends

* Families

* Couples

* Roommates

* Travel groups

* Students

* Small informal groups

Typical use cases:

### Restaurant

One person pays the entire restaurant bill and splits it among friends.

### Trip

Multiple people pay for hotels, transport, food, tickets, etc.

### Family

Family members share recurring household expenses.

### Lending

A user lends NPR 5,000 to a friend and records the loan with a due date.

### Borrowing

A user records money borrowed from another person.

### Settlement

Someone owes NPR 1,850 and uses the lender's saved eSewa/Khalti/bank QR to make the payment externally.

---

# 4. Mobile-First UX

Design primarily for mobile phones.

The application must work beautifully at:

* 320px+

* 375px

* 390px

* 414px

* Tablet

* Desktop

Use a responsive layout that feels like a native mobile application on phones while still working naturally on desktop.

On mobile:

* Bottom navigation

* Large touch targets

* Bottom sheets

* Mobile-friendly forms

* Sticky action buttons where appropriate

* Minimal typing

* Clear cards

* Simple navigation

* Fast transitions

On desktop:

* Centered application container

* Maximum readable width

* Optional sidebar/navigation

* Use available space intelligently

Avoid making the mobile UI look like a shrunken desktop dashboard.

---

# 5. Main Navigation

Use a mobile bottom navigation with:

1. Home

2. Circles

3. Activity

4. People

5. Profile

Have a prominent floating/action button for:

**+ Add Expense**

Depending on context, the action button can also expose:

* Add expense

* Record lending

* Record borrowing

* Request money

---

# 6. Authentication

Implement authentication with:

* Email/password

* Optional Google authentication if supported by the stack

Users should have:

* Name

* Username

* Profile photo/avatar

* Email

* Phone number (optional)

* Currency preference

* Time zone

* Notification preferences

Use a unique user ID internally.

Do not use phone numbers as the primary identity.

---

# 7. User Profile

Each user has a profile containing:

### Basic information

* Name

* Username

* Profile photo

* Optional bio

### Payment methods

Allow users to add multiple external payment methods.

Example:

* eSewa

* Khalti

* Bank

* Other

Each payment method should support:

* Provider name

* QR image

* Optional account/display name

* Optional account identifier

* Preferred payment method

* Active/inactive status

Example:

```text

Suman Sharma

Payment Methods

⭐ eSewa

[QR]

Khalti

[QR]

Bank

[QR]

```

The user can set one payment method as **Preferred**.

The QR should be easily viewable/full-screen so another user can scan it.

Allow:

* Upload QR image

* Replace QR

* Delete QR

* Set as preferred

* Preview QR

Do not attempt to process or verify QR payments.

---

# 8. Circles

Users can create private Circles.

Examples:

* Kathmandu Trip

* Family

* Roommates

* College Friends

* Weekend Group

Circle fields:

* Name

* Description

* Cover/avatar

* Created by

* Members

* Created date

Circle members should be able to:

* View expenses

* Add expenses

* View balances

* View settlement history

The creator should be able to:

* Rename circle

* Manage members

* Remove members

* Archive circle

Circles should be private.

---

# 9. Add Expense

Create a fast expense-entry flow.

Fields:

* Expense title

* Amount

* Currency

* Date

* Category

* Paid by

* Participants

* Split method

* Optional notes

* Optional receipt/photo

Categories:

* Food

* Transport

* Accommodation

* Shopping

* Bills

* Entertainment

* Groceries

* Education

* Other

Split methods:

### Equal

Automatically divide the expense equally among selected participants.

### Exact amounts

Allow entering the exact amount owed by each participant.

### Percentage

Allow splitting by percentage.

### Shares

Allow users to assign shares.

Example:

```text

Dinner

NPR 5,000

Paid by:

Suman

Participants:

Suman — 1,000

Ram — 1,000

Sita — 1,000

Hari — 1,000

Gita — 1,000

```

Validate that the split totals equal the expense amount.

---

# 10. Personal Lending

Users should be able to record money they personally lend to someone.

Example:

```text

Lent to Ram

NPR 5,000

Date:

Aug 8, 2026

Due date:

Aug 20, 2026

Note:

Emergency loan

```

Status:

* Active

* Partially repaid

* Payment pending

* Settled

* Overdue

Support partial repayments.

Example:

```text

Loan: NPR 5,000

Paid back:

NPR 2,000

Remaining:

NPR 3,000

```

---

# 11. Personal Borrowing

Users should also be able to record money they borrowed from another person.

Example:

```text

Borrowed from Suman

NPR 3,000

Due:

Aug 20

Purpose:

Travel

```

The system should automatically understand the relationship:

**Borrower → Lender → Amount**

---

# 12. Unified Debt Ledger

This is one of the most important parts of the application.

Every financial relationship should eventually resolve into a ledger of:

```text

Person A owes Person B

Amount

Reason

Date

Status

```

The system must maintain accurate balances.

Example:

```text

You owe Suman       NPR 1,850

Ram owes you        NPR 2,500

You owe Sita        NPR 500

```

Calculate net balances carefully.

Do not mutate or delete historical transactions simply to change a balance.

Use a ledger/event-based approach wherever practical.

---

# 13. Settle Up

Create a prominent **Settle Up** action.

When a user owes another user:

```text

You owe Suman

NPR 1,850

[ Settle Now ]

```

When the user taps **Settle Now**, show:

### Step 1 — Payment information

```text

Suman's preferred payment method

eSewa

[ View QR ]

```

Also show:

```text

Other payment methods

Khalti

Bank

```

Allow the borrower to open the QR full-screen.

The user then pays externally.

---

# 14. Critical Settlement Confirmation Workflow

This workflow must be implemented exactly.

The borrower must NOT be able to immediately mark the debt as settled.

### Step 1

Borrower views:

```text

You owe Suman

NPR 1,850

[ Settle Now ]

```

### Step 2

Borrower views Suman's payment QR.

They pay externally.

### Step 3

Borrower taps:

**Mark as Paid**

This does NOT mark the transaction as settled.

It changes the status to:

**PAYMENT_PENDING**

### Step 4

The lender receives a notification:

```text

Ram says they paid you NPR 1,850.

[ Confirm Payment ]

[ Reject ]

```

### Step 5

Only when the lender confirms does the transaction become:

**SETTLED**

The borrower sees:

```text

Payment submitted

Waiting for Suman to confirm.

```

### State machine

Implement settlement states:

```text

ACTIVE

  ↓

PAYMENT_PENDING

  ↓

CONFIRMED / SETTLED

```

Alternative:

```text

PAYMENT_PENDING

      ↓

   REJECTED

      ↓

    ACTIVE

```

Never allow:

```text

Borrower → SETTLED

```

without lender confirmation.

---

# 15. Payment Proof

When marking a payment as made, optionally allow the borrower to submit:

* Transaction reference

* Payment screenshot

* Note

* Payment date

Example:

```text

Payment details

Amount:

NPR 1,850

Payment method:

eSewa

Transaction reference:

ESW123456

Screenshot:

[ Uploaded ]

[ Submit Payment ]

```

The lender can review the submitted information before confirming.

Do NOT claim that the app has independently verified the payment.

---

# 16. Notifications

Implement an in-app notification system.

Notifications include:

* Added to Circle

* New expense

* You owe money

* Someone owes you

* Settlement requested

* Payment marked as paid

* Payment confirmed

* Payment rejected

* Loan due soon

* Loan overdue

* Circle activity

Examples:

```text

Ram marked NPR 1,850 as paid.

Waiting for your confirmation.

```

```text

Suman confirmed your NPR 1,850 payment.

Settlement completed.

```

---

# 17. Activity Feed

Create a chronological activity feed.

Example:

```text

Today

Suman added:

Dinner — NPR 5,000

Ram marked:

NPR 1,850 as paid

Suman confirmed:

NPR 1,850 settlement

Yesterday

You added:

Taxi — NPR 800

```

Activity should be scoped appropriately:

* Personal activity

* Circle activity

* Debt activity

---

# 18. Home Dashboard

The home screen should immediately answer:

### What do I owe?

```text

You owe

NPR 3,250

```

### What am I owed?

```text

You're owed

NPR 4,850

```

### Pending settlements

```text

2 payments waiting for confirmation

```

### Upcoming loans

```text

NPR 5,000 due Aug 20

```

### Recent activity

Show the latest transactions.

Use clear visual hierarchy.

Avoid overwhelming users with accounting terminology.

---

# 19. Balance Simplification

For Circle expenses, calculate the simplest practical settlement relationships.

Example:

If:

```text

A owes B 1000

B owes C 700

C owes A 300

```

Do not necessarily require three payments.

Calculate net balances where possible and recommend fewer settlement transactions.

The goal is:

> **Minimize the number of payments needed to settle a group.**

However, preserve the original expense records and explain how the net amount was calculated.

---

# 20. Offline-First Architecture

This is a major requirement.

The application must be **offline-first**, not merely have an offline fallback.

The core experience should work without an internet connection.

Users should be able to:

* Open the app offline

* View cached circles

* View expenses

* View balances

* View lending/borrowing

* Add expenses

* Record lending

* Record borrowing

* Edit permitted local records

* View payment QR codes already cached

* Create settlement actions locally

Changes should be written to local storage/database first.

Then synchronize with the server when connectivity returns.

---

# 21. Recommended Offline Architecture

Use a local-first data layer such as:

**IndexedDB + Dexie** or an equivalent robust client-side database.

Do not use localStorage as the primary database.

Architecture:

```text

                UI

                 │

                 ↓

           Local Database

             IndexedDB

                 │

          Sync Queue / Outbox

                 │

       ┌─────────┴─────────┐

       │                   │

   Online                Offline

       │                   │

       ↓                   ↓

    Sync API          Queue Changes

       │

       ↓

    Server DB

```

Every mutation should first be committed locally.

Then add it to an outbox/sync queue.

When the device reconnects:

1. Detect connectivity.

2. Push pending local changes.

3. Pull remote changes.

4. Resolve conflicts.

5. Update local database.

6. Mark sync operations complete.

Show sync state clearly:

* 🟢 Synced

* 🟡 Syncing

* 🟠 Pending offline changes

* 🔴 Sync error

---

# 22. Conflict Resolution

Design the data model with:

* UUIDs for entities

* Created timestamps

* Updated timestamps

* Device/client identifiers

* Version numbers where useful

* Soft deletion where appropriate

* Immutable financial events where practical

Do NOT rely on auto-increment IDs for client-created records.

For financial records, never silently overwrite conflicting changes.

Prefer deterministic conflict handling and show the user when manual resolution is required.

---

# 23. Offline QR Support

Payment QR codes belonging to people in the user's circles should be cached locally.

If the user is offline and wants to settle:

```text

You owe Ram

NPR 1,500

Ram's eSewa QR

[ QR IMAGE ]

[ Mark as Paid ]

```

This should work even without internet, provided the QR was previously synchronized/cached.

This is an important feature.

---

# 24. PWA

Make the application installable as a PWA.

Implement:

* Web App Manifest

* Service worker

* App shell caching

* Offline page

* Cached application assets

* IndexedDB

* Install prompt where supported

The application should feel like a mobile app when installed.

---

# 25. Backend

Use a robust backend such as Supabase if appropriate.

Suggested stack:

* React

* TypeScript

* Vite

* Tailwind CSS

* shadcn/ui

* Supabase/Postgres

* IndexedDB/Dexie for local persistence

* PWA/service worker

Use Supabase Authentication and Row Level Security if using Supabase.

The exact technology can be adjusted if Lovable has a better native recommendation, but preserve the offline-first architecture.

---

# 26. Database Model

Design a normalized database around these core entities:

```text

users

profiles

payment_methods

circles

circle_members

expenses

expense_participants

loans

loan_repayments

debts

settlements

settlement_payments

notifications

activity_events

sync_operations

```

Important relationships:

```text

User

 ├── Payment Methods

 ├── Circles

 ├── Expenses

 ├── Loans

 ├── Debts

 ├── Settlements

 └── Notifications

Circle

 ├── Members

 └── Expenses

Expense

 ├── Payer

 └── Participants

Debt

 ├── Borrower

 ├── Lender

 └── Settlement history

Settlement

 ├── Debt

 ├── Borrower

 ├── Lender

 ├── Payment proof

 └── Confirmation

```

Use UUID primary keys.

Store all monetary values safely. Prefer integer minor units (e.g. paisa) rather than floating-point values.

---

# 27. Security

Financial information is sensitive.

Implement:

* Authentication

* Authorization

* Row-level access control

* Private circles

* Users can only access permitted financial records

* Secure payment QR storage

* Secure image uploads

* Input validation

* Server-side validation

* Rate limiting where appropriate

* Audit logs for important financial actions

Never expose another user's private financial information unless they are part of the relevant transaction/circle.

---

# 28. UX for Financial Trust

The UI should clearly distinguish:

### Balance

> You owe NPR 1,850

### Payment initiated

> Payment submitted — waiting for confirmation

### Confirmed

> Settlement confirmed

### Rejected

> Payment was not confirmed

Never use ambiguous labels such as simply "Paid" before confirmation.

Use clear timestamps and transaction history.

---

# 29. Design Language

Create a clean, modern, trustworthy fintech-inspired interface.

But avoid making it look like a traditional banking app.

Visual characteristics:

* Minimal

* Friendly

* Social

* Trustworthy

* Modern

* Accessible

* Lots of whitespace

* Rounded cards

* Clear typography

* Strong hierarchy

* Subtle animations

Use a restrained color system.

Use color to communicate:

* Money owed

* Money receivable

* Pending

* Confirmed

* Error

Do not rely on color alone; always include text/icons.

---

# 30. Important Screens

Build these screens:

### Authentication

* Login

* Sign up

* Forgot password

### Home

* Total owed

* Total receivable

* Pending settlements

* Upcoming repayments

* Recent activity

### Circles

* Circle list

* Circle details

* Circle members

* Circle balances

* Circle expenses

* Add expense

### Expense

* Add expense

* Expense details

* Split details

* Edit expense

### People

* Search users

* User profile

* Relationship balance

* Payment methods

### Lending

* Lend money

* Borrow money

* Loan details

* Repayment history

### Settlement

* Settlement details

* Payment methods

* QR viewer

* Mark as paid

* Payment proof

* Waiting for confirmation

* Confirm payment

* Reject payment

* Settlement completed

### Activity

* Activity feed

* Filters

### Profile

* Personal information

* Payment methods

* Preferences

* Notifications

* Offline/sync status

---

# 31. Search

Allow users to search for people by:

* Username

* Name

Do not expose sensitive information through search.

When adding a person to a transaction, show a clear profile card.

---

# 32. Empty States

Create useful empty states.

Example:

```text

No expenses yet

Start tracking your first shared expense.

[ Add Expense ]

```

Circle:

```text

Your circle is empty

Invite friends or family to start sharing expenses.

[ Invite Members ]

```

Settlements:

```text

You're all settled 🎉

No outstanding payments.

```

---

# 33. Error Handling

Make errors understandable.

Instead of:

> Error 500

Use:

> We couldn't sync your changes. Your data is safely stored on this device and we'll try again automatically.

Offline:

> You're offline. New changes will sync when you're connected again.

---

# 34. Demo Data

For development/demo mode, include realistic sample data.

Example users:

* Suman

* Ram

* Sita

* Hari

* Anisha

Example circle:

**Pokhara Trip**

Example expenses:

* Hotel — NPR 8,000

* Dinner — NPR 4,500

* Taxi — NPR 1,200

* Tickets — NPR 3,000

Include sample debts and one pending settlement so the complete workflow can be demonstrated.

Clearly separate demo data from production data.

---

# 35. Important Business Rules

Implement these carefully:

1. A user cannot settle a debt for more than the outstanding amount unless explicitly recording an overpayment.

2. Expense splits must equal the total expense.

3. Historical financial records should not be silently modified.

4. Borrower marking a payment as paid creates a **pending settlement**, not a confirmed settlement.

5. Only the lender/recipient can confirm receipt.

6. Rejected payments return the debt to an active/unsettled state.

7. Partial repayments must be supported.

8. Settlement confirmation must be recorded with timestamp and user ID.

9. QR codes are for display only; the app does not process payments.

10. Offline-created records must receive UUIDs locally and sync safely later.

11. Financial amounts must never rely on floating-point arithmetic.

12. Every important state change should be auditable.

---

# 36. Notifications & Reminders

Build notification architecture so it can support:

* In-app notifications immediately

* Browser push notifications where permission is available

* Future email/SMS integration without redesigning the database

Do not require push notifications for the app to function.

---

# 37. Performance

Prioritize:

* Fast initial load

* Fast mobile navigation

* Minimal network dependency

* Optimistic UI

* Local database reads

* Lazy loading where appropriate

* Image compression for QR/payment proof images

* Efficient sync

The app should remain usable on slower mobile networks.

---

# 38. Accessibility

Follow WCAG principles.

Implement:

* Keyboard navigation

* Proper labels

* Accessible buttons

* Adequate touch targets

* Screen-reader-friendly controls

* Sufficient contrast

* Do not rely exclusively on color

* Clear focus states

---

# 39. Deliverable

Build a functional, polished MVP rather than only static mockups.

The implementation should include:

* Working authentication

* Working profiles

* Payment QR management

* Circles

* Members

* Expenses

* Expense splitting

* Lending

* Borrowing

* Debt calculation

* Settlement flow

* Payment QR viewing

* Payment proof

* Lender confirmation

* Settlement history

* Notifications

* Offline-first local database

* Sync queue

* PWA functionality

* Responsive mobile/desktop UI

Every major button should perform a real action.

Do not create fake UI interactions where functionality can reasonably be implemented.

---

# 40. Build Priority

Implement in this order:

### Phase 1 — Foundation

Authentication, profiles, database, offline local storage, synchronization architecture.

### Phase 2 — Core Finance

Circles, members, expenses, splitting, balances.

### Phase 3 — Lending

Borrowing, lending, partial repayments, due dates.

### Phase 4 — Settlement

QR payment profiles, external payment flow, mark-as-paid, lender confirmation, rejection, payment proof.

### Phase 5 — Polish

Notifications, activity feed, reminders, PWA, offline UX, conflict handling, accessibility, responsive refinement.

---

# Final Product Principle

The product should make one question extremely easy to answer:

> **"Who do I owe, how much do I owe them, and how can I settle it?"**

And for the recipient:

> **"Who owes me, have they paid, and what payments are still waiting for my confirmation?"**

Build the product around these two experiences.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://circlepay.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7b0f0f78-4585-4d39-a5eb-40f504a9c8fb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

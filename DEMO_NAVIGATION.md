# GigCare Demo Navigation Guide

This guide shows the shortest path through the product during a demo.

## Start Here

- Worker app: http://localhost:3010
- Admin app: http://localhost:3013
- API health: http://localhost:3011/health

## Worker Demo Flow

1. Open the worker app.
2. Sign in with a demo worker account.
3. On the home screen, check the active policy card and recent claims section.
4. If there is no active policy, go to Buy Policy.
5. Choose a zone and tier, then complete the purchase flow.
6. After purchase, return to the home screen to see the policy activated.
7. Open a claim card to view claim details and trust information.

## Admin Demo Flow

1. Open the admin app and log in with the admin demo account.
2. Go to the dashboard to view premiums, payouts, reserve, and claim status.
3. Open Trigger Control to fire a manual event.
4. Use the regular trigger form for a normal demo event.
5. Use Run Guaranteed Demo Payout for a one-click path that targets an active policy zone and creates a visible claim.

## Recommended Live Demo Order

1. Show worker home and policy purchase.
2. Show admin dashboard and trigger control.
3. Run the guaranteed demo payout button.
4. Refresh the worker dashboard so the new claim is visible.
5. Open the claim detail view to show the trust and payout story.

## What To Point Out

- Policy purchase is separate from claim payout.
- Triggers create claims automatically when conditions are met.
- Fraud checks happen before payout.
- The dashboard shows the operational state of the system in real time.

## Useful Notes For Presenting

- If a trigger is fired for a city, the worker app may take a few seconds to reflect it because it refreshes on a polling cycle.
- The guaranteed demo payout button is the safest way to show the full path in one click.
- If you need to show the pricing story, open the policy purchase page before triggering a claim.

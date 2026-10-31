# Mobile feature inventory

Source of truth: sibling `room-finder` AGENTS.md, docs/api.md, marketplace-api.md,
management-api.md, owner-properties-api.md, admin-dashboard.md, routes/api.php,
routes/rentals.php, controllers, policies, request validators, and React pages.
The native workspace contained only the unmodified Expo SDK 58 starter.

| Area            | Native implementation                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication  | Login, owner/finder registration, recovery/reset, email verification refresh/resend, current-device logout; Sanctum token in SecureStore     |
| Account         | Profile and picture, address/DOB, public role preferences, password change, account deletion, light/dark appearance                          |
| Finder          | Filtered discovery, saved places, photo/details/terms/availability, booking/application requests, host messages and viewing proposals        |
| Rental activity | Requests, bookings, applications, tenancy offers/acceptance/decline/end; role and state-specific actions                                     |
| Owner           | Overview, property create/edit/archive/restore, gallery upload/hide/cover, units and short-stay/long-term offers, calendar and manual blocks |
| Shared          | Paginated messages, older messages, notifications/read, community notices                                                                    |
| Administration  | Dashboard metadata, user CRUD/status/roles/profile pictures, notice CRUD/images/expiry; manager and superadmin permissions                   |
| Resilience      | Loading, pull-to-refresh, field errors, empty results, transport/offline retry, expired session handling, mutation pending states            |

Business rules stay on the server. Explicit memberships grant workspaces; there is
no admin-to-owner role inheritance. Verification gates business screens. Dates
are application-timezone calendar dates, with exclusive departure/end dates.
Prices display from minor units and are submitted as decimal strings. Requests
and tenancy offers do not hold dates; only server confirmation/acceptance does.

No missing endpoint was found for the reference's implemented features. Planned
reference features remain planned: online payments, instant booking, recurring
rent, legal signing, reports, privileged property/booking management, push and
email notification delivery. There is no refresh-token API or upload deletion
API for property photos (hide/restore is the supported operation).

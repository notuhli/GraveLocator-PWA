// ─────────────────────────────────────────────────────────────────────────────
// ADMIN WORKFLOW STATUSES — distinct from config/status.js, which describes the
// physical state of a lot on the map (available/sold/reserve/etc). These describe
// business-process state for records that still exist in the admin dashboard
// (user accounts, memorial moderation). Keep both files separate — a lot's map
// status changes independently of a user's account status.
// ─────────────────────────────────────────────────────────────────────────────

export const USER_STATUS = {
  ACTIVE:   'active',
  INACTIVE: 'inactive',
}
export const USER_STATUS_META = {
  [USER_STATUS.ACTIVE]:   { label: 'Active',   badge: 'badge-active' },
  [USER_STATUS.INACTIVE]: { label: 'Inactive', badge: 'badge-inactive' },
}

export const MEMORIAL_STATUS = {
  PENDING:  'pending',
  APPROVED: 'approved',
  FEATURED: 'featured',
}
export const MEMORIAL_STATUS_META = {
  [MEMORIAL_STATUS.PENDING]:  { label: 'Pending',  badge: 'badge-pending' },
  [MEMORIAL_STATUS.APPROVED]: { label: 'Approved', badge: 'badge-approved' },
  [MEMORIAL_STATUS.FEATURED]: { label: 'Featured', badge: 'badge-featured' },
}

// Admin dashboard staff roles (distinct from public site USERS).
export const ADMIN_ROLE = {
  VIEWER:      'Viewer',
  ADMIN:       'Admin',
  SUPER_ADMIN: 'Super Admin',
}

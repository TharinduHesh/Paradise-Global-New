export const roles = ['owner', 'admin', 'manager', 'editor'] as const;
export type Role = typeof roles[number];

export const staffPermissions = ['enquiries', 'activity'] as const;
export type StaffPermission = typeof staffPermissions[number];
export const defaultStaffPermissions: StaffPermission[] = ['enquiries'];

export type AccessUser = { role: Role; permissions?: StaffPermission[] };

export const isAdministrator = (role: Role) => role === 'owner' || role === 'admin';
export const canManageAccounts = (role: Role) => isAdministrator(role) || role === 'manager';

export const manageableRoles = (role: Role): readonly Role[] => {
  if (role === 'owner') return roles;
  if (role === 'admin') return ['manager', 'editor'];
  if (role === 'manager') return ['editor'];
  return [];
};

export const adminSections = [
  ['/', 'Dashboard'],
  ['/properties', 'Property Listings'],
  ['/services', 'Services & Divisions'],
  ['/enquiries', 'Enquiry Inbox'],
  ['/hospitality', 'Hospitality'],
  ['/projects', 'Projects & Testimonials'],
  ['/content', 'Website Content'],
  ['/media', 'Media & Translations'],
  ['/seo', 'SEO & Reports'],
  ['/users', 'Users & Settings'],
  ['/activity', 'Activity Logs'],
  ['/account', 'My Account'],
] as const;

export const canReadStaffSection = (user: AccessUser, section: StaffPermission) =>
  user.role !== 'editor' || (user.permissions ?? defaultStaffPermissions).includes(section);

export const canAccessAdminPage = (user: AccessUser, pathname: string) => {
  const path = pathname.replace(/\/+$/, '') || '/admin';
  if (path === '/admin/account') return true;
  if (path === '/admin/enquiries') return canReadStaffSection(user, 'enquiries');
  if (path === '/admin/activity') return canReadStaffSection(user, 'activity');
  if (path === '/admin/users') return canManageAccounts(user.role);
  return isAdministrator(user.role) && (
    path === '/admin' || path === '/admin/settings' || path === '/admin/maintenance-preview'
    || adminSections.some(([section]) => '/admin' + section === path)
  );
};

export const adminHome = (user: AccessUser) => isAdministrator(user.role) ? '/admin'
  : canReadStaffSection(user, 'enquiries') ? '/admin/enquiries'
  : canReadStaffSection(user, 'activity') ? '/admin/activity' : '/admin/account';

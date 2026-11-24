export const roles = ['owner', 'admin', 'manager', 'editor'] as const;
export type Role = typeof roles[number];

export const staffPermissions = ['enquiries', 'activity'] as const;
export type StaffPermission = typeof staffPermissions[number];
export const defaultStaffPermissions: StaffPermission[] = ['enquiries'];

export type AccessUser = { role: Role; permissions?: StaffPermission[] };

export const isAdministrator = (role: Role) => role === 'owner' || role === 'admin';
// Staff accounts and the activity log are for Owners and Admins only.
export const canManageAccounts = (role: Role) => isAdministrator(role);

export const manageableRoles = (role: Role): readonly Role[] => {
  if (role === 'owner') return roles;
  if (role === 'admin') return ['manager', 'editor'];
  return [];
};

export const websiteSections = [
  { path: '/admin/properties', label: 'Property Listings', types: ['property'] },
  { path: '/admin/services', label: 'Services & Divisions', types: ['service'] },
  { path: '/admin/hospitality', label: 'Hospitality', types: ['destination'] },
  { path: '/admin/projects', label: 'Projects & Testimonials', types: ['project', 'testimonial'] },
  { path: '/admin/content', label: 'Website Content', types: ['page'] },
  { path: '/admin/media', label: 'Media & Translations', types: ['media', 'translation'] },
] as const;

export const websiteManagementPath = '/admin/content';

export const adminSections = [
  ['/', 'Dashboard'],
  ['/enquiries', 'Enquiry Inbox'],
  ['/content', 'Website Management'],
  ['/business', 'Business Info'],
  ['/maintenance', 'Maintenance Mode'],
  ['/seo', 'SEO & Reports'],
  ['/users', 'Users & Settings'],
  ['/activity', 'Activity Logs'],
  ['/account', 'My Account'],
] as const;

export const canReadStaffSection = (user: AccessUser, section: StaffPermission) => {
  if (isAdministrator(user.role)) return true;
  // Staff (editors) see what an Admin has granted them; managers see the enquiry inbox only.
  if (user.role === 'editor') return (user.permissions ?? defaultStaffPermissions).includes(section);
  return section === 'enquiries';
};

export const canAccessAdminPage = (user: AccessUser, pathname: string) => {
  const path = pathname.replace(/\/+$/, '') || '/admin';
  if (path === '/admin/account') return true;
  if (path === '/admin/enquiries') return canReadStaffSection(user, 'enquiries');
  if (path === '/admin/activity') return canReadStaffSection(user, 'activity');
  if (path === '/admin/users') return canManageAccounts(user.role);
  return isAdministrator(user.role) && (
    path === '/admin' || path === '/admin/settings' || path === '/admin/maintenance-preview'
    || adminSections.some(([section]) => '/admin' + section === path)
    || websiteSections.some((section) => section.path === path)
  );
};

export const adminHome = (user: AccessUser) => isAdministrator(user.role) ? '/admin'
  : canReadStaffSection(user, 'enquiries') ? '/admin/enquiries'
  : canReadStaffSection(user, 'activity') ? '/admin/activity' : '/admin/account';

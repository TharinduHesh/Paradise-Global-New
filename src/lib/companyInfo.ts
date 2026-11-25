/** Business details shown on the website and in enquiry emails. Admins override them in Settings → Business information. */
export interface CompanyInfo {
  name: string; phone: string; whatsapp: string; email: string;
  address: string; hours: string;
  facebook: string; instagram: string;
}

/** Used until the saved business info loads, and for any field left blank in Settings. */
export const defaultCompany: CompanyInfo = {
  name: 'Paradise Global Leisures (PVT) LTD',
  phone: '075 166 8705',
  whatsapp: '+94751668705',
  email: 'info@paradisegloballeisures.com',
  address: 'Kandy & Colombo, Sri Lanka',
  hours: 'Mon–Fri: 9:00 AM – 6:00 PM; Sat: 9:00 AM – 1:00 PM',
  facebook: '',
  instagram: '',
};

/** Saved settings over the defaults; blank or non-text saved values fall back to the default. */
export const mergeCompany = (saved: unknown): CompanyInfo => {
  const values = saved && typeof saved === 'object' ? saved as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(defaultCompany).map(([key, fallback]) => {
    const value = values[key];
    return [key, typeof value === 'string' && value.trim() ? value.trim() : fallback];
  })) as unknown as CompanyInfo;
};

export const enquiryCategories = {
  contact: 'Contact message',
  property: 'Property enquiry',
  approval: 'Approval consultation',
  hospitality: 'Hospitality booking',
} as const;

export type EnquiryCategory = keyof typeof enquiryCategories;

// Existing forms share one inbox. Classify saved enquiries by the service selected on submission.
export const enquiryCategorySql = `CASE
  WHEN lower(service) LIKE '%hospitality%' OR lower(service) LIKE '%booking%' THEN 'hospitality'
  WHEN lower(service) LIKE '%approval%' THEN 'approval'
  WHEN lower(service) LIKE '%property%' OR lower(service) LIKE '%real estate%' THEN 'property'
  ELSE 'contact'
END`;

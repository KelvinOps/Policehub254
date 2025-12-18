// src/lib/constants/criminal.ts

export const CRIMINAL_CATEGORIES = {
  VIOLENT: {
    label: 'Violent Offender',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    description: 'Involved in violent crimes',
  },
  PROPERTY: {
    label: 'Property Crime',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    description: 'Theft, burglary, property offenses',
  },
  DRUG: {
    label: 'Drug-Related',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    description: 'Drug trafficking or possession',
  },
  FRAUD: {
    label: 'Financial Crime',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    description: 'Fraud, embezzlement, corruption',
  },
  CYBER: {
    label: 'Cybercrime',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    description: 'Online fraud, hacking',
  },
  ORGANIZED: {
    label: 'Organized Crime',
    color: 'bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-100',
    description: 'Gang activity, organized networks',
  },
  OTHER: {
    label: 'Other',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    description: 'Other criminal activity',
  },
} as const;

export const WANTED_STATUS = {
  WANTED: {
    label: 'Wanted',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  ARRESTED: {
    label: 'Arrested',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  CLEARED: {
    label: 'Cleared',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  NOT_WANTED: {
    label: 'Not Wanted',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  },
} as const;

export const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
] as const;

export const NATIONALITY_OPTIONS = [
  { value: 'Kenyan', label: 'Kenyan' },
  { value: 'Ugandan', label: 'Ugandan' },
  { value: 'Tanzanian', label: 'Tanzanian' },
  { value: 'Somali', label: 'Somali' },
  { value: 'Ethiopian', label: 'Ethiopian' },
  { value: 'South Sudanese', label: 'South Sudanese' },
  { value: 'Other', label: 'Other' },
] as const;

export function getCategoryColor(category: string): string {
  return CRIMINAL_CATEGORIES[category as keyof typeof CRIMINAL_CATEGORIES]?.color || CRIMINAL_CATEGORIES.OTHER.color;
}

export function getCategoryLabel(category: string): string {
  return CRIMINAL_CATEGORIES[category as keyof typeof CRIMINAL_CATEGORIES]?.label || 'Unknown';
}

export function getWantedStatusColor(status: string): string {
  const statusKey = status ? 'WANTED' : 'NOT_WANTED';
  return WANTED_STATUS[statusKey]?.color || WANTED_STATUS.NOT_WANTED.color;
}

export function getWantedStatusLabel(status: boolean): string {
  const statusKey = status ? 'WANTED' : 'NOT_WANTED';
  return WANTED_STATUS[statusKey]?.label || 'Unknown';
}
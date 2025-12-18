// src/lib/constants/incident-types.ts

/**
 * Comprehensive crime classification based on:
 * - WHO International Classification of Crime for Statistical Purposes (ICCS)
 * - FBI Uniform Crime Reporting (UCR)
 * - Kenya Penal Code
 */

export const INCIDENT_CATEGORIES = {
  // Violent Crimes Against Persons
  VIOLENT_CRIMES: {
    MURDER: {
      code: 'VC-01',
      label: 'Murder/Homicide',
      description: 'Unlawful killing of another person',
      severity: 'CRITICAL',
    },
    ATTEMPTED_MURDER: {
      code: 'VC-02',
      label: 'Attempted Murder',
      description: 'Attempt to unlawfully kill another person',
      severity: 'CRITICAL',
    },
    ASSAULT: {
      code: 'VC-03',
      label: 'Assault/Battery',
      description: 'Physical attack causing bodily harm',
      severity: 'HIGH',
    },
    AGGRAVATED_ASSAULT: {
      code: 'VC-04',
      label: 'Aggravated Assault',
      description: 'Assault with a deadly weapon or causing serious injury',
      severity: 'CRITICAL',
    },
    ROBBERY: {
      code: 'VC-05',
      label: 'Robbery',
      description: 'Theft using force or threat of force',
      severity: 'HIGH',
    },
    ARMED_ROBBERY: {
      code: 'VC-06',
      label: 'Armed Robbery',
      description: 'Robbery with use of weapons',
      severity: 'CRITICAL',
    },
    RAPE: {
      code: 'VC-07',
      label: 'Rape/Sexual Assault',
      description: 'Non-consensual sexual intercourse',
      severity: 'CRITICAL',
    },
    SEXUAL_ASSAULT: {
      code: 'VC-08',
      label: 'Sexual Assault',
      description: 'Sexual contact without consent',
      severity: 'CRITICAL',
    },
    KIDNAPPING: {
      code: 'VC-09',
      label: 'Kidnapping/Abduction',
      description: 'Unlawful seizure and detention of a person',
      severity: 'CRITICAL',
    },
    HUMAN_TRAFFICKING: {
      code: 'VC-10',
      label: 'Human Trafficking',
      description: 'Recruitment, transportation, harboring for exploitation',
      severity: 'CRITICAL',
    },
  },

  // Property Crimes
  PROPERTY_CRIMES: {
    THEFT: {
      code: 'PC-01',
      label: 'Theft/Larceny',
      description: 'Taking property without consent',
      severity: 'MEDIUM',
    },
    BURGLARY: {
      code: 'PC-02',
      label: 'Burglary/Breaking and Entering',
      description: 'Unlawful entry to commit theft',
      severity: 'HIGH',
    },
    MOTOR_VEHICLE_THEFT: {
      code: 'PC-03',
      label: 'Motor Vehicle Theft',
      description: 'Theft or unauthorized use of motor vehicle',
      severity: 'HIGH',
    },
    SHOPLIFTING: {
      code: 'PC-04',
      label: 'Shoplifting',
      description: 'Theft from retail establishment',
      severity: 'LOW',
    },
    VANDALISM: {
      code: 'PC-05',
      label: 'Vandalism/Property Damage',
      description: 'Intentional destruction of property',
      severity: 'MEDIUM',
    },
    ARSON: {
      code: 'PC-06',
      label: 'Arson',
      description: 'Intentional fire setting',
      severity: 'CRITICAL',
    },
  },

  // Domestic/Family Violence
  DOMESTIC_VIOLENCE: {
    DOMESTIC_ASSAULT: {
      code: 'DV-01',
      label: 'Domestic Violence',
      description: 'Violence between family members or partners',
      severity: 'HIGH',
    },
    CHILD_ABUSE: {
      code: 'DV-02',
      label: 'Child Abuse',
      description: 'Physical, sexual, or emotional abuse of a child',
      severity: 'CRITICAL',
    },
    CHILD_NEGLECT: {
      code: 'DV-03',
      label: 'Child Neglect',
      description: 'Failure to provide care for a child',
      severity: 'HIGH',
    },
    ELDER_ABUSE: {
      code: 'DV-04',
      label: 'Elder Abuse',
      description: 'Abuse of elderly person',
      severity: 'HIGH',
    },
  },

  // Drug-Related Offenses
  DRUG_OFFENSES: {
    DRUG_POSSESSION: {
      code: 'DR-01',
      label: 'Drug Possession',
      description: 'Possession of controlled substances',
      severity: 'MEDIUM',
    },
    DRUG_TRAFFICKING: {
      code: 'DR-02',
      label: 'Drug Trafficking',
      description: 'Sale or distribution of controlled substances',
      severity: 'CRITICAL',
    },
    DRUG_MANUFACTURING: {
      code: 'DR-03',
      label: 'Drug Manufacturing',
      description: 'Production of illegal drugs',
      severity: 'CRITICAL',
    },
  },

  // Economic/White Collar Crimes
  ECONOMIC_CRIMES: {
    FRAUD: {
      code: 'EC-01',
      label: 'Fraud',
      description: 'Deception for financial gain',
      severity: 'HIGH',
    },
    EMBEZZLEMENT: {
      code: 'EC-02',
      label: 'Embezzlement',
      description: 'Theft by person in position of trust',
      severity: 'HIGH',
    },
    FORGERY: {
      code: 'EC-03',
      label: 'Forgery',
      description: 'Creating false documents',
      severity: 'MEDIUM',
    },
    IDENTITY_THEFT: {
      code: 'EC-04',
      label: 'Identity Theft',
      description: 'Unauthorized use of personal information',
      severity: 'HIGH',
    },
    MONEY_LAUNDERING: {
      code: 'EC-05',
      label: 'Money Laundering',
      description: 'Concealing illegal money sources',
      severity: 'CRITICAL',
    },
    CORRUPTION: {
      code: 'EC-06',
      label: 'Corruption/Bribery',
      description: 'Abuse of public office for private gain',
      severity: 'CRITICAL',
    },
  },

  // Cybercrime
  CYBERCRIME: {
    HACKING: {
      code: 'CY-01',
      label: 'Computer Hacking',
      description: 'Unauthorized access to computer systems',
      severity: 'HIGH',
    },
    ONLINE_FRAUD: {
      code: 'CY-02',
      label: 'Online Fraud',
      description: 'Internet-based fraud schemes',
      severity: 'HIGH',
    },
    CYBERBULLYING: {
      code: 'CY-03',
      label: 'Cyberbullying',
      description: 'Online harassment or intimidation',
      severity: 'MEDIUM',
    },
    PHISHING: {
      code: 'CY-04',
      label: 'Phishing',
      description: 'Fraudulent attempt to obtain sensitive information',
      severity: 'MEDIUM',
    },
  },

  // Traffic Offenses
  TRAFFIC: {
    ACCIDENT_FATAL: {
      code: 'TR-01',
      label: 'Fatal Traffic Accident',
      description: 'Traffic accident resulting in death',
      severity: 'CRITICAL',
    },
    ACCIDENT_INJURY: {
      code: 'TR-02',
      label: 'Traffic Accident with Injuries',
      description: 'Traffic accident causing injuries',
      severity: 'HIGH',
    },
    ACCIDENT_PROPERTY: {
      code: 'TR-03',
      label: 'Traffic Accident (Property Damage)',
      description: 'Traffic accident with property damage only',
      severity: 'LOW',
    },
    DUI: {
      code: 'TR-04',
      label: 'Driving Under Influence',
      description: 'Operating vehicle while intoxicated',
      severity: 'HIGH',
    },
    HIT_AND_RUN: {
      code: 'TR-05',
      label: 'Hit and Run',
      description: 'Leaving scene of accident',
      severity: 'HIGH',
    },
    RECKLESS_DRIVING: {
      code: 'TR-06',
      label: 'Reckless Driving',
      description: 'Dangerous operation of vehicle',
      severity: 'MEDIUM',
    },
  },

  // Public Order Offenses
  PUBLIC_ORDER: {
    DISORDERLY_CONDUCT: {
      code: 'PO-01',
      label: 'Disorderly Conduct',
      description: 'Disturbing public peace',
      severity: 'LOW',
    },
    TRESPASSING: {
      code: 'PO-02',
      label: 'Trespassing',
      description: 'Unlawful entry onto property',
      severity: 'LOW',
    },
    PUBLIC_INTOXICATION: {
      code: 'PO-03',
      label: 'Public Intoxication',
      description: 'Being intoxicated in public',
      severity: 'LOW',
    },
    ILLEGAL_GAMBLING: {
      code: 'PO-04',
      label: 'Illegal Gambling',
      description: 'Participating in illegal gambling activities',
      severity: 'LOW',
    },
  },

  // Missing Persons
  MISSING_PERSONS: {
    MISSING_ADULT: {
      code: 'MP-01',
      label: 'Missing Adult',
      description: 'Adult person reported missing',
      severity: 'HIGH',
    },
    MISSING_CHILD: {
      code: 'MP-02',
      label: 'Missing Child',
      description: 'Child reported missing',
      severity: 'CRITICAL',
    },
    RUNAWAY: {
      code: 'MP-03',
      label: 'Runaway',
      description: 'Person left home voluntarily',
      severity: 'MEDIUM',
    },
  },

  // Other
  OTHER: {
    SUSPICIOUS_ACTIVITY: {
      code: 'OT-01',
      label: 'Suspicious Activity',
      description: 'Unusual behavior warranting investigation',
      severity: 'LOW',
    },
    WILDLIFE_CRIME: {
      code: 'OT-02',
      label: 'Wildlife Crime',
      description: 'Poaching, illegal wildlife trade',
      severity: 'HIGH',
    },
    ENVIRONMENTAL_CRIME: {
      code: 'OT-03',
      label: 'Environmental Crime',
      description: 'Pollution, illegal dumping',
      severity: 'MEDIUM',
    },
    TERRORISM: {
      code: 'OT-04',
      label: 'Terrorism',
      description: 'Act intended to intimidate or coerce',
      severity: 'CRITICAL',
    },
  },
} as const;

// Flatten for easy lookup
export const getAllIncidentTypes = () => {
  const types: any[] = [];
  Object.entries(INCIDENT_CATEGORIES).forEach(([category, incidents]) => {
    Object.entries(incidents).forEach(([key, incident]) => {
      types.push({
        ...incident,
        category,
        key,
      });
    });
  });
  return types;
};

// Get incident by code
export const getIncidentByCode = (code: string) => {
  const allTypes = getAllIncidentTypes();
  return allTypes.find((type) => type.code === code);
};

// Severity levels
export const SEVERITY_LEVELS = {
  LOW: { label: 'Low', color: 'green', priority: 1 },
  MEDIUM: { label: 'Medium', color: 'yellow', priority: 2 },
  HIGH: { label: 'High', color: 'orange', priority: 3 },
  CRITICAL: { label: 'Critical', color: 'red', priority: 4 },
} as const;

// Status definitions
export const INCIDENT_STATUS = {
  REPORTED: { label: 'Reported', color: 'blue' },
  UNDER_INVESTIGATION: { label: 'Under Investigation', color: 'yellow' },
  RESOLVED: { label: 'Resolved', color: 'green' },
  CLOSED: { label: 'Closed', color: 'gray' },
  TRANSFERRED: { label: 'Transferred', color: 'purple' },
} as const;
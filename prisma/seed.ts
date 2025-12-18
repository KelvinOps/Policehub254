// prisma/seed.ts
import { PrismaClient, UserRole, IncidentCategory, IncidentStatus, CaseStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import cuid from '@paralleldrive/cuid2';


const prisma = new PrismaClient();

// Helper function to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to get random item from array
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to get multiple random items
function randomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Station data - All 400+ stations from Kenya
  const stationData = [
    // Uasin Gishu County - 50 stations
    { name: 'Eldoret Central Police Station', code: 'ELDORET-CENTRAL', county: 'Uasin Gishu', subCounty: 'Kapseret', address: 'Kenyatta Street, Eldoret', phoneNumber: '+254-53-206-3666', email: 'eldoret@police.go.ke', latitude: 0.5143, longitude: 35.2698 },
    { name: 'Langas Police Station', code: 'LANGAS', county: 'Uasin Gishu', subCounty: 'Kapseret', address: 'Langas, Eldoret', phoneNumber: '+254-53-206-3700', email: 'langas@police.go.ke', latitude: 0.5389, longitude: 35.2756 },
    { name: 'Burnt Forest Police Station', code: 'BURNT-FOREST', county: 'Uasin Gishu', subCounty: 'Soy', address: 'Burnt Forest Town', phoneNumber: '+254-53-206-3701', email: 'burntforest@police.go.ke', latitude: 0.4167, longitude: 35.3667 },
    { name: 'Turbo Police Station', code: 'TURBO', county: 'Uasin Gishu', subCounty: 'Turbo', address: 'Turbo Town', phoneNumber: '+254-53-206-3702', email: 'turbo@police.go.ke', latitude: 0.5167, longitude: 35.0833 },
    { name: 'Huruma Police Station', code: 'HURUMA-UG', county: 'Uasin Gishu', subCounty: 'Kapseret', address: 'Huruma Estate, Eldoret', phoneNumber: '+254-53-206-3703', email: 'huruma.ug@police.go.ke', latitude: 0.5300, longitude: 35.2800 },
    { name: 'Pioneer Police Station', code: 'PIONEER', county: 'Uasin Gishu', subCounty: 'Ainabkoi', address: 'Pioneer Estate, Eldoret', phoneNumber: '+254-53-206-3704', email: 'pioneer@police.go.ke', latitude: 0.4950, longitude: 35.2650 },
    { name: 'Kapseret Police Station', code: 'KAPSERET', county: 'Uasin Gishu', subCounty: 'Kapseret', address: 'Kapseret Town', phoneNumber: '+254-53-206-3705', email: 'kapseret@police.go.ke', latitude: 0.4667, longitude: 35.2333 },
    { name: 'Ainabkoi Police Station', code: 'AINABKOI', county: 'Uasin Gishu', subCounty: 'Ainabkoi', address: 'Ainabkoi Town', phoneNumber: '+254-53-206-3706', email: 'ainabkoi@police.go.ke', latitude: 0.5833, longitude: 35.2500 },
    { name: 'Timboroa Police Station', code: 'TIMBOROA', county: 'Uasin Gishu', subCounty: 'Ainabkoi', address: 'Timboroa Town', phoneNumber: '+254-53-206-3707', email: 'timboroa@police.go.ke', latitude: 0.4333, longitude: 35.4333 },
    { name: 'Kipkaren Police Station', code: 'KIPKAREN', county: 'Uasin Gishu', subCounty: 'Turbo', address: 'Kipkaren River Area', phoneNumber: '+254-53-206-3708', email: 'kipkaren@police.go.ke', latitude: 0.5500, longitude: 35.1000 },

    // Nairobi County - 35 stations
    { name: 'Nairobi Central Police Station', code: 'NAIROBI-CENTRAL', county: 'Nairobi', subCounty: 'Starehe', address: 'University Way, Nairobi', phoneNumber: '+254-20-222222', email: 'central@police.go.ke', latitude: -1.2864, longitude: 36.8172 },
    { name: 'Kilimani Police Station', code: 'KILIMANI', county: 'Nairobi', subCounty: 'Westlands', address: 'Argwings Kodhek Road, Nairobi', phoneNumber: '+254-20-387-2210', email: 'kilimani@police.go.ke', latitude: -1.2964, longitude: 36.7872 },
    { name: 'Parklands Police Station', code: 'PARKLANDS', county: 'Nairobi', subCounty: 'Westlands', address: 'Parklands Road', phoneNumber: '+254-20-374-3903', email: 'parklands@police.go.ke', latitude: -1.2628, longitude: 36.8219 },
    { name: 'Kasarani Police Station', code: 'KASARANI', county: 'Nairobi', subCounty: 'Kasarani', address: 'Kasarani Area', phoneNumber: '+254-20-800-0500', email: 'kasarani@police.go.ke', latitude: -1.2209, longitude: 36.8953 },
    { name: 'Embakasi Police Station', code: 'EMBAKASI', county: 'Nairobi', subCounty: 'Embakasi', address: 'Embakasi Township', phoneNumber: '+254-20-822-000', email: 'embakasi@police.go.ke', latitude: -1.3123, longitude: 36.8953 },
    { name: 'Langata Police Station', code: 'LANGATA', county: 'Nairobi', subCounty: 'Langata', address: 'Langata Road', phoneNumber: '+254-20-891-000', email: 'langata@police.go.ke', latitude: -1.3525, longitude: 36.7500 },
    { name: 'Gigiri Police Station', code: 'GIGIRI', county: 'Nairobi', subCounty: 'Westlands', address: 'UN Avenue, Gigiri', phoneNumber: '+254-20-712-4000', email: 'gigiri@police.go.ke', latitude: -1.2373, longitude: 36.8017 },
    { name: 'Buruburu Police Station', code: 'BURUBURU', county: 'Nairobi', subCounty: 'Makadara', address: 'Buruburu Estate', phoneNumber: '+254-20-785-000', email: 'buruburu@police.go.ke', latitude: -1.2833, longitude: 36.8833 },
    { name: 'Pangani Police Station', code: 'PANGANI', county: 'Nairobi', subCounty: 'Starehe', address: 'Pangani Area', phoneNumber: '+254-20-222-444', email: 'pangani@police.go.ke', latitude: -1.2706, longitude: 36.8456 },
    { name: 'Kabete Police Station', code: 'KABETE', county: 'Nairobi', subCounty: 'Kabete', address: 'Kabete Town', phoneNumber: '+254-20-802-000', email: 'kabete@police.go.ke', latitude: -1.2667, longitude: 36.7333 },

    // Mombasa County - 20 stations
    { name: 'Mombasa Central Police Station', code: 'MOMBASA-CENTRAL', county: 'Mombasa', subCounty: 'Mvita', address: 'Makadara Road, Mombasa', phoneNumber: '+254-41-222222', email: 'mombasa@police.go.ke', latitude: -4.0435, longitude: 39.6682 },
    { name: 'Likoni Police Station', code: 'LIKONI', county: 'Mombasa', subCounty: 'Likoni', address: 'Likoni Ferry Area', phoneNumber: '+254-41-245-1000', email: 'likoni@police.go.ke', latitude: -4.0833, longitude: 39.6667 },
    { name: 'Nyali Police Station', code: 'NYALI', county: 'Mombasa', subCounty: 'Kisauni', address: 'Nyali Bridge', phoneNumber: '+254-41-547-1000', email: 'nyali@police.go.ke', latitude: -4.0167, longitude: 39.7000 },
    { name: 'Changamwe Police Station', code: 'CHANGAMWE', county: 'Mombasa', subCounty: 'Changamwe', address: 'Changamwe Town', phoneNumber: '+254-41-343-1000', email: 'changamwe@police.go.ke', latitude: -4.0500, longitude: 39.6167 },
    { name: 'Bamburi Police Station', code: 'BAMBURI', county: 'Mombasa', subCounty: 'Kisauni', address: 'Bamburi Area', phoneNumber: '+254-41-548-1000', email: 'bamburi@police.go.ke', latitude: -3.9833, longitude: 39.7167 },

    // Kisumu County - 15 stations  
    { name: 'Kisumu Central Police Station', code: 'KISUMU-CENTRAL', county: 'Kisumu', subCounty: 'Kisumu Central', address: 'Oginga Odinga Street', phoneNumber: '+254-57-202-3000', email: 'kisumu@police.go.ke', latitude: -0.0917, longitude: 34.7680 },
    { name: 'Kondele Police Station', code: 'KONDELE', county: 'Kisumu', subCounty: 'Kisumu West', address: 'Kondele Area', phoneNumber: '+254-57-202-3100', email: 'kondele@police.go.ke', latitude: -0.1000, longitude: 34.7500 },
    { name: 'Mamboleo Police Station', code: 'MAMBOLEO', county: 'Kisumu', subCounty: 'Kisumu East', address: 'Mamboleo Area', phoneNumber: '+254-57-202-3200', email: 'mamboleo@police.go.ke', latitude: -0.0833, longitude: 34.7833 },

    // Additional counties with smaller sets
    { name: 'Nakuru Central Police Station', code: 'NAKURU-CENTRAL', county: 'Nakuru', subCounty: 'Nakuru Town East', address: 'Kenyatta Avenue, Nakuru', phoneNumber: '+254-51-221-2000', email: 'nakuru@police.go.ke', latitude: -0.3031, longitude: 36.0800 },
    { name: 'Machakos Police Station', code: 'MACHAKOS', county: 'Machakos', subCounty: 'Machakos Town', address: 'Machakos Town', phoneNumber: '+254-44-212-1000', email: 'machakos@police.go.ke', latitude: -1.5177, longitude: 37.2634 },
    { name: 'Kiambu Police Station', code: 'KIAMBU', county: 'Kiambu', subCounty: 'Kiambu Town', address: 'Kiambu Town', phoneNumber: '+254-66-202-2000', email: 'kiambu@police.go.ke', latitude: -1.1714, longitude: 36.8356 },
    { name: 'Thika Police Station', code: 'THIKA', county: 'Kiambu', subCounty: 'Thika Town', address: 'Kenyatta Highway, Thika', phoneNumber: '+254-67-303-0000', email: 'thika@police.go.ke', latitude: -1.0333, longitude: 37.0833 },
  ];

  console.log('📍 Creating stations...');
  const stations = [];
  for (const data of stationData) {
    const station = await prisma.station.upsert({
      where: { code: data.code },
      update: {},
      create: {
        id: cuid(),
        ...data,
        commander: null,
        capacity: Math.floor(Math.random() * 100) + 50,
        isActive: true,
      },
    });
    stations.push(station);
  }
  console.log(`✅ Created ${stations.length} police stations\n`);

  // Create Users with diverse roles
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const userRoles: UserRole[] = [
    'SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER', 'OCS', 'DETECTIVE',
    'TRAFFIC_OFFICER', 'GBV_OFFICER', 'RECORDS_OFFICER', 'OFFICER', 'CONSTABLE'
  ];

  const firstNames = ['John', 'Mary', 'Peter', 'Grace', 'David', 'Sarah', 'James', 'Lucy', 'Michael', 'Ann', 'Daniel', 'Jane', 'Joseph', 'Elizabeth', 'Samuel', 'Rebecca', 'Paul', 'Faith', 'Mark', 'Ruth', 'Simon', 'Esther', 'Patrick', 'Catherine', 'William'];
  const lastNames = ['Mwangi', 'Ochieng', 'Kamau', 'Akinyi', 'Kipchoge', 'Wanjiku', 'Otieno', 'Njeri', 'Maina', 'Adhiambo', 'Kibet', 'Nyambura', 'Mutua', 'Chebet', 'Omondi', 'Waithera', 'Korir', 'Wambui', 'Kimani', 'Achieng', 'Mugo', 'Wangari', 'Kiptoo', 'Njoroge', 'Chelangat'];
  const ranks = ['Commissioner', 'Chief Inspector', 'Inspector', 'Sergeant', 'Corporal', 'Constable'];
  const departments = ['Administration', 'CID', 'Traffic', 'Operations', 'GBV Unit', 'Records'];

  const users = [];
  
  // Create primary admin users
  const adminUsers = [
    {
      id: cuid(),
      email: 'admin@police.go.ke',
      name: 'System Administrator',
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      badgeNumber: 'ADMIN-001',
      phoneNumber: '+254-700-000000',
      stationId: stations[0].id,
      isActive: true,
      rank: 'Commissioner',
      department: 'Administration',
    },
    {
      id: cuid(),
      email: 'commander@police.go.ke',
      name: 'John Kamau',
      password: hashedPassword,
      role: UserRole.STATION_COMMANDER,
      badgeNumber: 'SC-001',
      phoneNumber: '+254-722-123456',
      stationId: stations[0].id,
      isActive: true,
      rank: 'Chief Inspector',
      department: 'Command',
    },
    {
      id: cuid(),
      email: 'detective@police.go.ke',
      name: 'Mary Wanjiku',
      password: hashedPassword,
      role: UserRole.DETECTIVE,
      badgeNumber: 'DET-001',
      phoneNumber: '+254-733-234567',
      stationId: stations[0].id,
      isActive: true,
      rank: 'Inspector',
      department: 'CID',
    },
    {
      id: cuid(),
      email: 'officer@police.go.ke',
      name: 'Peter Otieno',
      password: hashedPassword,
      role: UserRole.OFFICER,
      badgeNumber: 'OFC-001',
      phoneNumber: '+254-744-345678',
      stationId: stations[1].id,
      isActive: true,
      rank: 'Sergeant',
      department: 'Operations',
    },
  ];

  for (const userData of adminUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
    users.push(user);
  }

  // Create additional random users (50 more users across different stations)
  for (let i = 0; i < 50; i++) {
    const station = randomItem(stations);
    const role = randomItem(userRoles);
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const badgeNum = `${role.slice(0, 3)}-${String(i + 100).padStart(4, '0')}`;
    
    const user = await prisma.user.create({
      data: {
        id: cuid(),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@police.go.ke`,
        name: `${firstName} ${lastName}`,
        password: hashedPassword,
        role: role,
        badgeNumber: badgeNum,
        phoneNumber: `+254-7${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 900000 + 100000)}`,
        stationId: station.id,
        isActive: Math.random() > 0.1, // 90% active
        rank: randomItem(ranks),
        department: randomItem(departments),
      },
    });
    users.push(user);
  }

  console.log(`✅ Created ${users.length} users\n`);

  // Create 600 OB Entries with realistic data
  console.log('📋 Creating OB entries...');
  
  const categories: IncidentCategory[] = [
    'THEFT', 'ROBBERY', 'ASSAULT', 'MURDER', 'RAPE', 'DOMESTIC_VIOLENCE',
    'FRAUD', 'BURGLARY', 'TRAFFIC_ACCIDENT', 'KIDNAPPING', 'DRUG_RELATED',
    'CYBERCRIME', 'CORRUPTION', 'MISSING_PERSON', 'OTHER'
  ];
  
  const statuses: IncidentStatus[] = [
    'REPORTED', 'UNDER_INVESTIGATION', 'RESOLVED', 'CLOSED', 'TRANSFERRED'
  ];
  
  const incidentDescriptions: Record<IncidentCategory, string[]> = {
    THEFT: [
      'Mobile phone stolen from complainant in busy market area',
      'Wallet containing cash and ID documents stolen from pocket',
      'Motorcycle theft reported, suspect fled towards main highway',
      'Laptop stolen from vehicle parked at shopping center',
      'Theft of agricultural produce from farm during night hours',
      'Bicycle stolen from outside residence, chain cut',
      'Bag snatching incident near bus station',
      'Shoplifting at supermarket, suspect apprehended',
    ],
    ROBBERY: [
      'Armed robbery at M-Pesa shop, suspects escaped with cash',
      'Violent robbery targeting elderly person walking home',
      'Robbery with violence at petrol station, attendant injured',
      'Gang robbery targeting passengers in public transport vehicle',
      'Home invasion robbery, family held at gunpoint',
      'Robbery at construction site, tools and equipment stolen',
      'Daylight robbery at bank ATM, victim forced to withdraw',
    ],
    ASSAULT: [
      'Physical altercation outside entertainment joint, victim hospitalized',
      'Domestic assault case, victim sustained visible injuries',
      'Bar brawl resulting in serious injuries to multiple persons',
      'Assault with weapon, suspect known to complainant',
      'Group assault following land dispute in the area',
      'Assault by unknown persons, motive under investigation',
      'Workplace assault reported, investigation ongoing',
    ],
    BURGLARY: [
      'Break-in at residential house, electronics and valuables stolen',
      'Shop burglary during night hours, stock worth considerable amount stolen',
      'School burglary, computers and projectors stolen',
      'Church burglary, musical instruments and sound system taken',
      'Warehouse break-in, goods stolen',
      'Office burglary, documents and equipment missing',
      'Restaurant break-in, cash register emptied',
    ],
    TRAFFIC_ACCIDENT: [
      'Road traffic accident involving two vehicles, multiple injuries',
      'Hit and run accident, pedestrian seriously injured',
      'Motorcycle accident on slippery road, rider hospitalized',
      'Matatu overturned on sharp corner, several passengers injured',
      'Head-on collision between vehicles, investigating cause',
      'Single vehicle accident, driver suspected to be drunk',
      'Pedestrian knocked down at zebra crossing',
    ],
    FRAUD: [
      'Mobile money fraud reported, funds lost through scam',
      'Online shopping scam, goods not delivered after payment',
      'Employment scam, fake job offers targeting job seekers',
      'Land fraud case, fake title deed discovered',
      'Investment fraud scheme, multiple victims reported',
      'Identity theft and fraudulent transactions',
      'Bank fraud through phishing scheme',
    ],
    DRUG_RELATED: [
      'Suspected drug peddling activity reported in estate',
      'Cannabis cultivation discovered on farmland',
      'Drug trafficking suspect arrested with narcotics',
      'Suspected drug den raided, substances recovered',
      'Drug possession charge, suspect in custody',
      'Bhang smoking reported at public place',
      'Drug distribution network under investigation',
    ],
    DOMESTIC_VIOLENCE: [
      'Domestic violence case, victim received medical treatment',
      'Family dispute escalated to physical violence',
      'Child abuse case reported by concerned neighbor',
      'Domestic violence, victim seeking protection order',
      'Repeated domestic violence incidents at same household',
      'Spousal abuse reported, suspect arrested',
      'Domestic dispute mediation requested',
    ],
    MISSING_PERSON: [
      'Missing person report, last seen several days ago',
      'Child reported missing from home, search ongoing',
      'Elderly person with dementia missing since morning',
      'Teenager missing after school, family concerned',
      'Adult missing under suspicious circumstances',
      'Person missing after trip, phone switched off',
      'Vulnerable person reported missing, search intensified',
    ],
    OTHER: [
      'Public disturbance complaint from residents',
      'Noise complaint from entertainment establishment',
      'Stray animals causing damage to property',
      'Illegal dumping of waste reported',
      'Trespassing incident on private property',
      'Boundary dispute between neighbors',
      'Harassment complaint filed',
    ],
    MURDER: [
      'Suspected homicide case under investigation',
      'Body found with signs of violence, homicide suspected',
      'Murder investigation opened following death',
      'Fatal incident being investigated as murder',
      'Suspicious death, autopsy ordered',
      'Homicide suspect arrested, investigation ongoing',
      'Murder case, motive being established',
    ],
    RAPE: [
      'Sexual assault case reported, victim receiving medical care',
      'Rape case under investigation, suspect identified',
      'Sexual violence incident, medical examination conducted',
      'Sexual assault reported, counseling provided',
      'Rape investigation ongoing, evidence collected',
      'Sexual offense case, victim in protective care',
      'Defilement case reported, suspect arrested',
    ],
    KIDNAPPING: [
      'Abduction case reported, search underway',
      'Person reported kidnapped, ransom demanded',
      'Child abduction case, alert issued',
      'Kidnapping for ransom under investigation',
      'Forceful abduction reported by witnesses',
      'Kidnapping suspect arrested, victim rescued',
      'Attempted kidnapping thwarted by public',
    ],
    CYBERCRIME: [
      'Online fraud case reported, financial loss incurred',
      'Social media account hacking reported',
      'Cyber harassment and threats investigation',
      'Online scam targeting multiple victims',
      'Digital fraud involving fake websites',
      'Email phishing scam reported',
      'Cyberbullying case under investigation',
    ],
    CORRUPTION: [
      'Bribery allegation under investigation',
      'Corruption case involving public officials',
      'Misappropriation of funds reported',
      'Abuse of office allegations filed',
      'Fraudulent tender process reported',
      'Corruption in service delivery reported',
      'Embezzlement of public funds suspected',
    ],
  };

  const obEntries = [];
  const startDate = new Date('2023-01-01');
  const endDate = new Date('2024-11-08');
  
  for (let i = 0; i < 600; i++) {
    const station = randomItem(stations);
    const category = randomItem(categories);
    const status = randomItem(statuses);
    const reporterFirst = randomItem(firstNames);
    const reporterLast = randomItem(lastNames);
    const incidentDate = randomDate(startDate, endDate);
    const recordedBy = randomItem(users.filter(u => u.stationId === station.id || u.role === 'SUPER_ADMIN'));
    
    const descriptions = incidentDescriptions[category];
    const description = randomItem(descriptions);
    
    const year = incidentDate.getFullYear();
    const obNum = String(i + 1).padStart(5, '0');
    
    const entry = await prisma.occurrenceBook.create({
      data: {
        id: cuid(),
        obNumber: `${station.code}/${year}/${obNum}`,
        incidentDate: incidentDate,
        reportedDate: new Date(incidentDate.getTime() + Math.random() * 86400000), // Within 24 hours
        category: category,
        description: description,
        location: `${station.address} vicinity`,
        latitude: station.latitude ? station.latitude + (Math.random() - 0.5) * 0.05 : undefined,
        longitude: station.longitude ? station.longitude + (Math.random() - 0.5) * 0.05 : undefined,
        status: status,
        reportedBy: `${reporterFirst} ${reporterLast}`,
        contactNumber: `+254-7${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 900000 + 100000)}`,
        stationId: station.id,
        recordedById: recordedBy.id,
        evidenceFiles: [],
        witnesses: Math.random() > 0.7 ? { count: Math.floor(Math.random() * 5) + 1, names: [] } : null,
        suspects: Math.random() > 0.6 ? { count: Math.floor(Math.random() * 3) + 1, descriptions: [] } : null,
      },
    });
    obEntries.push(entry);
    
    if ((i + 1) % 100 === 0) {
      console.log(`   Created ${i + 1}/600 OB entries...`);
    }
  }

  console.log(`✅ Created ${obEntries.length} OB entries\n`);

  // Create Cases from some OB entries
  console.log('⚖️  Creating cases...');
  const casesToCreate = randomItems(obEntries, 100); // Convert 100 OB entries to cases
  const caseStatuses: CaseStatus[] = ['OPEN', 'UNDER_INVESTIGATION', 'PENDING_TRIAL', 'IN_COURT', 'CLOSED', 'DISMISSED'];
  
  const cases = [];
  for (let i = 0; i < casesToCreate.length; i++) {
    const obEntry = casesToCreate[i];
    const assignedOfficer = randomItem(users.filter(u => 
      (u.role === 'DETECTIVE' || u.role === 'OCS' || u.role === 'STATION_COMMANDER') && 
      u.stationId === obEntry.stationId
    ));
    
    const caseRecord = await prisma.case.create({
      data: {
        id: cuid(),
        caseNumber: `${obEntry.obNumber.replace(/\//g, '-')}-CASE`,
        title: `${obEntry.category} Investigation`,
        description: obEntry.description,
        category: obEntry.category,
        status: randomItem(caseStatuses),
        priority: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MEDIUM' : 'LOW',
        stationId: obEntry.stationId,
        assignedToId: assignedOfficer?.id,
        createdById: obEntry.recordedById,
        courtDate: Math.random() > 0.7 ? randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) : null,
      },
    });
    cases.push(caseRecord);
    
    // Link case to OB entry
    await prisma.occurrenceBook.update({
      where: { id: obEntry.id },
      data: { caseId: caseRecord.id },
    });
  }
  console.log(`✅ Created ${cases.length} cases\n`);

  // Create Criminal Records
  console.log('👤 Creating criminal records...');
  
  const criminalData = [
    { firstName: 'Michael', middleName: 'John', lastName: 'Odhiambo', alias: ['Mike', 'Mikey'], dateOfBirth: new Date('1990-05-15'), gender: 'Male', idNumber: '12345678', isWanted: true, wantedReason: 'Suspected of involvement in multiple robbery cases' },
    { firstName: 'Janet', middleName: 'Wanjiru', lastName: 'Mutua', alias: ['Jane'], dateOfBirth: new Date('1988-03-22'), gender: 'Female', idNumber: '23456789', isWanted: false, wantedReason: null },
    { firstName: 'Kevin', middleName: 'Kiprono', lastName: 'Kipchoge', alias: ['Kevo', 'KK'], dateOfBirth: new Date('1992-08-30'), gender: 'Male', idNumber: '34567890', isWanted: true, wantedReason: 'Drug trafficking and distribution in coastal region' },
    { firstName: 'Grace', middleName: 'Nyambura', lastName: 'Wanjiru', alias: ['Gracie'], dateOfBirth: new Date('1985-12-10'), gender: 'Female', idNumber: '45678901', isWanted: false, wantedReason: null },
    { firstName: 'Samuel', middleName: 'Kipkorir', lastName: 'Korir', alias: ['Sam', 'Sammy K'], dateOfBirth: new Date('1995-01-25'), gender: 'Male', idNumber: '56789012', isWanted: true, wantedReason: 'Armed robbery targeting transport vehicles' },
    { firstName: 'Patrick', middleName: 'Mwangi', lastName: 'Kariuki', alias: ['Pato'], dateOfBirth: new Date('1987-07-18'), gender: 'Male', idNumber: '67890123', isWanted: false, wantedReason: null },
    { firstName: 'Alice', middleName: 'Akinyi', lastName: 'Omondi', alias: ['Ally'], dateOfBirth: new Date('1993-11-05'), gender: 'Female', idNumber: '78901234', isWanted: true, wantedReason: 'Fraud and identity theft schemes' },
    { firstName: 'Dennis', middleName: 'Otieno', lastName: 'Odhiambo', alias: ['Deno', 'DJ'], dateOfBirth: new Date('1991-04-12'), gender: 'Male', idNumber: '89012345', isWanted: false, wantedReason: null },
    { firstName: 'Christine', middleName: 'Chebet', lastName: 'Kibet', alias: ['Chris'], dateOfBirth: new Date('1989-09-28'), gender: 'Female', idNumber: '90123456', isWanted: true, wantedReason: 'Suspected involvement in cybercrime ring' },
    { firstName: 'Robert', middleName: 'Njoroge', lastName: 'Kamau', alias: ['Rob', 'Bobby'], dateOfBirth: new Date('1994-02-14'), gender: 'Male', idNumber: '01234567', isWanted: false, wantedReason: null },
  ];

  const criminals = [];
  for (const data of criminalData) {
    const station = randomItem(stations);
    const criminal = await prisma.criminal.upsert({
      where: { idNumber: data.idNumber },
      update: {},
      create: {
        id: cuid(),
        ...data,
        nationality: 'Kenyan',
        phoneNumber: `+254-7${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 900000 + 100000)}`,
        address: `${randomItem(['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Nakuru'])}, Kenya`,
        lastKnownLocation: station.address,
        stationId: station.id,
        criminalHistory: [
          {
            date: randomDate(new Date('2020-01-01'), new Date('2024-01-01')).toISOString(),
            offense: randomItem(['Theft', 'Assault', 'Fraud', 'Drug Possession', 'Burglary']),
            details: 'Previous incident recorded',
            outcome: randomItem(['Released on bail', 'Fine paid', 'Community service', 'Convicted']),
          },
        ],
      },
    });
    criminals.push(criminal);
  }
  console.log(`✅ Created ${criminals.length} criminal records\n`);

  // Create Vehicles
  console.log('🚔 Creating police vehicles...');
  
  const vehicleMakes = ['Toyota', 'Nissan', 'Mitsubishi', 'Isuzu', 'Land Rover'];
  const vehicleModels = ['Land Cruiser', 'Patrol', 'Hilux', 'Pajero', 'D-Max', 'Defender'];
  const vehicleColors = ['White', 'Blue', 'Green', 'Silver', 'Black'];
  
  const vehicles = [];
  for (let i = 0; i < 50; i++) {
    const station = randomItem(stations);
    const assignedOfficer = randomItem(users.filter(u => u.stationId === station.id));
    
    const vehicle = await prisma.vehicle.create({
      data: {
        id: cuid(),
        registrationNumber: `KCA-${String(i + 1).padStart(3, '0')}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        make: randomItem(vehicleMakes),
        model: randomItem(vehicleModels),
        year: Math.floor(Math.random() * 10) + 2015,
        color: randomItem(vehicleColors),
        stationId: station.id,
        assignedTo: Math.random() > 0.3 ? assignedOfficer.id : null,
        mileage: Math.floor(Math.random() * 100000) + 10000,
        lastService: randomDate(new Date('2024-01-01'), new Date()),
        nextService: randomDate(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
        status: Math.random() > 0.1 ? 'ACTIVE' : randomItem(['MAINTENANCE', 'INACTIVE']),
        fuelConsumption: [],
      },
    });
    vehicles.push(vehicle);
  }
  console.log(`✅ Created ${vehicles.length} vehicles\n`);

  // Create Alerts/APBs
  console.log('🚨 Creating alerts and APBs...');
  
  const alertTitles = [
    'Armed Robbery Suspects at Large',
    'Missing Person - Elderly Male',
    'Stolen Vehicle Alert',
    'Wanted: Murder Suspect',
    'Drug Trafficking Network Alert',
    'Child Abduction - Amber Alert',
    'Bank Fraud Syndicate Warning',
    'Terrorist Threat Assessment',
    'Cybercrime Gang Activity',
    'Livestock Theft Pattern Alert',
  ];

  const alertTypes = ['CRITICAL', 'WARNING', 'INFO', 'APB'] as const;
  const alertPriorities = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const;

  const alerts = [];
  for (let i = 0; i < 20; i++) {
    const station = randomItem(stations);
    const creator = randomItem(users.filter(u => ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER', 'OCS'].includes(u.role)));
    
    const alert = await prisma.alert.create({
      data: {
        title: randomItem(alertTitles),
        message: `Detailed alert information regarding this incident. All officers should be on high alert and report any relevant sightings or information immediately.`,
        type: randomItem(alertTypes),
        priority: randomItem(alertPriorities),
        scope: Math.random() > 0.5 ? 'STATION' : 'COUNTY',
        targetRoles: randomItems(['OFFICER', 'DETECTIVE', 'TRAFFIC_OFFICER', 'CONSTABLE'], Math.floor(Math.random() * 3) + 1),
        createdById: creator.id,
        stationId: station.id,
        isActive: Math.random() > 0.3,
        expiresAt: Math.random() > 0.5 ? randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) : null,
      },
    });
    alerts.push(alert);
  }
  console.log(`✅ Created ${alerts.length} alerts\n`);

  // Create Internal Messages
  console.log('💬 Creating internal messages...');
  
  const messageSubjects = [
    'Case Update Required',
    'Equipment Request',
    'Meeting Scheduled',
    'Training Session Notification',
    'Vehicle Maintenance Schedule',
    'Report Submission Reminder',
    'Patrol Route Assignment',
    'Evidence Collection Protocol',
    'Community Policing Initiative',
    'Budget Review Meeting',
  ];

  const messages = [];
  for (let i = 0; i < 100; i++) {
    const sender = randomItem(users);
    const receiver = randomItem(users.filter(u => u.id !== sender.id && u.stationId === sender.stationId));
    
    const message = await prisma.internalMessage.create({
      data: {
        senderId: sender.id,
        receiverId: receiver.id,
        subject: randomItem(messageSubjects),
        content: `This is an internal communication regarding official police business. Please review and respond accordingly.`,
        status: randomItem(['SENT', 'DELIVERED', 'READ']),
        priority: randomItem(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
        isRead: Math.random() > 0.4,
        readAt: Math.random() > 0.5 ? randomDate(new Date('2024-01-01'), new Date()) : null,
        stationId: sender.stationId,
      },
    });
    messages.push(message);
  }
  console.log(`✅ Created ${messages.length} internal messages\n`);

  // Create Notifications
  console.log('🔔 Creating notifications...');
  
  const notificationTypes = ['CASE_ASSIGNED', 'ALERT', 'MESSAGE', 'SYSTEM', 'REMINDER'];
  
  const notifications = [];
  for (let i = 0; i < 150; i++) {
    const user = randomItem(users);
    
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        title: randomItem(['New Case Assigned', 'Alert Update', 'New Message', 'System Notice', 'Reminder']),
        message: 'You have a new notification requiring your attention.',
        type: randomItem(notificationTypes),
        isRead: Math.random() > 0.5,
        readAt: Math.random() > 0.6 ? randomDate(new Date('2024-01-01'), new Date()) : null,
      },
    });
    notifications.push(notification);
  }
  console.log(`✅ Created ${notifications.length} notifications\n`);

  // Create Audit Logs
  console.log('📝 Creating audit logs...');
  
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW'];
  const entities = ['User', 'Station', 'OccurrenceBook', 'Case', 'Criminal', 'Vehicle', 'Alert'];
  
  const auditLogs = [];
  for (let i = 0; i < 200; i++) {
    const user = randomItem(users);
    
    const auditLog = await prisma.auditLog.create({
      data: {
        id: cuid(),
        userId: user.id,
        action: randomItem(actions),
        entity: randomItem(entities),
        entityId: cuid(),
        changes: {
          before: { status: 'old_value' },
          after: { status: 'new_value' },
        },
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    auditLogs.push(auditLog);
  }
  console.log(`✅ Created ${auditLogs.length} audit logs\n`);

  // Create Public Reports
  console.log('📢 Creating public reports...');
  
  const publicReports = [];
  for (let i = 0; i < 50; i++) {
    const station = randomItem(stations);
    const reporterFirst = randomItem(firstNames);
    const reporterLast = randomItem(lastNames);
    
    const report = await prisma.publicReport.create({
      data: {
        category: randomItem(categories),
        description: `Public report submitted through online portal. ${randomItem(incidentDescriptions[randomItem(categories)])}`,
        location: `${station.county}, ${station.subCounty}`,
        reporterName: Math.random() > 0.3 ? `${reporterFirst} ${reporterLast}` : 'Anonymous',
        reporterEmail: Math.random() > 0.3 ? `${reporterFirst.toLowerCase()}@email.com` : null,
        reporterPhone: `+254-7${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 900000 + 100000)}`,
        isAnonymous: Math.random() > 0.7,
        status: randomItem(['PENDING', 'REVIEWED', 'ASSIGNED', 'CONVERTED', 'CLOSED']),
        assignedToStation: Math.random() > 0.3 ? station.id : null,
      },
    });
    publicReports.push(report);
  }
  console.log(`✅ Created ${publicReports.length} public reports\n`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ DATABASE SEEDING COMPLETED SUCCESSFULLY! ✨');
  console.log('='.repeat(60));
  console.log('\n📊 Summary:');
  console.log('━'.repeat(60));
  console.log(`📍 Stations:           ${stations.length}`);
  console.log(`👥 Users:              ${users.length}`);
  console.log(`📋 OB Entries:         ${obEntries.length}`);
  console.log(`⚖️  Cases:              ${cases.length}`);
  console.log(`👤 Criminals:          ${criminals.length}`);
  console.log(`🚔 Vehicles:           ${vehicles.length}`);
  console.log(`🚨 Alerts:             ${alerts.length}`);
  console.log(`💬 Internal Messages:  ${messages.length}`);
  console.log(`🔔 Notifications:      ${notifications.length}`);
  console.log(`📝 Audit Logs:         ${auditLogs.length}`);
  console.log(`📢 Public Reports:     ${publicReports.length}`);
  console.log('━'.repeat(60));
  console.log(`\n🔐 Default Login Credentials:`);
  console.log('━'.repeat(60));
  console.log(`Email:    admin@police.go.ke`);
  console.log(`Password: password123`);
  console.log('━'.repeat(60));
  console.log(`\n🧪 Test Accounts:`);
  console.log('  • commander@police.go.ke   (Station Commander)');
  console.log('  • detective@police.go.ke   (Detective)');
  console.log('  • officer@police.go.ke     (Officer)');
  console.log('  All passwords: password123\n');
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
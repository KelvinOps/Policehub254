// scripts/add-ob-entries.ts
// Run this with: npx tsx scripts/add-ob-entries.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to get random item from array
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

async function main() {
  console.log('Starting to add 300 OB entries from across Kenya...\n');

  // Fetch existing stations and users
  const stations = await prisma.station.findMany();
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: ['OFFICER', 'DETECTIVE', 'RECORDS_OFFICER', 'STATION_COMMANDER', 'OCS']
      }
    }
  });

  if (stations.length === 0) {
    console.error('No stations found! Please run the seed first.');
    return;
  }

  if (users.length === 0) {
    console.error('No users found! Please run the seed first.');
    return;
  }

  console.log(`Found ${stations.length} stations and ${users.length} users\n`);

  // Common Kenyan names
  const firstNames = ['John', 'Mary', 'Peter', 'Grace', 'David', 'Sarah', 'James', 'Lucy', 'Michael', 'Ann', 'Daniel', 'Jane', 'Joseph', 'Elizabeth', 'Samuel', 'Rebecca', 'Paul', 'Faith', 'Mark', 'Ruth', 'Stephen', 'Catherine', 'Patrick', 'Agnes', 'Robert', 'Margaret', 'William', 'Rose', 'Francis', 'Alice', 'George', 'Joyce', 'Charles', 'Eunice', 'Henry', 'Beatrice', 'Moses', 'Esther', 'Thomas', 'Hannah'];
  
  const lastNames = ['Mwangi', 'Ochieng', 'Kamau', 'Akinyi', 'Kipchoge', 'Wanjiku', 'Otieno', 'Njeri', 'Maina', 'Adhiambo', 'Kibet', 'Nyambura', 'Mutua', 'Chebet', 'Omondi', 'Waithera', 'Korir', 'Wambui', 'Kimani', 'Achieng', 'Nganga', 'Auma', 'Wekesa', 'Nekesa', 'Juma', 'Nafula', 'Kariuki', 'Njoroge', 'Kiptoo', 'Chepkwony', 'Ouma', 'Onyango', 'Kiplagat', 'Muthoni', 'Wafula', 'Mugo', 'Tarus', 'Chepkoech'];

  // Realistic Kenyan locations and incidents
  const kenyanLocations = {
    nairobi: ['Eastleigh', 'Kibera', 'Ngara', 'Westlands', 'CBD', 'Kasarani', 'Embakasi', 'Langata', 'Dagoretti', 'Makadara', 'Kamukunji', 'Kilimani', 'Karen', 'Roysambu', 'Ruaraka'],
    mombasa: ['Likoni', 'Nyali', 'Bamburi', 'Changamwe', 'Kisauni', 'Mvita', 'Tudor', 'Ganjoni', 'Kongowea', 'Mikindani'],
    kisumu: ['Kondele', 'Mamboleo', 'Nyalenda', 'Obunga', 'Migosi', 'Nyamasaria', 'Manyatta', 'Lolwe'],
    nakuru: ['London', 'Section 58', 'Free Area', 'Kaptembwa', 'Lanet', 'Bondeni', 'Kivumbini'],
    eldoret: ['Langas', 'Pioneer', 'Huruma', 'Kapsoya', 'West Indies', 'Racecourse', 'Elgon View'],
    general: ['Main Road', 'Town Center', 'Market Area', 'Bus Station', 'Matatu Stage', 'Estate', 'Shopping Center', 'Village', 'Highway', 'Residential Area']
  };

  // Detailed Kenyan incident scenarios
  const incidentData = {
    THEFT: [
      'Mobile phone stolen at busy matatu stage, suspect disappeared into crowd',
      'Wallet containing KES 15,000 stolen from complainant at M-Pesa shop',
      'Motorcycle registration KBX 456Y stolen from parking, owner reported immediately',
      'Laptop bag stolen from vehicle at shopping mall parking lot',
      'Shoplifting at Tuskys Supermarket, suspect apprehended by security',
      'Bicycle stolen from outside church compound during service',
      'Household electronics stolen during day when complainant was at work',
      'Handbag snatched by boda boda rider at traffic lights',
      'Chicken stolen from homestead overnight, suspect unknown',
      'Tools stolen from construction site, watchman reports breach',
      'Gas cylinder stolen from hotel kitchen area',
      'Clothes stolen from washing line in estate',
      'Spare tire stolen from vehicle parked overnight',
      'Shop attendant stole KES 20,000 from till, CCTV evidence available',
      'Agricultural produce stolen from farm during harvest season',
    ],
    ROBBERY: [
      'Armed robbery at M-Pesa agent, three suspects with crude weapons took KES 80,000',
      'Violent mugging of pedestrian walking home after dark, phone and cash stolen',
      'Petrol station robbery, attendant held at knife-point, daily collections taken',
      'Matatu passengers robbed by gang of four on Nairobi-Thika highway',
      'Home invasion in gated estate, family tied up, valuables taken',
      'Hardware shop robbery during business hours, owner injured',
      'Bank customer robbed immediately after withdrawal, suspects followed from bank',
      'Boda boda robbery gang operating on rural roads, multiple victims',
      'Shop owner robbed at gunpoint during closing time',
      'Pharmacy robbed, drugs and cash stolen by armed suspects',
    ],
    ASSAULT: [
      'Bar brawl at local club, two patrons hospitalized with serious injuries',
      'Assault case arising from land boundary dispute between neighbors',
      'Bodily harm inflicted during political rally, victim treated at hospital',
      'Fight at football match, rival fans clashed, multiple injuries',
      'Assault with weapon (panga) during family inheritance dispute',
      'Bodaboda operator assaulted by traffic police, injury sustained',
      'Woman assaulted by jealous ex-partner, protection order sought',
      'Group assault following accident dispute on highway',
      'Bar fight over unpaid debt, bottle used as weapon',
      'Assault during land eviction, multiple victims',
    ],
    DOMESTIC_VIOLENCE: [
      'Domestic violence, wife beaten by husband over household finances, medical treatment given',
      'GBV case, woman assaulted and locked in house for two days',
      'Child abuse by step-parent, neighbors reported to chief',
      'Husband threatened wife with panga, woman seeking refuge at rescue center',
      'Repeated domestic violence incidents, victim finally reported after years of abuse',
      'Economic abuse, husband denies wife access to family resources',
      'Elderly parent abused by adult children over property',
      'Domestic worker abused by employer, labour office notified',
    ],
    BURGLARY: [
      'House break-in during night, TV, laptop and cash stolen through window',
      'Shop burglary, padlock broken, stock worth KES 200,000 stolen',
      'School burglary, 15 computers stolen from computer lab',
      'Church broken into, offering money and sound system stolen',
      'Warehouse break-in, goods worth KES 500,000 taken by organized gang',
      'Office burglary over weekend, safe broken into, documents missing',
      'Hospital pharmacy burgled, controlled drugs stolen',
      'Factory burglary, copper wiring and equipment stolen',
    ],
    TRAFFIC_ACCIDENT: [
      'Multi-vehicle accident on Mombasa Road near Mlolongo, 5 injured',
      'Hit and run at zebra crossing, pedestrian seriously injured, vehicle fled',
      'Motorcycle accident on wet road near Salgaa, rider died on arrival at hospital',
      'Matatu overturned on Naivasha-Nakuru road, 12 passengers injured',
      'Head-on collision between trailer and personal car, 3 fatalities on Kisii-Kisumu road',
      'Boda boda knocked by speeding car, rider hospitalized with fractures',
      'School van accident, 8 children injured, driver arrested for reckless driving',
      'Lorry lost control descending Timboroa escarpment, crashed into ditch',
    ],
    FRAUD: [
      'Mobile money fraud, victim lost KES 65,000 through fake Fuliza message',
      'Online job scam, 20 youth defrauded KES 5,000 each for fake Gulf jobs',
      'Land fraud, fake title deed used to sell public land in Kiambu',
      'Investment scam, Ponzi scheme collapsed, hundreds lost savings',
      'Fake goods supplied instead of ordered stock, supplier cannot be traced',
      'Tender fraud at county government, investigation opened',
      'Impersonation of KPLC official, collected fake bills from residents',
      'Banking fraud, ATM skimming device discovered at local bank',
      'Fake gold scam at JKIA, foreigners defrauded millions',
      'Pyramid scheme targeting churches, pastor involved',
    ],
    DRUG_RELATED: [
      'Drug peddling in estate, suspect arrested with bhang worth KES 50,000',
      'Cannabis sativa plantation discovered in Aberdare forest, 2 suspects arrested',
      'Drug trafficking suspect intercepted at roadblock with heroin concealed in vehicle',
      'Students found smoking marijuana at school, parents summoned',
      'Drug den raided in Eastleigh, multiple arrests made, drugs seized',
      'Cocaine trafficking, suspect arrested at airport with drugs in luggage',
      'Illicit brew (changaa) den destroyed, brew poured out',
      'Prescription drug abuse, chemist selling controlled drugs without prescription',
    ],
    MISSING_PERSON: [
      'Man missing for 5 days after leaving for work, phone switched off',
      '7-year-old child missing since yesterday afternoon, last seen playing near home',
      'Elderly woman with dementia wandered from home, family searching',
      'Form 3 student missing after school, suspected to have run away',
      'Adult missing under suspicious circumstances, car found abandoned',
      'Toddler missing from market area, police searching with sniffer dogs',
      'University student missing for a week, last seen at campus',
    ],
    MURDER: [
      'Body of adult male found in bush with multiple stab wounds',
      'Woman killed in suspected domestic dispute, husband arrested',
      'Fatal stabbing outside bar after argument over debt',
      'Body retrieved from Nairobi River, investigations ongoing',
      'Man killed in mob justice after suspected theft',
      'Double murder in house, elderly couple found dead',
      'Hit and run fatality, victim died at scene',
    ],
    RAPE: [
      'Sexual assault reported, 16-year-old girl defiled by neighbor',
      'Rape case, victim receiving counseling and medical care at gender violence center',
      'Gang rape reported along dark path, three suspects identified',
      'Defilement case, minor victim, suspect arrested and detained',
      'Sexual violence at workplace, suspect is employer',
    ],
    KIDNAPPING: [
      'Businessman kidnapped outside office, ransom of KES 5 million demanded',
      'Child abduction attempt near school, suspect arrested by members of public',
      'Woman abducted by estranged husband, police rescue operation successful',
      'Trader kidnapped after bank withdrawal, held for three days',
    ],
    CYBERCRIME: [
      'SIM swap fraud, victim lost KES 100,000 from M-Pesa account',
      'WhatsApp account hacked, used to defraud contacts',
      'Online shopping scam, goods never delivered after payment',
      'Fake Safaricom promotion SMS used to steal M-Pesa PIN',
      'Social media blackmail, intimate photos used to extort money',
      'Email phishing targeting company employees, sensitive data stolen',
    ],
    CORRUPTION: [
      'Police officer arrested for demanding bribe at roadblock',
      'County official accused of soliciting kickback for tender award',
      'Bribery allegation at licensing office, complainant recorded conversation',
      'Examination cheating scandal, school principal arrested',
      'Fake job recruitment at government ministry, money collected',
    ],
    OTHER: [
      'Noise pollution from bar, neighbors complain to police',
      'Stray dogs attacking residents, county government notified',
      'Illegal garbage dumping in residential area',
      'Trespassing on private property, caretaker reports',
      'Threatening messages received by complainant',
      'Dispute over parking space escalated, police called',
      'Counterfeit goods seized at market, trader arrested',
      'Illegal water connection discovered, Kenya Water notified',
    ],
  };

  const categories = Object.keys(incidentData) as Array<keyof typeof incidentData>;
  const statuses: Array<'REPORTED' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'CLOSED' | 'TRANSFERRED'> = [
    'REPORTED', 
    'UNDER_INVESTIGATION', 
    'RESOLVED', 
    'CLOSED', 
    'TRANSFERRED'
  ];

  // Date range: Last 24 months to today
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 24);
  const endDate = new Date();

  const createdEntries = [];

  for (let i = 0; i < 300; i++) {
    try {
      const station = randomItem(stations);
      const category = randomItem(categories);
      const status = randomItem(statuses);
      const user = randomItem(users);
      
      // Get incident description
      const descriptions = incidentData[category];
      const description = randomItem(descriptions);
      
      // Generate location based on station county
      let location = '';
      const countyLower = station.county.toLowerCase();
      
      if (countyLower.includes('nairobi')) {
        location = `${randomItem(kenyanLocations.nairobi)}, ${station.county}`;
      } else if (countyLower.includes('mombasa')) {
        location = `${randomItem(kenyanLocations.mombasa)}, ${station.county}`;
      } else if (countyLower.includes('kisumu')) {
        location = `${randomItem(kenyanLocations.kisumu)}, ${station.county}`;
      } else if (countyLower.includes('nakuru')) {
        location = `${randomItem(kenyanLocations.nakuru)}, ${station.county}`;
      } else if (countyLower.includes('uasin gishu') || countyLower.includes('eldoret')) {
        location = `${randomItem(kenyanLocations.eldoret)}, ${station.county}`;
      } else {
        location = `${randomItem(kenyanLocations.general)}, ${station.subCounty}, ${station.county}`;
      }

      // Generate reporter name
      const firstName = randomItem(firstNames);
      const lastName = randomItem(lastNames);
      const reporterName = `${firstName} ${lastName}`;

      // Generate phone number (Kenyan format)
      const phonePrefix = randomItem(['072', '073', '074', '075', '076', '077', '078', '079', '071']);
      const phoneNumber = `+254-${phonePrefix.substring(1)}-${Math.floor(Math.random() * 900000 + 100000)}`;

      // Generate incident date
      const incidentDate = randomDate(startDate, endDate);
      const reportedDate = new Date(incidentDate);
      reportedDate.setHours(reportedDate.getHours() + Math.floor(Math.random() * 48)); // Reported within 48 hours

      // Generate OB Number
      const year = incidentDate.getFullYear();
      const existingCount = await prisma.occurrenceBook.count({
        where: {
          stationId: station.id,
          incidentDate: {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1)
          }
        }
      });
      const obNum = String(existingCount + 1).padStart(5, '0');
      const obNumber = `${station.code}/${year}/${obNum}`;

      // Add some variance to coordinates if station has them
      let latitude = station.latitude;
      let longitude = station.longitude;
      if (latitude && longitude) {
        latitude = latitude + (Math.random() - 0.5) * 0.05;
        longitude = longitude + (Math.random() - 0.5) * 0.05;
      }

      // Create OB Entry
      const entry = await prisma.occurrenceBook.create({
        data: {
          obNumber,
          incidentDate,
          reportedDate,
          category,
          description,
          location,
          latitude,
          longitude,
          status,
          reportedBy: reporterName,
          contactNumber: phoneNumber,
          stationId: station.id,
          recordedById: user.id,
        },
      });

      createdEntries.push(entry);

      // Log progress every 50 entries
      if ((i + 1) % 50 === 0) {
        console.log(`✓ Created ${i + 1}/300 OB entries...`);
      }

    } catch (error) {
      console.error(`Error creating entry ${i + 1}:`, error);
    }
  }

  console.log(`\n✅ Successfully created ${createdEntries.length} OB entries!\n`);

  // Show summary by category
  const summary: Record<string, number> = {};
  for (const entry of createdEntries) {
    summary[entry.category] = (summary[entry.category] || 0) + 1;
  }

  console.log('📊 Summary by Category:');
  Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count} entries`);
    });

  console.log('\n📍 Counties covered:');
  const counties = new Set(stations.map(s => s.county));
  console.log(`   ${counties.size} counties with active stations\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error during execution:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
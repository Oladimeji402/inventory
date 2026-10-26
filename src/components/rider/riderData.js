/**
 * Rider App Production Mock Data
 * Comprehensive dataset covering Okada, Maruwa, and Taxi/Car dispatches,
 * day-to-day rides, quick errands, school-run recurring contracts, and earnings.
 */

export const RIDER_VEHICLE_PROFILES = [
  {
    id: 'okada',
    name: 'Okada Express',
    emoji: '🏍️',
    label: 'Motorcycle',
    registration: 'KJA-482-XD (Yamaha YBR 125cc)',
    badge: 'Express Corridor Specialist',
    safetyTag: 'DOT Helmet & Hi-Vis Inspected'
  },
  {
    id: 'maruwa',
    name: 'Maruwa Captain',
    emoji: '🛺',
    label: 'Keke Napep',
    registration: 'LND-889-BB (TVS King 200cc)',
    badge: 'School-Run Guardian Certified',
    safetyTag: 'Rain Curtains & Passenger Seatbelts'
  },
  {
    id: 'car',
    name: 'Taxi Chauffeur',
    emoji: '🚗',
    label: 'Comfort Car',
    registration: 'LSR-554-EF (Toyota Corolla AC)',
    badge: 'Executive & Family Chauffeur',
    safetyTag: 'Air Conditioned · Child Safety Locks'
  }
];

export const INITIAL_DISPATCHES = [
  {
    orderId: 'RIDE-1042',
    tripType: 'ride',
    vehicleType: 'okada',
    title: 'Commuter Express Ride',
    customerName: 'Bolanle Adeleke',
    customerPhone: '+234 803 291 0029',
    customerRating: 4.94,
    pickupLocation: 'Ikeja Underbridge (Near Post Office)',
    pickupAddress: 'Ikeja Underbridge, Awolowo Way, Ikeja',
    dropoffLocation: 'Allen Avenue (First Bank Junction)',
    dropoffAddress: '88 Allen Avenue, Ikeja',
    distanceKm: '2.8 km',
    estimatedMinutes: 12,
    fare: 1400,
    tip: 200,
    notes: 'Standing at the post office gate. Wearing a black blazer. Need quick drop.',
    counterBids: [1600, 1800, 2000],
    otp: '4821',
    isUrgent: true,
    corridor: 'Ikeja GRA & Allen'
  },
  {
    orderId: 'ERRAND-309',
    tripType: 'errand',
    vehicleType: 'maruwa',
    title: 'Market Run & Food Stuff Errand',
    customerName: 'Mrs. Folake Oshodi',
    customerPhone: '+234 802 119 4482',
    customerRating: 4.98,
    pickupLocation: 'Oyingbo Market Gate 2',
    pickupAddress: 'Muritala Muhammed Way, Ebute Metta',
    dropoffLocation: 'Surulere (Adelabu Street)',
    dropoffAddress: '14 Adelabu Street, off Masha, Surulere',
    distanceKm: '4.5 km',
    estimatedMinutes: 20,
    fare: 2600,
    tip: 400,
    notes: 'Picking 3 medium baskets of fresh tomatoes and yam. Trunk space needed.',
    counterBids: [2900, 3200, 3500],
    otp: '6192',
    isUrgent: false,
    corridor: 'Yaba & Surulere'
  },
  {
    orderId: 'ORD-9821',
    tripType: 'delivery',
    vehicleType: 'okada',
    title: 'Prescription Pharmacy Dispatch',
    storeName: 'Apex Health Pharmacy',
    storeAddress: 'Plot 12, Isaac John St, Ikeja GRA',
    storePhone: '+234 803 291 0029',
    customerName: 'Amara Kalu',
    customerAddress: 'Apt 4B, Admiralty Way, Lekki Phase 1',
    customerPhone: '+234 802 119 4482',
    distanceKm: '2.4 km',
    estimatedMinutes: 18,
    fare: 1850,
    tip: 300,
    itemsSummary: '1x Amoxicillin 500mg, 1x Vitamin C 1000mg',
    notes: 'Thermal dispatch pouch required. Fragile medicine bottles.',
    counterBids: [2100, 2400, 2800],
    otp: '3819',
    isUrgent: false,
    corridor: 'Ikeja GRA'
  },
  {
    orderId: 'RIDE-2055',
    tripType: 'ride',
    vehicleType: 'car',
    title: 'Comfort AC Airport Commute',
    customerName: 'Dr. Femi Doherty',
    customerPhone: '+234 803 445 6677',
    customerRating: 5.0,
    pickupLocation: 'Oduduwa Crescent, Ikeja GRA',
    pickupAddress: 'Plot 8, Oduduwa Crescent, Ikeja GRA',
    dropoffLocation: 'Murtala Muhammed Airport (MMA2)',
    dropoffAddress: 'Domestic Terminal 2, Ikeja Airport Road',
    distanceKm: '5.2 km',
    estimatedMinutes: 22,
    fare: 4500,
    tip: 1000,
    notes: '2 medium suitcases for airport drop. AC required.',
    counterBids: [5000, 5500, 6000],
    otp: '7214',
    isUrgent: true,
    corridor: 'Ikeja & Airport'
  }
];

export const SCHOOL_CONTRACTS = [
  {
    id: 'SCH-701',
    family: 'The Balogun Family',
    parentName: 'Engr. Dapo Balogun',
    parentPhone: '+234 803 555 1201',
    parentRating: 4.97,
    corridor: 'Ikeja GRA ➔ Maryland',
    homePickup: 'Plot 14, Sura Mogaji St, Ilupeju',
    schoolDestination: 'Corona School, Gbagada / Maryland Campus',
    childrenSummary: '2 Kids (David 8 yrs, Nicole 10 yrs)',
    schedule: 'Monday to Friday (Both Ways)',
    morningTime: '7:15 AM Pickup',
    afternoonTime: '2:45 PM Pickup',
    vehicleRequested: 'maruwa',
    vehicleLabel: 'Maruwa (Keke)',
    weeklyRate: 25000,
    monthlyRate: 95000,
    securityTerms: [
      'Daily 4-digit Parent SMS Handshake OTP',
      'School security gate pass issued by school',
      'Direct parent WhatsApp live check-in',
      'Guaranteed Friday weekly escrow cashout'
    ],
    status: 'open_for_bidding'
  },
  {
    id: 'SCH-702',
    family: 'The Okonkwo Family',
    parentName: 'Barrister Nneka Okonkwo',
    parentPhone: '+234 802 777 9922',
    parentRating: 4.99,
    corridor: 'Lekki Phase 1 ➔ Ikoyi',
    homePickup: 'Block 8, Admiralty Road, Lekki Phase 1',
    schoolDestination: 'St. Saviour’s School, Ikoyi',
    childrenSummary: '3 Kids (Chuka 6 yrs, Somto 9 yrs, Ada 11 yrs)',
    schedule: 'Monday to Friday (Both Ways)',
    morningTime: '7:00 AM Pickup',
    afternoonTime: '3:15 PM Pickup',
    vehicleRequested: 'car',
    vehicleLabel: 'Private AC Car',
    weeklyRate: 48000,
    monthlyRate: 185000,
    securityTerms: [
      'Air-conditioned 4-seater car with child locks',
      'Strict no-unauthorized-passenger contract',
      'Full police background clearance mandatory',
      'Automatic Friday escrow weekly release'
    ],
    status: 'open_for_bidding'
  },
  {
    id: 'SCH-703',
    family: 'The Alade Family',
    parentName: 'Alhaji Rasheed Alade',
    parentPhone: '+234 814 333 4410',
    parentRating: 4.92,
    corridor: 'Yaba ➔ Surulere',
    homePickup: 'Commercial Avenue, Sabo, Yaba',
    schoolDestination: 'Surulere Baptist High School',
    childrenSummary: '2 Teenagers (Ages 13 & 15)',
    schedule: 'Monday to Friday (Morning Only)',
    morningTime: '7:20 AM Pickup',
    afternoonTime: 'Morning Commute Only',
    vehicleRequested: 'maruwa',
    vehicleLabel: 'Maruwa (Keke)',
    weeklyRate: 16000,
    monthlyRate: 60000,
    securityTerms: [
      'Morning drop-off with gatekeeper OTP confirmation',
      'Punctual arrival before 7:45 AM assembly'
    ],
    status: 'open_for_bidding'
  }
];

export const MOCK_RIDER_LEDGER = [
  {
    id: 'TX-901',
    title: 'Commuter Express Ride (Allen ➔ Ikeja)',
    type: 'ride',
    vehicle: '🏍️ Okada',
    fare: 1600,
    tip: 300,
    time: '2:15 PM',
    status: 'Completed'
  },
  {
    id: 'TX-900',
    title: 'School Run Morning Commute (Week 3 Payout)',
    type: 'school_run',
    vehicle: '🛺 Maruwa',
    fare: 25000,
    tip: 2000,
    time: '12:30 PM (Friday Escrow Release)',
    status: 'Completed'
  },
  {
    id: 'TX-899',
    title: 'Prescription Drug Drop (Apex Pharmacy)',
    type: 'delivery',
    vehicle: '🏍️ Okada',
    fare: 1850,
    tip: 400,
    time: '10:45 AM',
    status: 'Completed'
  },
  {
    id: 'TX-898',
    title: 'Market Shopping Errands (Oyingbo)',
    type: 'errand',
    vehicle: '🛺 Maruwa',
    fare: 2800,
    tip: 500,
    time: '8:40 AM',
    status: 'Completed'
  }
];

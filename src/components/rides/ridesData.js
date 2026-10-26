/**
 * Subtech Mobility (STV Rides & Errands) Data Layer
 * Support for Okada, Maruwa (Keke Napep), and Car/Taxi on-demand errands,
 * scheduled pickups ("pick me by 4pm"), daily school-run contracts, and live fare bargaining.
 */

export const VEHICLE_TYPES = [
  {
    id: 'okada',
    name: 'Okada',
    subtitle: 'Motorcycle Express',
    emoji: '🏍️',
    description: 'Fastest through Lagos traffic. Ideal for solo commuters, quick bus-stop hops, and urgent document/parcel errands.',
    capacity: '1 Passenger · 1 Backpack',
    basePrice: 700,
    minBid: 400,
    speedBadge: 'Fastest (Beats Traffic)',
    tagColor: '#EF4444',
    popular: true
  },
  {
    id: 'maruwa',
    name: 'Maruwa',
    subtitle: 'Keke Napep Tricycle',
    emoji: '🛺',
    description: 'Covered, highly affordable, neighborhood transit. Top choice for school runs (2–3 kids), market shopping, and rainy days.',
    capacity: 'Up to 3 Passengers · Market Bags',
    basePrice: 1200,
    minBid: 700,
    speedBadge: 'Best Value & School Runs',
    tagColor: '#10B981',
    popular: true
  },
  {
    id: 'car',
    name: 'Taxi / Car',
    subtitle: 'Comfortable Saloon (AC)',
    emoji: '🚗',
    description: 'Private 4-seater car with AC for inter-district travel, airport drops, family school commutes, and trunk luggage.',
    capacity: 'Up to 4 Passengers · 2 Large Bags',
    basePrice: 3200,
    minBid: 2000,
    speedBadge: 'Maximum Comfort & Safety',
    tagColor: '#3B82F6',
    popular: false
  }
];

export const SERVICE_MODES = [
  {
    id: 'now',
    title: 'Ride / Errand Now',
    tagline: 'Instant dispatch with fare bargaining',
    icon: 'Zap',
    badge: 'Real-Time Bidding'
  },
  {
    id: 'scheduled',
    title: 'Schedule for Later',
    tagline: 'e.g. "Come and pick me by 4:00 PM"',
    icon: 'Clock',
    badge: 'Time-Guaranteed'
  },
  {
    id: 'school_run',
    title: 'Daily School Run Contract',
    tagline: 'Mon–Fri trusted kids commute with OTP',
    icon: 'GraduationCap',
    badge: 'Parent Protection'
  }
];

export const CORRIDORS = [
  { id: 'ikeja', name: 'Ikeja GRA, Allen & Maryland', hub: 'Computer Village / Ikeja Mall' },
  { id: 'lekki', name: 'Lekki Phase 1, Admiralty & Ikate', hub: 'Admiralty Way / Circle Mall' },
  { id: 'vi_ikoyi', name: 'Victoria Island & Ikoyi', hub: 'Adeola Odeku / Falomo' },
  { id: 'yaba', name: 'Yaba, Tejuosho & Surulere', hub: 'Unilag Gate / Ojuelegba' },
  { id: 'gbagada', name: 'Gbagada, Anthony & Pedro', hub: 'Gbagada Phase 2 / Charly Boy' },
  { id: 'festac', name: 'Festac Town & Mile 2', hub: 'Festac 1st Avenue / Apple Junction' }
];

export const SAMPLE_RIDERS = [
  {
    id: 'RDR-1',
    name: 'Babatunde Raji',
    vehicleType: 'okada',
    vehicleModel: 'Bajaj Boxer 150 (Black/Red)',
    plateNumber: 'KJA-412-XA',
    rating: 4.96,
    tripsCount: 1420,
    avatar: '👨🏾',
    badge: 'NAFDAC & Courier Certified',
    phone: '+234 803 412 9981',
    distanceEta: '3 mins away',
    verified: true
  },
  {
    id: 'RDR-2',
    name: 'Emmanuel Okon',
    vehicleType: 'maruwa',
    vehicleModel: 'TVS King Deluxe 200cc (Yellow)',
    plateNumber: 'LND-889-BB',
    rating: 4.99,
    tripsCount: 2180,
    avatar: '👨🏾‍✈️',
    badge: 'School-Run Guardian Certified · Police Cleared',
    phone: '+234 802 889 4432',
    distanceEta: '4 mins away',
    verified: true
  },
  {
    id: 'RDR-3',
    name: 'Ibrahim Musa',
    vehicleType: 'maruwa',
    vehicleModel: 'Bajaj RE Compact (Yellow/Green)',
    plateNumber: 'APP-312-YZ',
    rating: 4.92,
    tripsCount: 940,
    avatar: '🧔🏾',
    badge: 'Estate Resident Verified',
    phone: '+234 814 312 0019',
    distanceEta: '6 mins away',
    verified: true
  },
  {
    id: 'RDR-4',
    name: 'Chidi Anyaoku',
    vehicleType: 'car',
    vehicleModel: 'Toyota Corolla 2013 (Silver, AC)',
    plateNumber: 'LSR-554-EF',
    rating: 4.97,
    tripsCount: 1890,
    avatar: '👨🏾‍💼',
    badge: 'Executive Chauffeur & Child Safety Anchor',
    phone: '+234 805 554 1120',
    distanceEta: '7 mins away',
    verified: true
  },
  {
    id: 'RDR-5',
    name: 'Sunday Alabi',
    vehicleType: 'okada',
    vehicleModel: 'Haojue 125cc (Blue)',
    plateNumber: 'BDG-902-CD',
    rating: 4.88,
    tripsCount: 620,
    avatar: '🧑🏾',
    badge: 'Express Corridor Specialist',
    phone: '+234 816 902 7741',
    distanceEta: '5 mins away',
    verified: true
  }
];

export const SCHOOL_RUN_CONTRACTS_PRESETS = [
  {
    id: 'keke_weekly',
    title: 'Maruwa Weekly School Shuttle',
    vehicleType: 'maruwa',
    emoji: '🛺',
    days: 'Monday to Friday (Both Ways)',
    morningTime: '7:15 AM Pickup',
    afternoonTime: '2:30 PM Return',
    recommendedFor: '1 to 3 children attending neighborhood primary/secondary schools',
    priceWeekly: 22000,
    priceMonthly: 80000,
    features: [
      'Dedicated driver (same driver every school morning)',
      'Handshake 4-digit OTP with school security & parent',
      'Rain-proof curtains & child safety locks',
      'Escrow weekly release (funds safe until each week ends)'
    ]
  },
  {
    id: 'car_weekly',
    title: 'Private AC Car School Shuttle',
    vehicleType: 'car',
    emoji: '🚗',
    days: 'Monday to Friday (Both Ways)',
    morningTime: '7:00 AM Pickup',
    afternoonTime: '3:00 PM Return',
    recommendedFor: 'Siblings, rainy seasons, or longer cross-bridge commutes',
    priceWeekly: 45000,
    priceMonthly: 165000,
    features: [
      'Private air-conditioned Toyota sedan',
      'Live GPS parent tracking link shared to WhatsApp',
      'Police-vetted and background-cleared family driver',
      'Automatic escrow weekly payout'
    ]
  }
];

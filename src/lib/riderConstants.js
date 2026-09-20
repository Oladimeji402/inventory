export const VEHICLE_TYPES = [
  {
    value: 'motorcycle',
    label: 'Motorcycle',
    hint: 'Most dispatch corridors. Requires a valid rider\'s licence.'
  },
  {
    value: 'bicycle',
    label: 'Bicycle',
    hint: 'Short urban routes.'
  },
  {
    value: 'tricycle',
    label: 'Tricycle (Keke)',
    hint: 'Requires a valid driver\'s licence.'
  },
  {
    value: 'car',
    label: 'Car',
    hint: 'Requires a valid driver\'s licence and vehicle particulars.'
  },
  {
    value: 'van',
    label: 'Van',
    hint: 'Larger/bulk deliveries. Requires a valid driver\'s licence.'
  }
];

export const MIN_RIDER_AGE = 18;

export function isAtLeastMinAge(dateOfBirth, minAge = MIN_RIDER_AGE) {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - minAge);
  return dob <= cutoff;
}

/**
 * Verification documents a rider must upload, by vehicle.
 * The server enforces the same list (rider_required_documents in Postgres).
 */

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_TYPES.join(',');

/** What the licence is called for each vehicle (shown to riders and admins). */
export const LICENCE_LABELS = {
  motorcycle: "Rider's licence",
  tricycle: 'Tricycle (Keke) operator licence',
  car: "Driver's licence",
  van: "Driver's licence",
  bicycle: 'No licence needed'
};

export function licenceLabel(vehicleType) {
  return LICENCE_LABELS[vehicleType] || "Driver's licence";
}

export function requiredDocumentTypes(vehicleType) {
  return vehicleType === 'bicycle'
    ? ['passport_photo']
    : ['drivers_license_front', 'drivers_license_back', 'vehicle_papers', 'passport_photo'];
}

/** Display copy for one document slot. */
export function documentInfo(docType, vehicleType) {
  const licence = licenceLabel(vehicleType);
  const vehicleWord = vehicleType === 'car' || vehicleType === 'van' ? 'vehicle' : vehicleType === 'tricycle' ? 'tricycle' : 'motorcycle';
  const info = {
    drivers_license_front: {
      label: `${licence} — front`,
      help: 'Clear photo of the front. Name, photo and expiry date must be readable.'
    },
    drivers_license_back: {
      label: `${licence} — back`,
      help: 'Clear photo of the back of the same licence.'
    },
    vehicle_papers: {
      label: 'Vehicle registration papers',
      help:
        vehicleType === 'car' || vehicleType === 'van'
          ? `Registration, and roadworthiness or insurance if you have it, for your ${vehicleWord}.`
          : `Registration papers or proof of ownership for your ${vehicleWord}.`
    },
    passport_photo: {
      label: 'Passport photograph',
      help: 'A recent face photo, plain background, no sunglasses or cap.'
    }
  };
  return info[docType] || { label: docType, help: '' };
}

/** Returns an error message, or '' when the file is acceptable. */
export function validateDocumentFile(file) {
  if (!file) return 'Choose a file first.';
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) return 'Upload a JPG, PNG, WebP or PDF file.';
  if (file.size > MAX_DOCUMENT_BYTES) return 'That file is larger than 5 MB. Choose a smaller photo.';
  if (file.size === 0) return 'That file is empty.';
  return '';
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

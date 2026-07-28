export const permissionMatrix = {
  'Sales Representative': {
    sell: true,
    viewInventory: true,
    viewReports: true,
    applyDiscount: 5,
    manageInventory: false,
    voidSale: false,
    manageStaff: false,
    description: 'Handles customer checkout and basic product lookup.'
  },
  Supervisor: {
    sell: true,
    viewInventory: true,
    viewReports: true,
    applyDiscount: 10,
    manageInventory: true,
    voidSale: false,
    manageStaff: false,
    description: 'Supports stock movement and mid-level approvals.'
  },
  Manager: {
    sell: true,
    viewInventory: true,
    viewReports: true,
    applyDiscount: 15,
    manageInventory: true,
    voidSale: true,
    manageStaff: false,
    description: 'Owns day-to-day operations, approvals and exceptions.'
  },
  'Store Admin': {
    sell: true,
    viewInventory: true,
    viewReports: true,
    applyDiscount: 20,
    manageInventory: true,
    voidSale: true,
    manageStaff: true,
    description: 'Full operational control for inventory and staff settings.'
  }
};

export const STAFF_ROLES = ['Sales Representative', 'Supervisor', 'Manager', 'Store Admin'];

export function staffStatus(employee) {
  return employee?.status || 'active';
}

export function canSignIn(employee) {
  return staffStatus(employee) === 'active';
}

export function can(role, action) {
  const rights = permissionMatrix[role] || permissionMatrix['Sales Representative'];
  return rights[action];
}

export function maxDiscount(role) {
  return permissionMatrix[role]?.applyDiscount ?? 0;
}

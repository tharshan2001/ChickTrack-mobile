export const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  BRANCH_RECEIVER: 'Branch receiver',
  ACCOUNTANT: 'Accountant',
  PROCUREMENT_MANAGER: 'Procurement',
  WAREHOUSE_MANAGER: 'Warehouse',
  DISTRIBUTION_MANAGER: 'Distribution',
  DRIVER: 'Driver',
  VIEWER: 'Viewer',
};

export const ROLE_HELP: Record<string, string> = {
  BRANCH_RECEIVER: 'Receives deliveries and enters daily sales for their branch.',
  ACCOUNTANT: 'Records payments and expenses, and sees reports and profit & loss.',
  PROCUREMENT_MANAGER: 'Buys from suppliers and sets purchase prices.',
  WAREHOUSE_MANAGER: 'Looks after stock, batches and adjustments.',
  DISTRIBUTION_MANAGER: 'Sends stock to branches.',
  VIEWER: 'Can look at reports, but not change anything.',
};

export const ASSIGNABLE_ROLES = [
  'BRANCH_RECEIVER',
  'ACCOUNTANT',
  'PROCUREMENT_MANAGER',
  'WAREHOUSE_MANAGER',
  'DISTRIBUTION_MANAGER',
  'VIEWER',
] as const;

export const roleLabel = (roles: string[]) =>
  roles.map((r) => ROLE_LABEL[r] ?? r.toLowerCase()).join(', ') || 'No role';

export const isOwnerAccount = (roles: string[]) => roles.includes('OWNER');

export const canSeeFinance = (roles: string[] | undefined) =>
  !!roles && (roles.includes('OWNER') || roles.includes('ACCOUNTANT'));

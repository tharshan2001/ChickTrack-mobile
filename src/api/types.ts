/** Mirrors identity/dto/UserResponse. */
export type User = {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  roles: string[];
  branchIds: string[];
  version: number;
  createdAt: string;
};

/** Mirrors chicken/dto/ChickenTypeResponse. Shown in the app as a "Product". */
export type ChickenType = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ChickenTypeInput = { name: string; description: string | null };

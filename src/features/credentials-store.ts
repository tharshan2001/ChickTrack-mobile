export type IssuedCredentials = {
  fullName: string;
  username: string;
  password: string;
  generated: boolean;
  reset: boolean;
};

let pending: IssuedCredentials | null = null;

export const credentialsStore = {
  set(credentials: IssuedCredentials) {
    pending = credentials;
  },
  take(): IssuedCredentials | null {
    const credentials = pending;
    pending = null;
    return credentials;
  },
};

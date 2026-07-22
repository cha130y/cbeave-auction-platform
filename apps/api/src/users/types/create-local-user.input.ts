export type CreateLocalUserInput = {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName?: string;
  displayName: string;
};

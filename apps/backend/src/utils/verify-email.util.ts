import z from 'zod';

export const extractDomain = (email: string) => {
  return email.split('@')[1];
};

export const isValidEmail = (email: string) => {
  return z.string().email().safeParse(email).success;
};

export const normalizeEmails = (emails: string[]): string[] => {
  const emailByLowerCase = new Map<string, string>();
  emails
    .map((email) => email.trim())
    .filter((email) => email.length > 0)
    .forEach((email) => {
      const key = email.toLowerCase();
      if (!emailByLowerCase.has(key)) {
        emailByLowerCase.set(key, email);
      }
    });
  return [...emailByLowerCase.values()];
};

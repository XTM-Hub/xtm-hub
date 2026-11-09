import crypto from 'node:crypto';

export const validatePassword = (
  salt: string,
  tentativePassword: string,
  realPassword: string
) => {
  const hash = crypto.pbkdf2Sync(tentativePassword, salt, 1000, 64, `sha512`);
  const expected = Buffer.from(realPassword, 'hex');
  // Constant time, so the response time tells nothing about how much of the hash matched.
  return (
    expected.length === hash.length && crypto.timingSafeEqual(expected, hash)
  );
};

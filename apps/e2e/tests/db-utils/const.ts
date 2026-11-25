export const PLATFORM_ORGANIZATION_UUID =
  'ba091095-418f-4b4f-b150-6c9295e232c4';

export const ADMIN_USER = {
  ID: 'ba091095-418f-4b4f-b150-6c9295e232c3',
  GLOBAL_ID: 'VXNlcjpiYTA5MTA5NS00MThmLTRiNGYtYjE1MC02YzkyOTVlMjMyYzM=',

  EMAIL: 'admin@filigran.io',

  PASSWORD_HASH:
    'a0bbec7075b7aca96feb276477a5ab4b8d86c495de9b5eb1e9f44dea11a1fea7b0621437a2e437517ecf222e1c730db96c51211856fd309a6293dba2aa44c24e',
  PASSWORD_SALT: 'fabc28ed1339f8b34c10bc3b5a650c01',
};

export const ACCESS_SUBSCRIPTION_USER = {
  EMAIL: 'access-subscription@filigran.io',
};

export const THALES_ADMIN_USER = {
  EMAIL: 'admin@second-orga.com',
};

export const THALES_USER = {
  GLOBAL_ID: 'VXNlcjoxNTQwMDZlMi1mMjRiLTQyZGEtYjM5Yy1lMGZiMTdiZWFkMDA=',

  EMAIL: 'user@thales.com',
};

// Seeded by the backend test seeds: its registerer holds MANAGE_PLATFORM_REGISTRATION.
export const SECOND_ORGA = {
  NAME: 'SECOND ORGA',
  REGISTERER_EMAIL: 'user.registerer@second-orga.com',
};

// The platform the admin registered platforms specs connect, then unregister.
export const PLATFORM_TO_UNREGISTER = {
  url: 'http://localhost:3000',
  title: 'Platform To Unregister',
  id: '0b8d2f1c-6a52-4d54-9f5b-3a3d0a1e7c11',
  contract: 'EE',
};

// Created by those specs: a member who may manage registrations in its own organization, and is in none of SECOND
// ORGA.
export const OTHER_ORGA_MEMBER = {
  ORGANIZATION_NAME: 'Other Org',
  EMAIL: 'member@other-org.com',
};

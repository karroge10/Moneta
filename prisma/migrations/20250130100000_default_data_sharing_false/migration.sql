-- Set default for dataSharingEnabled to false for new users
ALTER TABLE "User" ALTER COLUMN "dataSharingEnabled" SET DEFAULT false;

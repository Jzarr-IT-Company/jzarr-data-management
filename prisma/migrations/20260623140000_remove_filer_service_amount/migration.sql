-- AlterTable: remove amount column from FilerService (services are name-only; amount is entered manually on each lead)
ALTER TABLE `FilerService` DROP COLUMN `amount`;

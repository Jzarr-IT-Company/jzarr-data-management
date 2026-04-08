-- AlterTable
ALTER TABLE `User` ADD COLUMN `allowedScreens` JSON NULL,
    MODIFY `role` ENUM('ADMIN', 'MANAGER', 'SUB_ADMIN') NOT NULL;

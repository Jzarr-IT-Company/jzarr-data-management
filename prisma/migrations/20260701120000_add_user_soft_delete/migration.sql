-- AlterTable
ALTER TABLE `User`
    ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `User_role_deletedAt_idx` ON `User`(`role`, `deletedAt`);

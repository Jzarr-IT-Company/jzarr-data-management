-- AlterTable
ALTER TABLE `Lead`
  ADD COLUMN `followUpAt` DATETIME(3) NULL,
  ADD COLUMN `followUpMessage` VARCHAR(191) NULL,
  ADD COLUMN `followUpNotifiedAt` DATETIME(3) NULL,
  ADD COLUMN `followUpCreatedById` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Lead_followUpAt_followUpNotifiedAt_idx` ON `Lead`(`followUpAt`, `followUpNotifiedAt`);

-- CreateIndex
CREATE INDEX `Lead_followUpCreatedById_idx` ON `Lead`(`followUpCreatedById`);

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_followUpCreatedById_fkey` FOREIGN KEY (`followUpCreatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

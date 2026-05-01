-- AlterTable
ALTER TABLE `lead` MODIFY `status` ENUM('NEW', 'IN_PROGRESS', 'FOLLOW_UP', 'CONVERTED', 'NOT_INTERESTED') NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE `notification` ADD COLUMN `leadId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Notification_leadId_idx` ON `Notification`(`leadId`);

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

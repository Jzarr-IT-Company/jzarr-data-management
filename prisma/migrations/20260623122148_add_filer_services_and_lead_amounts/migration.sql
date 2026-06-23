-- AlterTable
ALTER TABLE `lead` ADD COLUMN `pendingAmount` DECIMAL(65, 30) NULL,
    ADD COLUMN `receivingAmount` DECIMAL(65, 30) NULL,
    ADD COLUMN `serviceId` VARCHAR(191) NULL,
    ADD COLUMN `totalAmount` DECIMAL(65, 30) NULL;

-- CreateTable
CREATE TABLE `FilerService` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FilerService_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Lead_serviceId_idx` ON `Lead`(`serviceId`);

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `FilerService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

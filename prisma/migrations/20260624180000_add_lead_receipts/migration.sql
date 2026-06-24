-- CreateTable
CREATE TABLE `LeadReceipt` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NULL,
    `note` VARCHAR(191) NULL,
    `originalName` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NULL,
    `size` INTEGER NULL,
    `key` VARCHAR(191) NULL,
    `url` TEXT NULL,
    `uploadedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LeadReceipt_key_key`(`key`),
    INDEX `LeadReceipt_leadId_createdAt_idx`(`leadId`, `createdAt`),
    INDEX `LeadReceipt_uploadedById_idx`(`uploadedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LeadReceipt` ADD CONSTRAINT `LeadReceipt_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadReceipt` ADD CONSTRAINT `LeadReceipt_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

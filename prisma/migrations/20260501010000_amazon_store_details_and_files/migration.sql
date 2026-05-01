-- AlterTable
ALTER TABLE `Store`
  ADD COLUMN `amazonHolderName` VARCHAR(191) NULL,
  ADD COLUMN `sellerAccountGmail` VARCHAR(191) NULL,
  ADD COLUMN `sellerAccountPassword` VARCHAR(191) NULL,
  ADD COLUMN `sellerAccountAddress` VARCHAR(191) NULL,
  ADD COLUMN `userAccountGmail` VARCHAR(191) NULL,
  ADD COLUMN `userAccountPassword` VARCHAR(191) NULL,
  ADD COLUMN `userManagingMemberName` VARCHAR(191) NULL,
  ADD COLUMN `inventory` INTEGER NULL,
  ADD COLUMN `recordDate` DATETIME(3) NULL,
  ADD COLUMN `assignCode` VARCHAR(191) NULL,
  ADD COLUMN `costOfGoods` DECIMAL(65,30) NULL,
  ADD COLUMN `ppcSpending` DECIMAL(65,30) NULL;

-- CreateTable
CREATE TABLE `StoreFile` (
  `id` VARCHAR(191) NOT NULL,
  `storeId` VARCHAR(191) NOT NULL,
  `category` ENUM('AUDIT', 'DOCUMENT', 'PRODUCT_PSD') NOT NULL,
  `originalName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `size` INTEGER NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `url` VARCHAR(191) NOT NULL,
  `uploadedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `StoreFile_key_key`(`key`),
  INDEX `StoreFile_storeId_category_idx`(`storeId`, `category`),
  INDEX `StoreFile_uploadedById_idx`(`uploadedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StoreFile` ADD CONSTRAINT `StoreFile_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreFile` ADD CONSTRAINT `StoreFile_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

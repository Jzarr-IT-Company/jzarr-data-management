-- Add assignedToId to Lead table
ALTER TABLE `Lead`
  ADD COLUMN `assignedToId` VARCHAR(191) NULL;

ALTER TABLE `Lead`
  ADD INDEX `Lead_assignedToId_idx`(`assignedToId`);

ALTER TABLE `Lead`
  ADD CONSTRAINT `Lead_assignedToId_fkey`
  FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Create LeadAssignment history table
CREATE TABLE `LeadAssignment` (
  `id`           VARCHAR(191) NOT NULL,
  `leadId`       VARCHAR(191) NOT NULL,
  `assignedToId` VARCHAR(191) NOT NULL,
  `assignedById` VARCHAR(191) NOT NULL,
  `note`         VARCHAR(191) NULL,
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `LeadAssignment_leadId_createdAt_idx`(`leadId`, `createdAt`),
  INDEX `LeadAssignment_assignedToId_idx`(`assignedToId`),
  INDEX `LeadAssignment_assignedById_idx`(`assignedById`),

  CONSTRAINT `LeadAssignment_leadId_fkey`
    FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `LeadAssignment_assignedToId_fkey`
    FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `LeadAssignment_assignedById_fkey`
    FOREIGN KEY (`assignedById`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create Target table
CREATE TABLE `Target` (
  `id`           VARCHAR(191) NOT NULL,
  `assignedToId` VARCHAR(191) NOT NULL,
  `assignedById` VARCHAR(191) NOT NULL,
  `title`        VARCHAR(191) NOT NULL,
  `description`  VARCHAR(191) NULL,
  `targetType`   ENUM('LEADS_ASSIGNED','LEADS_CONVERTED','LEADS_CONTACTED') NOT NULL,
  `targetValue`  INT NOT NULL,
  `periodStart`  DATETIME(3) NOT NULL,
  `periodEnd`    DATETIME(3) NOT NULL,
  `notes`        TEXT NULL,
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `Target_assignedToId_periodStart_periodEnd_idx`(`assignedToId`, `periodStart`, `periodEnd`),
  INDEX `Target_assignedById_idx`(`assignedById`),

  CONSTRAINT `Target_assignedToId_fkey`
    FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Target_assignedById_fkey`
    FOREIGN KEY (`assignedById`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

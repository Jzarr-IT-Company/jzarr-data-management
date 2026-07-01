-- AlterTable: add source and metaLeadId columns to Lead
ALTER TABLE `Lead`
  ADD COLUMN `source` ENUM('MANUAL', 'META', 'WHATSAPP', 'EMAIL', 'WEBSITE', 'REFERRAL', 'OTHER') NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN `metaLeadId` VARCHAR(191) NULL;

-- CreateIndex: unique constraint on metaLeadId (deduplication for webhook retries)
ALTER TABLE `Lead` ADD UNIQUE INDEX `Lead_metaLeadId_key`(`metaLeadId`);

-- CreateIndex: index on source for filtered queries
CREATE INDEX `Lead_source_idx` ON `Lead`(`source`);

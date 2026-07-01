-- Drop the targetType column and add a period column on Target
ALTER TABLE `Target` DROP COLUMN `targetType`;

ALTER TABLE `Target`
  ADD COLUMN `period` ENUM('WEEKLY', 'MONTHLY', 'SIX_MONTH', 'YEARLY') NOT NULL DEFAULT 'MONTHLY';

-- Add country column to Lead
ALTER TABLE `Lead`
  ADD COLUMN `country` ENUM('PAKISTAN', 'UK', 'USA') NOT NULL DEFAULT 'PAKISTAN';

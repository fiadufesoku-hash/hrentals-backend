/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `property` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `property` DROP COLUMN `imageUrl`,
    ADD COLUMN `image1` VARCHAR(191) NULL,
    ADD COLUMN `image2` VARCHAR(191) NULL,
    ADD COLUMN `image3` VARCHAR(191) NULL,
    ADD COLUMN `image4` VARCHAR(191) NULL;

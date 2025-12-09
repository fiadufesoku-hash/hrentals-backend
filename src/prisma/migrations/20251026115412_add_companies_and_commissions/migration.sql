/*
  Warnings:

  - Added the required column `companyId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `commissionAmount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `companyId` INTEGER NOT NULL,
    ADD COLUMN `momoTxId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Property` ADD COLUMN `companyId` INTEGER NOT NULL,
    ADD COLUMN `contact` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `companyId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `Company` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NOT NULL,
    `isOwnCompany` BOOLEAN NOT NULL DEFAULT false,
    `momoAccount` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Company_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Property` ADD CONSTRAINT `Property_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

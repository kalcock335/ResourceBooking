/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `email` on table `resources` required. This step will fail if there are existing NULL values in that column.
  - Made the column `role` on table `resources` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "User_resourceId_key";

-- DropIndex
DROP INDEX "User_email_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "User";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_resources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL,
    "jobTitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_resources" ("createdAt", "email", "id", "isActive", "jobTitle", "name", "role", "updatedAt") SELECT "createdAt", "email", "id", "isActive", "jobTitle", "name", "role", "updatedAt" FROM "resources";
DROP TABLE "resources";
ALTER TABLE "new_resources" RENAME TO "resources";
CREATE UNIQUE INDEX "resources_name_key" ON "resources"("name");
CREATE UNIQUE INDEX "resources_email_key" ON "resources"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

/*
  Warnings:

  - You are about to drop the column `role` on the `resources` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isPlannable" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ResourceRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "ResourceRole_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_resources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "jobTitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_resources" ("createdAt", "email", "id", "isActive", "jobTitle", "name", "password", "updatedAt") SELECT "createdAt", "email", "id", "isActive", "jobTitle", "name", "password", "updatedAt" FROM "resources";
DROP TABLE "resources";
ALTER TABLE "new_resources" RENAME TO "resources";
CREATE UNIQUE INDEX "resources_name_key" ON "resources"("name");
CREATE UNIQUE INDEX "resources_email_key" ON "resources"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceRole_resourceId_roleId_key" ON "ResourceRole"("resourceId", "roleId");

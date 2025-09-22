/*
  Warnings:

  - You are about to drop the `ForecastSkill` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OpportunityForecast` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projects` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "projects_name_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ForecastSkill";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OpportunityForecast";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "projects";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "customer" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_allocations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceId" TEXT,
    "projectId" TEXT,
    "workTypeId" TEXT,
    "weekStart" DATETIME,
    "days" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "role" TEXT,
    "quantity" INTEGER,
    "daysPerWeek" INTEGER,
    "numWeeks" INTEGER,
    "startDate" DATETIME,
    CONSTRAINT "allocations_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "allocations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "allocations_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "work_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_allocations" ("createdAt", "days", "daysPerWeek", "id", "notes", "numWeeks", "projectId", "quantity", "resourceId", "role", "startDate", "status", "updatedAt", "weekStart", "workTypeId") SELECT "createdAt", "days", "daysPerWeek", "id", "notes", "numWeeks", "projectId", "quantity", "resourceId", "role", "startDate", "status", "updatedAt", "weekStart", "workTypeId" FROM "allocations";
DROP TABLE "allocations";
ALTER TABLE "new_allocations" RENAME TO "allocations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

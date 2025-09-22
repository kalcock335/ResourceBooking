-- CreateTable
CREATE TABLE "AllocationSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allocationId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" TEXT,
    "expiresBy" DATETIME,
    CONSTRAINT "AllocationSkill_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "allocations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllocationSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    CONSTRAINT "allocations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "allocations_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "work_types" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_allocations" ("createdAt", "days", "id", "notes", "projectId", "resourceId", "updatedAt", "weekStart", "workTypeId") SELECT "createdAt", "days", "id", "notes", "projectId", "resourceId", "updatedAt", "weekStart", "workTypeId" FROM "allocations";
DROP TABLE "allocations";
ALTER TABLE "new_allocations" RENAME TO "allocations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

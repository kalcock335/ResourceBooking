-- CreateTable
CREATE TABLE "OpportunityForecast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "daysPerWeek" INTEGER NOT NULL,
    "numWeeks" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OpportunityForecast_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ForecastSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "forecastId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" TEXT,
    "expiresBy" DATETIME,
    CONSTRAINT "ForecastSkill_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "OpportunityForecast" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ForecastSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

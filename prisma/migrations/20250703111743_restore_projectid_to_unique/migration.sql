/*
  Warnings:

  - A unique constraint covering the columns `[resourceId,projectId,workTypeId,weekStart]` on the table `allocations` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "allocations_resourceId_workTypeId_weekStart_key";

-- CreateIndex
CREATE UNIQUE INDEX "allocations_resourceId_projectId_workTypeId_weekStart_key" ON "allocations"("resourceId", "projectId", "workTypeId", "weekStart");

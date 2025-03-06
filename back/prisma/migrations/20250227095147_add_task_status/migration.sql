/*
  Warnings:

  - A unique constraint covering the columns `[name,projectId]` on the table `TaskStatus` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TaskStatus_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "TaskStatus_name_projectId_key" ON "TaskStatus"("name", "projectId");

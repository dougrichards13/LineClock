/*
  Warnings:

  - Added the required column `clientId` to the `TimeEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `TimeEntry` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Insert default client for existing data
INSERT INTO "Client" ("id", "name", "isActive", "createdAt", "updatedAt") 
VALUES ('default-client-id', 'General / Uncategorized', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Insert default project for existing data
INSERT INTO "Project" ("id", "name", "clientId", "isActive", "createdAt", "updatedAt") 
VALUES ('default-project-id', 'General Work', 'default-client-id', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "hoursWorked" REAL NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TimeEntry" ("createdAt", "date", "description", "hoursWorked", "id", "reviewedAt", "reviewedBy", "status", "updatedAt", "userId", "clientId", "projectId") 
SELECT "createdAt", "date", "description", "hoursWorked", "id", "reviewedAt", "reviewedBy", "status", "updatedAt", "userId", 'default-client-id', 'default-project-id' FROM "TimeEntry";
DROP TABLE "TimeEntry";
ALTER TABLE "new_TimeEntry" RENAME TO "TimeEntry";
CREATE INDEX "TimeEntry_userId_idx" ON "TimeEntry"("userId");
CREATE INDEX "TimeEntry_status_idx" ON "TimeEntry"("status");
CREATE INDEX "TimeEntry_clientId_idx" ON "TimeEntry"("clientId");
CREATE INDEX "TimeEntry_projectId_idx" ON "TimeEntry"("projectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_clientId_name_key" ON "Project"("clientId", "name");

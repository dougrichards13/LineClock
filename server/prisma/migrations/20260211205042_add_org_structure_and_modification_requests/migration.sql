-- CreateTable
CREATE TABLE "TimeModificationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "approverId" TEXT,
    "weekStartDate" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entries" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedAt" DATETIME,
    "reviewNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeModificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeModificationRequest_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TimeModificationRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeModificationRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "entraId" TEXT,
    "avatarUrl" TEXT,
    "hireDate" DATETIME,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumber" TEXT,
    "notificationPreference" TEXT NOT NULL DEFAULT 'EMAIL',
    "billableRate" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "reportsToId" TEXT,
    CONSTRAINT "User_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatarUrl", "billableRate", "createdAt", "email", "entraId", "hireDate", "id", "isHidden", "name", "notificationPreference", "phoneNumber", "role", "updatedAt") SELECT "avatarUrl", "billableRate", "createdAt", "email", "entraId", "hireDate", "id", "isHidden", "name", "notificationPreference", "phoneNumber", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_entraId_key" ON "User"("entraId");
CREATE INDEX "User_reportsToId_idx" ON "User"("reportsToId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TimeModificationRequest_userId_idx" ON "TimeModificationRequest"("userId");

-- CreateIndex
CREATE INDEX "TimeModificationRequest_approverId_idx" ON "TimeModificationRequest"("approverId");

-- CreateIndex
CREATE INDEX "TimeModificationRequest_status_idx" ON "TimeModificationRequest"("status");

-- CreateIndex
CREATE INDEX "TimeModificationRequest_weekStartDate_idx" ON "TimeModificationRequest"("weekStartDate");

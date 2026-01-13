-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredBy" TEXT,
    "answeredAt" DATETIME,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Question_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Question_answeredBy_fkey" FOREIGN KEY ("answeredBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("answer", "answeredAt", "answeredBy", "createdAt", "id", "question", "status", "updatedAt", "userId") SELECT "answer", "answeredAt", "answeredBy", "createdAt", "id", "question", "status", "updatedAt", "userId" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
CREATE INDEX "Question_userId_idx" ON "Question"("userId");
CREATE INDEX "Question_status_idx" ON "Question"("status");
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
    CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TimeEntry" ("clientId", "createdAt", "date", "description", "hoursWorked", "id", "projectId", "reviewedAt", "reviewedBy", "status", "updatedAt", "userId") SELECT "clientId", "createdAt", "date", "description", "hoursWorked", "id", "projectId", "reviewedAt", "reviewedBy", "status", "updatedAt", "userId" FROM "TimeEntry";
DROP TABLE "TimeEntry";
ALTER TABLE "new_TimeEntry" RENAME TO "TimeEntry";
CREATE INDEX "TimeEntry_userId_idx" ON "TimeEntry"("userId");
CREATE INDEX "TimeEntry_status_idx" ON "TimeEntry"("status");
CREATE INDEX "TimeEntry_clientId_idx" ON "TimeEntry"("clientId");
CREATE INDEX "TimeEntry_projectId_idx" ON "TimeEntry"("projectId");
CREATE TABLE "new_VacationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VacationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VacationRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_VacationRequest" ("createdAt", "endDate", "id", "reason", "reviewedAt", "reviewedBy", "startDate", "status", "updatedAt", "userId") SELECT "createdAt", "endDate", "id", "reason", "reviewedAt", "reviewedBy", "startDate", "status", "updatedAt", "userId" FROM "VacationRequest";
DROP TABLE "VacationRequest";
ALTER TABLE "new_VacationRequest" RENAME TO "VacationRequest";
CREATE INDEX "VacationRequest_userId_idx" ON "VacationRequest"("userId");
CREATE INDEX "VacationRequest_status_idx" ON "VacationRequest"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

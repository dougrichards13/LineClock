-- AlterTable
ALTER TABLE "Project" ADD COLUMN "billingRate" REAL;

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN "clientAmount" REAL;
ALTER TABLE "TimeEntry" ADD COLUMN "clientRate" REAL;
ALTER TABLE "TimeEntry" ADD COLUMN "consultantAmount" REAL;
ALTER TABLE "TimeEntry" ADD COLUMN "consultantRate" REAL;
ALTER TABLE "TimeEntry" ADD COLUMN "smartFactoryMargin" REAL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "billableRate" REAL;

-- CreateTable
CREATE TABLE "FractionalIncentive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leaderId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "projectId" TEXT,
    "incentiveRate" REAL NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FractionalIncentive_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FractionalIncentive_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FractionalIncentive_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncentiveEarning" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timeEntryId" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "fractionalIncentiveId" TEXT NOT NULL,
    "incentiveRate" REAL NOT NULL,
    "incentiveAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncentiveEarning_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IncentiveEarning_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IncentiveEarning_fractionalIncentiveId_fkey" FOREIGN KEY ("fractionalIncentiveId") REFERENCES "FractionalIncentive" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FractionalIncentive_leaderId_idx" ON "FractionalIncentive"("leaderId");

-- CreateIndex
CREATE INDEX "FractionalIncentive_consultantId_idx" ON "FractionalIncentive"("consultantId");

-- CreateIndex
CREATE INDEX "FractionalIncentive_projectId_idx" ON "FractionalIncentive"("projectId");

-- CreateIndex
CREATE INDEX "FractionalIncentive_isActive_idx" ON "FractionalIncentive"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FractionalIncentive_leaderId_consultantId_projectId_key" ON "FractionalIncentive"("leaderId", "consultantId", "projectId");

-- CreateIndex
CREATE INDEX "IncentiveEarning_timeEntryId_idx" ON "IncentiveEarning"("timeEntryId");

-- CreateIndex
CREATE INDEX "IncentiveEarning_leaderId_idx" ON "IncentiveEarning"("leaderId");

-- CreateIndex
CREATE INDEX "IncentiveEarning_fractionalIncentiveId_idx" ON "IncentiveEarning"("fractionalIncentiveId");

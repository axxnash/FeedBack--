CREATE TYPE "ModerationAlertStatus" AS ENUM ('OPEN', 'DISMISSED', 'RESOLVED');
CREATE TYPE "ModerationAlertSeverity" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "ModerationAlertTargetType" AS ENUM ('LISTING', 'USER');

CREATE TABLE "moderation_alerts" (
    "id" TEXT NOT NULL,
    "targetType" "ModerationAlertTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetName" TEXT NOT NULL,
    "severity" "ModerationAlertSeverity" NOT NULL,
    "status" "ModerationAlertStatus" NOT NULL DEFAULT 'OPEN',
    "issueTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reporterName" TEXT NOT NULL,
    "actionedById" TEXT,
    "actionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "moderation_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "moderation_alerts_status_createdAt_idx" ON "moderation_alerts"("status", "createdAt");
CREATE INDEX "moderation_alerts_targetType_targetId_idx" ON "moderation_alerts"("targetType", "targetId");

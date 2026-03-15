-- Create AuditLog table for persistent audit trail of all state transitions
CREATE TABLE "AuditLog" (
    "id"            TEXT         NOT NULL,
    "action"        TEXT         NOT NULL,
    "entityType"    TEXT         NOT NULL,
    "entityId"      TEXT         NOT NULL,
    "userId"        TEXT,
    "previousState" TEXT,
    "newState"      TEXT,
    "metadata"      JSONB,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Indexes for efficient querying
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

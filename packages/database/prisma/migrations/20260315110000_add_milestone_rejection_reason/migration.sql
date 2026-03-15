-- Add rejectionReason field to ProjectMilestone for storing admin rejection notes
ALTER TABLE "ProjectMilestone" ADD COLUMN "rejectionReason" TEXT;

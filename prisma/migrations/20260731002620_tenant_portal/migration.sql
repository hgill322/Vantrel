-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "inviteCode" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "unitId" TEXT;

-- CreateIndex
CREATE INDEX "Issue_unitId_idx" ON "Issue"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_inviteCode_key" ON "Unit"("inviteCode");

-- CreateIndex
CREATE INDEX "User_unitId_idx" ON "User"("unitId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;


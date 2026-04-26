-- 1) Add new array column
ALTER TABLE "OrderStatusConfig"
ADD COLUMN IF NOT EXISTS "tableGroups" "OrderTableGroup"[] NOT NULL DEFAULT ARRAY[]::"OrderTableGroup"[];

-- 2) Backfill from legacy tableGroup (if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'OrderStatusConfig'
      AND column_name = 'tableGroup'
  ) THEN
    UPDATE "OrderStatusConfig"
    SET "tableGroups" = CASE
      WHEN "tableGroup" IS NULL THEN ARRAY[]::"OrderTableGroup"[]
      ELSE ARRAY["tableGroup"]::"OrderTableGroup"[]
    END;
  END IF;
END $$;

-- 3) Drop old index/column
DROP INDEX IF EXISTS "OrderStatusConfig_tableGroup_isActive_idx";
ALTER TABLE "OrderStatusConfig" DROP COLUMN IF EXISTS "tableGroup";

-- 4) Keep a lightweight index for active statuses
DROP INDEX IF EXISTS "OrderStatusConfig_isActive_idx";
CREATE INDEX IF NOT EXISTS "OrderStatusConfig_isActive_idx" ON "OrderStatusConfig"("isActive");

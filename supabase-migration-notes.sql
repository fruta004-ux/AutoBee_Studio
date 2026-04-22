-- AutoBee Studio: 프로젝트별 메모 기능 추가
-- 실행: Supabase SQL Editor에서 한 번만 실행

ALTER TABLE studio_projects
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

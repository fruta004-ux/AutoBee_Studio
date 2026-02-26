-- AutoBee Studio: 프로젝트 테이블
CREATE TABLE IF NOT EXISTS public.studio_projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.studio_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for studio_projects" ON public.studio_projects;
CREATE POLICY "Allow all for studio_projects" ON public.studio_projects
  FOR ALL USING (true) WITH CHECK (true);

-- AutoBee Studio: 참조 이미지 테이블
CREATE TABLE IF NOT EXISTS public.studio_ref_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.studio_ref_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for studio_ref_images" ON public.studio_ref_images;
CREATE POLICY "Allow all for studio_ref_images" ON public.studio_ref_images
  FOR ALL USING (true) WITH CHECK (true);

-- AutoBee Studio: 생성 이미지 테이블
CREATE TABLE IF NOT EXISTS public.studio_generated_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  prompt_text text NOT NULL DEFAULT '',
  storage_path text NOT NULL,
  public_url text NOT NULL,
  aspect_ratio text DEFAULT '1:1',
  resolution text DEFAULT '1K',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.studio_generated_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for studio_generated_images" ON public.studio_generated_images;
CREATE POLICY "Allow all for studio_generated_images" ON public.studio_generated_images
  FOR ALL USING (true) WITH CHECK (true);

-- AutoBee Studio: 생성 로그 테이블
CREATE TABLE IF NOT EXISTS public.studio_generation_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  prompt_text text DEFAULT '',
  status text DEFAULT 'success',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.studio_generation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for studio_generation_logs" ON public.studio_generation_logs;
CREATE POLICY "Allow all for studio_generation_logs" ON public.studio_generation_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Storage 버킷 생성 (Supabase Dashboard에서 수동 생성 필요)
-- 1. studio-refs (참조 이미지) - Public
-- 2. studio-images (생성 이미지) - Public

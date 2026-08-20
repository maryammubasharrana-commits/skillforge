CREATE POLICY "Users manage own CVs (select)" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users manage own CVs (insert)" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users manage own CVs (update)" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users manage own CVs (delete)" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Staff read student CVs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'cvs' AND public.is_staff(auth.uid()));
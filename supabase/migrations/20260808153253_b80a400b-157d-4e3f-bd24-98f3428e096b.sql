
CREATE POLICY "qr_read_authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('payment-qr','avatars'));
CREATE POLICY "qr_write_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('payment-qr','avatars','payment-proofs') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "qr_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('payment-qr','avatars','payment-proofs') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "qr_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('payment-qr','avatars','payment-proofs') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "proof_read_parties" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.settlements s
        WHERE s.payee_id = auth.uid() AND s.proof_path = storage.objects.name
      )
    )
  );

-- Optional: snapshot for preview UI (fallback: full payload remains in analysis_json for service reads)
ALTER TABLE tax_letter_jobs ADD COLUMN IF NOT EXISTS preview_snapshot jsonb;

COMMENT ON COLUMN tax_letter_jobs.preview_snapshot IS 'Subset for unpaid preview: notice, risk, preview splits';

-- Optional hardening: hide sensitive columns from authenticated PostgREST SELECT.
-- Uncomment after verifying app uses only Netlify functions + granted columns for reads.
-- REVOKE SELECT ON TABLE tax_letter_jobs FROM authenticated;
-- GRANT SELECT (
--   id,
--   user_id,
--   email,
--   paid,
--   is_unlocked,
--   stripe_session_id,
--   created_at,
--   preview_snapshot
-- ) ON TABLE tax_letter_jobs TO authenticated;

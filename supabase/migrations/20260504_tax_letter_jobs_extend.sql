-- Extended columns for tax_letter_jobs (preview/result API + wizard strategy)

alter table tax_letter_jobs add column if not exists strategy_json jsonb;
alter table tax_letter_jobs add column if not exists wizard_json jsonb;
alter table tax_letter_jobs add column if not exists hard_stop boolean default false;

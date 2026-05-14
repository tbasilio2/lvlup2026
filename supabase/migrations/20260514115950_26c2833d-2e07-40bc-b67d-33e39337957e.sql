-- Add profit_loss and fees columns to journal_entries table
ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS profit_loss DECIMAL(12,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fees DECIMAL(12,2) DEFAULT NULL;

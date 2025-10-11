-- Clear all test data while preserving producer leaderboard

-- Delete disputes (0 records, but for completeness)
DELETE FROM disputes;

-- Delete payment confirmations (0 records, but for completeness)
DELETE FROM payment_confirmations;

-- Delete payment reports (1 record)
DELETE FROM payment_reports;

-- Delete submissions (3 records)
DELETE FROM submissions;
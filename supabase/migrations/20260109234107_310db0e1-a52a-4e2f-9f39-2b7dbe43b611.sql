-- Create read-only role for Cursor MCP access
CREATE ROLE cursor_readonly WITH LOGIN PASSWORD 'CHANGE_THIS_TO_YOUR_SECURE_PASSWORD';

-- Grant connect and usage
GRANT CONNECT ON DATABASE postgres TO cursor_readonly;
GRANT USAGE ON SCHEMA public TO cursor_readonly;

-- Grant SELECT on all existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO cursor_readonly;

-- Ensure future tables are also readable
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO cursor_readonly;
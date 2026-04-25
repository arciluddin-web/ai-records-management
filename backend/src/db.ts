import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category VARCHAR NOT NULL CHECK (category IN ('Issuance', 'Released', 'Received')),
      user_id VARCHAR,
      -- File attachment
      file_url VARCHAR,
      file_name VARCHAR,
      file_mime_type VARCHAR,
      file_data BYTEA,
      -- Metadata
      tags JSONB NOT NULL DEFAULT '[]',
      history JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      -- Issuance fields
      control_number_sequence VARCHAR,
      release_date DATE,
      release_time TIME,
      heading_addressee VARCHAR,
      subject VARCHAR,
      signatory VARCHAR,
      -- Shared Released + Received fields
      grds_code VARCHAR,
      internal_code VARCHAR,
      document_no VARCHAR,
      date_released DATE,
      time_released TIME,
      type_of_document VARCHAR,
      date_of_document DATE,
      details TEXT,
      remarks TEXT,
      sender VARCHAR,
      receiver VARCHAR,
      copy_furnished VARCHAR,
      received_by VARCHAR,
      date_delivered DATE,
      time_delivered TIME,
      -- Received only
      sender_office VARCHAR
    );
  `);
}

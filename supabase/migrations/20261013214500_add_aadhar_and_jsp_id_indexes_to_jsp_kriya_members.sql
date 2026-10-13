/*
  # Add Missing Indexes on jsp_kriya_members

  ## Problem
  The table `jsp_kriya_members` contains over 2.45 million rows.
  Currently, only `mobile` is indexed (`idx_kriya_mobile`).
  Columns `aadhar_number`, `nominee_aadhar_number`, and `jsp_id` do not have B-tree indexes.
  As a result, searching by Aadhaar number (or JSP ID) triggers a full-table sequential scan
  that exceeds PostgreSQL's statement timeout (8,000ms), failing with code 57014.

  ## Solution
  Create B-tree indexes for `aadhar_number`, `nominee_aadhar_number`, and `jsp_id`.
  This speeds up lookups from >8,000ms (timeout) to under 10ms.
*/

CREATE INDEX IF NOT EXISTS idx_jsp_kriya_members_aadhar
  ON jsp_kriya_members(aadhar_number);

CREATE INDEX IF NOT EXISTS idx_jsp_kriya_members_nominee_aadhar
  ON jsp_kriya_members(nominee_aadhar_number);

CREATE INDEX IF NOT EXISTS idx_jsp_kriya_members_jsp_id
  ON jsp_kriya_members(jsp_id);

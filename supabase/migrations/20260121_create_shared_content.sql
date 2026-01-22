-- Create shared_content table for shareable links
CREATE TABLE IF NOT EXISTS shared_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shared_content_share_id ON shared_content(share_id);
CREATE INDEX IF NOT EXISTS idx_shared_content_user_id ON shared_content(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_content_expires_at ON shared_content(expires_at);

-- Enable Row Level Security
ALTER TABLE shared_content ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own shares
CREATE POLICY "Users can create their own shares"
  ON shared_content
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Anyone can view non-expired shares (for public share page)
CREATE POLICY "Anyone can view non-expired shares"
  ON shared_content
  FOR SELECT
  USING (expires_at > NOW());

-- Policy: Users can update their own shares
CREATE POLICY "Users can update their own shares"
  ON shared_content
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own shares
CREATE POLICY "Users can delete their own shares"
  ON shared_content
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create a function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_shared_content_updated_at ON shared_content;
CREATE TRIGGER update_shared_content_updated_at
  BEFORE UPDATE ON shared_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a function to clean up expired shares (can be called via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS void AS $$
BEGIN
  DELETE FROM shared_content WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

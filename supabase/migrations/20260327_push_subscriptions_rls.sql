-- Enable RLS on push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all subscriptions (needed for sending notifications)
CREATE POLICY "Authenticated users can read push_subscriptions"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert their own subscriptions
CREATE POLICY "Authenticated users can insert push_subscriptions"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can delete their own subscriptions
CREATE POLICY "Authenticated users can delete push_subscriptions"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (true);

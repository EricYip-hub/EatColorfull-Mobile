-- Ensure RLS is enabled on realtime.messages (used for Realtime channel authorization)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop prior versions if re-running
DROP POLICY IF EXISTS "Users read own notification channel" ON realtime.messages;
DROP POLICY IF EXISTS "Users write own notification channel" ON realtime.messages;

-- Allow authenticated users to receive messages only on their own notifications-<uid> topic
CREATE POLICY "Users read own notification channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notifications-' || auth.uid()::text
);

-- Allow authenticated users to send messages only on their own notifications-<uid> topic
CREATE POLICY "Users write own notification channel"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'notifications-' || auth.uid()::text
);

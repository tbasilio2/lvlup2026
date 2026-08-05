REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can read messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can send messages" ON realtime.messages;

CREATE POLICY "Users read own realtime topics"
ON realtime.messages FOR SELECT TO authenticated
USING (realtime.topic() = ('user:' || auth.uid()::text));

CREATE POLICY "Users send own realtime topics"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (realtime.topic() = ('user:' || auth.uid()::text));
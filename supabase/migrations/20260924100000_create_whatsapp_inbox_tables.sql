-- Create whatsapp_chats table
CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  phone_number TEXT NOT NULL,
  sc_number TEXT,
  circle_name TEXT,
  mandal_name TEXT,
  applied_load_kw NUMERIC,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_direction TEXT DEFAULT 'inbound',
  unread_count INT DEFAULT 1,
  status TEXT DEFAULT 'open',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- 'inbound' or 'outbound'
  type TEXT DEFAULT 'text',
  content TEXT NOT NULL,
  sender_name TEXT,
  sender_phone TEXT,
  receiver_phone TEXT,
  status TEXT DEFAULT 'delivered',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users and service role full access
DROP POLICY IF EXISTS "Allow authenticated whatsapp_chats" ON public.whatsapp_chats;
CREATE POLICY "Allow authenticated whatsapp_chats" ON public.whatsapp_chats FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read whatsapp_chats" ON public.whatsapp_chats;
CREATE POLICY "Allow public read whatsapp_chats" ON public.whatsapp_chats FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Allow authenticated whatsapp_messages" ON public.whatsapp_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Allow public read whatsapp_messages" ON public.whatsapp_messages FOR ALL TO anon USING (true) WITH CHECK (true);

-- Enable Realtime replication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_chats;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://hhjefeaiklokuzcrnlnb.supabase.co";
const SUPABASE_KEY = "sb_publishable_E6MXoy6tRNhQSn67eTbLfA__FuZSJ7c";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
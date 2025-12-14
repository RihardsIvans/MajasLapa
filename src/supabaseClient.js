import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_https://ybdvdennqfvxpfavyooq.supabase.co;
const supabaseAnonKey = import.meta.env.VITE_sb_publishable_X6UyVC4vhn10FGqswpMDIg_s8XLXo2l;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

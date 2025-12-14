import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ybdvdennqfvxpfavyooq.supabase.co';
const supabaseAnonKey = 'sb_publishable_X6UyVC4vhn10FGqswpMDIg_s8XLXo2l';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

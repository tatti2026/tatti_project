import { createClient } from '@supabase/supabase-js';
import { config } from '../config/environment.js';

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

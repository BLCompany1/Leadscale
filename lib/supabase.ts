import { createClient } from '@supabase/supabase-js'

// Estas variáveis buscam os dados do arquivo .env que criaremos a seguir
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
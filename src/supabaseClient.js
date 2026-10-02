import { createClient } from '@supabase/supabase-js'

// جلب مفاتيح الربط بأمان من ملف المتغيرات البيئية لحماية قاعدة البيانات
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("تنبيه: مفاتيح اتصال قاعدة البيانات غير معرفة حتى الآن")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

import { createClient } from '@supabase/supabase-js'

// Reemplazá estos textos con tus credenciales reales de Supabase
const supabaseUrl = 'https://pdwmjdrxpciabuzuxupf.supabase.co/rest/v1/'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkd21qZHJ4cGNpYWJ1enV4dXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNjQ0NDEsImV4cCI6MjA5NzY0MDQ0MX0.EF0dhFzqSOssWlhY5701wiNWvZl8MXbNCsc2jI0Cpgo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
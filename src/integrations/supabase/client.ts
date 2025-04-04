
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://kvwpsqdyscbjdhvprgyk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2d3BzcWR5c2NiamRodnByZ3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NTk4NjUsImV4cCI6MjA1ODIzNTg2NX0.SuAzVDGq1MYWhPiSU8ReyTscbGZ8iJ2Dkr0dDe1cXxU";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'outliers-app/1.0.0',
    },
    fetch: (...args) => {
      const [resource, config] = args;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
      
      return fetch(resource, {
        ...config,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    }
  },
  realtime: {
    timeout: 30000, // 30 seconds timeout for realtime
  }
});

// Initialize tables only once
const tablesInitialized = {
  commentLikes: false,
  notifications: false
};

// Essas funções agora são muito mais simples, pois as tabelas já foram criadas pelo SQL
export const ensureCommentLikesTable = async () => {
  if (tablesInitialized.commentLikes) return;
  
  try {
    console.log('Verificando tabela comment_likes...');
    const { count, error } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .limit(1);
      
    if (!error) {
      tablesInitialized.commentLikes = true;
      console.log('Tabela comment_likes está pronta');
    } else {
      console.error('Erro ao verificar tabela comment_likes:', error);
    }
  } catch (error) {
    console.error('Falha ao verificar tabela comment_likes:', error);
  }
};

export const ensureNotificationsTable = async () => {
  if (tablesInitialized.notifications) return;
  
  try {
    console.log('Verificando tabela notifications...');
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .limit(1);
      
    if (!error) {
      tablesInitialized.notifications = true;
      console.log('Tabela notifications está pronta');
    } else {
      console.error('Erro ao verificar tabela notifications:', error);
    }
  } catch (error) {
    console.error('Falha ao verificar tabela notifications:', error);
  }
};

export interface AiCitation {
  title: string;
  reference: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: AiCitation[];
  tokens_count: number;
  model?: string;
  created_at: string;
}

export interface AiConversation {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  status: string;
  tokens_used: number;
  created_at: string;
  updated_at: string;
  course?: {
    id: string;
    code: string;
    title: string;
  };
  messages?: AiMessage[];
}

export interface AiUsage {
  total_conversations: number;
  total_tokens_consumed: number;
  model_name: string;
  quota_limit: number;
  remaining_quota: number;
}

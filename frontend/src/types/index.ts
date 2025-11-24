export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'supervisor' | 'enumerator';
  supervisor_id?: string;
  team_id?: string;
  created_at: string;
}

export interface Respondent {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  status: 'pending' | 'in_progress' | 'completed';
  enumerator_id?: string;
  assigned_by?: string;
  survey_data?: any;
  created_at: string;
  updated_at: string;
}

export interface LocationTracking {
  id?: string;
  user_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  is_synced?: boolean;
}

export interface Message {
  id?: string;
  sender_id: string;
  receiver_id?: string;
  message_type: 'ai' | 'supervisor';
  content: string;
  response?: string;
  timestamp: string;
  is_synced?: boolean;
  answered?: boolean;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  created_at: string;
}

export interface DashboardStats {
  total_respondents: number;
  pending: number;
  in_progress: number;
  completed: number;
  active_enumerators: number;
  total_enumerators: number;
}

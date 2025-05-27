export interface CustomerDetails {
  id: string;
  name: string;
  email: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  customer_type: string | null;
  industry: string | null;
  customer_profile: string | null;
  customer_profile_update_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgDetails {
  org_id: string;
  org_name: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerContact {
  id: string;
  customer_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  is_primary: boolean;
  metadata: any | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  platform_type: string;
  is_group: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

export interface Call {
  id: string;
  name: string;
  duration: number;
  meeting_url: string | null;
  recording_url: string | null;
  scheduled_start_time: string | null;
  actual_start_time: string | null;
  end_time: string | null;
  status: string;
  created_at: string;
}

export interface Participant {
  id: string;
  call_id: string;
  participant_type: string;
  agent_id: string | null;
  name: string;
  role: string;
  joined_at: string | null;
  left_at: string | null;
}

export interface CustomerGoal {
  id: string;
  customer_id: string;
  goal_text: string;
  created_at: string;
  updated_at: string;
}

export interface KeyDeliverable {
  id: string;
  customer_id: string;
  deliverable_text: string;
  is_editable: boolean;
  priority: string; // 'high', 'medium', 'low'
  status: string; // 'not_started', 'in_progress', 'completed'
  created_at: string;
  updated_at: string;
}

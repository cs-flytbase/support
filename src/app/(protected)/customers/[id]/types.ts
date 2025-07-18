export interface CustomerDetails {
  partner_org_id?: string | null;
  id: string;
  name: string;
  email: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  region: string | null;
  customer_type: string | null;
  industry: string | null;
  customer_profile: string | null;
  customer_profile_update_time: string | null;
  created_at: string;
  updated_at: string;
  last_call_date?: string | null;
  primary_contact_id?: string | null;
  health_score?: number | null;
  call_sentiment_score?: number | null;
  // Business Development Fields
  closed_won?: number | null;
  Contracted?: number | null;
  totalPipelineAmount?: number | null;
  "Weighted Pipeline"?: number | null;
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
  priority: string; // 'high', 'medium', 'low'
  status: string; // 'not_started', 'in_progress', 'completed'
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
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
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  name: string;
  stage: string;
  closureDate: string;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  pipeline?: string | null;
  dealType?: string | null;
  forecastAmount?: number | null;
  projectedAmount?: number | null;
  probability?: number | null;
  isClosed?: boolean | null;
  isClosedWon?: boolean | null;
  isClosedLost?: boolean | null;
  priority?: string | null;
  relationshipType?: string | null;
}

-- HubSpot Integration Migration
-- This migration adds HubSpot data structures to existing tables and creates new tables for HubSpot-specific data

-- Add HubSpot columns to existing companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hubspot_company_id TEXT UNIQUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hubspot_raw_data JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hubspot_synced_at TIMESTAMPTZ;

-- Add HubSpot columns to existing contacts table  
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS hubspot_contact_id TEXT UNIQUE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS hubspot_raw_data JSONB;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS hubspot_synced_at TIMESTAMPTZ;

-- Add HubSpot columns to existing deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS hubspot_deal_id TEXT UNIQUE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS hubspot_owner_id TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS hubspot_raw_data JSONB;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS hubspot_synced_at TIMESTAMPTZ;

-- Create deal_engagements table for HubSpot engagement data
CREATE TABLE IF NOT EXISTS deal_engagements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- Clerk user ID
    hubspot_engagement_id TEXT NOT NULL,
    engagement_type TEXT NOT NULL CHECK (engagement_type IN ('NOTE', 'EMAIL', 'CALL', 'MEETING', 'TASK')),
    subject TEXT,
    body TEXT,
    activity_type TEXT,
    timestamp TIMESTAMPTZ,
    hubspot_raw_data JSONB,
    embedding_text TEXT,
    embedding_vector vector(1536),
    hubspot_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hubspot_associations table for tracking HubSpot object associations
CREATE TABLE IF NOT EXISTS hubspot_associations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_object_type TEXT NOT NULL CHECK (from_object_type IN ('contact', 'deal', 'company')),
    from_object_id TEXT NOT NULL, -- Changed to TEXT to handle both integer and UUID primary keys
    from_hubspot_id TEXT NOT NULL,
    to_object_type TEXT NOT NULL CHECK (to_object_type IN ('contact', 'deal', 'company')),
    to_object_id TEXT NOT NULL, -- Changed to TEXT to handle both integer and UUID primary keys
    to_hubspot_id TEXT NOT NULL,
    association_type TEXT NOT NULL,
    association_type_id INTEGER,
    association_category TEXT DEFAULT 'HUBSPOT_DEFINED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    hubspot_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_hubspot_id ON companies(hubspot_company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_hubspot_id ON contacts(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_hubspot_id ON deals(hubspot_deal_id);
CREATE INDEX IF NOT EXISTS idx_deals_hubspot_owner ON deals(hubspot_owner_id);

CREATE INDEX IF NOT EXISTS idx_deal_engagements_deal_id ON deal_engagements(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_engagements_user_id ON deal_engagements(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_engagements_hubspot_id ON deal_engagements(hubspot_engagement_id);
CREATE INDEX IF NOT EXISTS idx_deal_engagements_type ON deal_engagements(engagement_type);
CREATE INDEX IF NOT EXISTS idx_deal_engagements_timestamp ON deal_engagements(timestamp);

-- Create indexes for hubspot_associations table
CREATE INDEX IF NOT EXISTS idx_hubspot_assoc_from_object ON hubspot_associations(from_object_type, from_object_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_assoc_to_object ON hubspot_associations(to_object_type, to_object_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_assoc_from_hubspot ON hubspot_associations(from_hubspot_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_assoc_to_hubspot ON hubspot_associations(to_hubspot_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_assoc_type ON hubspot_associations(association_type);

-- Create unique constraint to prevent duplicate engagements
CREATE UNIQUE INDEX IF NOT EXISTS unique_hubspot_engagement 
ON deal_engagements(hubspot_engagement_id, deal_id);

-- Create unique constraint to prevent duplicate associations
CREATE UNIQUE INDEX IF NOT EXISTS unique_hubspot_association 
ON hubspot_associations(from_object_type, from_hubspot_id, to_object_type, to_hubspot_id, association_type_id);

-- Add RLS policies for deal_engagements
ALTER TABLE deal_engagements ENABLE ROW LEVEL SECURITY;

-- Users can only see engagements for deals they have access to
CREATE POLICY "Users can view their deal engagements" ON deal_engagements
FOR SELECT USING (
    user_id = auth.jwt() ->> 'sub' OR
    EXISTS (
        SELECT 1 FROM deals 
        WHERE deals.id = deal_engagements.deal_id 
        AND deals.hubspot_owner_id = (
            SELECT hubspot_owner_id FROM users 
            WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    )
);

-- Users can only insert engagements for their deals
CREATE POLICY "Users can insert their deal engagements" ON deal_engagements
FOR INSERT WITH CHECK (
    user_id = auth.jwt() ->> 'sub' AND
    EXISTS (
        SELECT 1 FROM deals 
        WHERE deals.id = deal_engagements.deal_id 
        AND deals.hubspot_owner_id = (
            SELECT hubspot_owner_id FROM users 
            WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    )
);

-- Users can update their own engagements
CREATE POLICY "Users can update their deal engagements" ON deal_engagements
FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');

-- Users can delete their own engagements
CREATE POLICY "Users can delete their deal engagements" ON deal_engagements
FOR DELETE USING (user_id = auth.jwt() ->> 'sub');

-- Add RLS policies for hubspot_associations
ALTER TABLE hubspot_associations ENABLE ROW LEVEL SECURITY;

-- Service role can manage all associations
CREATE POLICY "Service role can manage all hubspot associations" ON hubspot_associations
FOR ALL USING (auth.role() = 'service_role');

-- Users can view associations for their objects
CREATE POLICY "Users can view hubspot associations" ON hubspot_associations
FOR SELECT USING (
    -- Allow if user owns the from object
    (from_object_type = 'contact' AND EXISTS (
        SELECT 1 FROM contacts 
        WHERE contacts.id::TEXT = hubspot_associations.from_object_id
    )) OR
    (from_object_type = 'deal' AND EXISTS (
        SELECT 1 FROM deals 
        WHERE deals.id::TEXT = hubspot_associations.from_object_id 
        AND deals.hubspot_owner_id = (
            SELECT hubspot_owner_id FROM users 
            WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    )) OR
    (from_object_type = 'company' AND EXISTS (
        SELECT 1 FROM companies 
        WHERE companies.id::TEXT = hubspot_associations.from_object_id
    ))
);

-- Add hubspot_owner_id to users table for mapping HubSpot owners to Clerk users
ALTER TABLE users ADD COLUMN IF NOT EXISTS hubspot_owner_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_hubspot_owner ON users(hubspot_owner_id);

-- Update trigger for deal_engagements
CREATE OR REPLACE FUNCTION update_deal_engagements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deal_engagements_updated_at_trigger
    BEFORE UPDATE ON deal_engagements
    FOR EACH ROW
    EXECUTE FUNCTION update_deal_engagements_updated_at();

-- Update trigger for hubspot_associations
CREATE OR REPLACE FUNCTION update_hubspot_associations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hubspot_associations_updated_at_trigger
    BEFORE UPDATE ON hubspot_associations
    FOR EACH ROW
    EXECUTE FUNCTION update_hubspot_associations_updated_at();

-- Enable Realtime for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE deal_engagements;
ALTER PUBLICATION supabase_realtime ADD TABLE hubspot_associations;

-- Grant appropriate permissions
GRANT ALL ON deal_engagements TO authenticated;
GRANT ALL ON deal_engagements TO service_role;
GRANT ALL ON hubspot_associations TO authenticated;
GRANT ALL ON hubspot_associations TO service_role;

-- Comments for documentation
COMMENT ON TABLE deal_engagements IS 'Stores HubSpot engagement data (emails, notes, calls, meetings, tasks) associated with deals';
COMMENT ON COLUMN deal_engagements.engagement_type IS 'Type of engagement: NOTE, EMAIL, CALL, MEETING, or TASK';
COMMENT ON COLUMN deal_engagements.hubspot_engagement_id IS 'Original HubSpot engagement ID for sync tracking';
COMMENT ON COLUMN deal_engagements.embedding_vector IS 'Vector embedding for semantic search of engagement content';

COMMENT ON TABLE hubspot_associations IS 'Stores HubSpot object associations (relationships between contacts, deals, and companies)';
COMMENT ON COLUMN hubspot_associations.from_object_type IS 'Type of source object: contact, deal, or company';
COMMENT ON COLUMN hubspot_associations.from_object_id IS 'Internal object ID - can be integer (contacts/companies) or UUID (deals)';

-- Create a function to get companies with stats (for performance optimization)
CREATE OR REPLACE FUNCTION get_companies_with_stats()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  domain TEXT,
  industry TEXT,
  city TEXT,
  state TEXT,
  hubspot_company_id TEXT,
  contact_count BIGINT,
  deal_count BIGINT,
  total_deal_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.domain,
    c.industry,
    c.city,
    c.state,
    c.hubspot_company_id,
    COALESCE(contact_counts.count, 0) as contact_count,
    COALESCE(deal_counts.count, 0) as deal_count,
    COALESCE(deal_values.total_value, 0) as total_deal_value
  FROM companies c
  LEFT JOIN (
    SELECT company_id, COUNT(*) as count
    FROM contacts
    WHERE company_id IS NOT NULL
    GROUP BY company_id
  ) contact_counts ON c.id = contact_counts.company_id
  LEFT JOIN (
    SELECT company_id, COUNT(*) as count
    FROM deals
    WHERE company_id IS NOT NULL
    GROUP BY company_id
  ) deal_counts ON c.id = deal_counts.company_id
  LEFT JOIN (
    SELECT company_id, SUM(deal_value) as total_value
    FROM deals
    WHERE company_id IS NOT NULL AND deal_value IS NOT NULL
    GROUP BY company_id
  ) deal_values ON c.id = deal_values.company_id
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql;
COMMENT ON COLUMN hubspot_associations.from_hubspot_id IS 'HubSpot ID of the source object';
COMMENT ON COLUMN hubspot_associations.to_object_type IS 'Type of target object: contact, deal, or company';
COMMENT ON COLUMN hubspot_associations.to_object_id IS 'Internal object ID - can be integer (contacts/companies) or UUID (deals)';
COMMENT ON COLUMN hubspot_associations.to_hubspot_id IS 'HubSpot ID of the target object';
COMMENT ON COLUMN hubspot_associations.association_type IS 'Type of association as defined by HubSpot';
COMMENT ON COLUMN hubspot_associations.association_type_id IS 'Numeric ID of the association type from HubSpot';
COMMENT ON COLUMN hubspot_associations.association_category IS 'Category of association (HUBSPOT_DEFINED, USER_DEFINED, etc.)';

COMMENT ON COLUMN companies.hubspot_company_id IS 'HubSpot company ID for sync tracking';
COMMENT ON COLUMN contacts.hubspot_contact_id IS 'HubSpot contact ID for sync tracking';  
COMMENT ON COLUMN deals.hubspot_deal_id IS 'HubSpot deal ID for sync tracking';
COMMENT ON COLUMN deals.hubspot_owner_id IS 'HubSpot user ID who owns this deal';
COMMENT ON COLUMN users.hubspot_owner_id IS 'HubSpot user ID mapped to this Clerk user';

-- Add function to find duplicate associations
create or replace function get_duplicate_associations(from_type text, to_type text)
returns table (
  from_object_id text,
  to_object_id text,
  count bigint
) as $$
begin
  return query
  select 
    ha.from_object_id,
    ha.to_object_id,
    count(*) as count
  from hubspot_associations ha
  where ha.from_object_type = from_type
  and ha.to_object_type = to_type
  group by ha.from_object_id, ha.to_object_id
  having count(*) > 1
  order by count desc;
end;
$$ language plpgsql security definer;

-- Create the trigger function first
CREATE OR REPLACE FUNCTION public.update_hubspot_associations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the associations table
CREATE TABLE IF NOT EXISTS public.hubspot_associations (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  from_object_type character varying(50) NOT NULL,
  from_object_id text NOT NULL,
  from_hubspot_id character varying(255) NOT NULL,
  to_object_type character varying(50) NOT NULL,
  to_object_id text NOT NULL,
  to_hubspot_id character varying(255) NOT NULL,
  association_type character varying(100) NULL,
  association_category character varying(50) NULL DEFAULT 'HUBSPOT_DEFINED'::character varying,
  association_type_id integer NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  hubspot_synced_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT hubspot_associations_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hubspot_associations_from_hubspot 
ON public.hubspot_associations USING btree (from_object_type, from_hubspot_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_hubspot_associations_to_hubspot 
ON public.hubspot_associations USING btree (to_object_type, to_hubspot_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_hubspot_associations_type 
ON public.hubspot_associations USING btree (association_type) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_hubspot_associations_from_object 
ON public.hubspot_associations USING btree (from_object_type, from_object_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_hubspot_associations_to_object 
ON public.hubspot_associations USING btree (to_object_type, to_object_id) 
TABLESPACE pg_default;

-- Create unique constraint for preventing duplicate associations
CREATE UNIQUE INDEX IF NOT EXISTS idx_hubspot_associations_unique 
ON public.hubspot_associations USING btree (
  from_object_type,
  from_hubspot_id,
  to_object_type,
  to_hubspot_id,
  association_type_id
) 
TABLESPACE pg_default;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER hubspot_associations_update_timestamp 
BEFORE UPDATE ON hubspot_associations 
FOR EACH ROW 
EXECUTE FUNCTION update_hubspot_associations_timestamp();

-- Add comments for documentation
COMMENT ON TABLE public.hubspot_associations IS 'Stores associations between HubSpot objects (companies, contacts, deals)';
COMMENT ON COLUMN public.hubspot_associations.from_object_type IS 'Type of the source object (company, contact, deal)';
COMMENT ON COLUMN public.hubspot_associations.from_hubspot_id IS 'HubSpot ID of the source object';
COMMENT ON COLUMN public.hubspot_associations.to_object_type IS 'Type of the target object (company, contact, deal)';
COMMENT ON COLUMN public.hubspot_associations.to_hubspot_id IS 'HubSpot ID of the target object';
COMMENT ON COLUMN public.hubspot_associations.association_type IS 'Type of association between the objects';
COMMENT ON COLUMN public.hubspot_associations.association_category IS 'Category of the association (HUBSPOT_DEFINED, USER_DEFINED, etc)';
COMMENT ON COLUMN public.hubspot_associations.association_type_id IS 'HubSpot association type ID'; 
-- Costco Agent Assist Analytics - BigQuery Setup
-- Run this to create the analytics dataset and tables

-- Create dataset
CREATE SCHEMA IF NOT EXISTS `costco_analytics`
OPTIONS(
  description="Costco Agent Assist conversation analytics and insights",
  location="us-central1"
);

-- Conversations Analytics Table
CREATE TABLE IF NOT EXISTS `costco_analytics.conversations_analytics` (
  -- Identity
  session_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,

  -- Conversation Metadata
  channel STRING, -- 'chat', 'voice', 'sms'
  duration_seconds INT64,
  turn_count INT64,

  -- AI Insights
  sentiment_score FLOAT64, -- -1.0 to 1.0
  sentiment_label STRING, -- 'positive', 'neutral', 'negative'
  sentiment_magnitude FLOAT64, -- Strength of sentiment

  -- Topics and Categories
  topics ARRAY<STRING>,
  primary_topic STRING,
  issue_category STRING, -- 'technical_support', 'billing', 'product_info', etc.

  -- Entities Extracted
  entities ARRAY<STRUCT<
    type STRING, -- 'product', 'location', 'person', 'date', etc.
    value STRING,
    confidence FLOAT64
  >>,

  -- Products and Opportunities
  product_mentions ARRAY<STRING>,
  appliance_types ARRAY<STRING>, -- 'refrigerator', 'washer', 'dryer', etc.

  -- Customer Intent and Outcome
  intent STRING, -- 'support', 'purchase_inquiry', 'complaint', 'feedback'
  resolution_status STRING, -- 'resolved', 'escalated', 'pending', 'unresolved'
  customer_satisfaction STRING, -- 'satisfied', 'neutral', 'dissatisfied'

  -- Lead Intelligence
  lead_score FLOAT64, -- 0-100
  business_opportunity STRING, -- 'business_center_lead', 'premium_product', 'bulk_purchase', null
  opportunity_value_estimate FLOAT64,

  -- Agent Performance
  agent_id STRING,
  first_response_time_seconds INT64,
  knowledge_gaps ARRAY<STRING>,

  -- Content
  transcript_summary STRING,
  full_transcript STRING,
  key_phrases ARRAY<STRING>,

  -- Technical
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  ai_model_version STRING
)
PARTITION BY DATE(timestamp)
CLUSTER BY channel, intent, issue_category, business_opportunity
OPTIONS(
  description="Detailed conversation analytics with AI insights"
);

-- Daily Insights Aggregation Table
CREATE TABLE IF NOT EXISTS `costco_analytics.daily_insights` (
  insight_date DATE NOT NULL,

  -- Volume Metrics
  total_conversations INT64,
  total_duration_hours FLOAT64,
  avg_conversation_duration_seconds FLOAT64,

  -- Channel Distribution
  chat_conversations INT64,
  voice_conversations INT64,

  -- Sentiment Metrics
  avg_sentiment_score FLOAT64,
  positive_conversations INT64,
  neutral_conversations INT64,
  negative_conversations INT64,

  -- Resolution Metrics
  resolved_count INT64,
  unresolved_count INT64,
  resolution_rate FLOAT64,

  -- Customer Satisfaction
  satisfied_count INT64,
  dissatisfied_count INT64,
  satisfaction_rate FLOAT64,

  -- Lead Intelligence
  total_leads INT64,
  business_center_leads INT64,
  avg_lead_score FLOAT64,
  estimated_opportunity_value FLOAT64,

  -- Top Topics
  top_topics ARRAY<STRUCT<topic STRING, count INT64>>,
  top_products ARRAY<STRUCT<product STRING, count INT64>>,
  top_issues ARRAY<STRUCT<issue STRING, count INT64>>,

  -- Processing
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY insight_date
OPTIONS(
  description="Daily aggregated insights and KPIs"
);

-- Product Performance Table
CREATE TABLE IF NOT EXISTS `costco_analytics.product_insights` (
  product_name STRING NOT NULL,
  appliance_type STRING,

  -- Time
  analysis_date DATE NOT NULL,

  -- Volume
  mention_count INT64,
  support_request_count INT64,

  -- Sentiment
  avg_sentiment FLOAT64,
  positive_mentions INT64,
  negative_mentions INT64,

  -- Common Issues
  common_issues ARRAY<STRUCT<issue STRING, count INT64>>,

  -- Sales Opportunities
  purchase_inquiries INT64,
  cross_sell_opportunities INT64,

  -- Processing
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY analysis_date
CLUSTER BY appliance_type, product_name
OPTIONS(
  description="Product-specific analytics and support trends"
);

-- Lead Intelligence Table
CREATE TABLE IF NOT EXISTS `costco_analytics.leads` (
  lead_id STRING NOT NULL,
  session_id STRING NOT NULL,
  identified_at TIMESTAMP NOT NULL,

  -- Lead Classification
  lead_type STRING, -- 'business_center', 'premium_product', 'bulk_purchase', 'membership_upgrade'
  lead_score FLOAT64,
  opportunity_value_estimate FLOAT64,

  -- Customer Context
  customer_indicators ARRAY<STRING>,
  products_interested ARRAY<STRING>,
  business_signals ARRAY<STRING>,

  -- Conversation Context
  conversation_summary STRING,
  key_insights STRING,

  -- Follow-up
  recommended_action STRING,
  priority STRING, -- 'high', 'medium', 'low'
  assigned_to STRING,
  status STRING, -- 'new', 'contacted', 'qualified', 'converted', 'closed'

  -- Tracking
  contacted_at TIMESTAMP,
  converted_at TIMESTAMP,
  conversion_value FLOAT64
)
PARTITION BY DATE(identified_at)
CLUSTER BY lead_type, status, priority
OPTIONS(
  description="Business leads and opportunities identified from conversations"
);

-- Create views for common queries

-- Recent Conversations View
CREATE OR REPLACE VIEW `costco_analytics.recent_conversations` AS
SELECT
  session_id,
  timestamp,
  channel,
  sentiment_label,
  sentiment_score,
  intent,
  resolution_status,
  customer_satisfaction,
  lead_score,
  business_opportunity,
  product_mentions,
  transcript_summary
FROM `costco_analytics.conversations_analytics`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY timestamp DESC;

-- Today's Dashboard View
CREATE OR REPLACE VIEW `costco_analytics.todays_dashboard` AS
SELECT
  COUNT(*) as total_conversations,
  AVG(sentiment_score) as avg_sentiment,
  COUNTIF(sentiment_label = 'positive') as positive_count,
  COUNTIF(sentiment_label = 'negative') as negative_count,
  COUNTIF(resolution_status = 'resolved') as resolved_count,
  COUNTIF(business_opportunity IS NOT NULL) as leads_count,
  AVG(lead_score) as avg_lead_score,
  ARRAY_AGG(DISTINCT primary_topic IGNORE NULLS LIMIT 10) as top_topics
FROM `costco_analytics.conversations_analytics`
WHERE DATE(timestamp) = CURRENT_DATE();

-- Business Center Leads View
CREATE OR REPLACE VIEW `costco_analytics.business_center_leads_active` AS
SELECT
  l.lead_id,
  l.session_id,
  l.identified_at,
  l.lead_score,
  l.opportunity_value_estimate,
  l.products_interested,
  l.business_signals,
  l.recommended_action,
  c.transcript_summary,
  c.sentiment_label
FROM `costco_analytics.leads` l
JOIN `costco_analytics.conversations_analytics` c
  ON l.session_id = c.session_id
WHERE l.lead_type = 'business_center'
  AND l.status IN ('new', 'contacted', 'qualified')
ORDER BY l.lead_score DESC, l.identified_at DESC;

-- Analytics Summary Query Example
CREATE OR REPLACE VIEW `costco_analytics.weekly_summary` AS
WITH weekly_data AS (
  SELECT
    DATE_TRUNC(DATE(timestamp), WEEK) as week_start,
    COUNT(*) as conversations,
    AVG(sentiment_score) as avg_sentiment,
    COUNTIF(customer_satisfaction = 'satisfied') / COUNT(*) as satisfaction_rate,
    COUNTIF(resolution_status = 'resolved') / COUNT(*) as resolution_rate,
    COUNTIF(business_opportunity IS NOT NULL) as total_leads,
    SUM(opportunity_value_estimate) as total_opportunity_value
  FROM `costco_analytics.conversations_analytics`
  WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 12 WEEK)
  GROUP BY week_start
)
SELECT
  week_start,
  conversations,
  ROUND(avg_sentiment, 3) as avg_sentiment,
  ROUND(satisfaction_rate * 100, 1) as satisfaction_pct,
  ROUND(resolution_rate * 100, 1) as resolution_pct,
  total_leads,
  ROUND(total_opportunity_value, 2) as opportunity_value
FROM weekly_data
ORDER BY week_start DESC;

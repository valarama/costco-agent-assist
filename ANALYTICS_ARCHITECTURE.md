# Costco Agent Assist - Post-Call Analytics POC

## Executive Summary
GCP-based analytics solution for Oracle Digital Assistant chat interactions, providing BI insights and lead intelligence without AWS dependencies.

## Architecture Overview

### GCP Services Stack
1. **Cloud Storage** - Transcript and conversation storage (already implemented)
2. **BigQuery** - Data warehouse for analytics queries and aggregation
3. **Vertex AI (Gemini)** - AI-powered insights:
   - Sentiment analysis
   - Topic extraction
   - Entity recognition (products, issues, opportunities)
   - Lead scoring
4. **Cloud Functions** - Serverless ETL pipeline
5. **Looker Studio / Custom Dashboard** - BI visualization

### Data Flow
```
Oracle Digital Assistant Chats
    ↓
Cloud Storage (transcripts/*.json)
    ↓
Cloud Function (ETL + AI Analysis)
    ↓
BigQuery (analytics dataset)
    ↓
Analytics API (Next.js)
    ↓
BI Dashboard
```

## Analytics Capabilities

### 1. Conversation Metrics
- Total conversations by day/week/month
- Average conversation duration
- Peak volume times
- Channel distribution (chat vs voice)

### 2. AI-Powered Insights
- **Sentiment Analysis**: Customer satisfaction trends
- **Topic Clustering**: Common issues, product categories
- **Entity Extraction**: Products mentioned, locations, issues
- **Intent Classification**: Support, sales, complaint, etc.

### 3. Lead Intelligence
- Business opportunity identification
- Product interest signals
- Cross-sell/upsell opportunities
- Customer segment profiling

### 4. Agent Performance
- Resolution rate
- Average handling time
- Customer satisfaction by agent
- Knowledge gap identification

## BigQuery Schema

### conversations_analytics
```sql
CREATE TABLE conversations_analytics (
  session_id STRING,
  timestamp TIMESTAMP,
  channel STRING,
  duration_seconds INT64,
  turn_count INT64,
  sentiment_score FLOAT64,
  sentiment_label STRING,
  topics ARRAY<STRING>,
  entities ARRAY<STRUCT<type STRING, value STRING, confidence FLOAT64>>,
  intent STRING,
  customer_satisfaction STRING,
  resolution_status STRING,
  lead_score FLOAT64,
  business_opportunity STRING,
  product_mentions ARRAY<STRING>,
  issue_category STRING,
  transcript_summary STRING,
  full_transcript STRING
)
PARTITION BY DATE(timestamp)
CLUSTER BY channel, intent, issue_category;
```

### analytics_insights
```sql
CREATE TABLE analytics_insights (
  insight_date DATE,
  metric_type STRING,
  metric_name STRING,
  metric_value FLOAT64,
  dimensions STRUCT<
    channel STRING,
    product STRING,
    category STRING,
    region STRING
  >,
  trend_direction STRING
)
PARTITION BY insight_date;
```

## Implementation Phases

### Phase 1: Data Foundation (Week 1)
- [x] Set up BigQuery dataset
- [ ] Create analytics tables
- [ ] Build ETL Cloud Function
- [ ] Migrate existing transcripts

### Phase 2: AI Analytics (Week 2)
- [ ] Implement Vertex AI sentiment analysis
- [ ] Build topic extraction pipeline
- [ ] Add entity recognition
- [ ] Create lead scoring model

### Phase 3: BI Dashboard (Week 3)
- [ ] Create analytics API endpoints
- [ ] Build dashboard UI
- [ ] Add real-time metrics
- [ ] Implement filtering and drill-down

### Phase 4: Lead Intelligence (Week 4)
- [ ] Business opportunity detection
- [ ] Customer segment analysis
- [ ] Predictive insights
- [ ] Export capabilities

## Cost Estimate (Monthly)

- BigQuery: ~$50 (1TB queries, 10GB storage)
- Vertex AI: ~$100 (1000 analyses/day)
- Cloud Functions: ~$20 (10K invocations/day)
- Cloud Storage: ~$10 (100GB)
**Total: ~$180/month**

## Comparison with AWS Solutions

| Feature | AWS Solution | GCP Solution |
|---------|-------------|--------------|
| Data Warehouse | Redshift | BigQuery |
| AI/ML | SageMaker | Vertex AI |
| ETL | Glue | Dataflow/Functions |
| BI | QuickSight | Looker Studio |
| Voice Transcription | Transcribe | Speech-to-Text |
| Serverless | Lambda | Cloud Functions |

**Advantages of GCP**:
- Native integration with existing GCP infrastructure
- Superior AI/ML capabilities (Gemini)
- Serverless BigQuery (no cluster management)
- Cost-effective for analytics workloads
- Better integration with Costco's existing tech stack

## Demo Scenarios

### Scenario 1: Daily Operations Dashboard
View today's conversation volume, sentiment trends, common issues

### Scenario 2: Lead Intelligence
Identify customers expressing interest in premium products or bulk purchases for Business Center team

### Scenario 3: Quality Insights
Analyze agent performance, customer satisfaction, knowledge gaps

### Scenario 4: Product Insights
Track which smart appliances generate most support requests, identify improvement opportunities

## Next Steps

1. Review and approve architecture
2. Set up GCP resources (BigQuery, permissions)
3. Begin Phase 1 implementation
4. Schedule weekly demos

## Contact
Ram Valavandan - Architecture & Implementation
Lowell Knighton - Requirements & Business Alignment

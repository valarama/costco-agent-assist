# Costco Agent Assist - Analytics POC

> **POC #3**: Post-Call Analytics & Business Intelligence for Oracle Digital Assistant
> GCP-native solution for conversation analytics, sentiment analysis, and lead intelligence

## 🎯 Project Overview

This POC demonstrates a comprehensive analytics solution for Costco's Oracle Digital Assistant interactions, built entirely on Google Cloud Platform (GCP) without any AWS dependencies.

### Key Features

- **📊 Real-Time Analytics**: Dashboard with KPIs, sentiment trends, and conversation metrics
- **🤖 AI-Powered Insights**: Vertex AI (Gemini) for sentiment analysis, topic extraction, and entity recognition
- **💼 Lead Intelligence**: Automatic identification of business opportunities for Business Center team
- **📈 Trend Analysis**: Historical data analysis with visualizations
- **🔍 Product Insights**: Track which products generate support requests and sentiment

## 🏗️ Architecture

```
Oracle Digital Assistant → Cloud Storage → Cloud Function (AI Analysis)
                                                ↓
                                           BigQuery (Analytics)
                                                ↓
                                         Next.js Dashboard
```

### GCP Services Used

- **BigQuery**: Data warehouse and analytics engine
- **Vertex AI (Gemini)**: AI-powered conversation analysis
- **Cloud Functions**: Serverless ETL and processing
- **Cloud Storage**: Transcript and data storage
- **Cloud Run**: Next.js application hosting
- **Speech-to-Text**: Voice transcription (existing)

## 🚀 Quick Start

### Prerequisites

- GCP Project: `arcane-rigging-473104-k3`
- Node.js 18+
- Python 3.11+
- gcloud CLI installed and authenticated

### 1. Set Up BigQuery

```bash
gcloud auth login
gcloud config set project arcane-rigging-473104-k3

# Create analytics tables
bq query --use_legacy_sql=false < bigquery/setup.sql
```

### 2. Deploy Analytics Processor

```bash
cd analytics-processor

gcloud functions deploy costco-analytics-processor \
  --gen2 \
  --runtime=python311 \
  --region=us-central1 \
  --source=. \
  --entry-point=process_transcript \
  --trigger-bucket=service-ticket \
  --timeout=540s
```

### 3. Run Application Locally

```bash
npm install
npm run dev
```

Visit:
- **Agent Assist**: http://localhost:3000
- **Analytics Dashboard**: http://localhost:3000/analytics

### 4. Deploy to Cloud Run

```bash
gcloud run deploy agent-assist-ui \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

## 📱 Application Features

### Agent Assist UI (Existing)
- Live transcript monitoring
- Real-time AI recommendations
- Knowledge assist chatbot
- Cross-sell/upsell suggestions

### Analytics Dashboard (NEW)
- **Dashboard View**: KPIs, sentiment, resolution rates, satisfaction metrics
- **Trends View**: Historical analysis with charts and graphs
- **Leads View**: Business opportunities with lead scoring and tracking

## 📊 Analytics Capabilities

### Conversation Metrics
- Total conversations by time period
- Average conversation duration
- Peak volume times
- Channel distribution (chat/voice)

### AI-Powered Insights
- **Sentiment Analysis**: Customer satisfaction trends (-1.0 to 1.0 scale)
- **Topic Clustering**: Common issues, product categories
- **Entity Extraction**: Products, locations, issues
- **Intent Classification**: Support, sales, complaint, etc.

### Lead Intelligence
- Business opportunity identification
- Lead scoring (0-100)
- Product interest signals
- Cross-sell/upsell opportunities
- Business Center lead tracking

### Performance Metrics
- Resolution rate
- Customer satisfaction rate
- Average handling time
- Knowledge gap identification

## 🗂️ Project Structure

```
costco-agent-assist/
├── app/
│   ├── api/
│   │   ├── analytics/
│   │   │   ├── dashboard/route.js    # Dashboard metrics API
│   │   │   ├── leads/route.js        # Lead intelligence API
│   │   │   └── trends/route.js       # Trends analysis API
│   │   ├── chatbot/route.js          # AI assistant
│   │   ├── conversations/route.js    # Conversation list
│   │   └── transcript/route.js       # Transcript retrieval
│   ├── analytics/page.js             # Analytics dashboard UI
│   ├── page.js                       # Agent assist UI
│   └── layout.js
├── analytics-processor/
│   ├── main.py                       # Cloud Function for analytics
│   └── requirements.txt
├── bigquery/
│   └── setup.sql                     # BigQuery schema
├── main.py                           # Audio transcription function
├── ANALYTICS_ARCHITECTURE.md         # Architecture documentation
├── DEPLOYMENT.md                     # Deployment guide
└── package.json
```

## 🔗 Live URLs

### Production
- **Agent Assist**: https://agent-assist-ui-208156119451.us-central1.run.app
- **Analytics Dashboard**: https://agent-assist-ui-208156119451.us-central1.run.app/analytics

### API Endpoints
- `GET /api/analytics/dashboard?range=today|week|month`
- `GET /api/analytics/trends?period=daily&days=30`
- `GET /api/analytics/leads?status=new&type=all`
- `POST /api/analytics/leads` (update lead status)

## 📖 Documentation

- **[ANALYTICS_ARCHITECTURE.md](./ANALYTICS_ARCHITECTURE.md)**: Detailed architecture and design decisions
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Complete deployment guide with troubleshooting
- **[BigQuery Schema](./bigquery/setup.sql)**: Database schema and views

## 🎬 Demo Scenarios

### Scenario 1: Daily Operations Dashboard
View today's conversation volume, sentiment trends, and common issues

### Scenario 2: Lead Intelligence for Business Center
Identify customers expressing interest in premium products or bulk purchases

### Scenario 3: Quality Insights
Analyze agent performance, customer satisfaction, and knowledge gaps

### Scenario 4: Product Analytics
Track which smart appliances generate most support requests

## 💰 Cost Estimate

- **BigQuery**: ~$50/month (1TB queries, 10GB storage)
- **Vertex AI**: ~$100/month (1000 analyses/day)
- **Cloud Functions**: ~$20/month (10K invocations/day)
- **Cloud Run**: ~$10/month (low traffic)
- **Cloud Storage**: ~$10/month (100GB)

**Total**: ~$190/month

## 🔒 Security

- Service account authentication
- IAM-based access control
- Encrypted data at rest and in transit
- BigQuery row-level security (can be added)
- Audit logging enabled

## 📝 Sample BigQuery Queries

### Today's Dashboard
```sql
SELECT * FROM `costco_analytics.todays_dashboard`;
```

### Recent High-Value Leads
```sql
SELECT * FROM `costco_analytics.business_center_leads_active`
WHERE lead_score > 70
ORDER BY lead_score DESC
LIMIT 20;
```

### Weekly Summary
```sql
SELECT * FROM `costco_analytics.weekly_summary`
ORDER BY week_start DESC;
```

### Sentiment by Product
```sql
SELECT
  product,
  AVG(sentiment_score) as avg_sentiment,
  COUNT(*) as mention_count
FROM `costco_analytics.conversations_analytics`,
UNNEST(product_mentions) as product
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY product
ORDER BY mention_count DESC;
```

## 🤝 Team

- **Ram Valavandan**: Architecture & Implementation
- **Lowell Knighton**: Requirements & Business Alignment
- **Stefan Nguyen**: Development Support
- **Jacob Samuel**: Project Management
- **Ashwath Shetty**: Technical Review

## 🎯 Next Steps

1. ✅ Review architecture and approach
2. ✅ Set up GCP resources (BigQuery, Cloud Functions)
3. ✅ Deploy analytics processor and UI
4. 🔄 Integrate Oracle Digital Assistant export
5. 🔄 Schedule demo with stakeholders
6. 🔄 Gather feedback and iterate

## 📞 Support

For questions or issues:
1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section
2. Review Cloud Function logs: `gcloud functions logs read costco-analytics-processor --limit=50`
3. Check BigQuery for data: `SELECT COUNT(*) FROM costco_analytics.conversations_analytics`
4. Contact: ramamurthy.valavandan@mastechdigital.com

## 📜 License

Internal POC for Costco - Mastech Digital

---

**Project**: Costco POC#3 - Post-Call Analytics
**Status**: Ready for Demo
**Last Updated**: November 2025

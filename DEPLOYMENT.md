# Costco Agent Assist Analytics - Deployment Guide

## Prerequisites

- GCP Project: `arcane-rigging-473104-k3`
- Region: `us-central1`
- Permissions: BigQuery Admin, Cloud Functions Admin, Storage Admin

## Step 1: Set Up BigQuery

### 1.1 Create Dataset and Tables

```bash
# Authenticate with GCP
gcloud auth login
gcloud config set project arcane-rigging-473104-k3

# Create BigQuery dataset and tables
bq query --use_legacy_sql=false < bigquery/setup.sql
```

Or use the BigQuery Console:
1. Go to BigQuery: https://console.cloud.google.com/bigquery
2. Copy contents of `bigquery/setup.sql`
3. Run the SQL queries in the BigQuery editor

### 1.2 Verify Tables Created

```bash
bq ls costco_analytics
```

You should see:
- `conversations_analytics`
- `daily_insights`
- `product_insights`
- `leads`

## Step 2: Deploy Analytics Processor Cloud Function

### 2.1 Deploy Function

```bash
cd analytics-processor

gcloud functions deploy costco-analytics-processor \
  --gen2 \
  --runtime=python311 \
  --region=us-central1 \
  --source=. \
  --entry-point=process_transcript \
  --trigger-bucket=service-ticket \
  --set-env-vars=GCP_PROJECT=arcane-rigging-473104-k3 \
  --memory=512MB \
  --timeout=540s \
  --service-account=arcane-rigging-473104-k3@appspot.gserviceaccount.com
```

### 2.2 Verify Deployment

```bash
gcloud functions describe costco-analytics-processor --region=us-central1 --gen2
```

### 2.3 Test the Function

Upload a test transcript to trigger processing:

```bash
# The function will automatically process new transcripts in gs://service-ticket/transcripts/
# Check logs to verify
gcloud functions logs read costco-analytics-processor --region=us-central1 --gen2 --limit=50
```

## Step 3: Deploy Next.js Application

### 3.1 Install Dependencies

```bash
npm install
```

### 3.2 Test Locally

```bash
npm run dev
```

Visit:
- Agent Assist: http://localhost:3000
- Analytics Dashboard: http://localhost:3000/analytics

### 3.3 Build for Production

```bash
npm run build
```

### 3.4 Deploy to Cloud Run

```bash
gcloud builds submit --config cloudbuild.yaml

# Or manual deployment:
gcloud run deploy agent-assist-ui \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --timeout 300
```

### 3.5 Get Deployment URL

```bash
gcloud run services describe agent-assist-ui --region us-central1 --format="value(status.url)"
```

Example: `https://agent-assist-ui-208156119451.us-central1.run.app`

## Step 4: Set Up Permissions

### 4.1 Grant BigQuery Access

```bash
# Grant Cloud Run service account BigQuery access
PROJECT_NUMBER=$(gcloud projects describe arcane-rigging-473104-k3 --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding arcane-rigging-473104-k3 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding arcane-rigging-473104-k3 \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/bigquery.jobUser"
```

### 4.2 Grant Cloud Function Permissions

```bash
# Cloud Function needs BigQuery and Storage access
gcloud projects add-iam-policy-binding arcane-rigging-473104-k3 \
  --member="serviceAccount:arcane-rigging-473104-k3@appspot.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding arcane-rigging-473104-k3 \
  --member="serviceAccount:arcane-rigging-473104-k3@appspot.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

gcloud projects add-iam-policy-binding arcane-rigging-473104-k3 \
  --member="serviceAccount:arcane-rigging-473104-k3@appspot.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

## Step 5: Backfill Existing Transcripts (Optional)

### 5.1 List Existing Transcripts

```bash
gsutil ls gs://service-ticket/transcripts/
```

### 5.2 Trigger Analytics Processing

For each existing transcript, you can manually trigger the Cloud Function or create a backfill script:

```python
# backfill.py
from google.cloud import storage
import json

client = storage.Client()
bucket = client.bucket('service-ticket')

blobs = bucket.list_blobs(prefix='transcripts/')
for blob in blobs:
    if blob.name.endswith('.json'):
        print(f"Processing: {blob.name}")
        # Function will auto-process on next upload or we can invoke directly
```

## Step 6: Configure Monitoring

### 6.1 Set Up Cloud Monitoring Dashboard

1. Go to Cloud Monitoring: https://console.cloud.google.com/monitoring
2. Create Dashboard: "Costco Analytics"
3. Add Charts:
   - BigQuery query count
   - Cloud Function invocations
   - Cloud Run request latency
   - Error rates

### 6.2 Set Up Alerts

```bash
# Alert for Cloud Function failures
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Analytics Function Errors" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

## Step 7: Test the Full Pipeline

### 7.1 Upload Test Audio

```bash
# Upload a test audio file to trigger the full pipeline
gsutil cp test-audio.wav gs://audio-ingestion-bucket/
```

### 7.2 Verify Processing

1. Check Cloud Function logs for transcription
2. Check analytics processor logs for AI analysis
3. Verify data in BigQuery:

```sql
SELECT * FROM `costco_analytics.conversations_analytics`
ORDER BY timestamp DESC
LIMIT 10;
```

4. View analytics dashboard: https://your-cloud-run-url/analytics

## Step 8: Oracle Digital Assistant Integration

### 8.1 Export Oracle DA Conversations

Oracle Digital Assistant conversations need to be exported and uploaded to Cloud Storage:

```bash
# Example: Export Oracle DA chat logs and upload
gsutil cp oracle-da-exports/*.json gs://service-ticket/transcripts/
```

### 8.2 Format Requirements

Transcript JSON format expected:
```json
{
  "sessionId": "unique-session-id",
  "transcribedAt": "2025-11-14T10:30:00Z",
  "transcript": "Agent: Hello...\nCustomer: Hi...",
  "channel": "chat"
}
```

## Accessing the Application

### Agent Assist UI
```
https://agent-assist-ui-208156119451.us-central1.run.app
```

### Analytics Dashboard
```
https://agent-assist-ui-208156119451.us-central1.run.app/analytics
```

## API Endpoints

### Dashboard Metrics
```
GET /api/analytics/dashboard?range=today|week|month
```

### Trends
```
GET /api/analytics/trends?period=daily&days=30
```

### Leads
```
GET /api/analytics/leads?status=new&type=business_center
POST /api/analytics/leads
```

## Troubleshooting

### Issue: BigQuery Permission Denied

```bash
# Grant necessary permissions
gcloud projects add-iam-policy-binding arcane-rigging-473104-k3 \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
  --role="roles/bigquery.admin"
```

### Issue: Cloud Function Timeout

Increase timeout in deployment:
```bash
--timeout=540s
```

### Issue: No Data in Analytics Dashboard

1. Check if transcripts exist:
```bash
gsutil ls gs://service-ticket/transcripts/
```

2. Check BigQuery for data:
```sql
SELECT COUNT(*) FROM `costco_analytics.conversations_analytics`;
```

3. Check Cloud Function logs:
```bash
gcloud functions logs read costco-analytics-processor --limit=50
```

### Issue: Vertex AI Rate Limits

Implement retry logic or use batch processing for large volumes.

## Maintenance

### Daily Tasks
- Monitor BigQuery storage usage
- Review error logs
- Check lead quality

### Weekly Tasks
- Review analytics insights
- Update lead statuses
- Optimize BigQuery queries

### Monthly Tasks
- Cost analysis
- Performance optimization
- User feedback review

## Cost Optimization

### BigQuery
- Use partition pruning in queries: `WHERE DATE(timestamp) = CURRENT_DATE()`
- Set table expiration for old data
- Use clustering for better query performance

### Cloud Functions
- Reduce memory allocation if possible
- Optimize function runtime
- Use async processing where applicable

### Cloud Run
- Set min instances to 0 for development
- Use request-based autoscaling

## Security Best Practices

1. **Service Accounts**: Use minimal permissions
2. **API Authentication**: Enable authentication for production
3. **Data Privacy**: Ensure PII is handled correctly
4. **Encryption**: All data encrypted at rest and in transit
5. **Audit Logs**: Enable Cloud Audit Logs

## Support and Contact

- Technical Lead: Ram Valavandan
- Business Owner: Lowell Knighton
- Project: Costco POC#3 Analytics
- Documentation: This file and ANALYTICS_ARCHITECTURE.md

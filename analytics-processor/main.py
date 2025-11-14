"""
Cloud Function: Conversation Analytics Processor
Processes transcripts and generates AI-powered insights using Vertex AI
Stores results in BigQuery for BI analytics
"""

import os
import json
from datetime import datetime
from google.cloud import storage, bigquery
import vertexai
from vertexai.generative_models import GenerativeModel
import re

# Configuration
PROJECT_ID = os.environ.get('GCP_PROJECT', 'arcane-rigging-473104-k3')
LOCATION = 'us-central1'
DATASET_ID = 'costco_analytics'
TABLE_ID = 'conversations_analytics'

def analyze_conversation_with_ai(transcript, session_id):
    """Use Vertex AI Gemini to extract insights from conversation"""
    try:
        vertexai.init(project=PROJECT_ID, location=LOCATION)
        model = GenerativeModel("gemini-1.5-flash")

        analysis_prompt = f"""You are an AI analyst for Costco Smart Home Support conversations. Analyze this conversation and return a JSON response with insights.

CONVERSATION:
{transcript}

Analyze and return JSON with this EXACT structure:
{{
  "sentiment": {{
    "score": <float -1.0 to 1.0>,
    "label": "<positive|neutral|negative>",
    "magnitude": <float 0.0 to 10.0>,
    "reasoning": "<brief explanation>"
  }},
  "topics": [
    "<topic1>", "<topic2>", "<topic3>"
  ],
  "primary_topic": "<most important topic>",
  "issue_category": "<technical_support|billing|product_info|setup_help|warranty|complaint|general_inquiry>",
  "intent": "<support|purchase_inquiry|complaint|feedback|escalation>",
  "resolution_status": "<resolved|escalated|pending|unresolved>",
  "customer_satisfaction": "<satisfied|neutral|dissatisfied>",
  "entities": [
    {{"type": "product", "value": "<product name>", "confidence": 0.95}},
    {{"type": "appliance", "value": "<appliance type>", "confidence": 0.9}}
  ],
  "product_mentions": ["<product1>", "<product2>"],
  "appliance_types": ["<refrigerator|washer|dryer|dishwasher|oven|microwave|smart_home>"],
  "lead_intelligence": {{
    "is_lead": <true|false>,
    "lead_score": <int 0-100>,
    "lead_type": "<business_center_lead|premium_product|bulk_purchase|membership_upgrade|null>",
    "business_signals": ["<signal1>", "<signal2>"],
    "opportunity_value": <int estimated value in dollars>,
    "reasoning": "<why this is/isn't a lead>"
  }},
  "key_phrases": ["<important phrase 1>", "<important phrase 2>"],
  "knowledge_gaps": ["<topic agent struggled with>"],
  "summary": "<1-2 sentence summary of conversation>",
  "recommended_action": "<suggested next step if any>"
}}

ANALYSIS GUIDELINES:
- Sentiment score: -1.0 (very negative) to 1.0 (very positive)
- Magnitude: How strongly sentiment is expressed (0-10)
- Look for business opportunity signals: bulk purchases, business mentions, multiple units, budget discussions
- Business Center leads: restaurants, offices, property managers, bulk buyers
- Lead score: Consider purchase intent, budget mention, business context, urgency
- Knowledge gaps: Topics where agent seemed uncertain or couldn't help
- Be specific with product and appliance identification

Return ONLY valid JSON, no other text."""

        response = model.generate_content(analysis_prompt)
        result_text = response.text.strip()

        # Extract JSON from markdown code blocks if present
        if '```json' in result_text:
            result_text = result_text.split('```json')[1].split('```')[0].strip()
        elif '```' in result_text:
            result_text = result_text.split('```')[1].split('```')[0].strip()

        analysis = json.loads(result_text)
        print(f"AI Analysis complete for {session_id}")
        print(f"  Sentiment: {analysis['sentiment']['label']} ({analysis['sentiment']['score']})")
        print(f"  Primary Topic: {analysis['primary_topic']}")
        print(f"  Lead Score: {analysis['lead_intelligence']['lead_score']}")

        return analysis

    except Exception as e:
        print(f"AI analysis error: {e}")
        print(f"Response text: {result_text if 'result_text' in locals() else 'N/A'}")
        # Return basic analysis on error
        return {
            "sentiment": {"score": 0.0, "label": "neutral", "magnitude": 0.0, "reasoning": "Analysis failed"},
            "topics": ["unknown"],
            "primary_topic": "unknown",
            "issue_category": "general_inquiry",
            "intent": "support",
            "resolution_status": "pending",
            "customer_satisfaction": "neutral",
            "entities": [],
            "product_mentions": [],
            "appliance_types": [],
            "lead_intelligence": {
                "is_lead": False,
                "lead_score": 0,
                "lead_type": None,
                "business_signals": [],
                "opportunity_value": 0,
                "reasoning": "Analysis failed"
            },
            "key_phrases": [],
            "knowledge_gaps": [],
            "summary": "Conversation analysis failed",
            "recommended_action": None
        }

def calculate_conversation_metrics(transcript):
    """Calculate basic metrics from transcript"""
    lines = transcript.split('\n')

    # Count turns
    agent_turns = len([l for l in lines if l.startswith('Agent:')])
    customer_turns = len([l for l in lines if l.startswith('Customer:')])

    # Estimate duration (rough: 3 seconds per turn)
    estimated_duration = (agent_turns + customer_turns) * 3

    return {
        "turn_count": agent_turns + customer_turns,
        "duration_seconds": estimated_duration
    }

def insert_to_bigquery(data):
    """Insert analytics data into BigQuery"""
    try:
        client = bigquery.Client(project=PROJECT_ID)
        table_ref = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"

        # Insert row
        errors = client.insert_rows_json(table_ref, [data])

        if errors:
            print(f"BigQuery insert errors: {errors}")
            return False

        print(f"✓ Inserted analytics for {data['session_id']} into BigQuery")
        return True

    except Exception as e:
        print(f"BigQuery error: {e}")
        return False

def create_lead_record(session_id, timestamp, analysis, ai_analysis):
    """Create lead record if business opportunity identified"""
    if not analysis.get('lead_intelligence', {}).get('is_lead'):
        return None

    lead_data = analysis['lead_intelligence']

    lead_record = {
        "lead_id": f"LEAD-{session_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "session_id": session_id,
        "identified_at": timestamp,
        "lead_type": lead_data.get('lead_type'),
        "lead_score": lead_data.get('lead_score', 0),
        "opportunity_value_estimate": lead_data.get('opportunity_value', 0),
        "customer_indicators": lead_data.get('business_signals', []),
        "products_interested": analysis.get('product_mentions', []),
        "business_signals": lead_data.get('business_signals', []),
        "conversation_summary": analysis.get('summary', ''),
        "key_insights": lead_data.get('reasoning', ''),
        "recommended_action": analysis.get('recommended_action'),
        "priority": "high" if lead_data.get('lead_score', 0) > 70 else "medium" if lead_data.get('lead_score', 0) > 40 else "low",
        "status": "new"
    }

    try:
        client = bigquery.Client(project=PROJECT_ID)
        table_ref = f"{PROJECT_ID}.{DATASET_ID}.leads"
        errors = client.insert_rows_json(table_ref, [lead_record])

        if not errors:
            print(f"✓ Created lead record: {lead_record['lead_id']}")
        else:
            print(f"Lead insert errors: {errors}")

    except Exception as e:
        print(f"Lead creation error: {e}")

    return lead_record

def process_transcript(event, context):
    """
    Cloud Function triggered by transcript creation in Cloud Storage
    Processes conversation and generates analytics
    """
    try:
        bucket_name = event['bucket']
        file_name = event['name']

        # Only process transcript JSON files
        if not file_name.startswith('transcripts/') or not file_name.endswith('.json'):
            print(f"Skipping non-transcript file: {file_name}")
            return

        print(f"Processing transcript: gs://{bucket_name}/{file_name}")

        # Load transcript
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(file_name)
        transcript_data = json.loads(blob.download_as_string())

        session_id = transcript_data.get('sessionId')
        transcript = transcript_data.get('transcript', '')
        timestamp = transcript_data.get('transcribedAt', datetime.utcnow().isoformat())

        if not transcript:
            print(f"No transcript found in {file_name}")
            return

        print(f"Analyzing conversation {session_id}")

        # Calculate basic metrics
        metrics = calculate_conversation_metrics(transcript)

        # AI-powered analysis
        ai_analysis = analyze_conversation_with_ai(transcript, session_id)

        # Build BigQuery record
        analytics_record = {
            # Identity
            "session_id": session_id,
            "timestamp": timestamp,

            # Metadata
            "channel": "chat",  # Can be enhanced to detect voice/chat
            "duration_seconds": metrics['duration_seconds'],
            "turn_count": metrics['turn_count'],

            # Sentiment
            "sentiment_score": ai_analysis['sentiment']['score'],
            "sentiment_label": ai_analysis['sentiment']['label'],
            "sentiment_magnitude": ai_analysis['sentiment']['magnitude'],

            # Topics
            "topics": ai_analysis['topics'],
            "primary_topic": ai_analysis['primary_topic'],
            "issue_category": ai_analysis['issue_category'],

            # Entities
            "entities": ai_analysis['entities'],
            "product_mentions": ai_analysis['product_mentions'],
            "appliance_types": ai_analysis['appliance_types'],

            # Intent and Resolution
            "intent": ai_analysis['intent'],
            "resolution_status": ai_analysis['resolution_status'],
            "customer_satisfaction": ai_analysis['customer_satisfaction'],

            # Lead Intelligence
            "lead_score": ai_analysis['lead_intelligence']['lead_score'],
            "business_opportunity": ai_analysis['lead_intelligence']['lead_type'],
            "opportunity_value_estimate": ai_analysis['lead_intelligence']['opportunity_value'],

            # Agent Performance
            "agent_id": None,  # Can be extracted if available
            "first_response_time_seconds": None,
            "knowledge_gaps": ai_analysis['knowledge_gaps'],

            # Content
            "transcript_summary": ai_analysis['summary'],
            "full_transcript": transcript,
            "key_phrases": ai_analysis['key_phrases'],

            # Technical
            "processed_at": datetime.utcnow().isoformat(),
            "ai_model_version": "gemini-1.5-flash"
        }

        # Insert into BigQuery
        success = insert_to_bigquery(analytics_record)

        if success:
            # Create lead record if applicable
            if ai_analysis['lead_intelligence']['is_lead']:
                create_lead_record(session_id, timestamp, ai_analysis, ai_analysis)

            print(f"✓ COMPLETE: Analytics processed for {session_id}")
            return {"status": "success", "session_id": session_id}
        else:
            print(f"✗ FAILED: Could not insert analytics for {session_id}")
            return {"status": "failed", "session_id": session_id}

    except Exception as e:
        print(f"Error processing transcript: {str(e)}")
        import traceback
        traceback.print_exc()
        raise e

# For local testing
if __name__ == "__main__":
    # Test with a sample
    test_event = {
        'bucket': 'service-ticket',
        'name': 'transcripts/test-session.json'
    }
    process_transcript(test_event, None)

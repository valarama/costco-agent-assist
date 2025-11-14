import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

export const dynamic = 'force-dynamic';

const bigquery = new BigQuery({
  projectId: 'arcane-rigging-473104-k3'
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || 'today'; // today, week, month

    // Build time filter
    let timeFilter = '';
    switch (timeRange) {
      case 'today':
        timeFilter = 'DATE(timestamp) = CURRENT_DATE()';
        break;
      case 'week':
        timeFilter = 'timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)';
        break;
      case 'month':
        timeFilter = 'timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)';
        break;
      default:
        timeFilter = 'DATE(timestamp) = CURRENT_DATE()';
    }

    // Query for dashboard metrics
    const query = `
      WITH metrics AS (
        SELECT
          COUNT(*) as total_conversations,
          AVG(sentiment_score) as avg_sentiment,
          AVG(duration_seconds) as avg_duration,
          COUNTIF(sentiment_label = 'positive') as positive_count,
          COUNTIF(sentiment_label = 'neutral') as neutral_count,
          COUNTIF(sentiment_label = 'negative') as negative_count,
          COUNTIF(resolution_status = 'resolved') as resolved_count,
          COUNTIF(resolution_status = 'unresolved') as unresolved_count,
          COUNTIF(customer_satisfaction = 'satisfied') as satisfied_count,
          COUNTIF(customer_satisfaction = 'dissatisfied') as dissatisfied_count,
          COUNTIF(business_opportunity IS NOT NULL) as total_leads,
          AVG(lead_score) as avg_lead_score,
          SUM(opportunity_value_estimate) as total_opportunity_value
        FROM \`costco_analytics.conversations_analytics\`
        WHERE ${timeFilter}
      ),
      hourly_volume AS (
        SELECT
          EXTRACT(HOUR FROM timestamp) as hour,
          COUNT(*) as count
        FROM \`costco_analytics.conversations_analytics\`
        WHERE ${timeFilter}
        GROUP BY hour
        ORDER BY hour
      ),
      top_topics AS (
        SELECT
          topic,
          COUNT(*) as count
        FROM \`costco_analytics.conversations_analytics\`,
        UNNEST(topics) as topic
        WHERE ${timeFilter}
        GROUP BY topic
        ORDER BY count DESC
        LIMIT 10
      ),
      top_products AS (
        SELECT
          product,
          COUNT(*) as count
        FROM \`costco_analytics.conversations_analytics\`,
        UNNEST(product_mentions) as product
        WHERE ${timeFilter}
        GROUP BY product
        ORDER BY count DESC
        LIMIT 10
      ),
      issue_distribution AS (
        SELECT
          issue_category,
          COUNT(*) as count,
          AVG(sentiment_score) as avg_sentiment
        FROM \`costco_analytics.conversations_analytics\`
        WHERE ${timeFilter}
        GROUP BY issue_category
        ORDER BY count DESC
      )
      SELECT
        (SELECT AS STRUCT * FROM metrics) as metrics,
        ARRAY(SELECT AS STRUCT * FROM hourly_volume) as hourly_volume,
        ARRAY(SELECT AS STRUCT * FROM top_topics) as top_topics,
        ARRAY(SELECT AS STRUCT * FROM top_products) as top_products,
        ARRAY(SELECT AS STRUCT * FROM issue_distribution) as issue_distribution
    `;

    const [job] = await bigquery.createQueryJob({
      query: query,
      location: 'US',
    });

    const [rows] = await job.getQueryResults();

    if (rows.length === 0) {
      return NextResponse.json({
        metrics: {
          total_conversations: 0,
          avg_sentiment: 0,
          positive_count: 0,
          neutral_count: 0,
          negative_count: 0,
          resolved_count: 0,
          unresolved_count: 0,
          satisfied_count: 0,
          dissatisfied_count: 0,
          total_leads: 0,
          avg_lead_score: 0,
          total_opportunity_value: 0
        },
        hourly_volume: [],
        top_topics: [],
        top_products: [],
        issue_distribution: [],
        timeRange
      });
    }

    const data = rows[0];

    // Calculate derived metrics
    const totalConv = data.metrics.total_conversations || 0;
    const resolutionRate = totalConv > 0
      ? ((data.metrics.resolved_count || 0) / totalConv * 100).toFixed(1)
      : 0;
    const satisfactionRate = totalConv > 0
      ? ((data.metrics.satisfied_count || 0) / totalConv * 100).toFixed(1)
      : 0;

    return NextResponse.json({
      metrics: {
        ...data.metrics,
        resolution_rate: parseFloat(resolutionRate),
        satisfaction_rate: parseFloat(satisfactionRate),
        avg_duration_minutes: data.metrics.avg_duration
          ? Math.round(data.metrics.avg_duration / 60)
          : 0
      },
      hourly_volume: data.hourly_volume || [],
      top_topics: data.top_topics || [],
      top_products: data.top_products || [],
      issue_distribution: data.issue_distribution || [],
      timeRange,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json({
      error: error.message,
      metrics: null
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

export const dynamic = 'force-dynamic';

const bigquery = new BigQuery({
  projectId: 'arcane-rigging-473104-k3'
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily'; // daily, weekly, monthly
    const days = parseInt(searchParams.get('days') || '30');

    // Build time grouping
    let timeGroup, timeFormat;
    switch (period) {
      case 'hourly':
        timeGroup = 'TIMESTAMP_TRUNC(timestamp, HOUR)';
        timeFormat = 'YYYY-MM-DD HH24:00';
        break;
      case 'daily':
        timeGroup = 'DATE(timestamp)';
        timeFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        timeGroup = 'DATE_TRUNC(DATE(timestamp), WEEK)';
        timeFormat = 'YYYY-MM-DD';
        break;
      case 'monthly':
        timeGroup = 'DATE_TRUNC(DATE(timestamp), MONTH)';
        timeFormat = 'YYYY-MM';
        break;
      default:
        timeGroup = 'DATE(timestamp)';
        timeFormat = 'YYYY-MM-DD';
    }

    // Query for trends over time
    const query = `
      WITH time_series AS (
        SELECT
          ${timeGroup} as time_period,
          COUNT(*) as conversation_count,
          AVG(sentiment_score) as avg_sentiment,
          AVG(duration_seconds) as avg_duration,
          COUNTIF(sentiment_label = 'positive') as positive_count,
          COUNTIF(sentiment_label = 'negative') as negative_count,
          COUNTIF(resolution_status = 'resolved') as resolved_count,
          COUNTIF(customer_satisfaction = 'satisfied') as satisfied_count,
          COUNTIF(business_opportunity IS NOT NULL) as leads_count,
          AVG(lead_score) as avg_lead_score,
          SUM(opportunity_value_estimate) as opportunity_value
        FROM \`costco_analytics.conversations_analytics\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
        GROUP BY time_period
        ORDER BY time_period ASC
      ),
      sentiment_trends AS (
        SELECT
          ${timeGroup} as time_period,
          sentiment_label,
          COUNT(*) as count
        FROM \`costco_analytics.conversations_analytics\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
        GROUP BY time_period, sentiment_label
        ORDER BY time_period ASC
      ),
      topic_trends AS (
        SELECT
          ${timeGroup} as time_period,
          primary_topic,
          COUNT(*) as count
        FROM \`costco_analytics.conversations_analytics\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
          AND primary_topic IS NOT NULL
        GROUP BY time_period, primary_topic
      ),
      channel_distribution AS (
        SELECT
          ${timeGroup} as time_period,
          channel,
          COUNT(*) as count
        FROM \`costco_analytics.conversations_analytics\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
        GROUP BY time_period, channel
        ORDER BY time_period ASC
      )
      SELECT
        (SELECT ARRAY_AGG(STRUCT(
          CAST(time_period AS STRING) as period,
          conversation_count,
          avg_sentiment,
          avg_duration,
          positive_count,
          negative_count,
          resolved_count,
          satisfied_count,
          leads_count,
          avg_lead_score,
          opportunity_value,
          SAFE_DIVIDE(resolved_count, conversation_count) * 100 as resolution_rate,
          SAFE_DIVIDE(satisfied_count, conversation_count) * 100 as satisfaction_rate
        )) FROM time_series) as time_series,
        (SELECT ARRAY_AGG(STRUCT(
          CAST(time_period AS STRING) as period,
          sentiment_label,
          count
        )) FROM sentiment_trends) as sentiment_trends,
        (SELECT ARRAY_AGG(STRUCT(
          CAST(time_period AS STRING) as period,
          primary_topic,
          count
        )) FROM topic_trends) as topic_trends,
        (SELECT ARRAY_AGG(STRUCT(
          CAST(time_period AS STRING) as period,
          channel,
          count
        )) FROM channel_distribution) as channel_distribution
    `;

    const [job] = await bigquery.createQueryJob({
      query: query,
      location: 'US',
    });

    const [rows] = await job.getQueryResults();

    if (rows.length === 0) {
      return NextResponse.json({
        time_series: [],
        sentiment_trends: [],
        topic_trends: [],
        channel_distribution: [],
        period,
        days
      });
    }

    const data = rows[0];

    // Calculate week-over-week or day-over-day changes
    const timeSeries = data.time_series || [];
    let changeMetrics = {};

    if (timeSeries.length >= 2) {
      const latest = timeSeries[timeSeries.length - 1];
      const previous = timeSeries[timeSeries.length - 2];

      changeMetrics = {
        conversation_change: latest.conversation_count - previous.conversation_count,
        sentiment_change: (latest.avg_sentiment - previous.avg_sentiment).toFixed(3),
        resolution_change: (latest.resolution_rate - previous.resolution_rate).toFixed(1),
        leads_change: latest.leads_count - previous.leads_count
      };
    }

    return NextResponse.json({
      time_series: timeSeries,
      sentiment_trends: data.sentiment_trends || [],
      topic_trends: data.topic_trends || [],
      channel_distribution: data.channel_distribution || [],
      change_metrics: changeMetrics,
      period,
      days,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Trends analytics error:', error);
    return NextResponse.json({
      error: error.message,
      time_series: []
    }, { status: 500 });
  }
}

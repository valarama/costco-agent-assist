import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

export const dynamic = 'force-dynamic';

const bigquery = new BigQuery({
  projectId: 'arcane-rigging-473104-k3'
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'new'; // new, contacted, qualified, all
    const leadType = searchParams.get('type') || 'all'; // business_center, premium_product, bulk_purchase, all
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build filters
    let filters = ['l.identified_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)'];

    if (status !== 'all') {
      filters.push(`l.status = '${status}'`);
    }

    if (leadType !== 'all') {
      filters.push(`l.lead_type = '${leadType}'`);
    }

    const whereClause = filters.join(' AND ');

    // Query for leads with conversation context
    const query = `
      SELECT
        l.lead_id,
        l.session_id,
        l.identified_at,
        l.lead_type,
        l.lead_score,
        l.opportunity_value_estimate,
        l.products_interested,
        l.business_signals,
        l.conversation_summary,
        l.key_insights,
        l.recommended_action,
        l.priority,
        l.status,
        l.contacted_at,
        l.converted_at,
        l.conversion_value,
        c.sentiment_label,
        c.sentiment_score,
        c.channel,
        c.timestamp as conversation_timestamp
      FROM \`costco_analytics.leads\` l
      LEFT JOIN \`costco_analytics.conversations_analytics\` c
        ON l.session_id = c.session_id
      WHERE ${whereClause}
      ORDER BY l.lead_score DESC, l.identified_at DESC
      LIMIT ${limit}
    `;

    const [job] = await bigquery.createQueryJob({
      query: query,
      location: 'US',
    });

    const [rows] = await job.getQueryResults();

    // Get summary stats
    const statsQuery = `
      SELECT
        COUNT(*) as total_leads,
        COUNTIF(status = 'new') as new_leads,
        COUNTIF(status = 'contacted') as contacted_leads,
        COUNTIF(status = 'qualified') as qualified_leads,
        COUNTIF(status = 'converted') as converted_leads,
        AVG(lead_score) as avg_lead_score,
        SUM(opportunity_value_estimate) as total_opportunity_value,
        SUM(conversion_value) as total_conversion_value,
        COUNTIF(lead_type = 'business_center') as business_center_count,
        COUNTIF(lead_type = 'premium_product') as premium_product_count,
        COUNTIF(lead_type = 'bulk_purchase') as bulk_purchase_count
      FROM \`costco_analytics.leads\`
      WHERE identified_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    `;

    const [statsJob] = await bigquery.createQueryJob({
      query: statsQuery,
      location: 'US',
    });

    const [statsRows] = await statsJob.getQueryResults();
    const stats = statsRows[0] || {};

    return NextResponse.json({
      leads: rows,
      stats: {
        total_leads: stats.total_leads || 0,
        new_leads: stats.new_leads || 0,
        contacted_leads: stats.contacted_leads || 0,
        qualified_leads: stats.qualified_leads || 0,
        converted_leads: stats.converted_leads || 0,
        avg_lead_score: stats.avg_lead_score ? parseFloat(stats.avg_lead_score.toFixed(1)) : 0,
        total_opportunity_value: stats.total_opportunity_value || 0,
        total_conversion_value: stats.total_conversion_value || 0,
        conversion_rate: stats.total_leads > 0
          ? ((stats.converted_leads / stats.total_leads) * 100).toFixed(1)
          : 0,
        business_center_count: stats.business_center_count || 0,
        premium_product_count: stats.premium_product_count || 0,
        bulk_purchase_count: stats.bulk_purchase_count || 0
      },
      filters: { status, leadType, limit },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Leads analytics error:', error);
    return NextResponse.json({
      error: error.message,
      leads: [],
      stats: null
    }, { status: 500 });
  }
}

// POST endpoint to update lead status
export async function POST(request) {
  try {
    const body = await request.json();
    const { lead_id, status, contacted_at, converted_at, conversion_value, assigned_to } = body;

    if (!lead_id || !status) {
      return NextResponse.json({
        error: 'lead_id and status are required'
      }, { status: 400 });
    }

    // Update lead in BigQuery
    let updates = [`status = '${status}'`];

    if (contacted_at) {
      updates.push(`contacted_at = TIMESTAMP('${contacted_at}')`);
    }

    if (converted_at) {
      updates.push(`converted_at = TIMESTAMP('${converted_at}')`);
    }

    if (conversion_value !== undefined) {
      updates.push(`conversion_value = ${conversion_value}`);
    }

    if (assigned_to) {
      updates.push(`assigned_to = '${assigned_to}'`);
    }

    const query = `
      UPDATE \`costco_analytics.leads\`
      SET ${updates.join(', ')}
      WHERE lead_id = '${lead_id}'
    `;

    const [job] = await bigquery.createQueryJob({
      query: query,
      location: 'US',
    });

    await job.getQueryResults();

    return NextResponse.json({
      success: true,
      lead_id,
      updated_fields: updates
    });

  } catch (error) {
    console.error('Lead update error:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}

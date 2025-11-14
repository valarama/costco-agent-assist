'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('today');
  const [dashboardData, setDashboardData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [leadsData, setLeadsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, trends, leads

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [timeRange, activeView]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      if (activeView === 'dashboard') {
        const res = await fetch(`/api/analytics/dashboard?range=${timeRange}`);
        const data = await res.json();
        setDashboardData(data);
      } else if (activeView === 'trends') {
        const days = timeRange === 'today' ? 7 : timeRange === 'week' ? 30 : 90;
        const res = await fetch(`/api/analytics/trends?period=daily&days=${days}`);
        const data = await res.json();
        setTrendsData(data);
      } else if (activeView === 'leads') {
        const res = await fetch('/api/analytics/leads?status=all&type=all&limit=50');
        const data = await res.json();
        setLeadsData(data);
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  const formatCurrency = (num) => {
    if (!num) return '$0';
    return `$${num.toLocaleString()}`;
  };

  const getSentimentColor = (score) => {
    if (score > 0.3) return '#10b981';
    if (score < -0.3) return '#ef4444';
    return '#f59e0b';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e27', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1a1f36', borderBottom: '1px solid #2a3547', padding: '20px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '600' }}>
              📊 Costco Analytics Dashboard
            </h1>
            <p style={{ color: '#9ca3af', margin: '4px 0 0 0', fontSize: '14px' }}>
              Post-Call Analytics & Business Intelligence
            </p>
          </div>
          <Link href="/" style={{ padding: '10px 20px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>
            ← Back to Agent Assist
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveView('dashboard')}
            style={{
              padding: '10px 20px',
              background: activeView === 'dashboard' ? '#3b82f6' : '#2a3547',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveView('trends')}
            style={{
              padding: '10px 20px',
              background: activeView === 'trends' ? '#3b82f6' : '#2a3547',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Trends
          </button>
          <button
            onClick={() => setActiveView('leads')}
            style={{
              padding: '10px 20px',
              background: activeView === 'leads' ? '#3b82f6' : '#2a3547',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Lead Intelligence
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['today', 'week', 'month'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '8px 16px',
                background: timeRange === range ? '#1e40af' : '#2a3547',
                border: timeRange === range ? '2px solid #3b82f6' : '1px solid #3a4557',
                borderRadius: '6px',
                color: 'white',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center', color: '#9ca3af', fontSize: '16px' }}>
          Loading analytics...
        </div>
      ) : activeView === 'dashboard' && dashboardData ? (
        <div style={{ padding: '32px' }}>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {/* Total Conversations */}
            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '24px', border: '1px solid #2a3547' }}>
              <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                TOTAL CONVERSATIONS
              </div>
              <div style={{ color: 'white', fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {formatNumber(dashboardData.metrics?.total_conversations)}
              </div>
              <div style={{ color: '#3b82f6', fontSize: '12px' }}>
                {timeRange === 'today' ? 'Today' : timeRange === 'week' ? 'Last 7 days' : 'Last 30 days'}
              </div>
            </div>

            {/* Avg Sentiment */}
            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '24px', border: '1px solid #2a3547' }}>
              <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                AVG SENTIMENT
              </div>
              <div style={{
                color: getSentimentColor(dashboardData.metrics?.avg_sentiment),
                fontSize: '32px',
                fontWeight: '700',
                marginBottom: '8px'
              }}>
                {dashboardData.metrics?.avg_sentiment ? dashboardData.metrics.avg_sentiment.toFixed(2) : '0.00'}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                {dashboardData.metrics?.positive_count || 0} positive, {dashboardData.metrics?.negative_count || 0} negative
              </div>
            </div>

            {/* Resolution Rate */}
            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '24px', border: '1px solid #2a3547' }}>
              <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                RESOLUTION RATE
              </div>
              <div style={{ color: '#10b981', fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {dashboardData.metrics?.resolution_rate || 0}%
              </div>
              <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                {formatNumber(dashboardData.metrics?.resolved_count)} resolved
              </div>
            </div>

            {/* Customer Satisfaction */}
            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '24px', border: '1px solid #2a3547' }}>
              <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                SATISFACTION RATE
              </div>
              <div style={{ color: '#10b981', fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {dashboardData.metrics?.satisfaction_rate || 0}%
              </div>
              <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                {formatNumber(dashboardData.metrics?.satisfied_count)} satisfied
              </div>
            </div>

            {/* Total Leads */}
            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '24px', border: '1px solid #2a3547' }}>
              <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                BUSINESS LEADS
              </div>
              <div style={{ color: '#f59e0b', fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {formatNumber(dashboardData.metrics?.total_leads)}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                Avg score: {dashboardData.metrics?.avg_lead_score ? dashboardData.metrics.avg_lead_score.toFixed(0) : 0}
              </div>
            </div>

            {/* Opportunity Value */}
            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '24px', border: '1px solid #2a3547' }}>
              <div style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                OPPORTUNITY VALUE
              </div>
              <div style={{ color: '#10b981', fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {formatCurrency(dashboardData.metrics?.total_opportunity_value)}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                Estimated pipeline
              </div>
            </div>
          </div>

          {/* Top Topics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '28px', border: '1px solid #2a3547' }}>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                🔥 Top Topics
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dashboardData.top_topics?.slice(0, 8).map((topic, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      background: '#3b82f6',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'white', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                        {topic.topic}
                      </div>
                      <div style={{
                        height: '6px',
                        background: '#2a3547',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${(topic.count / dashboardData.top_topics[0].count) * 100}%`,
                          background: 'linear-gradient(90deg, #3b82f6, #2563eb)'
                        }} />
                      </div>
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>
                      {topic.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Products */}
            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '28px', border: '1px solid #2a3547' }}>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                🛍️ Top Products
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dashboardData.top_products?.slice(0, 8).map((product, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      background: '#10b981',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'white', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                        {product.product}
                      </div>
                      <div style={{
                        height: '6px',
                        background: '#2a3547',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${(product.count / dashboardData.top_products[0].count) * 100}%`,
                          background: 'linear-gradient(90deg, #10b981, #059669)'
                        }} />
                      </div>
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>
                      {product.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Issue Distribution */}
          <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '28px', border: '1px solid #2a3547' }}>
            <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              📊 Issue Category Distribution
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {dashboardData.issue_distribution?.map((issue, idx) => (
                <div key={idx} style={{
                  background: '#2a3547',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #3a4557'
                }}>
                  <div style={{ color: 'white', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    {issue.issue_category.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div style={{ color: '#3b82f6', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                    {issue.count}
                  </div>
                  <div style={{
                    color: getSentimentColor(issue.avg_sentiment),
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    Sentiment: {issue.avg_sentiment ? issue.avg_sentiment.toFixed(2) : '0.00'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeView === 'leads' && leadsData ? (
        <div style={{ padding: '32px' }}>
          {/* Lead Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '20px', border: '1px solid #2a3547' }}>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>TOTAL LEADS</div>
              <div style={{ color: 'white', fontSize: '28px', fontWeight: '700' }}>
                {formatNumber(leadsData.stats?.total_leads)}
              </div>
            </div>
            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '20px', border: '1px solid #2a3547' }}>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>NEW LEADS</div>
              <div style={{ color: '#f59e0b', fontSize: '28px', fontWeight: '700' }}>
                {formatNumber(leadsData.stats?.new_leads)}
              </div>
            </div>
            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '20px', border: '1px solid #2a3547' }}>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>CONVERTED</div>
              <div style={{ color: '#10b981', fontSize: '28px', fontWeight: '700' }}>
                {formatNumber(leadsData.stats?.converted_leads)}
              </div>
            </div>
            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '20px', border: '1px solid #2a3547' }}>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>CONVERSION RATE</div>
              <div style={{ color: '#10b981', fontSize: '28px', fontWeight: '700' }}>
                {leadsData.stats?.conversion_rate}%
              </div>
            </div>
            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '20px', border: '1px solid #2a3547' }}>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>PIPELINE VALUE</div>
              <div style={{ color: '#3b82f6', fontSize: '28px', fontWeight: '700' }}>
                {formatCurrency(leadsData.stats?.total_opportunity_value)}
              </div>
            </div>
          </div>

          {/* Leads Table */}
          <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '28px', border: '1px solid #2a3547' }}>
            <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              💼 Recent Leads
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #2a3547' }}>
                    <th style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '600', padding: '12px', textAlign: 'left' }}>LEAD ID</th>
                    <th style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '600', padding: '12px', textAlign: 'left' }}>TYPE</th>
                    <th style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '600', padding: '12px', textAlign: 'left' }}>SCORE</th>
                    <th style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '600', padding: '12px', textAlign: 'left' }}>VALUE</th>
                    <th style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '600', padding: '12px', textAlign: 'left' }}>STATUS</th>
                    <th style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '600', padding: '12px', textAlign: 'left' }}>SUMMARY</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsData.leads?.slice(0, 20).map((lead, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #2a3547' }}>
                      <td style={{ color: 'white', fontSize: '13px', padding: '16px', fontFamily: 'monospace' }}>
                        {lead.lead_id?.substring(0, 20)}...
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          background: '#1e40af',
                          color: 'white',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {lead.lead_type?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ color: '#f59e0b', fontSize: '16px', fontWeight: '700', padding: '16px' }}>
                        {lead.lead_score}
                      </td>
                      <td style={{ color: '#10b981', fontSize: '14px', fontWeight: '600', padding: '16px' }}>
                        {formatCurrency(lead.opportunity_value_estimate)}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          background: lead.status === 'new' ? '#7f1d1d' : lead.status === 'converted' ? '#065f46' : '#374151',
                          color: 'white',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {lead.status}
                        </span>
                      </td>
                      <td style={{ color: '#d1d5db', fontSize: '13px', padding: '16px', maxWidth: '300px' }}>
                        {lead.conversation_summary?.substring(0, 100)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeView === 'trends' && trendsData ? (
        <div style={{ padding: '32px' }}>
          <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '28px', border: '1px solid #2a3547', marginBottom: '24px' }}>
            <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              📈 Conversation Volume Trend
            </h3>
            <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
              {trendsData.time_series?.map((point, idx) => {
                const maxCount = Math.max(...trendsData.time_series.map(p => p.conversation_count));
                const height = (point.conversation_count / maxCount) * 100;
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '600' }}>
                      {point.conversation_count}
                    </div>
                    <div style={{
                      width: '100%',
                      height: `${height}%`,
                      background: 'linear-gradient(180deg, #3b82f6, #1e40af)',
                      borderRadius: '4px 4px 0 0',
                      minHeight: '20px'
                    }} />
                    <div style={{ color: '#6b7280', fontSize: '10px', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                      {point.period.substring(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '28px', border: '1px solid #2a3547' }}>
            <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
              😊 Sentiment Trend
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trendsData.time_series?.map((point, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: '#9ca3af', fontSize: '12px', width: '80px' }}>
                    {point.period}
                  </div>
                  <div style={{ flex: 1, height: '8px', background: '#2a3547', borderRadius: '4px', position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: `${((point.avg_sentiment + 1) / 2) * 100}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '16px',
                      height: '16px',
                      background: getSentimentColor(point.avg_sentiment),
                      borderRadius: '50%',
                      border: '2px solid #1a1f36'
                    }} />
                  </div>
                  <div style={{
                    color: getSentimentColor(point.avg_sentiment),
                    fontSize: '14px',
                    fontWeight: '700',
                    width: '60px',
                    textAlign: 'right'
                  }}>
                    {point.avg_sentiment?.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '80px', textAlign: 'center', color: '#9ca3af', fontSize: '16px' }}>
          No data available for this view
        </div>
      )}
    </div>
  );
}

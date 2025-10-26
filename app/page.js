'use client';
import { useState, useEffect, useRef } from 'react';

const DEFAULT_CONVERSATION = [
  { role: 'agent', text: 'Hi there! Welcome to Costco Smart Home Support. I see you\'re setting up your new Samsung Smart Fridge. Can I help you connect it to Wi-Fi?', sentiment: 'Neutral', time: '8:15:23 AM' },
  { role: 'customer', text: 'Yes, please. It keeps saying "Wi-Fi not connected."', sentiment: 'Neutral', time: '8:15:35 AM' },
  { role: 'agent', text: 'No problem. Let\'s fix that together. First, on your fridge screen, go to Settings → Wi-Fi and select your home network. Do you see your Wi-Fi name there?', sentiment: 'Neutral', time: '8:15:48 AM' },
  { role: 'customer', text: 'Yes, I see "MyHome-5G." Should I pick that?', sentiment: 'Neutral', time: '8:16:05 AM' },
  { role: 'agent', text: 'Yes, that\'s perfect. Tap it, then enter your Wi-Fi password. (Just make sure it\'s the same password you use for your phone or laptop.)', sentiment: 'Neutral', time: '8:16:18 AM' },
  { role: 'customer', text: 'Okay... it says "Connected."', sentiment: 'Positive', time: '8:16:32 AM' },
  { role: 'agent', text: 'Great! Your fridge is now online. That means you can use the Samsung SmartThings app to control it remotely. Would you like to pair your fridge with Bluetooth next?', sentiment: 'Neutral', time: '8:16:45 AM' },
  { role: 'customer', text: 'Yes, please. I want to play music on it!', sentiment: 'Positive', time: '8:17:02 AM' },
  { role: 'agent', text: 'Awesome! On your fridge, go to Settings → Connections → Bluetooth. Now, turn on Bluetooth on your phone and look for "Samsung Smart Fridge." Do you see it?', sentiment: 'Neutral', time: '8:17:15 AM' },
  { role: 'customer', text: 'Yes, it just popped up. I\'ll tap "Pair."', sentiment: 'Positive', time: '8:17:28 AM' },
  { role: 'agent', text: 'Perfect. You\'re all set! Now your fridge can connect to your phone — you can stream music, check recipes, or share fridge alerts easily.', sentiment: 'Neutral', time: '8:17:42 AM' },
  { role: 'customer', text: 'That\'s great. Thanks for making it so easy!', sentiment: 'Positive', time: '8:17:55 AM' },
  { role: 'agent', text: 'Anytime! Enjoy your new smart fridge, and remember — if it ever disconnects, you can restart Wi-Fi or Bluetooth from the same settings menu.', sentiment: 'Neutral', time: '8:18:08 AM' }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('transcript');
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [transcript, setTranscript] = useState(DEFAULT_CONVERSATION);
  const [suggestions, setSuggestions] = useState({});
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('sessionId');
    
    if (urlSessionId) {
      setSelectedConv(urlSessionId);
    } else {
      fetchLatestSession();
    }
  }, []);

  const fetchLatestSession = async () => {
    try {
      const res = await fetch('/api/latest-session');
      const data = await res.json();
      if (data.sessionId) {
        setSelectedConv(data.sessionId);
      }
    } catch (error) {
      console.error('Error fetching latest session:', error);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConv) {
      fetchTranscript(selectedConv);
      const interval = setInterval(() => fetchTranscript(selectedConv), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
      setLoading(false);
    } catch (error) {
      console.error('Fetch conversations error:', error);
      setLoading(false);
    }
  };

  const fetchTranscript = async (sessionId) => {
    try {
      const res = await fetch(`/api/transcript?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setTranscript(data.messages);
        setSuggestions(data.suggestions || {});
      }
    } catch (error) {
      console.error('Fetch transcript error:', error);
    }
  };

  const sendChatMessage = async (question = null) => {
    const msg = question || chatInput;
    if (!msg.trim()) return;

    const userMsg = { role: 'user', text: msg };
    setChatMessages(prev => [...prev, userMsg]);
    if (!question) setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: msg })
      });
      const data = await res.json();
      
      const botMsg = { role: 'bot', text: data.answer };
      setChatMessages(prev => [...prev, botMsg]);
      setChatOpen(true);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif', background: '#0a0e27' }}>
      <div style={{ background: '#1a1f36', color: 'white', padding: '20px 24px', borderBottom: '1px solid #2a3547' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>COSTCO SMART APPLIANCE SUPPORT</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>Live Agent Assist - Real-Time AI Recommendations</p>
          </div>
          <button 
            onClick={fetchLatestSession}
            style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
          >
            🔄 Load Latest Session
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('transcript')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'transcript' ? '#3b82f6' : '#2a3547',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Live Transcript
          </button>
          <button
            onClick={() => setActiveTab('assist')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'assist' ? '#3b82f6' : '#2a3547',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Agent Assist
          </button>
        </div>

        <select 
          value={selectedConv || ''} 
          onChange={(e) => setSelectedConv(e.target.value)} 
          style={{ padding: '10px 14px', background: '#2a3547', border: '1px solid #3a4557', borderRadius: '6px', color: 'white', fontSize: '14px', width: '100%' }}
        >
          <option value="">Select Conversation (or showing default)</option>
          {conversations.map(conv => (
            <option key={conv.sessionId} value={conv.sessionId}>
              {conv.sessionId.substring(0, 50)}... - {conv.startTime}
            </option>
          ))}
        </select>
      </div>

      {activeTab === 'transcript' ? (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, background: '#0a0e27', padding: '32px', overflowY: 'auto' }}>
            {transcript.map((msg, idx) => (
              <div key={idx} style={{ 
                marginBottom: '24px',
                background: '#1a1f36',
                borderRadius: '8px',
                padding: '20px',
                borderLeft: `4px solid ${msg.role === 'agent' ? '#10b981' : '#3b82f6'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ 
                    padding: '6px 16px', 
                    background: msg.role === 'agent' ? '#065f46' : '#1e40af', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: 'white',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {msg.role === 'agent' ? 'Agent' : 'Customer'}
                  </div>
                  {msg.sentiment && (
                    <div style={{ 
                      padding: '4px 12px', 
                      background: msg.sentiment === 'Negative' ? '#7f1d1d' : msg.sentiment === 'Neutral' ? '#374151' : '#166534', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      color: 'white',
                      fontWeight: '500'
                    }}>
                      {msg.sentiment}
                    </div>
                  )}
                  <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                    {msg.time}
                  </div>
                </div>
                <div style={{ color: '#e5e7eb', fontSize: '15px', lineHeight: '1.7' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, background: '#0a0e27', padding: '32px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '28px', marginBottom: '24px', border: '1px solid #2a3547' }}>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '20px', borderBottom: '2px solid #3b82f6', paddingBottom: '12px' }}>
                🤖 AI Agent Recommendations
              </h3>
              <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                {suggestions.behavior && suggestions.behavior.length > 0 ? (
                  suggestions.behavior.map((sug, idx) => (
                    <li key={idx} style={{ 
                      color: '#d1d5db', 
                      fontSize: '14px', 
                      marginBottom: '16px', 
                      lineHeight: '1.6',
                      paddingLeft: '24px',
                      position: 'relative'
                    }}>
                      <span style={{ position: 'absolute', left: 0, color: '#3b82f6', fontWeight: 'bold' }}>•</span>
                      {sug}
                    </li>
                  ))
                ) : (
                  <>
                    <li style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6', paddingLeft: '24px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#3b82f6', fontWeight: 'bold' }}>•</span>
                      Acknowledge customer's smart appliance needs and provide warm greeting
                    </li>
                    <li style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6', paddingLeft: '24px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#3b82f6', fontWeight: 'bold' }}>•</span>
                      Ask for specific device model and connection type to provide accurate guidance
                    </li>
                    <li style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6', paddingLeft: '24px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#3b82f6', fontWeight: 'bold' }}>•</span>
                      Provide clear step-by-step WiFi or Bluetooth setup instructions
                    </li>
                    <li style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6', paddingLeft: '24px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#3b82f6', fontWeight: 'bold' }}>•</span>
                      Verify each step is completed before moving to the next instruction
                    </li>
                    <li style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6', paddingLeft: '24px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#3b82f6', fontWeight: 'bold' }}>•</span>
                      Confirm successful connection and offer additional feature assistance
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '28px', marginBottom: '24px', border: '1px solid #2a3547' }}>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                💼 Cross / Up Sell Opportunities
              </h3>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: suggestions.upsell?.possibility === 'Yes' ? '#10b981' : '#ef4444', marginBottom: '10px' }}>
                  Possibility: {suggestions.upsell?.possibility || 'Yes'}
                </div>
                <div style={{ fontSize: '14px', color: '#d1d5db', lineHeight: '1.7' }}>
                  <strong style={{ color: 'white' }}>Explanation:</strong> {suggestions.upsell?.explanation || 'Customer setting up smart fridge - great opportunity to offer extended warranty, water filter subscription, or SmartThings hub for additional smart home integration.'}
                </div>
              </div>
            </div>

            <div style={{ background: '#1a1f36', borderRadius: '12px', padding: '28px', border: '1px solid #2a3547' }}>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                💬 Recommended Questions for Knowledge Assist
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {suggestions.questions && suggestions.questions.length > 0 ? (
                  suggestions.questions.map((q, idx) => (
                    <button 
                      key={idx}
                      onClick={() => sendChatMessage(q)}
                      style={{ 
                        padding: '12px 20px', 
                        background: '#1e40af', 
                        border: '2px solid #3b82f6', 
                        borderRadius: '8px', 
                        color: 'white', 
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#2563eb'}
                      onMouseOut={(e) => e.target.style.background = '#1e40af'}
                    >
                      {q}
                    </button>
                  ))
                ) : (
                  <>
                    <button 
                      onClick={() => sendChatMessage('How do I set up WiFi on smart fridge?')}
                      style={{ padding: '12px 20px', background: '#1e40af', border: '2px solid #3b82f6', borderRadius: '8px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
                    >
                      How do I set up WiFi on smart fridge?
                    </button>
                    <button 
                      onClick={() => sendChatMessage('How do I connect via Bluetooth?')}
                      style={{ padding: '12px 20px', background: '#1e40af', border: '2px solid #3b82f6', borderRadius: '8px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
                    >
                      How do I connect via Bluetooth?
                    </button>
                    <button 
                      onClick={() => sendChatMessage('How to reset smart appliance?')}
                      style={{ padding: '12px 20px', background: '#1e40af', border: '2px solid #3b82f6', borderRadius: '8px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
                    >
                      How to reset smart appliance?
                    </button>
                    <button 
                      onClick={() => sendChatMessage('Troubleshooting connection issues?')}
                      style={{ padding: '12px 20px', background: '#1e40af', border: '2px solid #3b82f6', borderRadius: '8px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
                    >
                      Troubleshooting connection issues?
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {chatOpen && (
        <div style={{ position: 'fixed', bottom: '90px', right: '24px', width: '380px', height: '520px', background: '#1a1f36', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', border: '1px solid #3b82f6' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', padding: '20px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: '600', fontSize: '15px' }}>🤖 AI Knowledge Assistant</div>
            <button onClick={() => setChatOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {chatMessages.length === 0 && (
              <div style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', marginTop: '40px', lineHeight: '1.6' }}>
                Ask me anything about Costco smart appliances!<br/>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>WiFi setup, Bluetooth, troubleshooting, features...</span>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#2a3547',
                color: 'white',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                maxWidth: '80%',
                fontSize: '14px',
                lineHeight: '1.6',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                {msg.text}
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf: 'flex-start', color: '#9ca3af', fontSize: '13px', fontStyle: 'italic' }}>Thinking...</div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: '20px', borderTop: '1px solid #2a3547', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              placeholder="Type your question..."
              style={{ flex: 1, padding: '12px', background: '#2a3547', border: '1px solid #3a4557', borderRadius: '10px', color: 'white', fontSize: '14px' }}
            />
            <button 
              onClick={() => sendChatMessage()}
              disabled={chatLoading || !chatInput.trim()}
              style={{ 
                padding: '12px 20px', 
                background: chatLoading || !chatInput.trim() ? '#374151' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                border: 'none', 
                borderRadius: '10px', 
                color: 'white', 
                fontSize: '14px', 
                cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer', 
                fontWeight: '600' 
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setChatOpen(!chatOpen)}
        style={{ 
          position: 'fixed', 
          bottom: '24px', 
          right: '24px', 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
          border: 'none', 
          color: 'white', 
          fontSize: '28px', 
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(59, 130, 246, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s'
        }}
        onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      >
        {chatOpen ? '×' : '💬'}
      </button>
    </div>
  );
}

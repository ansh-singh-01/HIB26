import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Send,
  PhoneCall,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  Building2,
  Trash2,
  Wifi,
  WifiOff,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import {
  syncOfflineKnowledgePack,
  matchOfflineSymptoms,
  saveLocalChatMessage,
  getLocalChatHistory
} from '../services/offlineTriage';

export const ClinicalAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const sessionId = 'clinical-session-user';

  // Listen for real online/offline browser events and sync knowledge pack
  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial background sync of SQLite knowledge pack
    syncOfflineKnowledgePack();

    // Load existing history
    const cachedHistory = getLocalChatHistory(sessionId);
    if (cachedHistory && cachedHistory.length > 0) {
      setMessages(cachedHistory);
    } else {
      // Set initial greeting
      const initialGreeting = {
        role: 'assistant',
        content: `Hello! I am your **MediConnect Offline-Resilient Clinical Assistant**.\n\nDescribe your symptoms, disease, or medical concern in plain words (e.g., *"crushing chest pain"*, *"high fever with joint pain"*, *"severe headache and nausea"*, or *"difficulty breathing"*).\n\nI will instantly evaluate your case, calculate triage urgency, provide **immediate what-to-do steps**, and recommend **clinical diagnostics and specialist care**.`,
        structured: {
          condition_name: 'Smart Clinical Triage Grid',
          severity_level: 'MILD',
          triage_summary: 'Ready for real-time symptom triage. Powered by embedded SQLite clinical decision protocols with 100% offline capability.',
          immediate_actions: [
            'Type any disease name, symptom, or situation below.',
            'Review immediate home-care or emergency steps in real time.',
            'Works seamlessly with low or zero internet connectivity.'
          ],
          recommended_steps: [
            'Input chief complaint or select a quick starter below.',
            'Follow recommended clinical diagnostics and specialist referral pathways.'
          ],
          recommended_specialist: 'General Triage & Emergency Grid',
          red_flags: []
        }
      };
      setMessages([initialGreeting]);
      saveLocalChatMessage(sessionId, initialGreeting);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (queryText) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || loading) return;

    const userMessage = { role: 'user', content: textToSend };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveLocalChatMessage(sessionId, userMessage);
    setInputQuery('');
    setLoading(true);

    let triageResult = null;
    let replyText = '';

    // If online and not forced offline, try FastAPI SQLite backend
    if (!isOfflineMode && navigator.onLine) {
      try {
        const response = await fetch('/api/v1/chatbot/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: textToSend,
            session_id: sessionId
          })
        });

        if (response.ok) {
          const data = await response.json();
          triageResult = data;
          replyText = data.reply;
        } else {
          throw new Error('API server returned error status');
        }
      } catch (err) {
        console.warn('Backend query failed, falling back seamlessly to client-side offline SQLite matcher:', err);
        triageResult = matchOfflineSymptoms(textToSend);
      }
    } else {
      // Offline mode execution
      triageResult = matchOfflineSymptoms(textToSend);
    }

    // Fallback if replyText not set
    if (!replyText && triageResult) {
      replyText = triageResult.triage_summary || 'Clinical assessment completed.';
    }

    const botMessage = {
      role: 'assistant',
      content: replyText,
      structured: triageResult,
      isOffline: isOfflineMode || !navigator.onLine
    };

    setMessages([...updatedMessages, botMessage]);
    saveLocalChatMessage(sessionId, botMessage);
    setLoading(false);
  };

  const handleClearChat = async () => {
    if (window.confirm('Clear your conversation history?')) {
      localStorage.removeItem('mediconnect_chat_history_' + sessionId);
      try {
        await fetch('/api/v1/chatbot/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId })
        });
      } catch {
        // offline ignore
      }
      setMessages([]);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const quickStarters = [
    { label: 'Chest Pressure & Sweating', query: 'I have severe chest pressure radiating to my left arm with cold sweat' },
    { label: 'High Fever & Joint Pain', query: 'Sudden high fever with intense headache, pain behind eyes and joint ache' },
    { label: 'Asthma Wheezing', query: 'Struggling to breathe with wheezing and tight chest' },
    { label: 'Lower Right Abdominal Pain', query: 'Sharp severe pain in lower right side of stomach with vomiting' },
    { label: 'Severe One-Sided Migraine', query: 'Pulsing throbbing headache on left side with light sensitivity and nausea' },
    { label: 'Food Poisoning / Vomiting', query: 'Watery diarrhea, frequent vomiting, stomach cramps after eating out' }
  ];

  const getSeverityPill = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'EMERGENCY':
        return (
          <span style={{
            background: '#FEE2E2',
            color: '#B91C1C',
            border: '1px solid #F87171',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#DC2626', animation: 'pulse 1.5s infinite' }}></span>
            CRITICAL EMERGENCY (Call 108)
          </span>
        );
      case 'HIGH':
        return (
          <span style={{
            background: '#FFEDD5',
            color: '#C2410C',
            border: '1px solid #FDBA74',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            ⚠️ HIGH URGENCY — Prompt Care
          </span>
        );
      case 'MODERATE':
        return (
          <span style={{
            background: '#FEF9C3',
            color: '#854D0E',
            border: '1px solid #FDE047',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            🟡 DOCTOR CONSULTATION ADVISED
          </span>
        );
      default:
        return (
          <span style={{
            background: '#DCFCE7',
            color: '#15803D',
            border: '1px solid #86EFAC',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            🟢 MILD — Home Monitoring
          </span>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-creamy-paper, #FAF5F1)', padding: '24px 16px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Top Header Card */}
        <div style={{
          background: 'var(--color-olive-grove, #24291F)',
          color: '#FAF5F1',
          borderRadius: '16px',
          padding: '24px 28px',
          marginBottom: '20px',
          boxShadow: '0 8px 24px rgba(36, 41, 31, 0.12)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <Bot size={26} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700', color: '#FAF5F1' }}>
                  MediConnect Clinical AI Chatbot
                </h2>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#A7F3D0',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: '600'
                }}>
                  SQLite Offline Grid
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#D1D5DB' }}>
                Instant disease & symptom triage • What to do next • Recommended clinical diagnostics
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Online / Offline status badge and toggle */}
            <button
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              style={{
                background: isOfflineMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: isOfflineMode ? '#FCA5A5' : '#6EE7B7',
                border: isOfflineMode ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              title="Click to toggle between Online API and Local SQLite Offline Engine simulation"
            >
              {isOfflineMode ? <WifiOff size={15} /> : <Wifi size={15} />}
              <span>{isOfflineMode ? 'Mode: Offline SQLite' : 'Mode: Online Grid'}</span>
            </button>

            {/* Clear history */}
            <button
              onClick={handleClearChat}
              style={{
                background: 'transparent',
                color: '#9CA3AF',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '7px 12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.8rem'
              }}
              title="Clear chat history"
            >
              <Trash2 size={14} /> Clear
            </button>
          </div>
        </div>

        {/* Chat Thread Container */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '680px'
        }}>
          
          {/* Messages Scroll Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const struct = msg.structured;

              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '100%'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    maxWidth: isUser ? '80%' : '95%',
                    flexDirection: isUser ? 'row-reverse' : 'row'
                  }}>
                    {/* Avatar Icon */}
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: isUser ? '#4B5563' : '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#FFFFFF'
                    }}>
                      {isUser ? <Activity size={18} /> : <Bot size={18} />}
                    </div>

                    {/* Message Bubble */}
                    <div style={{
                      background: isUser ? 'var(--color-terracotta-cta, #C25E3E)' : '#F9FAFB',
                      color: isUser ? '#FFFFFF' : '#1F2937',
                      padding: '16px 20px',
                      borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      border: isUser ? 'none' : '1px solid #E5E7EB',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                      width: '100%'
                    }}>
                      
                      {isUser ? (
                        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>
                          {msg.content}
                        </p>
                      ) : (
                        <div>
                          {/* Bot Message Header */}
                          {struct && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '8px',
                              marginBottom: '12px',
                              paddingBottom: '10px',
                              borderBottom: '1px solid #E5E7EB'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Stethoscope size={18} color="#059669" />
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#111827' }}>
                                  {struct.condition_name}
                                </h3>
                              </div>
                              {getSeverityPill(struct.severity_level)}
                            </div>
                          )}

                          {/* Triage Summary */}
                          <div style={{ fontSize: '0.92rem', lineHeight: '1.6', color: '#374151', marginBottom: '14px' }}>
                            {struct?.triage_summary || msg.content}
                          </div>

                          {/* Structured Clinical Sections */}
                          {struct && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              
                              {/* Immediate Actions (What to do right now) */}
                              {struct.immediate_actions && struct.immediate_actions.length > 0 && (
                                <div style={{
                                  background: struct.severity_level === 'EMERGENCY' ? '#FEF2F2' : '#EFF6FF',
                                  borderLeft: struct.severity_level === 'EMERGENCY' ? '4px solid #EF4444' : '4px solid #3B82F6',
                                  padding: '12px 16px',
                                  borderRadius: '0 8px 8px 0'
                                }}>
                                  <h4 style={{
                                    margin: '0 0 8px',
                                    fontSize: '0.88rem',
                                    fontWeight: '700',
                                    color: struct.severity_level === 'EMERGENCY' ? '#991B1B' : '#1E40AF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}>
                                    <Sparkles size={16} /> ⚡ Immediate Actions (What To Do Right Now):
                                  </h4>
                                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.88rem', color: '#1F2937', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {struct.immediate_actions.map((act, i) => (
                                      <li key={i} style={{ lineHeight: '1.45' }}>{act}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Recommended Next Steps & Diagnostics */}
                              {struct.recommended_steps && struct.recommended_steps.length > 0 && (
                                <div style={{
                                  background: '#F8FAFC',
                                  border: '1px solid #E2E8F0',
                                  padding: '12px 16px',
                                  borderRadius: '8px'
                                }}>
                                  <h4 style={{
                                    margin: '0 0 8px',
                                    fontSize: '0.88rem',
                                    fontWeight: '700',
                                    color: '#0F172A',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}>
                                    <CheckCircle2 size={16} color="#10B981" /> 🩺 Recommended Next Clinical Steps & Tests:
                                  </h4>
                                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.88rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {struct.recommended_steps.map((step, i) => (
                                      <li key={i} style={{ lineHeight: '1.45' }}>{step}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Specialist and Diagnostics Badges */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                {struct.recommended_specialist && (
                                  <span style={{
                                    background: '#F3F4F6',
                                    color: '#1F2937',
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: '600'
                                  }}>
                                    👨‍⚕️ Specialist: <strong>{struct.recommended_specialist}</strong>
                                  </span>
                                )}
                                {struct.diagnostic_tests && struct.diagnostic_tests.map((test, i) => (
                                  <span key={i} style={{
                                    background: '#EEF2FF',
                                    color: '#4F46E5',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: '500'
                                  }}>
                                    🧪 {test}
                                  </span>
                                ))}
                              </div>

                              {/* Red Flags Warning Box */}
                              {struct.red_flags && struct.red_flags.length > 0 && (
                                <div style={{
                                  background: '#FFFBEB',
                                  border: '1px solid #FDE68A',
                                  padding: '10px 14px',
                                  borderRadius: '6px',
                                  fontSize: '0.82rem',
                                  color: '#92400E'
                                }}>
                                  <strong>⚠️ Red Flag Warning Signs:</strong> Rush to Emergency if experiencing:{' '}
                                  {struct.red_flags.join(', ')}.
                                </div>
                              )}

                              {/* Quick Action Footer in Card */}
                              <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: '10px',
                                marginTop: '6px',
                                paddingTop: '10px',
                                borderTop: '1px solid #E5E7EB'
                              }}>
                                {struct.severity_level === 'EMERGENCY' && (
                                  <a
                                    href="tel:108"
                                    className="btn btn-danger"
                                    style={{
                                      padding: '7px 16px',
                                      fontSize: '0.82rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      textDecoration: 'none',
                                      fontWeight: '700'
                                    }}
                                  >
                                    <PhoneCall size={15} /> Dial Emergency 108
                                  </a>
                                )}

                                <Link
                                  to="/facilities"
                                  style={{
                                    background: '#F3F4F6',
                                    color: '#1F2937',
                                    padding: '7px 14px',
                                    borderRadius: '6px',
                                    fontSize: '0.82rem',
                                    fontWeight: '600',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <Building2 size={15} /> Find Nearest Hospital
                                </Link>

                                <button
                                  onClick={() => copyToClipboard(
                                    `Condition: ${struct.condition_name}\nUrgency: ${struct.severity_level}\nImmediate Actions:\n${struct.immediate_actions?.join('\n')}\nRecommended Steps:\n${struct.recommended_steps?.join('\n')}`,
                                    index
                                  )}
                                  style={{
                                    background: 'transparent',
                                    border: '1px solid #D1D5DB',
                                    color: '#4B5563',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontSize: '0.78rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                  }}
                                >
                                  {copiedIndex === index ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                                  {copiedIndex === index ? 'Copied' : 'Copy Advice'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Offline indicator on message */}
                          {msg.isOffline && (
                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '6px' }}>
                              ⚡ Generated via Local SQLite Decision Engine (Zero Data Needed)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}>
                  <Bot size={18} />
                </div>
                <div style={{
                  background: '#F9FAFB',
                  padding: '12px 18px',
                  borderRadius: '16px',
                  border: '1px solid #E5E7EB',
                  fontSize: '0.88rem',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Activity size={16} className="animate-spin" /> Evaluating clinical triage protocols in SQLite...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starters Carousel */}
          <div style={{
            background: '#F9FAFB',
            padding: '10px 16px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <HelpCircle size={14} /> Quick Triage:
            </span>
            {quickStarters.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.query)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  color: '#374151',
                  borderRadius: '16px',
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#059669';
                  e.currentTarget.style.color = '#059669';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.color = '#374151';
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Input Box Area */}
          <div style={{
            padding: '14px 20px',
            background: '#FFFFFF',
            borderTop: '1px solid #E5E7EB'
          }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Describe your disease or symptoms (e.g. 'fever with chills', 'crushing chest pain', 'asthma attack')..."
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: '24px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.92rem',
                  outline: 'none',
                  background: '#F9FAFB'
                }}
                onFocus={(e) => e.target.style.borderColor = '#059669'}
                onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
              />

              <button
                type="submit"
                disabled={!inputQuery.trim() || loading}
                style={{
                  background: 'var(--color-terracotta-cta, #C25E3E)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '24px',
                  padding: '12px 22px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: inputQuery.trim() && !loading ? 'pointer' : 'not-allowed',
                  opacity: inputQuery.trim() && !loading ? 1 : 0.6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(194, 94, 62, 0.3)'
                }}
              >
                <span>Ask</span>
                <Send size={15} />
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.74rem', color: '#9CA3AF' }}>
              <span>🚨 For life-threatening emergencies, dial <strong>108 / 112</strong> immediately.</span>
              <span>🔒 100% Private • Local SQLite Storage</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, X, Maximize2 } from 'lucide-react';
import {
  matchOfflineSymptoms,
  saveLocalChatMessage,
} from '../services/offlineTriage';
import '../styles/LandingPage.css';

const WELCOME_MSG = {
  id: 'welcome',
  role: 'bot',
  text: "👋 Hi! I'm **Remedi AI**. Describe your symptoms and I'll help triage your concern instantly.",
};

export const RemediChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Focus input when popup opens
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  const handleToggle = () => setIsOpen((prev) => !prev);

  const sendMessage = async (text) => {
    const userText = text.trim();
    if (!userText) return;

    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: 'user', text: userText },
    ]);
    setIsTyping(true);

    // Small delay to feel natural
    await new Promise((r) => setTimeout(r, 700));

    let reply = '';
    try {
      // Try backend first
      const online = navigator.onLine;
      if (online) {
        const res = await fetch('/api/v1/chatbot/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userText, session_id: 'widget-session' }),
        });
        if (res.ok) {
          const data = await res.json();
          const severity = data.severity_level || '';
          const condition = data.condition_name || '';
          const steps = data.immediate_actions?.slice(0, 2).join(' • ') || '';
          reply = [
            condition ? `**${condition}**` : '',
            severity ? `Severity: ${severity}` : '',
            steps ? `\nNext steps: ${steps}` : '',
            '\n\n_For full details, tap "Open full assistant" below._',
          ]
            .filter(Boolean)
            .join(' — ');
        }
      }
      if (!reply) {
        const result = matchOfflineSymptoms(userText);
        const condition = result?.condition_name || 'General assessment';
        const severity = result?.severity_level || '';
        const step = result?.immediate_actions?.[0] || '';
        reply = `**${condition}**${severity ? ` (${severity})` : ''}. ${step ? step + ' ' : ''}For full triage details, tap "Open full assistant" below.`;
      }
    } catch {
      reply = 'I couldn\'t fetch a response right now. Please try again or open the full assistant.';
    }

    setIsTyping(false);
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 1, role: 'bot', text: reply },
    ]);
    saveLocalChatMessage('widget-session', { role: 'user', content: userText });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const renderText = (raw) =>
    raw
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>');

  return (
    <div className="remedi-chat-fab">
      {/* Popup panel */}
      {isOpen && (
        <div className="remedi-chat-popup">
          {/* Header */}
          <div className="remedi-popup-header">
            <div className="remedi-popup-header-left">
              <div className="remedi-popup-avatar">
                <Bot size={20} color="#fff" />
              </div>
              <div>
                <p className="remedi-popup-title">Remedi AI</p>
                <p className="remedi-popup-subtitle">
                  <span className="remedi-online-dot" />
                  Clinical Triage Assistant
                </p>
              </div>
            </div>
            <button
              className="remedi-popup-close"
              onClick={handleToggle}
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="remedi-popup-body" ref={bodyRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`remedi-msg ${msg.role}`}>
                {msg.role === 'bot' && (
                  <div className="remedi-msg-avatar">🤖</div>
                )}
                <div
                  className="remedi-msg-bubble"
                  dangerouslySetInnerHTML={{ __html: renderText(msg.text) }}
                />
              </div>
            ))}
            {isTyping && (
              <div className="remedi-msg bot">
                <div className="remedi-msg-avatar">🤖</div>
                <div className="remedi-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {/* Expand to full page */}
          <Link to="/assistant" className="remedi-popup-expand" onClick={handleToggle}>
            <Maximize2 size={11} />
            Open full assistant
          </Link>

          {/* Input */}
          <form className="remedi-popup-input" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe symptoms…"
              disabled={isTyping}
            />
            <button
              type="submit"
              className="remedi-popup-send"
              disabled={!input.trim() || isTyping}
              aria-label="Send"
            >
              <Send size={15} color="#fff" />
            </button>
          </form>
        </div>
      )}

      {/* FAB Toggle Button */}
      <button
        className={`remedi-fab-toggle ${isOpen ? 'is-open' : ''}`}
        onClick={handleToggle}
        aria-label={isOpen ? 'Close Remedi AI' : 'Open Remedi AI'}
        title="Remedi AI Health Assistant"
      >
        {isOpen ? (
          <X size={24} color="#fff" />
        ) : (
          <Bot size={26} color="#fff" />
        )}
        {!isOpen && hasUnread && (
          <span className="remedi-fab-badge">1</span>
        )}
      </button>
    </div>
  );
};

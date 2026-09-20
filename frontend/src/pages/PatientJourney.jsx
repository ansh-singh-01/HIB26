import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { digiYatraService } from '../services/api';
import { 
  HeartPulse, 
  Stethoscope, 
  Building2, 
  FlaskConical, 
  Pill, 
  Calendar, 
  ShieldCheck, 
  Radio, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  ArrowRight,
  Filter,
  Navigation
} from 'lucide-react';
import '../styles/DashboardApollo.css';

export const PatientJourney = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    const fetchJourney = async () => {
      try {
        const data = await digiYatraService.getJourney();
        setEvents(data || []);
      } catch (err) {
        console.error('Error fetching patient healthcare journey:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJourney();
  }, []);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'encounter':
        return <Stethoscope size={22} />;
      case 'test':
        return <FlaskConical size={22} />;
      case 'checkin':
        return <ShieldCheck size={22} />;
      case 'referral':
        return <Navigation size={22} />;
      case 'risk_assessment':
        return <HeartPulse size={22} />;
      case 'symptoms':
        return <Radio size={22} />;
      case 'medication':
        return <Pill size={22} />;
      case 'followup':
        return <Calendar size={22} />;
      default:
        return <FileText size={22} />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const filteredEvents = events.filter(e => {
    if (filterCategory === 'all') return true;
    return e.category === filterCategory;
  });

  return (
    <div className="apollo-dashboard-wrapper">
      <div className="apollo-dashboard-container" style={{ maxWidth: '960px' }}>
        
        {/* Header Breadcrumbs & Title */}
        <div style={{ marginBottom: '24px' }}>
          <div className="apollo-dash-badge-strip" style={{ marginBottom: '10px' }}>
            <span className="apollo-dash-status-pill">
              <span className="apollo-dash-status-dot" />
              Longitudinal Healthcare Record
            </span>
            <span className="apollo-dash-ai-pill">
              <ShieldCheck size={13} />
              DigiYatra Single Patient Journey
            </span>
          </div>
          <h1 className="apollo-dash-title" style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
            My Healthcare Journey
          </h1>
          <p className="apollo-dash-subtitle">
            One single unified timeline following your care across hospitals, diagnostic centers, consultations, prescriptions, and follow-ups.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
          {[
            { id: 'all', label: 'All Journey Events' },
            { id: 'encounter', label: 'Hospital Encounters' },
            { id: 'test', label: 'Diagnostic Tests' },
            { id: 'checkin', label: 'Check-In Verifications' },
            { id: 'referral', label: 'Referrals & Routing' },
            { id: 'medication', label: 'Prescriptions' },
            { id: 'followup', label: 'Follow-ups' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterCategory(f.id)}
              style={{
                padding: '7px 14px',
                borderRadius: '20px',
                border: filterCategory === f.id ? '1px solid #059669' : '1px solid #E2E8F0',
                background: filterCategory === f.id ? '#ECFDF5' : '#FFFFFF',
                color: filterCategory === f.id ? '#065F46' : '#64748B',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748B' }}>
            Loading your complete DigiYatra care journey...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="journey-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ color: '#64748B', marginBottom: '16px' }}>
              No events found in this category.
            </p>
            <Link to="/reports" className="apollo-dash-btn-primary" style={{ display: 'inline-flex' }}>
              <FileText size={16} /> View Connected Medical Reports
            </Link>
          </div>
        ) : (
          <div className="journey-timeline-wrapper">
            {filteredEvents.map((evt) => (
              <div key={evt.id} className="journey-node-row">
                <div className={`journey-icon-bubble ${evt.category}`}>
                  {getCategoryIcon(evt.category)}
                </div>

                <div className="journey-card">
                  <div className="journey-card-header">
                    <span className="journey-card-title">{evt.title}</span>
                    {evt.severity_or_status && (
                      <span className={`apollo-role-tag ${evt.category === 'risk_assessment' ? 'emergency' : 'verified'}`}>
                        {evt.severity_or_status}
                      </span>
                    )}
                  </div>

                  <div className="journey-card-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={13} /> {formatDate(evt.date)}
                    </span>
                    {evt.facility_or_provider && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Building2 size={13} /> {evt.facility_or_provider}
                      </span>
                    )}
                  </div>

                  <div className="journey-card-summary">
                    {evt.summary}
                  </div>

                  {evt.details && evt.details.treatment_notes && (
                    <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#475569', fontStyle: 'italic' }}>
                      <strong>Clinical Notes:</strong> {evt.details.treatment_notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

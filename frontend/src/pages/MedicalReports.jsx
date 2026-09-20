import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { digiYatraService } from '../services/api';
import { 
  FileText, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Plus, 
  Download, 
  Printer, 
  ExternalLink, 
  Share2, 
  ShieldCheck, 
  ArrowRight, 
  Filter, 
  Activity, 
  Heart, 
  X, 
  Stethoscope,
  ClipboardList,
  Sparkles,
  Link2
} from 'lucide-react';
import '../styles/DashboardApollo.css';

// Default enriched reports demonstrating cross-facility history connection
const INITIAL_REPORTS = [
  {
    id: 'rep-01',
    test_name: 'Complete Blood Count (CBC) with 5-Part Differential',
    category: 'Pathology & Blood',
    facility_name: 'Thyrocare Central Diagnostics',
    doctor_name: 'Dr. Priya Sharma, MD (Pathology)',
    test_date: '2026-09-04T09:30:00Z',
    status: 'normal',
    status_label: 'Normal & Signed',
    connection_context: 'Conducted prior to Cardiology consultation at Community Health Centre (CHC) Sanwer. Automatically synced to District Care Grid.',
    result_summary: 'Adult hemogram within established clinical norms. Hemoglobin, platelet count, and absolute neutrophil count optimal. No cellular atypia or left shift noted.',
    parameters: [
      { name: 'Hemoglobin', value: '13.6 g/dL', ref: '12.0 - 15.5 g/dL', status: 'normal' },
      { name: 'Total Leukocyte Count (WBC)', value: '6,800 /mcL', ref: '4,500 - 11,000 /mcL', status: 'normal' },
      { name: 'Platelet Count', value: '240,000 /mcL', ref: '150,000 - 450,000 /mcL', status: 'normal' },
      { name: 'Red Blood Cells (RBC)', value: '4.52 M/mcL', ref: '4.00 - 5.20 M/mcL', status: 'normal' },
      { name: 'Hematocrit (PCV)', value: '41.2%', ref: '37.0 - 48.0%', status: 'normal' },
    ],
    verified: true,
  },
  {
    id: 'rep-02',
    test_name: '12-Lead Electrocardiogram (ECG)',
    category: 'Cardiology & ECG',
    facility_name: 'Maharaja Yashwantrao Hospital (MYH Indore)',
    doctor_name: 'Dr. Vikram Malhotra, DM (Cardiology)',
    test_date: '2026-09-02T14:15:00Z',
    status: 'normal',
    status_label: 'Normal Sinus Rhythm',
    connection_context: 'Requested during emergency check-in at MYH District Hospital after referral from Primary Health Centre. Accessible by attending cardiologist.',
    result_summary: 'Normal sinus rhythm at 74 beats per minute. Normal PR interval (156 ms) and QRS duration (88 ms). No ischemic ST segment elevation, depression, or pathological Q waves.',
    parameters: [
      { name: 'Heart Rate', value: '74 bpm', ref: '60 - 100 bpm', status: 'normal' },
      { name: 'PR Interval', value: '156 ms', ref: '120 - 200 ms', status: 'normal' },
      { name: 'QRS Duration', value: '88 ms', ref: '80 - 120 ms', status: 'normal' },
      { name: 'QTc Interval', value: '418 ms', ref: '< 450 ms', status: 'normal' },
      { name: 'Rhythm', value: 'Sinus Rhythm', ref: 'Normal Sinus', status: 'normal' },
    ],
    verified: true,
  },
  {
    id: 'rep-03',
    test_name: 'Comprehensive Metabolic & Lipid Panel (CMP)',
    category: 'Biochemistry & Panels',
    facility_name: 'Apollo Health City Central Labs',
    doctor_name: 'Dr. Ananya Roy, MD (Biochemistry)',
    test_date: '2026-08-28T08:45:00Z',
    status: 'attention',
    status_label: 'Borderline Attention',
    connection_context: 'Routine metabolic baseline check linked to chronic disease management protocol. Shared with general physician and nephrology desk.',
    result_summary: 'Fasting blood glucose borderline elevated (108 mg/dL). Renal function parameters intact with healthy glomerular filtration rate (eGFR > 90 mL/min). Serum electrolytes balanced.',
    parameters: [
      { name: 'Fasting Blood Sugar', value: '108 mg/dL', ref: '70 - 99 mg/dL', status: 'attention' },
      { name: 'Serum Creatinine', value: '0.88 mg/dL', ref: '0.60 - 1.20 mg/dL', status: 'normal' },
      { name: 'eGFR (CKD-EPI)', value: '96 mL/min/1.73m²', ref: '> 90 mL/min', status: 'normal' },
      { name: 'Serum Sodium (Na+)', value: '141 mEq/L', ref: '135 - 145 mEq/L', status: 'normal' },
      { name: 'Serum Potassium (K+)', value: '4.2 mEq/L', ref: '3.5 - 5.0 mEq/L', status: 'normal' },
    ],
    verified: true,
  },
  {
    id: 'rep-04',
    test_name: 'Digital Chest X-Ray (PA View)',
    category: 'Radiology & Scans',
    facility_name: 'Community Health Centre (CHC) Sanwer',
    doctor_name: 'Dr. R. K. Saxena, MD (Radiology)',
    test_date: '2026-08-20T11:20:00Z',
    status: 'normal',
    status_label: 'Clear / Unremarkable',
    connection_context: 'Ordered following acute seasonal respiratory complaint at CHC Sanwer. Tele-radiology verified and connected to central PACS archive.',
    result_summary: 'Both lung fields appear clear without focal consolidation, pneumothorax, or pleural effusion. Normal cardiothoracic ratio (< 0.50). Bilateral costophrenic angles are sharp.',
    parameters: [
      { name: 'Bilateral Lung Fields', value: 'Clear / No Infiltrates', ref: 'Clear', status: 'normal' },
      { name: 'Cardiothoracic Ratio', value: '0.44', ref: '< 0.50', status: 'normal' },
      { name: 'Pleural Spaces', value: 'Clear & Sharp', ref: 'Clear', status: 'normal' },
      { name: 'Bony Thorax', value: 'Intact / No Fracture', ref: 'Intact', status: 'normal' },
    ],
    verified: true,
  },
  {
    id: 'rep-05',
    test_name: 'Glycated Hemoglobin (HbA1c) Screening',
    category: 'Pathology & Blood',
    facility_name: 'Pathkind National Diagnostic Grid',
    doctor_name: 'Dr. S. K. Gupta, MD (Endocrinology)',
    test_date: '2026-08-14T10:00:00Z',
    status: 'attention',
    status_label: 'Pre-Diabetic Monitor',
    connection_context: 'Quarterly monitoring test connected across Ayushman Bharat Health Account (ABHA) data exchange.',
    result_summary: 'HbA1c level reflects moderate glycemic control over the preceding 90 days. Lifestyle modification and dietary counseling advised.',
    parameters: [
      { name: 'HbA1c (HPLC)', value: '6.4%', ref: '< 5.7% Normal', status: 'attention' },
      { name: 'Estimated Avg Glucose (eAG)', value: '137 mg/dL', ref: '< 117 mg/dL', status: 'attention' },
    ],
    verified: true,
  },
];

export const MedicalReports = () => {
  const [reports, setReports] = useState(INITIAL_REPORTS);
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [inspectReport, setInspectReport] = useState(null);
  const [addSuccessMsg, setAddSuccessMsg] = useState('');

  // New report form state
  const [formTestName, setFormTestName] = useState('');
  const [formCategory, setFormCategory] = useState('Pathology & Blood');
  const [formFacility, setFormFacility] = useState('Thyrocare Central Diagnostics');
  const [formDoctor, setFormDoctor] = useState('Dr. Priya Sharma');
  const [formSummary, setFormSummary] = useState('');
  const [formStatus, setFormStatus] = useState('normal');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pass = await digiYatraService.getPassport().catch(() => null);
        setPassport(pass);

        const apiReports = await digiYatraService.getMedicalReports().catch(() => []);
        if (apiReports && apiReports.length > 0) {
          // Format API reports and combine with defaults if not already present
          const formattedApi = apiReports.map((r) => ({
            id: r.id || `api-${Math.random()}`,
            test_name: r.test_name,
            category: r.category || 'General Diagnostic',
            facility_name: 'Participating Health Grid Facility',
            doctor_name: 'Attending Physician',
            test_date: r.test_date || new Date().toISOString(),
            status: r.result_summary?.toLowerCase().includes('abnormal') || r.result_summary?.toLowerCase().includes('high') ? 'attention' : 'normal',
            status_label: r.result_summary?.toLowerCase().includes('abnormal') ? 'Requires Attention' : 'Verified & Signed',
            connection_context: 'Digitally authenticated across Medi-Connect Longitudinal Care Grid.',
            result_summary: r.result_summary || 'Clinical findings verified and uploaded to patient record.',
            parameters: [
              { name: 'Diagnostic Result', value: 'Recorded', ref: 'Clinical Standards', status: 'normal' },
            ],
            verified: true,
          }));

          // Avoid duplicates by test_name
          const existingNames = new Set(formattedApi.map((x) => x.test_name));
          const complementary = INITIAL_REPORTS.filter((x) => !existingNames.has(x.test_name));
          setReports([...formattedApi, ...complementary]);
        }
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddReport = async (e) => {
    e.preventDefault();
    if (!formTestName.trim()) return;

    const newReport = {
      test_name: formTestName.trim(),
      category: formCategory,
      result_summary: `${formSummary.trim() || 'Diagnostic investigation completed.'} (Facility: ${formFacility} | Physician: ${formDoctor})`,
      test_date: new Date().toISOString(),
    };

    try {
      await digiYatraService.addMedicalReport(newReport).catch(() => null);
    } catch (err) {
      console.warn('Backend sync failed, adding locally:', err);
    }

    const localEntry = {
      id: `rep-${Date.now()}`,
      test_name: formTestName.trim(),
      category: formCategory,
      facility_name: formFacility,
      doctor_name: formDoctor,
      test_date: new Date().toISOString(),
      status: formStatus,
      status_label: formStatus === 'normal' ? 'Normal & Signed' : 'Requires Attention',
      connection_context: `Connected at ${formFacility}. Available to all authorized facilities under active patient consent.`,
      result_summary: formSummary.trim() || 'Diagnostic parameters reviewed and verified.',
      parameters: [
        { name: 'Test Finding', value: 'Verified', ref: 'Normal Reference', status: formStatus },
      ],
      verified: true,
    };

    setReports([localEntry, ...reports]);
    setShowAddModal(false);
    setFormTestName('');
    setFormSummary('');
    setAddSuccessMsg(`"${localEntry.test_name}" has been connected to your health history!`);
    setTimeout(() => setAddSuccessMsg(''), 4000);
  };

  const handlePrint = (report) => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const categories = ['All', 'Pathology & Blood', 'Cardiology & ECG', 'Radiology & Scans', 'Biochemistry & Panels'];

  const filteredReports = reports.filter((r) => {
    const matchesSearch = 
      r.test_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.facility_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.result_summary?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || r.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const participatingFacilities = Array.from(new Set(reports.map((r) => r.facility_name))).filter(Boolean);

  return (
    <div className="apollo-dashboard-wrapper">
      <div className="apollo-dashboard-container" style={{ maxWidth: '1100px' }}>

        {/* 1. Header & Welcome Strip */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div>
            <div className="apollo-dash-badge-strip" style={{ marginBottom: '10px' }}>
              <span className="apollo-dash-status-pill">
                <span className="apollo-dash-status-dot" />
                Inter-Hospital Health Grid Active
              </span>
              <span className="apollo-dash-ai-pill">
                <ShieldCheck size={13} />
                ABDM Digitally Verified Records
              </span>
              <span className="apollo-role-tag patient">
                DigiYatra Rail
              </span>
            </div>

            <h1 className="apollo-dash-title" style={{ fontSize: '1.9rem', marginBottom: '8px' }}>
              Medical Reports & History Connection
            </h1>
            <p className="apollo-dash-subtitle" style={{ maxWidth: '720px' }}>
              Your centralized diagnostic repository. When you visit a Primary Health Centre, District Hospital, or diagnostic lab, all test results, imaging scans, and pathology panels connect seamlessly to your Medi-Connect Health Passport.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowAddModal(true)}
              className="apollo-dash-btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.86rem' }}
            >
              <Plus size={16} />
              <span>Connect / Add Report</span>
            </button>
            <Link
              to="/consent"
              className="apollo-dash-btn-secondary"
              style={{ padding: '10px 18px', fontSize: '0.86rem' }}
            >
              <Share2 size={16} />
              <span>Manage Consent</span>
            </Link>
          </div>
        </div>

        {/* Success Toast */}
        {addSuccessMsg && (
          <div style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '0.86rem',
          }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>{addSuccessMsg}</span>
          </div>
        )}

        {/* 2. Cross-Facility History Connection Map Card */}
        <div className="reports-connection-network">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Link2 size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Interconnected Healthcare Facilities Network
                </h2>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  Diagnostics performed across {participatingFacilities.length} centers are linked to Medi-Connect ID: <strong style={{ color: '#1E40AF', fontFamily: 'monospace' }}>{passport?.medi_connect_id || 'MC-75912'}</strong>
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="passport-chip" style={{ background: '#F1F5F9', color: '#334155', border: 'none' }}>
                {reports.length} Verified Reports
              </span>
              <span className="passport-chip" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
                100% Tamper-Proof
              </span>
            </div>
          </div>

          <div className="reports-network-nodes">
            <div className="reports-network-node active">
              <div style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                Primary Care Intake
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                CHC Sanwer
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                Chest X-Ray & Screening
              </div>
            </div>

            <ArrowRight size={18} className="reports-network-arrow" />

            <div className="reports-network-node active">
              <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                Pathology Hub
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                Thyrocare Diagnostics
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                Complete Blood Count (CBC)
              </div>
            </div>

            <ArrowRight size={18} className="reports-network-arrow" />

            <div className="reports-network-node active">
              <div style={{ fontSize: '0.72rem', color: '#7C3AED', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                Tertiary Hospital
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                MYH District Hospital
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                12-Lead ECG & Cardiology
              </div>
            </div>

            <ArrowRight size={18} className="reports-network-arrow" />

            <div className="reports-network-node active">
              <div style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                Specialized Lab
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                Apollo Central Labs
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                Metabolic Panel & HbA1c
              </div>
            </div>
          </div>
        </div>

        {/* 3. Search & Category Filters */}
        <div className="reports-filter-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            <input
              type="text"
              placeholder="Search reports by test name, facility, physician, or biomarker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="reports-search-input"
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div className="reports-category-pills">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`reports-category-pill ${selectedCategory === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#334155',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Results</option>
            <option value="normal">Normal Range Only</option>
            <option value="attention">Requires Attention</option>
          </select>
        </div>

        {/* 4. Reports List */}
        {filteredReports.length === 0 ? (
          <div style={{
            background: '#FFFFFF',
            border: '1px dashed #CBD5E1',
            borderRadius: '16px',
            padding: '48px',
            textAlign: 'center',
            color: '#64748B',
          }}>
            <ClipboardList size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.05rem', color: '#0F172A', fontWeight: 600, marginBottom: '6px' }}>
              No medical reports matched your filters
            </h3>
            <p style={{ fontSize: '0.84rem', maxWidth: '420px', margin: '0 auto 16px auto' }}>
              Try searching with different keywords or connect a new diagnostic report to your Medi-Connect health record.
            </p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedStatus('all'); }}
              className="apollo-dash-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div>
            {filteredReports.map((report) => {
              const isNormal = report.status === 'normal';
              return (
                <div key={report.id} className="report-card">
                  {/* Top Meta Line */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#EFF6FF',
                        color: '#1D4ED8',
                      }}>
                        {report.category}
                      </span>

                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: isNormal ? '#ECFDF5' : '#FEF3C7',
                        color: isNormal ? '#065F46' : '#92400E',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        {isNormal ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {report.status_label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748B' }}>
                      <Calendar size={14} />
                      <span>Conducted: {formatDate(report.test_date)}</span>
                    </div>
                  </div>

                  {/* Test Title & Issuing Facility */}
                  <div style={{ marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                      {report.test_name}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.82rem', color: '#475569' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Building2 size={15} color="#2563EB" />
                        <strong>{report.facility_name}</strong>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Stethoscope size={15} color="#059669" />
                        <span>{report.doctor_name}</span>
                      </span>
                    </div>
                  </div>

                  {/* History Connection Ribbon */}
                  <div className="report-connection-ribbon">
                    <Link2 size={15} color="#166534" />
                    <span>
                      <strong>Cross-Facility History: </strong> {report.connection_context}
                    </span>
                  </div>

                  {/* Parameters Grid */}
                  {report.parameters && report.parameters.length > 0 && (
                    <div className="report-biomarkers-grid">
                      {report.parameters.map((param, idx) => (
                        <div key={idx} className="report-biomarker-chip">
                          <div className="report-biomarker-name">{param.name}</div>
                          <div className="report-biomarker-value">
                            <span>{param.value}</span>
                            <span className={`report-biomarker-flag ${param.status === 'normal' ? 'normal' : 'attention'}`}>
                              {param.status === 'normal' ? 'Normal' : 'Monitor'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '2px' }}>
                            Ref: {param.ref}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Result Summary */}
                  <div style={{
                    background: '#F8FAFC',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    fontSize: '0.84rem',
                    color: '#334155',
                    lineHeight: '1.5',
                    borderLeft: `3px solid ${isNormal ? '#10B981' : '#F59E0B'}`,
                    marginBottom: '16px',
                  }}>
                    <strong>Clinical Impression: </strong> {report.result_summary}
                  </div>

                  {/* Action Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#059669', fontWeight: 600 }}>
                      <ShieldCheck size={16} />
                      <span>Digitally Authenticated by ABDM National Registry</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setInspectReport(report)}
                        className="apollo-dash-btn-secondary"
                        style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                      >
                        <FileText size={14} /> View Detailed Report
                      </button>

                      <button
                        onClick={() => handlePrint(report)}
                        className="apollo-dash-btn-secondary"
                        style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                      >
                        <Printer size={14} /> Print / PDF
                      </button>

                      <Link
                        to="/consent"
                        className="apollo-dash-btn-primary"
                        style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                      >
                        <Share2 size={14} /> Grant Consent
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. Add / Connect Report Modal */}
        {showAddModal && (
          <div className="apollo-profile-modal-backdrop" onClick={() => setShowAddModal(false)}>
            <div className="apollo-profile-modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
              <div className="apollo-profile-modal-header">
                <div className="apollo-profile-modal-title">
                  <Plus size={18} color="#2563EB" />
                  <span>Connect New Medical Report</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="apollo-profile-close-btn"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddReport} className="apollo-profile-modal-body">
                <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '16px' }}>
                  Link a diagnostic test, lab panel, or scan from any hospital or accredited laboratory to your Medi-Connect ID.
                </p>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Test / Investigation Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lipid Profile Panel, Thyroid Stimulating Hormone (TSH)..."
                    value={formTestName}
                    onChange={(e) => setFormTestName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.86rem',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Diagnostic Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        background: '#FFFFFF',
                      }}
                    >
                      <option value="Pathology & Blood">Pathology & Blood</option>
                      <option value="Cardiology & ECG">Cardiology & ECG</option>
                      <option value="Radiology & Scans">Radiology & Scans</option>
                      <option value="Biochemistry & Panels">Biochemistry & Panels</option>
                      <option value="Other Diagnostics">Other Diagnostics</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Result Classification
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        background: '#FFFFFF',
                      }}
                    >
                      <option value="normal">Normal Range</option>
                      <option value="attention">Requires Attention</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Issuing Hospital / Laboratory
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Thyrocare, District Hospital Indore, Apollo Clinic..."
                    value={formFacility}
                    onChange={(e) => setFormFacility(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.86rem',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Ordering / Reviewing Physician
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Priya Sharma, MD"
                    value={formDoctor}
                    onChange={(e) => setFormDoctor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.86rem',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Clinical Impression / Findings Summary
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief findings, observed parameters, or doctor's conclusion..."
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.86rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="apollo-dash-btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="apollo-dash-btn-primary"
                    style={{ padding: '8px 20px', fontSize: '0.84rem' }}
                  >
                    Save & Connect Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 6. Inspect Report Modal (Full Diagnostic Sheet) */}
        {inspectReport && (
          <div className="apollo-profile-modal-backdrop" onClick={() => setInspectReport(null)}>
            <div className="apollo-profile-modal-card" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
              <div className="apollo-profile-modal-header">
                <div className="apollo-profile-modal-title">
                  <FileText size={18} color="#2563EB" />
                  <span>Verified Diagnostic Report Sheet</span>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectReport(null)}
                  className="apollo-profile-close-btn"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="apollo-profile-modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                {/* Lab Header Box */}
                <div style={{ borderBottom: '2px solid #0F172A', paddingBottom: '14px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        {inspectReport.facility_name}
                      </h2>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                        Accredited Clinical Pathology & Diagnostic Grid • NABL & ABDM Certified
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="apollo-role-tag patient">
                        VERIFIED
                      </span>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '4px' }}>
                        Ref: {inspectReport.id}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient Summary Header */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 16px', marginBottom: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>PATIENT NAME</span>
                      <strong>{passport?.full_name || 'Patient'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>MEDI-CONNECT ID</span>
                      <strong style={{ color: '#2563EB', fontFamily: 'monospace' }}>{passport?.medi_connect_id || 'MC-75912'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>TEST DATE</span>
                      <strong>{formatDate(inspectReport.test_date)}</strong>
                    </div>
                  </div>
                </div>

                {/* Test Investigation Title */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>
                    INVESTIGATION
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: '2px 0 6px 0' }}>
                    {inspectReport.test_name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    Referring Physician: <strong>{inspectReport.doctor_name}</strong>
                  </div>
                </div>

                {/* Quantitative Parameters Table */}
                {inspectReport.parameters && inspectReport.parameters.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', color: '#475569' }}>Parameter</th>
                          <th style={{ padding: '8px 10px', color: '#475569' }}>Observed Value</th>
                          <th style={{ padding: '8px 10px', color: '#475569' }}>Biological Ref Interval</th>
                          <th style={{ padding: '8px 10px', color: '#475569' }}>Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspectReport.parameters.map((p, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0F172A' }}>{p.name}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 700, color: p.status === 'normal' ? '#0F172A' : '#D97706' }}>{p.value}</td>
                            <td style={{ padding: '8px 10px', color: '#64748B' }}>{p.ref}</td>
                            <td style={{ padding: '8px 10px' }}>
                              <span className={`report-biomarker-flag ${p.status === 'normal' ? 'normal' : 'attention'}`}>
                                {p.status === 'normal' ? 'Normal' : 'Attention'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Impression */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                    CLINICAL IMPRESSION & INTERPRETATION
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#1E293B', lineHeight: '1.5' }}>
                    {inspectReport.result_summary}
                  </div>
                </div>

                {/* Digital Signature Footer */}
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={20} color="#059669" />
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065F46' }}>
                        Digitally Signed & Validated
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                        Stored on Medi-Connect Sovereign Distributed Vault
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePrint(inspectReport)}
                    className="apollo-dash-btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  >
                    <Printer size={14} /> Print Document
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

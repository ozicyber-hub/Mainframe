import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Button, LinearProgress,
  CircularProgress, Tooltip, TextField, Divider, Alert,
  Tabs, Tab, Collapse, ToggleButton, ToggleButtonGroup,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  MenuItem, Select,
} from '@mui/material';
import {
  Dashboard, Assignment, CloudUpload, Warning, Description,
  CheckCircle, Cancel, RadioButtonUnchecked, HourglassEmpty,
  AutoAwesome, ExpandMore, ExpandLess, UploadFile, Article,
  FileDownload, PictureAsPdf, Gavel, Shield,
  VisibilityOff, Refresh, CompareArrows,
  Security, AssignmentTurnedIn, TrendingUp,
  ReportProblem, ErrorOutline, NotificationImportant,
  CheckCircleOutline, RemoveCircleOutline, BubbleChart,
  FilterList, Person, CalendarToday, Build, InfoOutlined,
} from '@mui/icons-material';
import api from '../utils/api';

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  not_started: { label: 'Not Started',    color: '#94a3b8', bg: '#f1f5f9', Icon: RadioButtonUnchecked },
  submitted:   { label: 'Pending Review', color: '#3b82f6', bg: '#eff6ff', Icon: HourglassEmpty       },
  ai_reviewed: { label: 'AI Reviewed',    color: '#f59e0b', bg: '#fffbeb', Icon: AutoAwesome           },
  accepted:    { label: 'Accepted',       color: '#22c55e', bg: '#f0fdf4', Icon: CheckCircle           },
  rejected:    { label: 'Rejected',       color: '#ef4444', bg: '#fef2f2', Icon: Cancel               },
  na:          { label: 'N/A',            color: '#a855f7', bg: '#faf5ff', Icon: VisibilityOff         },
};

const DOC_CFG = {
  POLICY:        { color: '#24483E', label: 'Policy'      },
  PROCEDURE:     { color: '#2563eb', label: 'Procedure'   },
  PLAN:          { color: '#7c3aed', label: 'Plan'        },
  LOG:           { color: '#ea580c', label: 'Log'         },
  REPORT:        { color: '#dc2626', label: 'Report'      },
  CERTIFICATION: { color: '#ca8a04', label: 'Certificate' },
  SCREENSHOT:    { color: '#0891b2', label: 'Screenshot'  },
  CONTRACT:      { color: '#374151', label: 'Contract'    },
  TRAINING:      { color: '#16a34a', label: 'Training'    },
  OTHER:         { color: '#6b7280', label: 'Evidence'    },
};

const RISK_CFG = {
  CRITICAL: { color: '#dc2626', bg: '#fef2f2', label: 'Critical' },
  HIGH:     { color: '#ea580c', bg: '#fff7ed', label: 'High'     },
  MEDIUM:   { color: '#d97706', bg: '#fffbeb', label: 'Medium'   },
  LOW:      { color: '#2563eb', bg: '#eff6ff', label: 'Low'      },
};

const ANSWER_COLORS = {
  YES: '#22c55e', PARTIAL: '#f59e0b', NO: '#ef4444', 'N/A': '#94a3b8',
  ACHIEVED: '#22c55e', 'NOT ACHIEVED': '#ef4444',
  '0': '#ef4444', '1': '#f59e0b', '2': '#84cc16', '3': '#22c55e',
  'Fully Implemented': '#22c55e', 'Largely Implemented': '#84cc16',
  'Partially Implemented': '#f59e0b', 'Not Implemented': '#ef4444',
  'Not Applicable': '#94a3b8', 'Planned': '#3b82f6',
  Compliant: '#22c55e', 'Partially Compliant': '#f59e0b', 'Non-Compliant': '#ef4444',
  Present: '#ef4444', 'Not Present': '#22c55e',
};

const isPositive = a => ['YES','ACHIEVED','3','Fully Implemented','Compliant','Not Present'].includes(a);
const isPartial  = a => ['PARTIAL','2','1','Largely Implemented','Partially Implemented','Partially Compliant','Planned'].includes(a);
const isNegative = a => ['NO','0','Not Implemented','Non-Compliant','Present'].includes(a);
const scoreColor = s => s >= 75 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';

// ── GRC Intelligence Helpers ──────────────────────────────────────────────────

const FW_COLORS = { ISO: '#1d4ed8', SOC2: '#7c3aed', NIST: '#047857', PCI: '#b45309' };

const FRAMEWORK_MAP = [
  { keys: /access.?control|authenticat|authoriz|password|credential|privilege|mfa|multi.factor|identity|iam/i,
    refs: [{ id:'ISO-A9', label:'ISO A.9', tooltip:'Access Control (ISO 27001)' }, { id:'SOC2-CC6', label:'SOC2 CC6', tooltip:'Logical Access (SOC 2)' }, { id:'NIST-AC', label:'NIST AC', tooltip:'Access Control (NIST 800-53)' }] },
  { keys: /encrypt|cryptograph|tls|ssl|key.?manag|cipher/i,
    refs: [{ id:'ISO-A10', label:'ISO A.10', tooltip:'Cryptography (ISO 27001)' }, { id:'SOC2-CC6.7', label:'SOC2 CC6.7', tooltip:'Data Encryption (SOC 2)' }, { id:'NIST-SC13', label:'NIST SC-13', tooltip:'Cryptographic Protection' }, { id:'PCI-4', label:'PCI DSS 4', tooltip:'Encrypt in Transit' }] },
  { keys: /incident|response|breach|security.?event|detection|siem|alert/i,
    refs: [{ id:'ISO-A16', label:'ISO A.16', tooltip:'Incident Management (ISO 27001)' }, { id:'SOC2-CC7', label:'SOC2 CC7', tooltip:'System Monitoring (SOC 2)' }, { id:'NIST-IR', label:'NIST IR', tooltip:'Incident Response' }] },
  { keys: /vulnerability|patch|scan|penetrat|exploit/i,
    refs: [{ id:'ISO-A12', label:'ISO A.12', tooltip:'Operations Security (ISO 27001)' }, { id:'SOC2-CC7.1', label:'SOC2 CC7.1', tooltip:'Threat Detection (SOC 2)' }, { id:'NIST-SI', label:'NIST SI', tooltip:'System Integrity' }, { id:'PCI-11', label:'PCI DSS 11', tooltip:'Test Security Systems' }] },
  { keys: /backup|recovery|continuity|disaster|rto|rpo|resil/i,
    refs: [{ id:'ISO-A17', label:'ISO A.17', tooltip:'Business Continuity (ISO 27001)' }, { id:'SOC2-A1', label:'SOC2 A1', tooltip:'Availability (SOC 2)' }, { id:'NIST-CP', label:'NIST CP', tooltip:'Contingency Planning' }] },
  { keys: /audit|log|monitor|trail/i,
    refs: [{ id:'ISO-A12.4', label:'ISO A.12.4', tooltip:'Event Logging (ISO 27001)' }, { id:'SOC2-CC7.2', label:'SOC2 CC7.2', tooltip:'Monitoring (SOC 2)' }, { id:'NIST-AU', label:'NIST AU', tooltip:'Audit & Accountability' }, { id:'PCI-10', label:'PCI DSS 10', tooltip:'Track & Monitor Access' }] },
  { keys: /risk.?assess|risk.?manag|threat.?model/i,
    refs: [{ id:'ISO-6.1', label:'ISO 6.1', tooltip:'Risk Assessment (ISO 27001)' }, { id:'SOC2-CC3', label:'SOC2 CC3', tooltip:'Risk Assessment (SOC 2)' }, { id:'NIST-RA', label:'NIST RA', tooltip:'Risk Assessment' }] },
  { keys: /vendor|supplier|third.?party|outsourc|supply.?chain/i,
    refs: [{ id:'ISO-A15', label:'ISO A.15', tooltip:'Supplier Relationships (ISO 27001)' }, { id:'SOC2-CC9', label:'SOC2 CC9', tooltip:'Vendor Management (SOC 2)' }, { id:'NIST-SA', label:'NIST SA', tooltip:'System & Services Acquisition' }] },
  { keys: /physical|facilit|building|server.?room|data.?center|cctv|badge/i,
    refs: [{ id:'ISO-A11', label:'ISO A.11', tooltip:'Physical Security (ISO 27001)' }, { id:'SOC2-CC6.4', label:'SOC2 CC6.4', tooltip:'Physical Access (SOC 2)' }, { id:'NIST-PE', label:'NIST PE', tooltip:'Physical Protection' }] },
  { keys: /train|aware|education|phish|staff.?secur|personnel/i,
    refs: [{ id:'ISO-A7.2', label:'ISO A.7.2', tooltip:'Security Awareness (ISO 27001)' }, { id:'SOC2-CC1.4', label:'SOC2 CC1.4', tooltip:'Competence (SOC 2)' }, { id:'NIST-AT', label:'NIST AT', tooltip:'Awareness & Training' }] },
  { keys: /change.?manag|change.?control|config.?manag|deployment|release/i,
    refs: [{ id:'ISO-A12.1', label:'ISO A.12.1', tooltip:'Operational Procedures (ISO 27001)' }, { id:'SOC2-CC8', label:'SOC2 CC8', tooltip:'Change Management (SOC 2)' }, { id:'NIST-CM', label:'NIST CM', tooltip:'Configuration Management' }] },
  { keys: /data.?class|label|sensitiv|pii|personal|privacy|gdpr/i,
    refs: [{ id:'ISO-A8', label:'ISO A.8', tooltip:'Asset Management (ISO 27001)' }, { id:'SOC2-P', label:'SOC2 P Series', tooltip:'Privacy (SOC 2)' }, { id:'NIST-MP', label:'NIST MP', tooltip:'Media Protection' }] },
  { keys: /network|firewall|dmz|segment|perimeter|vpn/i,
    refs: [{ id:'ISO-A13', label:'ISO A.13', tooltip:'Network Security (ISO 27001)' }, { id:'SOC2-CC6.6', label:'SOC2 CC6.6', tooltip:'Network Boundaries (SOC 2)' }, { id:'NIST-SC', label:'NIST SC', tooltip:'System & Comms Protection' }, { id:'PCI-1', label:'PCI DSS 1', tooltip:'Network Controls' }] },
  { keys: /policy|procedure|governance|framework|standard/i,
    refs: [{ id:'ISO-A5', label:'ISO A.5', tooltip:'Security Policies (ISO 27001)' }, { id:'SOC2-CC1', label:'SOC2 CC1', tooltip:'Control Environment (SOC 2)' }, { id:'NIST-PL', label:'NIST PL', tooltip:'Planning' }] },
];

const TESTING_MAP = [
  { keys: /technical|system|config|scan|automat|tool|firewall|network|server|code|deploy|patch/i, method: 'Technical Testing' },
  { keys: /interview|staff|personnel|aware|culture|manag|stakeholder|process/i,               method: 'Interview' },
  { keys: /physical|facilit|walk|inspect|observe|cctv|building|site/i,                         method: 'Observation' },
  { keys: /document|policy|procedure|record|evidence|report|log|certif|plan|register/i,        method: 'Documentation Review' },
];

const FREQUENCY_MAP = [
  { keys: /continuous|real.?time|automat|monitor|alert|live|ongoing|always/i, freq: 'Continuous', color: '#7c3aed' },
  { keys: /monthly|each month|per month|every month/i,                        freq: 'Monthly',    color: '#2563eb' },
  { keys: /quarterly|quarter|every 3 month|4 times/i,                         freq: 'Quarterly',  color: '#0891b2' },
  { keys: /semi.annual|twice.?year|bi.annual|6 month/i,                       freq: 'Semi-Annual',color: '#0284c7' },
];

const GUIDANCE_MAP = [
  { keys: /access.?control|authenticat|mfa|multi.factor|password|credential|privilege|identity/i,
    guidance: 'Strong access controls require unique credentials per user, MFA on all privileged and remote access, quarterly access reviews to revoke unused accounts, and role-based permissions following least-privilege. A mature control includes automated provisioning/deprovisioning tied to HR systems and a formal access request approval workflow with documented sign-offs.',
    steps: ['Implement MFA for all administrative, privileged, and remote access accounts', 'Conduct quarterly user access reviews — revoke inactive accounts within 30 days', 'Apply principle of least privilege across all systems and applications', 'Document a formal access request/approval/revocation workflow', 'Configure automatic account lockout after 5 failed login attempts', 'Maintain a privileged account register with named owners and review dates'] },
  { keys: /encrypt|cryptograph|tls|ssl|key.?manag/i,
    guidance: 'Encryption at rest and in transit is foundational. Mature implementations use AES-256 for stored data, TLS 1.2+ for all transmissions, centralised key management (HSM or KMS), and annual rotation of encryption keys. Weak protocols (TLS 1.0, MD5) and self-signed certificates must be flagged as non-compliant.',
    steps: ['Enforce TLS 1.2 or higher on all external-facing services — disable SSLv3, TLS 1.0, TLS 1.1', 'Encrypt all sensitive data at rest using AES-256 or equivalent', 'Implement a key management procedure with documented rotation schedule (annual minimum)', 'Replace all self-signed certificates with CA-issued certificates', 'Audit all systems handling sensitive data and verify encryption status', 'Document and enforce a cryptographic standards policy'] },
  { keys: /incident|response|breach|security.?event|detection|siem/i,
    guidance: 'A mature incident response capability includes a documented IR plan tested annually, defined severity levels with SLA targets (P1 within 1 hour), a centralised SIEM with tuned alerting, and a post-incident review process. Regulatory notification timelines (e.g. 72 hours for GDPR/NDB) must be built into the plan.',
    steps: ['Document and formalise the Incident Response Plan with defined roles and escalation paths', 'Define severity classifications (P1–P4) with associated response time SLAs', 'Conduct tabletop incident response exercises at least annually', 'Establish a centralised SIEM solution with alert tuning for critical events', 'Document regulatory breach notification timelines and responsible contacts', 'Conduct post-incident review (PIR) for all P1/P2 events within 5 business days'] },
  { keys: /vulnerability|patch|scan|penetrat/i,
    guidance: 'Vulnerability management requires regular scanning (monthly minimum for internet-facing systems), a formal patch SLA by severity (Critical: 24–72h, High: 30 days, Medium: 90 days), and annual penetration testing. Unpatched critical CVEs older than 72 hours are an immediate audit finding.',
    steps: ['Deploy an authenticated vulnerability scanner and run scans monthly at minimum', 'Define and document patch SLAs: Critical ≤72h, High ≤30d, Medium ≤90d, Low ≤180d', 'Maintain a vulnerability register with owner, due date, and remediation status', 'Conduct annual external penetration testing by a qualified third party', 'Implement automated patch management for OS and application layers', 'Track exceptions with a formal risk acceptance sign-off from the appropriate authority'] },
  { keys: /backup|recovery|continuity|disaster|rto|rpo/i,
    guidance: 'Business continuity controls require defined RTO/RPO targets, automated backups following the 3-2-1 rule (3 copies, 2 media types, 1 off-site), and tested recovery procedures. Untested backups are not a valid control — restoration tests must be documented at least annually.',
    steps: ['Define and document RTO/RPO targets per system aligned with business requirements', 'Implement automated daily backups with off-site or cloud storage replication', 'Follow 3-2-1 backup rule: 3 copies, 2 different media types, 1 off-site location', 'Test backup restoration at least annually — document test results and any issues', 'Develop and test a Business Continuity Plan (BCP) and Disaster Recovery Plan (DRP)', 'Train relevant staff on recovery procedures and conduct tabletop exercises'] },
  { keys: /audit|log|monitor|trail/i,
    guidance: 'Comprehensive audit logging must capture authentication events, privilege use, system changes, and sensitive data access. Logs should be immutable, centralised, and retained for minimum 12 months (90 days immediately accessible). Privileged user activity requires enhanced monitoring and regular review.',
    steps: ['Enable logging on all critical systems: authentication, admin actions, data access, system changes', 'Centralise logs in a SIEM or log management platform with tamper protection', 'Define and enforce log retention: minimum 12 months (90 days hot, remainder archived)', 'Configure real-time alerting for high-risk events (failed logins, privilege escalation, bulk exports)', 'Conduct monthly log reviews for privileged user activity', 'Restrict log management system access to security personnel only'] },
  { keys: /vendor|supplier|third.?party|outsourc/i,
    guidance: 'Third-party risk management requires formal vendor security assessments before onboarding, annual reviews for critical vendors, contractual security requirements (DPA, security clauses, right-to-audit), and a maintained vendor inventory with risk ratings.',
    steps: ['Maintain a current inventory of all third-party vendors with access to data or systems', 'Conduct security due diligence before onboarding new critical vendors (questionnaire + evidence)', 'Include security and privacy clauses in all vendor contracts (DPA, breach notification SLA)', 'Review critical vendors annually — request updated SOC 2 reports or security attestations', 'Define a vendor offboarding procedure covering access revocation and data deletion', 'Classify vendors by criticality (Critical/High/Medium/Low) and apply proportionate oversight'] },
  { keys: /physical|facilit|building|server.?room|data.?center/i,
    guidance: 'Physical security controls protect infrastructure from unauthorised access, theft, and environmental damage. Mature controls include badge-controlled entry with logging, CCTV with 90-day retention, environmental monitoring (temperature, humidity, water detection), and quarterly physical access reviews.',
    steps: ['Implement badge access control on data centre and server room doors with audit logging', 'Deploy CCTV at entry/exit points with minimum 90-day footage retention', 'Conduct quarterly physical access reviews and remove stale access immediately', 'Install environmental monitoring: temperature, humidity, smoke/fire, water detection', 'Maintain a visitor log for all non-staff access to sensitive areas', 'Implement a documented secure media destruction procedure for equipment disposal'] },
  { keys: /train|aware|phish|education|staff.?secur/i,
    guidance: 'Security awareness training is most effective when mandatory, role-specific, and regularly updated. Baseline controls include annual training for all staff, quarterly phishing simulations, and specialised training for IT, finance, and executive roles with tracked completion rates.',
    steps: ['Mandate annual security awareness training for 100% of staff with tracked completion', 'Conduct quarterly phishing simulations and provide targeted training for click-throughs', 'Deliver role-specific training for IT admins, finance staff, and executives', 'Include social engineering, physical security, and data handling in training content', 'Verify new staff complete security induction within 30 days of joining', 'Report training completion rates to management quarterly'] },
  { keys: /change.?manag|change.?control|config.?manag/i,
    guidance: 'Change management prevents unauthorised modifications that introduce vulnerabilities. A mature process requires documented change requests, impact/risk assessment, CAB approval, tested rollback procedures, and post-implementation review. Emergency changes require retrospective approval within 24 hours.',
    steps: ['Implement a formal change management process with documented RFC, approval, and testing gates', 'Establish a Change Advisory Board (CAB) meeting at minimum weekly', 'Maintain a Configuration Management Database (CMDB) for all critical assets', 'Require tested rollback procedures for all production changes', 'Enforce code review and security scanning in the CI/CD deployment pipeline', 'Review and audit change records monthly for unauthorised or failed changes'] },
  { keys: /risk.?assess|risk.?manag|threat.?model/i,
    guidance: 'Risk assessments should be conducted annually and upon significant changes. A mature framework includes defined risk appetite, a risk register with ownership and treatment plans, quarterly reviews, and board-level reporting with formal sign-off for risk acceptance decisions.',
    steps: ['Conduct an annual information security risk assessment using a defined methodology (e.g. ISO 27005)', 'Maintain a risk register with owner, inherent/residual rating, and treatment plan', "Define and document the organisation's risk appetite and tolerance thresholds", 'Review the risk register quarterly and update treatment status', 'Obtain formal sign-off for risk acceptance decisions from appropriate authority', 'Report top risks to executive management and board at least quarterly'] },
  { keys: /network|firewall|segment|perimeter|dmz|vpn/i,
    guidance: 'Network security requires a layered defence approach: perimeter firewall with default-deny policy, network segmentation isolating sensitive systems (PCI, HR, management networks), IDS/IPS monitoring, and quarterly firewall rule reviews. Flat networks with no segmentation are a critical finding.',
    steps: ['Implement network segmentation separating production, development, and management networks', 'Apply default-deny firewall rules — only permit explicitly required and documented traffic', 'Review and audit firewall rulesets quarterly; remove stale and overly permissive rules', 'Deploy IDS/IPS on internet-facing network boundaries', 'Disable or remove all unnecessary open ports and services', 'Implement network flow monitoring to detect anomalous traffic patterns'] },
  { keys: /data.?class|label|sensitiv|pii|personal|privacy/i,
    guidance: 'Data classification enables proportionate security controls. A mature scheme includes at least 4 tiers (Public, Internal, Confidential, Restricted), mandatory labelling, and documented handling requirements per tier. All staff must be trained and systems should enforce controls automatically where possible.',
    steps: ['Define and publish a data classification policy with at least 3–4 classification tiers', 'Train all staff on classification tiers, labelling requirements, and handling procedures', 'Apply classification labels to all documents, repositories, email, and databases', 'Implement DLP controls to prevent unauthorised exfiltration of classified data', 'Audit data stores quarterly to verify correct classification and access controls', 'Complete a data flow mapping exercise for all personal and sensitive data'] },
];

const DEFAULT_GUIDANCE = {
  guidance: 'Implement this control with formal documentation, assign a named owner, define a review schedule, and maintain evidence of operation. Ensure the control is tested at least annually and exceptions are formally risk-accepted with appropriate authority sign-off.',
  steps: ['Document the control in formal policy or procedure with version control', 'Assign a named control owner responsible for operation and maintenance', 'Collect and retain evidence of control operation on a defined schedule', 'Review and test control effectiveness at least annually', 'Report control status to management as part of regular GRC reporting'],
};

function getFrameworkRefs(sectionName = '', questionText = '') {
  const combined = `${sectionName} ${questionText}`;
  for (const entry of FRAMEWORK_MAP) {
    if (entry.keys.test(combined)) return entry.refs.slice(0, 3);
  }
  return [];
}

function getTestingMethod(questionText = '') {
  for (const { keys, method } of TESTING_MAP) {
    if (keys.test(questionText)) return method;
  }
  return 'Documentation Review';
}

function getReviewFrequency(sectionName = '', questionText = '') {
  const t = `${sectionName} ${questionText}`;
  for (const { keys, freq, color } of FREQUENCY_MAP) {
    if (keys.test(t)) return { freq, color };
  }
  return { freq: 'Annual', color: '#64748b' };
}

function getGuidanceAndSteps(sectionName = '', questionText = '') {
  const combined = `${sectionName} ${questionText}`;
  for (const entry of GUIDANCE_MAP) {
    if (entry.keys.test(combined)) return { guidance: entry.guidance, steps: entry.steps };
  }
  return DEFAULT_GUIDANCE;
}

function getControlRisk(ans, questionText = '') {
  if (isNegative(ans)) return 'CRITICAL';
  if (!ans) {
    if (/authenticat|mfa|encrypt|incident|backup|access.?control|password|privilege/i.test(questionText)) return 'HIGH';
    return 'MEDIUM';
  }
  if (isPartial(ans)) return 'MEDIUM';
  return null;
}

function isHighImpact(questionText = '') {
  return /authenticat|mfa|encrypt|incident|backup|access.?control|password|privilege|network|firewall|vulnerability/i.test(questionText);
}

// ── ScoreRing ─────────────────────────────────────────────────────────────────

function ScoreRing({ value, size = 56, stroke = 5 }) {
  const c = scoreColor(value);
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - value / 100)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: size < 50 ? '0.58rem' : size < 65 ? '0.68rem' : '0.82rem', fontWeight: 800, color: c }}>
          {Math.round(value)}%
        </Typography>
      </Box>
    </Box>
  );
}

// ── MiniDonut ─────────────────────────────────────────────────────────────────

function MiniDonut({ score, color, size = 34 }) {
  const r    = (size / 2) - 4;
  const circ = 2 * Math.PI * r;
  return (
    <Box sx={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={3.5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3.5}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: '0.46rem', fontWeight: 800, color, lineHeight: 1 }}>
          {score > 0 ? `${score}%` : '—'}
        </Typography>
      </Box>
    </Box>
  );
}

// ── ControlRow ────────────────────────────────────────────────────────────────

function ControlRow({ question, response, onChange, readOnly, controlIndex, sectionTotal, sectionName }) {
  const [expanded,   setExpanded]   = useState(false);
  const [showSteps,  setShowSteps]  = useState(false);
  const [gapText,    setGapText]    = useState(response?.gap_analysis || '');
  const [owner,      setOwner]      = useState(response?.owner || '');
  const [dueDate,    setDueDate]    = useState(response?.due_date || '');

  const ans      = response?.answer || '';
  const notes    = response?.notes  || '';
  const pos      = isPositive(ans);
  const part     = isPartial(ans);
  const neg      = isNegative(ans);
  const unanswered = !ans;

  const handleAnswer = (val) => {
    if (!readOnly) onChange(question.id, { answer: val, notes, gap_analysis: gapText, owner, due_date: dueDate });
  };
  const handleField = (field, val) => {
    if (!readOnly) onChange(question.id, { answer: ans, notes, gap_analysis: gapText, owner, due_date: dueDate, [field]: val });
  };

  const riskLevel   = getControlRisk(ans, question.text);
  const fwRefs      = getFrameworkRefs(sectionName, question.text);
  const testMethod  = getTestingMethod(question.text);
  const { freq, color: freqColor } = getReviewFrequency(sectionName, question.text);
  const { guidance, steps } = getGuidanceAndSteps(sectionName, question.text);
  const highImpact  = isHighImpact(question.text);

  const accentColor = pos ? '#22c55e' : part ? '#f59e0b' : neg ? '#ef4444' : '#cbd5e1';

  const getChoiceOpts = () => {
    if (question.question_type === 'YESNO')    return ['YES', 'PARTIAL', 'NO', 'N/A'];
    if (question.question_type === 'MATURITY') return ['0', '1', '2', '3'];
    if (question.question_type === 'CHOICE' && question.choices?.length) return question.choices;
    return ['YES', 'PARTIAL', 'NO', 'N/A'];
  };

  const opts      = getChoiceOpts();
  const useSelect = question.question_type === 'CHOICE' && opts.length > 4;

  return (
    <Paper elevation={0} sx={{
      mb: 1.5, borderRadius: 2, overflow: 'hidden',
      border: '1px solid #e5e7eb',
      borderLeft: `4px solid ${accentColor}`,
      transition: 'box-shadow 0.15s',
      '&:hover': { boxShadow: '0 2px 14px rgba(0,0,0,0.07)' },
    }}>
      {/* ── Main row ── */}
      <Box sx={{ px: 2, pt: 1.75, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          {/* Control number */}
          <Box sx={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0, mt: '2px',
            bgcolor: unanswered ? '#f1f5f9' : pos ? '#dcfce7' : part ? '#fef3c7' : '#fee2e2',
            border: `1.5px solid ${accentColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: unanswered ? '#94a3b8' : accentColor, lineHeight: 1 }}>
              {controlIndex ?? '·'}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Question text */}
            <Typography sx={{ fontWeight: 600, fontSize: '0.87rem', lineHeight: 1.55, color: '#111827', mb: 1 }}>
              {question.text}
            </Typography>

            {/* Answer controls + risk badge row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
              {useSelect ? (
                <Select value={ans} size="small" displayEmpty disabled={readOnly}
                  onChange={e => handleAnswer(e.target.value)}
                  sx={{ fontSize: '0.75rem', minWidth: 200 }}>
                  <MenuItem value="" disabled><em>Select…</em></MenuItem>
                  {opts.map(o => <MenuItem key={o} value={o} sx={{ fontSize: '0.75rem' }}>{o}</MenuItem>)}
                </Select>
              ) : (
                <ToggleButtonGroup value={ans} exclusive size="small" disabled={readOnly}
                  onChange={(_, v) => v && handleAnswer(v)}>
                  {opts.map(o => (
                    <ToggleButton key={o} value={o} sx={{
                      fontSize: '0.63rem', px: 1.2, py: 0.3, minWidth: 44,
                      '&.Mui-selected': {
                        bgcolor: ANSWER_COLORS[o] || '#24483E', color: '#fff', fontWeight: 700,
                        '&:hover': { bgcolor: ANSWER_COLORS[o] || '#24483E' },
                      },
                    }}>{o}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}
              {riskLevel && (
                <Chip label={RISK_CFG[riskLevel]?.label || riskLevel} size="small"
                  sx={{
                    bgcolor: RISK_CFG[riskLevel]?.bg, color: RISK_CFG[riskLevel]?.color,
                    fontWeight: 700, fontSize: '0.6rem', height: 20,
                    border: `1px solid ${RISK_CFG[riskLevel]?.color}40`,
                  }} />
              )}
              {highImpact && (
                <Chip label="High Impact" size="small"
                  sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: '0.58rem', height: 20, border: '1px solid #fde68a' }} />
              )}
            </Box>
          </Box>

          {/* Expand toggle */}
          <Tooltip title={expanded ? 'Collapse details' : 'Guidance & remediation'} placement="left" arrow>
            <Box onClick={() => setExpanded(v => !v)} sx={{
              p: 0.5, borderRadius: 1, cursor: 'pointer', flexShrink: 0, mt: '1px',
              color: expanded ? '#24483E' : '#9ca3af',
              bgcolor: expanded ? '#f0fdf4' : 'transparent',
              '&:hover': { bgcolor: '#f1f5f9', color: '#374151' },
              transition: 'all 0.12s',
            }}>
              {expanded ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
            </Box>
          </Tooltip>
        </Box>

        {/* ── Meta badges row ── */}
        <Box sx={{ display: 'flex', gap: 0.6, mt: 1.1, flexWrap: 'wrap', alignItems: 'center', pl: '41px' }}>
          {/* Framework cross-references */}
          {fwRefs.map(ref => {
            const fwKey = ref.id.split('-')[0];
            const fwC   = FW_COLORS[fwKey] || '#374151';
            return (
              <Tooltip key={ref.id} title={ref.tooltip} placement="top" arrow>
                <Chip label={ref.label} size="small" sx={{
                  bgcolor: `${fwC}12`, color: fwC, fontWeight: 700,
                  fontSize: '0.57rem', height: 18, border: `1px solid ${fwC}28`,
                  cursor: 'default',
                }} />
              </Tooltip>
            );
          })}
          {fwRefs.length > 0 && <Box sx={{ width: 1, height: 12, bgcolor: '#e5e7eb', mx: 0.15 }} />}
          {/* Review frequency */}
          <Tooltip title={`Review cycle: ${freq}`} placement="top" arrow>
            <Chip label={freq} size="small" sx={{
              bgcolor: `${freqColor}12`, color: freqColor, fontWeight: 600,
              fontSize: '0.57rem', height: 18, cursor: 'default',
            }} />
          </Tooltip>
          {/* Testing method */}
          <Tooltip title={`Testing approach: ${testMethod}`} placement="top" arrow>
            <Chip label={testMethod} size="small" sx={{
              bgcolor: '#f1f5f9', color: '#475569', fontWeight: 600,
              fontSize: '0.57rem', height: 18, cursor: 'default',
            }} />
          </Tooltip>
          {/* Inline preview of saved fields when collapsed */}
          {owner && !expanded && (
            <Chip label={`Owner: ${owner}`} size="small"
              icon={<Person sx={{ fontSize: '10px !important', ml: '5px !important' }} />}
              sx={{ bgcolor: '#f0fdf4', color: '#166534', fontWeight: 600, fontSize: '0.57rem', height: 18 }} />
          )}
          {gapText && !expanded && (
            <Chip label="Gap documented" size="small"
              sx={{ bgcolor: '#fff7ed', color: '#c2410c', fontWeight: 600, fontSize: '0.57rem', height: 18 }} />
          )}
          {notes && !expanded && (
            <Typography variant="caption" sx={{ fontSize: '0.61rem', color: '#6b7280', fontStyle: 'italic', ml: 0.25 }}>
              · {notes.slice(0, 55)}{notes.length > 55 ? '…' : ''}
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── Expandable detail panel ── */}
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
          <Grid container spacing={1.75}>

            {/* 1. What Good Looks Like */}
            <Grid item xs={12}>
              <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                  <InfoOutlined sx={{ fontSize: 14, color: '#0369a1' }} />
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#0369a1' }}>What Good Looks Like</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.75rem', lineHeight: 1.65, color: '#1e3a5f' }}>{guidance}</Typography>
              </Box>
            </Grid>

            {/* 2. Remediation Action Plan (non-compliant / partial / unanswered) */}
            {(neg || part || unanswered) && (
              <Grid item xs={12}>
                <Box sx={{ borderRadius: 1.5, border: `1px solid ${neg ? '#fed7aa' : '#fde68a'}`, overflow: 'hidden' }}>
                  <Box
                    onClick={() => setShowSteps(v => !v)}
                    sx={{
                      px: 1.5, py: 1.1, display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer',
                      bgcolor: neg ? '#fff7ed' : unanswered ? '#f8fafc' : '#fffbeb',
                      '&:hover': { bgcolor: neg ? '#ffedd5' : unanswered ? '#f1f5f9' : '#fef3c7' },
                    }}>
                    <Build sx={{ fontSize: 14, color: neg ? '#ea580c' : unanswered ? '#64748b' : '#d97706' }} />
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: neg ? '#9a3412' : unanswered ? '#475569' : '#92400e', flex: 1 }}>
                      Remediation Action Plan
                    </Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: '#9ca3af', mr: 0.5 }}>{steps.length} steps</Typography>
                    {showSteps ? <ExpandLess sx={{ fontSize: 15, color: '#9ca3af' }} /> : <ExpandMore sx={{ fontSize: 15, color: '#9ca3af' }} />}
                  </Box>
                  <Collapse in={showSteps}>
                    <Box sx={{ px: 1.75, pb: 1.5, pt: 0.75 }}>
                      {steps.map((step, i) => (
                        <Box key={i} sx={{ display: 'flex', gap: 1, mb: i < steps.length - 1 ? 0.9 : 0, alignItems: 'flex-start' }}>
                          <Box sx={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0, mt: '1px',
                            bgcolor: neg ? '#ea580c' : unanswered ? '#64748b' : '#d97706',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Typography sx={{ fontSize: '0.55rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{i + 1}</Typography>
                          </Box>
                          <Typography sx={{ fontSize: '0.74rem', lineHeight: 1.58, color: '#374151' }}>{step}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Collapse>
                </Box>
              </Grid>
            )}

            {/* 3. Gap Analysis (partial / non-compliant) */}
            {(neg || part) && (
              <Grid item xs={12}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151', mb: 0.5 }}>Gap Analysis</Typography>
                <TextField
                  value={gapText}
                  onChange={e => { setGapText(e.target.value); handleField('gap_analysis', e.target.value); }}
                  placeholder="Describe the specific gap, root cause, and business impact on the organisation…"
                  size="small" fullWidth multiline minRows={2} disabled={readOnly}
                  sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.76rem', bgcolor: '#fff' } }}
                />
              </Grid>
            )}

            {/* 4. Control Owner */}
            <Grid item xs={12} sm={(neg || part) ? 6 : 12}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151', mb: 0.5 }}>Control Owner</Typography>
              <TextField
                value={owner}
                onChange={e => { setOwner(e.target.value); handleField('owner', e.target.value); }}
                placeholder="e.g. CISO, IT Manager, Security Lead…"
                size="small" fullWidth disabled={readOnly}
                InputProps={{ startAdornment: <Person sx={{ fontSize: 15, color: '#9ca3af', mr: 0.75, flexShrink: 0 }} /> }}
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.76rem', bgcolor: '#fff' } }}
              />
            </Grid>

            {/* 5. Remediation Due Date (non-compliant / partial only) */}
            {(neg || part) && (
              <Grid item xs={12} sm={6}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151', mb: 0.5 }}>Remediation Due Date</Typography>
                <TextField
                  type="date" value={dueDate}
                  onChange={e => { setDueDate(e.target.value); handleField('due_date', e.target.value); }}
                  size="small" fullWidth disabled={readOnly}
                  InputProps={{ startAdornment: <CalendarToday sx={{ fontSize: 15, color: '#9ca3af', mr: 0.75, flexShrink: 0 }} /> }}
                  sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.76rem', bgcolor: '#fff' } }}
                />
              </Grid>
            )}

            {/* 6. Assessment Notes */}
            <Grid item xs={12}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151', mb: 0.5 }}>Assessment Notes</Typography>
              <TextField
                value={notes}
                onChange={e => handleField('notes', e.target.value)}
                placeholder="Add assessment notes, auditor observations, test results, or supporting context…"
                size="small" fullWidth multiline minRows={2} disabled={readOnly}
                sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.76rem', bgcolor: '#fff' } }}
              />
            </Grid>

          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
}

// ── EvidenceItem ──────────────────────────────────────────────────────────────

function EvidenceItem({ req, submission, assessmentId, isClient, onUpdate }) {
  const fileRef   = useRef(null);
  const [uploading,  setUploading]  = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [showAI,     setShowAI]     = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [notesDraft, setNotesDraft] = useState(submission?.reviewer_notes || '');

  const sub     = submission;
  const status  = sub?.status || 'not_started';
  const st      = STATUS_CFG[status] || STATUS_CFG.not_started;
  const dt      = DOC_CFG[req.document_type] || DOC_CFG.OTHER;
  const hasFile = !!(sub?.filename || sub?.file);
  const ai      = sub?.ai_result;
  const aiColor = ai
    ? ai.status === 'Compliant'           ? '#22c55e'
    : ai.status === 'Partially Compliant' ? '#f59e0b'
    : '#ef4444'
    : '#94a3b8';

  const borderColor =
    status === 'accepted'    ? '#22c55e' :
    status === 'rejected'    ? '#ef4444' :
    status === 'ai_reviewed' ? '#f59e0b' :
    status === 'submitted'   ? '#3b82f6' :
    status === 'na'          ? '#a855f7' : '#e5e7eb';

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    const fd = new FormData();
    fd.append('requirement', req.id);
    fd.append('file', file);
    try {
      const res = await api.post(`/assessments/list/${assessmentId}/submit_evidence/`, fd);
      onUpdate(res.data);
    } catch {}
    setUploading(false);
  };

  const handleValidate = async () => {
    if (!sub?.id) return;
    setValidating(true);
    try {
      const res = await api.post(`/assessments/list/${assessmentId}/submissions/${sub.id}/ai_validate/`);
      onUpdate(res.data);
      setShowAI(true);
    } catch {}
    setValidating(false);
  };

  const handleDecision = async (newStatus) => {
    if (!sub?.id) return;
    setSaving(true);
    try {
      const res = await api.post(`/assessments/list/${assessmentId}/submissions/${sub.id}/review/`, {
        status: newStatus, reviewer_notes: notesDraft,
      });
      onUpdate(res.data);
      setRejectMode(false);
    } catch {}
    setSaving(false);
  };

  return (
    <Paper elevation={0} sx={{
      mb: 1.5, borderRadius: 2, overflow: 'hidden',
      border: '1px solid #e5e7eb', borderLeft: `4px solid ${borderColor}`,
      '&:hover': { boxShadow: '0 2px 12px rgba(0,0,0,0.07)' },
    }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.5, bgcolor: '#fafafa' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', gap: 0.75, mb: 0.35, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip label={dt.label} size="small"
              sx={{ bgcolor: `${dt.color}15`, color: dt.color, fontWeight: 700, fontSize: '0.58rem', height: 18 }} />
            {req.required && (
              <Chip label="Required" size="small"
                sx={{ bgcolor: '#fef3c7', color: '#d97706', fontWeight: 600, fontSize: '0.58rem', height: 18 }} />
            )}
          </Box>
          <Typography fontWeight={700} sx={{ fontSize: '0.84rem', lineHeight: 1.3, color: '#111827' }}>
            {req.title}
          </Typography>
          {req.description && (
            <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.71rem', display: 'block', mt: 0.25, lineHeight: 1.45 }}>
              {req.description}
            </Typography>
          )}
        </Box>
        <Chip label={st.label} size="small"
          sx={{ bgcolor: st.bg, color: st.color, fontWeight: 700, fontSize: '0.62rem', height: 22, flexShrink: 0 }} />
      </Box>

      <Divider />

      {/* Wrong document type banner — shown prominently before upload */}
      {ai?.is_correct_document === false && (
        <Box sx={{ px: 2, pt: 1.25, pb: 0 }}>
          <Alert severity="error" sx={{ py: 0.5, '& .MuiAlert-message': { fontSize: '0.74rem' } }}
            icon={<Cancel sx={{ fontSize: 16 }} />}>
            <strong>Wrong document type.</strong>{' '}
            {ai.document_type_detected
              ? `You submitted a "${ai.document_type_detected}" but this requirement needs a "${req.title}".`
              : 'The uploaded document does not match this requirement.'}{' '}
            Please upload the correct document below.
          </Alert>
        </Box>
      )}

      {/* Upload */}
      <Box sx={{ px: 2, py: 1.25 }}>
        <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.txt" onChange={handleUpload} />
        {hasFile ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <Article sx={{ fontSize: 16, color: '#16a34a', flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.75rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sub.filename}
              </Typography>
              {sub.submitted_at && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.63rem' }}>
                  Uploaded {new Date(sub.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Typography>
              )}
            </Box>
            <Button size="small" variant="outlined" onClick={() => fileRef.current?.click()} disabled={uploading}
              startIcon={uploading ? <CircularProgress size={10} /> : <UploadFile sx={{ fontSize: 13 }} />}
              sx={{ fontSize: '0.63rem', textTransform: 'none', borderColor: '#d1d5db', color: '#374151' }}>
              {uploading ? '...' : 'Replace'}
            </Button>
          </Box>
        ) : (
          <Box onClick={() => !uploading && fileRef.current?.click()} sx={{
            px: 2, py: 1.75, border: '2px dashed #d1d5db', borderRadius: 2,
            textAlign: 'center', cursor: 'pointer', bgcolor: '#f9fafb',
            transition: 'all 0.15s',
            '&:hover': { borderColor: '#24483E', bgcolor: '#f0fdf4' },
          }}>
            {uploading
              ? <CircularProgress size={20} sx={{ color: '#24483E', mb: 0.5 }} />
              : <UploadFile sx={{ fontSize: 24, color: '#9ca3af', mb: 0.25 }} />
            }
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: uploading ? '#24483E' : '#4b5563', fontSize: '0.75rem' }}>
              {uploading ? 'Uploading...' : `Upload ${req.title}`}
            </Typography>
            {!uploading && <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.63rem' }}>PDF, DOCX or TXT</Typography>}
          </Box>
        )}
      </Box>

      {/* AI result */}
      {ai && (
        <Box sx={{ px: 2, pb: 1.25 }}>
          <Box onClick={() => setShowAI(v => !v)}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', userSelect: 'none' }}>
            <Box sx={{ width: 36, height: 36, position: 'relative', flexShrink: 0 }}>
              <svg width={36} height={36} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={18} cy={18} r={14} fill="none" stroke="#e5e7eb" strokeWidth={4} />
                <circle cx={18} cy={18} r={14} fill="none" stroke={aiColor} strokeWidth={4}
                  strokeDasharray={2 * Math.PI * 14}
                  strokeDashoffset={2 * Math.PI * 14 * (1 - (ai.coverage_score || 0) / 100)}
                  strokeLinecap="round" />
              </svg>
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ fontSize: '0.55rem', fontWeight: 800, color: aiColor }}>{ai.coverage_score || 0}%</Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Chip label={ai.status || '—'} size="small"
                sx={{ bgcolor: `${aiColor}18`, color: aiColor, fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', display: 'block' }}>
                AI Coverage Analysis
              </Typography>
            </Box>
            {showAI ? <ExpandLess sx={{ fontSize: 16, color: '#9ca3af' }} /> : <ExpandMore sx={{ fontSize: 16, color: '#9ca3af' }} />}
          </Box>
          <Collapse in={showAI}>
            <Box sx={{ mt: 1, pl: 0.5 }}>
              {ai.summary && (
                <Typography variant="caption" sx={{ display: 'block', mb: 0.75, lineHeight: 1.5, color: '#374151', fontSize: '0.71rem' }}>
                  {ai.summary}
                </Typography>
              )}
              {ai.gaps?.length > 0 && (
                <Box sx={{ mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#ef4444', fontSize: '0.62rem', display: 'block', mb: 0.25 }}>Gaps identified</Typography>
                  {ai.gaps.map((g, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 0.5, mb: 0.2, alignItems: 'flex-start' }}>
                      <Cancel sx={{ fontSize: 10, color: '#ef4444', mt: '3px', flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', lineHeight: 1.4 }}>{g}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {ai.strengths?.length > 0 && (
                <Box sx={{ mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#22c55e', fontSize: '0.62rem', display: 'block', mb: 0.25 }}>Confirmed coverage</Typography>
                  {ai.strengths.map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 0.5, mb: 0.2, alignItems: 'flex-start' }}>
                      <CheckCircle sx={{ fontSize: 10, color: '#22c55e', mt: '3px', flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', lineHeight: 1.4 }}>{s}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {ai.recommendation && (
                <Box sx={{ p: 0.75, bgcolor: '#f8fafc', borderRadius: 1, borderLeft: `3px solid ${aiColor}`, mt: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.68rem', lineHeight: 1.4 }}>
                    <strong>Recommendation:</strong> {ai.recommendation}
                  </Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Reviewer note display */}
      {sub?.reviewer_notes && (
        <Box sx={{ mx: 2, mb: 1.25, p: 1, borderRadius: 1.5,
          bgcolor: status === 'accepted' ? '#f0fdf4' : status === 'rejected' ? '#fef2f2' : '#faf5ff',
          border: `1px solid ${borderColor}30` }}>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
            <Gavel sx={{ fontSize: 13, color: st.color, mt: '2px', flexShrink: 0 }} />
            <Box>
              <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.61rem', color: st.color, display: 'block' }}>
                Auditor {status === 'accepted' ? 'approval' : status === 'rejected' ? 'feedback' : 'note'}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1.45 }}>{sub.reviewer_notes}</Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Auditor action bar */}
      {!isClient && hasFile && (
        <Box sx={{ px: 2, pb: 1.25, pt: 1, borderTop: '1px solid #f3f4f6', bgcolor: '#fafafa' }}>
          {rejectMode ? (
            <Box>
              <TextField
                value={notesDraft} onChange={e => setNotesDraft(e.target.value)}
                placeholder="Rejection reason / feedback for client…"
                size="small" fullWidth multiline rows={2}
                sx={{ mb: 0.75, '& .MuiOutlinedInput-root': { fontSize: '0.76rem' } }}
              />
              <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => setRejectMode(false)}
                  sx={{ fontSize: '0.63rem', textTransform: 'none', color: '#374151' }}>Cancel</Button>
                <Button size="small" variant="contained" onClick={() => handleDecision('rejected')} disabled={saving}
                  sx={{ fontSize: '0.63rem', textTransform: 'none', bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}>
                  {saving ? '...' : 'Confirm Reject'}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" onClick={handleValidate} disabled={validating}
                startIcon={validating ? <CircularProgress size={10} /> : <AutoAwesome sx={{ fontSize: 13 }} />}
                sx={{ fontSize: '0.63rem', textTransform: 'none', color: '#d97706', borderColor: '#fde68a', py: 0.3 }}>
                {validating ? 'Validating…' : ai ? 'Re-validate' : 'AI Validate'}
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button size="small" variant="outlined" onClick={() => handleDecision('na')} disabled={saving}
                sx={{ fontSize: '0.63rem', textTransform: 'none', color: '#a855f7', borderColor: '#e9d5ff', py: 0.3 }}>N/A</Button>
              <Button size="small" variant="outlined" onClick={() => setRejectMode(true)} disabled={saving}
                sx={{ fontSize: '0.63rem', textTransform: 'none', color: '#ef4444', borderColor: '#fecaca', py: 0.3 }}>Reject</Button>
              <Button size="small" variant="contained" onClick={() => handleDecision('accepted')} disabled={saving}
                sx={{ fontSize: '0.63rem', textTransform: 'none', bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' }, py: 0.3 }}>
                {saving ? '…' : 'Accept'}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}

// ── Main GRCAssessmentView ────────────────────────────────────────────────────

export default function GRCAssessmentView({
  assessment, template, responses, onChange, isClient,
  onEvidenceAdd, onEvidenceDelete, onExport, exporting,
}) {
  const [activeTab,       setActiveTab]       = useState(0);
  const [activeSection,   setActiveSection]   = useState(null);
  const [submissions,     setSubmissions]     = useState([]);
  const [subsLoading,     setSubsLoading]     = useState(false);
  const [generating,      setGenerating]      = useState({}); // sectionId → bool
  const [templateState,   setTemplateState]   = useState(template);
  const [evidenceFilter,  setEvidenceFilter]  = useState('all');
  const [riskFilter,      setRiskFilter]      = useState('all');

  // Keep templateState in sync when parent re-renders
  useEffect(() => { setTemplateState(template); }, [template]);

  useEffect(() => {
    if (templateState?.sections?.length && !activeSection) {
      setActiveSection(templateState.sections[0]);
    }
  }, [templateState, activeSection]);

  const fetchSubmissions = useCallback(async () => {
    setSubsLoading(true);
    try {
      const res = await api.get(`/assessments/list/${assessment.id}/submissions/`);
      setSubmissions(res.data || []);
    } catch {}
    setSubsLoading(false);
  }, [assessment.id]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const handleSubmissionUpdate = useCallback((updated) => {
    setSubmissions(prev => {
      const idx = prev.findIndex(s => s.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  }, []);

  const handleGenerateRequirements = async (section) => {
    setGenerating(prev => ({ ...prev, [section.id]: true }));
    try {
      await api.post(`/assessments/templates/${assessment.template}/sections/${section.id}/suggest_requirements/`);
      const res = await api.get(`/assessments/templates/${assessment.template}/`);
      setTemplateState(res.data);
    } catch {}
    setGenerating(prev => ({ ...prev, [section.id]: false }));
  };

  // ── Computed stats ──────────────────────────────────────────────────────────

  const sectionStats = useMemo(() => {
    if (!templateState) return [];
    return templateState.sections.map(section => {
      const questions = section.questions || [];
      let answered = 0, compliant = 0, partial = 0, nonCompliant = 0;
      questions.forEach(q => {
        const ans = responses[q.id]?.answer;
        if (ans) {
          answered++;
          if (isPositive(ans)) compliant++;
          else if (isPartial(ans)) partial++;
          else if (isNegative(ans)) nonCompliant++;
        }
      });
      const total = questions.length;
      const pct   = total ? Math.round(answered / total * 100) : 0;
      const score = total ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0;
      const reqs  = section.evidence_requirements || [];
      return { section, total, answered, compliant, partial, nonCompliant, pct, score, reqs };
    });
  }, [templateState, responses]);

  const overallStats = useMemo(() => {
    const total       = sectionStats.reduce((s, r) => s + r.total, 0);
    const answered    = sectionStats.reduce((s, r) => s + r.answered, 0);
    const compliant   = sectionStats.reduce((s, r) => s + r.compliant, 0);
    const partial     = sectionStats.reduce((s, r) => s + r.partial, 0);
    const nonCompliant= sectionStats.reduce((s, r) => s + r.nonCompliant, 0);
    const score = total ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0;
    const pct   = total ? Math.round(answered / total * 100) : 0;
    return { total, answered, compliant, partial, nonCompliant, score, pct };
  }, [sectionStats]);

  const risks = useMemo(() => {
    if (!templateState) return [];
    const items = [];
    templateState.sections.forEach(section => {
      (section.questions || []).forEach(q => {
        const ans = responses[q.id]?.answer || '';
        if (isNegative(ans)) {
          items.push({ section: section.name, question: q, answer: ans, severity: 'CRITICAL', reason: `Explicitly non-compliant (${ans})` });
        } else if (isPartial(ans)) {
          items.push({ section: section.name, question: q, answer: ans, severity: 'MEDIUM', reason: `Partially met (${ans})` });
        } else if (!ans) {
          items.push({ section: section.name, question: q, answer: '', severity: 'HIGH', reason: 'Not yet assessed — unknown status' });
        }
      });
    });
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return items.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [templateState, responses]);

  const riskCounts = useMemo(() => ({
    CRITICAL: risks.filter(r => r.severity === 'CRITICAL').length,
    HIGH:     risks.filter(r => r.severity === 'HIGH').length,
    MEDIUM:   risks.filter(r => r.severity === 'MEDIUM').length,
    LOW:      risks.filter(r => r.severity === 'LOW').length,
  }), [risks]);

  const allReqs  = useMemo(() => sectionStats.flatMap(s => s.reqs), [sectionStats]);
  const totalReqs = allReqs.length;
  const acceptedCount = submissions.filter(s => s.status === 'accepted').length;
  const submittedCount= submissions.filter(s => ['submitted','ai_reviewed'].includes(s.status)).length;
  const pendingEvidence = totalReqs - acceptedCount;

  // Evidence tab: group by section with filter
  const evidenceGroups = useMemo(() => {
    return sectionStats.map(({ section, reqs }) => {
      let pairs = reqs.map(req => ({
        req,
        sub: submissions.find(s => s.requirement === req.id) || null,
      }));
      if (evidenceFilter !== 'all') {
        pairs = pairs.filter(({ sub }) => {
          const st = sub?.status || 'not_started';
          if (evidenceFilter === 'needs_action') return ['submitted', 'ai_reviewed'].includes(st);
          return st === evidenceFilter;
        });
      }
      return { section, pairs };
    }).filter(g => g.pairs.length > 0 || evidenceFilter === 'all');
  }, [sectionStats, submissions, evidenceFilter]);

  // ── Tab header ──────────────────────────────────────────────────────────────

  const tabDefs = [
    { label: 'Overview',       icon: <Dashboard sx={{ fontSize: 18 }} />, badge: null },
    { label: 'Controls',       icon: <Assignment sx={{ fontSize: 18 }} />, badge: overallStats.total - overallStats.answered || null },
    { label: 'Evidence',       icon: <CloudUpload sx={{ fontSize: 18 }} />, badge: pendingEvidence || null },
    { label: 'Risk Register',  icon: <Warning sx={{ fontSize: 18 }} />, badge: riskCounts.CRITICAL + riskCounts.HIGH || null },
    { label: 'Report',         icon: <Description sx={{ fontSize: 18 }} />, badge: null },
  ];

  // ── Overview Tab ────────────────────────────────────────────────────────────

  const renderOverview = () => (
    <Box>
      {/* Hero stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm="auto">
          <Paper sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, minWidth: 200 }}>
            <ScoreRing value={overallStats.score} size={80} stroke={7} />
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Overall Score</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.25 }}>
                {overallStats.answered}/{overallStats.total} controls answered
              </Typography>
              <LinearProgress
                variant="determinate" value={overallStats.pct}
                sx={{ mt: 0.75, height: 5, borderRadius: 3,
                  bgcolor: '#e5e7eb',
                  '& .MuiLinearProgress-bar': { bgcolor: scoreColor(overallStats.pct) } }}
              />
            </Box>
          </Paper>
        </Grid>
        {[
          { label: 'Compliant',     value: overallStats.compliant,    color: '#22c55e', icon: <CheckCircleOutline sx={{ fontSize: 20 }} /> },
          { label: 'Partial',       value: overallStats.partial,       color: '#f59e0b', icon: <RemoveCircleOutline sx={{ fontSize: 20 }} /> },
          { label: 'Non-Compliant', value: overallStats.nonCompliant,  color: '#ef4444', icon: <Cancel sx={{ fontSize: 20 }} /> },
          { label: 'Evidence OK',   value: acceptedCount,              color: '#3b82f6', icon: <CloudUpload sx={{ fontSize: 20 }} /> },
          { label: 'Open Risks',    value: riskCounts.CRITICAL + riskCounts.HIGH, color: '#dc2626', icon: <ReportProblem sx={{ fontSize: 20 }} /> },
        ].map(({ label, value, color, icon }) => (
          <Grid item xs key={label}>
            <Paper sx={{ p: 2, height: '100%', minWidth: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, color }}>
                {icon}
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Domain health grid */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: '#111827' }}>
        Domain Health
      </Typography>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {sectionStats.map(({ section, total, answered, compliant, partial, nonCompliant, score, reqs }) => {
          const unanswered = total - answered;
          const secSubs = submissions.filter(s => reqs.some(r => r.id === s.requirement));
          const evAccepted = secSubs.filter(s => s.status === 'accepted').length;
          const evTotal = reqs.length;
          const c = scoreColor(score);
          // Stacked compliance bar widths
          const cW = total ? (compliant / total) * 100 : 0;
          const pW = total ? (partial / total) * 100 : 0;
          const nW = total ? (nonCompliant / total) * 100 : 0;
          return (
            <Grid item xs={12} sm={6} md={4} key={section.id}>
              <Paper
                onClick={() => { setActiveSection(section); setActiveTab(1); }}
                elevation={0}
                sx={{ p: 2, cursor: 'pointer',
                  border: '1px solid #e5e7eb', borderRadius: 2,
                  '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderColor: '#cbd5e1' },
                  transition: 'all 0.15s', height: '100%' }}>
                {/* Header row */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.25 }}>
                  <ScoreRing value={score} size={46} stroke={4} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} sx={{ fontSize: '0.83rem', lineHeight: 1.3, color: '#111827', mb: 0.2 }}>
                      {section.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.67rem' }}>
                      {answered} of {total} controls answered
                    </Typography>
                  </Box>
                </Box>
                {/* Stacked compliance bar */}
                <Box sx={{ height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex', mb: 1, bgcolor: '#f1f5f9' }}>
                  <Box sx={{ width: `${cW}%`, bgcolor: '#22c55e', transition: 'width 0.5s' }} />
                  <Box sx={{ width: `${pW}%`, bgcolor: '#f59e0b', transition: 'width 0.5s' }} />
                  <Box sx={{ width: `${nW}%`, bgcolor: '#ef4444', transition: 'width 0.5s' }} />
                </Box>
                {/* Counts row */}
                <Box sx={{ display: 'flex', gap: 1.25, mb: evTotal > 0 ? 1 : 0 }}>
                  {[
                    { val: compliant,    label: 'compliant',     color: '#16a34a' },
                    { val: partial,      label: 'partial',       color: '#d97706' },
                    { val: nonCompliant, label: 'non-compliant', color: '#dc2626' },
                    { val: unanswered,   label: 'unanswered',    color: '#94a3b8' },
                  ].filter(x => x.val > 0).map(({ val, label, color }) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#6b7280' }}>
                        <strong style={{ color }}>{val}</strong> {label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                {/* Evidence progress */}
                {evTotal > 0 && (
                  <Box sx={{ pt: 0.75, borderTop: '1px solid #f1f5f9' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                      <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#6b7280' }}>Evidence</Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.63rem', fontWeight: 700, color: evAccepted === evTotal ? '#22c55e' : '#3b82f6' }}>
                        {evAccepted}/{evTotal} accepted
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={evTotal ? (evAccepted / evTotal) * 100 : 0}
                      sx={{ height: 4, borderRadius: 2, bgcolor: '#e5e7eb',
                        '& .MuiLinearProgress-bar': { bgcolor: evAccepted === evTotal ? '#22c55e' : '#3b82f6' } }} />
                  </Box>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Key gaps */}
      {risks.filter(r => r.severity === 'CRITICAL').length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <ReportProblem sx={{ color: '#dc2626', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={700} color="#111827">Critical Gaps</Typography>
            <Chip label={riskCounts.CRITICAL} size="small"
              sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 700, height: 20, fontSize: '0.65rem' }} />
          </Box>
          <Paper elevation={0} sx={{ border: '1px solid #fecaca', borderRadius: 2, overflow: 'hidden' }}>
            {risks.filter(r => r.severity === 'CRITICAL').slice(0, 5).map((risk, i) => (
              <Box key={i} sx={{
                px: 2, py: 1.25, display: 'flex', alignItems: 'flex-start', gap: 1.5,
                borderBottom: i < Math.min(riskCounts.CRITICAL, 5) - 1 ? '1px solid #fee2e2' : 'none',
                bgcolor: i % 2 === 0 ? '#fff' : '#fef9f9',
              }}>
                <Chip label="Critical" size="small"
                  sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.58rem', height: 18, flexShrink: 0, mt: '1px' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#374151', fontSize: '0.72rem', display: 'block' }}>
                    {risk.section}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.69rem', lineHeight: 1.4 }}>
                    {risk.question.text.length > 120 ? risk.question.text.slice(0, 120) + '…' : risk.question.text}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Paper>
          {riskCounts.CRITICAL > 5 && (
            <Button size="small" onClick={() => setActiveTab(3)} sx={{ mt: 1, fontSize: '0.72rem', textTransform: 'none', color: '#24483E' }}>
              View all {riskCounts.CRITICAL} critical gaps in Risk Register →
            </Button>
          )}
        </Box>
      )}
    </Box>
  );

  // ── Controls Tab ────────────────────────────────────────────────────────────

  const renderControls = () => {
    const activeStat = sectionStats.find(s => s.section.id === activeSection?.id);
    return (
      <Grid container spacing={2.5} sx={{ mt: 0 }}>
        {/* ── Compliance heatmap navigator ── */}
        <Grid item xs={12} md={4}>
          <Box sx={{
            position: 'sticky', top: 16,
            maxHeight: 'calc(100vh - 160px)',
            display: 'flex', flexDirection: 'column',
            borderRadius: 2, overflow: 'hidden',
            border: '1px solid #e2e8f0',
            bgcolor: '#fff',
          }}>
            {/* Header */}
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827' }}>
                  {templateState?.framework_display || templateState?.framework}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.63rem' }}>
                  {templateState?.sections?.length} domains · {overallStats.total} controls
                </Typography>
              </Box>
              {/* Pixel legend */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {[['#22c55e','Yes'],['#f59e0b','Partial'],['#ef4444','No'],['#e2e8f0','—']].map(([c,l]) => (
                  <Tooltip key={l} title={l} placement="top">
                    <Box sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: c, cursor: 'default' }} />
                  </Tooltip>
                ))}
              </Box>
            </Box>

            {/* Heatmap rows */}
            <Box sx={{ overflowY: 'auto', flex: 1,
              scrollbarWidth: 'thin', '&::-webkit-scrollbar': { width: 3 },
              '&::-webkit-scrollbar-thumb': { bgcolor: '#e2e8f0', borderRadius: 2 } }}>
              {sectionStats.map(({ section, total, answered, compliant, partial: part, nonCompliant, score }, idx) => {
                const isActive = activeSection?.id === section.id;
                const questions = section.questions || [];
                const pctAnswered = total ? Math.round(answered / total * 100) : 0;

                // Determine health colour for the score text
                const healthColor = nonCompliant > 0 ? '#ef4444'
                  : part > 0          ? '#f59e0b'
                  : answered === total && total > 0 ? '#22c55e'
                  : '#94a3b8';

                return (
                  <Box
                    key={section.id}
                    onClick={() => setActiveSection(section)}
                    sx={{
                      px: 2, pt: 1.5, pb: 1.25,
                      cursor: 'pointer',
                      borderBottom: `1px solid ${isActive ? '#24483E20' : '#f8fafc'}`,
                      borderLeft: `3px solid ${isActive ? '#24483E' : 'transparent'}`,
                      bgcolor: isActive ? '#f0fdf4' : 'transparent',
                      transition: 'all 0.13s',
                      '&:hover': { bgcolor: isActive ? '#e7faf0' : '#fafffe', borderLeftColor: isActive ? '#24483E' : '#d1fae5' },
                    }}
                  >
                    {/* Row header */}
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.9 }}>
                      <Typography sx={{
                        fontSize: '0.79rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#14532d' : '#1e293b',
                        lineHeight: 1.2,
                        flex: 1, mr: 1,
                      }}>
                        {section.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                        {nonCompliant > 0 && (
                          <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#ef4444' }}>
                            {nonCompliant}✗
                          </Typography>
                        )}
                        {part > 0 && (
                          <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#d97706' }}>
                            {part}~
                          </Typography>
                        )}
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: healthColor }}>
                          {answered === 0 ? '—' : `${score}%`}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Per-question pixel grid — the actual heatmap */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '3px', mb: 0.85 }}>
                      {questions.map(q => {
                        const ans = responses[q.id]?.answer || '';
                        const pixelColor = isPositive(ans) ? '#22c55e'
                          : isPartial(ans)  ? '#f59e0b'
                          : isNegative(ans) ? '#ef4444'
                          : '#e2e8f0';
                        return (
                          <Tooltip
                            key={q.id}
                            title={
                              <Box>
                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, mb: 0.25 }}>{q.text?.slice(0, 80)}{q.text?.length > 80 ? '…' : ''}</Typography>
                                <Typography sx={{ fontSize: '0.65rem', color: pixelColor === '#e2e8f0' ? '#aaa' : pixelColor }}>
                                  {ans || 'Not answered'}
                                </Typography>
                              </Box>
                            }
                            placement="top"
                            arrow
                          >
                            <Box sx={{
                              width: 10, height: 10,
                              borderRadius: '2px',
                              bgcolor: pixelColor,
                              transition: 'transform 0.1s, opacity 0.1s',
                              '&:hover': { transform: 'scale(1.5)', opacity: 0.9, zIndex: 10, position: 'relative' },
                            }} />
                          </Tooltip>
                        );
                      })}
                    </Box>

                    {/* Micro progress bar */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1, height: 3, borderRadius: 2, bgcolor: '#f1f5f9', overflow: 'hidden', display: 'flex' }}>
                        <Box sx={{ width: `${total ? (compliant/total)*100 : 0}%`, bgcolor: '#22c55e' }} />
                        <Box sx={{ width: `${total ? (part/total)*100 : 0}%`, bgcolor: '#f59e0b' }} />
                        <Box sx={{ width: `${total ? (nonCompliant/total)*100 : 0}%`, bgcolor: '#ef4444' }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.58rem', color: '#9ca3af', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {answered}/{total}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Grid>

        {/* Questions panel */}
        <Grid item xs={12} md={8}>
          {activeSection ? (
            <Box>
              {/* Section header */}
              <Box sx={{ mb: 2, pb: 2, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                {activeStat && <ScoreRing value={activeStat.score} size={58} stroke={5} />}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem', color: '#111827', mb: 0.2 }}>
                    {activeSection.name}
                  </Typography>
                  {activeSection.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.5, mb: 0.75 }}>
                      {activeSection.description}
                    </Typography>
                  )}
                  {activeStat && (
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Stacked progress bar */}
                      <Box sx={{ flex: 1, minWidth: 120 }}>
                        <Box sx={{ height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex', bgcolor: '#f1f5f9' }}>
                          <Box sx={{ width: `${activeStat.total ? (activeStat.compliant/activeStat.total)*100 : 0}%`, bgcolor: '#22c55e' }} />
                          <Box sx={{ width: `${activeStat.total ? (activeStat.partial/activeStat.total)*100 : 0}%`, bgcolor: '#f59e0b' }} />
                          <Box sx={{ width: `${activeStat.total ? (activeStat.nonCompliant/activeStat.total)*100 : 0}%`, bgcolor: '#ef4444' }} />
                        </Box>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        {activeStat.answered}/{activeStat.total} answered
                      </Typography>
                      {[
                        { val: activeStat.compliant,    label: 'compliant',     color: '#16a34a', bg: '#dcfce7' },
                        { val: activeStat.partial,       label: 'partial',       color: '#d97706', bg: '#fef3c7' },
                        { val: activeStat.nonCompliant,  label: 'non-compliant', color: '#dc2626', bg: '#fee2e2' },
                      ].filter(x => x.val > 0).map(({ val, label, color, bg }) => (
                        <Chip key={label} size="small" label={`${val} ${label}`}
                          sx={{ bgcolor: bg, color, fontWeight: 700, fontSize: '0.62rem', height: 20 }} />
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>

              {(activeSection.questions || []).map((q, idx) => (
                <ControlRow
                  key={q.id}
                  question={q}
                  response={responses[q.id]}
                  onChange={onChange}
                  readOnly={isClient}
                  controlIndex={idx + 1}
                  sectionTotal={(activeSection.questions || []).length}
                  sectionName={activeSection.name}
                />
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
              <Box sx={{ textAlign: 'center', color: '#94a3b8' }}>
                <Security sx={{ fontSize: 52, mb: 1.5 }} />
                <Typography fontWeight={600} sx={{ color: '#64748b' }}>Select a domain from the sidebar</Typography>
                <Typography variant="caption" color="text.secondary">to view and answer its controls</Typography>
              </Box>
            </Box>
          )}
        </Grid>
      </Grid>
    );
  };

  // ── Evidence Tab ────────────────────────────────────────────────────────────

  const renderEvidence = () => {
    const filterOpts = [
      { key: 'all',         label: 'All',          count: totalReqs },
      { key: 'not_started', label: 'Not Started',  count: totalReqs - submissions.length },
      { key: 'submitted',   label: 'Pending',       count: submissions.filter(s => s.status === 'submitted').length },
      { key: 'needs_action',label: 'Needs Action', count: submissions.filter(s => ['submitted','ai_reviewed'].includes(s.status)).length },
      { key: 'accepted',    label: 'Accepted',      count: acceptedCount },
      { key: 'rejected',    label: 'Rejected',      count: submissions.filter(s => s.status === 'rejected').length },
    ];

    return (
      <Box>
        {/* Evidence stats */}
        <Paper sx={{ p: 2, mb: 2.5, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 52, height: 52, position: 'relative' }}>
              <svg width={52} height={52} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={26} cy={26} r={22} fill="none" stroke="#e5e7eb" strokeWidth={5} />
                <circle cx={26} cy={26} r={22} fill="none" stroke="#3b82f6" strokeWidth={5}
                  strokeDasharray={2 * Math.PI * 22}
                  strokeDashoffset={2 * Math.PI * 22 * (1 - (totalReqs ? acceptedCount / totalReqs : 0))}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s' }} />
              </svg>
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: '#3b82f6' }}>
                  {totalReqs ? Math.round(acceptedCount / totalReqs * 100) : 0}%
                </Typography>
              </Box>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6' }}>{acceptedCount}/{totalReqs}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Evidence Accepted</Typography>
            </Box>
          </Box>
          <Divider orientation="vertical" flexItem />
          {[
            { label: 'Pending Review', value: submittedCount, color: '#f59e0b' },
            { label: 'Rejected', value: submissions.filter(s => s.status === 'rejected').length, color: '#ef4444' },
            { label: 'Not Started', value: totalReqs - submissions.length, color: '#94a3b8' },
          ].map(({ label, value, color }) => (
            <Box key={label}>
              <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Box>
          ))}
          <Box sx={{ ml: 'auto' }}>
            <Button size="small" startIcon={<Refresh />} onClick={fetchSubmissions} disabled={subsLoading}
              sx={{ textTransform: 'none', color: '#6b7280', fontSize: '0.72rem' }}>
              Refresh
            </Button>
          </Box>
        </Paper>

        {/* Filter chips */}
        <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterList sx={{ fontSize: 16, color: '#6b7280' }} />
          {filterOpts.map(({ key, label, count }) => (
            <Chip
              key={key}
              label={`${label}${count > 0 ? ` (${count})` : ''}`}
              size="small"
              onClick={() => setEvidenceFilter(key)}
              sx={{
                cursor: 'pointer', fontWeight: evidenceFilter === key ? 700 : 500,
                bgcolor: evidenceFilter === key ? '#24483E' : '#f3f4f6',
                color: evidenceFilter === key ? '#fff' : '#374151',
                fontSize: '0.7rem', height: 24,
                '&:hover': { bgcolor: evidenceFilter === key ? '#1a3228' : '#e5e7eb' },
              }}
            />
          ))}
        </Box>

        {subsLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

        {/* Section groups */}
        {evidenceGroups.map(({ section, pairs }) => {
          const hasReqs = (section.evidence_requirements || []).length > 0;
          // When filtering by status, skip sections with no matching items (but keep empty sections in 'all' view for Generate button)
          if (pairs.length === 0 && (hasReqs || evidenceFilter !== 'all')) return null;
          return (
            <Box key={section.id} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Box sx={{ width: 3, height: 18, bgcolor: '#24483E', borderRadius: 2 }} />
                <Typography fontWeight={700} sx={{ fontSize: '0.9rem', color: '#111827' }}>{section.name}</Typography>
                {pairs.length > 0 && (
                  <Chip size="small" label={`${pairs.filter(p => p.sub?.status === 'accepted').length}/${pairs.length} accepted`}
                    sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: '0.63rem', height: 20, ml: 0.5 }} />
                )}
                {!hasReqs && !isClient && (
                  <Button size="small" variant="outlined" onClick={() => handleGenerateRequirements(section)}
                    disabled={generating[section.id]}
                    startIcon={generating[section.id] ? <CircularProgress size={10} /> : <AutoAwesome sx={{ fontSize: 13 }} />}
                    sx={{ ml: 'auto', fontSize: '0.65rem', textTransform: 'none', color: '#24483E', borderColor: '#24483E', py: 0.3 }}>
                    {generating[section.id] ? 'Generating…' : 'Generate Requirements'}
                  </Button>
                )}
              </Box>
              {!hasReqs && !generating[section.id] && (
                <Alert severity="info" sx={{ mb: 1.5, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                  No evidence requirements defined for this section yet.
                  {!isClient && ' Click "Generate Requirements" to have AI determine what evidence is needed.'}
                </Alert>
              )}
              {pairs.map(({ req, sub }) => (
                <EvidenceItem
                  key={req.id}
                  req={req}
                  submission={sub}
                  assessmentId={assessment.id}
                  isClient={isClient}
                  onUpdate={handleSubmissionUpdate}
                />
              ))}
            </Box>
          );
        })}

        {evidenceGroups.every(g => g.pairs.length === 0) && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CloudUpload sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
            <Typography color="text.secondary">No evidence matches this filter</Typography>
          </Paper>
        )}
      </Box>
    );
  };

  // ── Risk Register Tab ───────────────────────────────────────────────────────

  const renderRisk = () => {
    const filtered = riskFilter === 'all' ? risks : risks.filter(r => r.severity === riskFilter);

    return (
      <Box>
        {/* Risk summary */}
        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          {Object.entries(RISK_CFG).map(([key, { color, bg, label }]) => (
            <Grid item xs={6} sm={3} key={key}>
              <Paper onClick={() => setRiskFilter(riskFilter === key ? 'all' : key)}
                sx={{ p: 1.75, cursor: 'pointer', border: `2px solid ${riskFilter === key ? color : 'transparent'}`,
                  bgcolor: riskFilter === key ? bg : '#fff',
                  '&:hover': { bgcolor: bg }, transition: 'all 0.15s' }}>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1, mb: 0.25 }}>
                  {riskCounts[key] || 0}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                  <Typography variant="caption" fontWeight={600} color="text.secondary">{label}</Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {filtered.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 48, color: '#22c55e', mb: 1 }} />
            <Typography color="text.secondary">
              {riskFilter === 'all' ? 'No risks identified — all controls answered and compliant.' : `No ${RISK_CFG[riskFilter]?.label} risks.`}
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f9fafb' }}>
                  {['Severity', 'Domain', 'Control', 'Status', 'Risk'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#374151', py: 1.25 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((risk, i) => {
                  const rc = RISK_CFG[risk.severity];
                  return (
                    <TableRow key={i} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                      <TableCell sx={{ py: 1 }}>
                        <Chip label={rc.label} size="small"
                          sx={{ bgcolor: rc.bg, color: rc.color, fontWeight: 700, fontSize: '0.62rem', height: 20 }} />
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.73rem', color: '#374151' }}>
                          {risk.section}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, maxWidth: 350 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.72rem', lineHeight: 1.4, color: '#4b5563' }}>
                          {risk.question.text.length > 100 ? risk.question.text.slice(0, 100) + '…' : risk.question.text}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        {risk.answer ? (
                          <Chip label={risk.answer} size="small"
                            sx={{ bgcolor: `${ANSWER_COLORS[risk.answer] || '#94a3b8'}20`,
                              color: ANSWER_COLORS[risk.answer] || '#94a3b8',
                              fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
                        ) : (
                          <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.7rem' }}>Not assessed</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.69rem', color: '#6b7280' }}>{risk.reason}</Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  // ── Report Tab ──────────────────────────────────────────────────────────────

  const renderReport = () => (
    <Box>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#111827' }}>Assessment Summary</Typography>
            <Grid container spacing={2}>
              {[
                { label: 'Overall Score', value: `${overallStats.score}%`, color: scoreColor(overallStats.score) },
                { label: 'Controls Answered', value: `${overallStats.answered}/${overallStats.total}`, color: '#24483E' },
                { label: 'Compliant Controls', value: overallStats.compliant, color: '#22c55e' },
                { label: 'Evidence Accepted', value: `${acceptedCount}/${totalReqs}`, color: '#3b82f6' },
                { label: 'Critical Risks', value: riskCounts.CRITICAL, color: '#dc2626' },
                { label: 'High Risks', value: riskCounts.HIGH, color: '#ea580c' },
              ].map(({ label, value, color }) => (
                <Grid item xs={6} sm={4} key={label}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}08`, borderLeft: `3px solid ${color}` }}>
                    <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: '#111827' }}>Domain Breakdown</Typography>
            {sectionStats.map(({ section, score, compliant, partial, nonCompliant, total }) => (
              <Box key={section.id} sx={{ mb: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: '#f9fafb', border: '1px solid #f3f4f6' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.78rem', flex: 1, color: '#111827' }}>
                    {section.name}
                  </Typography>
                  <Typography variant="caption" fontWeight={800} sx={{ color: scoreColor(score), fontSize: '0.78rem' }}>
                    {score}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={score}
                  sx={{ height: 6, borderRadius: 3, bgcolor: '#e5e7eb',
                    '& .MuiLinearProgress-bar': { bgcolor: scoreColor(score) } }} />
                <Box sx={{ display: 'flex', gap: 1, mt: 0.75 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#22c55e' }}>{compliant} compliant</Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#f59e0b' }}>{partial} partial</Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#ef4444' }}>{nonCompliant} non-compliant</Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#94a3b8' }}>{total - compliant - partial - nonCompliant} unanswered</Typography>
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: '#111827' }}>Export Report</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.8rem', lineHeight: 1.5 }}>
              Generate a professional compliance report for stakeholders, clients, and auditors.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <Button
                variant="outlined" fullWidth startIcon={exporting ? <CircularProgress size={14} /> : <FileDownload />}
                onClick={() => onExport?.(false, 'html')} disabled={exporting}
                sx={{ textTransform: 'none', borderColor: '#c9a84c', color: '#c9a84c', fontWeight: 600, justifyContent: 'flex-start', px: 2 }}>
                Export as HTML
              </Button>
              <Button
                variant="contained" fullWidth startIcon={exporting ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <PictureAsPdf />}
                onClick={() => onExport?.(false, 'pdf')} disabled={exporting}
                sx={{ textTransform: 'none', bgcolor: '#c9a84c', '&:hover': { bgcolor: '#b8963c' }, fontWeight: 600, justifyContent: 'flex-start', px: 2 }}>
                Export as PDF
              </Button>
              {assessment.baseline && (
                <Button
                  variant="outlined" fullWidth startIcon={<CompareArrows />}
                  onClick={() => onExport?.(true, 'pdf')} disabled={exporting}
                  sx={{ textTransform: 'none', borderColor: '#24483E', color: '#24483E', fontWeight: 600, justifyContent: 'flex-start', px: 2 }}>
                  Baseline Comparison PDF
                </Button>
              )}
            </Box>
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: '#111827' }}>Assessment Info</Typography>
            {[
              { label: 'Assessment', value: assessment.title },
              { label: 'Framework', value: template?.framework_display || template?.framework },
              { label: 'Status', value: assessment.status_display },
              { label: 'Engagement', value: assessment.engagement_name || '—' },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, alignItems: 'flex-start', gap: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.73rem', flexShrink: 0 }}>{label}</Typography>
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.73rem', textAlign: 'right', color: '#111827' }}>{value}</Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Tab navigation */}
      <Paper elevation={0} sx={{ mb: 2.5, border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            bgcolor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.8rem', minHeight: 52, py: 0 },
            '& .Mui-selected': { color: '#24483E', fontWeight: 700 },
            '& .MuiTabs-indicator': { bgcolor: '#24483E', height: 2.5 },
          }}
        >
          {tabDefs.map(({ label, icon, badge }, i) => (
            <Tab
              key={label}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {icon}
                  <span>{label}</span>
                  {badge != null && badge > 0 && (
                    <Chip label={badge} size="small"
                      sx={{
                        height: 18, minWidth: 18, fontSize: '0.58rem', fontWeight: 700,
                        bgcolor: i === 3 ? '#fee2e2' : i === 2 ? '#eff6ff' : '#f3f4f6',
                        color:   i === 3 ? '#dc2626' : i === 2 ? '#3b82f6' : '#6b7280',
                        px: 0.5,
                      }} />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab content */}
      <Box>
        {activeTab === 0 && renderOverview()}
        {activeTab === 1 && renderControls()}
        {activeTab === 2 && renderEvidence()}
        {activeTab === 3 && renderRisk()}
        {activeTab === 4 && renderReport()}
      </Box>
    </Box>
  );
}

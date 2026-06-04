"""
GRC Gap Analysis Report Generator
===================================
Generates a complete, self-contained HTML gap analysis report for a GRC project.

Usage:
    from grc.report_generator import generate_gap_analysis_report
    html_string = generate_gap_analysis_report(project, control_statuses, family_stats)

Author: OziCyber Security Platform
"""

import html
from datetime import date, datetime


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FRAMEWORK_ACCENT = {
    'NIST_CSF_2':       '#1565c0',
    'NIST_800_171_R3':  '#283593',
    'ISO_27001_2022':   '#1b5e20',
    'SOC2':             '#4a148c',
    'HIPAA':            '#b71c1c',
}

STATUS_COLOR = {
    'IMPLEMENTED':           '#27ae60',
    'PARTIALLY_IMPLEMENTED': '#f39c12',
    'NOT_STARTED':           '#e74c3c',
    'IN_PROGRESS':           '#3498db',
    'PLANNED':               '#8e44ad',
    'NOT_APPLICABLE':        '#95a5a6',
}

STATUS_LABEL = {
    'IMPLEMENTED':           'Implemented',
    'PARTIALLY_IMPLEMENTED': 'Partially Implemented',
    'NOT_STARTED':           'Not Started',
    'IN_PROGRESS':           'In Progress',
    'PLANNED':               'Planned',
    'NOT_APPLICABLE':        'Not Applicable',
}

RISK_FOR_STATUS = {
    'NOT_STARTED':           'High',
    'PARTIALLY_IMPLEMENTED': 'Medium',
    'IN_PROGRESS':           'Low',
    'PLANNED':               'Low',
}

RISK_COLOR = {
    'Critical': '#c62828',
    'High':     '#e65100',
    'Medium':   '#f57f17',
    'Low':      '#2e7d32',
}

EXPECTED_POLICIES = {
    'NIST_CSF_2': [
        'Information Security Policy',
        'Risk Management Policy',
        'Incident Response Plan',
        'Business Continuity Plan',
        'Access Control Policy',
        'Change Management Policy',
        'Vendor Management Policy',
        'Asset Management Policy',
        'Awareness Training Policy',
        'Physical Security Policy',
    ],
    'NIST_800_171_R3': [
        'System Security Plan (SSP)',
        'Incident Response Plan',
        'Configuration Management Plan',
        'Risk Assessment Policy',
        'Access Control Policy',
        'Media Protection Policy',
        'System and Communications Protection Policy',
        'Awareness and Training Policy',
        'Audit and Accountability Policy',
        'Physical Protection Policy',
    ],
    'ISO_27001_2022': [
        'Information Security Policy',
        'Risk Assessment Methodology',
        'Statement of Applicability (SoA)',
        'Access Control Policy',
        'Acceptable Use Policy',
        'Clear Desk and Screen Policy',
        'Mobile Device Policy',
        'Incident Management Policy',
        'Business Continuity Policy',
        'Supplier Security Policy',
        'Cryptography Policy',
        'Data Classification Policy',
        'Asset Management Policy',
        'Change Management Policy',
        'HR Security Policy',
    ],
    'SOC2': [
        'Information Security Policy',
        'Availability Policy',
        'Confidentiality Policy',
        'Change Management Policy',
        'Incident Response Policy',
        'Risk Assessment Policy',
        'Vendor Management Policy',
        'Access Control Policy',
        'Backup and Recovery Policy',
        'Monitoring and Logging Policy',
    ],
    'HIPAA': [
        'Security Management Policy',
        'Workforce Security Policy',
        'Information Access Management Policy',
        'Security Awareness Training Policy',
        'Security Incident Procedures',
        'Contingency Plan',
        'Evaluation Policy',
        'Business Associate Policy',
        'Facility Access Policy',
        'Workstation Use Policy',
        'Device and Media Controls Policy',
        'Access Control Policy',
        'Audit Controls Policy',
        'Transmission Security Policy',
    ],
}

FRAMEWORK_DESCRIPTION = {
    'NIST_CSF_2': (
        "The NIST Cybersecurity Framework 2.0 (CSF 2.0) provides a comprehensive taxonomy of "
        "high-level cybersecurity outcomes that any organisation — regardless of size, sector, or "
        "maturity — can use to understand, assess, prioritise, and communicate cybersecurity "
        "efforts. Organised into six core Functions (GOVERN, IDENTIFY, PROTECT, DETECT, RESPOND, "
        "and RECOVER), the CSF 2.0 represents the latest evolution of the widely adopted 2014 "
        "framework, adding a dedicated governance layer and expanded supply-chain risk guidance."
    ),
    'NIST_800_171_R3': (
        "NIST Special Publication 800-171 Revision 3 establishes requirements for protecting "
        "Controlled Unclassified Information (CUI) in non-federal systems and organisations. "
        "The standard comprises 17 requirement families covering areas from Access Control and "
        "Audit and Accountability through to System and Communications Protection. Compliance "
        "with NIST 800-171r3 is typically mandated for organisations in the US Defence Industrial "
        "Base (DIB) and those handling CUI under federal contracts."
    ),
    'ISO_27001_2022': (
        "ISO/IEC 27001:2022 is the internationally recognised standard for Information Security "
        "Management Systems (ISMS). The 2022 revision restructured the Annex A controls from "
        "14 domains and 114 controls to 4 themes (Organisational, People, Physical, Technological) "
        "and 93 controls. Certification to ISO 27001 demonstrates that an organisation has "
        "implemented a systematic approach to managing sensitive information, encompassing people, "
        "processes, and technology."
    ),
    'SOC2': (
        "SOC 2 (System and Organisation Controls 2) is an auditing standard developed by the "
        "American Institute of Certified Public Accountants (AICPA) for service organisations. "
        "Assessments are conducted against the Trust Services Criteria (TSC), which cover Security "
        "(mandatory), Availability, Processing Integrity, Confidentiality, and Privacy. A SOC 2 "
        "Type II report covers a period of time (typically 6–12 months) and provides assurance "
        "that controls were operating effectively throughout that period."
    ),
    'HIPAA': (
        "The Health Insurance Portability and Accountability Act (HIPAA) Security Rule establishes "
        "national standards to protect individuals' electronic Protected Health Information (ePHI) "
        "created, received, used, or maintained by covered entities and their business associates. "
        "The Security Rule requires appropriate administrative, physical, and technical safeguards "
        "to ensure the confidentiality, integrity, and security of ePHI. Compliance is mandatory "
        "for all covered entities and business associates handling ePHI."
    ),
}

GLOSSARY_TERMS = {
    'Gap Analysis': (
        'A structured assessment comparing an organisation\'s current security posture against the '
        'requirements of a chosen framework or standard, identifying areas where controls are absent '
        'or insufficient.'
    ),
    'Control': (
        'A safeguard or countermeasure prescribed or designed to satisfy security requirements. '
        'Controls may be technical, administrative, or physical in nature.'
    ),
    'Implementation Status': (
        'The current state of a control\'s deployment within the organisation. Statuses include: '
        'Not Started, In Progress, Planned, Partially Implemented, Implemented, and Not Applicable.'
    ),
    'ISMS': (
        'Information Security Management System — a systematic approach to managing sensitive '
        'information so that it remains secure, encompassing people, processes, and IT systems.'
    ),
    'ePHI': (
        'Electronic Protected Health Information — individually identifiable health information '
        'that is created, stored, transmitted, or received in electronic form, as defined under HIPAA.'
    ),
    'CUI': (
        'Controlled Unclassified Information — information the Government creates or possesses '
        'that requires safeguarding consistent with applicable laws, regulations, and policies.'
    ),
    'TSC': (
        'Trust Services Criteria — the criteria developed by the AICPA used to evaluate whether '
        'controls at a service organisation meet the applicable trust services categories.'
    ),
    'Risk Rating': (
        'A qualitative assessment of the likelihood and impact of a security risk materialising. '
        'Ratings used in this report: Critical, High, Medium, Low.'
    ),
    'Residual Risk': (
        'The risk remaining after all controls and risk responses have been applied. Residual risk '
        'should be formally accepted by accountable business owners.'
    ),
    'SoA': (
        'Statement of Applicability — an ISO 27001 document listing all Annex A controls, '
        'indicating which are applicable, which are implemented, and justifying any exclusions.'
    ),
    'SSP': (
        'System Security Plan — a formal document that provides an overview of the security '
        'requirements of a system and describes the controls in place or planned to meet those '
        'requirements (required under NIST 800-171).'
    ),
    'Evidence': (
        'Documentation, artefacts, or other records that demonstrate the existence and operation '
        'of a security control. May include policies, screenshots, logs, certificates, or procedures.'
    ),
    'Remediation': (
        'Actions taken to address identified gaps or deficiencies in the implementation of security '
        'controls, bringing those controls to the desired state of implementation.'
    ),
    'Compensating Control': (
        'An alternative control that provides equivalent or comparable protection when the primary '
        'recommended control cannot be implemented due to technical or operational constraints.'
    ),
    'Maturity Level': (
        'A measure of how well-established, documented, and consistently applied a security '
        'process or control is within an organisation.'
    ),
}


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _fmt_date(d) -> str:
    """Format a date or datetime as DD MMM YYYY, or return empty string."""
    if d is None:
        return ''
    if isinstance(d, datetime):
        d = d.date()
    if isinstance(d, date):
        return d.strftime('%d %b %Y')
    return str(d)


def _e(text) -> str:
    """HTML-escape a value; coerce None/non-string to empty string."""
    if text is None:
        return ''
    return html.escape(str(text))


def _truncate(text: str, length: int = 120) -> str:
    """Truncate text to length characters."""
    if not text:
        return ''
    if len(text) <= length:
        return text
    return text[:length].rstrip() + '…'


def _first_sentence(text: str) -> str:
    """Return the first sentence of text."""
    if not text:
        return ''
    for sep in ['. ', '.\n', '! ', '? ']:
        idx = text.find(sep)
        if idx != -1:
            return text[:idx + 1]
    return text[:200]


def _status_badge(status: str) -> str:
    """Return an inline HTML status badge span."""
    color = STATUS_COLOR.get(status, '#999')
    label = STATUS_LABEL.get(status, status)
    return (
        f'<span style="display:inline-block;padding:3px 10px;border-radius:12px;'
        f'background:{color};color:#fff;font-size:11px;font-weight:700;'
        f'letter-spacing:0.5px;white-space:nowrap;">{_e(label)}</span>'
    )


def _risk_badge(rating: str) -> str:
    """Return an inline HTML risk badge span."""
    color = RISK_COLOR.get(rating, '#999')
    return (
        f'<span style="display:inline-block;padding:3px 10px;border-radius:12px;'
        f'background:{color};color:#fff;font-size:11px;font-weight:700;'
        f'letter-spacing:0.5px;">{_e(rating)}</span>'
    )


def _pct_color(pct: float) -> str:
    """Return a color based on compliance percentage."""
    if pct >= 85:
        return '#27ae60'
    if pct >= 70:
        return '#f39c12'
    if pct >= 40:
        return '#e65100'
    return '#c62828'


def _risk_label_from_pct(pct: float) -> str:
    if pct >= 85:
        return 'Low Risk'
    if pct >= 70:
        return 'Moderate Risk'
    if pct >= 40:
        return 'High Risk'
    return 'Critical Risk'


def _compute_overall_stats(control_statuses) -> dict:
    """Compute overall statistics from control_statuses list/queryset."""
    total = 0
    implemented = 0
    partial = 0
    in_progress = 0
    planned = 0
    not_applicable = 0
    not_started = 0
    evidence_total = 0

    for cs in control_statuses:
        if getattr(cs.control, 'is_category', False):
            continue
        total += 1
        s = cs.status
        if s == 'IMPLEMENTED':
            implemented += 1
        elif s == 'PARTIALLY_IMPLEMENTED':
            partial += 1
        elif s == 'IN_PROGRESS':
            in_progress += 1
        elif s == 'PLANNED':
            planned += 1
        elif s == 'NOT_APPLICABLE':
            not_applicable += 1
        else:
            not_started += 1

        # Evidence count
        ev_count = getattr(cs, 'evidence_count', None)
        if ev_count is None:
            try:
                ev_count = cs.evidence.all().count()
            except Exception:
                ev_count = 0
        evidence_total += ev_count

    effective = total - not_applicable
    pct = round((implemented / effective) * 100, 1) if effective > 0 else 0.0

    return {
        'total':          total,
        'implemented':    implemented,
        'partial':        partial,
        'in_progress':    in_progress,
        'planned':        planned,
        'not_applicable': not_applicable,
        'not_started':    not_started,
        'evidence_total': evidence_total,
        'effective':      effective,
        'pct':            pct,
    }


def _get_evidence_list(cs):
    """Safely return a list of evidence items for a control status."""
    try:
        return list(cs.evidence.all())
    except Exception:
        return []


def _gather_policy_evidence(control_statuses) -> list:
    """Collect evidence items whose title/description suggests a policy document."""
    keywords = ('policy', 'procedure', 'standard', 'guideline', 'plan', 'framework',
                 'protocol', 'charter', 'manual', 'handbook')
    found = []
    seen_titles = set()
    for cs in control_statuses:
        for ev in _get_evidence_list(cs):
            title_lower = (ev.title or '').lower()
            desc_lower = (ev.description or '').lower()
            if any(kw in title_lower or kw in desc_lower for kw in keywords):
                if ev.title not in seen_titles:
                    seen_titles.add(ev.title)
                    found.append({
                        'title':      ev.title,
                        'control_id': cs.control.control_id,
                        'description': ev.description,
                    })
    return found


def _get_accent(framework_key: str) -> str:
    return FRAMEWORK_ACCENT.get(framework_key, '#1565c0')


def _get_findings(control_statuses) -> list:
    """Return list of control statuses that represent gaps (non-implemented, non-N/A)."""
    gap_statuses = {'NOT_STARTED', 'PARTIALLY_IMPLEMENTED', 'IN_PROGRESS', 'PLANNED'}
    findings = []
    for cs in control_statuses:
        if getattr(cs.control, 'is_category', False):
            continue
        if cs.status in gap_statuses:
            findings.append(cs)
    return findings


def _generate_finding_description(cs) -> str:
    """Generate a 2-3 sentence finding description from control data."""
    title = cs.control.title or ''
    statement = cs.control.statement or ''
    status = cs.status
    risk = RISK_FOR_STATUS.get(status, 'Medium')
    first_sent = _first_sentence(statement)

    if status == 'NOT_STARTED':
        return (
            f"The organisation has not implemented {title}. "
            f"{first_sent} "
            f"This represents a {risk} risk to the organisation's security posture and requires "
            f"immediate remediation attention."
        )
    elif status == 'PARTIALLY_IMPLEMENTED':
        return (
            f"The organisation has only partially implemented {title}. "
            f"While some elements may be in place, the control does not yet meet the full "
            f"requirements defined by the framework. "
            f"{first_sent} "
            f"This partial implementation leaves residual gaps that represent a {risk} risk."
        )
    elif status == 'IN_PROGRESS':
        return (
            f"Implementation of {title} is currently underway but has not yet been completed. "
            f"{first_sent} "
            f"Until implementation is complete and verified, this control represents a {risk} risk "
            f"that should be tracked to closure."
        )
    else:  # PLANNED
        return (
            f"Implementation of {title} has been planned but not yet commenced. "
            f"{first_sent} "
            f"Until implementation begins, this control remains unaddressed and represents a "
            f"{risk} risk to the organisation."
        )


def _generate_recommendation(cs) -> str:
    """Generate a specific recommendation based on control title and statement."""
    title = cs.control.title or ''
    statement = cs.control.statement or ''
    first_sent = _first_sentence(statement)

    action_verbs = {
        'NOT_STARTED':           'Develop and implement',
        'PARTIALLY_IMPLEMENTED': 'Complete and mature the implementation of',
        'IN_PROGRESS':           'Accelerate and finalise implementation of',
        'PLANNED':               'Commence implementation of',
    }
    verb = action_verbs.get(cs.status, 'Implement')
    aspect = first_sent[:100].rstrip('.') if first_sent else 'all required elements'

    return (
        f"{verb} {title}. "
        f"Ensure that {aspect.lower()} as required by the framework. "
        f"Document the implementation fully, assign an accountable owner, establish a target "
        f"completion date, and retain evidence of compliance for audit purposes."
    )


def _generate_gap_analysis_text(cs) -> str:
    """Generate the per-control gap analysis narrative."""
    status = cs.status
    notes = (cs.implementation_notes or '').strip()
    ev_list = _get_evidence_list(cs)
    ev_count = len(ev_list)
    statement = cs.control.statement or ''
    first_sent = _first_sentence(statement)

    if status == 'IMPLEMENTED':
        parts = [f"This control appears to be fully implemented. "]
        if notes:
            parts.append(f"The following implementation notes have been recorded: {_truncate(notes, 200)}. ")
        parts.append(
            f"{ev_count} evidence item(s) have been provided to support this assessment."
            if ev_count > 0
            else "No formal evidence items have been attached; it is recommended that evidence be uploaded to support future audits."
        )
        return ''.join(parts)

    elif status == 'PARTIALLY_IMPLEMENTED':
        parts = [
            f"This control has been partially implemented. "
        ]
        if notes:
            parts.append(f"The following progress has been noted: {_truncate(notes, 200)}. ")
        parts.append(
            f"However, gaps remain relative to the full control requirement: {_truncate(first_sent, 150)}. "
            f"These gaps must be addressed to achieve full compliance. "
        )
        parts.append(
            f"Recommendation: Complete the outstanding implementation elements, document the "
            f"additional work, and provide supporting evidence."
        )
        return ''.join(parts)

    elif status == 'NOT_STARTED':
        return (
            f"This control has not been implemented. The framework requires that: {_truncate(first_sent, 200)}. "
            f"Priority: Immediate action is required. "
            f"Recommendation: {_generate_recommendation(cs)}"
        )

    elif status == 'IN_PROGRESS':
        parts = [
            f"Implementation of this control is currently in progress. "
        ]
        if notes:
            parts.append(f"Current progress: {_truncate(notes, 200)}. ")
        parts.append(
            f"Ensure that implementation is completed within the target timeframe. "
            f"Retain evidence of completed implementation for audit purposes."
        )
        return ''.join(parts)

    elif status == 'PLANNED':
        parts = ["Implementation is planned but has not yet commenced. "]
        if notes:
            parts.append(f"Planning notes: {_truncate(notes, 200)}. ")
        parts.append(
            f"Ensure that planning activities are completed promptly and that implementation "
            f"commences within the agreed target timeframe."
        )
        return ''.join(parts)

    elif status == 'NOT_APPLICABLE':
        return (
            "This control has been assessed as not applicable to the organisation's current "
            "environment or operational context. If the applicability determination changes, "
            "this assessment should be updated accordingly."
        )

    return "No analysis available for this control."


# ---------------------------------------------------------------------------
# CSS
# ---------------------------------------------------------------------------

def _build_css(accent: str) -> str:
    return f"""
    /* ===== RESET & BASE ===== */
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    html {{ font-size: 14px; }}
    body {{
        font-family: Arial, Helvetica, 'Segoe UI', sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #1a1a2e;
        background: #f5f7fa;
    }}

    /* ===== PRINT ===== */
    @media print {{
        body {{ background: #fff; font-size: 12px; }}
        .no-print {{ display: none !important; }}
        .page-break {{ page-break-before: always; }}
        .avoid-break {{ page-break-inside: avoid; }}
        a {{ text-decoration: none; color: inherit; }}
        .section-container {{ box-shadow: none !important; border: 1px solid #ddd; }}
    }}

    /* ===== LAYOUT ===== */
    .report-wrapper {{
        max-width: 1050px;
        margin: 0 auto;
        background: #fff;
        box-shadow: 0 0 40px rgba(0,0,0,0.12);
    }}

    /* ===== COVER PAGE ===== */
    .cover-page {{
        background: linear-gradient(160deg, #0d2137 0%, #1a3a5c 55%, {accent} 100%);
        min-height: 100vh;
        padding: 0;
        display: flex;
        flex-direction: column;
        color: #fff;
        position: relative;
        overflow: hidden;
    }}
    .cover-page::before {{
        content: '';
        position: absolute;
        top: -100px; right: -100px;
        width: 400px; height: 400px;
        border-radius: 50%;
        background: rgba(255,255,255,0.04);
    }}
    .cover-page::after {{
        content: '';
        position: absolute;
        bottom: -80px; left: -80px;
        width: 350px; height: 350px;
        border-radius: 50%;
        background: rgba(255,255,255,0.03);
    }}
    .cover-top-bar {{
        background: rgba(255,255,255,0.08);
        padding: 18px 50px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255,255,255,0.12);
    }}
    .cover-logo-text {{
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 1px;
        color: #fff;
    }}
    .cover-logo-text span {{
        color: #64b5f6;
    }}
    .cover-classification {{
        background: #e74c3c;
        color: #fff;
        padding: 5px 16px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 2px;
    }}
    .cover-body {{
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 60px 50px 40px 50px;
        position: relative;
        z-index: 1;
    }}
    .cover-framework-chip {{
        display: inline-block;
        background: rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.3);
        color: rgba(255,255,255,0.9);
        padding: 6px 18px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.5px;
        margin-bottom: 24px;
    }}
    .cover-report-type {{
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 3px;
        text-transform: uppercase;
        color: rgba(255,255,255,0.6);
        margin-bottom: 12px;
    }}
    .cover-title {{
        font-size: 36px;
        font-weight: 800;
        line-height: 1.2;
        color: #fff;
        margin-bottom: 10px;
    }}
    .cover-subtitle {{
        font-size: 20px;
        font-weight: 400;
        color: rgba(255,255,255,0.75);
        margin-bottom: 40px;
    }}
    .cover-divider {{
        width: 60px;
        height: 4px;
        background: {accent};
        border-radius: 2px;
        margin-bottom: 40px;
    }}
    .cover-meta-grid {{
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        max-width: 600px;
    }}
    .cover-meta-item label {{
        display: block;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: rgba(255,255,255,0.5);
        margin-bottom: 4px;
    }}
    .cover-meta-item .cover-meta-value {{
        font-size: 14px;
        font-weight: 600;
        color: #fff;
    }}
    .cover-footer {{
        background: rgba(0,0,0,0.25);
        padding: 20px 50px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: rgba(255,255,255,0.5);
        position: relative;
        z-index: 1;
    }}
    .cover-status-badge {{
        display: inline-block;
        padding: 4px 14px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.5px;
    }}

    /* ===== SECTION CONTAINERS ===== */
    .section-container {{
        margin: 0;
        background: #fff;
    }}
    .section-header {{
        background: #0d2137;
        color: #fff;
        padding: 28px 50px 24px 50px;
        display: flex;
        align-items: flex-start;
        gap: 20px;
        border-bottom: 4px solid {accent};
    }}
    .section-number {{
        font-size: 36px;
        font-weight: 800;
        color: {accent};
        line-height: 1;
        min-width: 50px;
    }}
    .section-header-text h2 {{
        font-size: 22px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 4px;
    }}
    .section-header-text p {{
        font-size: 12px;
        color: rgba(255,255,255,0.6);
        font-style: italic;
    }}
    .section-body {{
        padding: 40px 50px;
    }}

    /* ===== NOTICE PAGE ===== */
    .notice-box {{
        border: 2px solid #e74c3c;
        border-radius: 8px;
        padding: 30px;
        background: #fff9f9;
        margin-bottom: 30px;
    }}
    .notice-box h3 {{
        color: #e74c3c;
        font-size: 16px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
    }}
    .notice-box p {{
        color: #555;
        font-size: 13px;
        line-height: 1.7;
        margin-bottom: 10px;
    }}
    .notice-box p:last-child {{ margin-bottom: 0; }}

    /* ===== TABLE OF CONTENTS ===== */
    .toc-list {{
        list-style: none;
        padding: 0;
    }}
    .toc-list li {{
        border-bottom: 1px dotted #ddd;
        padding: 8px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }}
    .toc-list li:last-child {{ border-bottom: none; }}
    .toc-list a {{
        color: {accent};
        text-decoration: none;
        font-weight: 600;
        font-size: 14px;
    }}
    .toc-list a:hover {{ text-decoration: underline; }}
    .toc-sub {{
        list-style: none;
        padding-left: 20px;
        margin-top: 4px;
    }}
    .toc-sub li {{
        border-bottom: none;
        padding: 3px 0;
    }}
    .toc-sub a {{
        color: #555;
        font-size: 12px;
        font-weight: 400;
    }}
    .toc-page-num {{
        color: #999;
        font-size: 12px;
        min-width: 60px;
        text-align: right;
    }}

    /* ===== EXECUTIVE SUMMARY ===== */
    .posture-box {{
        border-radius: 10px;
        padding: 24px 30px;
        margin-bottom: 28px;
        border-left: 6px solid;
        display: flex;
        align-items: center;
        gap: 24px;
    }}
    .posture-pct {{
        font-size: 52px;
        font-weight: 800;
        line-height: 1;
        min-width: 120px;
        text-align: center;
    }}
    .posture-pct-small {{
        font-size: 24px;
        font-weight: 400;
    }}
    .posture-label {{
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 4px;
    }}
    .posture-desc {{
        font-size: 13px;
        opacity: 0.85;
        line-height: 1.5;
    }}

    /* ===== PROGRESS / GAUGE BARS ===== */
    .progress-track {{
        background: #eee;
        border-radius: 8px;
        height: 14px;
        overflow: hidden;
        margin: 4px 0;
    }}
    .progress-fill {{
        height: 100%;
        border-radius: 8px;
        transition: width 0.3s;
    }}
    .big-gauge-wrap {{
        text-align: center;
        margin: 30px 0;
    }}
    .big-gauge-label {{
        font-size: 64px;
        font-weight: 800;
        line-height: 1;
    }}
    .big-gauge-sub {{
        font-size: 16px;
        color: #888;
        margin-top: 4px;
    }}
    .big-progress-track {{
        background: #eee;
        border-radius: 12px;
        height: 28px;
        overflow: hidden;
        margin: 16px auto;
        max-width: 700px;
        position: relative;
    }}
    .big-progress-fill {{
        height: 100%;
        border-radius: 12px;
    }}
    .big-progress-label {{
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 13px;
        font-weight: 700;
        color: #333;
    }}

    /* ===== TABLES ===== */
    table {{
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        margin-bottom: 24px;
    }}
    thead th {{
        background: #0d2137;
        color: #fff;
        padding: 10px 14px;
        text-align: left;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        border-right: 1px solid rgba(255,255,255,0.1);
    }}
    thead th:last-child {{ border-right: none; }}
    tbody tr:nth-child(even) {{ background: #f8fafd; }}
    tbody tr:hover {{ background: #edf2fb; }}
    tbody td {{
        padding: 10px 14px;
        border-bottom: 1px solid #eee;
        vertical-align: top;
        line-height: 1.5;
    }}
    tbody tr:last-child td {{ border-bottom: none; }}
    .td-center {{ text-align: center; }}
    .td-right {{ text-align: right; }}
    .td-mono {{ font-family: 'Courier New', monospace; font-size: 12px; }}

    /* ===== FINDING CARDS ===== */
    .finding-card {{
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        margin-bottom: 28px;
        overflow: hidden;
        page-break-inside: avoid;
    }}
    .finding-card-header {{
        background: #0d2137;
        padding: 14px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
    }}
    .finding-id {{
        font-size: 13px;
        font-weight: 800;
        color: #64b5f6;
        letter-spacing: 0.5px;
    }}
    .finding-control-ref {{
        background: rgba(255,255,255,0.15);
        color: #fff;
        padding: 3px 10px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        font-weight: 700;
    }}
    .finding-title {{
        flex: 1;
        font-size: 14px;
        font-weight: 700;
        color: #fff;
    }}
    .finding-body {{
        padding: 20px;
    }}
    .finding-row {{
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 8px 16px;
        margin-bottom: 14px;
        font-size: 13px;
    }}
    .finding-row-label {{
        font-weight: 700;
        color: #555;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding-top: 2px;
    }}
    .finding-description {{
        color: #333;
        line-height: 1.7;
    }}
    .finding-current-state {{
        background: #f8f9fa;
        border-left: 3px solid #ddd;
        padding: 10px 14px;
        border-radius: 0 4px 4px 0;
        font-size: 13px;
        color: #555;
        font-style: italic;
    }}
    .finding-recommendation {{
        background: #e8f4fd;
        border-left: 3px solid {accent};
        padding: 10px 14px;
        border-radius: 0 4px 4px 0;
        font-size: 13px;
        color: #333;
        line-height: 1.6;
    }}

    /* ===== CONTROL DETAIL ===== */
    .family-section {{
        margin-bottom: 40px;
    }}
    .family-header {{
        background: linear-gradient(90deg, #0d2137, #1a3a5c);
        color: #fff;
        padding: 16px 24px;
        border-radius: 8px 8px 0 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0;
    }}
    .family-identifier {{
        font-family: 'Courier New', monospace;
        font-size: 14px;
        font-weight: 700;
        color: #64b5f6;
        margin-right: 12px;
    }}
    .family-name {{
        font-size: 16px;
        font-weight: 700;
        flex: 1;
    }}
    .family-stats-chips {{
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }}
    .family-stat-chip {{
        background: rgba(255,255,255,0.12);
        color: #fff;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
    }}

    .control-card {{
        border: 1px solid #e8e8e8;
        border-radius: 0;
        border-top: none;
        padding: 0;
        margin-bottom: 0;
    }}
    .control-card:last-child {{
        border-radius: 0 0 8px 8px;
    }}
    .control-card-inner {{
        padding: 20px 24px;
        border-left: 5px solid #ddd;
    }}
    .control-card-header {{
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
        flex-wrap: wrap;
    }}
    .control-id-chip {{
        font-family: 'Courier New', monospace;
        font-size: 12px;
        font-weight: 700;
        background: #0d2137;
        color: #fff;
        padding: 3px 10px;
        border-radius: 4px;
        white-space: nowrap;
    }}
    .control-title-text {{
        font-size: 15px;
        font-weight: 700;
        color: #0d2137;
        flex: 1;
    }}
    .control-statement-box {{
        background: #f8fafd;
        border-left: 3px solid {accent};
        padding: 12px 16px;
        margin: 12px 0;
        font-size: 13px;
        color: #444;
        line-height: 1.7;
        border-radius: 0 4px 4px 0;
        font-style: italic;
    }}
    .control-sub-label {{
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        color: #888;
        margin: 14px 0 6px 0;
    }}
    .control-notes-text {{
        font-size: 13px;
        color: #444;
        line-height: 1.6;
        background: #fffbf0;
        padding: 10px 14px;
        border-radius: 4px;
        border: 1px solid #ffe082;
    }}
    .control-gap-analysis {{
        font-size: 13px;
        color: #333;
        line-height: 1.7;
        background: #f0f4f8;
        padding: 12px 16px;
        border-radius: 4px;
        border-left: 3px solid #90a4ae;
    }}
    .evidence-list {{
        list-style: none;
        padding: 0;
        margin: 0;
    }}
    .evidence-item {{
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        padding: 10px 14px;
        margin-bottom: 8px;
        background: #fff;
        font-size: 12px;
    }}
    .evidence-item-title {{
        font-weight: 700;
        color: #0d2137;
        margin-bottom: 4px;
    }}
    .evidence-item-meta {{
        color: #888;
        font-size: 11px;
    }}
    .control-owner-row {{
        display: flex;
        gap: 24px;
        margin-top: 12px;
        flex-wrap: wrap;
        font-size: 12px;
        color: #666;
        border-top: 1px solid #eee;
        padding-top: 10px;
    }}
    .control-owner-item {{
        display: flex;
        align-items: center;
        gap: 6px;
    }}
    .control-owner-label {{
        font-weight: 700;
        color: #444;
    }}
    .no-evidence-note {{
        font-size: 12px;
        color: #aaa;
        font-style: italic;
    }}

    /* ===== POLICY SECTION ===== */
    .policy-status-ok {{
        color: #27ae60;
        font-weight: 700;
    }}
    .policy-status-missing {{
        color: #e74c3c;
        font-weight: 700;
    }}
    .policy-status-partial {{
        color: #f39c12;
        font-weight: 700;
    }}

    /* ===== RECOMMENDATIONS ===== */
    .rec-priority-high {{ color: #e65100; font-weight: 700; }}
    .rec-priority-medium {{ color: #f57f17; font-weight: 700; }}
    .rec-priority-low {{ color: #2e7d32; font-weight: 700; }}

    /* ===== APPENDIX ===== */
    .glossary-term {{
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid #eee;
    }}
    .glossary-term:last-child {{
        border-bottom: none;
    }}
    .glossary-term dt {{
        font-weight: 800;
        color: #0d2137;
        font-size: 14px;
        margin-bottom: 4px;
    }}
    .glossary-term dd {{
        color: #555;
        font-size: 13px;
        line-height: 1.6;
        margin-left: 0;
    }}

    /* ===== UTILITY ===== */
    .text-muted {{ color: #888; font-size: 12px; }}
    .text-bold {{ font-weight: 700; }}
    .mt-16 {{ margin-top: 16px; }}
    .mt-24 {{ margin-top: 24px; }}
    .mb-16 {{ margin-bottom: 16px; }}
    .mb-24 {{ margin-bottom: 24px; }}
    .inline-flex {{ display: inline-flex; align-items: center; gap: 8px; }}
    .subsection-title {{
        font-size: 16px;
        font-weight: 700;
        color: #0d2137;
        border-bottom: 2px solid {accent};
        padding-bottom: 8px;
        margin: 28px 0 16px 0;
    }}
    .info-paragraph {{
        font-size: 14px;
        line-height: 1.8;
        color: #444;
        margin-bottom: 16px;
    }}
    .highlight-box {{
        background: #e8f4fd;
        border-left: 4px solid {accent};
        padding: 16px 20px;
        border-radius: 0 6px 6px 0;
        margin: 16px 0;
        font-size: 13px;
        color: #333;
        line-height: 1.7;
    }}
    .two-col {{
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
    }}
    .card-metric {{
        background: #f8fafd;
        border: 1px solid #e0e8f0;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
    }}
    .card-metric-value {{
        font-size: 36px;
        font-weight: 800;
        color: #0d2137;
        line-height: 1;
    }}
    .card-metric-label {{
        font-size: 12px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 6px;
    }}
    .four-col {{
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin: 20px 0;
    }}
    @media (max-width: 700px) {{
        .four-col {{ grid-template-columns: repeat(2, 1fr); }}
        .two-col {{ grid-template-columns: 1fr; }}
        .cover-meta-grid {{ grid-template-columns: 1fr; }}
    }}
    """


# ---------------------------------------------------------------------------
# HTML section builders
# ---------------------------------------------------------------------------

def _build_head(title: str, accent: str) -> str:
    css = _build_css(accent)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{_e(title)}</title>
<style>
{css}
</style>
</head>
<body>
<div class="report-wrapper">
"""


def _build_cover(project, stats: dict, accent: str) -> str:
    framework_name = _e(project.framework.name)
    framework_key = project.framework.key

    assessor = getattr(project, 'assessor_name', None) or 'OziCyber Security Team'
    proj_status = project.status or 'ACTIVE'
    status_colors = {
        'ACTIVE':     '#3498db',
        'COMPLETED':  '#27ae60',
        'ARCHIVED':   '#95a5a6',
    }
    status_bg = status_colors.get(proj_status, '#3498db')

    pct = stats['pct']
    risk_label = _risk_label_from_pct(pct)
    risk_color = _pct_color(pct)

    generated_date = _fmt_date(date.today())
    target_date_str = _fmt_date(project.target_date) if project.target_date else 'Not specified'
    created_by = getattr(project, 'created_by_name', None) or 'N/A'

    return f"""
<!-- ========== COVER PAGE ========== -->
<div id="cover" class="cover-page page-break">
    <div class="cover-top-bar">
        <div class="cover-logo-text">Ozi<span>Cyber</span></div>
        <div class="cover-classification">CONFIDENTIAL</div>
    </div>
    <div class="cover-body">
        <div class="cover-framework-chip">{framework_name}</div>
        <div class="cover-report-type">Information Security Assessment</div>
        <h1 class="cover-title">Gap Analysis Report</h1>
        <div class="cover-subtitle">{_e(project.title)}</div>
        <div class="cover-divider"></div>
        <div class="cover-meta-grid">
            <div class="cover-meta-item">
                <label>Prepared By</label>
                <div class="cover-meta-value">OziCyber Pty Ltd</div>
            </div>
            <div class="cover-meta-item">
                <label>Prepared For</label>
                <div class="cover-meta-value">{_e(project.title)}</div>
            </div>
            <div class="cover-meta-item">
                <label>Lead Assessor</label>
                <div class="cover-meta-value">{_e(assessor)}</div>
            </div>
            <div class="cover-meta-item">
                <label>Date Generated</label>
                <div class="cover-meta-value">{generated_date}</div>
            </div>
            <div class="cover-meta-item">
                <label>Target Completion</label>
                <div class="cover-meta-value">{target_date_str}</div>
            </div>
            <div class="cover-meta-item">
                <label>Project Status</label>
                <div class="cover-meta-value">
                    <span class="cover-status-badge" style="background:{status_bg};">{_e(proj_status)}</span>
                </div>
            </div>
            <div class="cover-meta-item">
                <label>Compliance Posture</label>
                <div class="cover-meta-value" style="color:{risk_color};">{pct}% — {risk_label}</div>
            </div>
            <div class="cover-meta-item">
                <label>Controls Assessed</label>
                <div class="cover-meta-value">{stats['total']} Controls</div>
            </div>
        </div>
    </div>
    <div class="cover-footer">
        <span>OziCyber Pty Ltd &mdash; Confidential &amp; Proprietary</span>
        <span>Framework: {framework_name} &mdash; {framework_key}</span>
        <span>Report generated {generated_date}</span>
    </div>
</div>
"""


def _build_notice() -> str:
    return f"""
<!-- ========== IMPORTANT NOTICE ========== -->
<div id="notice" class="section-container page-break">
    <div class="section-header">
        <div class="section-number">!</div>
        <div class="section-header-text">
            <h2>Important Notice &amp; Disclaimer</h2>
            <p>Please read this notice before reviewing the report findings</p>
        </div>
    </div>
    <div class="section-body">
        <div class="notice-box">
            <h3>&#9888; Confidentiality Notice</h3>
            <p>This report has been prepared by OziCyber Pty Ltd ("OziCyber") exclusively for
            the use of the client organisation named on the cover page. It contains sensitive
            information regarding the organisation's cybersecurity posture and must be treated as
            CONFIDENTIAL. Unauthorised disclosure, reproduction, or distribution of this report
            or any portion thereof is strictly prohibited.</p>
            <p>If you have received this report in error, please notify OziCyber immediately and
            destroy all copies.</p>
        </div>
        <div class="notice-box" style="border-color:#f39c12;background:#fffdf0;">
            <h3 style="color:#e67e22;">&#9432; Point-in-Time Assessment Disclaimer</h3>
            <p>This gap analysis represents a point-in-time assessment of the organisation's
            information security controls as at the date of assessment. The findings, conclusions,
            and recommendations contained in this report reflect the state of controls at the time
            the assessment was conducted and may not reflect the current state of the environment.</p>
            <p>The cybersecurity landscape evolves rapidly. New vulnerabilities, threats, and
            regulatory requirements may emerge after the date of this report. OziCyber recommends
            that this assessment be reviewed and updated at regular intervals, or whenever
            significant changes occur to the organisation's environment, systems, or risk profile.</p>
            <p>This report does not constitute a guarantee or certification that the organisation
            is fully compliant with the referenced framework or standard. Formal certification
            requires an independent audit conducted by an accredited certification body.</p>
        </div>
        <div class="notice-box" style="border-color:#3498db;background:#f0f8ff;">
            <h3 style="color:#2980b9;">&#9432; Scope Limitation</h3>
            <p>The assessment was conducted based on information provided by the organisation,
            including documentation, system configurations, interviews, and observed evidence.
            OziCyber has relied upon the accuracy and completeness of information provided. This
            report does not constitute a technical penetration test, vulnerability assessment, or
            forensic investigation unless explicitly stated otherwise in the engagement scope.</p>
            <p>Controls assessed as "Not Applicable" have been excluded from compliance percentage
            calculations. The organisation bears responsibility for ensuring that applicability
            determinations are accurate and appropriately documented.</p>
        </div>
    </div>
</div>
"""


def _build_toc(family_stats: list, findings_count: int) -> str:
    family_items = ''
    for fam in family_stats:
        fam_id = _e(str(fam.get('identifier', '')))
        fam_name = _e(str(fam.get('name', '')))
        anchor = f"family-{fam.get('id', fam_id)}"
        family_items += f"""
        <li style="border-bottom:none;padding:2px 0;">
            <a href="#{anchor}" style="color:#888;font-size:12px;font-weight:400;">
                &nbsp;&nbsp;&nbsp;&bull;&nbsp;{fam_id}: {fam_name}</a>
            <span class="toc-page-num"></span>
        </li>"""

    return f"""
<!-- ========== TABLE OF CONTENTS ========== -->
<div id="toc" class="section-container page-break">
    <div class="section-header">
        <div class="section-number">&#8801;</div>
        <div class="section-header-text">
            <h2>Table of Contents</h2>
            <p>Navigate to sections using the links below</p>
        </div>
    </div>
    <div class="section-body">
        <ul class="toc-list">
            <li>
                <a href="#executive-summary">1. Executive Summary</a>
                <span class="toc-page-num"></span>
            </li>
            <li>
                <a href="#scope-methodology">2. Assessment Scope &amp; Methodology</a>
                <span class="toc-page-num"></span>
            </li>
            <li>
                <a href="#dashboard">3. Compliance Dashboard</a>
                <span class="toc-page-num"></span>
            </li>
            <li>
                <a href="#findings">4. Key Findings &amp; Issues</a>
                <span class="toc-page-num">({findings_count} findings)</span>
            </li>
            <li>
                <a href="#control-analysis">5. Control-by-Control Analysis</a>
                <span class="toc-page-num"></span>
            </li>
            {family_items}
            <li>
                <a href="#policy-analysis">6. Policy Gap Analysis</a>
                <span class="toc-page-num"></span>
            </li>
            <li>
                <a href="#recommendations">7. Recommendations Register</a>
                <span class="toc-page-num"></span>
            </li>
            <li>
                <a href="#appendix-evidence">Appendix A: Evidence Inventory</a>
                <span class="toc-page-num"></span>
            </li>
            <li>
                <a href="#appendix-glossary">Appendix B: Glossary</a>
                <span class="toc-page-num"></span>
            </li>
        </ul>
    </div>
</div>
"""


def _build_executive_summary(project, stats: dict, control_statuses, accent: str) -> str:
    pct = stats['pct']
    risk_label = _risk_label_from_pct(pct)
    risk_color = _pct_color(pct)

    total = stats['total']
    implemented = stats['implemented']
    partial = stats['partial']
    in_progress = stats['in_progress']
    planned = stats['planned']
    not_applicable = stats['not_applicable']
    not_started = stats['not_started']
    evidence_total = stats['evidence_total']
    effective = stats['effective']

    def _pct_of(n):
        return f"{round(n / total * 100, 1)}%" if total > 0 else "0%"

    # Top 5 gaps (NOT_STARTED first, then PARTIALLY_IMPLEMENTED)
    gaps = [cs for cs in control_statuses
            if not getattr(cs.control, 'is_category', False)
            and cs.status in ('NOT_STARTED', 'PARTIALLY_IMPLEMENTED', 'IN_PROGRESS', 'PLANNED')]
    gaps_sorted = sorted(
        gaps,
        key=lambda cs: (
            {'NOT_STARTED': 0, 'PARTIALLY_IMPLEMENTED': 1, 'IN_PROGRESS': 2, 'PLANNED': 3}.get(cs.status, 4),
            cs.control.order
        )
    )
    top5 = gaps_sorted[:5]

    top5_html = ''
    for cs in top5:
        top5_html += f"""
        <tr>
            <td class="td-mono">{_e(cs.control.control_id)}</td>
            <td>{_e(cs.control.title)}</td>
            <td>{_status_badge(cs.status)}</td>
            <td>{_risk_badge(RISK_FOR_STATUS.get(cs.status, 'Low'))}</td>
        </tr>"""
    if not top5_html:
        top5_html = '<tr><td colspan="4" style="color:#888;font-style:italic;">No critical gaps identified — excellent posture!</td></tr>'

    # Top recommendations
    rec_items = ''
    rec_statuses = ['NOT_STARTED', 'PARTIALLY_IMPLEMENTED', 'IN_PROGRESS', 'PLANNED']
    top_recs = [cs for cs in control_statuses
                if not getattr(cs.control, 'is_category', False)
                and cs.status in rec_statuses]
    top_recs = sorted(top_recs, key=lambda cs: rec_statuses.index(cs.status))[:5]
    for cs in top_recs:
        rec_text = _generate_recommendation(cs)
        rec_items += f'<li style="margin-bottom:10px;line-height:1.6;">{_e(rec_text)}</li>'
    if not rec_items:
        rec_items = '<li>Continue to monitor and maintain current control implementations.</li>'

    # Assessor conclusion
    if pct >= 85:
        conclusion = (
            f"The organisation demonstrates a strong information security posture with {pct}% of "
            f"applicable controls implemented. The assessment findings indicate a mature approach to "
            f"security governance. The identified gaps, while limited, should be addressed to "
            f"achieve full compliance and further strengthen the overall security programme. "
            f"OziCyber commends the organisation on its commitment to information security."
        )
    elif pct >= 70:
        conclusion = (
            f"The organisation demonstrates a moderate information security posture with {pct}% of "
            f"applicable controls implemented. Whilst the foundational controls appear to be in "
            f"place, a number of important gaps have been identified that require structured "
            f"remediation. OziCyber recommends the development of a prioritised remediation "
            f"roadmap to address the identified findings within agreed timeframes."
        )
    elif pct >= 40:
        conclusion = (
            f"The assessment has identified significant gaps in the organisation's information "
            f"security control environment, with only {pct}% of applicable controls implemented. "
            f"Substantial investment in people, process, and technology will be required to "
            f"achieve compliance with the referenced framework. OziCyber strongly recommends "
            f"the immediate establishment of a formal remediation programme with executive "
            f"sponsorship and adequate resourcing."
        )
    else:
        conclusion = (
            f"The assessment has identified critical deficiencies in the organisation's information "
            f"security control environment, with only {pct}% of applicable controls implemented. "
            f"The organisation faces significant exposure to security threats and regulatory risk. "
            f"OziCyber urges the organisation to treat this assessment as a matter of urgent "
            f"priority and to immediately engage executive leadership to allocate the resources "
            f"necessary to commence a comprehensive remediation programme."
        )

    proj_desc = (project.description or '').strip()
    framework_name = _e(project.framework.name)
    proj_title = _e(project.title)

    purpose_text = (
        f"OziCyber has conducted a gap analysis of {proj_title}'s information security controls "
        f"against the requirements of the {framework_name}. "
    )
    if proj_desc:
        purpose_text += f"{_e(proj_desc)} "
    purpose_text += (
        f"The purpose of this assessment is to identify gaps between the organisation's current "
        f"control environment and the requirements of the framework, to quantify the organisation's "
        f"compliance posture, and to provide actionable recommendations to address identified "
        f"deficiencies. The assessment covered {total} controls across "
        f"{len([fs for fs in ([] if not hasattr(control_statuses, '__iter__') else []) or []])} "
        f"control families."
    )

    # Posture box colors
    posture_bg = {
        'Critical Risk': '#fff5f5',
        'High Risk':     '#fff8f0',
        'Moderate Risk': '#fffbf0',
        'Low Risk':      '#f0fff4',
    }.get(risk_label, '#f5f5f5')

    return f"""
<!-- ========== EXECUTIVE SUMMARY ========== -->
<div id="executive-summary" class="section-container page-break">
    <div class="section-header">
        <div class="section-number">1</div>
        <div class="section-header-text">
            <h2>Executive Summary</h2>
            <p>High-level overview of assessment findings and compliance posture</p>
        </div>
    </div>
    <div class="section-body">

        <h3 class="subsection-title">Assessment Purpose &amp; Scope</h3>
        <p class="info-paragraph">
            OziCyber has conducted a comprehensive gap analysis of <strong>{proj_title}</strong>'s
            information security controls against the requirements of <strong>{framework_name}</strong>.
            {"<br><br>" + _e(proj_desc) if proj_desc else ""}
            The purpose of this assessment is to identify gaps between the organisation's current
            control environment and the requirements of the framework, to quantify the overall
            compliance posture, and to provide prioritised, actionable recommendations to address
            identified deficiencies. The assessment evaluated <strong>{total} controls</strong>
            across all applicable control families.
        </p>

        <h3 class="subsection-title">Overall Compliance Posture</h3>
        <div class="posture-box avoid-break" style="
            background:{posture_bg};
            border-color:{risk_color};
            border-left-color:{risk_color};
        ">
            <div class="posture-pct" style="color:{risk_color};">
                {pct}<span class="posture-pct-small">%</span>
            </div>
            <div>
                <div class="posture-label" style="color:{risk_color};">{risk_label}</div>
                <div class="posture-desc" style="color:#555;">
                    <strong>{implemented}</strong> of <strong>{effective}</strong> applicable controls
                    are fully implemented. <strong>{partial}</strong> are partially implemented and
                    <strong>{not_started}</strong> have not yet been commenced.
                    {"This represents a strong security posture." if pct >= 85
                     else "Structured remediation is required to improve the organisation's security posture."
                    }
                </div>
            </div>
        </div>

        <h3 class="subsection-title">Key Statistics</h3>
        <table class="avoid-break">
            <thead>
                <tr>
                    <th>Metric</th>
                    <th class="td-center">Count</th>
                    <th class="td-center">% of Total</th>
                    <th style="width:200px;">Visual</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="text-bold">Total Controls Assessed</td>
                    <td class="td-center text-bold">{total}</td>
                    <td class="td-center">100%</td>
                    <td></td>
                </tr>
                <tr>
                    <td>&#9679; Implemented</td>
                    <td class="td-center">{implemented}</td>
                    <td class="td-center">{_pct_of(implemented)}</td>
                    <td>
                        <div class="progress-track">
                            <div class="progress-fill" style="width:{_pct_of(implemented)};background:#27ae60;"></div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>&#9679; Partially Implemented</td>
                    <td class="td-center">{partial}</td>
                    <td class="td-center">{_pct_of(partial)}</td>
                    <td>
                        <div class="progress-track">
                            <div class="progress-fill" style="width:{_pct_of(partial)};background:#f39c12;"></div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>&#9679; In Progress</td>
                    <td class="td-center">{in_progress}</td>
                    <td class="td-center">{_pct_of(in_progress)}</td>
                    <td>
                        <div class="progress-track">
                            <div class="progress-fill" style="width:{_pct_of(in_progress)};background:#3498db;"></div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>&#9679; Planned</td>
                    <td class="td-center">{planned}</td>
                    <td class="td-center">{_pct_of(planned)}</td>
                    <td>
                        <div class="progress-track">
                            <div class="progress-fill" style="width:{_pct_of(planned)};background:#8e44ad;"></div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>&#9679; Not Started</td>
                    <td class="td-center">{not_started}</td>
                    <td class="td-center">{_pct_of(not_started)}</td>
                    <td>
                        <div class="progress-track">
                            <div class="progress-fill" style="width:{_pct_of(not_started)};background:#e74c3c;"></div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>&#9679; Not Applicable</td>
                    <td class="td-center">{not_applicable}</td>
                    <td class="td-center">{_pct_of(not_applicable)}</td>
                    <td>
                        <div class="progress-track">
                            <div class="progress-fill" style="width:{_pct_of(not_applicable)};background:#95a5a6;"></div>
                        </div>
                    </td>
                </tr>
                <tr style="background:#e8f4fd;">
                    <td><strong>Total Evidence Items Submitted</strong></td>
                    <td class="td-center"><strong>{evidence_total}</strong></td>
                    <td class="td-center">&mdash;</td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <h3 class="subsection-title">Top 5 Critical Gaps</h3>
        <table class="avoid-break">
            <thead>
                <tr>
                    <th style="width:110px;">Control ID</th>
                    <th>Control Title</th>
                    <th style="width:180px;">Status</th>
                    <th style="width:100px;">Risk</th>
                </tr>
            </thead>
            <tbody>
                {top5_html}
            </tbody>
        </table>

        <h3 class="subsection-title">Top 5 Priority Recommendations</h3>
        <ol style="padding-left:20px;">
            {rec_items}
        </ol>

        <h3 class="subsection-title">Assessor Conclusion</h3>
        <div class="highlight-box">
            <p style="font-size:14px;line-height:1.8;color:#333;">{_e(conclusion)}</p>
        </div>

    </div>
</div>
"""


def _build_scope_methodology(project, accent: str) -> str:
    framework_key = project.framework.key
    framework_name = _e(project.framework.name)
    fw_desc = FRAMEWORK_DESCRIPTION.get(framework_key, (
        f"This assessment was conducted against {framework_name}, a recognised information security "
        f"framework providing structured guidance for establishing and maintaining effective "
        f"security controls."
    ))

    notes_html = ''
    if project.notes:
        notes_html = f"""
        <h3 class="subsection-title">Engagement Notes</h3>
        <div class="control-notes-text">{_e(project.notes)}</div>
        """

    return f"""
<!-- ========== SCOPE & METHODOLOGY ========== -->
<div id="scope-methodology" class="section-container page-break">
    <div class="section-header">
        <div class="section-number">2</div>
        <div class="section-header-text">
            <h2>Assessment Scope &amp; Methodology</h2>
            <p>Framework overview, assessment approach, and limitations</p>
        </div>
    </div>
    <div class="section-body">

        <h3 class="subsection-title">Framework Overview: {framework_name}</h3>
        <p class="info-paragraph">{_e(fw_desc)}</p>

        <h3 class="subsection-title">Assessment Methodology</h3>
        <p class="info-paragraph">
            The gap analysis was conducted using a structured, evidence-based methodology.
            Each control within the framework was individually assessed against the following
            criteria:
        </p>
        <ul style="padding-left:20px;margin-bottom:16px;line-height:2;">
            <li><strong>Documentation Review:</strong> Examination of policies, procedures, standards,
                and other governance documents provided by the organisation.</li>
            <li><strong>Evidence Collection:</strong> Review of technical and procedural evidence
                submitted by control owners, including screenshots, configuration exports, logs,
                and certificates.</li>
            <li><strong>Stakeholder Input:</strong> Consideration of implementation notes and context
                provided by control owners and project stakeholders.</li>
            <li><strong>Control Mapping:</strong> Each control was mapped to one of six implementation
                statuses: Implemented, Partially Implemented, In Progress, Planned,
                Not Started, or Not Applicable.</li>
            <li><strong>Risk Rating:</strong> Gap controls were assigned a risk rating (High, Medium,
                or Low) based on the implementation status and the criticality of the control.</li>
        </ul>

        <h3 class="subsection-title">Status Definitions</h3>
        <table class="avoid-break">
            <thead>
                <tr>
                    <th style="width:180px;">Status</th>
                    <th>Definition</th>
                    <th style="width:80px;">Risk Impact</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{_status_badge('IMPLEMENTED')}</td>
                    <td>The control has been fully implemented, documented, and evidence has been or can be provided to demonstrate effectiveness.</td>
                    <td style="color:#27ae60;font-weight:700;">None</td>
                </tr>
                <tr>
                    <td>{_status_badge('PARTIALLY_IMPLEMENTED')}</td>
                    <td>Some elements of the control are in place but the implementation does not fully meet framework requirements. Gaps remain.</td>
                    <td style="color:#f39c12;font-weight:700;">Medium</td>
                </tr>
                <tr>
                    <td>{_status_badge('IN_PROGRESS')}</td>
                    <td>Active work is underway to implement this control. Implementation is not yet complete.</td>
                    <td style="color:#3498db;font-weight:700;">Low–Medium</td>
                </tr>
                <tr>
                    <td>{_status_badge('PLANNED')}</td>
                    <td>Implementation has been planned and is scheduled to commence in the future. No active implementation work has begun.</td>
                    <td style="color:#8e44ad;font-weight:700;">Low–High</td>
                </tr>
                <tr>
                    <td>{_status_badge('NOT_STARTED')}</td>
                    <td>No implementation activity has commenced. No evidence or planning documentation exists for this control.</td>
                    <td style="color:#e74c3c;font-weight:700;">High</td>
                </tr>
                <tr>
                    <td>{_status_badge('NOT_APPLICABLE')}</td>
                    <td>The organisation has determined that this control does not apply to its environment. Excluded from compliance calculations.</td>
                    <td style="color:#95a5a6;font-weight:700;">N/A</td>
                </tr>
            </tbody>
        </table>

        <h3 class="subsection-title">Assessment Limitations</h3>
        <div class="notice-box" style="border-color:#ddd;background:#f9f9f9;">
            <p style="color:#555;">
                The following limitations should be considered when interpreting the results of
                this assessment:
            </p>
            <ul style="padding-left:20px;margin-top:10px;line-height:2;color:#555;font-size:13px;">
                <li>This assessment is a point-in-time evaluation and may not reflect changes made
                    subsequent to the assessment date.</li>
                <li>The assessment is based on self-reported information and submitted evidence.
                    OziCyber has not independently verified all claims.</li>
                <li>Not all controls could be fully assessed where evidence or implementation notes
                    were not provided.</li>
                <li>This report does not constitute formal certification or accreditation against
                    the referenced framework.</li>
                <li>The compliance percentage is calculated against applicable controls only and
                    excludes controls assessed as Not Applicable.</li>
            </ul>
        </div>

        {notes_html}

    </div>
</div>
"""


def _build_dashboard(stats: dict, family_stats: list, accent: str) -> str:
    pct         = stats['pct']
    risk_label  = _risk_label_from_pct(pct)
    risk_color  = _pct_color(pct)
    total       = stats['total']
    effective   = stats['effective']
    implemented = stats['implemented']

    # Status breakdown rows
    status_rows = ''
    for s_key, s_label in STATUS_LABEL.items():
        count = {
            'IMPLEMENTED':           stats['implemented'],
            'PARTIALLY_IMPLEMENTED': stats['partial'],
            'IN_PROGRESS':           stats['in_progress'],
            'PLANNED':               stats['planned'],
            'NOT_STARTED':           stats['not_started'],
            'NOT_APPLICABLE':        stats['not_applicable'],
        }.get(s_key, 0)
        s_pct = round(count / total * 100, 1) if total > 0 else 0
        color = STATUS_COLOR.get(s_key, '#999')
        status_rows += f"""
        <tr>
            <td>{_status_badge(s_key)}</td>
            <td class="td-center">{count}</td>
            <td class="td-center">{s_pct}%</td>
            <td style="width:200px;">
                <div class="progress-track">
                    <div class="progress-fill" style="width:{s_pct}%;background:{color};"></div>
                </div>
            </td>
        </tr>"""

    # Family stats table
    family_rows = ''
    for fam in family_stats:
        fam_total = fam.get('total', 0)
        fam_impl = fam.get('implemented', 0)
        fam_partial = fam.get('partial', 0)
        fam_inp = fam.get('in_progress', 0)
        fam_ns = max(fam_total - fam_impl - fam_partial - fam_inp
                     - fam.get('not_applicable', 0) - fam.get('planned', 0), 0)
        fam_pct = fam.get('pct', 0)
        fam_color = _pct_color(fam_pct)
        family_rows += f"""
        <tr>
            <td class="td-mono">{_e(str(fam.get('identifier', '')))}</td>
            <td>{_e(str(fam.get('name', '')))}</td>
            <td class="td-center">{fam_total}</td>
            <td class="td-center" style="color:#27ae60;font-weight:700;">{fam_impl}</td>
            <td class="td-center" style="color:#f39c12;font-weight:700;">{fam_partial}</td>
            <td class="td-center" style="color:#3498db;font-weight:700;">{fam_inp}</td>
            <td class="td-center" style="color:#e74c3c;font-weight:700;">{fam_ns}</td>
            <td class="td-center">
                <span style="color:{fam_color};font-weight:800;">{fam_pct}%</span>
                <div class="progress-track" style="margin-top:4px;">
                    <div class="progress-fill" style="width:{fam_pct}%;background:{fam_color};"></div>
                </div>
            </td>
        </tr>"""

    if not family_rows:
        family_rows = '<tr><td colspan="8" style="color:#888;font-style:italic;">No family data available.</td></tr>'

    # Risk rating summary
    critical_count = 0
    high_count = stats['not_started']
    medium_count = stats['partial']
    low_count = stats['in_progress'] + stats['planned']

    return f"""
<!-- ========== COMPLIANCE DASHBOARD ========== -->
<div id="dashboard" class="section-container page-break">
    <div class="section-header">
        <div class="section-number">3</div>
        <div class="section-header-text">
            <h2>Compliance Dashboard</h2>
            <p>Visual overview of compliance status and control distribution</p>
        </div>
    </div>
    <div class="section-body">

        <h3 class="subsection-title">Overall Compliance Meter</h3>
        <div class="big-gauge-wrap avoid-break">
            <div class="big-gauge-label" style="color:{risk_color};">{pct}%</div>
            <div style="font-size:16px;color:{risk_color};font-weight:700;margin:4px 0;">{risk_label}</div>
            <div class="big-gauge-sub">{implemented} of {effective} applicable controls implemented</div>
            <div class="big-progress-track">
                <div class="big-progress-fill" style="width:{pct}%;background:{risk_color};"></div>
            </div>
            <div style="display:flex;justify-content:space-between;max-width:700px;margin:4px auto;font-size:11px;color:#999;">
                <span>0%</span>
                <span style="color:#c62828;">Critical &lt;40%</span>
                <span style="color:#e65100;">High 40–69%</span>
                <span style="color:#f57f17;">Moderate 70–84%</span>
                <span style="color:#2e7d32;">Low 85%+</span>
                <span>100%</span>
            </div>
        </div>

        <div class="four-col avoid-break" style="margin:24px 0;">
            <div class="card-metric">
                <div class="card-metric-value" style="color:#27ae60;">{stats['implemented']}</div>
                <div class="card-metric-label">Implemented</div>
            </div>
            <div class="card-metric">
                <div class="card-metric-value" style="color:#f39c12;">{stats['partial']}</div>
                <div class="card-metric-label">Partial</div>
            </div>
            <div class="card-metric">
                <div class="card-metric-value" style="color:#e74c3c;">{stats['not_started']}</div>
                <div class="card-metric-label">Not Started</div>
            </div>
            <div class="card-metric">
                <div class="card-metric-value" style="color:#95a5a6;">{stats['not_applicable']}</div>
                <div class="card-metric-label">Not Applicable</div>
            </div>
        </div>

        <h3 class="subsection-title">Status Breakdown</h3>
        <table class="avoid-break">
            <thead>
                <tr>
                    <th>Status</th>
                    <th class="td-center">Count</th>
                    <th class="td-center">% of Total</th>
                    <th>Distribution</th>
                </tr>
            </thead>
            <tbody>
                {status_rows}
            </tbody>
        </table>

        <h3 class="subsection-title">Family-by-Family Compliance</h3>
        <table>
            <thead>
                <tr>
                    <th style="width:80px;">Family ID</th>
                    <th>Family Name</th>
                    <th class="td-center">Total</th>
                    <th class="td-center">Impl.</th>
                    <th class="td-center">Partial</th>
                    <th class="td-center">In Prog.</th>
                    <th class="td-center">Not Started</th>
                    <th style="width:130px;">Compliance %</th>
                </tr>
            </thead>
            <tbody>
                {family_rows}
            </tbody>
        </table>

        <h3 class="subsection-title">Risk Rating Summary</h3>
        <table class="avoid-break" style="max-width:500px;">
            <thead>
                <tr>
                    <th>Risk Rating</th>
                    <th class="td-center">Finding Count</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{_risk_badge('Critical')}</td>
                    <td class="td-center">{critical_count}</td>
                    <td style="font-size:12px;color:#666;">Requires immediate executive attention and emergency response</td>
                </tr>
                <tr>
                    <td>{_risk_badge('High')}</td>
                    <td class="td-center">{high_count}</td>
                    <td style="font-size:12px;color:#666;">Controls not started; significant exposure; prioritise for immediate remediation</td>
                </tr>
                <tr>
                    <td>{_risk_badge('Medium')}</td>
                    <td class="td-center">{medium_count}</td>
                    <td style="font-size:12px;color:#666;">Partially implemented; residual gaps exist; schedule remediation within 90 days</td>
                </tr>
                <tr>
                    <td>{_risk_badge('Low')}</td>
                    <td class="td-center">{low_count}</td>
                    <td style="font-size:12px;color:#666;">In progress or planned; monitor to ensure timely completion</td>
                </tr>
            </tbody>
        </table>

    </div>
</div>
"""


def _build_findings(control_statuses, accent: str) -> str:
    findings = _get_findings(control_statuses)

    if not findings:
        return f"""
<div id="findings" class="section-container page-break">
    <div class="section-header">
        <div class="section-number">4</div>
        <div class="section-header-text">
            <h2>Key Findings &amp; Issues</h2>
            <p>Detailed analysis of identified gaps and issues</p>
        </div>
    </div>
    <div class="section-body">
        <div class="highlight-box" style="text-align:center;">
            <p style="font-size:18px;color:#27ae60;font-weight:700;">
                No gaps identified. All applicable controls are implemented.
            </p>
        </div>
    </div>
</div>
"""

    # Sort: NOT_STARTED > PARTIALLY_IMPLEMENTED > IN_PROGRESS > PLANNED
    priority_order = {'NOT_STARTED': 0, 'PARTIALLY_IMPLEMENTED': 1, 'IN_PROGRESS': 2, 'PLANNED': 3}
    findings_sorted = sorted(findings, key=lambda cs: (
        priority_order.get(cs.status, 9),
        cs.control.order
    ))

    cards_html = ''
    for idx, cs in enumerate(findings_sorted, 1):
        finding_id = f"F-{idx:03d}"
        status = cs.status
        risk = RISK_FOR_STATUS.get(status, 'Low')
        finding_desc = _generate_finding_description(cs)
        recommendation = _generate_recommendation(cs)

        # Current state
        notes = (cs.implementation_notes or '').strip()
        current_state = _e(notes) if notes else 'No implementation evidence or notes have been provided.'

        # Evidence
        ev_list = _get_evidence_list(cs)
        ev_count = len(ev_list)
        if ev_count > 0:
            ev_html = f'<strong>{ev_count}</strong> evidence item(s) submitted: '
            titles = [_e(ev.title or 'Untitled') for ev in ev_list[:5]]
            ev_html += ', '.join(titles)
            if ev_count > 5:
                ev_html += f', ... (+{ev_count - 5} more)'
        else:
            ev_html = '<span style="color:#e74c3c;">No evidence items attached.</span>'

        border_color = STATUS_COLOR.get(status, '#ddd')

        cards_html += f"""
<div id="finding-{finding_id}" class="finding-card avoid-break">
    <div class="finding-card-header">
        <span class="finding-id">{finding_id}</span>
        <span class="finding-control-ref">{_e(cs.control.control_id)}</span>
        <span class="finding-title">{_e(cs.control.title)}</span>
        <span>{_status_badge(status)}</span>
        <span>{_risk_badge(risk)}</span>
    </div>
    <div class="finding-body" style="border-left:4px solid {border_color};">
        <div class="finding-row">
            <div class="finding-row-label">Description</div>
            <div class="finding-description">{_e(finding_desc)}</div>
        </div>
        <div class="finding-row">
            <div class="finding-row-label">Current State</div>
            <div>
                <div class="finding-current-state">{current_state}</div>
            </div>
        </div>
        <div class="finding-row">
            <div class="finding-row-label">Evidence</div>
            <div style="font-size:13px;">{ev_html}</div>
        </div>
        <div class="finding-row">
            <div class="finding-row-label">Recommendation</div>
            <div>
                <div class="finding-recommendation">{_e(recommendation)}</div>
            </div>
        </div>
    </div>
</div>"""

    return f"""
<!-- ========== KEY FINDINGS ========== -->
<div id="findings" class="section-container page-break">
    <div class="section-header">
        <div class="section-number">4</div>
        <div class="section-header-text">
            <h2>Key Findings &amp; Issues</h2>
            <p>{len(findings_sorted)} gap(s) identified requiring remediation</p>
        </div>
    </div>
    <div class="section-body">
        <p class="info-paragraph">
            The following findings have been identified based on the gap analysis. Each finding
            represents a control that has not been fully implemented. Findings are ordered by
            risk priority, with the highest-risk items presented first. Each finding includes a
            description of the gap, the current state of implementation, and a specific
            recommendation for remediation.
        </p>
        {cards_html}
    </div>
</div>
"""


def _build_control_analysis(control_statuses, family_stats: list, accent: str) -> str:
    # Build a map: family_id -> list of control statuses
    family_map: dict = {}
    for cs in control_statuses:
        if getattr(cs.control, 'is_category', False):
            continue
        fam_id = cs.control.family_id
        if fam_id not in family_map:
            family_map[fam_id] = []
        family_map[fam_id].append(cs)

    families_html = ''
    for fam in family_stats:
        fam_id = fam.get('id')
        fam_identifier = _e(str(fam.get('identifier', '')))
        fam_name = _e(str(fam.get('name', '')))
        fam_total = fam.get('total', 0)
        fam_impl = fam.get('implemented', 0)
        fam_partial = fam.get('partial', 0)
        fam_inp = fam.get('in_progress', 0)
        fam_pct = fam.get('pct', 0)
        fam_color = _pct_color(fam_pct)

        controls_in_family = sorted(
            family_map.get(fam_id, []),
            key=lambda cs: cs.control.order
        )

        controls_html = ''
        for cs in controls_in_family:
            status = cs.status
            border_color = STATUS_COLOR.get(status, '#ddd')
            notes = (cs.implementation_notes or '').strip()
            statement = (cs.control.statement or '').strip()
            gap_text = _generate_gap_analysis_text(cs)

            # Evidence
            ev_list = _get_evidence_list(cs)
            if ev_list:
                ev_items = ''
                for ev in ev_list:
                    ev_type = 'File' if (ev.file and str(ev.file)) else ('URL' if ev.url else 'Note')
                    ev_url_html = ''
                    if ev.url:
                        ev_url_html = f' &mdash; <a href="{_e(ev.url)}" style="color:{accent};font-size:11px;">{_e(ev.url[:60])}</a>'
                    elif ev.file and str(ev.file):
                        ev_url_html = f' &mdash; <span style="font-size:11px;color:#888;">[File attached]</span>'
                    ev_desc_html = f'<div style="color:#666;margin-top:2px;">{_e(ev.description)}</div>' if ev.description else ''
                    uploaded_at = _fmt_date(ev.uploaded_at) if hasattr(ev, 'uploaded_at') else ''
                    uploader = ''
                    if hasattr(ev, 'uploaded_by') and ev.uploaded_by:
                        try:
                            name = f"{ev.uploaded_by.first_name} {ev.uploaded_by.last_name}".strip()
                            uploader = _e(name or ev.uploaded_by.email)
                        except Exception:
                            pass
                    ev_items += f"""
<li class="evidence-item">
    <div class="evidence-item-title">{_e(ev.title or 'Untitled')} {ev_url_html}</div>
    {ev_desc_html}
    <div class="evidence-item-meta">
        Type: {ev_type}
        {f"&nbsp;&bull;&nbsp;Uploaded: {uploaded_at}" if uploaded_at else ""}
        {f"&nbsp;&bull;&nbsp;By: {uploader}" if uploader else ""}
    </div>
</li>"""
                ev_section = f'<ul class="evidence-list">{ev_items}</ul>'
            else:
                ev_section = '<p class="no-evidence-note">No evidence items attached for this control.</p>'

            # Owner / dates row
            owner_parts = []
            owner_name = getattr(cs, 'owner_name', None)
            if owner_name:
                owner_parts.append(f'<div class="control-owner-item"><span class="control-owner-label">Owner:</span> {_e(owner_name)}</div>')
            if cs.due_date:
                owner_parts.append(f'<div class="control-owner-item"><span class="control-owner-label">Due Date:</span> {_fmt_date(cs.due_date)}</div>')
            if cs.review_date:
                owner_parts.append(f'<div class="control-owner-item"><span class="control-owner-label">Review Date:</span> {_fmt_date(cs.review_date)}</div>')
            updated = _fmt_date(cs.updated_at) if hasattr(cs, 'updated_at') else ''
            if updated:
                owner_parts.append(f'<div class="control-owner-item"><span class="control-owner-label">Last Updated:</span> {updated}</div>')

            owner_row = f'<div class="control-owner-row">{"".join(owner_parts)}</div>' if owner_parts else ''

            statement_html = f'<div class="control-statement-box">{_e(statement)}</div>' if statement else ''
            notes_html = f'<div class="control-notes-text">{_e(notes)}</div>' if notes else '<p style="font-size:12px;color:#aaa;font-style:italic;">Not yet documented.</p>'

            controls_html += f"""
<div class="control-card">
    <div class="control-card-inner" style="border-left-color:{border_color};">
        <div class="control-card-header">
            <span class="control-id-chip">{_e(cs.control.control_id)}</span>
            <span class="control-title-text">{_e(cs.control.title)}</span>
            <span>{_status_badge(status)}</span>
        </div>
        {statement_html}

        <div class="control-sub-label">Implementation Notes</div>
        {notes_html}

        <div class="control-sub-label">Evidence Inventory</div>
        {ev_section}

        <div class="control-sub-label">Gap Analysis</div>
        <div class="control-gap-analysis">{_e(gap_text)}</div>

        {owner_row}
    </div>
</div>"""

        if not controls_html:
            controls_html = '<div style="padding:16px 24px;color:#aaa;font-style:italic;border:1px solid #eee;">No controls assessed for this family.</div>'

        families_html += f"""
<div id="family-{fam_id}" class="family-section page-break">
    <div class="family-header">
        <span class="family-identifier">{fam_identifier}</span>
        <span class="family-name">{fam_name}</span>
        <div class="family-stats-chips">
            <span class="family-stat-chip">{fam_total} controls</span>
            <span class="family-stat-chip" style="background:rgba(39,174,96,0.3);">{fam_impl} implemented</span>
            <span class="family-stat-chip" style="background:rgba(243,156,18,0.3);">{fam_partial} partial</span>
            <span class="family-stat-chip" style="background:rgba(52,152,219,0.3);">{fam_inp} in progress</span>
            <span class="family-stat-chip" style="color:{fam_color};background:rgba(0,0,0,0.2);">{fam_pct}%</span>
        </div>
    </div>
    {controls_html}
</div>"""

    if not families_html:
        families_html = '<p class="text-muted">No family data available.</p>'

    return f"""
<!-- ========== CONTROL ANALYSIS ========== -->
<div id="control-analysis" class="section-container page-break">
    <div class="section-header">
        <div class="section-number">5</div>
        <div class="section-header-text">
            <h2>Control-by-Control Analysis</h2>
            <p>Detailed assessment of every control, organised by family</p>
        </div>
    </div>
    <div class="section-body">
        <p class="info-paragraph">
            This section provides a comprehensive analysis of every control within the framework,
            organised by control family. For each control, the current implementation status,
            implementation notes, evidence inventory, and gap analysis narrative are presented.
            Controls assessed as "Not Applicable" are included for completeness and auditability.
        </p>
        {families_html}
    </div>
</div>
"""


def _build_policy_analysis(control_statuses, framework_key: str, accent: str) -> str:
    expected = EXPECTED_POLICIES.get(framework_key, [])
    observed = _gather_policy_evidence(control_statuses)
    observed_titles = [p['title'].lower() for p in observed]

    # Match expected to observed
    def _is_observed(policy_name: str) -> bool:
        pn_lower = policy_name.lower()
        # Check for keyword overlap
        keywords = [w for w in pn_lower.split() if len(w) > 3]
        return any(
            any(kw in obs for kw in keywords)
            for obs in observed_titles
        )

    expected_rows = ''
    gap_policies = []
    observed_set = set()

    for pol in expected:
        obs = _is_observed(pol)
        status_html = '<span class="policy-status-ok">&#10003; Observed</span>' if obs else '<span class="policy-status-missing">&#10007; Gap</span>'
        if obs:
            # find matching items
            matches = []
            pol_lower = pol.lower()
            kws = [w for w in pol_lower.split() if len(w) > 3]
            for o in observed:
                if any(kw in o['title'].lower() for kw in kws):
                    matches.append(_e(o['title']))
                    observed_set.add(o['title'])
            matched_str = ', '.join(matches[:3]) if matches else 'Inferred from evidence'
            expected_rows += f"""
<tr>
    <td>{_e(pol)}</td>
    <td>{status_html}</td>
    <td style="font-size:12px;color:#555;">{matched_str}</td>
</tr>"""
        else:
            gap_policies.append(pol)
            expected_rows += f"""
<tr style="background:#fff9f9;">
    <td>{_e(pol)}</td>
    <td>{status_html}</td>
    <td style="font-size:12px;color:#aaa;font-style:italic;">Not found in evidence</td>
</tr>"""

    if not expected_rows:
        expected_rows = '<tr><td colspan="3" style="color:#888;font-style:italic;">No expected policies defined for this framework.</td></tr>'

    # Observed policy rows
    observed_rows = ''
    for p in observed:
        ctrl_ref = _e(p.get('control_id', ''))
        desc = _e(_truncate(p.get('description', ''), 80))
        observed_rows += f"""
<tr>
    <td>{_e(p['title'])}</td>
    <td class="td-mono" style="font-size:11px;">{ctrl_ref}</td>
    <td style="font-size:12px;color:#555;">{desc}</td>
</tr>"""
    if not observed_rows:
        observed_rows = '<tr><td colspan="3" style="color:#aaa;font-style:italic;">No policy-related evidence items found.</td></tr>'

    # Gap list
    gap_html = ''
    if gap_policies:
        for gp in gap_policies:
            gap_html += f'<li style="margin-bottom:8px;line-height:1.6;">{_e(gp)}: This policy document was not found in the evidence inventory. Develop and formally approve this document as a priority.</li>'
        gap_html = f'<ul style="padding-left:20px;">{gap_html}</ul>'
    else:
        gap_html = '<p style="color:#27ae60;font-weight:700;">&#10003; All expected policy documents were observed in the evidence inventory.</p>'

    gap_count = len(gap_policies)
    obs_count = len(observed)

    return f"""
<!-- ========== POLICY ANALYSIS ========== -->
<div id="policy-analysis" class="section-container page-break">
    <div class="section-header">
        <div class="section-number">6</div>
        <div class="section-header-text">
            <h2>Policy Gap Analysis</h2>
            <p>Assessment of expected policy documentation against observed evidence</p>
        </div>
    </div>
    <div class="section-body">

        <p class="info-paragraph">
            Effective information security governance requires a comprehensive suite of policy
            documents to establish expectations, assign responsibilities, and provide a basis for
            accountability. This section compares the expected policy documents for the
            <strong>{_e(framework_key.replace('_', ' '))}</strong> framework against policy-related
            evidence items observed in the assessment evidence inventory.
        </p>

        <div class="four-col avoid-break" style="margin:20px 0;grid-template-columns:repeat(3,1fr);">
            <div class="card-metric">
                <div class="card-metric-value">{len(expected)}</div>
                <div class="card-metric-label">Expected Policies</div>
            </div>
            <div class="card-metric">
                <div class="card-metric-value" style="color:#27ae60;">{obs_count}</div>
                <div class="card-metric-label">Observed in Evidence</div>
            </div>
            <div class="card-metric">
                <div class="card-metric-value" style="color:#e74c3c;">{gap_count}</div>
                <div class="card-metric-label">Policy Gaps</div>
            </div>
        </div>

        <h3 class="subsection-title">Expected Policy Register</h3>
        <table class="avoid-break">
            <thead>
                <tr>
                    <th>Expected Policy Document</th>
                    <th style="width:140px;">Status</th>
                    <th>Observed Match</th>
                </tr>
            </thead>
            <tbody>
                {expected_rows}
            </tbody>
        </table>

        <h3 class="subsection-title">Observed Policy-Related Evidence</h3>
        <table class="avoid-break">
            <thead>
                <tr>
                    <th>Evidence Title</th>
                    <th style="width:100px;">Control Ref</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                {observed_rows}
            </tbody>
        </table>

        <h3 class="subsection-title">Policy Gaps &amp; Recommendations</h3>
        {gap_html}

        <h3 class="subsection-title">Policy Quality Notes</h3>
        <div class="highlight-box">
            <p>Beyond the existence of policy documents, the following quality attributes should
            be verified for each policy:</p>
            <ul style="padding-left:20px;margin-top:10px;line-height:2;">
                <li><strong>Approval:</strong> Formally approved by an appropriate authority (e.g., Board, CISO, executive leadership)</li>
                <li><strong>Version Control:</strong> Clearly versioned with change history maintained</li>
                <li><strong>Review Cycle:</strong> Reviewed at least annually, or following significant changes</li>
                <li><strong>Distribution:</strong> Communicated to all relevant staff and accessible when needed</li>
                <li><strong>Compliance Monitoring:</strong> Mechanisms in place to monitor and enforce policy compliance</li>
                <li><strong>Exception Management:</strong> Formal process for granting and tracking policy exceptions</li>
            </ul>
        </div>

    </div>
</div>
"""


def _build_recommendations(control_statuses, family_stats: list, accent: str) -> str:
    # Build family name lookup
    family_names: dict = {fam.get('id'): fam.get('name', '') for fam in family_stats}

    gap_statuses = {'NOT_STARTED', 'PARTIALLY_IMPLEMENTED', 'IN_PROGRESS', 'PLANNED'}
    priority_map = {
        'NOT_STARTED':           ('High',   'Immediate'),
        'PARTIALLY_IMPLEMENTED': ('Medium', 'Short-term'),
        'IN_PROGRESS':           ('Low',    'Medium-term'),
        'PLANNED':               ('Low',    'Medium-term'),
    }
    effort_map = {
        'NOT_STARTED':           'High',
        'PARTIALLY_IMPLEMENTED': 'Medium',
        'IN_PROGRESS':           'Low',
        'PLANNED':               'Medium',
    }

    recs = []
    for cs in control_statuses:
        if getattr(cs.control, 'is_category', False):
            continue
        if cs.status in gap_statuses:
            recs.append(cs)

    # Sort: NOT_STARTED > PARTIALLY_IMPLEMENTED > IN_PROGRESS > PLANNED
    priority_order = {'NOT_STARTED': 0, 'PARTIALLY_IMPLEMENTED': 1, 'IN_PROGRESS': 2, 'PLANNED': 3}
    recs_sorted = sorted(recs, key=lambda cs: (priority_order.get(cs.status, 9), cs.control.order))

    rows = ''
    for idx, cs in enumerate(recs_sorted, 1):
        rec_text = _generate_recommendation(cs)
        priority_label, timeframe = priority_map.get(cs.status, ('Medium', 'Short-term'))
        effort = effort_map.get(cs.status, 'Medium')
        fam_name = _e(family_names.get(cs.control.family_id, ''))
        p_class = {'High': 'rec-priority-high', 'Medium': 'rec-priority-medium', 'Low': 'rec-priority-low'}.get(priority_label, '')

        rows += f"""
<tr>
    <td class="td-center td-mono" style="font-size:12px;">R-{idx:03d}</td>
    <td class="td-mono" style="font-size:12px;">{_e(cs.control.control_id)}</td>
    <td style="font-size:12px;line-height:1.6;">{_e(rec_text)}</td>
    <td class="{p_class} td-center">{priority_label}</td>
    <td class="td-center" style="font-size:12px;">{timeframe}</td>
    <td class="td-center" style="font-size:12px;">{effort}</td>
    <td style="font-size:12px;">{fam_name}</td>
</tr>"""

    if not rows:
        rows = '<tr><td colspan="7" style="color:#888;font-style:italic;text-align:center;">No gaps identified — all applicable controls are implemented.</td></tr>'

    return f"""
<!-- ========== RECOMMENDATIONS ========== -->
<div id="recommendations" class="section-container page-break">
    <div class="section-header">
        <div class="section-number">7</div>
        <div class="section-header-text">
            <h2>Recommendations Register</h2>
            <p>Comprehensive list of remediation actions ordered by priority</p>
        </div>
    </div>
    <div class="section-body">
        <p class="info-paragraph">
            The following table presents all recommendations arising from this gap analysis,
            ordered by priority. Each recommendation is linked to the relevant control reference
            and includes an indicative timeframe and implementation effort rating.
            <strong>Priority: High</strong> items should be treated as immediate remediation actions.
            <strong>Priority: Medium</strong> items should be scheduled within 90 days.
            <strong>Priority: Low</strong> items should be tracked and completed within 180 days
            or by the agreed target date.
        </p>
        <table>
            <thead>
                <tr>
                    <th style="width:60px;">Rec #</th>
                    <th style="width:90px;">Control Ref</th>
                    <th>Recommendation</th>
                    <th style="width:75px;">Priority</th>
                    <th style="width:90px;">Timeframe</th>
                    <th style="width:60px;">Effort</th>
                    <th style="width:130px;">Family</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>
    </div>
</div>
"""


def _build_appendix_evidence(control_statuses, accent: str) -> str:
    rows = ''
    count = 0
    for cs in control_statuses:
        if getattr(cs.control, 'is_category', False):
            continue
        ev_list = _get_evidence_list(cs)
        for ev in ev_list:
            count += 1
            ev_type = 'File' if (ev.file and str(ev.file)) else ('URL' if ev.url else 'Note')
            location_html = ''
            if ev.url:
                location_html = f'<a href="{_e(ev.url)}" style="color:{accent};font-size:11px;word-break:break-all;">{_e(ev.url[:80])}</a>'
            elif ev.file and str(ev.file):
                location_html = f'<span style="font-size:11px;color:#888;">[File: {_e(str(ev.file).split("/")[-1])}]</span>'
            uploaded_at = _fmt_date(getattr(ev, 'uploaded_at', None))
            uploader = ''
            if hasattr(ev, 'uploaded_by') and ev.uploaded_by:
                try:
                    name = f"{ev.uploaded_by.first_name} {ev.uploaded_by.last_name}".strip()
                    uploader = name or ev.uploaded_by.email
                except Exception:
                    pass
            rows += f"""
<tr>
    <td class="td-mono" style="font-size:11px;">{_e(cs.control.control_id)}</td>
    <td style="font-size:12px;font-weight:600;">{_e(ev.title or 'Untitled')}</td>
    <td style="font-size:12px;color:#555;">{_e(_truncate(ev.description or '', 100))}</td>
    <td class="td-center" style="font-size:11px;">{ev_type}</td>
    <td style="font-size:11px;">{location_html}</td>
    <td style="font-size:11px;color:#888;">{uploaded_at}</td>
    <td style="font-size:11px;color:#888;">{_e(uploader)}</td>
</tr>"""

    if not rows:
        rows = '<tr><td colspan="7" style="color:#aaa;font-style:italic;text-align:center;">No evidence items have been submitted for this project.</td></tr>'

    return f"""
<!-- ========== APPENDIX A: EVIDENCE ========== -->
<div id="appendix-evidence" class="section-container page-break">
    <div class="section-header">
        <div class="section-number">A</div>
        <div class="section-header-text">
            <h2>Appendix A: Evidence Inventory</h2>
            <p>{count} evidence item(s) across all assessed controls</p>
        </div>
    </div>
    <div class="section-body">
        <p class="info-paragraph">
            The following table lists all evidence items that have been uploaded to the assessment
            portal across all controls. Evidence items are linked to their respective control
            references. The existence of an evidence item in this inventory does not constitute
            confirmation that the evidence demonstrates full control implementation; all evidence
            should be reviewed in the context of the relevant control requirements.
        </p>
        <table>
            <thead>
                <tr>
                    <th style="width:90px;">Control Ref</th>
                    <th>Evidence Title</th>
                    <th>Description</th>
                    <th style="width:60px;">Type</th>
                    <th>Location / Link</th>
                    <th style="width:90px;">Uploaded</th>
                    <th style="width:100px;">Uploaded By</th>
                </tr>
            </thead>
            <tbody>
                {rows}
            </tbody>
        </table>
    </div>
</div>
"""


def _build_appendix_glossary(framework_key: str) -> str:
    # Select relevant terms based on framework
    always_include = {
        'Gap Analysis', 'Control', 'Implementation Status', 'ISMS',
        'Risk Rating', 'Residual Risk', 'Evidence', 'Remediation',
        'Compensating Control', 'Maturity Level',
    }
    framework_extras = {
        'HIPAA':           {'ePHI'},
        'SOC2':            {'TSC'},
        'NIST_800_171_R3': {'CUI', 'SSP'},
        'ISO_27001_2022':  {'SoA', 'ISMS'},
        'NIST_CSF_2':      set(),
    }
    extras = framework_extras.get(framework_key, set())
    include_terms = always_include | extras

    terms_html = ''
    for term, definition in sorted(GLOSSARY_TERMS.items()):
        if term in include_terms:
            terms_html += f"""
<div class="glossary-term">
    <dt>{_e(term)}</dt>
    <dd>{_e(definition)}</dd>
</div>"""

    return f"""
<!-- ========== APPENDIX B: GLOSSARY ========== -->
<div id="appendix-glossary" class="section-container page-break">
    <div class="section-header">
        <div class="section-number">B</div>
        <div class="section-header-text">
            <h2>Appendix B: Glossary</h2>
            <p>Definitions of key terms used in this report</p>
        </div>
    </div>
    <div class="section-body">
        <p class="info-paragraph">
            The following terms are used throughout this report. Definitions are provided
            in the context of information security assessments and the referenced framework.
        </p>
        <dl>
            {terms_html}
        </dl>
    </div>
</div>
"""


def _build_footer(project, accent: str) -> str:
    framework_name = _e(project.framework.name)
    proj_title = _e(project.title)
    generated_date = _fmt_date(date.today())
    return f"""
<!-- ========== REPORT FOOTER ========== -->
<div style="background:#0d2137;color:rgba(255,255,255,0.6);padding:20px 50px;
    display:flex;justify-content:space-between;align-items:center;font-size:11px;">
    <div>
        <strong style="color:#fff;">OziCyber Pty Ltd</strong> &mdash; Confidential &amp; Proprietary<br>
        This report was generated by the OziCyber GRC Assessment Platform.
    </div>
    <div style="text-align:center;">
        <div style="color:{accent};font-weight:700;">{proj_title}</div>
        <div>{framework_name}</div>
    </div>
    <div style="text-align:right;">
        Generated: {generated_date}<br>
        Classification: CONFIDENTIAL
    </div>
</div>
</div><!-- /report-wrapper -->
</body>
</html>"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_gap_analysis_report(project, control_statuses, family_stats) -> str:
    """
    Generate a complete, self-contained HTML gap analysis report.

    Parameters
    ----------
    project : GrcProject
        The GRC project instance.
    control_statuses : list or QuerySet of GrcControlStatus
        All control statuses for the project (include non-category controls).
    family_stats : list of dict
        Family-level statistics with keys: id, identifier, name, total,
        implemented, partial, in_progress, pct.

    Returns
    -------
    str
        A complete HTML string representing the gap analysis report.
    """
    # Materialise querysets to avoid repeated DB hits
    control_statuses = list(control_statuses)
    family_stats = list(family_stats)

    framework_key = getattr(project.framework, 'key', 'NIST_CSF_2')
    accent = _get_accent(framework_key)

    # Compute overall statistics once
    stats = _compute_overall_stats(control_statuses)

    # Count gap findings for TOC
    findings_count = sum(
        1 for cs in control_statuses
        if not getattr(cs.control, 'is_category', False)
        and cs.status in ('NOT_STARTED', 'PARTIALLY_IMPLEMENTED', 'IN_PROGRESS', 'PLANNED')
    )

    # Build each section
    parts = [
        _build_head(f"Gap Analysis Report — {project.title}", accent),
        _build_cover(project, stats, accent),
        _build_notice(),
        _build_toc(family_stats, findings_count),
        _build_executive_summary(project, stats, control_statuses, accent),
        _build_scope_methodology(project, accent),
        _build_dashboard(stats, family_stats, accent),
        _build_findings(control_statuses, accent),
        _build_control_analysis(control_statuses, family_stats, accent),
        _build_policy_analysis(control_statuses, framework_key, accent),
        _build_recommendations(control_statuses, family_stats, accent),
        _build_appendix_evidence(control_statuses, accent),
        _build_appendix_glossary(framework_key),
        _build_footer(project, accent),
    ]

    return ''.join(parts)

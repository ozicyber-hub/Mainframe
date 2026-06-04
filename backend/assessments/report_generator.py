"""
Generates standalone HTML assessment reports with embedded SVG charts.
OziCyber brand: primary #24483E (dark green), accent #c9a84c (gold), white.
"""
import math
from datetime import datetime


GREEN  = '#24483E'
GOLD   = '#c9a84c'
RED    = '#c0392b'
ORANGE = '#e67e22'
AMBER  = '#f39c12'
LIME   = '#27ae60'
GREY   = '#95a5a6'
LIGHT  = '#f4f7f4'


def _pct(val):
    if val is None:
        return 0.0
    return float(val)


def _score_color(score):
    if score is None:
        return GREY
    if score >= 75:
        return LIME
    if score >= 50:
        return AMBER
    return RED


def _score_label(score):
    if score is None:
        return 'Not Scored'
    if score >= 75:
        return 'Compliant'
    if score >= 50:
        return 'Partially Compliant'
    return 'Non-Compliant'


# ──────────────────────────────────────────────
# SVG helpers
# ──────────────────────────────────────────────

def _gauge_svg(score, size=220):
    """Semi-circle gauge showing overall score."""
    r = 70
    cx = size // 2
    cy = size // 2 + 20
    stroke = 12

    def arc_path(pct, color):
        angle = math.pi * pct / 100
        x = cx - r * math.cos(angle)
        y = cy - r * math.sin(angle)
        large = 1 if pct > 50 else 0
        return (
            f'<path d="M {cx - r} {cy} A {r} {r} 0 {large} 1 {x:.1f} {y:.1f}" '
            f'fill="none" stroke="{color}" stroke-width="{stroke}" '
            f'stroke-linecap="round"/>'
        )

    s = score or 0
    color = _score_color(score)
    return f'''<svg width="{size}" height="{size//2+40}" viewBox="0 0 {size} {size//2+40}">
  <path d="M {cx-r} {cy} A {r} {r} 0 1 1 {cx+r} {cy}"
        fill="none" stroke="#e0e0e0" stroke-width="{stroke}" stroke-linecap="round"/>
  {arc_path(s, color)}
  <text x="{cx}" y="{cy-8}" text-anchor="middle" font-size="28" font-weight="bold" fill="{color}">{s:.0f}%</text>
  <text x="{cx}" y="{cy+14}" text-anchor="middle" font-size="12" fill="#666">{_score_label(score)}</text>
</svg>'''


def _bar_chart_svg(sections_data, width=620, bar_h=28, gap=8):
    """Horizontal bar chart for per-section scores."""
    if not sections_data:
        return ''
    n = len(sections_data)
    h = n * (bar_h + gap) + 40
    chart_w = width - 200

    bars = ''
    for i, (name, score, base_score) in enumerate(sections_data):
        y = 30 + i * (bar_h + gap)
        s = _pct(score)
        color = _score_color(score)
        bar_len = chart_w * s / 100

        label = name[:28] + '…' if len(name) > 28 else name
        bars += f'''
  <text x="190" y="{y + bar_h//2 + 5}" text-anchor="end" font-size="11" fill="#333">{label}</text>
  <rect x="195" y="{y}" width="{chart_w}" height="{bar_h}" rx="4" fill="#e8ede8"/>
  <rect x="195" y="{y}" width="{bar_len:.1f}" height="{bar_h}" rx="4" fill="{color}"/>
  <text x="{195 + bar_len + 6}" y="{y + bar_h//2 + 5}" font-size="11" fill="{color}" font-weight="bold">{s:.0f}%</text>'''

        if base_score is not None:
            base_len = chart_w * _pct(base_score) / 100
            bars += f'''
  <line x1="{195 + base_len:.1f}" y1="{y-2}" x2="{195 + base_len:.1f}" y2="{y + bar_h + 2}"
        stroke="{GOLD}" stroke-width="2.5" stroke-dasharray="4,2"/>'''

    legend = ''
    if any(b for _, _, b in sections_data):
        legend = f'''
  <line x1="195" y1="{h-8}" x2="215" y2="{h-8}" stroke="{GOLD}" stroke-width="2.5" stroke-dasharray="4,2"/>
  <text x="220" y="{h-4}" font-size="10" fill="{GOLD}">Baseline score</text>'''

    return f'''<svg width="{width}" height="{h}" viewBox="0 0 {width} {h}">
  <text x="0" y="16" font-size="13" font-weight="bold" fill="{GREEN}">Score by Domain / Section</text>
  {bars}{legend}
</svg>'''


def _delta_bar_svg(sections_data, width=540, bar_h=24, gap=10):
    """Delta bars showing improvement/regression vs baseline."""
    if not sections_data:
        return ''
    n = len(sections_data)
    h = n * (bar_h + gap) + 50
    mid = 260
    max_half = width - mid - 40

    bars = ''
    for i, (name, current, baseline) in enumerate(sections_data):
        y = 34 + i * (bar_h + gap)
        delta = _pct(current) - _pct(baseline)
        color = LIME if delta >= 0 else RED
        bar_len = min(abs(delta) / 100 * max_half * 2, max_half)
        label = name[:24] + '…' if len(name) > 24 else name
        bars += f'''
  <text x="{mid-6}" y="{y + bar_h//2 + 4}" text-anchor="end" font-size="11" fill="#333">{label}</text>'''
        if delta >= 0:
            bars += f'''
  <rect x="{mid}" y="{y}" width="{bar_len:.1f}" height="{bar_h}" rx="3" fill="{color}"/>
  <text x="{mid + bar_len + 5}" y="{y + bar_h//2 + 4}" font-size="11" fill="{color}" font-weight="bold">+{delta:.0f}%</text>'''
        else:
            bars += f'''
  <rect x="{mid - bar_len:.1f}" y="{y}" width="{bar_len:.1f}" height="{bar_h}" rx="3" fill="{color}"/>
  <text x="{mid - bar_len - 5}" y="{y + bar_h//2 + 4}" text-anchor="end" font-size="11" fill="{color}" font-weight="bold">{delta:.0f}%</text>'''

    return f'''<svg width="{width}" height="{h}" viewBox="0 0 {width} {h}">
  <text x="0" y="16" font-size="13" font-weight="bold" fill="{GREEN}">Progress vs Baseline (Change in Score)</text>
  <line x1="{mid}" y1="24" x2="{mid}" y2="{h-10}" stroke="#ccc" stroke-width="1"/>
  <text x="{mid}" y="22" text-anchor="middle" font-size="9" fill="#999">0%</text>
  {bars}
</svg>'''


def _radar_svg(labels, values, baseline_values=None, size=340):
    """Spider/radar chart."""
    n = len(labels)
    if n < 3:
        return ''
    cx, cy, r = size // 2, size // 2, size // 2 - 50

    def point(i, pct):
        angle = math.pi / 2 - 2 * math.pi * i / n
        dist = r * pct / 100
        return cx + dist * math.cos(angle), cy - dist * math.sin(angle)

    # Grid rings
    rings = ''
    for pct in [25, 50, 75, 100]:
        pts = ' '.join(f'{point(i,pct)[0]:.1f},{point(i,pct)[1]:.1f}' for i in range(n))
        rings += f'<polygon points="{pts}" fill="none" stroke="#e0e0e0" stroke-width="1"/>'

    # Spokes
    spokes = ''
    for i in range(n):
        x, y = point(i, 100)
        spokes += f'<line x1="{cx}" y1="{cy}" x2="{x:.1f}" y2="{y:.1f}" stroke="#e0e0e0" stroke-width="1"/>'

    # Baseline polygon
    base_poly = ''
    if baseline_values:
        bpts = ' '.join(f'{point(i, baseline_values[i])[0]:.1f},{point(i, baseline_values[i])[1]:.1f}' for i in range(n))
        base_poly = f'<polygon points="{bpts}" fill="{GOLD}" fill-opacity="0.15" stroke="{GOLD}" stroke-width="1.5" stroke-dasharray="4,2"/>'

    # Current polygon
    pts = ' '.join(f'{point(i, values[i])[0]:.1f},{point(i, values[i])[1]:.1f}' for i in range(n))
    poly = f'<polygon points="{pts}" fill="{GREEN}" fill-opacity="0.2" stroke="{GREEN}" stroke-width="2"/>'

    # Labels
    text_nodes = ''
    for i, lbl in enumerate(labels):
        x, y = point(i, 115)
        anchor = 'middle' if abs(x - cx) < 5 else ('start' if x > cx else 'end')
        short = lbl[:16] + '…' if len(lbl) > 16 else lbl
        text_nodes += f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" font-size="10" fill="#333">{short}</text>'

    legend = f'''
  <circle cx="{size-100}" cy="{size-30}" r="5" fill="{GREEN}" fill-opacity="0.5" stroke="{GREEN}"/>
  <text x="{size-92}" y="{size-26}" font-size="10" fill="{GREEN}">Current</text>'''
    if baseline_values:
        legend += f'''
  <circle cx="{size-100}" cy="{size-16}" r="5" fill="{GOLD}" fill-opacity="0.5" stroke="{GOLD}"/>
  <text x="{size-92}" y="{size-12}" font-size="10" fill="{GOLD}">Baseline</text>'''

    return f'''<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  {rings}{spokes}{base_poly}{poly}{text_nodes}{legend}
</svg>'''


# ──────────────────────────────────────────────
# Data helpers
# ──────────────────────────────────────────────

def _target_ml(section, control_config):
    """Return the target ML for a section, or None (= all questions in scope)."""
    if not control_config:
        return None
    val = control_config.get(str(section.id), control_config.get(section.id))
    return int(val) if val is not None else 1


def _in_scope(q, target_ml):
    """True if question is within the targeted maturity level."""
    return target_ml is None or q.maturity_level is None or q.maturity_level <= target_ml


def _section_scores(assessment, template, control_config=None, sp_target=None):
    """Returns list of (section_name, score_pct) per section, scoped to target ML / SP."""
    is_aescsf = template.framework in AESCSF_FRAMEWORKS
    resp_map  = {r.question_id: r for r in assessment.responses.all()}
    results   = []
    for section in template.sections.prefetch_related('questions').all():
        t_ml    = _target_ml(section, control_config)
        total_w = achieved_w = 0.0
        for q in section.questions.all():
            # AESCSF SP scope filter
            if is_aescsf and sp_target is not None and q.weight and int(q.weight) > sp_target:
                continue
            if not _in_scope(q, t_ml):
                continue
            r = resp_map.get(q.id)
            w = 1.0 if is_aescsf else q.weight
            total_w += w
            if r:
                if r.answer in POSITIVE_ANSWERS or r.maturity_achieved:
                    achieved_w += w
                elif r.answer in {'Largely Implemented'}:
                    achieved_w += w * 0.75
                elif r.answer in {'PARTIAL', 'Partially Implemented'}:
                    achieved_w += w * 0.5
        pct = round(achieved_w / total_w * 100, 1) if total_w else None
        results.append((section.name, pct))
    return results


LEVEL_COLORS_CSS = {1: '#e67e22', 2: '#3498db', 3: '#27ae60', None: '#95a5a6'}
ML_COLORS_CSS    = LEVEL_COLORS_CSS  # backward compat alias

ML_LABELS_REPORT  = {1: 'ML1 — Partly Aligned',    2: 'ML2 — Mostly Aligned',    3: 'ML3 — Fully Aligned'}
IG_LABELS_REPORT  = {1: 'IG1 — Foundational',      2: 'IG2 — Managed',           3: 'IG3 — Advanced'}
MIL_LABELS_REPORT = {1: 'MIL-1 — Initial',          2: 'MIL-2 — Developing',      3: 'MIL-3 — Managing'}

LEVEL_BASED_FRAMEWORKS = {'ESSENTIAL_EIGHT', 'CIS', 'AESCSF', 'AESCSF_V1'}

AESCSF_FRAMEWORKS = {'AESCSF', 'AESCSF_V1'}

# All answer values that count as "fully compliant / achieved"
POSITIVE_ANSWERS = {'YES', 'ACHIEVED', 'TRUE', 'Fully Implemented'}
# All answer values that count as "partial"
PARTIAL_ANSWERS  = {'PARTIAL', 'Largely Implemented', 'Partially Implemented'}


def _level_prefix(framework):
    if framework == 'CIS':
        return 'IG'
    if framework in AESCSF_FRAMEWORKS:
        return 'MIL'
    return 'ML'


def _level_labels(framework):
    if framework == 'CIS':
        return IG_LABELS_REPORT
    if framework in AESCSF_FRAMEWORKS:
        return MIL_LABELS_REPORT
    return ML_LABELS_REPORT


def _level_tracker_html(assessment, template):
    """Per-domain MIL/ML/IG achievement tracker — works for E8, CIS, and AESCSF."""
    framework      = template.framework
    is_aescsf      = framework in AESCSF_FRAMEWORKS
    prefix         = _level_prefix(framework)
    resp_map       = {r.question_id: r for r in assessment.responses.all()}
    control_config = assessment.control_config or {}

    # AESCSF: global SP target (stored as '__sp' in control_config)
    sp_target = None
    if is_aescsf:
        raw = control_config.get('__sp')
        if raw is not None:
            try:
                sp_target = int(float(raw))
            except (TypeError, ValueError):
                pass

    rows = ''
    for section in template.sections.prefetch_related('questions').all():
        # AESCSF: always show all MIL levels (target = 3); E8/CIS: per-section target
        if is_aescsf:
            target_ml = 3
        else:
            target_ml = int(control_config.get(str(section.id), control_config.get(section.id, 1)))

        by_ml = {1: [], 2: [], 3: []}
        for q in section.questions.all():
            # AESCSF: filter by SP scope (weight stores SP level)
            if is_aescsf and sp_target is not None and q.weight and int(q.weight) > sp_target:
                continue
            ml = q.maturity_level
            if ml in (1, 2, 3):
                by_ml[ml].append(q)

        level_cells = ''
        for ml in [1, 2, 3]:
            qs = by_ml[ml]
            if ml > target_ml:
                level_cells += '<td style="color:#ccc;text-align:center;font-size:11px">—</td>'
                continue
            if not qs:
                level_cells += '<td style="text-align:center;font-size:11px;color:#999">N/A</td>'
                continue
            answered  = [q for q in qs if resp_map.get(q.id) and resp_map[q.id].answer]
            compliant = [q for q in qs if resp_map.get(q.id) and resp_map[q.id].answer in POSITIVE_ANSWERS]
            partial_q = [q for q in qs if resp_map.get(q.id) and resp_map[q.id].answer in PARTIAL_ANSWERS]
            if len(compliant) == len(qs):
                status, badge_color = '✓ Achieved', LIME
            elif len(answered) < len(qs):
                status, badge_color = f'{len(answered)}/{len(qs)} answered', '#95a5a6'
            else:
                status, badge_color = f'{len(compliant)}/{len(qs)} compliant', AMBER if partial_q else RED
            level_cells += (
                f'<td style="text-align:center">'
                f'<span style="background:{badge_color};color:#fff;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700">'
                f'{prefix}{ml}: {status}</span></td>'
            )

        if is_aescsf:
            sp_badge = (
                f'<span style="background:#8e44ad;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">'
                f'SP-{sp_target or "?"} scope</span>'
            ) if sp_target else ''
            target_badge = sp_badge
        else:
            target_badge = (
                f'<span style="background:{LEVEL_COLORS_CSS.get(target_ml,"#95a5a6")};color:#fff;'
                f'padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">Target: {prefix}{target_ml}</span>'
            )
        rows += f'<tr><td><strong>{section.name}</strong><br/>{target_badge}</td>{level_cells}</tr>'

    title_map = {
        'ESSENTIAL_EIGHT': 'Essential Eight — Per-Control Maturity Tracker',
        'CIS':             'CIS Controls v8 — Per-Control IG Tracker',
        'AESCSF':          'AESCSF v2 — Per-Domain MIL Achievement Tracker',
        'AESCSF_V1':       'AESCSF v1 — Per-Domain MIL Achievement Tracker',
    }
    title    = title_map.get(framework, f'{framework} — Level Tracker')
    col_desc = {
        'ESSENTIAL_EIGHT': ('ML1 (Partly Aligned)', 'ML2 (Mostly Aligned)', 'ML3 (Fully Aligned)'),
        'CIS':             ('IG1 (Foundational)', 'IG2 (Managed)', 'IG3 (Advanced)'),
        'AESCSF':          ('MIL-1 (Initial)', 'MIL-2 (Developing)', 'MIL-3 (Managing)'),
        'AESCSF_V1':       ('MIL-1 (Initial)', 'MIL-2 (Developing)', 'MIL-3 (Managing)'),
    }.get(framework, (f'{prefix}1', f'{prefix}2', f'{prefix}3'))

    sp_note = (
        f'<p style="color:#555;font-size:13px;margin-bottom:8px">Security Profile target: <strong>SP-{sp_target}</strong> — '
        f'practices above this SP level are excluded from scope.</p>'
    ) if is_aescsf and sp_target else ''

    return f'''<h2>{title}</h2>
{sp_note}<p style="color:#555;font-size:13px;margin-bottom:16px">
  Shows achievement status for each domain at each {prefix} level.
  Domains marked — are not targeted at that level.
</p>
<table>
  <thead>
    <tr>
      <th>Domain / Control</th>
      <th style="text-align:center">{col_desc[0]}</th>
      <th style="text-align:center">{col_desc[1]}</th>
      <th style="text-align:center">{col_desc[2]}</th>
    </tr>
  </thead>
  <tbody>{rows}</tbody>
</table>'''


# Keep old name as alias so nothing else breaks
def _e8_ml_tracker_html(assessment, template):
    return _level_tracker_html(assessment, template)


def _remediation_items(assessment, template, control_config=None, sp_target=None):
    """Returns prioritised list of non-compliant questions, scoped to target ML / SP."""
    is_aescsf = template.framework in AESCSF_FRAMEWORKS
    resp_map  = {r.question_id: r for r in assessment.responses.all()}
    items     = []
    for section in template.sections.prefetch_related('questions').all():
        t_ml = _target_ml(section, control_config)
        for q in section.questions.all():
            # AESCSF SP scope filter
            if is_aescsf and sp_target is not None and q.weight and int(q.weight) > sp_target:
                continue
            if not _in_scope(q, t_ml):
                continue
            r   = resp_map.get(q.id)
            ans = r.answer if r else None
            compliant = ans in POSITIVE_ANSWERS or (r and r.maturity_achieved)
            partial   = ans in PARTIAL_ANSWERS
            if not compliant:
                priority = 'High' if not partial and q.is_required else ('Medium' if partial else 'Low')
                items.append({
                    'section':  section.name,
                    'text':     q.text,
                    'notes':    r.notes if r else '',
                    'answer':   ans or 'Not answered',
                    'priority': priority,
                    'weight':   1.0 if is_aescsf else q.weight,
                })
    items.sort(key=lambda x: ({'High': 0, 'Medium': 1, 'Low': 2}[x['priority']], -x['weight']))
    return items


def _achieved_level(resp_map, sections_qs):
    """
    Returns the overall achieved level (weakest-link minimum across all controls).
    sections_qs: list of (section, {1:[q,..], 2:[q,..], 3:[q,..]})
    """
    overall = 3
    for _sec, by_ml in sections_qs:
        domain_ml = 0
        for ml in [1, 2, 3]:
            qs = by_ml[ml]
            if not qs:
                continue
            if all(resp_map.get(q.id) and resp_map[q.id].answer in POSITIVE_ANSWERS for q in qs):
                domain_ml = ml
            else:
                break
        if domain_ml < overall:
            overall = domain_ml
    return overall


# Backward compat alias
def _e8_achieved_ml(resp_map, sections_qs):
    return _achieved_level(resp_map, sections_qs)


def _level_roadmap_html(assessment, template):
    """
    Level-aware remediation roadmap — Essential Eight (ML), CIS (IG), and AESCSF (MIL/SP).

    • overall_achieved == 0  →  show non-compliant / unanswered level-1 controls
    • overall_achieved == 1  →  level-1 achieved banner + level-2 advancement plan
    • overall_achieved == 2  →  level-2 achieved banner + level-3 advancement plan
    • overall_achieved == 3  →  congratulations banner
    """
    framework  = template.framework
    prefix     = _level_prefix(framework)
    resp_map   = {r.question_id: r for r in assessment.responses.all()}
    is_aescsf  = framework in AESCSF_FRAMEWORKS
    is_cis     = framework == 'CIS'

    # AESCSF: get SP target
    sp_target = None
    if is_aescsf:
        raw = (assessment.control_config or {}).get('__sp')
        if raw is not None:
            try:
                sp_target = int(float(raw))
            except (TypeError, ValueError):
                pass

    # Level name mappings
    if is_cis:
        level_names = {1: 'Implementation Group 1', 2: 'Implementation Group 2', 3: 'Implementation Group 3'}
        level_descs = {
            1: 'Foundational safeguards applicable to all enterprises regardless of size or security maturity.',
            2: 'Safeguards for organisations with dedicated IT and security staff managing multiple departments.',
            3: 'Advanced safeguards for organisations with security specialists addressing sophisticated threats.',
        }
        framework_label = 'CIS Controls v8'
        fully_achieved_next = [
            '<strong>ISO/IEC 27001:2022</strong> — Internationally recognised ISMS certification.',
            '<strong>NIST Cybersecurity Framework 2.0</strong> — Comprehensive risk-based framework.',
            '<strong>Australian Government ISM</strong> — Required for government and critical infrastructure.',
        ]
    elif is_aescsf:
        level_names = {1: 'Maturity Indicator Level 1', 2: 'Maturity Indicator Level 2', 3: 'Maturity Indicator Level 3'}
        level_descs = {
            1: 'Practices are performed in an ad hoc manner — initial, informal implementation.',
            2: 'Practices are documented and managed — defined processes are in place.',
            3: 'Practices are measured and continuously improved — optimised and governed.',
        }
        sp_str      = f' (SP-{sp_target} scope)' if sp_target else ''
        framework_label = f'AESCSF v2{sp_str}'
        fully_achieved_next = [
            '<strong>ISO/IEC 27001:2022</strong> — Internationally recognised ISMS certification.',
            '<strong>NIST Cybersecurity Framework 2.0</strong> — Comprehensive risk-based framework.',
            '<strong>SOCI Act compliance review</strong> — Validate obligations under the Security of Critical Infrastructure Act.',
        ]
    else:
        level_names = {1: 'Maturity Level 1', 2: 'Maturity Level 2', 3: 'Maturity Level 3'}
        level_descs = {
            1: 'Basic cyber hygiene controls that significantly reduce risk from opportunistic attacks.',
            2: 'Controls that reduce risk from more sophisticated targeted attacks.',
            3: 'Controls that reduce risk from sophisticated adversaries with significant capabilities.',
        }
        framework_label = 'Essential Eight'
        fully_achieved_next = [
            '<strong>NIST Cybersecurity Framework 2.0</strong> — Risk-based, comprehensive approach aligned to international standards.',
            '<strong>ISO/IEC 27001:2022</strong> — Internationally recognised certification standard.',
            '<strong>Australian Government ISM</strong> — Required for Australian government entities and contractors.',
        ]

    # Build per-section question buckets (AESCSF: filter by SP scope)
    sections_qs = []
    for section in template.sections.prefetch_related('questions').order_by('order').all():
        by_ml = {1: [], 2: [], 3: []}
        for q in section.questions.all():
            if is_aescsf and sp_target is not None and q.weight and int(q.weight) > sp_target:
                continue
            if q.maturity_level in (1, 2, 3):
                by_ml[q.maturity_level].append(q)
        sections_qs.append((section, by_ml))

    overall_achieved = _achieved_level(resp_map, sections_qs)

    # ── Fully achieved ────────────────────────────────────────────────────
    if overall_achieved == 3:
        next_li = ''.join(f'<li>{item}</li>' for item in fully_achieved_next)
        return f'''<h2>Remediation Roadmap</h2>
<div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:10px;padding:24px 28px;margin-bottom:16px">
  <h3 style="color:{LIME};margin:0 0 10px">🎉 {framework_label} {prefix}3 Fully Achieved</h3>
  <p style="color:#333;margin-bottom:14px">
    Your organisation has achieved <strong>{level_names[3]}</strong> across all {framework_label} controls —
    the highest level. It is recommended to progress to a more comprehensive enterprise security framework:
  </p>
  <ul style="padding-left:20px;color:#333;line-height:1.8">{next_li}</ul>
</div>'''

    # ── Partial progress ──────────────────────────────────────────────────
    next_level  = overall_achieved + 1
    next_label  = level_names[next_level]
    next_desc   = level_descs[next_level]
    next_color  = LEVEL_COLORS_CSS.get(next_level, '#95a5a6')

    if overall_achieved > 0:
        banner = f'''<div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:10px;
                                 padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:16px">
  <span style="font-size:28px">✓</span>
  <div>
    <strong style="color:{LIME}">{prefix}{overall_achieved} Achieved</strong>
    <p style="color:#555;font-size:13px;margin:2px 0 0">
      Your organisation has met all {level_names[overall_achieved]} controls across all {framework_label} domains.
      The roadmap below outlines the safeguards required to advance to <strong>{next_label}</strong>.
    </p>
  </div>
</div>'''
    else:
        banner = f'''<div style="background:#fff3e0;border:1px solid #ffcc80;border-radius:10px;
                                 padding:16px 20px;margin-bottom:20px">
  <strong style="color:{ORANGE}">{prefix}1 not yet fully achieved</strong>
  <p style="color:#555;font-size:13px;margin:4px 0 0">
    The safeguards below must be fully implemented and verified before {prefix}1 can be claimed.
    Resolve all items in order of priority.
  </p>
</div>'''

    # Gather gaps per domain up to next_level
    domain_rows = []
    for section, by_ml in sections_qs:
        domain_ml = 0
        for ml in [1, 2, 3]:
            qs = by_ml[ml]
            if not qs:
                continue
            if all(resp_map.get(q.id) and resp_map[q.id].answer in POSITIVE_ANSWERS for q in qs):
                domain_ml = ml
            else:
                break

        gap_controls = []
        for ml in range(1, next_level + 1):
            for q in by_ml[ml]:
                r   = resp_map.get(q.id)
                ans = r.answer if r else ''
                if ans not in POSITIVE_ANSWERS:
                    gap_controls.append({
                        'ml':      ml,
                        'text':    q.text,
                        'answer':  ans or 'Not answered',
                        'partial': ans in PARTIAL_ANSWERS,
                        'notes':   r.notes if r else '',
                    })

        if gap_controls:
            domain_rows.append((section.name, domain_ml, gap_controls))

    domain_rows.sort(key=lambda x: len(x[2]))

    if not domain_rows:
        return '<h2>Remediation Roadmap</h2><p>No remediation items identified.</p>'

    domain_blocks = ''
    for domain_name, domain_achieved, controls in domain_rows:
        gap_count = len(controls)
        status_badge = (
            f'<span style="background:{LIME};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">{prefix}{domain_achieved} ✓</span>'
            if domain_achieved > 0 else
            f'<span style="background:{ORANGE};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">{prefix}{next_level} gaps: {gap_count}</span>'
        )
        rows_html = ''
        for c in controls:
            lv_badge  = f'<span style="background:{LEVEL_COLORS_CSS.get(c["ml"],"#95a5a6")};color:#fff;padding:1px 5px;border-radius:6px;font-size:10px;font-weight:700;margin-right:6px">{prefix}{c["ml"]}</span>'
            if c['partial']:
                ans_badge = f'<span style="background:{AMBER};color:#fff;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:700">Partial</span>'
            elif c['answer'] == 'Not answered':
                ans_badge = f'<span style="background:{GREY};color:#fff;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:700">Not Answered</span>'
            else:
                ans_badge = f'<span style="background:{RED};color:#fff;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:700">Non-Compliant</span>'
            notes_txt = f'<br/><span style="font-size:11px;color:#666">📝 {c["notes"]}</span>' if c['notes'] else ''
            rows_html += f'<li style="margin-bottom:8px">{lv_badge}{c["text"][:140]}{"…" if len(c["text"])>140 else ""} {ans_badge}{notes_txt}</li>'

        domain_blocks += f'''<div class="roadmap-phase" style="margin-bottom:14px">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
    <h4 style="color:{GREEN};margin:0;flex:1">{domain_name}</h4>
    {status_badge}
    <span style="font-size:12px;color:#888">{gap_count} safeguard{"s" if gap_count != 1 else ""} to address</span>
  </div>
  <ul style="padding-left:20px;list-style:none">{rows_html}</ul>
</div>'''

    return f'''<h2>Remediation Roadmap</h2>
{banner}
<div style="border-left:4px solid {next_color};padding-left:14px;margin-bottom:18px">
  <h3 style="color:{next_color};margin:0 0 4px">Path to {next_label}</h3>
  <p style="color:#555;font-size:13px;margin:0">{next_desc}
    Controls are ordered by number of outstanding safeguards — address the easiest wins first.
  </p>
</div>
<div class="roadmap">{domain_blocks}</div>'''


# Backward compat alias
def _e8_roadmap_html(assessment, template):
    return _level_roadmap_html(assessment, template)


def _css():
    return f"""
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #222; background: #fff; font-size: 14px; line-height: 1.55; }}
.page {{ max-width: 960px; margin: 0 auto; padding: 40px 32px; }}

/* Header */
.report-header {{ background: {GREEN}; color: #fff; padding: 36px 40px; border-radius: 12px; margin-bottom: 32px; }}
.report-header h1 {{ font-size: 26px; font-weight: 700; margin-bottom: 4px; }}
.report-header .subtitle {{ color: rgba(255,255,255,0.78); font-size: 14px; }}
.brand {{ color: {GOLD}; font-weight: 800; letter-spacing: 1px; }}
.badge {{ display:inline-block; background:{GOLD}; color:{GREEN}; font-weight:700; font-size:11px;
          padding:3px 10px; border-radius:20px; margin-top:10px; text-transform:uppercase; }}

/* Metric cards */
.metrics {{ display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }}
.metric-card {{ flex: 1; min-width: 140px; background: {LIGHT}; border-radius: 10px;
                padding: 18px 20px; border-left: 4px solid {GREEN}; }}
.metric-card.highlight {{ border-left-color: {GOLD}; }}
.metric-card.danger {{ border-left-color: {RED}; }}
.metric-card .val {{ font-size: 28px; font-weight: 800; color: {GREEN}; }}
.metric-card.highlight .val {{ color: {GOLD}; }}
.metric-card.danger .val {{ color: {RED}; }}
.metric-card .lbl {{ font-size: 12px; color: #666; margin-top: 2px; }}

/* Section headings */
h2 {{ font-size: 18px; font-weight: 700; color: {GREEN}; border-bottom: 2px solid {GREEN};
      padding-bottom: 6px; margin: 36px 0 16px; }}
h3 {{ font-size: 14px; font-weight: 700; color: {GREEN}; margin: 20px 0 10px; }}

/* Charts */
.charts-row {{ display: flex; gap: 24px; align-items: stretch; margin-bottom: 24px; }}
.chart-box {{ background: {LIGHT}; border-radius: 10px; padding: 20px 24px; }}
.chart-box-gauge {{ background: {LIGHT}; border-radius: 10px; padding: 24px; flex: 0 0 240px;
                    display: flex; flex-direction: column; align-items: center; justify-content: center; }}
.chart-box-bar {{ background: {LIGHT}; border-radius: 10px; padding: 20px 24px; flex: 1; overflow-x: auto; }}

/* Audit response badges */
.ans-yes     {{ display:inline-block; background:{LIME}; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:700; white-space:nowrap; }}
.ans-partial {{ display:inline-block; background:{AMBER}; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:700; white-space:nowrap; }}
.ans-no      {{ display:inline-block; background:{RED}; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:700; white-space:nowrap; }}
.ans-na      {{ display:inline-block; background:{GREY}; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:700; white-space:nowrap; }}

/* Score table */
table {{ width: 100%; border-collapse: collapse; margin-bottom: 16px; }}
th {{ background: {GREEN}; color: #fff; padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; }}
td {{ padding: 9px 14px; border-bottom: 1px solid #e8ede8; font-size: 13px; vertical-align: top; }}
tr:nth-child(even) td {{ background: {LIGHT}; }}
.status-yes {{ color: {LIME}; font-weight: 700; }}
.status-partial {{ color: {AMBER}; font-weight: 700; }}
.status-no {{ color: {RED}; font-weight: 700; }}
.status-na {{ color: {GREY}; }}

/* Priority badges */
.priority-high {{ background: {RED}; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }}
.priority-medium {{ background: {AMBER}; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }}
.priority-low {{ background: {GREY}; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }}

/* Roadmap timeline */
.roadmap {{ margin-bottom: 24px; }}
.roadmap-phase {{ background: #fff; border: 1px solid #dde8dd; border-radius: 10px; padding: 16px 20px; margin-bottom: 12px; }}
.roadmap-phase h4 {{ font-size: 13px; font-weight: 700; color: {GREEN}; margin-bottom: 8px; }}
.roadmap-phase ul {{ padding-left: 18px; }}
.roadmap-phase li {{ font-size: 13px; margin-bottom: 4px; }}

/* Delta indicators */
.delta-pos {{ color: {LIME}; font-weight: 700; }}
.delta-neg {{ color: {RED}; font-weight: 700; }}
.delta-neu {{ color: {GREY}; }}

/* Comparison banner */
.compare-banner {{ background: {GREEN}; color: #fff; padding: 18px 24px; border-radius: 10px;
                   margin-bottom: 28px; display: flex; gap: 32px; align-items: center; }}
.compare-banner .score-big {{ font-size: 36px; font-weight: 800; }}
.compare-banner .score-lbl {{ font-size: 11px; opacity: 0.75; text-transform: uppercase; }}
.arrow {{ font-size: 28px; color: {GOLD}; }}

/* Footer */
.footer {{ margin-top: 48px; padding-top: 16px; border-top: 1px solid #e0e0e0;
           font-size: 11px; color: #999; text-align: center; }}

@media print {{
  .page {{ padding: 20px; }}
  h2 {{ page-break-after: avoid; }}
}}
"""


def _html_shell(title, body, report_type='Baseline Assessment Report'):
    now = datetime.now().strftime('%d %B %Y')
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<style>{_css()}</style>
</head>
<body>
<div class="page">
{body}
<div class="footer">
  Generated by <strong>OziCyber</strong> — {report_type} — {now}
</div>
</div>
</body>
</html>"""


# ──────────────────────────────────────────────
# Public: generate_baseline_report
# ──────────────────────────────────────────────

def generate_baseline_report(assessment, template):
    """
    Full standalone HTML report for a single (baseline) assessment.
    """
    framework      = template.framework
    is_aescsf      = framework in AESCSF_FRAMEWORKS
    score          = assessment.score
    control_config = assessment.control_config or {} if framework in LEVEL_BASED_FRAMEWORKS else None
    prefix         = _level_prefix(framework)

    # AESCSF: extract global SP target
    sp_target = None
    if is_aescsf and control_config:
        raw = control_config.get('__sp')
        if raw is not None:
            try:
                sp_target = int(float(raw))
            except (TypeError, ValueError):
                pass

    sec_scores  = _section_scores(assessment, template, control_config, sp_target=sp_target)
    remediation = _remediation_items(assessment, template, control_config, sp_target=sp_target)

    # Count only in-scope questions (respects target ML for E8, SP for AESCSF)
    resp_map   = {r.question_id: r for r in assessment.responses.all()}
    total_q = compliant = partial = answered = 0
    for section in template.sections.prefetch_related('questions').all():
        t_ml = _target_ml(section, control_config)
        for q in section.questions.all():
            if is_aescsf and sp_target is not None and q.weight and int(q.weight) > sp_target:
                continue
            if not _in_scope(q, t_ml):
                continue
            total_q += 1
            r = resp_map.get(q.id)
            if r and r.answer:
                answered += 1
                if r.answer in POSITIVE_ANSWERS or r.maturity_achieved:
                    compliant += 1
                elif r.answer in PARTIAL_ANSWERS:
                    partial += 1
    non_comp   = answered - compliant - partial
    unanswered = total_q - answered

    # Header
    badge = '<span class="badge">⭐ Baseline Assessment</span>' if assessment.is_baseline else ''
    header = f'''<div class="report-header">
  <div class="brand">OziCyber</div>
  <h1>{assessment.title}</h1>
  <div class="subtitle">{template.name} &nbsp;|&nbsp; {assessment.get_status_display()}
    {f'&nbsp;|&nbsp; Engagement: {assessment.engagement.name}' if assessment.engagement else ''}
    {f'&nbsp;|&nbsp; Assessor: {assessment.assessor.get_full_name()}' if assessment.assessor else ''}
  </div>
  {badge}
</div>'''

    # Metrics
    score_display = f'{score:.1f}' if score is not None else 'N/A'
    score_cls = 'highlight' if score and score >= 75 else ('danger' if score and score < 50 else '')
    metrics = f'''<div class="metrics">
  <div class="metric-card {score_cls}">
    <div class="val">{score_display}{'%' if score is not None else ''}</div>
    <div class="lbl">Overall Score</div>
  </div>
  <div class="metric-card">
    <div class="val">{compliant}</div>
    <div class="lbl">Compliant Controls</div>
  </div>
  <div class="metric-card highlight">
    <div class="val">{partial}</div>
    <div class="lbl">Partial Controls</div>
  </div>
  <div class="metric-card danger">
    <div class="val">{non_comp}</div>
    <div class="lbl">Non-Compliant</div>
  </div>
  <div class="metric-card">
    <div class="val">{unanswered}</div>
    <div class="lbl">Unanswered</div>
  </div>
</div>'''

    # Charts — gauge left (fixed width), bar chart right (flex fill). Radar removed.
    gauge = _gauge_svg(score)
    bar   = _bar_chart_svg([(n, s, None) for n, s in sec_scores])

    charts = f'''<h2>Compliance Overview</h2>
<div class="charts-row">
  <div class="chart-box-gauge">{gauge}</div>
  <div class="chart-box-bar">{bar}</div>
</div>'''

    # Score table
    rows = ''
    for name, s in sec_scores:
        color = _score_color(s)
        pct_str = f'{s:.1f}%' if s is not None else 'N/A'
        rows += f'''<tr>
  <td>{name}</td>
  <td><span style="color:{color};font-weight:700">{pct_str}</span></td>
  <td style="color:{color}">{_score_label(s)}</td>
</tr>'''

    score_table = f'''<h2>Domain / Section Scores</h2>
<table>
  <thead><tr><th>Domain / Section</th><th>Score</th><th>Status</th></tr></thead>
  <tbody>{rows}</tbody>
</table>'''

    # Full control audit table (scoped to target ML / SP, no assessor guidance — client-facing)
    audit_rows = ''
    count      = 0
    for section in template.sections.prefetch_related('questions').all():
        t_ml = _target_ml(section, control_config)
        for q in section.questions.all():
            if is_aescsf and sp_target is not None and q.weight and int(q.weight) > sp_target:
                continue
            if not _in_scope(q, t_ml):
                continue
            if count >= 200:
                break
            r     = resp_map.get(q.id)
            ans   = r.answer if r else ''
            notes = r.notes  if r else ''
            ml_badge = ''
            if q.maturity_level is not None:
                mc = LEVEL_COLORS_CSS.get(q.maturity_level, '#95a5a6')
                ml_badge = f'<span style="background:{mc};color:#fff;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700;margin-left:6px">{prefix}{q.maturity_level}</span>'

            # Response badge — human-readable, coloured
            if ans in POSITIVE_ANSWERS or (r and r.maturity_achieved):
                ans_badge = '<span class="ans-yes">✓ Compliant</span>'
            elif ans in PARTIAL_ANSWERS:
                ans_badge = '<span class="ans-partial">~ Partial</span>'
            elif ans in ('NO', '0', 'Not Implemented', 'Non-Compliant'):
                ans_badge = '<span class="ans-no">✗ Non-Compliant</span>'
            elif ans in ('N/A', 'Not Applicable', 'Not Present - Not Applicable'):
                ans_badge = '<span class="ans-na">N/A</span>'
            else:
                ans_badge = '<span class="ans-na">Not Answered</span>'

            notes_cell = f'<span style="font-size:12px;color:#444">{notes}</span>' if notes else '<span style="color:#bbb;font-size:12px">—</span>'

            audit_rows += f'''<tr>
  <td style="color:#555;font-size:12px;vertical-align:top;white-space:nowrap">{section.name}{ml_badge}</td>
  <td style="vertical-align:top">{q.text}</td>
  <td style="vertical-align:top">{ans_badge}</td>
  <td style="vertical-align:top">{notes_cell}</td>
</tr>'''
            count += 1

    audit_section = f'''<h2>Control Assessment Log</h2>
<p style="color:#555;font-size:13px;margin-bottom:16px">
  Detailed response record for all assessed controls. Evidence notes capture the specific
  configurations, tools or documentation observed during the assessment.
</p>
<table>
  <thead><tr><th>Domain</th><th>Control</th><th>Response</th><th>Evidence Notes</th></tr></thead>
  <tbody>{audit_rows}</tbody>
</table>'''

    # Remediation roadmap — level-based frameworks get IG/ML-aware roadmap; others get generic
    if framework in LEVEL_BASED_FRAMEWORKS:
        roadmap_html = _level_roadmap_html(assessment, template)
    else:
        high_items   = [i for i in remediation if i['priority'] == 'High'][:15]
        medium_items = [i for i in remediation if i['priority'] == 'Medium'][:10]
        low_items    = [i for i in remediation if i['priority'] == 'Low'][:10]

        def phase_block(title, color, items, timeline):
            if not items:
                return ''
            lis = ''.join(f'<li><strong>{i["section"]}:</strong> {i["text"][:120]}{"…" if len(i["text"])>120 else ""}</li>' for i in items)
            return f'''<div class="roadmap-phase">
  <h4 style="color:{color}">{title} — {timeline}</h4>
  <ul>{lis}</ul>
</div>'''

        roadmap_html = f'''<h2>Remediation Roadmap</h2>
<p style="color:#555;margin-bottom:16px;font-size:13px">
  Prioritised remediation plan based on assessment responses.
</p>
<div class="roadmap">
  {phase_block('Phase 1 — Critical / High Priority', RED, high_items, '0–30 days')}
  {phase_block('Phase 2 — Medium Priority', AMBER, medium_items, '30–90 days')}
  {phase_block('Phase 3 — Low Priority / Improvements', GREY, low_items, '90–180 days')}
</div>'''

    # Level-based tracker (E8 or CIS)
    ml_tracker = _level_tracker_html(assessment, template) if framework in LEVEL_BASED_FRAMEWORKS else ''

    body = header + metrics + charts + score_table + ml_tracker + roadmap_html + audit_section
    return _html_shell(assessment.title, body, 'Baseline Assessment Report')


# ──────────────────────────────────────────────
# Public: generate_comparison_report
# ──────────────────────────────────────────────

def generate_comparison_report(assessment, baseline, template):
    """
    Full HTML comparison report: current vs baseline.
    """
    framework      = template.framework
    is_aescsf      = framework in AESCSF_FRAMEWORKS
    cur_score      = assessment.score
    base_score     = baseline.score
    control_config = assessment.control_config or {} if framework in LEVEL_BASED_FRAMEWORKS else None
    prefix         = _level_prefix(framework)

    # AESCSF: global SP target
    sp_target = None
    if is_aescsf and control_config:
        raw = control_config.get('__sp')
        if raw is not None:
            try:
                sp_target = int(float(raw))
            except (TypeError, ValueError):
                pass

    cur_sec  = _section_scores(assessment, template, control_config, sp_target=sp_target)
    base_sec = _section_scores(baseline,   template, control_config, sp_target=sp_target)
    base_map = {n: s for n, s in base_sec}

    delta_overall = ((_pct(cur_score) - _pct(base_score)) if (cur_score is not None and base_score is not None) else None)

    # Header
    header = f'''<div class="report-header">
  <div class="brand">OziCyber</div>
  <h1>{assessment.title}</h1>
  <div class="subtitle">Comparison Report &nbsp;|&nbsp; {template.name}
    {f'&nbsp;|&nbsp; Engagement: {assessment.engagement.name}' if assessment.engagement else ''}
  </div>
</div>'''

    # Comparison banner
    cur_str  = f'{cur_score:.1f}%'  if cur_score  is not None else 'N/A'
    base_str = f'{base_score:.1f}%' if base_score is not None else 'N/A'
    delta_str = (f'+{delta_overall:.1f}%' if delta_overall and delta_overall >= 0 else f'{delta_overall:.1f}%') if delta_overall is not None else '—'
    delta_color = LIME if delta_overall and delta_overall >= 0 else RED

    compare_banner = f'''<div class="compare-banner">
  <div>
    <div class="score-lbl">Baseline ({baseline.completed_at.strftime("%d %b %Y") if baseline.completed_at else "—"})</div>
    <div class="score-big">{base_str}</div>
  </div>
  <div class="arrow">→</div>
  <div>
    <div class="score-lbl">Current ({assessment.completed_at.strftime("%d %b %Y") if assessment.completed_at else "—"})</div>
    <div class="score-big">{cur_str}</div>
  </div>
  <div style="margin-left:auto;text-align:right">
    <div class="score-lbl">Overall Change</div>
    <div class="score-big" style="color:{delta_color}">{delta_str}</div>
  </div>
</div>'''

    # Quick stats — scoped to target ML / SP
    cur_resp_map  = {r.question_id: r for r in assessment.responses.all()}
    base_resp_map = {r.question_id: r for r in baseline.responses.all()}
    total_q = compliant = base_compliant = 0
    for section in template.sections.prefetch_related('questions').all():
        t_ml = _target_ml(section, control_config)
        for q in section.questions.all():
            if is_aescsf and sp_target is not None and q.weight and int(q.weight) > sp_target:
                continue
            if not _in_scope(q, t_ml):
                continue
            total_q += 1
            cr = cur_resp_map.get(q.id)
            br = base_resp_map.get(q.id)
            if cr and (cr.answer in POSITIVE_ANSWERS or cr.maturity_achieved):
                compliant += 1
            if br and (br.answer in POSITIVE_ANSWERS or br.maturity_achieved):
                base_compliant += 1
    comp_delta = compliant - base_compliant
    comp_delta_str = f'+{comp_delta}' if comp_delta >= 0 else str(comp_delta)
    comp_delta_css = 'highlight' if comp_delta >= 0 else 'danger'

    metrics = f'''<div class="metrics">
  <div class="metric-card">
    <div class="val">{cur_str}</div>
    <div class="lbl">Current Score</div>
  </div>
  <div class="metric-card">
    <div class="val">{base_str}</div>
    <div class="lbl">Baseline Score</div>
  </div>
  <div class="metric-card {comp_delta_css}">
    <div class="val">{comp_delta_str}</div>
    <div class="lbl">Compliant Controls Change</div>
  </div>
  <div class="metric-card">
    <div class="val">{total_q}</div>
    <div class="lbl">Total Questions</div>
  </div>
</div>'''

    # Charts
    cur_gauge  = _gauge_svg(cur_score)
    base_gauge = _gauge_svg(base_score)

    sections_delta = [(n, s, base_map.get(n)) for n, s in cur_sec]
    bar_chart   = _bar_chart_svg([(n, c, b) for n, c, b in sections_delta])
    delta_chart = _delta_bar_svg([(n, c, b) for n, c, b in sections_delta if b is not None])

    # Gauge row: baseline left, current right, bar chart fills remaining width
    charts = f'''<h2>Score Comparison</h2>
<div class="charts-row">
  <div class="chart-box-gauge">
    <p style="font-size:12px;color:#666;margin-bottom:6px;text-align:center">Baseline</p>{base_gauge}
  </div>
  <div class="chart-box-gauge">
    <p style="font-size:12px;color:#666;margin-bottom:6px;text-align:center">Current</p>{cur_gauge}
  </div>
  <div class="chart-box-bar" style="flex:1">{bar_chart}</div>
</div>
<div class="charts-row">
  <div class="chart-box">{bar_chart}</div>
  <div class="chart-box">{delta_chart}</div>
</div>'''

    # Section comparison table
    sec_rows = ''
    for name, cur_s, base_s in sections_delta:
        cur_pct  = f'{cur_s:.1f}%'  if cur_s  is not None else 'N/A'
        base_pct = f'{base_s:.1f}%' if base_s is not None else 'N/A'
        if cur_s is not None and base_s is not None:
            d = cur_s - base_s
            d_str = (f'+{d:.1f}%' if d >= 0 else f'{d:.1f}%')
            d_cls = 'delta-pos' if d >= 0 else 'delta-neg'
        else:
            d_str, d_cls = '—', 'delta-neu'

        sec_rows += f'''<tr>
  <td>{name}</td>
  <td style="color:{_score_color(base_s)};font-weight:700">{base_pct}</td>
  <td style="color:{_score_color(cur_s)};font-weight:700">{cur_pct}</td>
  <td class="{d_cls}">{d_str}</td>
  <td>{_score_label(cur_s)}</td>
</tr>'''

    sec_table = f'''<h2>Domain / Section Comparison</h2>
<table>
  <thead><tr><th>Domain / Section</th><th>Baseline</th><th>Current</th><th>Change</th><th>Status</th></tr></thead>
  <tbody>{sec_rows}</tbody>
</table>'''

    # What improved / regressed
    improved  = [(n, c, b) for n, c, b in sections_delta if c is not None and b is not None and c > b]
    regressed = [(n, c, b) for n, c, b in sections_delta if c is not None and b is not None and c < b]

    def section_list(items, color, verb):
        if not items:
            return f'<p style="color:#999;font-style:italic">None.</p>'
        lis = ''.join(f'<li><strong>{n}</strong>: {b:.1f}% → {c:.1f}% ({verb}{abs(c-b):.1f}%)</li>' for n, c, b in items)
        return f'<ul style="padding-left:18px">{lis}</ul>'

    tracking = f'''<h2>Progress Tracking</h2>
<div style="display:flex;gap:24px;flex-wrap:wrap">
  <div style="flex:1;min-width:220px">
    <h3 style="color:{LIME}">✔ Improved Areas</h3>
    {section_list(improved, LIME, '+')}
  </div>
  <div style="flex:1;min-width:220px">
    <h3 style="color:{RED}">✘ Regressed Areas</h3>
    {section_list(regressed, RED, '-')}
  </div>
</div>'''

    # Remediation roadmap — level-based frameworks get MIL/ML/IG-aware roadmap; others get generic
    if framework in LEVEL_BASED_FRAMEWORKS:
        roadmap_html = _level_roadmap_html(assessment, template)
    else:
        remediation  = _remediation_items(assessment, template, control_config, sp_target=sp_target)
        high_items   = [i for i in remediation if i['priority'] == 'High'][:15]
        medium_items = [i for i in remediation if i['priority'] == 'Medium'][:10]
        low_items    = [i for i in remediation if i['priority'] == 'Low'][:10]

        def phase_block(title, color, items, timeline):
            if not items:
                return ''
            lis = ''.join(f'<li><strong>{i["section"]}:</strong> {i["text"][:120]}{"…" if len(i["text"])>120 else ""}</li>' for i in items)
            return f'''<div class="roadmap-phase">
  <h4 style="color:{color}">{title} — {timeline}</h4>
  <ul>{lis}</ul>
</div>'''

        roadmap_html = f'''<h2>Updated Remediation Roadmap</h2>
<p style="color:#555;margin-bottom:16px;font-size:13px">
  Based on current assessment. Items that were non-compliant in the baseline and remain non-compliant are highest priority.
</p>
<div class="roadmap">
  {phase_block('Phase 1 — Critical / High Priority', RED, high_items, '0–30 days')}
  {phase_block('Phase 2 — Medium Priority', AMBER, medium_items, '30–90 days')}
  {phase_block('Phase 3 — Low Priority', GREY, low_items, '90–180 days')}
</div>'''

    # Side-by-side control audit (scoped to target ML / SP, no assessor guidance)
    def _ans_badge(ans, r=None):
        if ans in POSITIVE_ANSWERS or (r and r.maturity_achieved):
            return '<span class="ans-yes">✓ Compliant</span>'
        if ans in PARTIAL_ANSWERS:
            return '<span class="ans-partial">~ Partial</span>'
        if ans in ('NO', '0', 'Not Implemented', 'Non-Compliant'):
            return '<span class="ans-no">✗ Non-Compliant</span>'
        if ans in ('N/A', 'Not Applicable', 'Not Present - Not Applicable'):
            return '<span class="ans-na">N/A</span>'
        return '<span class="ans-na">Not Answered</span>'

    audit_rows = ''
    count = 0
    for section in template.sections.prefetch_related('questions').all():
        t_ml = _target_ml(section, control_config)
        for q in section.questions.all():
            if is_aescsf and sp_target is not None and q.weight and int(q.weight) > sp_target:
                continue
            if not _in_scope(q, t_ml):
                continue
            if count >= 200:
                break
            cr = cur_resp_map.get(q.id)
            br = base_resp_map.get(q.id)
            ml_badge = ''
            if q.maturity_level is not None:
                mc = LEVEL_COLORS_CSS.get(q.maturity_level, '#95a5a6')
                ml_badge = f'<span style="background:{mc};color:#fff;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:700;margin-left:6px">{prefix}{q.maturity_level}</span>'
            audit_rows += f'''<tr>
  <td style="color:#666;font-size:12px;white-space:nowrap">{section.name}{ml_badge}</td>
  <td>{q.text}</td>
  <td>{_ans_badge(br.answer if br else '', br)}</td>
  <td>{_ans_badge(cr.answer if cr else '', cr)}</td>
</tr>'''
            count += 1

    audit_section = f'''<h2>Control Assessment Comparison</h2>
<p style="color:#555;font-size:13px;margin-bottom:16px">
  Side-by-side comparison of baseline and current responses for each assessed control.
</p>
<table>
  <thead><tr><th>Domain</th><th>Control</th><th>Baseline</th><th>Current</th></tr></thead>
  <tbody>{audit_rows}</tbody>
</table>'''

    ml_tracker = _level_tracker_html(assessment, template) if template.framework in LEVEL_BASED_FRAMEWORKS else ''

    body = (header + compare_banner + metrics + charts +
            sec_table + ml_tracker + tracking + roadmap_html + audit_section)
    return _html_shell(assessment.title, body, 'Comparison Assessment Report')

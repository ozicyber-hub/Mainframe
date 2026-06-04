"""
HTML Pentest Report Generator — OziCyber
Generates a full standalone HTML report from a Report + Findings queryset.
Mirrors every field in TEMPLATE_VARIABLES.md, styled in OziCyber brand colours.
"""
import math
import base64
import re
from datetime import date, datetime

from bs4 import BeautifulSoup

# ── Brand colours ────────────────────────────────────────────────────────────
GREEN       = '#24483E'
GOLD        = '#c9a84c'
WHITE       = '#ffffff'
LIGHT       = '#f4f7f4'
LIGHT_GOLD  = '#fff8e7'

SEV_COLORS = {
    'CRITICAL':      '#c0392b',
    'HIGH':          '#e67e22',
    'MEDIUM':        '#f39c12',
    'LOW':           '#27ae60',
    'INFORMATIONAL': '#2980b9',
}
SEV_BG = {
    'CRITICAL':      '#fdf0ef',
    'HIGH':          '#fef5ec',
    'MEDIUM':        '#fefae6',
    'LOW':           '#edfdf3',
    'INFORMATIONAL': '#eaf4fc',
}
SEV_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL']

STATUS_DISPLAY = {
    'DRAFT': 'Draft', 'OPEN': 'Open', 'IN_REVIEW': 'In Review',
    'PUBLISHED': 'Published', 'REMEDIATED': 'Remediated',
    'FALSE_POSITIVE': 'False Positive', 'ACCEPTED_RISK': 'Risk Accepted',
}
STATUS_COLOR = {
    'OPEN': '#c0392b', 'IN_REVIEW': '#e67e22', 'PUBLISHED': '#27ae60',
    'REMEDIATED': '#27ae60', 'DRAFT': '#95a5a6',
    'FALSE_POSITIVE': '#95a5a6', 'ACCEPTED_RISK': '#f39c12',
}

CONSEQUENCE_MAP = {'HIGH': 'Major', 'MEDIUM': 'Moderate', 'LOW': 'Minor'}
LIKELIHOOD_MAP  = {'HIGH': 'Likely', 'MEDIUM': 'Possible', 'LOW': 'Unlikely'}

CVSS_METRIC_DISPLAY = {
    'av': {'N': 'Network', 'A': 'Adjacent Network', 'L': 'Local', 'P': 'Physical'},
    'ac': {'L': 'Low', 'H': 'High'},
    'pr': {'N': 'None', 'L': 'Low', 'H': 'High'},
    'ui': {'N': 'None', 'R': 'Required'},
    's':  {'U': 'Unchanged', 'C': 'Changed'},
    'c':  {'N': 'None', 'L': 'Low', 'H': 'High'},
    'i':  {'N': 'None', 'L': 'Low', 'H': 'High'},
    'a':  {'N': 'None', 'L': 'Low', 'H': 'High'},
}

TYPE_PREFIXES = {
    'WEB_APP': 'WEB', 'INTERNAL': 'INT', 'EXTERNAL': 'EXT',
    'MOBILE': 'MOB', 'API': 'API', 'CLOUD': 'CLD',
    'SOCIAL_ENG': 'SOC', 'PHYSICAL': 'PHY', 'RED_TEAM': 'RED',
    'WIRELESS': 'WLS', 'OTHER': 'OTH',
}

TYPE_DISPLAY = {
    'WEB_APP': 'Web Application', 'INTERNAL': 'Internal Network',
    'EXTERNAL': 'External Network', 'MOBILE': 'Mobile Application',
    'API': 'API Testing', 'CLOUD': 'Cloud Infrastructure',
    'SOCIAL_ENG': 'Social Engineering', 'PHYSICAL': 'Physical Security',
    'RED_TEAM': 'Red Team', 'WIRELESS': 'Wireless', 'OTHER': 'Other',
}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _fmt(d, fmt='%d %B %Y'):
    if not d:
        return ''
    if isinstance(d, (datetime,)):
        return d.strftime(fmt)
    if isinstance(d, date):
        return d.strftime(fmt)
    return str(d)


def _html_to_plain(html):
    """Strip Quill HTML → plain text, preserve bullets."""
    if not html:
        return ''
    soup = BeautifulSoup(html, 'html.parser')
    lines = []
    for elem in soup.descendants:
        if elem.name == 'li':
            lines.append('• ' + elem.get_text(strip=True))
        elif elem.name in ('p', 'div', 'br'):
            text = elem.get_text(strip=True)
            if text:
                lines.append(text)
    return '\n'.join(lines) if lines else soup.get_text(separator='\n', strip=True)


def _html_to_rich(html):
    """
    Convert Quill HTML to safe display HTML.
    Strips dangerous tags, preserves paragraphs, lists, bold, italic.
    Also handles embedded base64 images.
    """
    if not html:
        return ''
    # Handle base64 images — keep them inline
    soup = BeautifulSoup(html, 'html.parser')
    # Strip scripts/style
    for tag in soup.find_all(['script', 'style']):
        tag.decompose()
    return str(soup)


def _short_mitigation(html, max_sentences=2):
    text = _html_to_plain(html or '')
    if not text:
        return ''
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return ' '.join(sentences[:max_sentences])


def _build_finding_codes(findings):
    """Return {finding.id: 'WEB-01'} stable codes."""
    groups = {}
    for f in findings:
        key = f.pentest_type or '__untagged__'
        groups.setdefault(key, []).append(f)
    codes = {}
    for key, group in groups.items():
        prefix = TYPE_PREFIXES.get(key, 'FIN')
        sorted_group = sorted(group, key=lambda f: (
            -{'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'INFORMATIONAL': 0}.get(f.severity, 0),
            f.created_at,
        ))
        for idx, f in enumerate(sorted_group, 1):
            codes[f.id] = f'{prefix}-{idx:02d}'
    return codes


def _overall_risk(findings):
    for sev in SEV_ORDER:
        if any(f.severity == sev for f in findings):
            return sev.capitalize()
    return 'Informational'


def _scope_items(text):
    if not text:
        return []
    return [line.strip().lstrip('•-').strip() for line in text.splitlines() if line.strip()]


def _cvss_band(score):
    if score is None:
        return ('N/A', '#95a5a6')
    s = float(score)
    if s == 0:
        return ('None (0.0)', '#95a5a6')
    if s < 4:
        return (f'Low ({s:.1f})', SEV_COLORS['LOW'])
    if s < 7:
        return (f'Medium ({s:.1f})', SEV_COLORS['MEDIUM'])
    if s < 9:
        return (f'High ({s:.1f})', SEV_COLORS['HIGH'])
    return (f'Critical ({s:.1f})', SEV_COLORS['CRITICAL'])


def _esc(text):
    """HTML-escape a plain string."""
    if text is None:
        return ''
    return (str(text)
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;'))


def _nl2br(text):
    return _esc(text).replace('\n', '<br>')


# ── SVG charts ───────────────────────────────────────────────────────────────

def _severity_bar_chart(counts, width=480, bar_h=30, gap=8):
    """Horizontal bar chart of finding counts by severity."""
    max_v = max(counts.values()) if counts else 1
    n = len([s for s in SEV_ORDER if counts.get(s, 0) > 0 or True])
    chart_w = width - 160
    h = n * (bar_h + gap) + 50

    bars = ''
    for i, sev in enumerate(SEV_ORDER):
        count = counts.get(sev, 0)
        y = 30 + i * (bar_h + gap)
        color = SEV_COLORS[sev]
        bar_len = (chart_w * count / max_v) if max_v else 0
        sev_label = sev.capitalize()
        bars += f'''
  <text x="145" y="{y + bar_h//2 + 5}" text-anchor="end" font-size="12" fill="#333" font-weight="600">{sev_label}</text>
  <rect x="150" y="{y}" width="{chart_w}" height="{bar_h}" rx="4" fill="#f0f0f0"/>
  <rect x="150" y="{y}" width="{max(bar_len, 0):.1f}" height="{bar_h}" rx="4" fill="{color}"/>
  <text x="{150 + max(bar_len, 0) + 8}" y="{y + bar_h//2 + 5}" font-size="13" fill="{color}" font-weight="800">{count}</text>'''

    return f'''<svg width="{width}" height="{h}" viewBox="0 0 {width} {h}">
  <text x="0" y="16" font-size="13" font-weight="bold" fill="{GREEN}">Findings by Severity</text>
  {bars}
</svg>'''


def _status_donut(counts, size=200):
    """Donut chart of findings by status."""
    total = sum(counts.values())
    if total == 0:
        return ''

    STATUS_CHART_COLORS = {
        'OPEN': '#c0392b', 'IN_REVIEW': '#e67e22', 'PUBLISHED': '#f39c12',
        'REMEDIATED': '#27ae60', 'DRAFT': '#bdc3c7',
        'FALSE_POSITIVE': '#95a5a6', 'ACCEPTED_RISK': '#8e44ad',
    }

    cx, cy, r_outer, r_inner = size//2, size//2, size//2 - 10, size//2 - 38
    start = -math.pi / 2
    slices = ''
    legend = ''
    legend_y = 10

    for status, count in sorted(counts.items(), key=lambda x: -x[1]):
        if count == 0:
            continue
        frac = count / total
        end = start + 2 * math.pi * frac
        x1o, y1o = cx + r_outer * math.cos(start), cy + r_outer * math.sin(start)
        x2o, y2o = cx + r_outer * math.cos(end),   cy + r_outer * math.sin(end)
        x1i, y1i = cx + r_inner * math.cos(end),   cy + r_inner * math.sin(end)
        x2i, y2i = cx + r_inner * math.cos(start), cy + r_inner * math.sin(start)
        large = 1 if frac > 0.5 else 0
        color = STATUS_CHART_COLORS.get(status, '#bdc3c7')
        slices += f'''<path d="M {x1o:.1f} {y1o:.1f} A {r_outer} {r_outer} 0 {large} 1 {x2o:.1f} {y2o:.1f}
  L {x1i:.1f} {y1i:.1f} A {r_inner} {r_inner} 0 {large} 0 {x2i:.1f} {y2i:.1f} Z"
  fill="{color}" stroke="white" stroke-width="2"/>'''
        legend += f'''<rect x="{size+10}" y="{legend_y}" width="12" height="12" rx="2" fill="{color}"/>
  <text x="{size+26}" y="{legend_y+11}" font-size="11" fill="#333">{STATUS_DISPLAY.get(status, status)}: {count}</text>'''
        legend_y += 20
        start = end

    # centre label
    centre = f'''<text x="{cx}" y="{cy-4}" text-anchor="middle" font-size="20" font-weight="800" fill="{GREEN}">{total}</text>
  <text x="{cx}" y="{cy+14}" text-anchor="middle" font-size="10" fill="#666">Findings</text>'''

    total_w = size + 10 + 140
    return f'''<svg width="{total_w}" height="{size}" viewBox="0 0 {total_w} {size}">
  {slices}{centre}{legend}
</svg>'''


def _risk_matrix_svg(findings, size=280):
    """5×5 risk matrix heat map with finding dots."""
    cell = (size - 40) // 5
    rows_label = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain']
    col_label  = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic']
    # colour gradient: low→high
    heat = [
        ['#27ae60','#27ae60','#f39c12','#f39c12','#e67e22'],
        ['#27ae60','#f39c12','#f39c12','#e67e22','#c0392b'],
        ['#f39c12','#f39c12','#e67e22','#c0392b','#c0392b'],
        ['#f39c12','#e67e22','#c0392b','#c0392b','#c0392b'],
        ['#e67e22','#c0392b','#c0392b','#c0392b','#c0392b'],
    ]
    IMPACT_IDX    = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3}
    LIKELIHOOD_IDX = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3}

    grid = ''
    for row in range(5):
        for col in range(5):
            x = 40 + col * cell
            y = size - 20 - (row + 1) * cell
            color = heat[4 - row][col]
            grid += f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" fill="{color}" fill-opacity="0.25" stroke="#fff" stroke-width="1"/>'

    row_labels = ''
    for i, lbl in enumerate(rows_label):
        y = size - 20 - (i + 0.5) * cell
        row_labels += f'<text x="36" y="{y+4}" text-anchor="end" font-size="8" fill="#555">{lbl}</text>'

    col_labels = ''
    for i, lbl in enumerate(col_label):
        x = 40 + (i + 0.5) * cell
        col_labels += f'<text x="{x}" y="{size-4}" text-anchor="middle" font-size="8" fill="#555">{lbl}</text>'

    dots = ''
    placed = {}
    for f in findings:
        imp_idx = IMPACT_IDX.get(f.impact_rating, None)
        lik_idx = LIKELIHOOD_IDX.get(f.likelihood_rating, None)
        if imp_idx is None or lik_idx is None:
            continue
        col = imp_idx - 1 + 1  # 1-based mapped to grid col (1=Minor col idx 1)
        row = lik_idx - 1 + 1
        key = (col, row)
        offset = placed.get(key, 0)
        placed[key] = offset + 1
        cx = 40 + (col - 0.5) * cell + (offset % 2) * 8 - 4
        cy = size - 20 - (row - 0.5) * cell + (offset // 2) * 8 - 4
        color = SEV_COLORS.get(f.severity, '#666')
        dots += f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="6" fill="{color}" fill-opacity="0.85" stroke="white" stroke-width="1.5"/>'

    return f'''<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <text x="{size//2}" y="14" text-anchor="middle" font-size="11" font-weight="bold" fill="{GREEN}">Risk Matrix</text>
  <text x="10" y="{size//2}" transform="rotate(-90, 10, {size//2})" text-anchor="middle" font-size="9" fill="#666">Likelihood →</text>
  {grid}{row_labels}{col_labels}{dots}
</svg>'''


# ── CSS ──────────────────────────────────────────────────────────────────────

def _css():
    return f"""
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #222; background: #fff; font-size: 14px; line-height: 1.6; }}
.page {{ max-width: 1000px; margin: 0 auto; padding: 0 40px 60px; }}

/* ── COVER PAGE ── */
.cover {{ background: {GREEN}; min-height: 100vh; display: flex; flex-direction: column;
          justify-content: center; padding: 80px 60px; margin: 0 -40px; page-break-after: always; }}
.cover .brand {{ color: {GOLD}; font-size: 15px; font-weight: 800; letter-spacing: 3px;
                 text-transform: uppercase; margin-bottom: 40px; }}
.cover h1 {{ color: #fff; font-size: 38px; font-weight: 800; line-height: 1.2; margin-bottom: 12px; }}
.cover .subtitle {{ color: rgba(255,255,255,0.75); font-size: 18px; margin-bottom: 48px; }}
.cover .meta-table {{ border-top: 1px solid rgba(255,255,255,0.2); padding-top: 32px; }}
.cover .meta-row {{ display: flex; gap: 16px; margin-bottom: 12px; }}
.cover .meta-label {{ color: {GOLD}; font-size: 11px; text-transform: uppercase;
                       letter-spacing: 1px; min-width: 160px; font-weight: 700; padding-top: 2px; }}
.cover .meta-value {{ color: #fff; font-size: 14px; }}
.draft-watermark {{ display: inline-block; background: {GOLD}; color: {GREEN}; font-weight: 800;
                    font-size: 12px; padding: 4px 14px; border-radius: 20px; letter-spacing: 2px;
                    text-transform: uppercase; margin-bottom: 24px; }}
.final-badge {{ display: inline-block; background: {GOLD}; color: {GREEN}; font-weight: 800;
                font-size: 12px; padding: 4px 14px; border-radius: 20px; letter-spacing: 2px;
                text-transform: uppercase; margin-bottom: 24px; }}

/* ── TOC ── */
.toc {{ margin: 40px 0; page-break-after: always; }}
.toc h2 {{ font-size: 22px; color: {GREEN}; border-bottom: 3px solid {GREEN}; padding-bottom: 8px; margin-bottom: 20px; }}
.toc-item {{ display: flex; align-items: baseline; gap: 8px; padding: 6px 0;
             border-bottom: 1px dotted #ddd; font-size: 14px; }}
.toc-item .toc-num {{ color: {GOLD}; font-weight: 700; min-width: 28px; }}
.toc-item .toc-title {{ flex: 1; color: #333; }}
.toc-sub {{ padding-left: 28px; }}
.toc-sub .toc-num {{ color: {GREEN}; }}

/* ── SECTION HEADINGS ── */
h2.section {{ font-size: 22px; font-weight: 800; color: {GREEN}; border-bottom: 3px solid {GREEN};
              padding-bottom: 8px; margin: 48px 0 20px; }}
h3.subsection {{ font-size: 16px; font-weight: 700; color: {GREEN}; margin: 28px 0 12px; }}
.section-intro {{ color: #555; font-size: 14px; margin-bottom: 20px; line-height: 1.65; }}

/* ── SUMMARY METRICS ── */
.metrics {{ display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; }}
.metric-card {{ flex: 1; min-width: 110px; border-radius: 10px; padding: 16px 18px;
                text-align: center; border: 1px solid #e0e0e0; }}
.metric-card .val {{ font-size: 32px; font-weight: 900; line-height: 1; }}
.metric-card .lbl {{ font-size: 11px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }}
.sev-CRITICAL {{ background: {SEV_BG['CRITICAL']}; border-color: {SEV_COLORS['CRITICAL']}33; }}
.sev-CRITICAL .val {{ color: {SEV_COLORS['CRITICAL']}; }}
.sev-HIGH {{ background: {SEV_BG['HIGH']}; border-color: {SEV_COLORS['HIGH']}33; }}
.sev-HIGH .val {{ color: {SEV_COLORS['HIGH']}; }}
.sev-MEDIUM {{ background: {SEV_BG['MEDIUM']}; border-color: {SEV_COLORS['MEDIUM']}33; }}
.sev-MEDIUM .val {{ color: {SEV_COLORS['MEDIUM']}; }}
.sev-LOW {{ background: {SEV_BG['LOW']}; border-color: {SEV_COLORS['LOW']}33; }}
.sev-LOW .val {{ color: {SEV_COLORS['LOW']}; }}
.sev-INFO {{ background: {SEV_BG['INFORMATIONAL']}; border-color: {SEV_COLORS['INFORMATIONAL']}33; }}
.sev-INFO .val {{ color: {SEV_COLORS['INFORMATIONAL']}; }}

/* ── SEVERITY BADGE ── */
.sev-badge {{ display: inline-block; font-weight: 800; font-size: 12px; padding: 3px 12px;
              border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }}
.sev-badge-CRITICAL {{ background: {SEV_COLORS['CRITICAL']}; color: #fff; }}
.sev-badge-HIGH {{ background: {SEV_COLORS['HIGH']}; color: #fff; }}
.sev-badge-MEDIUM {{ background: {SEV_COLORS['MEDIUM']}; color: #333; }}
.sev-badge-LOW {{ background: {SEV_COLORS['LOW']}; color: #fff; }}
.sev-badge-INFORMATIONAL {{ background: {SEV_COLORS['INFORMATIONAL']}; color: #fff; }}

/* ── TABLES ── */
table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }}
th {{ background: {GREEN}; color: #fff; padding: 10px 14px; text-align: left;
      font-size: 12px; font-weight: 700; }}
td {{ padding: 9px 14px; border-bottom: 1px solid #e8ede8; vertical-align: top; }}
tr:nth-child(even) td {{ background: {LIGHT}; }}
.table-label {{ font-weight: 700; color: {GREEN}; min-width: 180px; }}

/* ── FINDING CARD ── */
.finding-card {{ border: 1px solid #e0e0e0; border-radius: 10px; margin-bottom: 36px;
                 page-break-inside: avoid; overflow: hidden; }}
.finding-header {{ padding: 20px 24px 16px; border-bottom: 1px solid #e0e0e0; }}
.finding-header .finding-code {{ font-size: 11px; font-weight: 700; color: {GOLD}; letter-spacing: 1px; }}
.finding-header h3 {{ font-size: 18px; font-weight: 800; color: #111; margin: 4px 0 10px; line-height: 1.3; }}
.finding-meta {{ display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }}
.finding-body {{ padding: 20px 24px; }}
.finding-field {{ margin-bottom: 18px; }}
.finding-field-label {{ font-size: 11px; font-weight: 700; color: {GREEN}; text-transform: uppercase;
                         letter-spacing: 0.5px; margin-bottom: 5px; }}
.finding-field-value {{ font-size: 13px; color: #333; line-height: 1.65; }}
.finding-field-value p {{ margin-bottom: 8px; }}
.finding-field-value ul, .finding-field-value ol {{ padding-left: 18px; }}
.finding-field-value li {{ margin-bottom: 4px; }}
.affected-asset {{ background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 6px;
                   padding: 8px 12px; font-family: monospace; font-size: 12px; color: #555; }}

/* CVSS table */
.cvss-table {{ background: {LIGHT}; border-radius: 8px; overflow: hidden; margin-top: 10px; }}
.cvss-table table {{ margin: 0; font-size: 12px; }}
.cvss-table th {{ background: {GREEN}cc; font-size: 11px; padding: 7px 10px; }}
.cvss-table td {{ padding: 7px 10px; border-color: #dde8dd; }}
.cvss-score-big {{ display: inline-block; padding: 6px 16px; border-radius: 8px;
                   font-size: 22px; font-weight: 900; color: #fff; margin-bottom: 10px; }}

/* ── KEY FINDINGS ── */
.key-finding {{ background: {LIGHT}; border-left: 4px solid {GOLD}; border-radius: 0 8px 8px 0;
                padding: 14px 18px; margin-bottom: 12px; }}
.key-finding .kf-title {{ font-weight: 700; color: #111; margin-bottom: 4px; }}
.key-finding .kf-mitigation {{ font-size: 13px; color: #555; }}

/* ── ATTACK CHAIN ── */
.attack-chain {{ display: flex; flex-wrap: wrap; gap: 12px; margin: 16px 0 28px; }}
.phase-group {{ background: {LIGHT}; border-radius: 8px; padding: 12px 16px; min-width: 180px; flex: 1; }}
.phase-title {{ font-size: 10px; font-weight: 700; color: {GOLD}; text-transform: uppercase;
                letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }}
.phase-finding {{ font-size: 12px; color: #333; padding: 4px 0; border-bottom: 1px solid #e8e8e8; }}
.phase-finding:last-child {{ border-bottom: none; }}
.phase-finding .pf-sev {{ display: inline-block; width: 8px; height: 8px; border-radius: 50%;
                           margin-right: 6px; vertical-align: middle; }}

/* ── SCOPE ── */
.scope-item {{ padding: 6px 0; border-bottom: 1px solid #eee; font-size: 13px; }}
.scope-item::before {{ content: '▸'; color: {GOLD}; margin-right: 8px; font-size: 10px; }}
.out-of-scope-item::before {{ content: '✕'; color: #c0392b; margin-right: 8px; font-size: 10px; }}

/* ── REMEDIATION TRACKER ── */
.remediated-yes {{ color: #27ae60; font-weight: 700; }}
.remediated-no  {{ color: #c0392b; font-weight: 700; }}

/* ── RICH TEXT CONTENT ── */
.rich-content {{ font-size: 14px; line-height: 1.7; color: #333; }}
.rich-content p {{ margin-bottom: 10px; }}
.rich-content ul, .rich-content ol {{ padding-left: 20px; margin-bottom: 10px; }}
.rich-content li {{ margin-bottom: 5px; }}
.rich-content strong {{ font-weight: 700; }}
.rich-content img {{ max-width: 100%; border-radius: 6px; margin: 10px 0; border: 1px solid #e0e0e0; }}

/* ── CHARTS ROW ── */
.charts-row {{ display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 28px; }}
.chart-box {{ background: {LIGHT}; border-radius: 10px; padding: 20px 24px; }}

/* ── INFO PANELS ── */
.info-panel {{ background: {LIGHT}; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px; }}
.info-panel h4 {{ font-size: 12px; font-weight: 700; color: {GOLD}; text-transform: uppercase;
                  letter-spacing: 1px; margin-bottom: 12px; }}
.info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
.info-row {{ display: flex; gap: 12px; padding: 6px 0; border-bottom: 1px solid #e0e8e0; font-size: 13px; }}
.info-row:last-child {{ border-bottom: none; }}
.info-label {{ color: {GREEN}; font-weight: 700; min-width: 160px; font-size: 12px; }}
.info-value {{ color: #333; flex: 1; }}

/* ── PAGE BREAK ── */
.page-break {{ page-break-before: always; }}

/* ── FOOTER ── */
.footer {{ margin-top: 60px; padding-top: 20px; border-top: 2px solid {GREEN};
           display: flex; justify-content: space-between; font-size: 11px; color: #999; }}
.footer .brand {{ color: {GREEN}; font-weight: 700; }}

/* ── PRINT ── */
@media print {{
  .page {{ padding: 0; }}
  .cover {{ margin: 0; }}
  .finding-card {{ page-break-inside: avoid; }}
}}
"""


# ── HTML Shell ────────────────────────────────────────────────────────────────

def _shell(title, body):
    now = datetime.now().strftime('%d %B %Y %H:%M')
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_esc(title)}</title>
<style>{_css()}</style>
</head>
<body>
<div class="page">
{body}
<div class="footer">
  <span class="brand">OziCyber</span>
  <span>{_esc(title)}</span>
  <span>Generated {now}</span>
</div>
</div>
</body>
</html>"""


# ── Section builders ──────────────────────────────────────────────────────────

def _cover(report, engagement, org):
    draft_badge = '<span class="draft-watermark">Draft</span>' if report.is_draft else '<span class="final-badge">Final</span>'

    lead = engagement.lead_pentester
    pm   = engagement.project_manager

    rows = [
        ('Client',          org.name if org else (engagement.client_name or '—')),
        ('Engagement',      engagement.name),
        ('Type',            engagement.get_engagement_type_display()),
        ('Testing Period',  f'{_fmt(engagement.start_date)} – {_fmt(engagement.end_date)}'),
        ('Report Version',  f'v{report.version}'),
        ('Classification',  'CONFIDENTIAL'),
        ('Lead Tester',     lead.get_full_name() if lead else '—'),
        ('Project Manager', pm.get_full_name() if pm else '—'),
        ('Prepared By',     'OziCyber'),
    ]
    meta = ''.join(f'''<div class="meta-row">
  <span class="meta-label">{_esc(k)}</span>
  <span class="meta-value">{_esc(v)}</span>
</div>''' for k, v in rows)

    return f'''<div class="cover">
  <div class="brand">OziCyber</div>
  {draft_badge}
  <h1>{_esc(report.title)}</h1>
  <div class="subtitle">{_esc(engagement.get_engagement_type_display())} — Security Assessment Report</div>
  <div class="meta-table">{meta}</div>
</div>'''


def _toc(findings, has_attack_chain):
    sections = [
        ('1', 'Document Control'),
        ('2', 'Executive Summary'),
        ('3', 'Engagement Details'),
        ('4', 'Scope of Assessment'),
        ('5', 'Finding Summary'),
        ('6', 'Key Findings'),
        ('7', 'Methodology'),
        ('8', 'Detailed Findings'),
        ('9', 'Remediation Tracker'),
    ]
    if has_attack_chain:
        sections.append(('10', 'Attack Chain'))
    sections.append((str(len(sections) + 1), 'Conclusion'))

    items = ''.join(f'''<div class="toc-item">
  <span class="toc-num">{num}.</span>
  <span class="toc-title">{title}</span>
</div>''' for num, title in sections)

    return f'''<div class="toc page-break">
  <h2>Table of Contents</h2>
  {items}
</div>'''


def _doc_control(report, engagement):
    lead = engagement.lead_pentester
    pm   = engagement.project_manager

    ver_rows = f'''<tr>
  <td>{_esc(report.version)}</td>
  <td>{_fmt(datetime.now())}</td>
  <td>{_esc(lead.get_full_name() if lead else 'OziCyber')}</td>
  <td>{'Draft' if report.is_draft else 'Final'} report generated</td>
</tr>'''

    distrib = f'''<tr>
  <td>{_esc(org_contact_name(engagement))}</td>
  <td>{_esc(engagement.client_email or '—')}</td>
  <td>Client</td>
</tr>
<tr>
  <td>{_esc(lead.get_full_name() if lead else '—')}</td>
  <td>{_esc(lead.email if lead else '—')}</td>
  <td>Lead Tester</td>
</tr>'''

    return f'''<h2 class="section">1. Document Control</h2>
<div class="info-panel">
  <h4>Classification</h4>
  <p class="section-intro">This document is classified <strong>CONFIDENTIAL</strong> and intended solely for
  the named recipient organisation. It must not be copied, distributed or disclosed to third parties
  without the express written consent of OziCyber.</p>
</div>
<h3 class="subsection">Version History</h3>
<table>
  <thead><tr><th>Version</th><th>Date</th><th>Author</th><th>Comment</th></tr></thead>
  <tbody>{ver_rows}</tbody>
</table>
<h3 class="subsection">Distribution</h3>
<table>
  <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
  <tbody>{distrib}</tbody>
</table>'''


def org_contact_name(engagement):
    if engagement.client_name:
        return engagement.client_name
    org = getattr(engagement, 'organization', None)
    return org.name if org else '—'


def _executive_summary(report, findings, codes):
    plain = _html_to_plain(report.executive_summary)
    counts = {s: sum(1 for f in findings if f.severity == s) for s in SEV_ORDER}
    total  = len(findings)
    risk   = _overall_risk(findings)

    key_findings = [f for f in findings if f.is_key_finding][:6]
    kf_html = ''
    for f in key_findings:
        kf_html += f'''<div class="key-finding">
  <div class="kf-title">
    <span class="sev-badge sev-badge-{f.severity}">{f.severity.capitalize()}</span>
    &nbsp;{_esc(codes.get(f.id, ''))} — {_esc(f.title)}
  </div>
  <div class="kf-mitigation">{_esc(_short_mitigation(f.recommendations))}</div>
</div>'''

    return f'''<h2 class="section">2. Executive Summary</h2>
<div class="rich-content section-intro">{_html_to_rich(report.executive_summary) or _esc(plain) or '<p>No executive summary provided.</p>'}</div>

<div class="metrics">
  <div class="metric-card" style="background:{LIGHT};border-color:{GREEN}33">
    <div class="val" style="color:{GREEN}">{total}</div>
    <div class="lbl">Total Findings</div>
  </div>
  <div class="metric-card sev-CRITICAL">
    <div class="val">{counts['CRITICAL']}</div><div class="lbl">Critical</div>
  </div>
  <div class="metric-card sev-HIGH">
    <div class="val">{counts['HIGH']}</div><div class="lbl">High</div>
  </div>
  <div class="metric-card sev-MEDIUM">
    <div class="val">{counts['MEDIUM']}</div><div class="lbl">Medium</div>
  </div>
  <div class="metric-card sev-LOW">
    <div class="val">{counts['LOW']}</div><div class="lbl">Low</div>
  </div>
  <div class="metric-card sev-INFO">
    <div class="val">{counts['INFORMATIONAL']}</div><div class="lbl">Info</div>
  </div>
  <div class="metric-card" style="background:{SEV_BG.get(risk.upper(), LIGHT)};border-color:{SEV_COLORS.get(risk.upper(), GREEN)}33">
    <div class="val" style="color:{SEV_COLORS.get(risk.upper(), GREEN)};font-size:22px">{_esc(risk)}</div>
    <div class="lbl">Overall Risk</div>
  </div>
</div>

{'<h3 class="subsection">Key Findings</h3>' + kf_html if kf_html else ''}'''


def _engagement_details(engagement, org):
    lead = engagement.lead_pentester
    pm   = engagement.project_manager
    proj_id = f'ENG-{engagement.id:04d}'

    rows = [
        ('Project ID',       proj_id),
        ('Engagement Name',  engagement.name),
        ('Engagement Type',  engagement.get_engagement_type_display()),
        ('Status',           engagement.get_status_display()),
        ('Description',      engagement.description or '—'),
        ('Start Date',       _fmt(engagement.start_date)),
        ('End Date',         _fmt(engagement.end_date)),
        ('Report Due Date',  _fmt(engagement.report_due_date) or '—'),
        ('Objectives',       engagement.objectives or '—'),
    ]
    team_rows = [
        ('Lead Pentester',       lead.get_full_name() if lead else '—'),
        ('Lead Pentester Email', lead.email if lead else '—'),
        ('Project Manager',      pm.get_full_name() if pm else '—'),
        ('PM Email',             pm.email if pm else '—'),
    ]
    client_rows = [
        ('Organisation',       org.name if org else '—'),
        ('Website',            org.website if org else '—'),
        ('Phone',              org.phone if org else '—'),
        ('Address',            org.address if org else '—'),
        ('Client Contact',     engagement.client_name or '—'),
        ('Contact Email',      engagement.client_email or '—'),
        ('Contact Phone',      engagement.client_phone or '—'),
    ]

    def _info_val(v):
        s = str(v)
        return _nl2br(s) if '\n' in s else _esc(s)

    def info_rows(items):
        return ''.join(f'<div class="info-row"><span class="info-label">{_esc(k)}</span><span class="info-value">{_info_val(v)}</span></div>'
                       for k, v in items)

    return f'''<h2 class="section">3. Engagement Details</h2>
<div class="info-panel">
  <h4>Project Information</h4>
  {info_rows(rows)}
</div>
<div class="info-panel">
  <h4>Project Team</h4>
  {info_rows(team_rows)}
</div>
<div class="info-panel">
  <h4>Client Information</h4>
  {info_rows(client_rows)}
</div>'''


def _scope_section(engagement):
    in_scope  = _scope_items(engagement.scope)
    out_scope = _scope_items(engagement.out_of_scope)

    in_html  = ''.join(f'<div class="scope-item">{_esc(s)}</div>' for s in in_scope) or '<p style="color:#999">No scope defined.</p>'
    out_html = ''.join(f'<div class="scope-item out-of-scope-item">{_esc(s)}</div>' for s in out_scope) or '<p style="color:#999">Not specified.</p>'

    return f'''<h2 class="section">4. Scope of Assessment</h2>
<h3 class="subsection">In Scope</h3>
{in_html}
<h3 class="subsection">Out of Scope</h3>
{out_html}'''


def _finding_summary(findings, codes):
    counts = {s: sum(1 for f in findings if f.severity == s) for s in SEV_ORDER}
    status_counts = {}
    for f in findings:
        status_counts[f.status] = status_counts.get(f.status, 0) + 1

    bar_chart    = _severity_bar_chart(counts)
    donut_chart  = _status_donut(status_counts)
    risk_matrix  = _risk_matrix_svg(findings)

    # Summary table
    rows = ''
    for sev in SEV_ORDER:
        count = counts.get(sev, 0)
        if count == 0:
            continue
        fs = [f for f in findings if f.severity == sev]
        rows += f'''<tr>
  <td><span class="sev-badge sev-badge-{sev}">{sev.capitalize()}</span></td>
  <td style="font-weight:800;color:{SEV_COLORS[sev]}">{count}</td>
  <td>{', '.join(_esc(codes.get(f.id, '')) for f in fs[:8])}{'...' if len(fs) > 8 else ''}</td>
</tr>'''

    return f'''<h2 class="section">5. Finding Summary</h2>
<div class="charts-row">
  <div class="chart-box">{bar_chart}</div>
  <div class="chart-box">{donut_chart}</div>
  <div class="chart-box">{risk_matrix}</div>
</div>
<table>
  <thead><tr><th>Severity</th><th>Count</th><th>Finding Codes</th></tr></thead>
  <tbody>{rows}</tbody>
</table>'''


def _key_findings_section(findings, codes):
    key = [f for f in findings if f.is_key_finding]
    if not key:
        key = sorted(findings, key=lambda f: -{'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'INFORMATIONAL': 0}.get(f.severity, 0))[:5]

    rows = ''
    for f in key:
        rows += f'''<tr>
  <td>{_esc(codes.get(f.id, ''))}</td>
  <td>{_esc(f.title)}</td>
  <td><span class="sev-badge sev-badge-{f.severity}">{f.severity.capitalize()}</span></td>
  <td>{_esc(_short_mitigation(f.recommendations, 3))}</td>
</tr>'''

    return f'''<h2 class="section">6. Key Findings</h2>
<p class="section-intro">The following findings represent the most significant security risks identified during this engagement.</p>
<table>
  <thead><tr><th>Code</th><th>Finding</th><th>Severity</th><th>Recommended Action</th></tr></thead>
  <tbody>{rows}</tbody>
</table>'''


def _methodology_section(report):
    content = _html_to_rich(report.methodology) if report.methodology else '''
<p>The assessment was conducted using industry-standard penetration testing methodologies including
OWASP Testing Guide, PTES (Penetration Testing Execution Standard), and NIST SP 800-115. The engagement
comprised the following phases:</p>
<ul>
  <li><strong>Reconnaissance</strong> — Passive and active information gathering</li>
  <li><strong>Scanning &amp; Enumeration</strong> — Identification of services, technologies and entry points</li>
  <li><strong>Exploitation</strong> — Controlled exploitation of identified vulnerabilities</li>
  <li><strong>Post-Exploitation</strong> — Privilege escalation, lateral movement and persistence assessment</li>
  <li><strong>Reporting</strong> — Documentation of findings, impact analysis and remediation guidance</li>
</ul>'''
    return f'''<h2 class="section">7. Methodology</h2>
<div class="rich-content">{content}</div>'''


def _finding_card(f, code, num):
    sev_color = SEV_COLORS.get(f.severity, '#666')
    sev_bg    = SEV_BG.get(f.severity, LIGHT)

    # Status badge
    st_color = STATUS_COLOR.get(f.status, '#666')
    status_badge = f'<span style="background:{st_color}22;color:{st_color};font-weight:700;font-size:11px;padding:3px 10px;border-radius:20px">{_esc(STATUS_DISPLAY.get(f.status, f.status))}</span>'

    # CVSS
    cvss_label, cvss_color = _cvss_band(f.cvss_score)
    cvss_block = ''
    if f.cvss_score or f.cvss_vector:
        metric_rows = ''
        for metric, label in [('av', 'Attack Vector'), ('ac', 'Attack Complexity'),
                               ('pr', 'Privileges Required'), ('ui', 'User Interaction'),
                               ('s', 'Scope'), ('c', 'Confidentiality'), ('i', 'Integrity'), ('a', 'Availability')]:
            val = getattr(f, metric, '')
            display = CVSS_METRIC_DISPLAY.get(metric, {}).get(val, val) if val else '—'
            metric_rows += f'<tr><td class="table-label">{label}</td><td>{_esc(display)}</td></tr>'

        cvss_block = f'''<div class="finding-field">
  <div class="finding-field-label">CVSS 3.1</div>
  <div class="cvss-table">
    <div style="padding:12px 14px 6px">
      <span class="cvss-score-big" style="background:{cvss_color}">{cvss_label}</span>
      {f'<div style="font-size:11px;color:#666;font-family:monospace;margin-top:4px">{_esc(f.cvss_vector)}</div>' if f.cvss_vector else ''}
    </div>
    <table><tbody>{metric_rows}</tbody></table>
  </div>
</div>'''

    # References
    refs_html = ''
    refs_parts = []
    if f.cwe_id:
        refs_parts.append(f'<strong>CWE:</strong> {_esc(f.cwe_id)}')
    if f.cve_id:
        refs_parts.append(f'<strong>CVE:</strong> {_esc(f.cve_id)}')
    if f.references:
        for line in f.references.splitlines():
            line = line.strip()
            if line:
                refs_parts.append(_esc(line))
    if refs_parts:
        refs_html = f'''<div class="finding-field">
  <div class="finding-field-label">References</div>
  <div class="finding-field-value">{' &nbsp;|&nbsp; '.join(refs_parts)}</div>
</div>'''

    def field(label, content, is_html=False):
        if not content:
            return ''
        val = content if is_html else f'<div style="white-space:pre-wrap">{_nl2br(content)}</div>'
        return f'''<div class="finding-field">
  <div class="finding-field-label">{label}</div>
  <div class="finding-field-value">{val}</div>
</div>'''

    # Impact / Likelihood labels
    impact_label = CONSEQUENCE_MAP.get(f.impact_rating, '') if f.impact_rating else ''
    likeli_label = LIKELIHOOD_MAP.get(f.likelihood_rating, '') if f.likelihood_rating else ''

    risk_info = ''
    if impact_label or likeli_label:
        risk_info = f'''<div style="display:flex;gap:16px;margin-bottom:16px">
  {f'<div style="background:{LIGHT};padding:8px 14px;border-radius:6px;font-size:12px"><strong style="color:{GREEN}">Impact:</strong> {_esc(impact_label)}</div>' if impact_label else ''}
  {f'<div style="background:{LIGHT};padding:8px 14px;border-radius:6px;font-size:12px"><strong style="color:{GREEN}">Likelihood:</strong> {_esc(likeli_label)}</div>' if likeli_label else ''}
</div>'''

    type_badge = ''
    if f.pentest_type:
        type_badge = f'<span style="background:{LIGHT};color:{GREEN};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">{_esc(TYPE_DISPLAY.get(f.pentest_type, f.pentest_type))}</span>'

    return f'''<div class="finding-card" id="finding-{f.id}">
  <div class="finding-header" style="background:{sev_bg}">
    <div class="finding-code">{_esc(code)} &nbsp;·&nbsp; Finding #{num}</div>
    <h3>{_esc(f.title)}</h3>
    <div class="finding-meta">
      <span class="sev-badge sev-badge-{f.severity}">{f.severity.capitalize()}</span>
      {status_badge}
      {type_badge}
    </div>
  </div>
  <div class="finding-body">
    {f'<div class="finding-field"><div class="finding-field-label">Affected Asset / Target</div><div class="affected-asset">{_nl2br(f.affected_asset)}</div></div>' if f.affected_asset else ''}
    {risk_info}
    {field('Description', None, False) if False else
     f'<div class="finding-field"><div class="finding-field-label">Description</div><div class="finding-field-value rich-content">{_html_to_rich(f.description) or _nl2br(_html_to_plain(f.description))}</div></div>' if f.description else ''}
    {f'<div class="finding-field"><div class="finding-field-label">Technical Details</div><div class="finding-field-value rich-content">{_html_to_rich(f.details) or _nl2br(_html_to_plain(f.details))}</div></div>' if f.details else ''}
    {f'<div class="finding-field"><div class="finding-field-label">Impact</div><div class="finding-field-value rich-content">{_html_to_rich(f.impact) or _nl2br(_html_to_plain(f.impact))}</div></div>' if f.impact else ''}
    {f'<div class="finding-field"><div class="finding-field-label">Likelihood</div><div class="finding-field-value rich-content">{_html_to_rich(f.likelihood) or _nl2br(_html_to_plain(f.likelihood))}</div></div>' if f.likelihood else ''}
    {f'<div class="finding-field"><div class="finding-field-label">Recommendations</div><div class="finding-field-value rich-content">{_html_to_rich(f.recommendations) or _nl2br(_html_to_plain(f.recommendations))}</div></div>' if f.recommendations else ''}
    {f'<div class="finding-field"><div class="finding-field-label">Supporting Evidence</div><div class="finding-field-value rich-content">{_html_to_rich(f.supporting_evidence) or _nl2br(_html_to_plain(f.supporting_evidence))}</div></div>' if f.supporting_evidence else ''}
    {cvss_block}
    {refs_html}
  </div>
</div>'''


def _detailed_findings(findings, codes):
    sorted_findings = sorted(
        findings,
        key=lambda f: (-{'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'INFORMATIONAL': 0}.get(f.severity, 0), f.title)
    )
    cards = ''.join(_finding_card(f, codes.get(f.id, '—'), i + 1) for i, f in enumerate(sorted_findings))
    return f'''<h2 class="section">8. Detailed Findings</h2>
<p class="section-intro">The following section details each finding identified during the assessment,
presented in order of severity. Each finding includes technical details, business impact,
and remediation recommendations.</p>
{cards}'''


def _remediation_tracker(findings, codes):
    sorted_findings = sorted(
        findings,
        key=lambda f: (-{'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'INFORMATIONAL': 0}.get(f.severity, 0), f.title)
    )
    rows = ''
    for f in sorted_findings:
        code  = codes.get(f.id, '—')
        rem   = f.status == 'REMEDIATED'
        date_ = _fmt(f.remediated_at, '%d/%m/%Y') if rem else '—'
        rows += f'''<tr>
  <td style="font-weight:700;color:{GREEN}">{_esc(code)}</td>
  <td>{_esc(f.title)}</td>
  <td><span class="sev-badge sev-badge-{f.severity}">{f.severity.capitalize()}</span></td>
  <td class="{'remediated-yes' if rem else 'remediated-no'}">{'Yes ✓' if rem else 'No'}</td>
  <td>{_esc(date_)}</td>
  <td>{_esc(STATUS_DISPLAY.get(f.status, f.status))}</td>
</tr>'''

    total  = len(findings)
    remmed = sum(1 for f in findings if f.status == 'REMEDIATED')
    pct    = round(remmed / total * 100) if total else 0

    return f'''<h2 class="section">9. Remediation Tracker</h2>
<div style="display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap">
  <div class="metric-card" style="background:{LIGHT};border-color:{GREEN}33;min-width:100px">
    <div class="val" style="color:{GREEN}">{total}</div><div class="lbl">Total</div>
  </div>
  <div class="metric-card" style="background:#edfdf3;border-color:#27ae6033;min-width:100px">
    <div class="val" style="color:#27ae60">{remmed}</div><div class="lbl">Remediated</div>
  </div>
  <div class="metric-card" style="background:#fdf0ef;border-color:#c0392b33;min-width:100px">
    <div class="val" style="color:#c0392b">{total - remmed}</div><div class="lbl">Outstanding</div>
  </div>
  <div class="metric-card" style="background:{LIGHT};border-color:{GREEN}33;min-width:100px">
    <div class="val" style="color:{GREEN}">{pct}%</div><div class="lbl">Remediation Rate</div>
  </div>
</div>
<table>
  <thead><tr><th>Code</th><th>Finding</th><th>Severity</th><th>Remediated</th><th>Date</th><th>Status</th></tr></thead>
  <tbody>{rows}</tbody>
</table>'''


def _attack_chain_section(attack_chain_entries, codes, section_num):
    if not attack_chain_entries:
        return ''

    # Group by phase
    phases = {}
    for entry in attack_chain_entries:
        phases.setdefault(entry.phase, []).append(entry)

    PHASE_ORDER = [
        'RECONNAISSANCE', 'INITIAL_ACCESS', 'EXECUTION', 'PERSISTENCE',
        'PRIVILEGE_ESCALATION', 'DEFENSE_EVASION', 'CREDENTIAL_ACCESS',
        'LATERAL_MOVEMENT', 'COLLECTION', 'EXFILTRATION', 'IMPACT',
    ]
    PHASE_DISPLAY = {
        'RECONNAISSANCE': 'Reconnaissance', 'INITIAL_ACCESS': 'Initial Access',
        'EXECUTION': 'Execution', 'PERSISTENCE': 'Persistence',
        'PRIVILEGE_ESCALATION': 'Privilege Escalation', 'DEFENSE_EVASION': 'Defense Evasion',
        'CREDENTIAL_ACCESS': 'Credential Access', 'LATERAL_MOVEMENT': 'Lateral Movement',
        'COLLECTION': 'Collection', 'EXFILTRATION': 'Exfiltration', 'IMPACT': 'Impact',
    }

    groups = ''
    for phase in PHASE_ORDER:
        entries = phases.get(phase, [])
        if not entries:
            continue
        items = ''
        for e in sorted(entries, key=lambda x: x.position):
            sev = e.finding.severity
            items += f'''<div class="phase-finding">
  <span class="pf-sev" style="background:{SEV_COLORS.get(sev, '#666')}"></span>
  {_esc(codes.get(e.finding_id, ''))} — {_esc(e.finding.title[:60])}
  {f'<div style="font-size:11px;color:#777;margin-top:2px;padding-left:14px">{_esc(e.notes)}</div>' if e.notes else ''}
</div>'''
        groups += f'''<div class="phase-group">
  <div class="phase-title">{_esc(PHASE_DISPLAY.get(phase, phase))}</div>
  {items}
</div>'''

    return f'''<h2 class="section">{section_num}. Attack Chain (MITRE ATT&CK)</h2>
<p class="section-intro">The attack chain illustrates the sequence of techniques used during the assessment,
mapped to the MITRE ATT&CK framework.</p>
<div class="attack-chain">{groups}</div>'''


def _conclusion_section(report, section_num):
    content = _html_to_rich(report.conclusion) if report.conclusion else \
              '<p>Based on the findings identified during this engagement, the organisation should prioritise remediation of all Critical and High severity vulnerabilities immediately. A re-test is recommended upon completion of remediation activities.</p>'
    client_notes = ''
    if report.client_notes:
        client_notes = f'''<div class="info-panel" style="border-left:4px solid {GOLD};background:{LIGHT_GOLD}">
  <h4>Client Notes</h4>
  <div class="rich-content">{_html_to_rich(report.client_notes)}</div>
</div>'''

    return f'''<h2 class="section">{section_num}. Conclusion</h2>
<div class="rich-content">{content}</div>
{client_notes}'''


# ── Public entry point ────────────────────────────────────────────────────────

def generate_pentest_html_report(report, findings_qs, attack_chain_entries=None):
    """
    Generate a full standalone HTML pentest report.

    Args:
        report: Report model instance
        findings_qs: QuerySet or list of Finding instances for the engagement
        attack_chain_entries: QuerySet or list of AttackChainEntry instances (optional)

    Returns:
        str: Complete standalone HTML document
    """
    findings = list(findings_qs)
    engagement = report.engagement
    org = getattr(engagement, 'organization', None)

    codes = _build_finding_codes(findings)
    has_ac = bool(attack_chain_entries)
    ac_entries = list(attack_chain_entries) if attack_chain_entries else []

    # Section numbering
    ac_num      = 10 if has_ac else None
    concl_num   = 11 if has_ac else 10

    body = (
        _cover(report, engagement, org) +
        _toc(findings, has_ac) +
        _doc_control(report, engagement) +
        _executive_summary(report, findings, codes) +
        _engagement_details(engagement, org) +
        _scope_section(engagement) +
        _finding_summary(findings, codes) +
        _key_findings_section(findings, codes) +
        _methodology_section(report) +
        _detailed_findings(findings, codes) +
        _remediation_tracker(findings, codes) +
        (_attack_chain_section(ac_entries, codes, ac_num) if has_ac else '') +
        _conclusion_section(report, concl_num)
    )

    return _shell(report.title, body)

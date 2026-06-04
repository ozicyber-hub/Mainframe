"""
AI-assisted finding enhancement endpoint.
Supports Ollama (local/free) and Google Gemini (free tier) as providers.
"""
import json
import requests
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

# System persona used for all prompts
SYSTEM_PROMPT = (
    "You are an expert penetration tester writing a professional security assessment report. "
    "Your writing is precise, technically accurate, and follows industry standards (OWASP, NIST, PTES). "
    "You write for a mixed audience — technical teams and business executives. "
    "Be direct and concise. Do not add disclaimers or meta-commentary about your response. "
    "Do not include section headings or labels. Output only the content itself."
)

# Per-field instructions
FIELD_PROMPTS = {
    'description': (
        "Rewrite or significantly improve the following as a polished executive summary of this security finding. "
        "It should clearly state what the vulnerability is, where it exists, and why it matters — "
        "in 2-4 sentences suitable for a non-technical reader."
    ),
    'details': (
        "Rewrite or significantly improve the following as the technical details section of a pentest finding. "
        "Explain precisely how the vulnerability was discovered, the attack mechanism, and the technical root cause. "
        "Be specific and include relevant technical depth. Use plain paragraphs — not bullet points."
    ),
    'impact': (
        "Rewrite or significantly improve the following as the impact section of a pentest finding. "
        "Clearly describe the business and technical consequences if this vulnerability is exploited. "
        "Cover confidentiality, integrity, and availability implications where relevant. "
        "Be specific about the real-world risk to the organisation."
    ),
    'likelihood': (
        "Rewrite or significantly improve the following as the likelihood section of a pentest finding. "
        "Explain the probability of exploitation — consider attacker skill required, exposure, "
        "available tooling, and whether exploitation has been observed in the wild. "
        "Be evidence-based and specific."
    ),
    'recommendations': (
        "Rewrite or significantly improve the following as the recommendations section of a pentest finding. "
        "Provide clear, actionable, prioritised remediation steps. "
        "Start with the most impactful mitigations. Include both short-term workarounds and long-term fixes where appropriate. "
        "Use numbered steps."
    ),
    'supporting_evidence': (
        "Rewrite or significantly improve the following as the supporting evidence section of a pentest finding. "
        "Organise and clarify the evidence. Reference specific observations, outputs, or indicators "
        "that confirm the vulnerability exists and is exploitable."
    ),
}


def build_prompt(field, content, context):
    field_instruction = FIELD_PROMPTS.get(field, "Improve the following text to be more professional and clear.")
    ctx_parts = []
    if context.get('title'):
        ctx_parts.append(f"Finding title: {context['title']}")
    if context.get('severity'):
        ctx_parts.append(f"Severity: {context['severity']}")
    if context.get('pentest_type'):
        ctx_parts.append(f"Pentest type: {context['pentest_type'].replace('_', ' ').title()}")
    context_block = "\n".join(ctx_parts)

    prompt = f"{field_instruction}\n\n"
    if context_block:
        prompt += f"Context:\n{context_block}\n\n"
    prompt += f"Current content:\n{content or '(empty — write a strong placeholder based on the context)'}"
    return prompt


def call_ollama(prompt):
    url = f"{settings.OLLAMA_URL}/api/generate"
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": f"{SYSTEM_PROMPT}\n\n{prompt}",
        "stream": False,
        "options": {"temperature": 0.4, "num_predict": 1500},
    }
    resp = requests.post(url, json=payload, timeout=300)
    resp.raise_for_status()
    return resp.json().get("response", "").strip()


def call_gemini(prompt):
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": f"{SYSTEM_PROMPT}\n\n{prompt}"}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 600},
    }
    resp = requests.post(url, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_enhance(request):
    field   = request.data.get('field', '')
    content = request.data.get('content', '')
    context = request.data.get('context', {})

    if field not in FIELD_PROMPTS:
        return Response(
            {'error': f"Unknown field '{field}'. Valid: {', '.join(FIELD_PROMPTS.keys())}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    prompt = build_prompt(field, content, context)
    provider = getattr(settings, 'AI_PROVIDER', 'ollama')

    try:
        if provider == 'gemini':
            enhanced = call_gemini(prompt)
        else:
            enhanced = call_ollama(prompt)
    except requests.exceptions.ConnectionError:
        return Response(
            {'error': 'AI service unavailable. If using Ollama, ensure the container is running and the model is pulled.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except requests.exceptions.Timeout:
        return Response(
            {'error': 'AI request timed out. The model may still be loading — try again in a moment.'},
            status=status.HTTP_504_GATEWAY_TIMEOUT,
        )
    except Exception as e:
        return Response(
            {'error': f'AI enhancement failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Wrap plain text paragraphs in <p> tags for Quill
    paragraphs = [p.strip() for p in enhanced.split('\n\n') if p.strip()]
    html_lines = []
    for para in paragraphs:
        # Detect numbered list items (1. 2. etc)
        lines = para.split('\n')
        if len(lines) > 1 and all(l.strip() and (l.strip()[0].isdigit() or l.strip().startswith('-')) for l in lines if l.strip()):
            for line in lines:
                line = line.strip().lstrip('0123456789.-) ').strip()
                if line:
                    html_lines.append(f'<li>{line}</li>')
        else:
            cleaned = para.replace('\n', ' ')
            html_lines.append(f'<p>{cleaned}</p>')

    html = '\n'.join(html_lines)

    return Response({'enhanced': html, 'enhanced_plain': enhanced, 'provider': provider})

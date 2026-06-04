"""
Seeds global finding templates into the repository.
Safe to re-run — uses update_or_create keyed on title + category.

Run with:
    python manage.py seed_repository
"""
from django.core.management.base import BaseCommand
from repository.models import FindingTemplate, RepositoryFolder


FOLDERS = {
    'Web Application':          {'color': '#2980b9', 'description': 'Web application security findings'},
    'Active Directory':         {'color': '#8e44ad', 'description': 'Active Directory and Windows domain attack findings'},
    'Network':                  {'color': '#16a085', 'description': 'Network infrastructure findings'},
    'Cloud':                    {'color': '#e67e22', 'description': 'Cloud infrastructure findings'},
    'API Security':             {'color': '#27ae60', 'description': 'API security findings'},
    'Cryptography & Secrets':   {'color': '#c0392b', 'description': 'Cryptographic weaknesses and secrets management findings'},
    'Authentication & Session': {'color': '#d35400', 'description': 'Authentication and session management findings'},
    'Misconfiguration':         {'color': '#7f8c8d', 'description': 'Security misconfigurations and hardening findings'},
}

# Maps (title, category) → folder name
FINDING_FOLDER_MAP = {
    # Web Application
    ('SQL Injection', 'INPUT'):                                         'Web Application',
    ('Reflected Cross-Site Scripting (XSS)', 'INPUT'):                  'Web Application',
    ('Stored Cross-Site Scripting (XSS)', 'INPUT'):                     'Web Application',
    ('XML External Entity (XXE) Injection', 'INPUT'):                   'Web Application',
    ('OS Command Injection', 'INPUT'):                                  'Web Application',
    ('Path Traversal / Local File Inclusion', 'ACCESS'):                'Web Application',
    ('Insecure Direct Object Reference (IDOR)', 'ACCESS'):              'Web Application',
    ('Privilege Escalation — Vertical', 'ACCESS'):                 'Web Application',
    ('Sensitive Data Exposure — PII in API Response', 'ACCESS'):   'Web Application',
    ('Cross-Site Request Forgery (CSRF)', 'SESSION'):                   'Web Application',
    ('Insecure Cookie Attributes', 'SESSION'):                          'Web Application',
    ('Session Not Invalidated on Logout', 'SESSION'):                   'Web Application',
    ('Server-Side Request Forgery (SSRF)', 'WEB'):                      'Web Application',
    ('Insecure File Upload', 'WEB'):                                    'Web Application',
    ('Open Redirect', 'WEB'):                                           'Web Application',
    ('Clickjacking', 'WEB'):                                            'Web Application',
    ('Business Logic Flaw', 'WEB'):                                     'Web Application',
    ('Missing Security Headers', 'CONFIG'):                             'Web Application',
    ('Directory Listing Enabled', 'CONFIG'):                            'Web Application',
    ('Verbose Error Messages', 'CONFIG'):                               'Web Application',
    ('Debug Mode Enabled in Production', 'CONFIG'):                     'Web Application',
    ('Software Version Disclosure', 'CONFIG'):                          'Web Application',
    ('Subdomain Takeover', 'CONFIG'):                                   'Web Application',
    # Active Directory
    ('SMB Signing Not Required', 'NETWORK'):                            'Active Directory',
    ('LLMNR / NBT-NS Poisoning', 'NETWORK'):                            'Active Directory',
    ('Kerberoasting', 'NETWORK'):                                       'Active Directory',
    ('AS-REP Roasting', 'NETWORK'):                                     'Active Directory',
    ('Pass-the-Hash', 'NETWORK'):                                       'Active Directory',
    # Network
    ('Unencrypted Network Protocols in Use', 'NETWORK'):                'Network',
    ('Default SNMP Community Strings', 'NETWORK'):                      'Network',
    # Cloud
    ('Publicly Accessible Cloud Storage Bucket', 'CLOUD'):              'Cloud',
    ('Overly Permissive IAM Policies', 'CLOUD'):                        'Cloud',
    ('Cloud Instance Metadata Service Accessible via SSRF', 'CLOUD'):   'Cloud',
    # API Security
    ('Lack of API Rate Limiting', 'API'):                               'API Security',
    ('Mass Assignment Vulnerability', 'API'):                           'API Security',
    ('API Key Exposed in Client-Side Code', 'API'):                     'API Security',
    ('Broken Object Level Authorisation (BOLA) — API', 'API'):     'API Security',
    # Cryptography & Secrets
    ('Sensitive Data Stored with Weak Hashing Algorithm', 'ENCRYPTION'): 'Cryptography & Secrets',
    ('Hardcoded Credentials in Source Code', 'ENCRYPTION'):             'Cryptography & Secrets',
    ('SSL/TLS Weak Cipher Suites Supported', 'ENCRYPTION'):             'Cryptography & Secrets',
    ('SSL/TLS Certificate Issues', 'ENCRYPTION'):                       'Cryptography & Secrets',
    ('Unencrypted Sensitive Data in Transit (HTTP)', 'ENCRYPTION'):     'Cryptography & Secrets',
    # Authentication & Session
    ('Weak Password Policy', 'AUTH'):                                   'Authentication & Session',
    ('Multi-Factor Authentication Not Enforced', 'AUTH'):               'Authentication & Session',
    ('Default Credentials', 'AUTH'):                                    'Authentication & Session',
    ('Account Lockout Not Implemented', 'AUTH'):                        'Authentication & Session',
    ('Username Enumeration', 'AUTH'):                                   'Authentication & Session',
    ('JWT Algorithm Confusion / None Algorithm', 'AUTH'):               'Authentication & Session',
    # Misconfiguration
    ('Missing Patch Management — Critical Vulnerabilities', 'CONFIG'): 'Misconfiguration',
    ('Inadequate Logging and Monitoring', 'LOGGING'):                   'Misconfiguration',
}


FINDINGS = [
    # ── WEB APPLICATION ───────────────────────────────────────────────────────
    {
        'title': 'SQL Injection',
        'category': 'INPUT',
        'default_severity': 'CRITICAL',
        'cwe_id': 'CWE-89',
        'tags': ['sql', 'injection', 'database', 'owasp-a03'],
        'description': (
            'SQL Injection (SQLi) was identified in the application. An attacker can manipulate '
            'SQL queries by injecting malicious input into user-controlled parameters, allowing '
            'them to read, modify, or delete database content, bypass authentication, or in some '
            'configurations execute operating system commands.'
        ),
        'details': (
            'The application constructs SQL queries using unsanitised user input. When specially '
            'crafted payloads are submitted, the database query logic is altered. This was '
            'confirmed by injecting a single quote character which produced a database error, '
            'and subsequently using UNION-based or Boolean-based techniques to extract data.\n\n'
            'Affected parameter(s): [PARAMETER]\n'
            'Affected endpoint(s): [ENDPOINT]'
        ),
        'impact': (
            'Successful exploitation allows an attacker to read sensitive data from the database '
            '(credentials, PII, financial records), modify or delete data, potentially escalate '
            'to remote code execution via features such as xp_cmdshell or INTO OUTFILE, and '
            'bypass authentication controls entirely.'
        ),
        'likelihood': (
            'High. The vulnerability is in a publicly accessible parameter with no WAF or input '
            'validation in place. Automated tools can discover and exploit SQL injection rapidly.'
        ),
        'recommendations': (
            '1. Use parameterised queries (prepared statements) for all database interactions.\n'
            '2. Apply an allowlist-based input validation approach.\n'
            '3. Apply the principle of least privilege to database accounts.\n'
            '4. Implement a Web Application Firewall (WAF) as a defence-in-depth measure.\n'
            '5. Suppress verbose database error messages in production.'
        ),
        'references': 'https://owasp.org/www-community/attacks/SQL_Injection\nhttps://cwe.mitre.org/data/definitions/89.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'C', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    {
        'title': 'Reflected Cross-Site Scripting (XSS)',
        'category': 'INPUT',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-79',
        'tags': ['xss', 'cross-site-scripting', 'reflected', 'owasp-a03'],
        'description': (
            'Reflected Cross-Site Scripting (XSS) was identified. User-supplied input is '
            'returned in the HTTP response without adequate encoding, allowing an attacker to '
            'inject and execute arbitrary JavaScript in a victim\'s browser.'
        ),
        'details': (
            'The application reflects user-controlled input directly into the HTML response '
            'without output encoding. By crafting a malicious URL containing a script payload '
            'and enticing a victim to visit it, an attacker can execute JavaScript in the '
            'context of the vulnerable origin.\n\n'
            'Affected parameter(s): [PARAMETER]\n'
            'Affected endpoint(s): [ENDPOINT]\n'
            'Proof of Concept: [PAYLOAD]'
        ),
        'impact': (
            'An attacker can steal session cookies, redirect users to phishing pages, capture '
            'keystrokes, modify page content, or perform actions on behalf of the victim within '
            'the application.'
        ),
        'likelihood': (
            'Medium. Exploitation requires tricking a victim into clicking a crafted link, '
            'however this is commonly achieved via phishing or forum posts.'
        ),
        'recommendations': (
            '1. Encode all user-supplied data before rendering it in HTML (HTML entity encoding).\n'
            '2. Implement a strict Content Security Policy (CSP) header.\n'
            '3. Use modern templating frameworks that auto-escape output.\n'
            '4. Set the HttpOnly flag on session cookies to reduce impact.\n'
            '5. Validate and sanitise input on the server side.'
        ),
        'references': 'https://owasp.org/www-community/attacks/xss/\nhttps://cwe.mitre.org/data/definitions/79.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'R', 's': 'C', 'c': 'H', 'i': 'L', 'a': 'N',
    },
    {
        'title': 'Stored Cross-Site Scripting (XSS)',
        'category': 'INPUT',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-79',
        'tags': ['xss', 'cross-site-scripting', 'stored', 'persistent', 'owasp-a03'],
        'description': (
            'Stored (Persistent) Cross-Site Scripting (XSS) was identified. Malicious script '
            'content submitted by an attacker is stored in the application\'s database and '
            'subsequently rendered in other users\' browsers without adequate sanitisation.'
        ),
        'details': (
            'The application stores user-supplied content and renders it to other users without '
            'output encoding. An attacker can submit a malicious payload that is persistently '
            'stored and executed whenever any user views the affected page.\n\n'
            'Affected input field(s): [FIELD]\n'
            'Affected view endpoint(s): [ENDPOINT]\n'
            'Proof of Concept: [PAYLOAD]'
        ),
        'impact': (
            'Unlike reflected XSS, stored XSS does not require tricking a victim into clicking '
            'a link. Every user who visits the affected page will execute the attacker\'s script. '
            'This allows mass session hijacking, credential harvesting, and persistent backdoors.'
        ),
        'likelihood': (
            'High. No user interaction beyond normal application usage is required for exploitation.'
        ),
        'recommendations': (
            '1. Apply context-aware output encoding for all stored data rendered in HTML.\n'
            '2. Sanitise rich-text input using a well-maintained allowlist library (e.g. DOMPurify).\n'
            '3. Implement a strict Content Security Policy (CSP).\n'
            '4. Set the HttpOnly flag on session cookies.\n'
            '5. Consider a server-side HTML sanitisation library for stored content.'
        ),
        'references': 'https://owasp.org/www-community/attacks/xss/\nhttps://cwe.mitre.org/data/definitions/79.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:L/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'L', 'ui': 'N', 's': 'C', 'c': 'H', 'i': 'L', 'a': 'N',
    },
    {
        'title': 'Cross-Site Request Forgery (CSRF)',
        'category': 'SESSION',
        'default_severity': 'MEDIUM',
        'cwe_id': 'CWE-352',
        'tags': ['csrf', 'session', 'owasp-a01'],
        'description': (
            'Cross-Site Request Forgery (CSRF) was identified. The application does not '
            'implement adequate CSRF protections, allowing an attacker to trick an authenticated '
            'user into performing unintended state-changing actions.'
        ),
        'details': (
            'State-changing requests do not include a CSRF token or the application fails to '
            'validate the token on the server side. An attacker hosting a malicious webpage can '
            'craft a request that, when visited by an authenticated user, is automatically '
            'submitted to the vulnerable application.\n\n'
            'Affected endpoint(s): [ENDPOINT]\n'
            'HTTP Method: [METHOD]'
        ),
        'impact': (
            'An attacker can perform actions on behalf of an authenticated user including '
            'changing account settings, transferring funds, modifying data, or any other '
            'privileged action available to the victim.'
        ),
        'likelihood': (
            'Medium. Exploitation requires the victim to be authenticated and visit an '
            'attacker-controlled page while logged in.'
        ),
        'recommendations': (
            '1. Implement synchronised CSRF tokens for all state-changing requests.\n'
            '2. Use the SameSite=Strict or SameSite=Lax cookie attribute.\n'
            '3. Verify the Origin and Referer headers on the server side.\n'
            '4. Require re-authentication for sensitive operations.'
        ),
        'references': 'https://owasp.org/www-community/attacks/csrf\nhttps://cwe.mitre.org/data/definitions/352.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:H/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'R', 's': 'U', 'c': 'N', 'i': 'H', 'a': 'N',
    },
    {
        'title': 'Server-Side Request Forgery (SSRF)',
        'category': 'WEB',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-918',
        'tags': ['ssrf', 'server-side', 'owasp-a10'],
        'description': (
            'Server-Side Request Forgery (SSRF) was identified. The application fetches a '
            'remote resource based on a user-supplied URL without adequate validation, allowing '
            'an attacker to coerce the server into making requests to internal or unintended '
            'external resources.'
        ),
        'details': (
            'The application accepts a user-controlled URL and performs server-side HTTP requests '
            'to that URL. By providing an internal network address or cloud metadata endpoint, '
            'an attacker can enumerate internal services, access cloud instance metadata, or '
            'pivot into internal networks.\n\n'
            'Affected parameter(s): [PARAMETER]\n'
            'Affected endpoint(s): [ENDPOINT]'
        ),
        'impact': (
            'An attacker may read sensitive internal service responses, access cloud provider '
            'metadata (e.g. AWS IMDSv1 credentials), scan internal network ports, bypass '
            'firewall controls, or in severe cases achieve remote code execution on internal hosts.'
        ),
        'likelihood': (
            'Medium to High depending on internal network exposure and cloud metadata availability.'
        ),
        'recommendations': (
            '1. Validate and sanitise all user-supplied URLs against an allowlist of permitted hosts.\n'
            '2. Block requests to private IP ranges (RFC 1918), loopback, and metadata endpoints.\n'
            '3. Disable unnecessary URL scheme handlers (file://, gopher://, dict://).\n'
            '4. Enforce IMDSv2 on all AWS instances.\n'
            '5. Segment internal services from the application tier with a firewall.'
        ),
        'references': 'https://owasp.org/www-community/attacks/Server_Side_Request_Forgery\nhttps://cwe.mitre.org/data/definitions/918.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:L/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'C', 'c': 'H', 'i': 'L', 'a': 'N',
    },
    {
        'title': 'XML External Entity (XXE) Injection',
        'category': 'INPUT',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-611',
        'tags': ['xxe', 'xml', 'injection', 'owasp-a05'],
        'description': (
            'XML External Entity (XXE) injection was identified. The application processes '
            'XML input with external entity resolution enabled, allowing an attacker to '
            'read arbitrary files, perform SSRF, or cause a Denial of Service.'
        ),
        'details': (
            'The XML parser is configured to process external entity declarations in user-supplied '
            'XML. By including a DOCTYPE with a malicious SYSTEM entity, an attacker can instruct '
            'the server to read local files or make outbound requests.\n\n'
            'Affected endpoint(s): [ENDPOINT]\n'
            'Proof of Concept payload included in evidence.'
        ),
        'impact': (
            'Attackers can read arbitrary files from the server filesystem (e.g. /etc/passwd, '
            'application configuration files with credentials), perform SSRF, or cause a '
            'Denial of Service via recursive entity expansion (Billion Laughs attack).'
        ),
        'likelihood': (
            'Medium. Exploitation requires the ability to submit XML input to the application.'
        ),
        'recommendations': (
            '1. Disable external entity processing and DTD processing in the XML parser.\n'
            '2. Use a less complex data format such as JSON where possible.\n'
            '3. Validate, filter, and sanitise all XML input.\n'
            '4. Update XML parsing libraries to current versions.\n'
            '5. Implement SAST tooling to detect unsafe parser configurations.'
        ),
        'references': 'https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing\nhttps://cwe.mitre.org/data/definitions/611.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:L',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'L', 'a': 'L',
    },
    {
        'title': 'OS Command Injection',
        'category': 'INPUT',
        'default_severity': 'CRITICAL',
        'cwe_id': 'CWE-78',
        'tags': ['command-injection', 'rce', 'os', 'owasp-a03'],
        'description': (
            'OS Command Injection was identified. The application constructs operating system '
            'commands using user-supplied input without adequate sanitisation, allowing an '
            'attacker to execute arbitrary commands on the underlying server.'
        ),
        'details': (
            'User-controlled input is passed directly to a system shell command without '
            'sanitisation. By injecting shell metacharacters (e.g. ;, &&, |, `), an attacker '
            'can append arbitrary commands that are executed with the privileges of the '
            'application process.\n\n'
            'Affected parameter(s): [PARAMETER]\n'
            'Affected endpoint(s): [ENDPOINT]'
        ),
        'impact': (
            'Complete compromise of the hosting server. An attacker can execute arbitrary '
            'commands, read/write/delete files, exfiltrate data, install backdoors, pivot to '
            'internal network hosts, and establish persistent access.'
        ),
        'likelihood': (
            'High if the application is exposed to the internet. The vulnerability requires '
            'no authentication in the identified configuration.'
        ),
        'recommendations': (
            '1. Avoid invoking OS commands from application code wherever possible.\n'
            '2. Use language-native libraries instead of shell command wrappers.\n'
            '3. If OS commands are necessary, use parameterised APIs (e.g. execve with args array).\n'
            '4. Apply strict input validation using an allowlist approach.\n'
            '5. Run application processes with minimal OS privileges.'
        ),
        'references': 'https://owasp.org/www-community/attacks/Command_Injection\nhttps://cwe.mitre.org/data/definitions/78.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'C', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    {
        'title': 'Path Traversal / Local File Inclusion',
        'category': 'ACCESS',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-22',
        'tags': ['path-traversal', 'lfi', 'directory-traversal', 'owasp-a01'],
        'description': (
            'Path Traversal (Local File Inclusion) was identified. The application uses '
            'user-supplied input to construct file paths without adequate validation, allowing '
            'an attacker to read arbitrary files outside the intended directory.'
        ),
        'details': (
            'A user-controlled parameter is used to reference files on the server. By including '
            '../ sequences in the input, an attacker can traverse the directory structure and '
            'read sensitive files such as configuration files, credentials, or system files.\n\n'
            'Affected parameter(s): [PARAMETER]\n'
            'Affected endpoint(s): [ENDPOINT]'
        ),
        'impact': (
            'An attacker can read application source code, configuration files containing '
            'database credentials and API keys, system files (e.g. /etc/passwd, /etc/shadow), '
            'and private keys. In certain configurations this may lead to remote code execution.'
        ),
        'likelihood': (
            'High. The affected parameter is accessible without authentication and directory '
            'traversal sequences are not filtered.'
        ),
        'recommendations': (
            '1. Validate file paths against a strict allowlist of permitted filenames or directories.\n'
            '2. Resolve the canonical path and verify it begins with the expected base directory.\n'
            '3. Avoid using user input to construct file system paths entirely where possible.\n'
            '4. Run the application with the minimum required file system permissions.\n'
            '5. Chroot the application process where feasible.'
        ),
        'references': 'https://owasp.org/www-community/attacks/Path_Traversal\nhttps://cwe.mitre.org/data/definitions/22.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'N', 'a': 'N',
    },
    {
        'title': 'Insecure Direct Object Reference (IDOR)',
        'category': 'ACCESS',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-639',
        'tags': ['idor', 'access-control', 'authorisation', 'owasp-a01'],
        'description': (
            'Insecure Direct Object Reference (IDOR) was identified. The application exposes '
            'direct references to internal objects (e.g. database record IDs) without verifying '
            'the requesting user is authorised to access the referenced resource.'
        ),
        'details': (
            'By modifying an object identifier in a request (e.g. user_id, order_id), an '
            'attacker can access or modify resources belonging to other users. The server does '
            'not validate that the authenticated user owns the requested resource.\n\n'
            'Affected parameter(s): [PARAMETER]\n'
            'Affected endpoint(s): [ENDPOINT]'
        ),
        'impact': (
            'An attacker can view, modify, or delete data belonging to any other user in the '
            'system. Depending on the exposed objects, this may include personal information, '
            'financial records, private communications, or administrative functions.'
        ),
        'likelihood': (
            'High. The identifiers are sequential/guessable integers and the application '
            'performs no authorisation checks on the requested object.'
        ),
        'recommendations': (
            '1. Implement server-side authorisation checks for every access to an object, '
            'verifying the requesting user owns or is permitted to access it.\n'
            '2. Replace sequential integer IDs with non-guessable identifiers (UUIDs).\n'
            '3. Implement a centralised authorisation layer to enforce access control consistently.\n'
            '4. Log and alert on repeated access to unauthorised resources.'
        ),
        'references': 'https://owasp.org/www-community/attacks/Insecure_Direct_Object_Reference\nhttps://cwe.mitre.org/data/definitions/639.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'L', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'N',
    },
    {
        'title': 'Insecure File Upload',
        'category': 'WEB',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-434',
        'tags': ['file-upload', 'webshell', 'rce', 'owasp-a04'],
        'description': (
            'The application allows upload of dangerous file types without adequate '
            'validation. An attacker may upload server-executable files (e.g. web shells) '
            'and achieve remote code execution on the server.'
        ),
        'details': (
            'The file upload functionality does not enforce adequate restrictions on the '
            'type, extension, or content of uploaded files. Uploaded files are stored in '
            'a web-accessible location and can be directly executed by the web server.\n\n'
            'Affected endpoint(s): [ENDPOINT]\n'
            'File types accepted: [TYPES]'
        ),
        'impact': (
            'An attacker can upload a web shell and gain remote code execution on the server '
            'with the privileges of the web server process, leading to full server compromise, '
            'data exfiltration, and lateral movement.'
        ),
        'likelihood': (
            'High if the upload endpoint is accessible without authentication or with low-privilege '
            'accounts. Exploitation is straightforward with readily available web shells.'
        ),
        'recommendations': (
            '1. Validate file type using content inspection (magic bytes), not just file extension or MIME type.\n'
            '2. Restrict allowed file extensions to a strict allowlist.\n'
            '3. Store uploaded files outside the web root and serve them through application logic.\n'
            '4. Rename uploaded files server-side to prevent direct execution.\n'
            '5. Scan uploaded files with antivirus/antimalware on the server side.\n'
            '6. Disable script execution in the upload directory via server configuration.'
        ),
        'references': 'https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload\nhttps://cwe.mitre.org/data/definitions/434.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H',
        'av': 'N', 'ac': 'L', 'pr': 'L', 'ui': 'N', 's': 'C', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    {
        'title': 'Open Redirect',
        'category': 'WEB',
        'default_severity': 'LOW',
        'cwe_id': 'CWE-601',
        'tags': ['open-redirect', 'phishing', 'owasp-a01'],
        'description': (
            'An open redirect vulnerability was identified. The application accepts a '
            'user-supplied URL as a redirect target without validating it belongs to a '
            'trusted domain, enabling phishing and token theft attacks.'
        ),
        'details': (
            'The application uses a user-controlled parameter to redirect the browser after '
            'an action (e.g. login). By supplying an external URL, an attacker can redirect '
            'users to an attacker-controlled site.\n\n'
            'Affected parameter(s): [PARAMETER]\n'
            'Affected endpoint(s): [ENDPOINT]'
        ),
        'impact': (
            'An attacker can craft a legitimate-looking URL on the trusted domain that redirects '
            'victims to a phishing site. This is particularly dangerous when combined with '
            'OAuth flows where access tokens may be leaked in the redirect URL.'
        ),
        'likelihood': (
            'Medium. Exploitation requires social engineering to distribute the crafted link.'
        ),
        'recommendations': (
            '1. Avoid accepting redirect URLs from user input.\n'
            '2. If redirect URLs are required, validate them against a strict allowlist of permitted URLs or domains.\n'
            '3. Use indirect references (e.g. numeric codes mapped to URLs server-side) instead of raw URLs.\n'
            '4. Display an interstitial warning page when redirecting to external sites.'
        ),
        'references': 'https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html\nhttps://cwe.mitre.org/data/definitions/601.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'R', 's': 'U', 'c': 'L', 'i': 'L', 'a': 'N',
    },
    {
        'title': 'Clickjacking',
        'category': 'WEB',
        'default_severity': 'LOW',
        'cwe_id': 'CWE-1021',
        'tags': ['clickjacking', 'ui-redress', 'headers'],
        'description': (
            'The application does not implement frame-busting controls, leaving it vulnerable '
            'to clickjacking attacks where an attacker can embed the application in an '
            'iframe and trick users into performing unintended actions.'
        ),
        'details': (
            'The application does not set the X-Frame-Options header or an equivalent '
            'Content-Security-Policy frame-ancestors directive. Pages containing sensitive '
            'actions can be loaded inside an attacker-controlled iframe.'
        ),
        'impact': (
            'An attacker can overlay a transparent iframe over a decoy page, tricking users '
            'into performing unintended privileged actions such as changing account settings, '
            'making purchases, or approving transfers.'
        ),
        'likelihood': (
            'Low. Exploitation requires a crafted page and social engineering to direct the '
            'victim to it, and only affects actions that can be triggered by a single click.'
        ),
        'recommendations': (
            '1. Set the X-Frame-Options response header to DENY or SAMEORIGIN.\n'
            '2. Implement a Content-Security-Policy header with the frame-ancestors directive.\n'
            '3. Consider requiring re-authentication for sensitive actions to reduce the clickjacking impact.'
        ),
        'references': 'https://owasp.org/www-community/attacks/Clickjacking\nhttps://cwe.mitre.org/data/definitions/1021.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:L/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'R', 's': 'U', 'c': 'N', 'i': 'L', 'a': 'N',
    },
    {
        'title': 'Missing Security Headers',
        'category': 'CONFIG',
        'default_severity': 'LOW',
        'cwe_id': 'CWE-16',
        'tags': ['headers', 'security-headers', 'misconfiguration', 'defence-in-depth'],
        'description': (
            'The application is missing one or more recommended HTTP security headers. '
            'These headers provide important browser-level protections against common '
            'attack classes such as XSS, clickjacking, and protocol downgrade attacks.'
        ),
        'details': (
            'The following security headers were absent or misconfigured:\n\n'
            '- Content-Security-Policy (CSP)\n'
            '- X-Frame-Options\n'
            '- X-Content-Type-Options\n'
            '- Strict-Transport-Security (HSTS)\n'
            '- Referrer-Policy\n'
            '- Permissions-Policy\n\n'
            'Affected base URL: [URL]'
        ),
        'impact': (
            'Absence of these headers removes browser-enforced mitigations and increases '
            'the impact of other vulnerabilities. For example, missing HSTS enables SSL '
            'stripping attacks; missing X-Content-Type-Options enables MIME-sniffing attacks.'
        ),
        'likelihood': (
            'Low in isolation. These headers serve as defence-in-depth controls that reduce '
            'the severity of other vulnerabilities.'
        ),
        'recommendations': (
            '1. Set Content-Security-Policy with a restrictive policy.\n'
            '2. Set X-Frame-Options: DENY or SAMEORIGIN.\n'
            '3. Set X-Content-Type-Options: nosniff.\n'
            '4. Set Strict-Transport-Security with a long max-age and includeSubDomains.\n'
            '5. Set Referrer-Policy: strict-origin-when-cross-origin.\n'
            '6. Set Permissions-Policy to restrict browser feature access.\n'
            '7. Configure headers at the web server or reverse proxy layer.'
        ),
        'references': 'https://securityheaders.com\nhttps://owasp.org/www-project-secure-headers/',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N',
        'av': 'N', 'ac': 'H', 'pr': 'N', 'ui': 'R', 's': 'U', 'c': 'L', 'i': 'L', 'a': 'N',
    },
    {
        'title': 'Directory Listing Enabled',
        'category': 'CONFIG',
        'default_severity': 'LOW',
        'cwe_id': 'CWE-548',
        'tags': ['directory-listing', 'information-disclosure', 'misconfiguration'],
        'description': (
            'Directory listing is enabled on the web server. When a directory does not '
            'contain an index file, the web server returns a listing of all files and '
            'subdirectories, potentially exposing sensitive files.'
        ),
        'details': (
            'Accessing the following directory path(s) returns a file listing:\n\n'
            '[AFFECTED PATHS]\n\n'
            'Files visible may include backup files, configuration files, scripts, or '
            'other sensitive content.'
        ),
        'impact': (
            'An attacker can enumerate files and directories, discover sensitive files '
            'such as backup archives, configuration files, or source code that were not '
            'intended to be publicly accessible.'
        ),
        'likelihood': (
            'Low. Exploitation is trivial once the directory is known, but the impact '
            'depends on what files are exposed.'
        ),
        'recommendations': (
            '1. Disable directory listing in the web server configuration (e.g. Options -Indexes in Apache; autoindex off in Nginx).\n'
            '2. Ensure all directories contain an appropriate index file.\n'
            '3. Review exposed directories for sensitive files and remove or relocate them.\n'
            '4. Store sensitive files outside the web root.'
        ),
        'references': 'https://cwe.mitre.org/data/definitions/548.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'L', 'i': 'N', 'a': 'N',
    },
    {
        'title': 'Verbose Error Messages',
        'category': 'CONFIG',
        'default_severity': 'LOW',
        'cwe_id': 'CWE-209',
        'tags': ['information-disclosure', 'error-handling', 'misconfiguration'],
        'description': (
            'The application returns verbose error messages in production that disclose '
            'sensitive technical information such as stack traces, database queries, '
            'internal file paths, or software version information.'
        ),
        'details': (
            'When certain error conditions are triggered (e.g. invalid input, missing '
            'resources), the application returns detailed error information that aids '
            'an attacker in understanding the application internals.\n\n'
            'Affected endpoint(s): [ENDPOINT]\n'
            'Sample error content: [SAMPLE]'
        ),
        'impact': (
            'Verbose errors assist attackers in fingerprinting technologies, understanding '
            'application logic, identifying injectable parameters, and crafting more targeted attacks.'
        ),
        'likelihood': (
            'Low in isolation. Combined with other vulnerabilities, the information disclosed '
            'significantly assists further exploitation.'
        ),
        'recommendations': (
            '1. Configure the application to display generic error messages to end users in production.\n'
            '2. Log detailed error information server-side for debugging purposes only.\n'
            '3. Disable debug mode in production application frameworks.\n'
            '4. Implement a custom error handler that returns neutral error pages.'
        ),
        'references': 'https://cwe.mitre.org/data/definitions/209.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'L', 'i': 'N', 'a': 'N',
    },
    # ── AUTHENTICATION ────────────────────────────────────────────────────────
    {
        'title': 'Weak Password Policy',
        'category': 'AUTH',
        'default_severity': 'MEDIUM',
        'cwe_id': 'CWE-521',
        'tags': ['password-policy', 'authentication', 'brute-force'],
        'description': (
            'The application enforces an inadequate password policy, allowing users to '
            'set weak passwords that are susceptible to brute-force and dictionary attacks.'
        ),
        'details': (
            'The application accepts passwords that do not meet minimum complexity requirements. '
            'Testing confirmed that passwords such as "password", "123456", or single-character '
            'strings are accepted. The following requirements are absent or not enforced:\n\n'
            '- Minimum length requirement\n'
            '- Complexity requirements (uppercase, lowercase, numbers, symbols)\n'
            '- Common password blocklist\n'
            '- Breached password check'
        ),
        'impact': (
            'Weak passwords are easily compromised through brute-force, dictionary attacks, '
            'or credential stuffing using leaked password databases, leading to unauthorised '
            'account access.'
        ),
        'likelihood': (
            'High. Automated tools can perform thousands of login attempts per second against '
            'the application.'
        ),
        'recommendations': (
            '1. Enforce a minimum password length of at least 12 characters.\n'
            '2. Check passwords against a blocklist of known compromised passwords (e.g. using Have I Been Pwned API).\n'
            '3. Encourage passphrases rather than complex short passwords.\n'
            '4. Implement account lockout or progressive delay after failed login attempts.\n'
            '5. Enforce multi-factor authentication for all accounts.'
        ),
        'references': 'https://pages.nist.gov/800-63-3/sp800-63b.html\nhttps://cwe.mitre.org/data/definitions/521.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'N',
    },
    {
        'title': 'Multi-Factor Authentication Not Enforced',
        'category': 'AUTH',
        'default_severity': 'MEDIUM',
        'cwe_id': 'CWE-308',
        'tags': ['mfa', '2fa', 'authentication', 'account-takeover'],
        'description': (
            'Multi-factor authentication (MFA) is not enforced for user accounts. '
            'Relying solely on username and password authentication leaves accounts '
            'vulnerable to credential theft and account takeover.'
        ),
        'details': (
            'Authentication to the application relies entirely on a single factor (password). '
            'MFA is either not implemented or not enforced, meaning a compromised password '
            'is sufficient for an attacker to fully access an account.\n\n'
            'User tiers affected: [ADMIN / ALL USERS]'
        ),
        'impact': (
            'If user credentials are compromised through phishing, credential stuffing, or '
            'password reuse, an attacker can immediately access the account with no additional '
            'barrier. For administrative accounts, this may result in full system compromise.'
        ),
        'likelihood': (
            'High. Credential compromise is extremely common given widespread data breaches '
            'and phishing campaigns.'
        ),
        'recommendations': (
            '1. Enforce MFA for all users, particularly those with administrative privileges.\n'
            '2. Support TOTP-based authenticator apps or hardware security keys (FIDO2/WebAuthn).\n'
            '3. Avoid SMS-based MFA as the primary method due to SIM-swapping risks.\n'
            '4. Implement risk-based authentication that triggers MFA for suspicious logins.'
        ),
        'references': 'https://owasp.org/www-community/controls/Multi-Factor_Authentication\nhttps://cwe.mitre.org/data/definitions/308.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N',
        'av': 'N', 'ac': 'H', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'N',
    },
    {
        'title': 'Default Credentials',
        'category': 'AUTH',
        'default_severity': 'CRITICAL',
        'cwe_id': 'CWE-1392',
        'tags': ['default-credentials', 'authentication', 'misconfiguration'],
        'description': (
            'Default or well-known credentials were accepted by the application or an '
            'exposed service. Vendor-default usernames and passwords have not been changed '
            'and remain active on the system.'
        ),
        'details': (
            'Access was gained to the following system(s) using default credentials:\n\n'
            'System/Service: [SERVICE]\n'
            'Credentials Used: [USERNAME] / [PASSWORD]\n\n'
            'Default credentials for common applications and devices are publicly documented '
            'and are among the first vectors attempted by attackers.'
        ),
        'impact': (
            'An attacker gains immediate administrative or privileged access to the affected '
            'system without any advanced techniques. This typically results in full compromise '
            'of the affected device or service.'
        ),
        'likelihood': (
            'Critical. Exploitation requires only knowledge of the publicly documented default '
            'credentials, which is trivial.'
        ),
        'recommendations': (
            '1. Change all default credentials immediately upon deployment.\n'
            '2. Implement a process to inventory all systems and verify credentials have been changed.\n'
            '3. Where possible, force credential change on first login.\n'
            '4. Include default credential checks in vulnerability scanning procedures.\n'
            '5. Disable accounts that are not required.'
        ),
        'references': 'https://cwe.mitre.org/data/definitions/1392.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'C', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    {
        'title': 'Account Lockout Not Implemented',
        'category': 'AUTH',
        'default_severity': 'MEDIUM',
        'cwe_id': 'CWE-307',
        'tags': ['account-lockout', 'brute-force', 'authentication'],
        'description': (
            'The application does not implement account lockout or rate limiting on '
            'authentication attempts, allowing unlimited brute-force attacks against '
            'user accounts.'
        ),
        'details': (
            'Testing confirmed that an unlimited number of authentication requests can be '
            'made without triggering any lockout, CAPTCHA, or rate-limiting response. '
            'Automated tools can perform thousands of attempts per minute.\n\n'
            'Affected endpoint(s): [ENDPOINT]'
        ),
        'impact': (
            'An attacker can perform unlimited brute-force or credential stuffing attacks '
            'against any account, including administrative accounts. Given sufficient time, '
            'any account with a weak or commonly-used password will be compromised.'
        ),
        'likelihood': (
            'High. Automated tools are widely available and can test large credential lists rapidly.'
        ),
        'recommendations': (
            '1. Implement progressive authentication delays after failed attempts (e.g. 1s, 2s, 4s).\n'
            '2. Lock accounts temporarily after a defined number of failed attempts (e.g. 5-10).\n'
            '3. Implement CAPTCHA after a small number of failures.\n'
            '4. Apply rate limiting at the IP level.\n'
            '5. Alert on large numbers of failed login attempts from a single IP.\n'
            '6. Enforce MFA to make brute-forced passwords insufficient on their own.'
        ),
        'references': 'https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks\nhttps://cwe.mitre.org/data/definitions/307.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'N',
    },
    {
        'title': 'Username Enumeration',
        'category': 'AUTH',
        'default_severity': 'LOW',
        'cwe_id': 'CWE-204',
        'tags': ['username-enumeration', 'information-disclosure', 'authentication'],
        'description': (
            'The application reveals whether a username exists in the system through '
            'differing responses to login or password reset requests, enabling an attacker '
            'to enumerate valid user accounts.'
        ),
        'details': (
            'The application returns distinct responses for valid and invalid usernames:\n\n'
            '- Valid username: [RESPONSE A]\n'
            '- Invalid username: [RESPONSE B]\n\n'
            'Affected endpoint(s): [ENDPOINT]\n\n'
            'This difference may be in the HTTP response body, status code, redirect, or '
            'response timing.'
        ),
        'impact': (
            'An attacker can compile a list of valid usernames which can then be used as '
            'input for credential stuffing, brute-force, or targeted phishing campaigns.'
        ),
        'likelihood': (
            'Low to Medium. Username enumeration is a reconnaissance step that enables '
            'more targeted attacks rather than being directly exploitable.'
        ),
        'recommendations': (
            '1. Return identical responses for valid and invalid usernames on login and password reset forms.\n'
            '2. Ensure response timing is normalised to prevent timing-based enumeration.\n'
            '3. Display a generic message such as "If an account exists with that email, a reset link has been sent."'
        ),
        'references': 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/03-Identity_Management_Testing/04-Testing_for_Account_Enumeration_and_Guessable_User_Account\nhttps://cwe.mitre.org/data/definitions/204.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'L', 'i': 'N', 'a': 'N',
    },
    # ── SESSION MANAGEMENT ────────────────────────────────────────────────────
    {
        'title': 'Insecure Cookie Attributes',
        'category': 'SESSION',
        'default_severity': 'MEDIUM',
        'cwe_id': 'CWE-1004',
        'tags': ['cookies', 'session', 'httponly', 'secure', 'samesite'],
        'description': (
            'Session cookies are missing one or more critical security attributes '
            '(HttpOnly, Secure, SameSite), increasing the risk of session hijacking.'
        ),
        'details': (
            'The following cookie security attributes are absent:\n\n'
            '- HttpOnly: [MISSING/PRESENT] — if missing, JavaScript can read the cookie\n'
            '- Secure: [MISSING/PRESENT] — if missing, cookie transmitted over HTTP\n'
            '- SameSite: [MISSING/PRESENT] — if missing, cookie sent on cross-site requests\n\n'
            'Affected cookie(s): [COOKIE NAMES]'
        ),
        'impact': (
            'Missing HttpOnly allows XSS attacks to steal session tokens. Missing Secure '
            'allows session tokens to be transmitted in cleartext over HTTP. Missing SameSite '
            'increases CSRF attack surface.'
        ),
        'likelihood': (
            'Medium. Requires another vulnerability (XSS, network interception) to be '
            'present to exploit the missing attributes.'
        ),
        'recommendations': (
            '1. Set the HttpOnly attribute on all session cookies.\n'
            '2. Set the Secure attribute on all session cookies to prevent transmission over HTTP.\n'
            '3. Set SameSite=Strict or SameSite=Lax on session cookies.\n'
            '4. Configure cookie attributes at the framework or web server level to apply globally.'
        ),
        'references': 'https://owasp.org/www-community/controls/SecureCookieAttribute\nhttps://cwe.mitre.org/data/definitions/1004.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:L/A:N',
        'av': 'N', 'ac': 'H', 'pr': 'N', 'ui': 'R', 's': 'U', 'c': 'H', 'i': 'L', 'a': 'N',
    },
    {
        'title': 'Session Not Invalidated on Logout',
        'category': 'SESSION',
        'default_severity': 'MEDIUM',
        'cwe_id': 'CWE-613',
        'tags': ['session', 'logout', 'token-invalidation'],
        'description': (
            'The application does not invalidate session tokens on the server side when '
            'a user logs out. A captured session token remains valid after logout, '
            'enabling session replay attacks.'
        ),
        'details': (
            'After performing a logout action, the previously issued session token was '
            'tested and found to remain valid for continued access to authenticated '
            'resources. The server does not maintain a blocklist or actively expire '
            'the server-side session.\n\n'
            'Affected logout endpoint: [ENDPOINT]'
        ),
        'impact': (
            'A captured session token (from network interception, XSS, or physical access) '
            'remains usable indefinitely after the legitimate user has logged out, allowing '
            'persistent unauthorised access.'
        ),
        'likelihood': (
            'Medium. Requires prior capture of a session token through another attack vector.'
        ),
        'recommendations': (
            '1. Invalidate the server-side session upon logout.\n'
            '2. For JWT-based authentication, maintain a server-side token blocklist or use short expiry times with refresh tokens.\n'
            '3. Implement an absolute session timeout in addition to idle timeout.\n'
            '4. Provide users with an option to invalidate all active sessions.'
        ),
        'references': 'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html\nhttps://cwe.mitre.org/data/definitions/613.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N',
        'av': 'N', 'ac': 'H', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'N',
    },
    # ── NETWORK ───────────────────────────────────────────────────────────────
    {
        'title': 'Unencrypted Network Protocols in Use',
        'category': 'NETWORK',
        'default_severity': 'MEDIUM',
        'cwe_id': 'CWE-319',
        'tags': ['cleartext', 'encryption', 'network', 'telnet', 'ftp', 'http'],
        'description': (
            'One or more network services are transmitting data in cleartext using '
            'unencrypted protocols. Credentials, session tokens, and sensitive data '
            'are exposed to anyone with network access capable of intercepting traffic.'
        ),
        'details': (
            'The following unencrypted protocols were identified as active:\n\n'
            '[PROTOCOL LIST]\n\n'
            'These services transmit authentication credentials and data in cleartext, '
            'making them susceptible to network interception (man-in-the-middle) attacks.'
        ),
        'impact': (
            'An attacker with access to the network path between client and server can '
            'intercept credentials, session tokens, and sensitive data in transit. '
            'This includes credentials reusable for other services.'
        ),
        'likelihood': (
            'Medium. Requires network-level access (LAN, rogue AP, compromised router) '
            'but is straightforward to exploit with freely available tools.'
        ),
        'recommendations': (
            '1. Disable all unencrypted protocol services (Telnet, FTP, HTTP, SNMPv1/v2).\n'
            '2. Replace with encrypted equivalents (SSH, SFTP/FTPS, HTTPS, SNMPv3).\n'
            '3. Enforce TLS 1.2 or above for all network communications.\n'
            '4. Implement network segmentation to limit interception opportunities.'
        ),
        'references': 'https://cwe.mitre.org/data/definitions/319.html',
        'cvss_vector': 'CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
        'av': 'A', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'N', 'a': 'N',
    },
    {
        'title': 'SSL/TLS Weak Cipher Suites Supported',
        'category': 'ENCRYPTION',
        'default_severity': 'MEDIUM',
        'cwe_id': 'CWE-326',
        'tags': ['ssl', 'tls', 'cipher-suites', 'encryption', 'weak-crypto'],
        'description': (
            'The TLS configuration supports weak or deprecated cipher suites and/or '
            'outdated protocol versions, reducing the security of encrypted communications.'
        ),
        'details': (
            'The following weak cipher suites or protocol versions were identified:\n\n'
            '[CIPHER LIST]\n\n'
            'Weak ciphers include those using NULL encryption, RC4, DES, 3DES, '
            'MD5 for MAC, anonymous key exchange, or export-grade key sizes. '
            'Deprecated protocol versions include SSLv2, SSLv3, TLS 1.0, and TLS 1.1.'
        ),
        'impact': (
            'Weak cipher suites may be exploited in downgrade attacks (e.g. BEAST, POODLE, '
            'SWEET32, DROWN), allowing an attacker to decrypt encrypted traffic or perform '
            'man-in-the-middle attacks on TLS sessions.'
        ),
        'likelihood': (
            'Low to Medium. Exploitation of cipher weaknesses typically requires a '
            'privileged network position and significant computation, though some attacks '
            'are practical with modern hardware.'
        ),
        'recommendations': (
            '1. Disable SSLv2, SSLv3, TLS 1.0, and TLS 1.1.\n'
            '2. Configure TLS 1.2 and TLS 1.3 only.\n'
            '3. Disable weak and NULL cipher suites; prefer ECDHE with AES-GCM.\n'
            '4. Enable Perfect Forward Secrecy (PFS) cipher suites.\n'
            '5. Test TLS configuration using tools such as testssl.sh or SSL Labs.'
        ),
        'references': 'https://www.ssllabs.com/ssltest/\nhttps://cwe.mitre.org/data/definitions/326.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N',
        'av': 'N', 'ac': 'H', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'N', 'a': 'N',
    },
    {
        'title': 'SSL/TLS Certificate Issues',
        'category': 'ENCRYPTION',
        'default_severity': 'MEDIUM',
        'cwe_id': 'CWE-295',
        'tags': ['ssl', 'tls', 'certificate', 'expired', 'self-signed'],
        'description': (
            'The TLS certificate presented by the server has one or more issues that '
            'prevent clients from establishing a verified encrypted connection and may '
            'expose users to man-in-the-middle attacks.'
        ),
        'details': (
            'The following certificate issue(s) were identified:\n\n'
            '[ ] Certificate is expired (expiry date: [DATE])\n'
            '[ ] Certificate is self-signed (not issued by a trusted CA)\n'
            '[ ] Certificate hostname does not match the domain\n'
            '[ ] Certificate chain is incomplete\n\n'
            'Affected host(s): [HOST]'
        ),
        'impact': (
            'Expired or self-signed certificates cause browser warnings that users may '
            'dismiss, accepting a potentially fraudulent certificate. Misconfigured '
            'certificates can be exploited in man-in-the-middle attacks to intercept '
            'encrypted communications.'
        ),
        'likelihood': (
            'Medium. Certificate issues are common, and users often bypass warnings, '
            'potentially accepting attacker certificates.'
        ),
        'recommendations': (
            '1. Obtain a valid certificate from a trusted Certificate Authority (CA).\n'
            '2. Renew certificates before expiry and implement automated renewal (e.g. Let\'s Encrypt with certbot).\n'
            '3. Implement certificate monitoring and alerting for approaching expiry.\n'
            '4. Deploy the full certificate chain including intermediate certificates.\n'
            '5. Implement HTTP Strict Transport Security (HSTS) to prevent downgrade attacks.'
        ),
        'references': 'https://cwe.mitre.org/data/definitions/295.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:H/A:N',
        'av': 'N', 'ac': 'H', 'pr': 'N', 'ui': 'R', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'N',
    },
    {
        'title': 'SMB Signing Not Required',
        'category': 'NETWORK',
        'default_severity': 'MEDIUM',
        'cwe_id': 'CWE-345',
        'tags': ['smb', 'signing', 'relay', 'ntlm', 'windows', 'active-directory'],
        'description': (
            'SMB signing is not required on one or more hosts. Without SMB signing, '
            'NTLM relay attacks can be used to authenticate as other users by relaying '
            'captured authentication attempts.'
        ),
        'details': (
            'The following hosts have SMB signing disabled or set to not required:\n\n'
            '[HOST LIST]\n\n'
            'This allows an attacker who can intercept SMB authentication (e.g. via '
            'LLMNR/NBT-NS poisoning or by intercepting connections) to relay the '
            'credentials to another host and authenticate as the victim.'
        ),
        'impact': (
            'An attacker can relay captured NTLM authentication hashes to authenticate '
            'to other systems on the network, potentially gaining access to file shares, '
            'executing code remotely, or compromising domain resources.'
        ),
        'likelihood': (
            'High in internal network environments where LLMNR/NBT-NS poisoning or ARP '
            'spoofing can be performed. Tools such as Responder and ntlmrelayx automate '
            'the attack.'
        ),
        'recommendations': (
            '1. Enable and require SMB signing on all Windows hosts via Group Policy.\n'
            '   Computer Configuration > Windows Settings > Security Settings > Local Policies > Security Options:\n'
            '   - "Microsoft network server: Digitally sign communications (always)" = Enabled\n'
            '   - "Microsoft network client: Digitally sign communications (always)" = Enabled\n'
            '2. Disable LLMNR and NBT-NS to prevent poisoning-based relay opportunities.\n'
            '3. Enable SMB Encryption where supported.'
        ),
        'references': 'https://docs.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/microsoft-network-server-digitally-sign-communications-always\nhttps://cwe.mitre.org/data/definitions/345.html',
        'cvss_vector': 'CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
        'av': 'A', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    {
        'title': 'LLMNR / NBT-NS Poisoning',
        'category': 'NETWORK',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-923',
        'tags': ['llmnr', 'nbt-ns', 'poisoning', 'ntlm', 'credential-capture', 'active-directory'],
        'description': (
            'Link-Local Multicast Name Resolution (LLMNR) and/or NetBIOS Name Service '
            '(NBT-NS) are enabled on the network. These protocols can be abused by an '
            'attacker to capture NTLM authentication hashes.'
        ),
        'details': (
            'LLMNR and NBT-NS are legacy name resolution protocols used as fallback when '
            'DNS resolution fails. An attacker can respond to broadcast queries (poisoning) '
            'and cause victims to authenticate to the attacker\'s machine, capturing NTLM '
            'hashes that can be cracked offline or relayed.\n\n'
            'Testing confirmed successful capture of NTLM hashes using Responder from:\n'
            '[AFFECTED HOSTS / SUBNETS]'
        ),
        'impact': (
            'Captured NTLMv2 hashes can be cracked offline using tools like Hashcat. '
            'Cracked credentials provide access to network resources. Captured hashes '
            'can also be relayed (in conjunction with SMB signing being disabled) to '
            'authenticate directly to other hosts without needing to crack the hash.'
        ),
        'likelihood': (
            'High. The attack is passive and easily executed on any network segment. '
            'Tools such as Responder automate the entire process.'
        ),
        'recommendations': (
            '1. Disable LLMNR via Group Policy: Computer Configuration > Administrative Templates > Network > DNS Client > "Turn off multicast name resolution" = Enabled.\n'
            '2. Disable NBT-NS via NIC settings or DHCP Options (Option 43).\n'
            '3. Enable SMB signing to prevent relay of captured hashes.\n'
            '4. Enforce strong passwords to resist offline cracking of captured hashes.\n'
            '5. Implement network monitoring to detect Responder-style poisoning.'
        ),
        'references': 'https://www.mitrecorporation.com/\nhttps://cwe.mitre.org/data/definitions/923.html',
        'cvss_vector': 'CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
        'av': 'A', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'N',
    },
    {
        'title': 'Kerberoasting',
        'category': 'NETWORK',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-522',
        'tags': ['kerberoasting', 'active-directory', 'kerberos', 'spn', 'credential-cracking'],
        'description': (
            'Service accounts with Service Principal Names (SPNs) registered in Active '
            'Directory are susceptible to Kerberoasting. Any authenticated domain user '
            'can request Kerberos service tickets for these accounts and attempt to crack '
            'the ticket offline to recover the service account password.'
        ),
        'details': (
            'The following service accounts with SPNs were identified as susceptible:\n\n'
            '[SPN / ACCOUNT LIST]\n\n'
            'Testing confirmed successful offline cracking of the following account(s): '
            '[CRACKED ACCOUNTS]\n\n'
            'Cracked password hash(es): [HASH TYPE AND SAMPLE]'
        ),
        'impact': (
            'Cracked service account credentials may grant elevated access to systems '
            'and services within the domain. In some cases, service accounts have '
            'Domain Admin or equivalent privileges, leading to full domain compromise.'
        ),
        'likelihood': (
            'High. Any authenticated domain user can perform Kerberoasting. Service '
            'accounts frequently have weak passwords due to manual management and '
            'lack of rotation policies.'
        ),
        'recommendations': (
            '1. Ensure service account passwords are long (25+ characters), random, and complex.\n'
            '2. Use Group Managed Service Accounts (gMSAs) which have automatically rotated 120-character passwords.\n'
            '3. Regularly audit SPNs and remove unnecessary ones.\n'
            '4. Monitor for unusual Kerberos TGS requests (Event ID 4769) and alert on bulk requests.\n'
            '5. Apply the principle of least privilege to service accounts.'
        ),
        'references': 'https://attack.mitre.org/techniques/T1558/003/\nhttps://cwe.mitre.org/data/definitions/522.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:H/I:H/A:H',
        'av': 'N', 'ac': 'H', 'pr': 'L', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    {
        'title': 'AS-REP Roasting',
        'category': 'NETWORK',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-522',
        'tags': ['asrep-roasting', 'active-directory', 'kerberos', 'pre-authentication', 'credential-cracking'],
        'description': (
            'One or more Active Directory user accounts have Kerberos pre-authentication '
            'disabled. This allows unauthenticated attackers to request encrypted Kerberos '
            'AS-REP messages for these accounts and crack them offline.'
        ),
        'details': (
            'The following accounts have "Do not require Kerberos preauthentication" set:\n\n'
            '[ACCOUNT LIST]\n\n'
            'Unlike Kerberoasting, AS-REP Roasting does not require domain credentials '
            'to initiate; it can be performed by an unauthenticated attacker. '
            'Testing confirmed successful offline cracking of [ACCOUNT(S)].'
        ),
        'impact': (
            'Cracked account credentials can be used to log in as the affected user. '
            'If any affected accounts have elevated privileges, this may result in '
            'privilege escalation or domain compromise.'
        ),
        'likelihood': (
            'High. The attack can be performed without domain authentication. '
            'The window of opportunity is unlimited as the vulnerability persists until addressed.'
        ),
        'recommendations': (
            '1. Enable Kerberos pre-authentication for all accounts (this is the default; the setting should not be disabled).\n'
            '2. Audit AD user accounts for the UF_DONT_REQUIRE_PREAUTH flag and remediate.\n'
            '3. Ensure affected accounts use strong, long, random passwords.\n'
            '4. Monitor for AS-REP requests without pre-authentication (Event ID 4768 with Failure Reason 0x18).'
        ),
        'references': 'https://attack.mitre.org/techniques/T1558/004/\nhttps://cwe.mitre.org/data/definitions/522.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    {
        'title': 'Pass-the-Hash',
        'category': 'NETWORK',
        'default_severity': 'CRITICAL',
        'cwe_id': 'CWE-836',
        'tags': ['pass-the-hash', 'pth', 'ntlm', 'lateral-movement', 'active-directory'],
        'description': (
            'NTLM authentication is in use and local administrator account password '
            'hashes were recovered and used to authenticate to other systems without '
            'knowing the plaintext password (Pass-the-Hash).'
        ),
        'details': (
            'NTLM hashes were extracted from [SOURCE] and successfully used to '
            'authenticate to additional hosts using Pass-the-Hash techniques.\n\n'
            'Accounts leveraged: [ACCOUNT(S)]\n'
            'Additional hosts accessed: [HOST LIST]\n\n'
            'This is enabled by shared local administrator passwords across multiple '
            'systems (common when machines are built from the same image without unique '
            'local admin passwords).'
        ),
        'impact': (
            'An attacker can use recovered NTLM hashes to authenticate to any other '
            'system where the same credential is valid, enabling rapid lateral movement '
            'across the environment without needing to crack passwords.'
        ),
        'likelihood': (
            'High once initial access and credential access is achieved. Shared local '
            'admin passwords across the estate dramatically increase impact.'
        ),
        'recommendations': (
            '1. Deploy Microsoft Local Administrator Password Solution (LAPS) to ensure unique, '
            '   automatically rotated local admin passwords on every host.\n'
            '2. Enable Protected Users security group for privileged accounts.\n'
            '3. Disable NTLM where possible and enforce Kerberos authentication.\n'
            '4. Enable Credential Guard on Windows 10/Server 2016+ to protect credentials in memory.\n'
            '5. Restrict local administrator rights using tiered access model.'
        ),
        'references': 'https://attack.mitre.org/techniques/T1550/002/\nhttps://docs.microsoft.com/en-us/windows-server/identity/laps/laps-overview',
        'cvss_vector': 'CVSS:3.1/AV:A/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H',
        'av': 'A', 'ac': 'L', 'pr': 'L', 'ui': 'N', 's': 'C', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    {
        'title': 'Default SNMP Community Strings',
        'category': 'NETWORK',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-1392',
        'tags': ['snmp', 'default-credentials', 'network-management', 'information-disclosure'],
        'description': (
            'Network devices or servers are running SNMP with default community strings '
            '(e.g. "public", "private"). These allow unauthenticated read or read/write '
            'access to device configuration and management data.'
        ),
        'details': (
            'The following hosts responded to SNMP queries using default community strings:\n\n'
            '[HOST LIST]\n\n'
            'Community string(s) confirmed: public [read], private [read/write]\n\n'
            'Information accessible via SNMP includes network interface details, '
            'routing tables, running processes, installed software, and configuration data.'
        ),
        'impact': (
            'With read access, an attacker can enumerate detailed network and system '
            'information to assist further attacks. With write access (private community '
            'string), device configuration can be modified, including routing tables '
            'and interface configurations, potentially disrupting network operations.'
        ),
        'likelihood': (
            'High. Default community strings are publicly known and among the first '
            'things attempted during network enumeration.'
        ),
        'recommendations': (
            '1. Disable SNMP entirely if not required.\n'
            '2. Upgrade to SNMPv3 with authentication and encryption.\n'
            '3. Change all community strings from default values to long, random strings.\n'
            '4. Restrict SNMP access to specific management IP addresses via ACLs.\n'
            '5. Block SNMP ports (UDP 161/162) at the perimeter firewall.'
        ),
        'references': 'https://cwe.mitre.org/data/definitions/1392.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    # ── CLOUD ─────────────────────────────────────────────────────────────────
    {
        'title': 'Publicly Accessible Cloud Storage Bucket',
        'category': 'CLOUD',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-732',
        'tags': ['s3', 'blob-storage', 'cloud', 'misconfiguration', 'data-exposure'],
        'description': (
            'One or more cloud storage buckets (e.g. AWS S3, Azure Blob, GCS) are '
            'publicly accessible, exposing stored files to unauthenticated read or '
            'write access by any internet user.'
        ),
        'details': (
            'The following bucket(s) were found to be publicly accessible:\n\n'
            '[BUCKET NAMES / URLS]\n\n'
            'Files accessible include: [SAMPLE FILE LISTING]\n\n'
            'Public list/read access was confirmed via unauthenticated HTTP requests.'
        ),
        'impact': (
            'Sensitive files stored in the bucket are exposed to the public internet. '
            'Depending on contents, this may include PII, credentials, application '
            'source code, database backups, or cryptographic keys. Writable buckets '
            'allow an attacker to upload malicious content.'
        ),
        'likelihood': (
            'Critical. Public buckets are trivially discoverable via cloud enumeration '
            'tools, search engines, and exposed URLs in application source code.'
        ),
        'recommendations': (
            '1. Remove all public access policies from buckets immediately.\n'
            '2. Enable "Block Public Access" settings at the account level (AWS S3).\n'
            '3. Audit bucket ACLs and policies and apply least-privilege access.\n'
            '4. Enable server-side encryption for all bucket contents.\n'
            '5. Enable access logging and set up alerts for public access changes.\n'
            '6. Rotate any credentials or keys that may have been exposed in the bucket.'
        ),
        'references': 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html\nhttps://cwe.mitre.org/data/definitions/732.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'L', 'a': 'N',
    },
    {
        'title': 'Overly Permissive IAM Policies',
        'category': 'CLOUD',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-250',
        'tags': ['iam', 'cloud', 'privilege', 'aws', 'azure', 'gcp', 'least-privilege'],
        'description': (
            'IAM (Identity and Access Management) policies grant excessive permissions '
            'to users, roles, or service accounts beyond what is required for their '
            'intended function, violating the principle of least privilege.'
        ),
        'details': (
            'The following IAM findings were identified:\n\n'
            '[IAM POLICY DETAILS]\n\n'
            'Common issues include wildcard (*) actions or resources, overly broad '
            'managed policies (e.g. AdministratorAccess, FullAccess policies), '
            'and unused permissions attached to active identities.'
        ),
        'impact': (
            'Overly permissive IAM policies significantly increase the blast radius of '
            'a compromised credential. An attacker gaining access to a role or service '
            'account with excessive permissions can access, modify, or delete resources '
            'far beyond what would be expected from the compromised identity.'
        ),
        'likelihood': (
            'Medium. Exploitation requires prior compromise of a credential or token '
            'associated with the permissive identity.'
        ),
        'recommendations': (
            '1. Apply the principle of least privilege: grant only permissions required for the specific task.\n'
            '2. Avoid wildcard (*) in IAM policy Actions or Resources.\n'
            '3. Use AWS IAM Access Analyzer or equivalent tools to identify overly permissive policies.\n'
            '4. Regularly review and remove unused permissions and identities.\n'
            '5. Use role-based access rather than long-lived user credentials.\n'
            '6. Enable MFA for all IAM users and enforce it via policy.'
        ),
        'references': 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html\nhttps://cwe.mitre.org/data/definitions/250.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H',
        'av': 'N', 'ac': 'L', 'pr': 'L', 'ui': 'N', 's': 'C', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    {
        'title': 'Cloud Instance Metadata Service Accessible via SSRF',
        'category': 'CLOUD',
        'default_severity': 'CRITICAL',
        'cwe_id': 'CWE-918',
        'tags': ['ssrf', 'imds', 'metadata', 'cloud', 'aws', 'credential-exposure'],
        'description': (
            'The cloud instance metadata service (IMDS) is accessible via a Server-Side '
            'Request Forgery (SSRF) vulnerability in the application. This allows an '
            'attacker to retrieve temporary IAM credentials assigned to the instance.'
        ),
        'details': (
            'Exploitation of the SSRF vulnerability identified at [ENDPOINT] was used '
            'to access the AWS IMDSv1 endpoint at http://169.254.169.254/. '
            'The following data was retrieved:\n\n'
            '- IAM role name: [ROLE]\n'
            '- Temporary AWS credentials (AccessKeyId, SecretAccessKey, Token)\n\n'
            'These credentials were confirmed to be valid for [SCOPE OF ACCESS].'
        ),
        'impact': (
            'Temporary IAM credentials retrieved from the metadata service can be used '
            'to interact with AWS APIs with all permissions of the instance role. '
            'Depending on the role\'s permissions, this may allow access to S3 buckets, '
            'RDS databases, parameter store secrets, and other cloud resources, '
            'potentially leading to full cloud environment compromise.'
        ),
        'likelihood': (
            'Critical. IMDSv1 returns credentials with a single unauthenticated HTTP '
            'request and does not require any token. The combination of SSRF and IMDSv1 '
            'is well-documented and commonly exploited.'
        ),
        'recommendations': (
            '1. Enforce IMDSv2 on all EC2 instances (requires session-oriented token).\n'
            '2. Remediate the underlying SSRF vulnerability.\n'
            '3. Apply the principle of least privilege to instance IAM roles.\n'
            '4. Block outbound requests to 169.254.169.254 from the application tier.\n'
            '5. Rotate the exposed credentials immediately.'
        ),
        'references': 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'C', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    # ── CRYPTOGRAPHY ─────────────────────────────────────────────────────────
    {
        'title': 'Sensitive Data Stored with Weak Hashing Algorithm',
        'category': 'ENCRYPTION',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-916',
        'tags': ['hashing', 'passwords', 'md5', 'sha1', 'weak-crypto', 'storage'],
        'description': (
            'Sensitive data (e.g. user passwords) is stored using a weak or broken '
            'hashing algorithm (e.g. MD5, SHA-1, unsalted SHA-256) that is not '
            'suitable for password storage.'
        ),
        'details': (
            'Analysis of the application database revealed that passwords are stored '
            'using [ALGORITHM]. This algorithm is:\n\n'
            '- Fast to compute, enabling rapid offline cracking\n'
            '- [Unsalted — susceptible to rainbow table attacks]\n'
            '- [Broken — known collision vulnerabilities]\n\n'
            'Modern GPUs can compute billions of MD5 hashes per second, making '
            'cracking of most real-world passwords feasible.'
        ),
        'impact': (
            'If the password database is compromised (e.g. via SQL injection or '
            'database backup theft), stored passwords can be quickly recovered using '
            'rainbow tables or GPU-accelerated cracking, enabling account takeover '
            'and credential stuffing against other services.'
        ),
        'likelihood': (
            'High if database access is obtained. The cracking of MD5/SHA-1 hashes '
            'is trivial with modern hardware.'
        ),
        'recommendations': (
            '1. Migrate to a password-specific hashing algorithm: bcrypt, scrypt, Argon2id, or PBKDF2.\n'
            '2. Use a work factor sufficient to make cracking impractical (e.g. bcrypt cost factor 12+).\n'
            '3. Ensure all passwords are salted with a unique random salt per user.\n'
            '4. Force all users to reset their passwords after migration.\n'
            '5. Consider implementing a rehash-on-login migration strategy.'
        ),
        'references': 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html\nhttps://cwe.mitre.org/data/definitions/916.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N',
        'av': 'N', 'ac': 'H', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'N',
    },
    {
        'title': 'Hardcoded Credentials in Source Code',
        'category': 'ENCRYPTION',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-798',
        'tags': ['hardcoded-credentials', 'secrets', 'source-code', 'api-key'],
        'description': (
            'Credentials, API keys, or other secrets are hardcoded directly in the '
            'application source code. These are exposed to anyone with access to the '
            'codebase, including version control history.'
        ),
        'details': (
            'The following credentials or secrets were identified hardcoded in the source code:\n\n'
            '[SECRET TYPE]: [LOCATION IN CODE]\n\n'
            'Secrets committed to version control persist in the git history even if '
            'removed from the current code.'
        ),
        'impact': (
            'Any person with access to the source code (or its git history) can extract '
            'the credentials and use them to authenticate to the related service. '
            'Depending on the secret type, this may grant database access, API access, '
            'or administrative access to cloud infrastructure.'
        ),
        'likelihood': (
            'High if the repository is public. Medium for private repositories with '
            'multiple contributors.'
        ),
        'recommendations': (
            '1. Immediately rotate all exposed credentials.\n'
            '2. Remove secrets from source code and store in environment variables or a secrets manager (e.g. AWS Secrets Manager, HashiCorp Vault).\n'
            '3. Purge secrets from git history using git-filter-repo or BFG Repo Cleaner.\n'
            '4. Implement pre-commit hooks (e.g. git-secrets, truffleHog) to prevent future commits of secrets.\n'
            '5. Integrate secrets scanning into your CI/CD pipeline.'
        ),
        'references': 'https://cwe.mitre.org/data/definitions/798.html\nhttps://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    # ── API ───────────────────────────────────────────────────────────────────
    {
        'title': 'Lack of API Rate Limiting',
        'category': 'API',
        'default_severity': 'MEDIUM',
        'cwe_id': 'CWE-770',
        'tags': ['api', 'rate-limiting', 'denial-of-service', 'brute-force'],
        'description': (
            'The application API does not implement rate limiting on one or more endpoints, '
            'allowing an attacker to make an unlimited number of requests to brute-force '
            'credentials, enumerate data, or cause resource exhaustion.'
        ),
        'details': (
            'Testing confirmed that requests to the following endpoint(s) are not rate-limited:\n\n'
            '[ENDPOINT LIST]\n\n'
            'An attacker can make thousands of requests per second without triggering '
            'any throttling, CAPTCHA, or lockout mechanism.'
        ),
        'impact': (
            'Absence of rate limiting enables brute-force attacks against authentication '
            'endpoints, mass enumeration of data, and resource exhaustion attacks that '
            'may degrade service availability.'
        ),
        'likelihood': (
            'High. Automated tools can trivially exploit the lack of rate limiting.'
        ),
        'recommendations': (
            '1. Implement rate limiting on all API endpoints, with stricter limits on authentication and sensitive actions.\n'
            '2. Apply rate limits per user, per IP, and globally.\n'
            '3. Return HTTP 429 (Too Many Requests) with a Retry-After header when limits are exceeded.\n'
            '4. Consider using an API gateway or WAF with built-in rate limiting capabilities.'
        ),
        'references': 'https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/\nhttps://cwe.mitre.org/data/definitions/770.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'L', 'i': 'L', 'a': 'L',
    },
    {
        'title': 'Mass Assignment Vulnerability',
        'category': 'API',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-915',
        'tags': ['mass-assignment', 'api', 'authorisation', 'owasp-api6'],
        'description': (
            'The API is susceptible to mass assignment attacks. The server binds '
            'client-supplied parameters directly to internal objects without filtering, '
            'allowing an attacker to modify fields that should not be user-controllable '
            '(e.g. role, isAdmin, balance).'
        ),
        'details': (
            'Testing confirmed that submitting additional fields in API requests results '
            'in those fields being written to the underlying data store. For example:\n\n'
            'Affected endpoint: [ENDPOINT]\n'
            'Fields manipulated: [FIELD NAMES] (e.g. role, is_admin, account_balance)\n\n'
            'This was confirmed by submitting the fields and observing the change reflected '
            'in subsequent API responses.'
        ),
        'impact': (
            'An attacker can escalate their own privileges, modify account balances, '
            'bypass business logic constraints, or tamper with data in ways not intended '
            'by the application design.'
        ),
        'likelihood': (
            'High. Modern frameworks often enable mass assignment by default. Exploitation '
            'requires only knowledge of property names, which may be leaked via API '
            'documentation, error messages, or JavaScript source code.'
        ),
        'recommendations': (
            '1. Implement an explicit allowlist of properties that may be set via each API endpoint.\n'
            '2. Use Data Transfer Objects (DTOs) or serialiser schemas that explicitly define allowed input fields.\n'
            '3. Never bind user-supplied data directly to internal model objects.\n'
            '4. Apply server-side authorisation checks for any sensitive property changes.'
        ),
        'references': 'https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/\nhttps://cwe.mitre.org/data/definitions/915.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'L', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'N',
    },
    {
        'title': 'API Key Exposed in Client-Side Code',
        'category': 'API',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-312',
        'tags': ['api-key', 'secrets', 'client-side', 'information-disclosure'],
        'description': (
            'An API key or other secret is exposed in client-side JavaScript code, '
            'HTML source, or mobile application binary. Any user who inspects the '
            'application code can extract and abuse the key.'
        ),
        'details': (
            'The following API key(s) were identified in client-side code:\n\n'
            'Key type: [KEY TYPE]\n'
            'Location: [FILE / LINE]\n'
            'Key value: [REDACTED IN REPORT]\n\n'
            'The key was confirmed to be valid by testing it against the associated API.'
        ),
        'impact': (
            'Any user with access to the application can extract the API key and '
            'use it to access the associated API. Depending on the key\'s permissions, '
            'this may allow access to sensitive data, abuse of paid API quotas, or '
            'actions on behalf of the application.'
        ),
        'likelihood': (
            'High. Client-side code is fully accessible to any user of the application, '
            'including browser developer tools.'
        ),
        'recommendations': (
            '1. Never embed API keys or secrets in client-side code.\n'
            '2. Route API requests through a server-side proxy that adds the authentication credentials.\n'
            '3. Immediately rotate the exposed key.\n'
            '4. Restrict the API key\'s permissions to only what the application requires.\n'
            '5. Implement key usage monitoring and alerting for anomalous usage.'
        ),
        'references': 'https://cwe.mitre.org/data/definitions/312.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'N',
    },
    # ── ACCESS CONTROL ────────────────────────────────────────────────────────
    {
        'title': 'Privilege Escalation — Vertical',
        'category': 'ACCESS',
        'default_severity': 'CRITICAL',
        'cwe_id': 'CWE-269',
        'tags': ['privilege-escalation', 'vertical', 'authorisation', 'admin', 'owasp-a01'],
        'description': (
            'A vertical privilege escalation vulnerability was identified. A lower-privileged '
            'user can access functionality or data reserved for higher-privileged roles '
            '(e.g. a regular user accessing administrative functions).'
        ),
        'details': (
            'Testing confirmed that a standard user account can access the following '
            'administrative or restricted functionality:\n\n'
            '[FUNCTIONALITY / ENDPOINTS]\n\n'
            'Access was gained by [TECHNIQUE — e.g. modifying request parameters, '
            'directly accessing admin URLs, manipulating role claims in JWT].'
        ),
        'impact': (
            'A low-privileged attacker can gain full administrative access to the '
            'application, including the ability to manage users, access all data, '
            'modify configuration, or perform destructive actions.'
        ),
        'likelihood': (
            'High. Exploitation requires only a valid low-privilege account and the '
            'knowledge of the restricted functionality\'s location.'
        ),
        'recommendations': (
            '1. Implement server-side role-based access control (RBAC) for every restricted endpoint.\n'
            '2. Never rely solely on client-side controls (hidden UI elements, disabled buttons).\n'
            '3. Validate the user\'s role and permissions on the server for every request.\n'
            '4. Centralise authorisation logic to avoid inconsistencies.\n'
            '5. Apply the principle of least privilege to all role definitions.'
        ),
        'references': 'https://owasp.org/Top10/A01_2021-Broken_Access_Control/\nhttps://cwe.mitre.org/data/definitions/269.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H',
        'av': 'N', 'ac': 'L', 'pr': 'L', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    {
        'title': 'Sensitive Data Exposure — PII in API Response',
        'category': 'ACCESS',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-359',
        'tags': ['data-exposure', 'pii', 'api', 'privacy', 'owasp-a02'],
        'description': (
            'The application returns sensitive personally identifiable information (PII) '
            'or other sensitive data in API responses that is not required by the '
            'consuming client, violating data minimisation principles.'
        ),
        'details': (
            'The following sensitive fields were identified in API responses that are '
            'not necessary for the requesting feature:\n\n'
            '[FIELD LIST] (e.g. full_ssn, date_of_birth, full_credit_card, password_hash)\n\n'
            'Affected endpoint(s): [ENDPOINTS]'
        ),
        'impact': (
            'Exposure of unnecessary sensitive data increases the impact of other '
            'vulnerabilities (XSS, IDOR, Man-in-the-Middle) and may result in privacy '
            'breaches, regulatory non-compliance (Privacy Act, GDPR), and reputational damage.'
        ),
        'likelihood': (
            'Low in isolation. However, combined with any data access vulnerability '
            'or application compromise, this data is immediately at risk.'
        ),
        'recommendations': (
            '1. Apply data minimisation — return only the fields required by each endpoint\'s specific function.\n'
            '2. Use serialiser schemas or DTOs to explicitly define which fields are included in responses.\n'
            '3. Mask or truncate sensitive fields where partial display is needed (e.g. last 4 digits of card).\n'
            '4. Audit all API endpoints for excessive data exposure.'
        ),
        'references': 'https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/\nhttps://cwe.mitre.org/data/definitions/359.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'L', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'N', 'a': 'N',
    },
    # ── MISCONFIGURATION ─────────────────────────────────────────────────────
    {
        'title': 'Debug Mode Enabled in Production',
        'category': 'CONFIG',
        'default_severity': 'MEDIUM',
        'cwe_id': 'CWE-94',
        'tags': ['debug-mode', 'misconfiguration', 'information-disclosure'],
        'description': (
            'The application is running with debug mode enabled in a production environment. '
            'Debug mode exposes detailed error information, application internals, and '
            'interactive debugging capabilities that should not be available in production.'
        ),
        'details': (
            'Indicators of debug mode were identified including:\n\n'
            '- Detailed stack traces returned in HTTP responses\n'
            '- Interactive debugger accessible via error pages\n'
            '- Debug-specific endpoints or panels accessible\n\n'
            'Framework identified: [FRAMEWORK]\n'
            'Affected URL: [URL]'
        ),
        'impact': (
            'Debug mode may expose application source code, internal variables, '
            'configuration values, database queries, and secret keys. Interactive '
            'debuggers (e.g. Werkzeug debugger) can allow remote code execution '
            'via the debug console.'
        ),
        'likelihood': (
            'Medium. Debug endpoints may not be immediately obvious but can be '
            'discovered through enumeration or by triggering application errors.'
        ),
        'recommendations': (
            '1. Set DEBUG=False (or equivalent) in all production configurations.\n'
            '2. Use separate configuration files for development and production environments.\n'
            '3. Implement a CI/CD check to prevent deployment with debug mode enabled.\n'
            '4. Configure generic error pages for production.\n'
            '5. Ensure debug endpoints (e.g. /console, /_debug) are not accessible in production.'
        ),
        'references': 'https://cwe.mitre.org/data/definitions/94.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'L', 'a': 'N',
    },
    {
        'title': 'Missing Patch Management — Critical Vulnerabilities',
        'category': 'CONFIG',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-1104',
        'tags': ['patch-management', 'vulnerabilities', 'outdated-software', 'cve'],
        'description': (
            'Critical or high-severity security patches have not been applied to one '
            'or more systems within an acceptable timeframe, leaving them vulnerable '
            'to publicly known exploits.'
        ),
        'details': (
            'The following systems have outstanding critical or high severity patches:\n\n'
            '[SYSTEM / CVE / CVSS SCORE / PATCH AVAILABLE SINCE]\n\n'
            'Patches include fixes for publicly known vulnerabilities with available '
            'exploit code. The time since patch release significantly exceeds the '
            'organisation\'s expected patching SLA.'
        ),
        'impact': (
            'Publicly known exploits for these vulnerabilities are freely available. '
            'An attacker can exploit the vulnerabilities to achieve the impact '
            'described in each CVE, potentially including remote code execution, '
            'privilege escalation, or denial of service.'
        ),
        'likelihood': (
            'High. Publicly known vulnerabilities with available exploit code are '
            'actively targeted by both opportunistic and targeted threat actors.'
        ),
        'recommendations': (
            '1. Apply all critical and high severity patches within your patching SLA (recommended: 48 hours for critical, 2 weeks for high).\n'
            '2. Implement automated patch management tooling.\n'
            '3. Maintain a current asset inventory and vulnerability scan schedule.\n'
            '4. Prioritise patching based on CVSS score and asset criticality.\n'
            '5. Implement virtual patching (WAF/IPS rules) for critical vulnerabilities where emergency patching is not possible.'
        ),
        'references': 'https://www.cyber.gov.au/resources-business-and-government/essential-cyber-security/essential-eight/patch-applications',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    # ── INFORMATIONAL ─────────────────────────────────────────────────────────
    {
        'title': 'Software Version Disclosure',
        'category': 'CONFIG',
        'default_severity': 'INFORMATIONAL',
        'cwe_id': 'CWE-200',
        'tags': ['version-disclosure', 'information-disclosure', 'fingerprinting', 'banner'],
        'description': (
            'The application or server discloses detailed software version information '
            'in HTTP response headers or body. This assists an attacker in identifying '
            'the exact software version and researching associated known vulnerabilities.'
        ),
        'details': (
            'The following version information was identified in HTTP responses:\n\n'
            '[HEADER NAME]: [VALUE]\n\n'
            'Common examples include Server, X-Powered-By, X-AspNet-Version, '
            'and X-Generator headers.'
        ),
        'impact': (
            'Version disclosure assists attackers in identifying specific CVEs applicable '
            'to the disclosed software version, making reconnaissance more efficient. '
            'On its own the impact is low, but it facilitates more targeted attacks.'
        ),
        'likelihood': (
            'Low. This is an informational finding that assists further attack stages '
            'rather than being directly exploitable.'
        ),
        'recommendations': (
            '1. Remove or suppress server and technology version headers (Server, X-Powered-By, etc.).\n'
            '2. Configure the web server to suppress version information in error pages.\n'
            '3. For Apache: set ServerTokens Prod and ServerSignature Off.\n'
            '4. For Nginx: set server_tokens off.\n'
            '5. Remove or suppress application framework headers.'
        ),
        'references': 'https://cwe.mitre.org/data/definitions/200.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'L', 'i': 'N', 'a': 'N',
    },
    {
        'title': 'Unencrypted Sensitive Data in Transit (HTTP)',
        'category': 'ENCRYPTION',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-319',
        'tags': ['http', 'cleartext', 'encryption', 'tls', 'mitm'],
        'description': (
            'The application transmits sensitive data (including credentials or session '
            'tokens) over unencrypted HTTP connections, making it susceptible to '
            'interception by network-level adversaries.'
        ),
        'details': (
            'The application is accessible and functional over plain HTTP without '
            'redirection to HTTPS. Sensitive operations including authentication '
            'were observed taking place over HTTP:\n\n'
            'Affected URL(s): [URLs]\n\n'
            'HTTP Strict Transport Security (HSTS) is not implemented, allowing '
            'SSL stripping attacks to silently downgrade HTTPS connections to HTTP.'
        ),
        'impact': (
            'An attacker with a network-level position (LAN, rogue WiFi access point, '
            'or network device) can intercept all data in transit including credentials, '
            'session tokens, and sensitive application data. Session hijacking is trivial '
            'once a token is captured.'
        ),
        'likelihood': (
            'Medium. Requires network access to the path between client and server, '
            'which is more feasible on local networks or public WiFi.'
        ),
        'recommendations': (
            '1. Enforce HTTPS for all application URLs.\n'
            '2. Implement HTTP to HTTPS redirects (301) for all HTTP requests.\n'
            '3. Enable HSTS with a long max-age (minimum 1 year) and include subdomains.\n'
            '4. Submit the domain to the HSTS preload list.\n'
            '5. Configure TLS with a valid certificate from a trusted CA.'
        ),
        'references': 'https://owasp.org/www-community/vulnerabilities/Cleartext_Transmission_of_Sensitive_Information\nhttps://cwe.mitre.org/data/definitions/319.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N',
        'av': 'N', 'ac': 'H', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'N',
    },
    {
        'title': 'Subdomain Takeover',
        'category': 'CONFIG',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-923',
        'tags': ['subdomain-takeover', 'dns', 'cloud', 'dangling-record'],
        'description': (
            'A DNS record points to an external service that is no longer claimed or '
            'provisioned by the organisation, allowing an attacker to claim the service '
            'and serve malicious content under the trusted subdomain.'
        ),
        'details': (
            'The following subdomain(s) have dangling DNS records pointing to unclaimed '
            'external services:\n\n'
            'Subdomain: [SUBDOMAIN]\n'
            'DNS Record: [CNAME/A RECORD VALUE]\n'
            'Service: [e.g. GitHub Pages, Heroku, Azure, S3]\n\n'
            'The target of the record is not currently registered or provisioned, '
            'meaning an attacker can claim the service and host content at the subdomain.'
        ),
        'impact': (
            'An attacker who claims the external service can serve arbitrary content '
            'under the trusted subdomain, bypassing browser security policies. This '
            'enables cookie theft (if cookies are scoped to the parent domain), '
            'phishing, and circumvention of CSP controls.'
        ),
        'likelihood': (
            'Medium. Requires the attacker to identify and claim the specific unclaimed '
            'service, which is straightforward once the dangling record is identified.'
        ),
        'recommendations': (
            '1. Remove DNS records for any services that are no longer active.\n'
            '2. Implement a process to audit DNS records when decommissioning external services.\n'
            '3. Claim the associated external service immediately if active use is still required.\n'
            '4. Regularly scan all DNS records for dangling references.'
        ),
        'references': 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/10-Test_for_Subdomain_Takeover\nhttps://cwe.mitre.org/data/definitions/923.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'R', 's': 'C', 'c': 'H', 'i': 'H', 'a': 'N',
    },
    {
        'title': 'Broken Object Level Authorisation (BOLA) — API',
        'category': 'API',
        'default_severity': 'HIGH',
        'cwe_id': 'CWE-639',
        'tags': ['bola', 'idor', 'api', 'authorisation', 'owasp-api1'],
        'description': (
            'The API does not properly verify that the authenticated user is authorised '
            'to access the requested object. An attacker can access or modify objects '
            'belonging to other users by manipulating identifiers in API requests.'
        ),
        'details': (
            'Testing confirmed that by modifying object identifiers in API requests, '
            'data belonging to other users can be accessed:\n\n'
            'Affected endpoint(s): [ENDPOINTS]\n'
            'Manipulated parameter(s): [PARAMETERS]\n\n'
            'For example, changing the user_id or record_id in a GET request returns '
            'data belonging to the specified object regardless of the requesting user\'s '
            'ownership.'
        ),
        'impact': (
            'Every object in the system is potentially accessible to any authenticated '
            'user. Depending on the data model, this may expose PII, financial records, '
            'private communications, or business-critical information of all users.'
        ),
        'likelihood': (
            'High. This is the most prevalent API vulnerability class and is trivially '
            'exploited by modifying identifiers in requests.'
        ),
        'recommendations': (
            '1. Implement authorisation checks for every API endpoint that accesses an object, '
            'verifying the authenticated user owns or is permitted to access the specific object.\n'
            '2. Use non-guessable object identifiers (UUIDs) to reduce automated enumeration.\n'
            '3. Centralise authorisation logic to avoid inconsistencies across endpoints.\n'
            '4. Conduct thorough API authorisation testing as part of all code reviews.'
        ),
        'references': 'https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/\nhttps://cwe.mitre.org/data/definitions/639.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'L', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'N',
    },
    {
        'title': 'JWT Algorithm Confusion / None Algorithm',
        'category': 'AUTH',
        'default_severity': 'CRITICAL',
        'cwe_id': 'CWE-347',
        'tags': ['jwt', 'authentication', 'algorithm-confusion', 'token-forgery'],
        'description': (
            'The application is vulnerable to JWT (JSON Web Token) algorithm confusion '
            'or accepts tokens signed with the "none" algorithm, allowing an attacker '
            'to forge arbitrary tokens without knowing the signing secret.'
        ),
        'details': (
            'The following JWT vulnerability was identified:\n\n'
            '[ ] The application accepts JWTs with alg: "none" (no signature required)\n'
            '[ ] The application is vulnerable to RS256 to HS256 algorithm confusion '
            '(signing with the public key as an HMAC secret)\n\n'
            'Testing confirmed forged tokens were accepted by the application:\n'
            'Forged token payload: [PAYLOAD EXAMPLE]'
        ),
        'impact': (
            'An attacker can forge JWT tokens containing arbitrary claims, including '
            'elevated roles, different user identities, or administrative flags, '
            'resulting in complete authentication and authorisation bypass.'
        ),
        'likelihood': (
            'High. The forged token construction is straightforward with publicly '
            'available tools and documentation.'
        ),
        'recommendations': (
            '1. Explicitly specify the expected algorithm(s) and reject tokens with any other algorithm.\n'
            '2. Reject tokens with alg: "none".\n'
            '3. Use a well-maintained JWT library that handles algorithm restrictions correctly.\n'
            '4. Validate the "alg" header before attempting verification.\n'
            '5. Use asymmetric keys (RS256/ES256) and ensure the public key cannot be confused for an HMAC secret.'
        ),
        'references': 'https://portswigger.net/web-security/jwt/algorithm-confusion\nhttps://cwe.mitre.org/data/definitions/347.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'H', 'i': 'H', 'a': 'H',
    },
    {
        'title': 'Business Logic Flaw',
        'category': 'WEB',
        'default_severity': 'MEDIUM',
        'cwe_id': 'CWE-840',
        'tags': ['business-logic', 'logic-flaw', 'workflow-bypass'],
        'description': (
            'A business logic vulnerability was identified that allows an attacker to '
            'manipulate application functionality in unintended ways that violate the '
            'intended business rules.'
        ),
        'details': (
            'Description of the business logic flaw:\n\n'
            '[DETAILED DESCRIPTION OF THE FLAW]\n\n'
            'Steps to reproduce:\n'
            '1. [STEP 1]\n'
            '2. [STEP 2]\n'
            '3. [STEP 3]\n\n'
            'Affected functionality: [FUNCTIONALITY]'
        ),
        'impact': (
            '[DESCRIBE SPECIFIC BUSINESS IMPACT — e.g. negative cart prices, '
            'discount abuse, order status bypass, skipping verification steps, '
            'accessing paid features without payment]'
        ),
        'likelihood': (
            'Medium. Exploitation requires understanding of the application\'s '
            'intended workflow and deliberate manipulation of the process.'
        ),
        'recommendations': (
            '1. Enforce business rules server-side at every step of the workflow.\n'
            '2. Never rely on client-side controls or hidden fields to enforce business logic.\n'
            '3. Implement state machine validation to ensure workflows progress in the correct order.\n'
            '4. Add anomaly detection for unusual sequences of actions.\n'
            '5. Conduct business logic testing as part of the security testing lifecycle.'
        ),
        'references': 'https://owasp.org/www-community/vulnerabilities/Business_logic_vulnerability\nhttps://cwe.mitre.org/data/definitions/840.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:H/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'L', 'ui': 'N', 's': 'U', 'c': 'L', 'i': 'H', 'a': 'N',
    },
    {
        'title': 'Inadequate Logging and Monitoring',
        'category': 'LOGGING',
        'default_severity': 'MEDIUM',
        'cwe_id': 'CWE-778',
        'tags': ['logging', 'monitoring', 'detection', 'owasp-a09'],
        'description': (
            'The application has insufficient logging and monitoring controls, limiting '
            'the ability to detect, investigate, and respond to security incidents. '
            'Key security events are not logged or alerts are not generated.'
        ),
        'details': (
            'The following security-relevant events were found to be insufficiently logged:\n\n'
            '[ ] Failed authentication attempts\n'
            '[ ] Successful authentication events\n'
            '[ ] Privilege escalation events\n'
            '[ ] Access to sensitive data or functions\n'
            '[ ] Security configuration changes\n'
            '[ ] Application errors and exceptions\n\n'
            'Log retention period: [PERIOD] (recommended minimum: 12 months)\n'
            'Centralised log management: [YES/NO]\n'
            'Security alerting in place: [YES/NO]'
        ),
        'impact': (
            'Without adequate logging and monitoring, security incidents may go '
            'undetected for extended periods, allowing attackers to achieve their '
            'objectives without triggering any response. Post-incident forensics '
            'is also severely hampered.'
        ),
        'likelihood': (
            'N/A — this is a control deficiency rather than a directly exploitable '
            'vulnerability. Its impact is realised through other vulnerabilities going '
            'undetected.'
        ),
        'recommendations': (
            '1. Log all authentication events (success and failure) including source IP and timestamp.\n'
            '2. Log access to sensitive functionality, data changes, and privilege changes.\n'
            '3. Centralise logs in a SIEM and implement alerting for suspicious patterns.\n'
            '4. Retain security logs for a minimum of 12 months.\n'
            '5. Protect logs from tampering (write-once storage, separate log server).\n'
            '6. Implement automated alerting for high-volume failed logins, impossible travel, and anomalous access patterns.'
        ),
        'references': 'https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/\nhttps://cwe.mitre.org/data/definitions/778.html',
        'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N',
        'av': 'N', 'ac': 'L', 'pr': 'N', 'ui': 'N', 's': 'U', 'c': 'N', 'i': 'L', 'a': 'N',
    },
]


class Command(BaseCommand):
    help = 'Seed the finding repository with global pentest finding templates.'

    def handle(self, *args, **options):
        # Create or retrieve all global folders
        folder_objs = {}
        for name, attrs in FOLDERS.items():
            folder, _ = RepositoryFolder.objects.get_or_create(
                name=name,
                organization=None,
                defaults={
                    'color': attrs['color'],
                    'description': attrs['description'],
                    'created_by': None,
                },
            )
            folder_objs[name] = folder
        self.stdout.write(f'Folders ready: {len(folder_objs)}')

        created = 0
        updated = 0

        for data in FINDINGS:
            folder_name = FINDING_FOLDER_MAP.get((data['title'], data['category']))
            folder = folder_objs.get(folder_name) if folder_name else None

            obj, was_created = FindingTemplate.objects.update_or_create(
                title=data['title'],
                category=data['category'],
                defaults={
                    'is_global': True,
                    'organization': None,
                    'folder': folder,
                    'description': data.get('description', ''),
                    'details': data.get('details', ''),
                    'impact': data.get('impact', ''),
                    'likelihood': data.get('likelihood', ''),
                    'recommendations': data.get('recommendations', ''),
                    'supporting_evidence': data.get('supporting_evidence', ''),
                    'default_severity': data['default_severity'],
                    'cwe_id': data.get('cwe_id', ''),
                    'references': data.get('references', ''),
                    'tags': data.get('tags', []),
                    'cvss_vector': data.get('cvss_vector', ''),
                    'av': data.get('av', ''),
                    'ac': data.get('ac', ''),
                    'pr': data.get('pr', ''),
                    'ui': data.get('ui', ''),
                    's':  data.get('s', ''),
                    'c':  data.get('c', ''),
                    'i':  data.get('i', ''),
                    'a':  data.get('a', ''),
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Done. {created} finding template(s) created, {updated} updated. '
                f'Total seeded: {len(FINDINGS)}.'
            )
        )

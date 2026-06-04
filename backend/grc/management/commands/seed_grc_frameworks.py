"""
Idempotent seed for GRC framework control data.
Source: NIST Cybersecurity Framework 2.0 (CSWP.29, Feb 2024)
        NIST SP 800-171 Rev 3 (May 2023)
        ISO/IEC 27001:2022
        SOC 2 Type II (AICPA Trust Services Criteria 2017)
        HIPAA Security Rule (45 CFR Part 164)
"""
from django.core.management.base import BaseCommand
from grc.models import GrcFramework, GrcFamily, GrcControl


class Command(BaseCommand):
    help = 'Seeds GRC framework control data (NIST CSF 2.0, NIST SP 800-171r3, ISO/IEC 27001:2022, SOC 2, HIPAA)'

    def handle(self, *args, **options):
        self._seed_nist_csf2()
        self._seed_nist_800171r3()
        self._seed_iso27001_2022()
        self._seed_soc2()
        self._seed_hipaa()
        self.stdout.write(self.style.SUCCESS('GRC frameworks seeded successfully.'))

    # ─────────────────────────────────────────────────────────────────────────
    # NIST CSF 2.0
    # ─────────────────────────────────────────────────────────────────────────
    def _seed_nist_csf2(self):
        fw, _ = GrcFramework.objects.update_or_create(
            key='NIST_CSF_2',
            defaults={
                'name':        'NIST Cybersecurity Framework 2.0',
                'version':     '2.0',
                'description': (
                    'The NIST Cybersecurity Framework 2.0 (CSF 2.0) provides guidance to industry, '
                    'government agencies, and other organizations to manage cybersecurity risks. '
                    'It offers a taxonomy of high-level cybersecurity outcomes through six Functions: '
                    'GOVERN, IDENTIFY, PROTECT, DETECT, RESPOND, and RECOVER.'
                ),
                'is_active':   True,
            }
        )
        self.stdout.write(f'  Framework: {fw.name}')

        # ── Function data: (identifier, name, description, order, categories)
        # Each category: (cat_id, cat_title, subcategories)
        # Each subcategory: (sub_id, sub_title, statement)
        FUNCTIONS = [
            (
                'GV', 'GOVERN',
                'The organization\'s cybersecurity risk management strategy, expectations, and policy are established, communicated, and monitored.',
                0,
                [
                    ('GV.OC', 'Organizational Context',
                     'The circumstances — mission, stakeholder expectations, dependencies — surrounding the organization\'s cybersecurity risk management decisions are understood.',
                     [
                         ('GV.OC-01', 'The organizational mission is understood and informs cybersecurity risk management.',
                          'Organizational leadership understands the mission and how cybersecurity risk decisions affect it. The mission statement and related strategic objectives are documented and used to guide risk management priorities.'),
                         ('GV.OC-02', 'Internal and external stakeholders are understood, and their needs and expectations regarding cybersecurity risk management are understood and considered.',
                          'Stakeholders include customers, suppliers, regulators, and partners. Their cybersecurity-related needs, expectations, and requirements are identified and inform risk decisions.'),
                         ('GV.OC-03', 'Legal, regulatory, contractual, and other cybersecurity risk considerations are understood.',
                          'The organization identifies applicable laws, regulations, and contractual obligations related to cybersecurity. This includes privacy requirements, sector-specific regulations, and international requirements.'),
                         ('GV.OC-04', 'Critical objectives, capabilities, and services that stakeholders depend on or expect from the organization are understood and communicated.',
                          'The organization identifies and documents which of its capabilities and services are most critical to stakeholders and ensures this understanding is communicated to those managing cybersecurity risks.'),
                         ('GV.OC-05', 'Outcomes, capabilities, and services that the organization depends on are understood and communicated.',
                          'The organization understands its dependencies on external providers and other entities. This includes critical supply chain relationships and any capabilities the organization relies on to achieve its mission.'),
                     ]),
                    ('GV.RM', 'Risk Management Strategy',
                     'The organization\'s priorities, constraints, risk tolerances and assumptions are established and used to support operational risk decisions.',
                     [
                         ('GV.RM-01', 'Risk management objectives are established and agreed to by organizational stakeholders.',
                          'Leadership defines and documents risk management objectives that align with the organizational mission and stakeholder needs. Objectives are reviewed and updated periodically.'),
                         ('GV.RM-02', 'Risk appetite and risk tolerance statements are established, communicated, and maintained.',
                          'The organization defines acceptable levels of risk (risk appetite) and acceptable variation from those levels (risk tolerance). These statements guide risk response decisions and are communicated to relevant staff.'),
                         ('GV.RM-03', 'Cybersecurity risk management activities and outcomes are included in enterprise risk management processes.',
                          'Cybersecurity risk is integrated into enterprise risk management (ERM) rather than managed in isolation. Cybersecurity risk outputs feed into organization-wide risk registers and reporting.'),
                         ('GV.RM-04', 'Strategic direction that describes appropriate risk response options is established and communicated.',
                          'Leadership establishes and communicates guidance on acceptable risk response strategies (accept, avoid, transfer, mitigate). This guidance helps staff make consistent risk decisions.'),
                         ('GV.RM-05', 'Lines of communication across the organization are established for cybersecurity risks, including risks from suppliers and other third parties.',
                          'Clear channels exist for reporting and escalating cybersecurity risks from all parts of the organization, including supply chain risks. Roles responsible for communicating risk information are defined.'),
                         ('GV.RM-06', 'A standardized method for calculating, documenting, categorizing, and prioritizing cybersecurity risks is established and communicated.',
                          'The organization uses a consistent methodology for risk assessment, including a standardized risk scoring or prioritization approach. This ensures comparable risk information across the organization.'),
                         ('GV.RM-07', 'Strategic opportunities (i.e., positive risks) are characterized and are included in organizational cybersecurity risk discussions.',
                          'Risk discussions include not only threats but also opportunities — situations where cybersecurity investments or capabilities could provide competitive or operational advantage. Positive risks are documented alongside threats.'),
                     ]),
                    ('GV.RR', 'Roles, Responsibilities, and Authorities',
                     'Cybersecurity roles, responsibilities, and authorities to foster accountability, performance assessment, and continuous improvement are established and communicated.',
                     [
                         ('GV.RR-01', 'Organizational leadership is responsible and accountable for cybersecurity risk and fosters a culture that is risk-aware, ethical, and continually improving.',
                          'Senior leaders (e.g., board, C-suite) take ownership of cybersecurity risk decisions. They model and reinforce a culture that values security, ethical behavior, and learning from incidents.'),
                         ('GV.RR-02', 'Roles, responsibilities, and authorities related to cybersecurity risk management are established, communicated, understood, and enforced.',
                          'Specific roles are documented with clear cybersecurity responsibilities. Authority levels and accountability mechanisms are defined and communicated to all relevant personnel.'),
                         ('GV.RR-03', 'Adequate resources are allocated commensurate with the cybersecurity risk strategy, roles, responsibilities, and policies.',
                          'Budgets, staff, tools, and time are allocated to support the cybersecurity program in proportion to the organization\'s risk profile and risk management objectives.'),
                         ('GV.RR-04', 'Cybersecurity is included in human resources practices.',
                          'Cybersecurity requirements are embedded in hiring, onboarding, performance management, and offboarding processes. Background checks, role-specific training requirements, and termination procedures address cybersecurity.'),
                     ]),
                    ('GV.PO', 'Policy',
                     'Organizational cybersecurity policy is established, communicated, and enforced.',
                     [
                         ('GV.PO-01', 'Policy for managing cybersecurity risks is established based on organizational context, cybersecurity strategy, and priorities and is communicated and enforced.',
                          'A formal cybersecurity policy exists that reflects the organization\'s mission, risk appetite, and regulatory context. The policy is approved by leadership, distributed to staff, and enforced through technical and administrative controls.'),
                         ('GV.PO-02', 'Policy for managing cybersecurity risks is reviewed, updated, communicated, and enforced to reflect changes in requirements, threats, technology, and organizational mission.',
                          'Cybersecurity policy is maintained as a living document. A defined review cycle exists, and policies are updated when significant changes occur in threats, technology, regulations, or organizational mission.'),
                     ]),
                    ('GV.OV', 'Oversight',
                     'Results of organization-wide cybersecurity risk management activities and performance are used to inform, improve, and adjust the risk management strategy.',
                     [
                         ('GV.OV-01', 'Cybersecurity risk management strategy outcomes are reviewed to inform and adjust strategy and direction.',
                          'Leadership regularly reviews the effectiveness of the cybersecurity risk management strategy. Insights from risk assessments, incidents, and audits are used to refine strategic direction.'),
                         ('GV.OV-02', 'The cybersecurity risk management strategy is reviewed and adjusted to ensure coverage of organizational requirements and risks.',
                          'The strategy is assessed against current threats, regulatory changes, and organizational evolution. Gaps are identified and addressed to ensure comprehensive risk coverage.'),
                         ('GV.OV-03', 'Organizational cybersecurity risk management performance is evaluated and reviewed for adjustments needed.',
                          'Cybersecurity performance metrics and KPIs are tracked and reviewed by leadership. Results trigger adjustments to programs, policies, or resource allocations as needed.'),
                     ]),
                    ('GV.SC', 'Cybersecurity Supply Chain Risk Management',
                     'Cyber supply chain risk management processes are identified, established, managed, monitored, and improved by organizational stakeholders.',
                     [
                         ('GV.SC-01', 'A cybersecurity supply chain risk management program, strategy, objectives, policies, and processes are established and agreed to by organizational stakeholders.',
                          'A formal C-SCRM program is documented and endorsed by leadership. It includes defined objectives, policies, and processes for managing cybersecurity risks introduced by suppliers and third parties.'),
                         ('GV.SC-02', 'Cybersecurity roles and responsibilities for suppliers, customers, and partners are established, communicated, and coordinated internally and externally.',
                          'Clear responsibilities for managing supply chain cybersecurity risks are assigned. These responsibilities are communicated both within the organization and to relevant external parties.'),
                         ('GV.SC-03', 'Cybersecurity supply chain risk management is integrated into cybersecurity and enterprise risk management, risk assessment, and improvement processes.',
                          'Supply chain risk is not managed in isolation. It is incorporated into the organization\'s broader risk management, risk assessment, and continuous improvement processes.'),
                         ('GV.SC-04', 'Suppliers are known and prioritized by criticality.',
                          'An inventory of suppliers exists, and suppliers are tiered or prioritized based on the criticality of their products/services to the organization\'s mission and the potential cybersecurity impact of a compromise.'),
                         ('GV.SC-05', 'Requirements to address cybersecurity risks in supply chains are established, prioritized, and integrated into contracts and other types of agreements with suppliers and other relevant third parties.',
                          'Cybersecurity requirements (e.g., security controls, incident notification, right to audit) are included in supplier contracts and SLAs. Requirements are proportionate to the criticality of the supplier relationship.'),
                         ('GV.SC-06', 'Planning and due diligence are performed to reduce risks before entering into formal supplier or other third-party relationships.',
                          'A pre-engagement assessment process evaluates potential suppliers for cybersecurity posture before contracts are signed. This may include questionnaires, certifications review, or third-party assessments.'),
                         ('GV.SC-07', 'The risks posed by a supplier, their products and services, and other third parties are understood, recorded, prioritized, assessed, responded to, and monitored over the course of the relationship.',
                          'Supply chain risks are tracked in a risk register and actively managed throughout the supplier relationship lifecycle. Changes in supplier risk posture trigger reassessment.'),
                         ('GV.SC-08', 'Relevant suppliers and other third parties are included in incident planning, response, and recovery activities.',
                          'Incident response plans account for scenarios involving suppliers. Suppliers are notified of their roles and responsibilities in the event of a cybersecurity incident affecting the supply chain.'),
                         ('GV.SC-09', 'Supply chain security practices are integrated into cybersecurity and enterprise risk management programs, and their performance is monitored throughout the technology product and service life cycle.',
                          'Security is considered across the full technology lifecycle from design and development through deployment and decommissioning. Supplier security practices are monitored on an ongoing basis.'),
                         ('GV.SC-10', 'Cybersecurity supply chain risk management plans include provisions for activities that occur after the conclusion of a partnership or service agreement.',
                          'Off-boarding processes for suppliers address cybersecurity concerns such as data return/destruction, access revocation, and knowledge transfer. Plans cover transition and post-relationship security obligations.'),
                     ]),
                ]
            ),
            (
                'ID', 'IDENTIFY',
                'The organization\'s current cybersecurity risks are understood.',
                1,
                [
                    ('ID.AM', 'Asset Management',
                     'Assets (data, hardware, software, systems, facilities, services, people) that enable the organization to achieve business purposes are identified and managed consistent with their relative importance to organizational objectives and the organization\'s risk strategy.',
                     [
                         ('ID.AM-01', 'Inventories of hardware managed by the organization are maintained.',
                          'A complete and accurate inventory of hardware assets is maintained. This includes endpoints, servers, network devices, IoT, and OT equipment. The inventory is kept current and reviewed periodically.'),
                         ('ID.AM-02', 'Inventories of software, services, and systems managed by the organization are maintained.',
                          'A complete inventory of software applications, cloud services, and systems is maintained. Shadow IT and unauthorized software are identified and addressed. The inventory supports vulnerability management.'),
                         ('ID.AM-03', 'Representations of the organization\'s authorized network communication and internal and external network data flows are maintained.',
                          'Network diagrams and data flow maps document how data moves within and outside the organization. These representations are kept current and used to identify unauthorized communication.'),
                         ('ID.AM-04', 'Inventories of services provided by suppliers are maintained.',
                          'The organization maintains an accurate list of external services it consumes, including cloud services, managed services, and SaaS applications. The inventory captures criticality and data handling characteristics.'),
                         ('ID.AM-05', 'Assets are prioritized based on classification, criticality, resources, and impact on the mission.',
                          'Assets are classified and prioritized based on their importance to the organization\'s mission. High-priority assets receive greater protection and monitoring attention. Classification drives security control selection.'),
                         ('ID.AM-07', 'Inventories of data and corresponding metadata for designated data types are maintained.',
                          'The organization identifies and inventories significant data types (e.g., PII, CUI, financial data, IP). Metadata about data classification, location, owners, and handling requirements is maintained.'),
                         ('ID.AM-08', 'Systems, hardware, software, services, and data are managed throughout their life cycles.',
                          'Lifecycle management processes address the full lifecycle from acquisition/creation through decommissioning/destruction. Security considerations are embedded at each lifecycle stage.'),
                     ]),
                    ('ID.RA', 'Risk Assessment',
                     'The cybersecurity risk to the organization, assets, and individuals is understood by the organization.',
                     [
                         ('ID.RA-01', 'Vulnerabilities in assets are identified, validated, and recorded.',
                          'Vulnerability scanning, penetration testing, and other assessment methods are used to identify weaknesses in assets. Findings are validated to reduce false positives and recorded in a tracking system.'),
                         ('ID.RA-02', 'Cyber threat intelligence is received from information sharing forums and sources.',
                          'The organization subscribes to and actively consumes threat intelligence from ISACs, government advisories (e.g., CISA), commercial feeds, or open-source sources. Intelligence is used to inform risk decisions.'),
                         ('ID.RA-03', 'Internal and external threats to the organization are identified and recorded.',
                          'Threat modeling is performed to identify realistic threat actors and their likely tactics, techniques, and procedures (TTPs). Both insider threats and external adversaries are considered.'),
                         ('ID.RA-04', 'Potential impacts and likelihoods of threats exploiting vulnerabilities are identified and recorded.',
                          'For identified threats and vulnerabilities, the organization estimates the likelihood of exploitation and the potential impact on the organization. This informs risk prioritization.'),
                         ('ID.RA-05', 'Threats, vulnerabilities, likelihoods, and impacts are used to understand inherent risk and inform risk response prioritization.',
                          'Risk analysis outputs are used to calculate inherent risk scores that help the organization prioritize which risks to address first and which response strategies to employ.'),
                         ('ID.RA-06', 'Risk responses are chosen, prioritized, planned, tracked, and communicated.',
                          'For each identified risk, a response strategy (accept, mitigate, transfer, avoid) is selected. Response plans are documented, tracked to completion, and communicated to relevant stakeholders.'),
                         ('ID.RA-07', 'Changes and exceptions are managed, assessed for risk impact, recorded, and tracked.',
                          'A change management process exists that requires risk assessment for significant changes to systems, processes, or environments. Exceptions to security policies are formally approved and tracked.'),
                         ('ID.RA-08', 'Processes for receiving, analyzing, and responding to vulnerability disclosures are established.',
                          'A vulnerability disclosure program (VDP) exists, or the organization participates in coordinated vulnerability disclosure processes. Reported vulnerabilities are triaged, assessed, and remediated.'),
                         ('ID.RA-09', 'The authenticity and integrity of hardware and software are assessed prior to acquisition and use.',
                          'Counterfeit and tampered hardware and software are actively screened. The organization verifies that acquired components come from legitimate sources and have not been compromised in the supply chain.'),
                         ('ID.RA-10', 'Critical suppliers are assessed prior to acquisition.',
                          'Before engaging critical suppliers, a cybersecurity assessment is conducted. This may include security questionnaires, review of certifications (e.g., SOC 2, ISO 27001), or third-party audits.'),
                     ]),
                    ('ID.IM', 'Improvement',
                     'Improvements to organizational cybersecurity risk management processes, procedures and activities are identified across all CSF Functions.',
                     [
                         ('ID.IM-01', 'Improvements are identified from evaluations.',
                          'Formal evaluations such as audits, assessments, maturity reviews, and tabletop exercises identify opportunities to improve cybersecurity practices. Findings are tracked and addressed.'),
                         ('ID.IM-02', 'Improvements are identified from security tests and exercises, including those done in coordination with suppliers and relevant third parties.',
                          'Penetration tests, red team exercises, and incident response drills generate lessons learned that drive program improvements. Results from third-party testing are incorporated.'),
                         ('ID.IM-03', 'Improvements are identified from execution of operational processes, procedures, and activities.',
                          'Day-to-day security operations surface improvement opportunities. Staff are encouraged to report process inefficiencies or gaps. After-action reviews are conducted for security events.'),
                         ('ID.IM-04', 'Incident response plans and other cybersecurity plans that affect operations are established, communicated, maintained, and improved.',
                          'Incident response, business continuity, and disaster recovery plans are documented, tested, and kept current. Lessons learned from incidents and exercises are incorporated into plan updates.'),
                     ]),
                ]
            ),
            (
                'PR', 'PROTECT',
                'Safeguards to manage the organization\'s cybersecurity risks are used.',
                2,
                [
                    ('PR.AA', 'Identity Management, Authentication, and Access Control',
                     'Access to physical and logical assets is limited to authorized users, services, and hardware and managed commensurate with the assessed risk of unauthorized access.',
                     [
                         ('PR.AA-01', 'Identities and credentials for authorized users, services, and hardware are managed by the organization.',
                          'A centralized identity management system maintains authoritative records of users, service accounts, and device identities. Provisioning and de-provisioning processes are defined and enforced.'),
                         ('PR.AA-02', 'Identities are proofed and bound to credentials based on the context of interactions.',
                          'Identity proofing verifies that users are who they claim to be before credentials are issued. Proofing requirements are commensurate with the sensitivity of the resources being accessed.'),
                         ('PR.AA-03', 'Users, services, and hardware are authenticated.',
                          'Authentication mechanisms are implemented for all users, services, and hardware attempting to access organizational resources. Authentication strength is appropriate to the sensitivity of the resource.'),
                         ('PR.AA-04', 'Identity assertions are protected, conveyed, and verified.',
                          'Tokens, certificates, and other identity assertions are protected against tampering and replay. Verification mechanisms ensure that assertions originate from trusted identity providers.'),
                         ('PR.AA-05', 'Access permissions, entitlements, and authorizations are defined in a policy, managed, enforced, and reviewed, and incorporate the principles of least privilege and separation of duties.',
                          'Access control policies define who can access what resources and under what conditions. Least-privilege principles limit access to the minimum needed. Access rights are reviewed periodically and adjusted as roles change.'),
                         ('PR.AA-06', 'Physical access to assets is managed, monitored, and enforced commensurate with risk.',
                          'Physical security controls (badges, biometrics, visitor logs, security cameras) protect physical access to facilities, equipment, and data centers. Access logs are reviewed for anomalies.'),
                     ]),
                    ('PR.AT', 'Awareness and Training',
                     'The organization\'s personnel are provided with cybersecurity awareness and training so that they can perform their cybersecurity-related tasks.',
                     [
                         ('PR.AT-01', 'Personnel are provided with awareness and training so that they possess the knowledge and skills to perform general tasks with cybersecurity risks in mind.',
                          'All staff receive security awareness training covering phishing, password hygiene, data handling, and reporting suspicious activity. Training is completed at onboarding and refreshed annually.'),
                         ('PR.AT-02', 'Individuals in specialized roles are provided with awareness and training so that they possess the knowledge and skills to perform relevant tasks with cybersecurity risks in mind.',
                          'Security practitioners, system administrators, developers, and other specialized roles receive role-specific training. This includes certifications, technical training, and updates on emerging threats relevant to their duties.'),
                     ]),
                    ('PR.DS', 'Data Security',
                     'Data are managed consistent with the organization\'s risk strategy to protect the confidentiality, integrity, and availability of information.',
                     [
                         ('PR.DS-01', 'The confidentiality, integrity, and availability of data-at-rest are protected.',
                          'Encryption, access controls, and integrity monitoring protect stored data. Sensitive data is encrypted using approved algorithms. Storage media is protected from unauthorized physical and logical access.'),
                         ('PR.DS-02', 'The confidentiality, integrity, and availability of data-in-transit are protected.',
                          'Network communications carrying sensitive data are encrypted using TLS or other approved protocols. Unencrypted transmission of sensitive data over untrusted networks is prohibited.'),
                         ('PR.DS-10', 'The confidentiality, integrity, and availability of data-in-use are protected.',
                          'Controls protect data while it is being processed. This includes memory protection, secure enclaves, and controls to prevent data leakage through volatile storage or processing artifacts.'),
                         ('PR.DS-11', 'Backups of data are created, protected, maintained, and tested.',
                          'Data backups are performed according to a defined schedule. Backup copies are protected (encrypted, stored offsite or in an isolated environment) and regularly tested to verify recovery capability.'),
                     ]),
                    ('PR.PS', 'Platform Security',
                     'The hardware, software (e.g., firmware, operating systems, applications), and services of physical and virtual platforms are managed consistent with the organization\'s risk strategy to protect their confidentiality, integrity, and availability.',
                     [
                         ('PR.PS-01', 'Configuration management practices are established and applied.',
                          'Secure baseline configurations are defined and applied to all platforms. Configuration management processes track approved configurations and detect unauthorized changes.'),
                         ('PR.PS-02', 'Software is maintained, replaced, and removed commensurate with risk.',
                          'Software assets are kept current with security patches. End-of-life software that cannot be patched is isolated or replaced. An exception process exists for cases where patching is not immediately possible.'),
                         ('PR.PS-03', 'Hardware is maintained, replaced, and removed commensurate with risk.',
                          'Hardware is kept under active maintenance contracts. End-of-life hardware that no longer receives security support is replaced. Decommissioned hardware is securely sanitized.'),
                         ('PR.PS-04', 'Log records are generated and made available for continuous monitoring.',
                          'Systems are configured to generate security-relevant logs. Logs are forwarded to a centralized repository (e.g., SIEM) and retained for a defined period to support detection, investigation, and compliance.'),
                         ('PR.PS-05', 'Installation and execution of unauthorized software are prevented.',
                          'Application allowlisting or similar controls prevent execution of unauthorized software. Privileged users cannot install unapproved software without an exception process.'),
                         ('PR.PS-06', 'Secure software development practices are integrated, and their security is evaluated.',
                          'Software development follows a secure SDLC. Security requirements are defined, threat modeling is performed, code is reviewed for security flaws, and security testing is integrated into the pipeline.'),
                     ]),
                    ('PR.IR', 'Technology Infrastructure Resilience',
                     'Security architectures are managed with the organization\'s risk strategy to protect asset confidentiality, integrity, and availability, and organizational resilience.',
                     [
                         ('PR.IR-01', 'Networks and environments are protected from unauthorized logical access and usage.',
                          'Network segmentation, firewalls, and access controls limit lateral movement and unauthorized access. Zero-trust principles are applied where feasible. Remote access is controlled and monitored.'),
                         ('PR.IR-02', 'The organization\'s technology assets are protected from environmental threats.',
                          'Physical and environmental controls protect technology assets from power outages, flooding, fire, and extreme temperatures. Redundant power, cooling, and environmental monitoring are in place for critical facilities.'),
                         ('PR.IR-03', 'Mechanisms are implemented to achieve resilience requirements in normal and adverse situations.',
                          'High availability configurations, redundancy, and failover capabilities ensure continuity of critical services. Resilience requirements are defined and validated through testing.'),
                         ('PR.IR-04', 'Adequate resource capacity to ensure availability is maintained.',
                          'Capacity planning processes ensure that computational, storage, and network resources are sufficient to meet demand under normal and anticipated peak conditions, including during security events.'),
                     ]),
                ]
            ),
            (
                'DE', 'DETECT',
                'Possible cybersecurity attacks and compromises are found and analyzed.',
                3,
                [
                    ('DE.CM', 'Continuous Monitoring',
                     'Assets are monitored to find anomalies, indicators of compromise, and other potentially adverse events.',
                     [
                         ('DE.CM-01', 'Networks and network services are monitored to find potentially adverse events.',
                          'Network traffic is monitored using IDS/IPS, NDR, and other tools to detect anomalies, known-bad indicators, and suspicious patterns. Monitoring covers internal networks and perimeter traffic.'),
                         ('DE.CM-02', 'The physical environment is monitored to find potentially adverse events.',
                          'Physical security monitoring (surveillance cameras, access control logs, environmental sensors) is in place for facilities housing critical systems. Alerts are generated for anomalous physical events.'),
                         ('DE.CM-03', 'Personnel activity and technology usage are monitored to find potentially adverse events.',
                          'User behavior analytics (UBA) or similar controls detect anomalous user activity. Privileged user activity receives enhanced monitoring. Monitoring respects applicable privacy requirements.'),
                         ('DE.CM-06', 'External service provider activities and services are monitored to find potentially adverse events.',
                          'The organization monitors the activities of external service providers that have access to organizational systems or data. Unusual access patterns or behaviors by third parties trigger alerts.'),
                         ('DE.CM-09', 'Computing hardware and software, runtime environments, and their data are monitored to find potentially adverse events.',
                          'Endpoint detection and response (EDR) tools and other controls monitor endpoint and server activity for malware, exploitation attempts, and other anomalies. File integrity monitoring detects unauthorized changes.'),
                     ]),
                    ('DE.AE', 'Adverse Event Analysis',
                     'Anomalies, indicators of compromise, and other potentially adverse events are analyzed to characterize the events and detect cybersecurity incidents.',
                     [
                         ('DE.AE-02', 'Potentially adverse events are analyzed to better understand associated activities.',
                          'Security analysts investigate alerts and anomalies to determine their nature and scope. Analysis includes reviewing logs, artifacts, and threat intelligence to establish context.'),
                         ('DE.AE-03', 'Information is correlated from multiple sources.',
                          'The organization correlates data from multiple detection sources (e.g., SIEM, EDR, network sensors) to identify patterns that indicate a security incident. False positive rates are managed.'),
                         ('DE.AE-04', 'The estimated impact and scope of adverse events are understood.',
                          'During analysis, the potential impact and scope of an adverse event are assessed. This includes identifying affected systems, data, and services to prioritize the response.'),
                         ('DE.AE-06', 'Information on adverse events is provided to authorized staff and tools.',
                          'Relevant information about detected events is shared with the security team, incident responders, and automated tools in a timely manner. Escalation paths are defined.'),
                         ('DE.AE-07', 'Cyber threat intelligence and other contextual information are integrated into the analysis.',
                          'Threat intelligence (IOCs, TTPs, threat actor profiles) is used to contextualize and enrich security event analysis. Intelligence feeds are integrated into detection and analysis workflows.'),
                         ('DE.AE-08', 'Incidents are declared when adverse events meet the defined incident criteria.',
                          'Clear criteria define when an adverse event escalates to a declared incident. Declaration triggers the incident response process including notification, escalation, and containment activities.'),
                     ]),
                ]
            ),
            (
                'RS', 'RESPOND',
                'Actions regarding a detected cybersecurity incident are taken.',
                4,
                [
                    ('RS.MA', 'Incident Management',
                     'Responses to detected cybersecurity incidents are managed.',
                     [
                         ('RS.MA-01', 'The incident response plan is executed in coordination with relevant third parties once an incident is declared.',
                          'Upon incident declaration, the documented IR plan is activated. Relevant external parties (MSSPs, legal counsel, law enforcement, regulatory bodies) are engaged per the plan.'),
                         ('RS.MA-02', 'Incident reports are triaged and validated.',
                          'A triage process validates reported incidents to distinguish genuine incidents from false positives. Validated incidents are prioritized based on impact and risk.'),
                         ('RS.MA-03', 'Incidents are categorized and prioritized.',
                          'Incidents are classified using a defined taxonomy (e.g., by attack type, affected asset, data involved). Severity ratings drive prioritization of response resources and urgency.'),
                         ('RS.MA-04', 'Incidents are escalated or elevated as needed.',
                          'Clear escalation criteria and paths exist. High-severity incidents are escalated to senior leadership, legal, and public relations as appropriate. Escalation thresholds are documented.'),
                         ('RS.MA-05', 'The criteria for initiating incident recovery are applied.',
                          'The organization has defined criteria for when to transition from response to recovery mode. These criteria consider containment status, threat eradication, and business continuity needs.'),
                     ]),
                    ('RS.AN', 'Incident Analysis',
                     'Investigations are conducted to ensure effective response and support forensics and recovery activities.',
                     [
                         ('RS.AN-03', 'Analysis is performed to establish what has taken place during an incident and the root cause of the incident.',
                          'Forensic analysis and log review establish the timeline, attack vector, and root cause of the incident. Root cause analysis informs remediation and prevention of recurrence.'),
                         ('RS.AN-06', 'Actions performed during an investigation are recorded, and the records\' integrity and provenance are preserved.',
                          'Investigators maintain detailed logs of actions taken during the investigation. Evidence is collected and stored in a manner that preserves integrity and supports potential legal proceedings.'),
                         ('RS.AN-07', 'Cause of the incident and the relationship to other incidents are analyzed.',
                          'Analysis determines whether the incident is isolated or related to other events. Patterns across incidents are identified to detect campaigns or systemic vulnerabilities.'),
                         ('RS.AN-08', 'An incident\'s magnitude is estimated and validated.',
                          'The organization estimates the full scope of the incident including affected systems, compromised data, and business impact. Estimates are validated as more information becomes available.'),
                     ]),
                    ('RS.CO', 'Incident Response Reporting and Communication',
                     'Response activities are coordinated with internal and external stakeholders as required by laws, regulations, or policies.',
                     [
                         ('RS.CO-02', 'Internal and external stakeholders are notified of incidents in a timely manner.',
                          'Notification procedures define who must be notified of incidents and within what timeframes. This includes internal leadership, affected users, regulators, and external partners as required by law or contract.'),
                         ('RS.CO-03', 'Information is shared with designated internal and external stakeholders.',
                          'During and after incidents, appropriate information is shared with relevant parties. Information sharing balances the need for transparency with operational security and legal considerations.'),
                     ]),
                    ('RS.MI', 'Incident Mitigation',
                     'Activities are performed to prevent expansion of an event and mitigate its effects.',
                     [
                         ('RS.MI-01', 'Incidents are contained.',
                          'Containment actions limit the spread and impact of the incident. This may include isolating affected systems, blocking malicious traffic, disabling compromised accounts, and revoking access.'),
                         ('RS.MI-02', 'Incidents are eradicated.',
                          'After containment, the root cause and all traces of the threat are eliminated. This includes removing malware, closing vulnerabilities, patching systems, and resetting compromised credentials.'),
                     ]),
                ]
            ),
            (
                'RC', 'RECOVER',
                'Assets and operations affected by a cybersecurity incident are restored.',
                5,
                [
                    ('RC.RP', 'Incident Recovery Plan Execution',
                     'Restoration activities are performed to ensure operational availability of systems and services affected by cybersecurity incidents.',
                     [
                         ('RC.RP-01', 'The recovery portion of the incident response plan is executed once initiated from the incident response process.',
                          'The documented recovery plan is activated when containment and eradication are complete. Recovery activities follow defined procedures and are tracked to completion.'),
                         ('RC.RP-02', 'Recovery actions are selected, scoped, prioritized, and performed.',
                          'Recovery actions are prioritized based on business criticality. The most critical systems and services are restored first. Recovery scope is defined and validated against business requirements.'),
                         ('RC.RP-03', 'The integrity of backups and other restoration assets is verified before using them for restoration.',
                          'Backup integrity is verified before restoration begins. This prevents restoring from corrupted or malware-infected backups. Validation includes checksums and test restores.'),
                         ('RC.RP-04', 'Critical mission functions and cybersecurity risk management are considered to establish post-incident operational norms.',
                          'The organization defines acceptable operational conditions for returning to normal. Post-incident operations may include enhanced monitoring or temporary workarounds until full restoration is achieved.'),
                         ('RC.RP-05', 'The integrity of restored assets is verified, systems and services are restored, and normal operating status is confirmed.',
                          'Before returning restored systems to production, their integrity is verified through scanning and testing. Formal sign-off confirms that normal operations have resumed.'),
                         ('RC.RP-06', 'The end of incident recovery is declared based on criteria, and stakeholders are notified.',
                          'Defined criteria determine when recovery is complete. Declaration triggers final notifications to stakeholders and initiates post-incident review activities.'),
                     ]),
                    ('RC.CO', 'Incident Recovery Communication',
                     'Restoration activities are coordinated with internal and external parties.',
                     [
                         ('RC.CO-03', 'Recovery activities and progress in restoring operational capabilities are communicated to designated internal and external stakeholders.',
                          'Regular status updates are provided to leadership, affected users, and external parties during recovery. Communications are factual, timely, and aligned with the crisis communications plan.'),
                         ('RC.CO-04', 'Public updates on incident recovery are shared using approved methods and messaging.',
                          'If the incident requires public disclosure, communications are reviewed and approved by legal and public relations teams before release. Messaging is accurate and consistent across channels.'),
                     ]),
                ]
            ),
        ]

        global_order = 0
        for func_id, func_name, func_desc, func_order, categories in FUNCTIONS:
            family, _ = GrcFamily.objects.update_or_create(
                framework=fw, identifier=func_id,
                defaults={'name': func_name, 'description': func_desc, 'order': func_order}
            )

            for cat_id, cat_title, cat_desc, subcategories in categories:
                cat_ctrl, _ = GrcControl.objects.update_or_create(
                    family=family, control_id=cat_id,
                    defaults={
                        'title':       cat_title,
                        'statement':   cat_desc,
                        'discussion':  '',
                        'is_category': True,
                        'parent':      None,
                        'order':       global_order,
                    }
                )
                global_order += 1

                for sub_id, sub_title, sub_discussion in subcategories:
                    GrcControl.objects.update_or_create(
                        family=family, control_id=sub_id,
                        defaults={
                            'title':       sub_title,
                            'statement':   sub_title,
                            'discussion':  sub_discussion,
                            'is_category': False,
                            'parent':      cat_ctrl,
                            'order':       global_order,
                        }
                    )
                    global_order += 1

        self.stdout.write(f'    NIST CSF 2.0: seeded {global_order} controls')

    # ─────────────────────────────────────────────────────────────────────────
    # NIST SP 800-171 Rev 3
    # ─────────────────────────────────────────────────────────────────────────
    def _seed_nist_800171r3(self):
        fw, _ = GrcFramework.objects.update_or_create(
            key='NIST_800_171_R3',
            defaults={
                'name':        'NIST SP 800-171 Rev 3',
                'version':     '3',
                'description': (
                    'NIST Special Publication 800-171 Revision 3 provides security requirements for '
                    'protecting Controlled Unclassified Information (CUI) in nonfederal systems and '
                    'organizations. It contains 110 requirements across 14 families, supporting '
                    'compliance with DFARS clause 252.204-7012 and CMMC.'
                ),
                'is_active': True,
            }
        )
        self.stdout.write(f'  Framework: {fw.name}')

        # (family_id, family_name, order, requirements)
        # requirements: (req_id, req_title, req_statement)
        FAMILIES = [
            ('3.1', 'Access Control (AC)', 0, [
                ('3.1.1',  'Limit system access to authorized users',
                 'Limit system access to authorized users, processes acting on behalf of authorized users, and devices (including other systems).'),
                ('3.1.2',  'Limit system access to authorized transaction types',
                 'Limit system access to the types of transactions and functions that authorized users are permitted to execute.'),
                ('3.1.3',  'Control CUI flow',
                 'Control the flow of CUI in accordance with approved authorizations.'),
                ('3.1.4',  'Separate duties of individuals',
                 'Separate the duties of individuals to reduce the risk of malevolent activity without collusion.'),
                ('3.1.5',  'Employ least privilege',
                 'Employ the principle of least privilege, including for specific security functions and privileged accounts.'),
                ('3.1.6',  'Use non-privileged accounts for non-security functions',
                 'Use non-privileged accounts or roles when accessing non-security functions.'),
                ('3.1.7',  'Prevent non-privileged users from executing privileged functions',
                 'Prevent non-privileged users from executing privileged functions and capture the execution of such functions in audit logs.'),
                ('3.1.8',  'Limit unsuccessful logon attempts',
                 'Limit unsuccessful logon attempts.'),
                ('3.1.9',  'Provide privacy and security notices',
                 'Provide privacy and security notices consistent with CUI rules.'),
                ('3.1.10', 'Use session lock with pattern-hiding displays',
                 'Use session lock with pattern-hiding displays after a period of inactivity.'),
                ('3.1.11', 'Terminate sessions after defined condition',
                 'Terminate (automatically) a user session after a defined condition.'),
                ('3.1.12', 'Monitor and control remote access sessions',
                 'Monitor and control remote access sessions.'),
                ('3.1.13', 'Employ cryptographic mechanisms for remote access',
                 'Employ cryptographic mechanisms to protect the confidentiality of remote access sessions.'),
                ('3.1.14', 'Route remote access via managed access control points',
                 'Route remote access via managed access control points.'),
                ('3.1.15', 'Authorize remote execution of privileged commands',
                 'Authorize remote execution of privileged commands and access to security-relevant information via remote access only for documented operational needs.'),
                ('3.1.16', 'Authorize wireless access',
                 'Authorize wireless access prior to allowing such connections.'),
                ('3.1.17', 'Protect wireless access',
                 'Protect wireless access using authentication and encryption.'),
                ('3.1.18', 'Control connection of mobile devices',
                 'Control connection of mobile devices.'),
                ('3.1.19', 'Encrypt CUI on mobile devices',
                 'Encrypt CUI on mobile devices and mobile computing platforms.'),
                ('3.1.20', 'Verify and control external system connections',
                 'Verify and control all connections to external systems.'),
                ('3.1.21', 'Limit use of portable storage devices',
                 'Limit use of portable storage devices on external systems.'),
                ('3.1.22', 'Control CUI on publicly accessible systems',
                 'Control CUI posted or processed on publicly accessible systems.'),
            ]),
            ('3.2', 'Awareness and Training (AT)', 1, [
                ('3.2.1', 'Ensure managers and users are aware of security risks',
                 'Ensure that managers, systems administrators, and users of organizational systems are made aware of the security risks associated with their activities and of the applicable policies, standards, and procedures related to the security of those systems.'),
                ('3.2.2', 'Ensure personnel are trained to carry out security responsibilities',
                 'Ensure that personnel are trained to carry out their assigned information security responsibilities.'),
                ('3.2.3', 'Provide security awareness training on recognizing threats',
                 'Provide security awareness training on recognizing and reporting potential threats, including social engineering attacks.'),
            ]),
            ('3.3', 'Audit and Accountability (AU)', 2, [
                ('3.3.1', 'Create and retain system audit logs',
                 'Create and retain system audit logs and records to the extent needed to enable the monitoring, analysis, investigation, and reporting of unlawful or unauthorized system activity.'),
                ('3.3.2', 'Ensure actions of users can be traced to those users',
                 'Ensure that the actions of individual system users can be uniquely traced to those users so they can be held accountable for their actions.'),
                ('3.3.3', 'Review and update logged events',
                 'Review and update logged events.'),
                ('3.3.4', 'Alert on audit process failure',
                 'Alert in the event of an audit process failure.'),
                ('3.3.5', 'Correlate audit record review and analysis',
                 'Correlate audit record review, analysis, and reporting processes for investigation and response to indications of unlawful, unauthorized, suspicious, or unusual activity.'),
                ('3.3.6', 'Provide audit record reduction and report generation',
                 'Provide audit record reduction and report generation to support on-demand analysis and reporting.'),
                ('3.3.7', 'Provide system capability to compare and synchronize internal clocks',
                 'Provide a system capability that compares and synchronizes internal system clocks with an authoritative source to generate timestamps for audit records.'),
                ('3.3.8', 'Protect audit information from unauthorized access',
                 'Protect audit information and audit tools from unauthorized access, modification, and deletion.'),
                ('3.3.9', 'Limit management of audit functionality to privileged users',
                 'Limit management of audit functionality to a subset of privileged users.'),
            ]),
            ('3.4', 'Configuration Management (CM)', 3, [
                ('3.4.1', 'Establish and maintain baseline configurations',
                 'Establish and maintain baseline configurations and inventories of organizational systems throughout the respective system development life cycles.'),
                ('3.4.2', 'Establish and enforce security configuration settings',
                 'Establish and enforce security configuration settings for information technology products employed in organizational systems.'),
                ('3.4.3', 'Track, review, approve, and log changes to systems',
                 'Track, review, approve, log, and document changes to organizational systems.'),
                ('3.4.4', 'Analyze security impact of changes prior to implementation',
                 'Analyze the security impact of changes prior to implementation.'),
                ('3.4.5', 'Define and enforce physical and logical access restrictions for changes',
                 'Define, document, approve, and enforce physical and logical access restrictions associated with changes to organizational systems.'),
                ('3.4.6', 'Employ the principle of least functionality',
                 'Employ the principle of least functionality by configuring organizational systems to provide only essential capabilities.'),
                ('3.4.7', 'Restrict, disable, or prevent use of nonessential programs',
                 'Restrict, disable, or prevent the use of nonessential programs, functions, ports, protocols, and services.'),
                ('3.4.8', 'Apply deny-by-exception or allow-by-exception software policy',
                 'Apply deny-by-exception (blacklisting) policy to prevent the use of unauthorized software or deny-all, permit-by-exception (whitelisting) policy to allow the execution of authorized software.'),
                ('3.4.9', 'Control and monitor user-installed software',
                 'Control and monitor user-installed software.'),
            ]),
            ('3.5', 'Identification and Authentication (IA)', 4, [
                ('3.5.1',  'Identify system users, processes, and devices',
                 'Identify system users, processes acting on behalf of users, and devices.'),
                ('3.5.2',  'Authenticate identities of users, processes, or devices',
                 'Authenticate (or verify) the identities of users, processes, or devices, as a prerequisite to allowing access to organizational systems.'),
                ('3.5.3',  'Use multifactor authentication for privileged accounts',
                 'Use multifactor authentication for local and network access to privileged accounts and for network access to non-privileged accounts.'),
                ('3.5.4',  'Employ replay-resistant authentication mechanisms',
                 'Employ replay-resistant authentication mechanisms for network access to privileged and non-privileged accounts.'),
                ('3.5.5',  'Employ multifactor authentication for local and network access',
                 'Employ multifactor authentication for local and network access to privileged and non-privileged accounts.'),
                ('3.5.6',  'Disable identifiers after a defined period of inactivity',
                 'Disable identifiers after a defined period of inactivity.'),
                ('3.5.7',  'Enforce minimum password complexity',
                 'Enforce a minimum password complexity and change of characters when new passwords are created.'),
                ('3.5.8',  'Prohibit password reuse',
                 'Prohibit password reuse for a specified number of generations.'),
                ('3.5.9',  'Allow temporary password use for system logons with immediate change',
                 'Allow temporary password use for system logons with an immediate change to a permanent password.'),
                ('3.5.10', 'Store and transmit only cryptographically protected passwords',
                 'Store and transmit only cryptographically protected passwords.'),
                ('3.5.11', 'Obscure feedback of authentication information',
                 'Obscure feedback of authentication information.'),
                ('3.5.12', 'Employ authenticator management practices',
                 'Employ authenticator management practices including the following: (a) Maintaining a list of commonly used, expected, or compromised passwords and updating the list periodically; (b) Verifying that passwords are not found on the list of commonly used, expected, or compromised passwords when new passwords are created; and (c) Transmitting only encrypted representations of passwords.'),
            ]),
            ('3.6', 'Incident Response (IR)', 5, [
                ('3.6.1', 'Establish an operational incident-handling capability',
                 'Establish an operational incident-handling capability for organizational systems that includes preparation, detection, analysis, containment, recovery, and user response activities.'),
                ('3.6.2', 'Track, document, and report incidents',
                 'Track, document, and report incidents to designated officials and/or authorities both internal and external to the organization.'),
                ('3.6.3', 'Test the organizational incident response capability',
                 'Test the organizational incident response capability.'),
            ]),
            ('3.7', 'Maintenance (MA)', 6, [
                ('3.7.1', 'Perform maintenance on organizational systems',
                 'Perform maintenance on organizational systems.'),
                ('3.7.2', 'Provide controls on maintenance tools and personnel',
                 'Provide controls on the tools, techniques, mechanisms, and personnel that conduct system maintenance.'),
                ('3.7.3', 'Ensure equipment removed for off-site maintenance is sanitized',
                 'Ensure equipment removed for off-site maintenance is sanitized of any CUI.'),
                ('3.7.4', 'Check media containing diagnostic and test programs for malicious code',
                 'Check media containing diagnostic and test programs for malicious code before the media are used in organizational systems.'),
                ('3.7.5', 'Require MFA for nonlocal maintenance sessions',
                 'Require multifactor authentication to establish nonlocal maintenance sessions via external network connections and terminate such connections when nonlocal maintenance is complete.'),
                ('3.7.6', 'Supervise maintenance activities of unauthorized personnel',
                 'Supervise the maintenance activities of maintenance personnel without required access authorization.'),
            ]),
            ('3.8', 'Media Protection (MP)', 7, [
                ('3.8.1', 'Protect system media containing CUI',
                 'Protect (i.e., physically control and securely store) system media containing CUI, both paper and digital.'),
                ('3.8.2', 'Limit access to CUI on system media to authorized users',
                 'Limit access to CUI on system media to authorized users.'),
                ('3.8.3', 'Sanitize or destroy system media before disposal or reuse',
                 'Sanitize or destroy system media before disposal or reuse.'),
                ('3.8.4', 'Mark media with necessary CUI markings',
                 'Mark media with necessary CUI markings and distribution limitations.'),
                ('3.8.5', 'Control access to media during transport',
                 'Control access to media containing CUI and maintain accountability for media during transport, unless the media is encrypted.'),
                ('3.8.6', 'Implement cryptographic mechanisms to protect CUI during transport',
                 'Implement cryptographic mechanisms to protect the confidentiality of CUI during transport unless otherwise protected by alternative physical safeguards.'),
                ('3.8.7', 'Control the use of removable media',
                 'Control the use of removable media on system components.'),
                ('3.8.8', 'Prohibit use of portable storage devices without identifiable owner',
                 'Prohibit the use of portable storage devices when such devices have no identifiable owner.'),
                ('3.8.9', 'Protect confidentiality of backup CUI at storage locations',
                 'Protect the confidentiality of backup CUI at storage locations.'),
            ]),
            ('3.9', 'Personnel Security (PS)', 8, [
                ('3.9.1', 'Screen individuals prior to authorizing access',
                 'Screen individuals prior to authorizing access to organizational systems containing CUI.'),
                ('3.9.2', 'Ensure systems are protected during personnel actions',
                 'Ensure that organizational systems containing CUI are protected during and after personnel actions such as terminations and transfers.'),
            ]),
            ('3.10', 'Physical Protection (PE)', 9, [
                ('3.10.1', 'Limit physical access to organizational systems',
                 'Limit physical access to organizational systems, equipment, and the respective operating environments to authorized individuals.'),
                ('3.10.2', 'Protect and monitor the physical facility',
                 'Protect and monitor the physical facility and support infrastructure for organizational systems.'),
                ('3.10.3', 'Escort visitors and monitor visitor activity',
                 'Escort visitors and monitor visitor activity.'),
                ('3.10.4', 'Maintain audit logs of physical access',
                 'Maintain audit logs of physical access.'),
                ('3.10.5', 'Control and manage physical access devices',
                 'Control and manage physical access devices.'),
                ('3.10.6', 'Enforce safeguarding measures for CUI at alternate work sites',
                 'Enforce safeguarding measures for CUI at alternate work sites.'),
            ]),
            ('3.11', 'Risk Assessment (RA)', 10, [
                ('3.11.1', 'Periodically assess the risk to organizational operations',
                 'Periodically assess the risk to organizational operations (including mission, functions, image, or reputation), organizational assets, and individuals, resulting from the operation of organizational systems and the associated processing, storage, or transmission of CUI.'),
                ('3.11.2', 'Scan for vulnerabilities in organizational systems',
                 'Scan for vulnerabilities in organizational systems and applications periodically and when new vulnerabilities affecting those systems and applications are identified.'),
                ('3.11.3', 'Remediate vulnerabilities in accordance with risk assessments',
                 'Remediate vulnerabilities in accordance with risk assessments.'),
            ]),
            ('3.12', 'Security Assessment (CA)', 11, [
                ('3.12.1', 'Periodically assess the security controls in organizational systems',
                 'Periodically assess the security controls in organizational systems to determine if the controls are effective in their application.'),
                ('3.12.2', 'Develop and implement plans of action',
                 'Develop and implement plans of action designed to correct deficiencies and reduce or eliminate vulnerabilities in organizational systems.'),
                ('3.12.3', 'Monitor security controls on an ongoing basis',
                 'Monitor security controls on an ongoing basis to ensure the continued effectiveness of the controls.'),
                ('3.12.4', 'Develop, document, and periodically update system security plans',
                 'Develop, document, and periodically update system security plans that describe system boundaries, system environments of operation, how security requirements are implemented, and the relationships with or connections to other systems.'),
            ]),
            ('3.13', 'System and Communications Protection (SC)', 12, [
                ('3.13.1',  'Monitor, control, and protect communications at system boundaries',
                 'Monitor, control, and protect communications (i.e., information transmitted or received by organizational systems) at the external boundaries and key internal boundaries of organizational systems.'),
                ('3.13.2',  'Employ architectural designs that promote effective information security',
                 'Employ architectural designs, software development techniques, and systems engineering principles that promote effective information security within organizational systems.'),
                ('3.13.3',  'Separate user functionality from system management functionality',
                 'Separate user functionality from system management functionality.'),
                ('3.13.4',  'Prevent unauthorized information transfer via shared system resources',
                 'Prevent unauthorized and unintended information transfer via shared system resources.'),
                ('3.13.5',  'Implement subnetworks for publicly accessible system components',
                 'Implement subnetworks for publicly accessible system components that are physically or logically separated from internal networks.'),
                ('3.13.6',  'Deny network communications by default',
                 'Deny network communications traffic by default and allow network communications traffic by exception (i.e., deny all, permit by exception).'),
                ('3.13.7',  'Prevent split tunneling',
                 'Prevent remote devices from simultaneously using non-remote connections with the system and communicating via some other connection to resources in external networks (i.e., split tunneling).'),
                ('3.13.8',  'Implement cryptographic mechanisms to prevent unauthorized CUI disclosure',
                 'Implement cryptographic mechanisms to prevent unauthorized disclosure of CUI during transmission.'),
                ('3.13.9',  'Terminate network connections after a defined period of inactivity',
                 'Terminate network connections after a defined period of inactivity.'),
                ('3.13.10', 'Establish and manage cryptographic keys',
                 'Establish and manage cryptographic keys for cryptography employed in organizational systems.'),
                ('3.13.11', 'Employ FIPS-validated cryptography',
                 'Employ FIPS-validated cryptography when used to protect the confidentiality of CUI.'),
                ('3.13.12', 'Prohibit remote activation of collaborative computing devices',
                 'Prohibit remote activation of collaborative computing devices and provide indication of use to users present at the device.'),
                ('3.13.13', 'Control and monitor the use of mobile code',
                 'Control and monitor the use of mobile code.'),
                ('3.13.14', 'Control and monitor the use of VoIP technologies',
                 'Control and monitor the use of VoIP technologies.'),
                ('3.13.15', 'Protect the authenticity of communications sessions',
                 'Protect the authenticity of communications sessions.'),
                ('3.13.16', 'Protect CUI at rest',
                 'Protect CUI at rest.'),
            ]),
            ('3.14', 'System and Information Integrity (SI)', 13, [
                ('3.14.1', 'Identify, report, and correct information and system flaws',
                 'Identify, report, and correct information and system flaws in a timely manner.'),
                ('3.14.2', 'Provide protection from malicious code',
                 'Provide protection from malicious code at appropriate locations within organizational systems.'),
                ('3.14.3', 'Monitor system security alerts and advisories',
                 'Monitor system security alerts and advisories and take action in response.'),
                ('3.14.4', 'Update malicious code protection mechanisms',
                 'Update malicious code protection mechanisms when new releases are available.'),
                ('3.14.5', 'Perform periodic scans of organizational systems',
                 'Perform periodic scans of organizational systems and real-time scans of files from external sources as files are downloaded, opened, or executed.'),
                ('3.14.6', 'Monitor organizational systems for attacks',
                 'Monitor organizational systems, including inbound and outbound communications traffic, to detect attacks and indicators of potential attacks.'),
                ('3.14.7', 'Identify unauthorized use of organizational systems',
                 'Identify unauthorized use of organizational systems.'),
            ]),
        ]

        global_order = 1000
        for fam_id, fam_name, fam_order, requirements in FAMILIES:
            family, _ = GrcFamily.objects.update_or_create(
                framework=fw, identifier=fam_id,
                defaults={'name': fam_name, 'description': '', 'order': fam_order}
            )

            for req_id, req_title, req_statement in requirements:
                GrcControl.objects.update_or_create(
                    family=family, control_id=req_id,
                    defaults={
                        'title':       req_title,
                        'statement':   req_statement,
                        'discussion':  '',
                        'is_category': False,
                        'parent':      None,
                        'order':       global_order,
                    }
                )
                global_order += 1

        self.stdout.write(f'    NIST SP 800-171r3: seeded {global_order - 1000} controls')

    # ─────────────────────────────────────────────────────────────────────────
    # ISO/IEC 27001:2022
    # ─────────────────────────────────────────────────────────────────────────
    def _seed_iso27001_2022(self):
        fw, _ = GrcFramework.objects.update_or_create(
            key='ISO_27001_2022',
            defaults={
                'name':        'ISO/IEC 27001:2022',
                'version':     '2022',
                'description': (
                    'ISO/IEC 27001:2022 is the international standard for information security management '
                    'systems (ISMS). Annex A contains 93 information security controls organised into four '
                    'themes: Organizational, People, Physical, and Technological.'
                ),
                'is_active': True,
            }
        )
        self.stdout.write(f'  Framework: {fw.name}')

        FAMILIES = [
            ('A.5', 'Organizational Controls', 0, [
                ('A.5.1',  'Policies for information security',
                 'Management direction and support for information security shall be provided through the issuance and review of information security policies covering all relevant topics such as access control, acceptable use, incident management, and physical security, aligned with organizational strategy and applicable legislation.'),
                ('A.5.2',  'Information security roles and responsibilities',
                 'All information security responsibilities shall be defined and allocated based on the information security policy, with clear ownership assigned for the protection of assets and the performance of specific information security processes.'),
                ('A.5.3',  'Segregation of duties',
                 'Conflicting duties and conflicting areas of responsibility shall be segregated to reduce opportunities for unauthorized or unintentional modification or misuse of organizational assets. Where segregation is not feasible, compensating controls shall be documented.'),
                ('A.5.4',  'Management responsibilities',
                 'All management personnel shall require all employees and contractors to apply information security in accordance with established policies, procedures, and legal requirements of the organization.'),
                ('A.5.5',  'Contact with authorities',
                 'The organization shall establish and maintain contacts with relevant authorities (e.g., law enforcement, regulatory bodies, supervisory authorities) so that appropriate reporting and response to incidents can be coordinated in a timely manner.'),
                ('A.5.6',  'Contact with special interest groups',
                 'The organization shall establish and maintain contacts with special interest groups, security forums, and professional associations to stay informed about security threats, vulnerabilities, and best practices relevant to the organization\'s context.'),
                ('A.5.7',  'Threat intelligence',
                 'Information relating to information security threats shall be collected, analyzed, and applied to stay informed about relevant threats, enabling the organization to take timely and informed risk-based decisions to prevent or reduce the impact of incidents.'),
                ('A.5.8',  'Information security in project management',
                 'Information security shall be integrated into project management across the entire project lifecycle so that information security risks are assessed and addressed at all stages of system development, procurement, and change management.'),
                ('A.5.9',  'Inventory of information and other associated assets',
                 'An inventory of information and associated processing assets shall be developed, maintained, and regularly reviewed, with an identified owner responsible for each asset.'),
                ('A.5.10', 'Acceptable use of information and other associated assets',
                 'Rules for the acceptable use and procedures for handling information and associated assets shall be identified, documented, and implemented in a manner that protects them from unauthorized access, disclosure, modification, or destruction.'),
                ('A.5.11', 'Return of assets',
                 'Personnel and external parties shall return all organizational assets in their possession upon termination of employment, contract, or agreement, and procedures shall ensure all assets are returned or securely destroyed.'),
                ('A.5.12', 'Classification of information',
                 'Information shall be classified according to the information security needs of the organization based on confidentiality, integrity, and availability requirements, taking into account applicable legislation, sensitivity, and criticality.'),
                ('A.5.13', 'Labelling of information',
                 'An appropriate set of procedures for information labelling shall be developed and implemented in accordance with the information classification scheme adopted by the organization.'),
                ('A.5.14', 'Information transfer',
                 'Information transfer rules, procedures, or agreements shall be in place for all types of transfer facilities within the organization and between the organization and external parties, covering electronic transfers, physical media, and verbal communication.'),
                ('A.5.15', 'Access control',
                 'Rules to control physical and logical access to information and associated assets shall be established and implemented based on business and information security requirements.'),
                ('A.5.16', 'Identity management',
                 'The full lifecycle of identities shall be managed, including processes for registration, provisioning, changes, and de-registration of identities for all users (internal and external) and systems, ensuring each entity has a unique identity.'),
                ('A.5.17', 'Authentication information',
                 'Allocation and management of authentication information shall be controlled by a formal management process, including requirements for strong passwords, prohibition of sharing credentials, and secure handling of temporary credentials.'),
                ('A.5.18', 'Access rights',
                 'Access rights to information and associated assets shall be provisioned, reviewed, modified, and removed in accordance with the organization\'s access control policy and topic-specific policies on access control.'),
                ('A.5.19', 'Information security in supplier relationships',
                 'Processes and procedures shall be defined and implemented to manage the information security risks associated with the use of suppliers\' products or services, including agreements and monitoring.'),
                ('A.5.20', 'Addressing information security within supplier agreements',
                 'Relevant information security requirements shall be established and agreed with each supplier based on the type of supplier relationship and the risk associated with the information or services provided.'),
                ('A.5.21', 'Managing information security in the ICT supply chain',
                 'Processes and procedures shall be defined and implemented to manage the information security risks associated with the ICT products and services supply chain, including hardware, software, and cloud services.'),
                ('A.5.22', 'Monitoring, review and change management of supplier services',
                 'The organization shall regularly monitor, review, evaluate, and manage changes to supplier information security practices and service delivery in line with supplier agreements.'),
                ('A.5.23', 'Information security for use of cloud services',
                 'Processes for acquisition, use, management, and exit from cloud services shall be established in accordance with the organization\'s information security requirements, including security controls, data residency, and incident response.'),
                ('A.5.24', 'Information security incident management planning and preparation',
                 'The organization shall plan and prepare for managing information security incidents by defining, establishing, and communicating information security incident management processes, roles, and responsibilities.'),
                ('A.5.25', 'Assessment and decision on information security events',
                 'The organization shall assess information security events and decide whether they are to be categorized as information security incidents, using documented criteria that define the threshold for escalation and notification.'),
                ('A.5.26', 'Response to information security incidents',
                 'Information security incidents shall be responded to in accordance with documented procedures, containing the incident, collecting evidence, escalating where appropriate, notifying affected parties, and coordinating recovery.'),
                ('A.5.27', 'Learning from information security incidents',
                 'Knowledge gained from analyzing and resolving information security incidents shall be used to reduce the likelihood or impact of future incidents, including updates to controls, policies, and risk assessments.'),
                ('A.5.28', 'Collection of evidence',
                 'The organization shall define and apply procedures for identification, collection, acquisition, and preservation of evidence relating to information security events, in a manner suitable for disciplinary or legal proceedings if required.'),
                ('A.5.29', 'Information security during disruption',
                 'The organization shall plan how to maintain information security at an appropriate level during disruption so that critical information security controls and capabilities remain available.'),
                ('A.5.30', 'ICT readiness for business continuity',
                 'ICT readiness shall be planned, implemented, maintained, and tested based on business continuity objectives and ICT continuity requirements, including recovery time and recovery point objectives for critical systems.'),
                ('A.5.31', 'Legal, statutory, regulatory and contractual requirements',
                 'Legal, statutory, regulatory and contractual requirements relevant to information security and the organization\'s approach to meeting these requirements shall be explicitly identified, documented, and kept up to date.'),
                ('A.5.32', 'Intellectual property rights',
                 'The organization shall implement appropriate procedures to protect intellectual property rights, including software licensing, patents, trademarks, and proprietary information in accordance with applicable legislation.'),
                ('A.5.33', 'Protection of records',
                 'Records shall be protected from loss, destruction, falsification, unauthorized access, and unauthorized release, in accordance with legal, statutory, regulatory, contractual, and business requirements and with applicable classification.'),
                ('A.5.34', 'Privacy and protection of personally identifiable information',
                 'The organization shall identify and meet the requirements regarding the preservation of privacy and protection of personally identifiable information (PII) in accordance with applicable legislation and regulations.'),
                ('A.5.35', 'Independent review of information security',
                 'The organization\'s approach to managing information security and its implementation shall be reviewed independently at planned intervals or when significant changes occur, to ensure its continuing suitability, adequacy, and effectiveness.'),
                ('A.5.36', 'Compliance with policies, rules and standards for information security',
                 'Compliance with the organization\'s information security policy, topic-specific policies, rules, and standards shall be regularly reviewed and managers shall ensure that all relevant security procedures within their area of responsibility are carried out correctly.'),
                ('A.5.37', 'Documented operating procedures',
                 'Operating procedures for information processing facilities shall be documented, maintained, and made available to all users who need them, covering startup and shutdown, backup, error handling, system maintenance, and emergency procedures.'),
            ]),
            ('A.6', 'People Controls', 1, [
                ('A.6.1', 'Screening',
                 'Background verification checks on all candidates for employment shall be carried out prior to joining the organization and on an ongoing basis, taking into consideration applicable laws, regulations, ethics, the risks involved, and the classification of information to be accessed.'),
                ('A.6.2', 'Terms and conditions of employment',
                 'The employment contractual agreements shall state the employees\' and organization\'s responsibilities for information security, including confidentiality obligations, acceptable use, and the consequences of security policy violations.'),
                ('A.6.3', 'Information security awareness, education and training',
                 'Employees and relevant external parties shall receive appropriate information security awareness, education, and training, including updates to organizational policies and procedures relevant to their job function on a regular basis.'),
                ('A.6.4', 'Disciplinary process',
                 'A disciplinary process shall be formalized and communicated to take action against employees and other relevant interested parties who have committed information security policy violations, proportionate to the severity and impact of the violation.'),
                ('A.6.5', 'Responsibilities after termination or change of employment',
                 'Information security responsibilities and duties that remain valid after termination or change of employment shall be defined, enforced, and communicated to employees or contractors, including return of assets and ongoing confidentiality obligations.'),
                ('A.6.6', 'Confidentiality or non-disclosure agreements',
                 'Confidentiality or non-disclosure agreements reflecting the organization\'s needs for the protection of information shall be identified, documented, regularly reviewed, and signed by employees and other relevant interested parties.'),
                ('A.6.7', 'Remote working',
                 'Security measures shall be implemented when personnel are working remotely to protect information accessed, processed, or stored outside the organizational premises, including the use of approved devices, VPNs, and clear desk policies in remote environments.'),
                ('A.6.8', 'Information security event reporting',
                 'Employees and contractors shall be required to report observed or suspected information security events through appropriate channels as quickly as possible to minimize the impact of incidents and enable timely response.'),
            ]),
            ('A.7', 'Physical Controls', 2, [
                ('A.7.1',  'Physical security perimeters',
                 'Security perimeters shall be defined and used to protect areas that contain information and other associated assets, using physical barriers such as fences, walls, card-controlled entry gates, or staffed reception desks.'),
                ('A.7.2',  'Physical entry',
                 'Secure areas shall be protected by appropriate entry controls and access points to ensure that only authorized personnel are allowed access, using mechanisms such as access cards, PINs, biometrics, or security personnel.'),
                ('A.7.3',  'Securing offices, rooms and facilities',
                 'Physical security for offices, rooms, and facilities shall be designed and implemented to prevent unauthorized access, damage, interference, and theft of information and associated assets.'),
                ('A.7.4',  'Physical security monitoring',
                 'Premises shall be continuously monitored for unauthorized physical access using surveillance systems such as CCTV, alarm systems, and security patrols, with monitoring records retained for appropriate periods.'),
                ('A.7.5',  'Protecting against physical and environmental threats',
                 'Physical protection against natural disasters, malicious attack, or accidents shall be designed and implemented, including measures for fire suppression, flood protection, earthquake resistance, and protection from deliberate physical attack.'),
                ('A.7.6',  'Working in secure areas',
                 'Security measures for working in secure areas shall be designed and applied to prevent unauthorized access, eavesdropping, and accidental disclosure, including restrictions on mobile devices, cameras, and food and drink.'),
                ('A.7.7',  'Clear desk and clear screen',
                 'Clear desk rules for papers and removable storage media and clear screen rules for information processing facilities shall be defined and appropriately enforced to reduce the risk of unauthorized access, loss, or damage outside normal working hours.'),
                ('A.7.8',  'Equipment siting and protection',
                 'Equipment shall be sited and protected to reduce the risks from environmental threats and hazards, and opportunities for unauthorized access, including temperature and humidity control and protection from power fluctuations.'),
                ('A.7.9',  'Security of assets off-premises',
                 'Off-site assets shall be protected taking into account the different risks of working outside the organization\'s premises, including authorization procedures, encryption of portable devices, and remote wiping capabilities.'),
                ('A.7.10', 'Storage media',
                 'Storage media shall be managed through their entire lifecycle of acquisition, use, transportation, and disposal in accordance with the organization\'s classification scheme and handling requirements, including secure erasure and physical destruction.'),
                ('A.7.11', 'Supporting utilities',
                 'Information processing facilities shall be protected from power failures and other disruptions caused by failures in supporting utilities, including uninterruptible power supplies, backup generators, redundant communications lines, and environmental controls.'),
                ('A.7.12', 'Cabling security',
                 'Power and telecommunications cabling carrying data or supporting information services shall be protected from interception, interference, or damage, using conduits, locked cable rooms, and protection against electromagnetic interference.'),
                ('A.7.13', 'Equipment maintenance',
                 'Equipment shall be correctly maintained to ensure its continued availability and integrity, with maintenance records retained, and security measures applied before equipment is taken off-site or returned following maintenance.'),
                ('A.7.14', 'Secure disposal or re-use of equipment',
                 'Items of equipment containing storage media shall be verified to ensure that any sensitive data and licensed software has been removed or securely overwritten prior to disposal or re-use, including physical destruction where appropriate.'),
            ]),
            ('A.8', 'Technological Controls', 3, [
                ('A.8.1',  'User endpoint devices',
                 'Information stored on, processed by, or accessible via user endpoint devices shall be protected through appropriate configuration management, encryption, screen locks, remote wipe, and endpoint detection and response capabilities.'),
                ('A.8.2',  'Privileged access rights',
                 'The allocation and use of privileged access rights shall be restricted and managed, including formal authorization processes, regular reviews, time-limited privileges, just-in-time access, and logging of all privileged activity.'),
                ('A.8.3',  'Information access restriction',
                 'Access to information and application system functions shall be restricted in accordance with the access control policy, implementing least privilege, need-to-know, and separation of duties principles.'),
                ('A.8.4',  'Access to source code',
                 'Read and write access to source code, development tools, and software libraries shall be appropriately managed to prevent introduction of unauthorized functionality, and to avoid unintentional changes to source code.'),
                ('A.8.5',  'Secure authentication',
                 'Secure authentication technologies and procedures shall be implemented based on information access restrictions and the topic-specific policy on access control, including multi-factor authentication for privileged and remote access.'),
                ('A.8.6',  'Capacity management',
                 'The use of resources shall be monitored and adjusted, and projections made of future capacity requirements to ensure the required system performance, taking into account business growth and technological developments.'),
                ('A.8.7',  'Protection against malware',
                 'Protection against malware shall be implemented and supported by appropriate user awareness, using anti-malware software, email filtering, application whitelisting, behavioral analysis, and incident response procedures.'),
                ('A.8.8',  'Management of technical vulnerabilities',
                 'Information about technical vulnerabilities of information systems in use shall be obtained in a timely fashion, the organization\'s exposure to such vulnerabilities evaluated, and appropriate measures taken to address the associated risk.'),
                ('A.8.9',  'Configuration management',
                 'Configurations, including security configurations, of hardware, software, services, and networks shall be established, documented, implemented, monitored, and reviewed through a formal configuration management process.'),
                ('A.8.10', 'Information deletion',
                 'Information stored in information systems, devices, or in any other storage media shall be deleted when no longer required, using secure deletion techniques that prevent recovery, and in accordance with applicable legal requirements for data retention.'),
                ('A.8.11', 'Data masking',
                 'Data masking shall be used in accordance with the organization\'s topic-specific policy on access control and other related topic-specific policies, and business requirements, taking applicable legislation into consideration for protecting sensitive data in non-production environments.'),
                ('A.8.12', 'Data leakage prevention',
                 'Data leakage prevention measures shall be applied to systems, networks, and any other devices that process, store, or transmit sensitive information to detect and prevent unauthorized disclosure of sensitive data.'),
                ('A.8.13', 'Information backup',
                 'Backup copies of information, software, and systems shall be maintained and regularly tested in accordance with an agreed topic-specific policy on backup, ensuring that backups are stored securely and can be restored within required timeframes.'),
                ('A.8.14', 'Redundancy of information processing facilities',
                 'Information processing facilities shall be implemented with redundancy sufficient to meet availability requirements, including failover systems, load balancing, geographically distributed data centers, and tested failover procedures.'),
                ('A.8.15', 'Logging',
                 'Logs that record user activities, exceptions, faults, and information security events shall be produced, stored, protected, and analyzed to enable future investigation, incident response, and forensic analysis.'),
                ('A.8.16', 'Monitoring activities',
                 'Networks, systems, and applications shall be monitored for anomalous behavior and potential information security incidents, with alerts generated and responded to by appropriate personnel in a timely manner.'),
                ('A.8.17', 'Clock synchronization',
                 'The clocks of information processing systems used by the organization shall be synchronized to approved time sources, and the accuracy and consistency of time stamps shall be maintained to support audit trails and incident investigation.'),
                ('A.8.18', 'Use of privileged utility programs',
                 'The use of utility programs that might be capable of overriding system and application controls shall be restricted and tightly controlled, with logging of all such use and authorization required before use.'),
                ('A.8.19', 'Installation of software on operational systems',
                 'Procedures and measures shall be implemented to securely manage software installation on operational systems, preventing installation of unauthorized or untested software through change management processes and application whitelisting.'),
                ('A.8.20', 'Networks security',
                 'Networks and network devices shall be secured, managed, and controlled to protect information in systems and applications, using network segmentation, firewalls, intrusion detection, and secure network architecture principles.'),
                ('A.8.21', 'Security of network services',
                 'Security mechanisms, service levels, and management requirements of all network services shall be identified and included in network services agreements, whether these services are provided in-house or outsourced.'),
                ('A.8.22', 'Segregation of networks',
                 'Groups of information services, users, and information systems shall be segregated in networks using network segmentation techniques such as VLANs, DMZs, firewalls, and software-defined networking to limit the impact of a breach.'),
                ('A.8.23', 'Web filtering',
                 'Access to external websites shall be managed to reduce exposure to malicious content, applying web content filtering, blocking known malicious domains, and restricting categories of sites inappropriate for business use.'),
                ('A.8.24', 'Use of cryptography',
                 'Rules for the effective use of cryptography, including cryptographic key management, shall be defined and implemented to protect the confidentiality, authenticity, and integrity of information, using approved algorithms and key lengths.'),
                ('A.8.25', 'Secure development life cycle',
                 'Rules for the secure development of software and systems shall be established and applied, covering design principles, secure coding standards, code review, security testing, and protection of development environments.'),
                ('A.8.26', 'Application security requirements',
                 'Information security requirements shall be identified, specified, and approved when developing or acquiring applications, including functional security requirements and non-functional security requirements derived from risk assessment.'),
                ('A.8.27', 'Secure system architecture and engineering principles',
                 'Principles for engineering secure systems shall be established, documented, maintained, and applied to any information system implementation activities, including defense in depth, least privilege, and secure defaults.'),
                ('A.8.28', 'Secure coding',
                 'Secure coding principles shall be applied to software development to prevent common vulnerabilities such as injection, broken authentication, insecure deserialization, and security misconfigurations, following recognized secure coding standards.'),
                ('A.8.29', 'Security testing in development and acceptance',
                 'Security testing processes shall be defined and implemented in the development lifecycle, including vulnerability scanning, penetration testing, code review, and user acceptance testing with security test cases.'),
                ('A.8.30', 'Outsourced development',
                 'The organization shall direct, monitor, and review the activities related to outsourced system development, ensuring that security requirements are included in contracts and that security is tested before deployment.'),
                ('A.8.31', 'Separation of development, test and production environments',
                 'Development, testing, and production environments shall be separated and access controlled to reduce the risks of unauthorized access or changes to the production environment.'),
                ('A.8.32', 'Change management',
                 'Changes to information processing facilities and information systems shall be subject to change management procedures to ensure controlled implementation, rollback capability, and that security is maintained through changes.'),
                ('A.8.33', 'Test information',
                 'Test information shall be appropriately selected, protected, and managed to ensure realistic testing without exposing sensitive production data, using anonymization, pseudonymization, or synthetic data generation techniques.'),
                ('A.8.34', 'Protection of information systems during audit testing',
                 'Audit requirements and activities involving verification of operational systems shall be carefully planned and agreed to minimize disruptions to business processes and to protect audit tools from misuse or compromise.'),
            ]),
        ]

        global_order = 2000
        for fam_id, fam_name, fam_order, requirements in FAMILIES:
            family, _ = GrcFamily.objects.update_or_create(
                framework=fw, identifier=fam_id,
                defaults={'name': fam_name, 'description': '', 'order': fam_order}
            )
            for req_id, req_title, req_statement in requirements:
                GrcControl.objects.update_or_create(
                    family=family, control_id=req_id,
                    defaults={
                        'title':       req_title,
                        'statement':   req_statement,
                        'discussion':  '',
                        'is_category': False,
                        'parent':      None,
                        'order':       global_order,
                    }
                )
                global_order += 1
        self.stdout.write(f'    ISO/IEC 27001:2022: seeded {global_order - 2000} controls')

    # ─────────────────────────────────────────────────────────────────────────
    # SOC 2 Type II (AICPA Trust Services Criteria 2017)
    # ─────────────────────────────────────────────────────────────────────────
    def _seed_soc2(self):
        fw, _ = GrcFramework.objects.update_or_create(
            key='SOC2',
            defaults={
                'name':        'SOC 2 Type II',
                'version':     '2017 TSC',
                'description': (
                    'SOC 2 Type II is an AICPA auditing standard based on the Trust Services Criteria (TSC). '
                    'It evaluates controls relevant to security, availability, processing integrity, '
                    'confidentiality, and privacy over a period of time. The Common Criteria (CC series) '
                    'apply to all engagements; additional criteria apply based on applicable trust service '
                    'categories.'
                ),
                'is_active': True,
            }
        )
        self.stdout.write(f'  Framework: {fw.name}')

        FAMILIES = [
            ('CC1', 'Control Environment', 0, [
                ('CC1.1', 'Commitment to integrity and ethical values',
                 'The entity demonstrates a commitment to integrity and ethical values. This includes establishing standards of conduct, evaluating adherence to those standards, addressing deviations in a timely manner, and communicating expectations to all service personnel including contractors and third-party personnel who provide services relevant to the system.'),
                ('CC1.2', 'Board independence and oversight',
                 'The board of directors demonstrates independence from management and exercises oversight of the development and performance of internal control. The board defines appropriate responsibilities, establishes oversight policies, and ensures that appropriate oversight is applied to the achievement of entity objectives and the performance of management.'),
                ('CC1.3', 'Organizational structure, reporting lines, and authorities',
                 'Management establishes, with board oversight, structures, reporting lines, and appropriate authorities and responsibilities in the pursuit of objectives. This includes defining roles and responsibilities, delegation of authority, and mechanisms to ensure that control responsibilities are understood and exercised throughout the organization.'),
                ('CC1.4', 'Commitment to attract, develop, and retain competent individuals',
                 'The entity demonstrates a commitment to attract, develop, and retain competent individuals in alignment with objectives. This includes establishing policies for hiring, training, mentoring, evaluating, and compensating personnel with the competencies necessary to achieve the entity\'s objectives including system security.'),
                ('CC1.5', 'Accountability for internal control responsibilities',
                 'The entity holds individuals accountable for their internal control responsibilities in the pursuit of objectives. This includes establishing performance measures, incentives, and rewards that demonstrate appropriate accountability, and taking corrective actions in response to performance shortfalls.'),
            ]),
            ('CC2', 'Communication and Information', 1, [
                ('CC2.1', 'Relevant, quality information to support internal control',
                 'The entity obtains or generates and uses relevant, quality information to support the functioning of internal control. This includes identifying information requirements, capturing information from internal and external sources, processing information into useful data, and distributing information to those who need it through appropriate channels.'),
                ('CC2.2', 'Internal communication of information',
                 'The entity internally communicates information, including objectives and responsibilities for internal control, necessary to support the functioning of internal control. Communication flows down, across, and up the entity via formal channels including policies, procedures, and meetings as well as informal channels.'),
                ('CC2.3', 'External communication of information',
                 'The entity communicates with external parties regarding matters affecting the functioning of internal control. This includes communicating to external users, service providers, auditors, and regulators, and receiving information from those external parties that may affect internal control objectives.'),
            ]),
            ('CC3', 'Risk Assessment', 2, [
                ('CC3.1', 'Specification of objectives',
                 'The entity specifies objectives with sufficient clarity to enable the identification and assessment of risks relating to objectives. This covers operations, reporting (internal and external), and compliance objectives, stated at sufficient granularity to identify risks that threaten achievement of those objectives.'),
                ('CC3.2', 'Risk identification and analysis',
                 'The entity identifies risks to the achievement of its objectives across the entity and analyzes risks as a basis for determining how the risks should be managed. Risk identification considers internal and external sources, all significant business processes, and uses both qualitative and quantitative risk assessment techniques.'),
                ('CC3.3', 'Consideration of fraud risk',
                 'The entity considers the potential for fraud in assessing risks to the achievement of objectives. This includes consideration of incentives and pressures that could lead to fraud, opportunities for fraudulent activity, and the attitudes and rationalizations that could allow individuals to commit fraud against the entity or its customers.'),
                ('CC3.4', 'Identification and assessment of significant changes',
                 'The entity identifies and assesses changes that could significantly impact the system of internal control. This includes changes in the external environment (regulatory, economic, competitive), business model changes, new systems or significant changes to existing systems, and rapid growth or contraction.'),
            ]),
            ('CC4', 'Monitoring Activities', 3, [
                ('CC4.1', 'Ongoing and separate evaluations',
                 'The entity selects, develops, and performs ongoing and/or separate evaluations to ascertain whether the components of internal control are present and functioning. Ongoing monitoring activities are built into normal operations while separate evaluations are conducted periodically by internal audit, management, or third parties.'),
                ('CC4.2', 'Evaluation and communication of deficiencies',
                 'The entity evaluates and communicates internal control deficiencies in a timely manner to those parties responsible for taking corrective action, including senior management and the board of directors as appropriate. Deficiencies are tracked through remediation and follow-up evaluations confirm that corrective actions have been taken.'),
            ]),
            ('CC5', 'Control Activities', 4, [
                ('CC5.1', 'Selection and development of control activities',
                 'The entity selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels. Control activities include both preventive and detective controls, automated and manual controls, and are selected based on cost-benefit analysis and risk priority.'),
                ('CC5.2', 'General control activities over technology',
                 'The entity also selects and develops general control activities over technology to support the achievement of objectives. This includes controls over infrastructure acquisition and maintenance, software acquisition and maintenance, security management, and technology operations that support the business processes.'),
                ('CC5.3', 'Deployment of control activities through policies and procedures',
                 'The entity deploys control activities through policies that establish what is expected and in procedures that put policies into action. Policies and procedures are formally documented, communicated to appropriate personnel, and reviewed and updated to remain current with changes in the entity\'s operations, systems, or risk environment.'),
            ]),
            ('CC6', 'Logical and Physical Access Controls', 5, [
                ('CC6.1', 'Logical access security software, infrastructure, and architectures',
                 'The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events to meet the entity\'s objectives. This includes identity and access management systems, network security architecture, encryption of data in transit and at rest, and security monitoring capabilities.'),
                ('CC6.2', 'Registration and authorization of new users',
                 'Prior to issuing system credentials and granting system access, the entity registers and authorizes new internal and external users whose access is administered by the entity. Registration requires appropriate identification of the user, formal authorization from a responsible party, and assignment of credentials using a secure provisioning process.'),
                ('CC6.3', 'Authorization, modification, and removal of access',
                 'The entity authorizes, modifies, or removes access to data, software, functions, and other protected information assets based on approved and documented access requests and changes to personnel roles, responsibilities, or employment status. Role-based access control is applied, following least-privilege principles.'),
                ('CC6.4', 'Restriction of physical access',
                 'The entity restricts physical access to facilities and protected information assets (for example, data center servers and backup media) to authorized personnel to meet the entity\'s objectives. Physical access controls include secure perimeters, electronic access control systems, visitor management, and surveillance.'),
                ('CC6.5', 'Discontinuation of logical and physical protections',
                 'The entity discontinues logical and physical protections over physical assets only after the ability to read or recover data and software from those assets has been diminished and is no longer required to meet the entity\'s objectives. This includes secure decommissioning and disposal of hardware, storage media, and cloud instances.'),
                ('CC6.6', 'Logical access security measures against external threats',
                 'The entity implements logical access security measures to protect against threats from sources outside its system boundaries. This includes firewall controls, network segmentation, intrusion detection and prevention, perimeter monitoring, and controls over remote access and external connections.'),
                ('CC6.7', 'Restriction of transmission, movement, and removal of information',
                 'The entity restricts the transmission, movement, and removal of information to authorized internal and external users and processes, and protects it during transmission against unauthorized access. Data-in-transit encryption, secure file transfer mechanisms, and data loss prevention controls are implemented.'),
                ('CC6.8', 'Prevention or detection of unauthorized or malicious software',
                 'The entity implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software. This includes endpoint protection, application whitelisting, email and web filtering, code signing, vulnerability management, and security information and event management (SIEM) capabilities.'),
            ]),
            ('CC7', 'System Operations', 6, [
                ('CC7.1', 'Detection of configuration changes and new vulnerabilities',
                 'To meet its objectives, the entity uses detection and monitoring procedures to identify (1) changes to configurations that result in the introduction of new vulnerabilities, and (2) susceptibilities to newly discovered vulnerabilities. Configuration baselines are maintained and deviations are detected through automated monitoring.'),
                ('CC7.2', 'Monitoring for anomalies',
                 'The entity monitors system components and the operation of those components for anomalies that are indicative of malicious acts, natural disasters, and errors affecting the entity\'s ability to meet its objectives; anomalies are analyzed to determine whether they represent security events requiring response.'),
                ('CC7.3', 'Evaluation of security events',
                 'The entity evaluates security events to determine whether they could or have resulted in a failure of the entity to meet its objectives (security incidents) and, if so, takes actions to prevent or address such failures. Criteria for distinguishing security events from incidents are documented and consistently applied.'),
                ('CC7.4', 'Response to identified security incidents',
                 'The entity responds to identified security incidents by executing a defined incident management program to understand, contain, remediate, and communicate security incidents, as appropriate. Incident response plans are documented, tested, and updated based on lessons learned from security incidents and exercises.'),
                ('CC7.5', 'Recovery from identified security incidents',
                 'The entity identifies, develops, and implements activities to recover from identified security incidents. This includes restoration of systems and data from verified clean backups, remediation of root causes, validation that systems are functioning correctly after recovery, and return to normal operations.'),
            ]),
            ('CC8', 'Change Management', 7, [
                ('CC8.1', 'Authorization, design, development, testing, and implementation of changes',
                 'The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures to meet its objectives. The change management process ensures that only authorized and tested changes are implemented in production environments with appropriate rollback capabilities.'),
            ]),
            ('CC9', 'Risk Mitigation', 8, [
                ('CC9.1', 'Risk mitigation for business disruptions',
                 'The entity identifies, selects, and develops risk mitigation activities for risks arising from potential business disruptions. Business continuity and disaster recovery plans are documented, tested, and maintained to ensure the entity can continue to meet its objectives in the event of disruptions affecting its systems or operations.'),
                ('CC9.2', 'Risk assessment and management of vendors and business partners',
                 'The entity assesses and manages risks associated with vendors and business partners. Vendor risk management includes pre-engagement due diligence, contractual security requirements, ongoing monitoring of vendor security posture, and procedures for managing vendor incidents that could affect the entity.'),
            ]),
            ('A1', 'Availability', 9, [
                ('A1.1', 'Capacity monitoring and management',
                 'The entity maintains, monitors, and evaluates current processing capacity and use of system components (infrastructure, data, and software) to manage capacity demand and to enable the implementation of additional capacity to help meet its objectives. Capacity planning includes forecasting, thresholds, and scalability testing.'),
                ('A1.2', 'Environmental protections, backup, and recovery infrastructure',
                 'The entity authorizes, designs, develops or acquires, implements, operates, approves, maintains, and monitors environmental protections, software, data backup processes, and recovery infrastructure to meet its availability objectives. This covers redundant power, cooling, connectivity, and disaster recovery capabilities.'),
                ('A1.3', 'Testing of recovery plan procedures',
                 'The entity tests recovery plan procedures supporting system recovery to meet its availability commitments and system requirements. Recovery testing includes full disaster recovery exercises, backup restoration tests, and failover tests conducted at defined frequencies with results documented and remediation tracked.'),
            ]),
            ('C1', 'Confidentiality', 10, [
                ('C1.1', 'Identification and maintenance of confidential information',
                 'The entity identifies and maintains confidential information to meet the entity\'s objectives related to confidentiality. Confidential information is identified through classification schemes, inventories are maintained, and controls are applied throughout the information lifecycle from creation through secure disposal.'),
                ('C1.2', 'Disposal of confidential information',
                 'The entity disposes of confidential information to meet the entity\'s objectives related to confidentiality. Disposal procedures ensure that confidential information stored on physical media or in electronic systems is rendered unrecoverable using methods appropriate to the sensitivity of the information.'),
            ]),
            ('PI1', 'Processing Integrity', 11, [
                ('PI1.1', 'Relevant, quality information regarding processing objectives',
                 'The entity obtains or generates, uses, and communicates relevant, quality information regarding the objectives related to processing, including definitions of data inputs, processing rules, outputs, and error handling, to support the use of products and services. Processing integrity requirements are formally documented and verified.'),
                ('PI1.2', 'Policies and procedures over system inputs',
                 'The entity implements policies and procedures over system inputs, including controls over completeness and accuracy, to result in products, services, and reporting to meet the entity\'s objectives. Input controls include data validation, edit checks, completeness verification, and authorization of input transactions.'),
                ('PI1.3', 'Policies and procedures over system processing',
                 'The entity implements policies and procedures over system processing to result in products, services, and reporting to meet the entity\'s objectives. Processing controls include automated and manual checks that processing is complete, accurate, timely, and authorized, with error identification, investigation, and correction.'),
                ('PI1.4', 'Policies and procedures over system outputs',
                 'The entity implements policies and procedures to make available or deliver output completely, accurately, and timely in accordance with specifications to meet the entity\'s objectives. Output controls include completeness checks, reconciliation, and validation that outputs are delivered to the appropriate recipients in the correct format.'),
                ('PI1.5', 'Policies and procedures over storage of inputs and outputs',
                 'The entity implements policies and procedures to store inputs, items in processing, and outputs completely, accurately, and timely in accordance with system specifications to meet the entity\'s objectives. Storage controls ensure data integrity, version control, and that stored data is retrievable in a usable form.'),
            ]),
            ('P1', 'Privacy — Notice and Communication', 12, [
                ('P1.1', 'Notice to data subjects about privacy practices',
                 'The entity provides notice to data subjects about its privacy practices to meet the entity\'s objectives related to privacy. The notice includes the entity\'s policies and practices with respect to the nature of information collected, its use and retention, how it is disclosed and to whom, the choice and consent rights of data subjects, and how they can exercise those rights.'),
            ]),
            ('P2', 'Privacy — Choice and Consent', 13, [
                ('P2.1', 'Communication of choices and honoring of choices',
                 'The entity communicates choices available regarding the collection, use, retention, disclosure, and disposal of personal information to the data subjects and the consequences, if any, of each choice. The entity provides individuals with the ability to make choices and honors the choices made by data subjects, where applicable.'),
            ]),
            ('P3', 'Privacy — Collection', 14, [
                ('P3.1', 'Collection consistent with privacy objectives',
                 'Personal information is collected consistent with the entity\'s objectives related to privacy. Collection is limited to what is necessary for the identified purpose, collected through lawful means, with appropriate consent where required, and only from individuals who are authorized to provide it.'),
                ('P3.2', 'Explicit consent for information requiring it',
                 'For information requiring explicit consent, the entity communicates the need for such consent, as well as the consequences of a failure to provide consent, and obtains the consent prior to collection of the information to meet the entity\'s objectives related to privacy.'),
            ]),
            ('P4', 'Privacy — Use, Retention, and Disposal', 15, [
                ('P4.1', 'Use of personal information limited to identified purposes',
                 'The entity limits the use of personal information to the purposes identified in the notice and for which implicit or explicit consent has been obtained. Personal information is not used for secondary purposes without additional consent or a legal basis, and its use is monitored and controlled through access controls and usage logging.'),
                ('P4.2', 'Retention and disposal of personal information',
                 'The entity retains personal information consistent with the entity\'s objectives related to privacy and disposes of such information when it is no longer needed. Retention schedules are defined based on legal requirements and business needs, and disposal uses methods that prevent recovery of the information.'),
                ('P4.3', 'Correction of inaccuracies in personal information',
                 'The entity corrects identified inaccuracies in its collection and use of personal information in a timely manner and in accordance with its objectives related to privacy. Processes exist for data subjects to request corrections, for the entity to verify and apply corrections, and for communicating corrections to third parties who received the original data.'),
            ]),
            ('P5', 'Privacy — Access', 16, [
                ('P5.1', 'Access to personal information for data subjects',
                 'The entity grants identified and authenticated data subjects the ability to access their stored personal information for review and, upon request, provides physical or electronic copies of that information to data subjects to meet the entity\'s objectives related to privacy. Processes for subject access requests are documented and respond within required timeframes.'),
                ('P5.2', 'Correction and amendment of personal information',
                 'The entity corrects, amends, or appends personal information based on information provided by data subjects and communicates related corrections to third parties as required by the entity\'s objectives related to privacy. Corrections are documented, applied to all relevant copies of the data, and confirmation is provided to the requesting individual.'),
            ]),
            ('P6', 'Privacy — Disclosure and Notification', 17, [
                ('P6.1', 'Disclosure of personal information to third parties',
                 'The entity discloses personal information to third parties with the implicit or explicit consent of data subjects, or to meet legal or regulatory requirements, and provides safeguards where needed because of laws and regulations. Disclosures are documented and third parties receiving personal information are subject to appropriate contractual obligations.'),
                ('P6.2', 'Record of authorized disclosures',
                 'The entity creates and retains a complete, accurate, and timely record of authorized disclosures of personal information to third parties. Disclosure logs are maintained, reviewed periodically, and available to demonstrate compliance with applicable privacy requirements and to support data subject inquiries.'),
                ('P6.3', 'Notification of breaches and incidents',
                 'The entity provides notification of breaches and incidents to affected data subjects, regulators, and others as required to meet the entity\'s objectives related to privacy. Breach notification procedures include timelines, required content, and communication channels consistent with applicable legal requirements.'),
                ('P6.4', 'Privacy commitments from vendors and third parties',
                 'The entity obtains privacy commitments from vendors and other third parties who have access to personal information consistent with the entity\'s privacy commitments, objectives, and policies. Privacy terms in contracts are reviewed and updated, and compliance with those terms is periodically assessed.'),
                ('P6.5', 'Vendor commitment to notify of unauthorized disclosures',
                 'The entity obtains commitments from vendors and other third parties with access to personal information to notify the entity in the event of actual or suspected unauthorized disclosures of personal information. Contractual obligations require prompt notification, and the entity has procedures for receiving and responding to such notifications.'),
                ('P6.6', 'Prior consent before disclosing to third parties',
                 'The entity obtains prior consent from data subjects prior to disclosing personal information to third parties, unless a legal basis exists for the disclosure without consent. Consent records are maintained and disclosures without consent are documented with the applicable legal basis.'),
                ('P6.7', 'Accounting of disclosures upon request',
                 'The entity provides data subjects with an accounting of the disclosures of their personal information upon request, consistent with the entity\'s privacy commitments and applicable privacy requirements. Records of disclosures are maintained in a form that supports timely and accurate responses to subject requests.'),
            ]),
            ('P7', 'Privacy — Quality', 18, [
                ('P7.1', 'Collection and maintenance of accurate personal information',
                 'The entity collects and maintains accurate, up-to-date, complete, and relevant personal information to meet the entity\'s objectives related to privacy. Data quality controls include validation at collection, periodic reviews of stored data, processes for data subjects to report and correct inaccuracies, and reconciliation with authoritative data sources.'),
            ]),
            ('P8', 'Privacy — Monitoring and Enforcement', 19, [
                ('P8.1', 'Process for receiving, addressing, and resolving privacy inquiries',
                 'The entity implements a process for receiving, addressing, resolving, and communicating the resolution of inquiries, complaints, and disputes from data subjects, and the resolution is documented and communicated to the data subject. An escalation process exists for disputes that cannot be resolved at the first point of contact, and systemic issues identified through complaints are used to improve privacy practices.'),
            ]),
        ]

        global_order = 3000
        for fam_id, fam_name, fam_order, requirements in FAMILIES:
            family, _ = GrcFamily.objects.update_or_create(
                framework=fw, identifier=fam_id,
                defaults={'name': fam_name, 'description': '', 'order': fam_order}
            )
            for req_id, req_title, req_statement in requirements:
                GrcControl.objects.update_or_create(
                    family=family, control_id=req_id,
                    defaults={
                        'title':       req_title,
                        'statement':   req_statement,
                        'discussion':  '',
                        'is_category': False,
                        'parent':      None,
                        'order':       global_order,
                    }
                )
                global_order += 1
        self.stdout.write(f'    SOC 2 Type II: seeded {global_order - 3000} controls')

    # ─────────────────────────────────────────────────────────────────────────
    # HIPAA Security Rule (45 CFR Part 164)
    # ─────────────────────────────────────────────────────────────────────────
    def _seed_hipaa(self):
        fw, _ = GrcFramework.objects.update_or_create(
            key='HIPAA',
            defaults={
                'name':        'HIPAA Security Rule',
                'version':     '45 CFR Part 164',
                'description': (
                    'The HIPAA Security Rule (45 CFR Part 164) establishes national standards to protect '
                    'electronic protected health information (ePHI) created, received, used, or maintained '
                    'by covered entities and business associates. It requires implementation of '
                    'administrative, physical, and technical safeguards to ensure the confidentiality, '
                    'integrity, and security of ePHI.'
                ),
                'is_active': True,
            }
        )
        self.stdout.write(f'  Framework: {fw.name}')

        FAMILIES = [
            ('164.308', 'Administrative Safeguards', 0, [
                ('164.308(a)(1)',        'Security Management Process',
                 'Implement policies and procedures to prevent, detect, contain, and correct security violations, including conducting a thorough risk analysis of potential risks and vulnerabilities to ePHI, implementing security measures sufficient to reduce risks and vulnerabilities to a reasonable and appropriate level, applying appropriate sanctions against workforce members who fail to comply, and reviewing information system activity regularly.'),
                ('164.308(a)(1)(ii)(A)', 'Risk Analysis',
                 'Conduct an accurate and thorough assessment of the potential risks and vulnerabilities to the confidentiality, integrity, and availability of ePHI held by the covered entity or business associate, including identification of where ePHI is created, received, maintained, or transmitted.'),
                ('164.308(a)(1)(ii)(B)', 'Risk Management',
                 'Implement security measures sufficient to reduce risks and vulnerabilities to ePHI to a reasonable and appropriate level, prioritized based on the risk analysis, documented in a risk management plan, and regularly reviewed and updated.'),
                ('164.308(a)(1)(ii)(C)', 'Sanction Policy',
                 'Apply appropriate sanctions against workforce members who fail to comply with security policies and procedures, with a documented policy that identifies the range of sanctions and consistently applies them in proportion to the severity of the violation.'),
                ('164.308(a)(1)(ii)(D)', 'Information System Activity Review',
                 'Implement procedures to regularly review records of information system activity, such as audit logs, access reports, and security incident tracking reports, to detect unauthorized access or anomalous activity involving ePHI.'),
                ('164.308(a)(2)',        'Assigned Security Responsibility',
                 'Identify the security official who is responsible for the development and implementation of the policies and procedures required by the HIPAA Security Rule for the covered entity or business associate, with documented assignment of this role.'),
                ('164.308(a)(3)',        'Workforce Security',
                 'Implement policies and procedures to ensure that all members of its workforce have appropriate access to ePHI, and to prevent those workforce members who do not have access from obtaining access, including authorization, supervision, and termination procedures.'),
                ('164.308(a)(3)(ii)(A)', 'Authorization and/or Supervision',
                 'Implement procedures for the authorization and/or supervision of workforce members who work with ePHI or in locations where it might be accessed, including defining what constitutes authorized access and monitoring compliance.'),
                ('164.308(a)(3)(ii)(B)', 'Workforce Clearance Procedure',
                 'Implement procedures to determine that the access of a workforce member to ePHI is appropriate, including background checks, reference verification, and procedures to ensure clearance before access is granted.'),
                ('164.308(a)(3)(ii)(C)', 'Termination Procedures',
                 'Implement procedures for terminating access to ePHI when the employment of, or other arrangement with, a workforce member ends, including immediate revocation of access rights, return of devices, and notification to relevant system administrators.'),
                ('164.308(a)(4)',        'Information Access Management',
                 'Implement policies and procedures for authorizing access to ePHI, consistent with the applicable requirements of the Privacy Rule, including processes for granting access based on role and the minimum necessary standard.'),
                ('164.308(a)(4)(ii)(A)', 'Isolating Healthcare Clearinghouse Functions',
                 'If a healthcare clearinghouse is part of a larger organization, implement policies and procedures that protect ePHI of the clearinghouse from unauthorized access by the larger organization, using logical or physical separation.'),
                ('164.308(a)(4)(ii)(B)', 'Access Authorization',
                 'Implement policies and procedures for granting access to ePHI, defining who has authority to grant access, what information each role may access, and the process for requesting and approving access requests.'),
                ('164.308(a)(4)(ii)(C)', 'Access Establishment and Modification',
                 'Implement policies and procedures that, based upon the entity\'s access authorization policies, establish, document, review, and modify a user\'s right of access to a workstation, transaction, program, or process.'),
                ('164.308(a)(5)',        'Security Awareness and Training',
                 'Implement a security awareness and training program for all members of the workforce, including management, covering security reminders, protection from malicious software, log-in monitoring, and password management.'),
                ('164.308(a)(5)(ii)(A)', 'Security Reminders',
                 'Provide periodic security updates and reminders to workforce members to reinforce security awareness, including information about current threats, policy changes, and lessons learned from recent security incidents or near-misses.'),
                ('164.308(a)(5)(ii)(B)', 'Protection from Malicious Software',
                 'Implement procedures for guarding against, detecting, and reporting malicious software, including requirements for anti-malware software, restrictions on software installation, email safety, and reporting procedures for suspected infections.'),
                ('164.308(a)(5)(ii)(C)', 'Log-in Monitoring',
                 'Implement procedures for monitoring log-in attempts and reporting discrepancies, including locking accounts after repeated failed attempts, alerting on unusual login patterns, and reviewing login records for unauthorized access.'),
                ('164.308(a)(5)(ii)(D)', 'Password Management',
                 'Implement procedures for creating, changing, and safeguarding passwords, including requirements for password complexity, prohibitions on password sharing, procedures for resetting forgotten passwords, and use of password managers.'),
                ('164.308(a)(6)',        'Security Incident Procedures',
                 'Implement policies and procedures to address security incidents, including procedures for responding to and reporting security incidents, documenting incident response activities, and mitigating harmful effects of security incidents involving ePHI.'),
                ('164.308(a)(6)(ii)',    'Response and Reporting',
                 'Identify and respond to suspected or known security incidents, mitigate to the extent practicable harmful effects of security incidents that are known to the covered entity or business associate, and document security incidents and their outcomes in an incident register.'),
                ('164.308(a)(7)',        'Contingency Plan',
                 'Establish and implement as needed policies and procedures for responding to an emergency or other occurrence that damages systems that contain ePHI, including data backup, disaster recovery, emergency mode operation, testing, and applications and data criticality analysis.'),
                ('164.308(a)(7)(ii)(A)', 'Data Backup Plan',
                 'Establish and implement procedures to create and maintain retrievable exact copies of ePHI, including procedures specifying how often backups occur, where backup media is stored, how backup integrity is verified, and how backups are protected.'),
                ('164.308(a)(7)(ii)(B)', 'Disaster Recovery Plan',
                 'Establish and implement procedures to restore any loss of data in the event of fire, vandalism, system failure, or natural disaster, including recovery time objectives, recovery point objectives, and step-by-step recovery procedures for each critical system.'),
                ('164.308(a)(7)(ii)(C)', 'Emergency Mode Operation Plan',
                 'Establish and implement procedures to enable continuation of critical business processes for protection of the security of ePHI while operating in emergency mode, defining which systems and processes are critical and how security is maintained during emergencies.'),
                ('164.308(a)(7)(ii)(D)', 'Testing and Revision Procedures',
                 'Implement procedures for periodic testing and revision of contingency plans to ensure they remain current, effective, and that all personnel understand their roles, including tabletop exercises and full operational tests.'),
                ('164.308(a)(7)(ii)(E)', 'Applications and Data Criticality Analysis',
                 'Assess the relative criticality of specific applications and data in support of other contingency plan components, prioritizing recovery of the most critical systems first and ensuring that criticality assessments are regularly reviewed and updated.'),
                ('164.308(a)(8)',        'Evaluation',
                 'Perform a periodic technical and nontechnical evaluation, based initially upon the standards implemented under the Security Rule and subsequently in response to environmental or operational changes affecting the security of ePHI, to establish the extent to which the entity\'s security policies and procedures meet the requirements of the Security Rule.'),
                ('164.308(b)(1)',        'Business Associate Contracts and Other Arrangements',
                 'A covered entity must obtain satisfactory assurances from its business associates that they will appropriately safeguard ePHI, documented through written contracts or other arrangements that comply with the applicable requirements of the Security Rule.'),
            ]),
            ('164.310', 'Physical Safeguards', 1, [
                ('164.310(a)(1)',        'Facility Access Controls',
                 'Implement policies and procedures to limit physical access to electronic information systems and the facility in which they are housed, while ensuring that properly authorized access is allowed.'),
                ('164.310(a)(2)(i)',     'Contingency Operations',
                 'Establish and implement procedures that allow facility access in support of restoration of lost data under the disaster recovery plan and emergency mode operations plan in the event of an emergency.'),
                ('164.310(a)(2)(ii)',    'Facility Security Plan',
                 'Implement policies and procedures to safeguard the facility and the equipment therein from unauthorized physical access, tampering, and theft, including access control systems, security personnel, visitor management, and physical security assessments.'),
                ('164.310(a)(2)(iii)',   'Access Control and Validation Procedures',
                 'Implement procedures to control and validate a person\'s access to facilities based on their role or function, including visitor control procedures, and physical access controls to software programs for testing and revision.'),
                ('164.310(a)(2)(iv)',    'Maintenance Records',
                 'Implement policies and procedures to document repairs and modifications to the physical components of a facility which are related to security, such as hardware, walls, doors, and locks, to maintain an audit trail of physical security changes.'),
                ('164.310(b)',           'Workstation Use',
                 'Implement policies and procedures that specify the proper functions to be performed, the manner in which those functions are to be performed, and the physical attributes of the surroundings of a specific workstation or class of workstation that can access ePHI.'),
                ('164.310(c)',           'Workstation Security',
                 'Implement physical safeguards for all workstations that access ePHI, to restrict access to authorized users, including locks, privacy screens, cable locks, and positioning of screens to prevent shoulder surfing.'),
                ('164.310(d)(1)',        'Device and Media Controls',
                 'Implement policies and procedures that govern the receipt and removal of hardware and electronic media that contain ePHI into and out of a facility, and the movement of these items within the facility.'),
                ('164.310(d)(2)(i)',     'Disposal',
                 'Implement policies and procedures to address the final disposition of ePHI and/or the hardware or electronic media on which it is stored, using methods that render ePHI unrecoverable such as degaussing, secure wiping, or physical destruction.'),
                ('164.310(d)(2)(ii)',    'Media Re-use',
                 'Implement procedures for removal of ePHI from electronic media before the media are made available for re-use, using approved sanitization methods that ensure ePHI cannot be recovered through ordinary or extraordinary means.'),
                ('164.310(d)(2)(iii)',   'Accountability',
                 'Maintain a record of the movements of hardware and electronic media and any person responsible therefore, including logs of who moved what equipment when, and current location of all portable media containing ePHI.'),
                ('164.310(d)(2)(iv)',    'Data Backup and Storage',
                 'Create a retrievable exact copy of ePHI, when needed, before movement of equipment, ensuring that a backup exists before hardware is relocated, repaired, or decommissioned.'),
            ]),
            ('164.312', 'Technical Safeguards', 2, [
                ('164.312(a)(1)',        'Access Control',
                 'Implement technical policies and procedures for electronic information systems that maintain ePHI to allow access only to those persons or software programs that have been granted access rights as specified in 164.308(a)(4).'),
                ('164.312(a)(2)(i)',     'Unique User Identification',
                 'Assign a unique name and/or number for identifying and tracking user identity in information systems that access ePHI, ensuring that actions can be attributed to specific individuals and shared accounts are prohibited.'),
                ('164.312(a)(2)(ii)',    'Emergency Access Procedure',
                 'Establish and implement as needed procedures for obtaining necessary ePHI during an emergency, including break-glass procedures that allow access when normal authentication mechanisms are unavailable, with all emergency access logged and reviewed.'),
                ('164.312(a)(2)(iii)',   'Automatic Logoff',
                 'Implement electronic procedures that terminate an electronic session after a predetermined time of inactivity to prevent unauthorized access to ePHI when a workstation is left unattended.'),
                ('164.312(a)(2)(iv)',    'Encryption and Decryption',
                 'Implement a mechanism to encrypt and decrypt ePHI where deemed appropriate based on risk analysis, using approved encryption standards for data at rest on portable devices and removable media containing ePHI.'),
                ('164.312(b)',           'Audit Controls',
                 'Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use ePHI, capturing sufficient detail to detect unauthorized access, investigate incidents, and support forensic analysis.'),
                ('164.312(c)(1)',        'Integrity',
                 'Implement policies and procedures to protect ePHI from improper alteration or destruction, including controls to ensure that ePHI is not improperly modified, and to detect and respond to unauthorized modifications.'),
                ('164.312(c)(2)',        'Mechanism to Authenticate ePHI',
                 'Implement electronic mechanisms to corroborate that ePHI has not been altered or destroyed in an unauthorized manner, using checksums, digital signatures, hash values, or other integrity verification mechanisms.'),
                ('164.312(d)',           'Person or Entity Authentication',
                 'Implement procedures to verify that a person or entity seeking access to ePHI is the one claimed, using authentication mechanisms appropriate to the risk level, such as passwords, smart cards, biometrics, or multi-factor authentication.'),
                ('164.312(e)(1)',        'Transmission Security',
                 'Implement technical security measures to guard against unauthorized access to ePHI that is being transmitted over an electronic communications network, including encryption and integrity controls.'),
                ('164.312(e)(2)(i)',     'Integrity Controls',
                 'Implement security measures to ensure that electronically transmitted ePHI is not improperly modified without detection until disposed of, using message authentication codes, digital signatures, or transport layer security.'),
                ('164.312(e)(2)(ii)',    'Encryption',
                 'Implement a mechanism to encrypt ePHI in transit whenever deemed appropriate based on risk analysis, using current encryption standards such as TLS 1.2 or higher, and ensuring encryption keys are managed appropriately.'),
            ]),
            ('164.314', 'Organizational Requirements', 3, [
                ('164.314(a)(1)',        'Business Associate Contracts or Other Arrangements',
                 'A covered entity is not in compliance with the HIPAA Security Rule if the covered entity knew of a pattern of activity or practice of the business associate that constituted a material breach or violation of the business associate\'s obligation under the contract unless the covered entity took reasonable steps to cure the breach or end the violation.'),
                ('164.314(a)(2)(i)',     'Business Associate Contracts',
                 'A contract between a covered entity and a business associate must provide that the business associate will implement administrative, physical, and technical safeguards that reasonably and appropriately protect the confidentiality, integrity, and availability of ePHI that it creates, receives, maintains, or transmits on behalf of the covered entity.'),
                ('164.314(a)(2)(ii)',    'Other Arrangements',
                 'When a covered entity and its business associate are both governmental entities, the covered entity may comply with the Security Rule\'s business associate contract requirements if the business associate enters into a memorandum of understanding with the covered entity that contains terms that accomplish the objectives of the required contract.'),
                ('164.314(b)(1)',        'Requirements for Group Health Plans',
                 'A group health plan must ensure that its plan documents provide that the plan sponsor will reasonably and appropriately safeguard ePHI created, received, maintained, or transmitted to or by the plan sponsor on behalf of the group health plan.'),
                ('164.314(b)(2)',        'Plan Documents',
                 'The plan documents of the group health plan must be amended to incorporate provisions to require the plan sponsor to implement administrative, physical, and technical safeguards that reasonably and appropriately protect the confidentiality, integrity, and availability of the ePHI that it creates, receives, maintains, or transmits on behalf of the group health plan.'),
            ]),
            ('164.316', 'Policies, Procedures and Documentation', 4, [
                ('164.316(a)',           'Policies and Procedures',
                 'Implement reasonable and appropriate policies and procedures to comply with the standards, implementation specifications, or other requirements of the HIPAA Security Rule, taking into account factors such as the size, complexity, and capabilities of the covered entity or business associate.'),
                ('164.316(b)(1)',        'Documentation',
                 'Maintain the policies and procedures implemented to comply with the Security Rule in written (which may be electronic) form, and if an action, activity or assessment is required by the Security Rule to be documented, maintain a written record of the action, activity, or assessment.'),
                ('164.316(b)(2)(i)',     'Time Limit',
                 'Retain the documentation required for six years from the date of its creation or the date when it last was in effect, whichever is later, maintaining version history and ensuring documentation is retrievable throughout the retention period.'),
                ('164.316(b)(2)(ii)',    'Availability',
                 'Make documentation available to those persons responsible for implementing the procedures to which the documentation pertains, ensuring that current versions are accessible to relevant workforce members and that superseded versions are appropriately archived.'),
                ('164.316(b)(2)(iii)',   'Updates',
                 'Review documentation periodically, and update as needed, in response to environmental or operational changes affecting the security of ePHI, ensuring documentation reflects current practices, systems, and the organization\'s risk posture.'),
            ]),
        ]

        global_order = 4000
        for fam_id, fam_name, fam_order, requirements in FAMILIES:
            family, _ = GrcFamily.objects.update_or_create(
                framework=fw, identifier=fam_id,
                defaults={'name': fam_name, 'description': '', 'order': fam_order}
            )
            for req_id, req_title, req_statement in requirements:
                GrcControl.objects.update_or_create(
                    family=family, control_id=req_id,
                    defaults={
                        'title':       req_title,
                        'statement':   req_statement,
                        'discussion':  '',
                        'is_category': False,
                        'parent':      None,
                        'order':       global_order,
                    }
                )
                global_order += 1
        self.stdout.write(f'    HIPAA Security Rule: seeded {global_order - 4000} controls')

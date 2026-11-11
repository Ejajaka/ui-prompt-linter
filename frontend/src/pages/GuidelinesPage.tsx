import React, { useState } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  Lock, 
  FileText, 
  Database, 
  Globe, 
  Key, 
  Scale, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  ExternalLink
} from 'lucide-react';

interface GuidelineCategory {
  id: string;
  title: string;
  icon: any;
  description: string;
  controls: {
    name: string;
    description: string;
    remediationClause: string;
    severity: 'critical' | 'high' | 'medium';
  }[];
}

const GUIDELINES_DATA: GuidelineCategory[] = [
  {
    id: 'iam',
    title: 'Identity and Access Management (IAM)',
    icon: KeyRound,
    description: 'Ensure compute workloads, serverless runtimes, and administrative actors operate under least-privilege principles without persistent wildcard credentials.',
    controls: [
      {
        name: 'Least-Privilege Execution Roles',
        description: 'Workload execution roles must restrict actions to explicit resource ARNs rather than Resource: "*".',
        remediationClause: 'Attach a dedicated IAM role restricted to designated resource ARNs with minimal required permissions.',
        severity: 'high'
      },
      {
        name: 'No Hard-Coded Access Keys',
        description: 'Never embed AWS access keys or static credentials directly in application requests or launch configurations.',
        remediationClause: 'Use IAM instance profiles or ECS task roles for temporary credential vending.',
        severity: 'critical'
      },
      {
        name: 'IAM Permissions Boundary',
        description: 'Define maximum allowable permission boundaries on developer-managed roles.',
        remediationClause: 'Set IAM permissions boundaries to cap delegated administrator capabilities.',
        severity: 'medium'
      }
    ]
  },
  {
    id: 'network',
    title: 'Network Security & Ingress Restrictions',
    icon: ShieldCheck,
    description: 'Segment infrastructure across private VPC tiers and eliminate unauthenticated public listeners.',
    controls: [
      {
        name: 'No 0.0.0.0/0 Administrative Ingress',
        description: 'Ports 22 (SSH) and 3389 (RDP) must never accept inbound traffic from the open Internet.',
        remediationClause: 'Eliminate direct SSH/RDP ingress; mandate AWS Systems Manager (SSM) Session Manager or corporate VPN CIDR.',
        severity: 'critical'
      },
      {
        name: 'Multi-Tier VPC Subnetting',
        description: 'Separate public ingress, application compute, and persistence layers into distinct private subnets.',
        remediationClause: 'Deploy backend workloads and databases in private subnets without public IPv4 assignments.',
        severity: 'high'
      },
      {
        name: 'TLS / HTTPS Ingress Termination',
        description: 'All public web ingress must terminate on HTTPS with modern TLS 1.3 protocol enforcement.',
        remediationClause: 'Configure Application Load Balancer with ACM SSL/TLS certificates and automatic HTTP-to-HTTPS redirect.',
        severity: 'high'
      }
    ]
  },
  {
    id: 'data-protection',
    title: 'Data Protection & Encryption',
    icon: Lock,
    description: 'Protect application data at rest on object storage, block volumes, and managed databases using customer-managed KMS keys.',
    controls: [
      {
        name: 'S3 Default Encryption at Rest',
        description: 'Enforce server-side encryption for all uploaded objects and bucket contents.',
        remediationClause: 'Configure default SSE-KMS or SSE-S3 encryption across all S3 buckets.',
        severity: 'high'
      },
      {
        name: 'S3 Block Public Access Enforcement',
        description: 'Prevent accidental public bucket exposure via bucket policies or ACLs.',
        remediationClause: 'Enable all four S3 Block Public Access settings at the bucket and account level.',
        severity: 'critical'
      },
      {
        name: 'RDS Storage Volume Encryption',
        description: 'Encrypt persistent database storage disks and automated snapshot backups.',
        remediationClause: 'Enable AWS KMS storage encryption on Amazon RDS and Aurora clusters at creation.',
        severity: 'high'
      }
    ]
  },
  {
    id: 'logging',
    title: 'Logging, Audit Trails & Monitoring',
    icon: FileText,
    description: 'Establish comprehensive forensic auditability and anomaly alerts across management and data events.',
    controls: [
      {
        name: 'Multi-Region AWS CloudTrail',
        description: 'Record all management events across all AWS regions to detect credential abuse.',
        remediationClause: 'Enable multi-region AWS CloudTrail with log file validation and KMS encryption.',
        severity: 'high'
      },
      {
        name: 'S3 Server Access Logging',
        description: 'Capture detailed requester records for bucket operations and data access.',
        remediationClause: 'Route S3 server access logs to a centralized, write-once audit log archive bucket.',
        severity: 'medium'
      },
      {
        name: 'VPC Flow Logs',
        description: 'Record IP traffic flow information for network interfaces within your VPC.',
        remediationClause: 'Enable VPC Flow Logs delivering to CloudWatch Logs or S3 for network anomaly detection.',
        severity: 'medium'
      }
    ]
  },
  {
    id: 'backup',
    title: 'Resilience, Backup & Recovery',
    icon: Database,
    description: 'Implement high-availability replication, automated snapshots, and deletion safeguards.',
    controls: [
      {
        name: 'RDS Multi-AZ High Availability',
        description: 'Maintain synchronous standby replicas across distinct availability zones for automatic failover.',
        remediationClause: 'Enable Multi-AZ deployment for production database instances.',
        severity: 'medium'
      },
      {
        name: 'S3 Versioning & Lifecycle Rules',
        description: 'Safeguard objects against accidental deletion or ransomware overwrites.',
        remediationClause: 'Enable S3 Versioning with lifecycle rules to transition aged versions to Glacier.',
        severity: 'medium'
      }
    ]
  },
  {
    id: 'exposure',
    title: 'Infrastructure Exposure & Public Gateways',
    icon: Globe,
    description: 'Restrict Internet-facing surface areas and route public requests through protective edge layers.',
    controls: [
      {
        name: 'CloudFront Origin Access Control (OAC)',
        description: 'Direct S3 access should be blocked; allow retrieval exclusively through CloudFront CDN.',
        remediationClause: 'Enforce CloudFront Origin Access Control (OAC) on S3 origin buckets.',
        severity: 'high'
      },
      {
        name: 'AWS WAF on Public Endpoints',
        description: 'Protect public ALB and API Gateway entrypoints against common OWASP web exploits.',
        remediationClause: 'Attach AWS WAF WebACL with AWS Managed Rules (Core Rule Set and Known Bad Inputs).',
        severity: 'high'
      }
    ]
  },
  {
    id: 'secrets',
    title: 'Secrets Management & Credential Safety',
    icon: Key,
    description: 'Eliminate plaintext database passwords, API tokens, and private keys from code and configuration prompts.',
    controls: [
      {
        name: 'AWS Secrets Manager Integration',
        description: 'Store database credentials and third-party API keys in managed secret stores with automatic rotation.',
        remediationClause: 'Retrieve database credentials from AWS Secrets Manager with automated 30-day rotation.',
        severity: 'high'
      }
    ]
  },
  {
    id: 'governance',
    title: 'Governance & Compliance Baselines',
    icon: Scale,
    description: 'Align infrastructure specifications with the AWS Well-Architected Framework and CIS Benchmarks.',
    controls: [
      {
        name: 'AWS Config Continuous Evaluation',
        description: 'Continuously assess resource configurations against defined security baselines.',
        remediationClause: 'Enable AWS Config conformance packs for CIS AWS Foundations Benchmark.',
        severity: 'medium'
      }
    ]
  }
];

export const GuidelinesPage: React.FC = () => {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>('iam');

  const toggleCategory = (id: string) => {
    setExpandedCategoryId(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">
          Security Guidelines & Controls
        </h1>
        <p className="text-xs sm:text-sm text-[#737A72] mt-1">
          Reference catalog of AWS security controls, baseline checks, and remediation clauses evaluated by Vector.
        </p>
      </div>

      <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E2D8] text-xs text-[#737A72] leading-relaxed flex items-start gap-3">
        <CheckCircle2 className="w-4 h-4 text-[#49686C] shrink-0 mt-0.5" />
        <p>
          Vector enforces rule-based constraints inspired by the <strong>AWS Well-Architected Framework</strong> (Security Pillar) and <strong>CIS AWS Foundations Benchmark</strong>. Findings generated during analysis match these canonical baseline recommendations.
        </p>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {GUIDELINES_DATA.map((cat) => {
          const Icon = cat.icon;
          const isExpanded = expandedCategoryId === cat.id;

          return (
            <div
              key={cat.id}
              className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-[#FAFAF8] transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 rounded-lg bg-[#F0F5F5] text-[#49686C] shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#283638]">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-[#737A72] line-clamp-1">
                      {cat.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#737A72] hidden sm:inline-block">
                    {cat.controls.length} controls
                  </span>
                  <div className="p-1 rounded text-[#737A72]">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-[#E5E2D8] space-y-4 bg-[#FAFAF8]">
                  <p className="text-xs text-[#737A72] pt-2">
                    {cat.description}
                  </p>

                  <div className="space-y-3">
                    {cat.controls.map((ctrl, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-lg bg-[#FFFFFF] border border-[#E5E2D8] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-[#283638]">
                            {ctrl.name}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                            ctrl.severity === 'critical'
                              ? 'bg-[#FDF2F0] text-[#B94D42] border-[#F0C4BF]'
                              : ctrl.severity === 'high'
                              ? 'bg-[#FFF7ED] text-[#C96839] border-[#FED7AA]'
                              : 'bg-[#FEFCE8] text-[#856C16] border-[#FEF08A]'
                          }`}>
                            {ctrl.severity}
                          </span>
                        </div>
                        <p className="text-xs text-[#737A72]">
                          {ctrl.description}
                        </p>
                        <div className="p-2.5 rounded bg-[#F6F4EC] border border-[#E5E2D8] text-xs font-mono text-[#30494B]">
                          <span className="font-sans font-bold text-[#49686C] block text-[11px] mb-0.5">
                            Standard Remediation Clause:
                          </span>
                          &ldquo;{ctrl.remediationClause}&rdquo;
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

import {
  BookOpen,
  FileText,
  FileCheck,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { DEFAULT_DEPARTMENTS } from "@/lib/departments";

// Định nghĩa Cấu trúc Dữ liệu Tài liệu Nội bộ
export interface DocumentItem {
  id?: string; // mapped from document_id
  document_id: string;
  doc_code: string;
  doc_title: string;
  doc_type: string; // POLICY, MANUAL, SOP, WI, FORM, RECORD
  department?: string | null;
  standard?: string | null;
  current_version: string;
  status: string; // APPROVED, PENDING_APPROVAL, DRAFT, OBSOLETE
  content?: string | null;
  file_url?: string | null;
  approved_by?: string | null;
  approver_name?: string | null;
  effective_date?: string | null;
  review_due_date?: string | null;
  last_reviewed_date?: string | null;
  review_frequency_years?: number;
  drafter_name?: string | null;
  reviewer_name?: string | null;
  security_level?: string;
  created_at?: string | null;
}

// BM01-KSTL: Phiếu Yêu Cầu Xem Xét Tài Liệu
export interface DocumentChangeRequest {
  request_id: string;
  request_code: string;
  document_id?: string | null;
  doc_code: string;
  doc_title: string;
  change_type: string; // NEW, REVISION, OBSOLETE, OTHER
  department: string;
  requested_by?: string | null;
  requested_by_name: string;
  request_date: string;
  reason: string;
  proposed_content?: string | null;
  target_completion_date?: string | null;
  assigned_drafter?: string | null;
  dept_head_opinion?: string | null;
  dept_head_comment?: string | null;
  dept_head_signed_at?: string | null;
  dept_head_signer_name?: string | null;
  qa_head_opinion?: string | null;
  qa_head_comment?: string | null;
  qa_head_signed_at?: string | null;
  qa_head_signer_name?: string | null;
  director_approval?: string | null;
  director_comment?: string | null;
  director_signed_at?: string | null;
  director_signer_name?: string | null;
  status: string; // SUBMITTED, DEPT_REVIEWED, QA_REVIEWED, APPROVED, REJECTED
  created_at?: string | null;
}

// BM02-KSTL: Thông Báo Thay Đổi & Sổ Phân Phối
export interface DocumentDistribution {
  distribution_id: string;
  notice_code: string;
  document_id: string;
  doc_code: string;
  doc_title: string;
  version: string;
  effective_date: string;
  change_summary?: string | null;
  department_recipient: string;
  distribution_method: string; // PORTAL, HARDCOPY_CONTROLLED
  copy_number: number;
  distributed_by_name: string;
  distribution_date: string;
  acknowledged: boolean;
  acknowledged_by_name?: string | null;
  acknowledged_at?: string | null;
  obsolete_copy_retrieved: boolean;
  retrieval_date?: string | null;
  notes?: string | null;
  created_at?: string | null;
  superseded_action?: string | null;
  recipient_name?: string | null;
  received_date?: string | null;
}

// BM04-KSTL: Danh Mục Tài Liệu Nguồn Gốc Bên Ngoài
export interface ExternalDocument {
  external_doc_id: string;
  doc_code: string;
  doc_title: string;
  category?: string; // LAW_REGULATION, STANDARD_TCVN_ISO, TECHNICAL_SPEC_CUSTOMER, INDUSTRY_GUIDELINE
  doc_type?: string; // alias
  issuing_body: string;
  published_date?: string | null;
  issue_date?: string | null; // alias
  effective_date?: string | null;
  status: string; // EFFECTIVE, EXPIRED, SUPERSEDED, ACTIVE
  superseded_by?: string | null;
  department_in_charge?: string;
  managing_department?: string; // alias
  storage_location?: string;
  review_frequency?: string;
  last_checked_date?: string | null;
  checked_by_name?: string | null;
  file_url?: string | null;
  attachment_url?: string | null; // alias
  notes?: string | null;
  created_at?: string | null;
}

// BM05-KSTL: Lịch Soát Xét Định Kỳ 3 Năm
export interface PeriodicReviewItem {
  document_id: string;
  doc_code: string;
  doc_title: string;
  doc_type: string;
  department: string;
  current_version: string;
  effective_date?: string | null;
  last_reviewed_date?: string | null;
  review_due_date?: string | null;
  days_remaining?: number | null;
  review_status: "VALID" | "DUE_SOON" | "OVERDUE";
  review_frequency_years: number;
}

// BM01/BM02-KSHS: Danh Mục Hồ Sơ Lưu Trữ & Tiêu Hủy (QT-KSHS An Giang)
export interface RecordRetention {
  retention_id: string;
  record_code: string;
  record_name: string;
  department: string;
  storage_location: string;
  retention_period: string;
  disposal_method?: string | null;
  responsible_person?: string | null;
  status: "RETAINED" | "READY_FOR_DISPOSAL" | "DISPOSED";
  disposal_date?: string | null;
  disposal_council?: string | null;
  disposal_minutes_code?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Danh sách phòng ban chuẩn hóa từ CSDL
export const DEPARTMENTS = DEFAULT_DEPARTMENTS;

// Danh sách tiêu chuẩn ATTP
export const STANDARDS = [
  "ISO 22000:2018",
  "HACCP",
  "PRP / SSOP",
  "FSSC 22000",
  "ISO 9001:2015",
  "VietGAP / GlobalGAP",
];

// Cấu hình 5 cấp tài liệu ISO 22000:2018
export const DOC_TYPES: Record<
  string,
  { label: string; level: string; color: string; bg: string; icon: any }
> = {
  POLICY: {
    label: "Chính sách",
    level: "Cấp 1",
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-500/10 border-purple-200 dark:border-purple-800",
    icon: BookOpen,
  },
  MANUAL: {
    label: "Sổ tay",
    level: "Cấp 2",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-500/10 border-blue-200 dark:border-blue-800",
    icon: FileText,
  },
  SOP: {
    label: "Quy trình (SOP)",
    level: "Cấp 3",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800",
    icon: FileCheck,
  },
  WI: {
    label: "Hướng dẫn (WI)",
    level: "Cấp 4",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10 border-amber-200 dark:border-amber-800",
    icon: FileCode,
  },
  FORM: {
    label: "Biểu mẫu",
    level: "Cấp 5",
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-500/10 border-sky-200 dark:border-sky-800",
    icon: FileSpreadsheet,
  },
  RECORD: {
    label: "Hồ sơ",
    level: "Hồ sơ",
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-500/10 border-slate-200 dark:border-slate-800",
    icon: FileText,
  },
};

// Cấu hình trạng thái tài liệu
export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  APPROVED: {
    label: "Đã phê duyệt",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  PENDING_APPROVAL: {
    label: "Chờ phê duyệt",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10 border-amber-200 dark:border-amber-800",
    icon: Clock,
  },
  DRAFT: {
    label: "Bản thảo",
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-500/10 border-slate-200 dark:border-slate-800",
    icon: Clock,
  },
  OBSOLETE: {
    label: "Hết hiệu lực",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500/10 border-rose-200 dark:border-rose-800",
    icon: AlertTriangle,
  },
};

// ==================== BẢN SỬA ĐỔI TÀI LIỆU (DOCUMENT REVISION - ISO 22000 ĐIỀU KHOẢN 7.5) ====================
export interface DocumentRevision {
  revision_id: string;
  document_id: string;
  change_request_id?: string | null;
  revision_code: string;
  version: string;
  change_description: string;
  content?: string | null;
  file_url?: string | null;
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "EFFECTIVE" | "SUPERSEDED";
  drafter_id?: string | null;
  drafter_name: string;
  reviewer_name?: string | null;
  approver_id?: string | null;
  approver_name?: string | null;
  approval_date?: string | null;
  approval_notes?: string | null;
  effective_date?: string | null;
  superseded_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const REVISION_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; badge: string }
> = {
  DRAFT: {
    label: "Bản thảo sửa đổi",
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-500/10 border-slate-200 dark:border-slate-800",
    badge: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  },
  UNDER_REVIEW: {
    label: "Đang soát xét",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10 border-amber-200 dark:border-amber-800",
    badge: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300",
  },
  APPROVED: {
    label: "Đã phê duyệt",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  EFFECTIVE: {
    label: "Hiệu lực hiện hành",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-600 text-white border-emerald-700 font-bold",
  },
  SUPERSEDED: {
    label: "Đã bị thay thế",
    color: "text-muted-foreground",
    bg: "bg-muted/50 border-border",
    badge: "bg-muted text-muted-foreground border-border line-through",
  },
  REJECTED: {
    label: "Từ chối duyệt",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500/10 border-rose-200 dark:border-rose-800",
    badge: "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300",
  },
};

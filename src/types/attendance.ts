export type AttendanceCategory =
  | "sholat_subuh"
  | "sholat_maghrib"
  | "sholat_isya"
  | "sholat_dhuhur"
  | "sholat_ashar"
  | "piket_pagi"
  | "piket_sabtu"
  | "piket_sore"
  | "baju_koko"
  | "pakaian_rapih";

export type RawStatus = "H" | "S" | "I" | "A" | "check" | "X";

export interface AttendanceRecord {
  studentName: string;
  date: string; // ISO format YYYY-MM-DD
  category: AttendanceCategory;
  rawStatus: RawStatus;
  sanctionHours: number; // 0, 1, atau 2 — dihitung dari rawStatus + category
  sourceSheetUrl: string; // buat traceability, dari link mana data ini berasal
  originalAreaOrNotes?: string;
  hasBajuKoko?: boolean; // memakai baju koko lengkap / pakaian rapih pada sholat
  isRapihPakaian?: boolean; // alias baru: santri memakai pakaian rapih (jubah+kopiah ATAU koko+sarung+kopiah)
}

export interface CategoryBreakdown {
  category: AttendanceCategory;
  categoryLabel: string;
  violationCount: number;
  hours: number;
}

export interface StudentSummary {
  studentName: string;
  totalSanctionHours: number;
  violationCount: number;
  breakdown: CategoryBreakdown[];
  records: AttendanceRecord[];
  rewardDeviceHours: number; // Akumulasi reward tambahan jam device (+1 jam/hari hingga 7 hari)
  bajuKokoEligibleDays: number; // Jumlah hari memakai pakaian rapih (baju koko atau jubah) pada sholat wajib
  netSanctionHours: number; // Sisa sanksi setelah kompensasi (total sanksi dikurangi reward)
}

export interface SheetInputItem {
  id: string;
  url: string;
  status: "idle" | "fetching" | "classifying" | "success" | "error";
  errorMessage?: string;
  detectedType?: "piket" | "sholat" | "unknown";
  detectedCategory?: AttendanceCategory;
  recordCount?: number;
  sheetTitle?: string;
}

export interface FilterOptions {
  searchQuery: string;
  startDate: string;
  endDate: string;
  categoryFilter: "all" | AttendanceCategory;
  violationFilter: "all" | "violation_only" | "clean_only";
  sortBy: "sanctionHours_desc" | "sanctionHours_asc" | "name_asc" | "violationCount_desc";
}

export interface ClassificationResult {
  sheetType: "piket" | "sholat" | "unknown";
  category: AttendanceCategory;
  confidence: number;
  reasoning: string;
  dateColumnRange?: { startIndex: number; endIndex: number };
  nameColumnIndex?: number;
  statusMapping?: Record<string, RawStatus>;
}

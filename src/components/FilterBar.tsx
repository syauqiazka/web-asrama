import React from "react";
import { Search, Calendar, Filter, X } from "lucide-react";
import { CATEGORY_LABELS } from "../services/rulesEngine";
import type { AttendanceCategory, FilterOptions } from "../types/attendance";

interface FilterBarProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  availableCategories: AttendanceCategory[];
  totalViolators?: number;
  totalStudents?: number;
}

const ALL_SYSTEM_CATEGORIES: AttendanceCategory[] = [
  "sholat_subuh",
  "sholat_maghrib",
  "sholat_isya",
  "piket_pagi",
  "piket_sabtu",
  "piket_sore",
  "sholat_dhuhur",
  "sholat_ashar",
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  availableCategories,
  totalViolators = 0,
  totalStudents = 0,
}) => {
  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      startDate: "",
      endDate: "",
      categoryFilter: "all",
      violationFilter: "violation_only", // Default: hanya pelanggar sanksi > 0j
      sortBy: "sanctionHours_desc",
    });
  };

  const handleStartDateChange = (val: string) => {
    setFilters((prev) => {
      let end = prev.endDate;
      if (val && end && val > end) {
        end = val; // auto-adjust agar tidak invalid
      }
      return { ...prev, startDate: val, endDate: end };
    });
  };

  const handleEndDateChange = (val: string) => {
    setFilters((prev) => {
      let start = prev.startDate;
      if (val && start && val < start) {
        start = val; // auto-adjust agar tidak invalid
      }
      return { ...prev, startDate: start, endDate: val };
    });
  };

  const isFiltered =
    Boolean(filters.searchQuery) ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    filters.categoryFilter !== "all" ||
    filters.violationFilter !== "violation_only";

  // Gabungkan seluruh kategori standar sistem dan kategori dinamis yang terdeteksi
  const displayedCategories = Array.from(
    new Set([...ALL_SYSTEM_CATEGORIES, ...availableCategories])
  );

  const isOnlyViolators = filters.violationFilter === "violation_only";

  return (
    <div className="filter-bar" style={{ flexWrap: "wrap", gap: "10px" }}>
      {/* Search Santri Name */}
      <div className="search-input-wrapper" style={{ minWidth: "220px", flex: "1 1 220px" }}>
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Cari nama santri..."
          value={filters.searchQuery}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
          }
        />
        {filters.searchQuery && (
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({ ...prev, searchQuery: "" }))
            }
            style={{
              position: "absolute",
              right: "10px",
              color: "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Date Range Start */}
      <div className="filter-item">
        <span className="filter-label">
          <Calendar size={13} style={{ display: "inline", marginRight: "3px" }} />
          Dari:
        </span>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          style={{ padding: "8px 10px", fontSize: "0.825rem" }}
        />
      </div>

      {/* Date Range End */}
      <div className="filter-item">
        <span className="filter-label">Sampai:</span>
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => handleEndDateChange(e.target.value)}
          style={{ padding: "8px 10px", fontSize: "0.825rem" }}
        />
        {(filters.startDate || filters.endDate) && (
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({ ...prev, startDate: "", endDate: "" }))
            }
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "2px",
            }}
            title="Hapus filter tanggal"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="filter-item">
        <span className="filter-label">Kategori:</span>
        <select
          value={filters.categoryFilter}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              categoryFilter: e.target.value as any,
            }))
          }
          style={{ padding: "8px 10px", fontSize: "0.825rem" }}
        >
          <option value="all">Semua Kategori</option>
          {displayedCategories.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat] || cat}
            </option>
          ))}
        </select>
      </div>

      {/* Switch Toggle: Hanya Santri Kena Ban vs Tampilkan Semua Santri */}
      <div
        style={{
          display: "inline-flex",
          borderRadius: "var(--radius-sm)",
          background: "rgba(15, 23, 42, 0.7)",
          border: "1px solid var(--border-subtle)",
          padding: "3px",
          gap: "2px",
        }}
      >
        <button
          type="button"
          onClick={() =>
            setFilters((prev) => ({ ...prev, violationFilter: "violation_only" }))
          }
          style={{
            fontSize: "0.775rem",
            padding: "6px 12px",
            borderRadius: "4px",
            fontWeight: isOnlyViolators ? 700 : 500,
            background: isOnlyViolators ? "rgba(244, 63, 94, 0.25)" : "transparent",
            color: isOnlyViolators ? "#fb7185" : "var(--text-secondary)",
            border: isOnlyViolators ? "1px solid rgba(244, 63, 94, 0.4)" : "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            transition: "all 0.15s ease",
          }}
          title="Tampilkan hanya santri yang memiliki sanksi jam ban (>0 jam)"
        >
          <span>🚨 Kena Ban</span>
          <span style={{ fontSize: "0.7rem", opacity: 0.85 }}>({totalViolators})</span>
        </button>

        <button
          type="button"
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              violationFilter: prev.violationFilter === "all" ? "violation_only" : "all",
            }))
          }
          style={{
            fontSize: "0.775rem",
            padding: "6px 12px",
            borderRadius: "4px",
            fontWeight: !isOnlyViolators ? 700 : 500,
            background: !isOnlyViolators ? "rgba(16, 185, 129, 0.2)" : "transparent",
            color: !isOnlyViolators ? "#34d399" : "var(--text-secondary)",
            border: !isOnlyViolators ? "1px solid rgba(16, 185, 129, 0.4)" : "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            transition: "all 0.15s ease",
          }}
          title="Tampilkan semua santri termasuk yang bersih (0 jam)"
        >
          <span>👥 Semua Santri</span>
          <span style={{ fontSize: "0.7rem", opacity: 0.85 }}>({totalStudents})</span>
        </button>
      </div>

      {/* Reset Filter Button */}
      {isFiltered && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: "0.8rem", padding: "7px 12px" }}
          onClick={handleResetFilters}
          title="Reset semua filter ke kondisi awal"
        >
          <Filter size={13} /> Reset Filter
        </button>
      )}
    </div>
  );
};

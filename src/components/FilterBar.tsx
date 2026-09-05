import React from "react";
import { Search, Calendar, Filter, X } from "lucide-react";
import { CATEGORY_LABELS } from "../services/rulesEngine";
import type { AttendanceCategory, FilterOptions } from "../types/attendance";

interface FilterBarProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  availableCategories: AttendanceCategory[];
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
}) => {
  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      startDate: "",
      endDate: "",
      categoryFilter: "all",
      violationFilter: "all",
      sortBy: "sanctionHours_desc",
    });
  };

  const isFiltered =
    Boolean(filters.searchQuery) ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    filters.categoryFilter !== "all" ||
    filters.violationFilter !== "all";

  // Gabungkan seluruh kategori standar sistem dan kategori dinamis yang terdeteksi
  const displayedCategories = Array.from(
    new Set([...ALL_SYSTEM_CATEGORIES, ...availableCategories])
  );

  return (
    <div className="filter-bar">
      {/* Search Santri Name */}
      <div className="search-input-wrapper">
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
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, startDate: e.target.value }))
          }
          style={{ padding: "8px 10px", fontSize: "0.825rem" }}
        />
      </div>

      {/* Date Range End */}
      <div className="filter-item">
        <span className="filter-label">Sampai:</span>
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, endDate: e.target.value }))
          }
          style={{ padding: "8px 10px", fontSize: "0.825rem" }}
        />
      </div>

      {/* Category Filter - Menampilkan semua waktu sholat & piket lengkap */}
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

      {/* Violation Status Filter */}
      <div className="filter-item">
        <span className="filter-label">Status:</span>
        <select
          value={filters.violationFilter}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              violationFilter: e.target.value as any,
            }))
          }
          style={{ padding: "8px 10px", fontSize: "0.825rem" }}
        >
          <option value="all">Semua Santri</option>
          <option value="violation_only">Hanya yang Kena Sanksi (&gt; 0j)</option>
          <option value="clean_only">Santri Bebas Sanksi (0j)</option>
        </select>
      </div>

      {/* Reset Filter Button */}
      {isFiltered && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: "0.8rem", padding: "7px 12px" }}
          onClick={handleResetFilters}
          title="Reset semua filter"
        >
          <Filter size={13} /> Reset Filter
        </button>
      )}
    </div>
  );
};

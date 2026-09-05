import React from "react";
import {
  Users,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import type { StudentSummary } from "../types/attendance";

interface StatsOverviewProps {
  summaries: StudentSummary[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ summaries }) => {
  const totalStudents = summaries.length;
  const violators = summaries.filter((s) => s.totalSanctionHours > 0);
  const cleanStudents = summaries.filter((s) => s.totalSanctionHours === 0);
  const totalHours = summaries.reduce(
    (acc, curr) => acc + curr.totalSanctionHours,
    0
  );

  let totalSholatHours = 0;
  let totalPiketHours = 0;

  for (const s of summaries) {
    for (const b of s.breakdown) {
      if (b.category.startsWith("sholat_")) {
        totalSholatHours += b.hours;
      } else if (b.category.startsWith("piket_")) {
        totalPiketHours += b.hours;
      }
    }
  }

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon-wrapper stat-icon-primary">
          <Users size={26} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{totalStudents}</span>
          <span className="stat-label">Total Santri Terdata</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrapper stat-icon-danger">
          <Clock size={26} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{totalHours} Jam</span>
          <span className="stat-label">Total Jam Sanksi</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrapper stat-icon-warning">
          <AlertTriangle size={26} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{violators.length} Santri</span>
          <span className="stat-label">
            Kena Sanksi ({Math.round((violators.length / (totalStudents || 1)) * 100)}%)
          </span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrapper stat-icon-accent">
          <ShieldCheck size={26} />
        </div>
        <div className="stat-content">
          <span className="stat-value">{cleanStudents.length} Santri</span>
          <span className="stat-label">
            Bebas Sanksi (Sholat {totalSholatHours}j / Piket {totalPiketHours}j)
          </span>
        </div>
      </div>
    </div>
  );
};

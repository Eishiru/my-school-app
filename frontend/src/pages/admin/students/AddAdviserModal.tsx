import React, { useMemo, useState, useEffect } from "react";
import { UserPlus, X, Search } from "lucide-react";

type Teacher = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  advisory?: any;
};

type AddAdviserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedTeacherId: number | "";
  setSelectedTeacherId: React.Dispatch<React.SetStateAction<number | "">>;
  onSubmit: (e: React.FormEvent) => void;

  availableTeachers: Teacher[];

  // exclude current adviser
  currentAdviserId?: number | null;
  currentAdviserEmail?: string | null;
  currentAdviserName?: string | null;
};

const norm = (v: unknown) => {
  if (v == null) return "";
  if (typeof v === "string") return v.trim().toLowerCase();
  if (typeof v === "number" || typeof v === "boolean") return String(v).trim().toLowerCase();
  try {
    return String(v).trim().toLowerCase();
  } catch {
    return "";
  }
};

const AddAdviserModal = ({
  isOpen,
  onClose,
  selectedTeacherId,
  setSelectedTeacherId,
  onSubmit,
  availableTeachers,
  currentAdviserId = null,
  currentAdviserEmail = null,
  currentAdviserName = null,
}: AddAdviserModalProps) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (isOpen) setQuery("");
  }, [isOpen]);

  // ✅ eligible teachers:
  // - not current adviser
  // - not adviser of other section (if advisory exists)
  const eligibleTeachers = useMemo(() => {
    const adviserEmail = norm(currentAdviserEmail);
    const adviserName = norm(currentAdviserName);

    return (Array.isArray(availableTeachers) ? availableTeachers : []).filter((t) => {
      // exclude current adviser by id
      if (currentAdviserId != null && t.id === currentAdviserId) return false;

      // exclude current adviser by email
      if (adviserEmail && norm(t.email) === adviserEmail) return false;

      // exclude current adviser by name (if you only have adviser_name string)
      if (adviserName) {
        const fullName = norm(`${t.first_name} ${t.last_name}`);
        if (fullName === adviserName) return false;
      }

      // exclude teachers who are already advisers of other sections (if field is present)
      if (t.advisory != null && norm(t.advisory) !== "" && norm(t.advisory) !== "n/a") {
        return false;
      }

      return true;
    });
  }, [availableTeachers, currentAdviserId, currentAdviserEmail, currentAdviserName]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return eligibleTeachers;

    return eligibleTeachers.filter((t) => {
      const hay = `${t.first_name} ${t.last_name} ${t.email}`.toLowerCase();
      return hay.includes(q);
    });
  }, [eligibleTeachers, query]);

  const selectedTeacher = useMemo(() => {
    if (!selectedTeacherId) return null;
    return eligibleTeachers.find((t) => t.id === selectedTeacherId) ?? null;
  }, [eligibleTeachers, selectedTeacherId]);

  // ✅ if selection becomes invalid (filtered out), reset
  useEffect(() => {
    if (!selectedTeacherId) return;
    const ok = eligibleTeachers.some((t) => t.id === selectedTeacherId);
    if (!ok) setSelectedTeacherId("");
  }, [eligibleTeachers, selectedTeacherId, setSelectedTeacherId]);

  const handlePick = (id: number) => setSelectedTeacherId(id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3 text-indigo-600">
            <UserPlus size={22} />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Assign Adviser</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedTeacher
                  ? `Selected: ${selectedTeacher.first_name} ${selectedTeacher.last_name}`
                  : "Select one teacher to become the adviser."}
              </p>
            </div>
          </div>
          <button onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 pb-3">
          <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
            Search teacher
          </label>
          <div className="flex items-center gap-2 bg-slate-50 border rounded-xl px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full bg-transparent outline-none text-sm text-slate-700"
            />
          </div>
        </div>

        {/* List */}
        <div className="px-6 pb-2">
          <div className="border rounded-xl overflow-hidden">
            <div className="max-h-72 overflow-y-auto divide-y">
              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">
                  No eligible teachers found.
                </div>
              ) : (
                filtered.map((t) => {
                  const active = selectedTeacherId === t.id;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => handlePick(t.id)}
                      className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                        active ? "bg-indigo-50" : ""
                      }`}
                    >
                      <p className="text-sm font-bold text-slate-800">
                        {t.last_name}, {t.first_name}
                      </p>
                      <p className="text-[11px] text-slate-500">{t.email}</p>
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2 bg-slate-50 text-[11px] text-slate-500">
              Teachers already assigned as advisers are hidden.
            </div>
          </div>
        </div>

        {/* Actions */}
        <form onSubmit={onSubmit} className="p-6 pt-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 font-bold text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedTeacherId}
              className={`flex-1 py-2 font-bold rounded-lg ${
                !selectedTeacherId
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              Assign Adviser
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAdviserModal;

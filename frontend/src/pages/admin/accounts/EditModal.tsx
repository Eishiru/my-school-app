import React, { useEffect, useMemo, useState } from "react";
import { X, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";

type EditModalProps = {
  isOpen: boolean;
  selectedItem: any;
  activeTab: "student" | "teacher" | "admin";
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  setSelectedItem: React.Dispatch<React.SetStateAction<any>>;
  isSaving?: boolean;
};

const DEPARTMENTS = [
  "Mathematics",
  "Science",
  "English",
  "Filipino",
  "Social Studies",
  "Computer Science",
  "Physical Education",
];

// ===== Password strength utils =====
const getPasswordScore = (pwd: string) => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++; // symbol
  return Math.min(score, 4);
};

const getStrengthLabel = (score: number) => {
  if (score <= 1) return "Weak";
  if (score === 2) return "Fair";
  if (score === 3) return "Good";
  return "Strong";
};

const getStrengthClass = (score: number) => {
  if (score <= 1) return "bg-red-500";
  if (score === 2) return "bg-yellow-500";
  if (score === 3) return "bg-blue-500";
  return "bg-green-500";
};

const EditModal = ({
  isOpen,
  selectedItem,
  activeTab,
  onClose,
  onSave,
  setSelectedItem,
  isSaving,
}: EditModalProps) => {
  if (!isOpen || !selectedItem) return null;

  // Password UX states (optional password change)
  const [changePassword, setChangePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  // Reset password UI when opening modal / switching to another user
  useEffect(() => {
    if (!isOpen) return;
    setChangePassword(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setConfirmPassword("");
    setErrors({});
    // don’t force-clear selectedItem.password here; parent logic already ignores empty/undefined
  }, [isOpen, selectedItem?.id]);

  const studentAge = useMemo(() => {
    if (!selectedItem?.birthdate) return selectedItem?.age ?? null;
    const birth = new Date(selectedItem.birthdate);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [selectedItem?.birthdate, selectedItem?.age]);

  const passwordValue = (selectedItem?.password ?? "") as string;

  const passwordScore = useMemo(() => getPasswordScore(passwordValue), [passwordValue]);
  const passwordStrengthLabel = useMemo(() => getStrengthLabel(passwordScore), [passwordScore]);

  // “Good” (3/4) is a sane admin threshold; you can set to 4 if you want symbols required.
  const isPasswordStrongEnough = passwordScore >= 3;

  const doPasswordsMatch = useMemo(() => {
    if (!changePassword) return true;
    if (!passwordValue && !confirmPassword) return false; // if opted in, must type
    return passwordValue.length > 0 && passwordValue === confirmPassword;
  }, [changePassword, passwordValue, confirmPassword]);

  const validatePasswordSection = () => {
    const next: { password?: string; confirmPassword?: string } = {};

    if (!changePassword) {
      setErrors({});
      return true;
    }

    if (!passwordValue.trim()) {
      next.password = "Please enter a new password.";
    } else if (!isPasswordStrongEnough) {
      next.password = "Password is too weak. Use 8+ chars with upper/lowercase and a number (symbol recommended).";
    }

    if (!confirmPassword.trim()) {
      next.confirmPassword = "Please re-enter the password.";
    } else if (passwordValue !== confirmPassword) {
      next.confirmPassword = "Passwords do not match.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Block submit only if password change is enabled & invalid
    const ok = validatePasswordSection();
    if (!ok) {
      return;
    }

    // If user DIDN'T opt in to password change, ensure we don't accidentally send a stale password
    if (!changePassword && selectedItem) {
      delete selectedItem.password;
    }

    onSave(e);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900">Edit Account</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {/* Name Fields */}
          <div className="flex gap-2">
            <div className="space-y-2 w-1/2">
              <label className="text-[10px] font-bold uppercase text-slate-400">
                First Name
              </label>
              <input
                required
                type="text"
                value={selectedItem.firstname}
                onChange={(e) =>
                  setSelectedItem({ ...selectedItem, firstname: e.target.value })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2 w-1/2">
              <label className="text-[10px] font-bold uppercase text-slate-400">
                Last Name
              </label>
              <input
                required
                type="text"
                value={selectedItem.lastname}
                onChange={(e) =>
                  setSelectedItem({ ...selectedItem, lastname: e.target.value })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400">
              Email
            </label>
            <input
              required
              type="email"
              value={selectedItem.email}
              onChange={(e) =>
                setSelectedItem({ ...selectedItem, email: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Conditional Fields */}
          {activeTab === "teacher" && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">
                Department
              </label>
              <select
                name="department"
                value={selectedItem.department || ""}
                onChange={(e) =>
                  setSelectedItem({ ...selectedItem, department: e.target.value })
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Select department (Optional)</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === "student" && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  Grade Level
                </label>
                <select
                  required
                  value={
                    selectedItem.gradeLevel
                      ? String(selectedItem.gradeLevel).startsWith("GRADE_")
                        ? selectedItem.gradeLevel
                        : `GRADE_${String(selectedItem.gradeLevel).replace(/\D/g, "")}`
                      : ""
                  }
                  onChange={(e) =>
                    setSelectedItem({
                      ...selectedItem,
                      gradeLevel: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Grade</option>
                  {["GRADE_7", "GRADE_8", "GRADE_9", "GRADE_10"].map((grade) => (
                    <option key={grade} value={grade}>
                      {grade.replace("GRADE_", "Grade ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">
                    Sex
                  </label>
                  <select
                    value={selectedItem.gender || ""}
                    onChange={(e) =>
                      setSelectedItem({
                        ...selectedItem,
                        gender: e.target.value,
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Sex (Optional)</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-slate-400">
                      Birthdate
                    </label>
                    {studentAge !== null && (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        Age: {studentAge} yrs
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={selectedItem.birthdate || ""}
                    onChange={(e) =>
                      setSelectedItem({
                        ...selectedItem,
                        birthdate: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-slate-700"
                  />
                </div>
              </div>
            </>
          )}

          {/* Password (optional) */}
          <div className="space-y-2">
            {!changePassword ? (
              <button
                type="button"
                onClick={() => {
                  setChangePassword(true);
                  // Start clean (prevents stale password from ever being sent)
                  setSelectedItem({ ...selectedItem, password: "" });
                  setConfirmPassword("");
                  setErrors({});
                }}
                className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-2"
              >
                <ShieldCheck size={16} />
                Change password
              </button>
            ) : (
              <>
                {/* New Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">
                    New Password
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordValue}
                      onChange={(e) => {
                        setSelectedItem({ ...selectedItem, password: e.target.value });
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      placeholder="Enter new password"
                      className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {passwordValue.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Strength</span>
                        <span
                          className={`text-xs font-medium ${
                            passwordScore <= 1
                              ? "text-red-600"
                              : passwordScore === 2
                              ? "text-yellow-600"
                              : passwordScore === 3
                              ? "text-blue-600"
                              : "text-green-600"
                          }`}
                        >
                          {passwordStrengthLabel}
                        </span>
                      </div>

                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getStrengthClass(
                            passwordScore
                          )}`}
                          style={{ width: `${(passwordScore / 4) * 100}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-500">
                        Use 8+ chars with upper/lowercase and a number (symbol recommended).
                      </p>
                    </div>
                  )}

                  {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">
                    Confirm Password
                  </label>

                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      }}
                      placeholder="Repeat new password"
                      className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                  )}

                  {confirmPassword.length > 0 && !errors.confirmPassword && (
                    <p className={`text-sm ${doPasswordsMatch ? "text-green-600" : "text-red-600"}`}>
                      {doPasswordsMatch ? "Passwords match." : "Passwords do not match."}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setChangePassword(false);
                    setSelectedItem({ ...selectedItem, password: undefined });
                    setConfirmPassword("");
                    setErrors({});
                    setShowPassword(false);
                    setShowConfirmPassword(false);
                  }}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Cancel password change
                </button>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 text-slate-600 font-semibold rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;

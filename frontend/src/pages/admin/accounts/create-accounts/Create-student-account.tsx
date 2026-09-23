import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  UserPlus,
  ShieldCheck,
  Mail,
  Fingerprint,
  User,
  GraduationCap,
  Eye,
  EyeOff,
  Upload,
  FileSpreadsheet,
  Calendar,
} from "lucide-react";
import {
  useCreateAdminUser,
  useImportStudentsExcel,
} from "../../../../hooks/useAdminData";

const CreateStudentAccountPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.state?.activeTab || "student";

  const createMutation = useCreateAdminUser();
  const importMutation = useImportStudentsExcel();

  const loading = createMutation.isPending;
  const excelLoading = importMutation.isPending;

  // show/hide toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // inline errors
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  // Excel upload state
  const [excelFile, setExcelFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    school_id: "",
    role: "STUDENT",
    grade_level: "",
    gender: "",
    birthdate: "",
  });

  const calculatedAge = useMemo(() => {
    if (!formData.birthdate) return null;
    const birth = new Date(formData.birthdate);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [formData.birthdate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    // clear inline error as user types
    if (name === "password") setErrors((prev) => ({ ...prev, password: undefined }));
    if (name === "confirmPassword") setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
  };

  // Strength: 0..4
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

  const passwordScore = useMemo(() => getPasswordScore(formData.password), [formData.password]);
  const passwordStrengthLabel = useMemo(() => getStrengthLabel(passwordScore), [passwordScore]);

  // recommend >= 3 = good enough
  const isPasswordStrongEnough = passwordScore >= 3;

  const doPasswordsMatch = useMemo(() => {
    return formData.password.length > 0 && formData.password === formData.confirmPassword;
  }, [formData.password, formData.confirmPassword]);

  // validate before submit
  const validatePasswords = () => {
    const nextErrors: { password?: string; confirmPassword?: string } = {};

    if (!isPasswordStrongEnough) {
      nextErrors.password =
        "Password is too weak. Use 8+ characters with uppercase, lowercase, number, and a symbol.";
    }

    if (formData.confirmPassword.length === 0) {
      nextErrors.confirmPassword = "Please re-enter the password.";
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswords()) return;

    try {
      await createMutation.mutateAsync({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        school_id: formData.school_id,
        student_profile: {
          grade_level: `GRADE_${formData.grade_level}`,
          gender: formData.gender || null,
          birthdate: formData.birthdate || null,
        },
        role: "STUDENT",
      });

      alert("Account created successfully!");
      navigate("/admin/accounts", { state: { activeTab } });
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Excel upload handler
  const handleExcelUpload = async () => {
    if (!excelFile) {
      alert("Please select an Excel file first.");
      return;
    }

    try {
      const form = new FormData();
      form.append("file", excelFile);

      const data = await importMutation.mutateAsync(form);

      alert(`Import done! Created: ${data.created}, Failed: ${data.failed}`);
      navigate("/admin/accounts", { state: { activeTab } });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const canSubmit = isPasswordStrongEnough && doPasswordsMatch && !loading;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Excel Import Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600" size={24} />
                Import Students (Excel)
              </h2>
              <p className="text-sm text-gray-500">
                Upload an .xlsx file with columns: email, school_id, first_name, last_name, grade_level, password
              </p>
            </div>
          </div>

          <div className="p-6 space-y-3">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white"
            />

            <button
              type="button"
              disabled={!excelFile || excelLoading}
              onClick={handleExcelUpload}
              className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all shadow-md disabled:bg-emerald-300 flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              {excelLoading ? "Uploading..." : "Upload Excel & Create Accounts"}
            </button>
          </div>
        </div>

        {/* Single Create Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="text-indigo-600" size={24} />
                Create Student Account
              </h2>
              <p className="text-sm text-gray-500">Fill in the details to register a new student.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex items-center gap-3 px-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Account Role
              </span>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                {formData.role}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User size={14} /> First Name
                </label>
                <input
                  required
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Last Name</label>
                <input
                  required
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail size={14} /> Email Address
              </label>
              <input
                required
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Fingerprint size={14} /> Student ID
                </label>
                <input
                  required
                  type="text"
                  name="school_id"
                  value={formData.school_id}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <GraduationCap size={14} /> Grade Level
                </label>
                <select
                  required
                  name="grade_level"
                  value={formData.grade_level}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="">Select Grade</option>
                  {[7, 8, 9, 10].map((grade) => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Demographic Information: Sex & Birthdate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User size={14} /> Sex
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="">Select Sex (Optional)</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Calendar size={14} /> Birthdate
                  </label>
                  {calculatedAge !== null && (
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      Age: {calculatedAge} yrs old
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-700"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <ShieldCheck size={14} /> Initial Password
              </label>

              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full p-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}

              {formData.password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Strength</span>
                    <span className="text-xs font-medium">{passwordStrengthLabel}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthClass(passwordScore)}`}
                      style={{ width: `${(passwordScore / 4) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Use 8+ chars with upper/lowercase, a number, and a symbol.
                  </p>
                </div>
              )}

              <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mt-3">
                <ShieldCheck size={14} /> Repeat Password
              </label>

              <div className="relative">
                <input
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full p-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword}</p>}

              {formData.confirmPassword.length > 0 && !errors.confirmPassword && (
                <p className={`text-sm ${doPasswordsMatch ? "text-green-600" : "text-red-600"}`}>
                  {doPasswordsMatch ? "Passwords match." : "Passwords do not match."}
                </p>
              )}
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/admin/accounts", { state: { activeTab } })}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-md disabled:bg-indigo-300"
              >
                {loading ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateStudentAccountPage;

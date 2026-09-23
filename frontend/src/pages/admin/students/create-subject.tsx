import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Users, GraduationCap, ArrowLeft } from "lucide-react";
import { useCreateAdminSection } from "../../../hooks/useAdminData";

export default function CreateSectionPage() {
  const navigate = useNavigate();
  const createMutation = useCreateAdminSection();
  const loading = createMutation.isPending;

  const [formData, setFormData] = useState({
    name: "",
    grade_level: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        grade_level: formData.grade_level,
      });

      alert("Section created successfully!");
      navigate(-1);
    } catch (err) {
      console.error(err);
      alert("Failed to create section");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="text-indigo-600" size={24} />
                Create New Section
              </h2>
              <p className="text-sm text-gray-500">Define a section.</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Section Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Grade Level */}
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
                  <option value="GRADE_7">Grade 7</option>
                  <option value="GRADE_8">Grade 8</option>
                  <option value="GRADE_9">Grade 9</option>
                  <option value="GRADE_10">Grade 10</option>
                </select>
              </div>

              {/* Section Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Users size={14} /> Section Name
                </label>
                <input
                  required
                  type="text"
                  name="name"
                  placeholder="e.g. Diamond"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            
            {/* Action Buttons */}
            <div className="pt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-md disabled:bg-indigo-300 disabled:cursor-not-allowed"
              >
                {loading ? "Creating Section..." : "Create Section"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

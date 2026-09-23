import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, ArrowLeft, Calendar, Heart, User, GraduationCap, Eye, ShieldCheck } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useStudentDetail } from "../../../hooks/useTeacherSubjects";
import { useActiveAcademicTerm } from "../../../hooks/useAdminData";
import { generateSF9PDF, formatGradeLevel, formatSectionName } from "./ExportReportCard";

type AttendanceState = {
    schoolDays: number[];
    present: number[];
    absent: number[];
};

type ObservedValuesState = {
    [semester: string]: Record<string, string[]>;
};

export default function InputReportCardData() {
    const navigate = useNavigate();
    const location = useLocation();
    const { studentId } = useParams<{ studentId: string }>();
    const sid = Number(studentId) || 0;
    const queryClient = useQueryClient();

    const { data: studentDetail } = useStudentDetail(sid, sid > 0);
    const { data: activeTerm } = useActiveAcademicTerm();
    
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const SEMESTERS = ["Semester 1", "Semester 2", "Semester 3"];
    const [activeSemester, setActiveSemester] = useState<string>("Semester 1");
    const passedStudent = (location.state as any)?.student || null;

    const [schoolYear, setSchoolYear] = useState("");
    const [name, setName] = useState("");
    const [age, setAge] = useState<number | "">("");
    const [grade, setGrade] = useState("");
    const [section, setSection] = useState("");
    const [sex, setSex] = useState("");
    const [lrn, setLrn] = useState("");
    const [hasBackendAge, setHasBackendAge] = useState(false);
    const [hasBackendSex, setHasBackendSex] = useState(false);

    const CORE_VALUES_DATA = [
        { value: "1. Maka-Diyos", statements: ["Expresses one's spiritual beliefs while respecting the spiritual beliefs of others", "Shows adherence to ethical principles by upholding truth"] },
        { value: "2. Makatao", statements: ["Is sensitive to individual, social, and cultural differences", "Demonstrates contributions toward solidarity"] },
        { value: "3. Makakalikasan", statements: ["Cares for the environment and utilizes resources wisely, judiciously, and economically"] },
        { value: "4. Makabansa", statements: ["Demonstrates pride in being a Filipino; exercises the rights and responsibilities of a Filipino citizen", "Demonstrates appropriate behavior in carrying out activities in the school, community, and country"] },
    ];

    const [observedValues, setObservedValues] = useState<ObservedValuesState>(() => {
        const initialState: ObservedValuesState = {};
        SEMESTERS.forEach((sem) => {
            initialState[sem] = Object.fromEntries(CORE_VALUES_DATA.map(c => [c.value, c.statements.map(() => "")]));
        });
        return initialState;
    });

    const [attendance, setAttendance] = useState<AttendanceState>({
        schoolDays: Array(12).fill(0),
        present: Array(12).fill(0),
        absent: Array(12).fill(0),
    });

    useEffect(() => {
        if (passedStudent) {
            setName(passedStudent.name || "");
            setLrn(passedStudent.lrn || "");
            const g = formatGradeLevel(passedStudent.grade);
            if (g) setGrade(g);
            const s = formatSectionName(passedStudent.section || passedStudent.Section);
            if (s) setSection(s);
            if (passedStudent.age != null && passedStudent.age !== "") {
                setAge(Number(passedStudent.age));
                setHasBackendAge(true);
            }
            const pSex = passedStudent.sex || passedStudent.gender;
            if (pSex) {
                const formatted = pSex.toUpperCase() === "MALE" ? "Male" : pSex.toUpperCase() === "FEMALE" ? "Female" : pSex;
                setSex(formatted);
                setHasBackendSex(true);
            }
            if (passedStudent.schoolYear) {
                setSchoolYear(passedStudent.schoolYear);
            }
        }
    }, [passedStudent]);

    useEffect(() => {
        if (activeTerm?.school_year?.name) {
            setSchoolYear(prev => (!prev || prev === "2025-2026") ? activeTerm.school_year!.name : prev);
        }
        if (activeTerm?.active_semester) {
            const semDisplay = activeTerm.active_semester.name_display ||
                (activeTerm.active_semester.name === "SEM1" ? "Semester 1" :
                 activeTerm.active_semester.name === "SEM2" ? "Semester 2" :
                 activeTerm.active_semester.name === "SEM3" ? "Semester 3" : "");
            if (semDisplay && SEMESTERS.includes(semDisplay)) {
                setActiveSemester(semDisplay);
            }
        }
    }, [activeTerm]);

    useEffect(() => {
        if (studentDetail) {
            setName(prev => prev || `${studentDetail.first_name || ""} ${studentDetail.last_name || ""}`.trim());
            setLrn(prev => prev || studentDetail.school_id || "");
            if (studentDetail.grade_level) {
                setGrade(prev => prev || formatGradeLevel(studentDetail.grade_level));
            }
            if (studentDetail.section_name) {
                setSection(prev => prev || formatSectionName(studentDetail.section_name));
            }
            if (studentDetail.age != null) {
                setAge(Number(studentDetail.age));
                setHasBackendAge(true);
            }
            const s = studentDetail.sex || studentDetail.gender;
            if (s) {
                const formatted = s.toUpperCase() === "MALE" ? "Male" : s.toUpperCase() === "FEMALE" ? "Female" : s;
                setSex(prev => prev || formatted);
                setHasBackendSex(true);
            }
        }
    }, [studentDetail]);

    const months = ["AUG", "SEPT", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JULY"];
    const totalSchoolDays = attendance.schoolDays.reduce((a, b) => a + b, 0);
    const totalPresent = attendance.present.reduce((a, b) => a + b, 0);

    const handleValueChange = (category: string, index: number, val: string) => {
        setObservedValues(prev => ({
            ...prev,
            [activeSemester]: {
                ...prev[activeSemester],
                [category]: prev[activeSemester][category].map((v, i) => (i === index ? val : v)),
            }
        }));
    };

    const handleAttendanceChange = (type: 'schoolDays' | 'present', index: number, val: string) => {
        const num = val === "" ? 0 : Math.max(0, Number(val));
        setAttendance(prev => {
            const newState = {
                schoolDays: [...prev.schoolDays],
                present: [...prev.present],
                absent: [...prev.absent],
            };
            newState[type][index] = num;
            if (type === 'schoolDays') {
                newState.present[index] = Math.min(newState.present[index], num);
            } else {
                newState.present[index] = Math.min(num, newState.schoolDays[index]);
            }
            newState.absent[index] = Math.max(0, newState.schoolDays[index] - newState.present[index]);
            return newState;
        });
    };

    const handleDirectDownload = async () => {
        setDownloading(true);
        try {
            const token = localStorage.getItem("access");
            const resolvedSY = schoolYear || activeTerm?.school_year?.name || "2026-2027";
            await generateSF9PDF({
                studentId: studentId!,
                studentInfo: {
                    name,
                    age,
                    sex,
                    grade: formatGradeLevel(grade),
                    section: formatSectionName(section),
                    lrn,
                    schoolYear: resolvedSY,
                },
                attendance,
                observedValues,
                token,
                studentDetail,
                queryClient,
            });
        } catch (err) {
            console.error("Failed to generate PDF:", err);
            alert("Error downloading report card. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    const saveToBackend = async () => {
        setLoading(true);
        const resolvedSY = schoolYear || activeTerm?.school_year?.name || "2026-2027";
        const payload = {
            studentId,
            studentInfo: {
                name,
                age,
                sex,
                grade: formatGradeLevel(grade),
                section: formatSectionName(section),
                lrn,
                schoolYear: resolvedSY,
            },
            attendance,
            observedValues,
        };
        setTimeout(() => {
            setLoading(false);
            navigate(`/teacher/advisory-class/report-card/${studentId}/sf9`, { state: payload });
        }, 200);
    };

    return (
        <div className="max-w-7xl mx-auto p-6 bg-slate-50 min-h-screen space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold text-[11px] uppercase tracking-widest">
                    <ArrowLeft size={16} /> Back to Masterlist
                </button>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-white border rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm">
                        <GraduationCap size={16} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase">S.Y.</span>
                        <input type="text" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} placeholder={activeTerm?.school_year?.name || "2026-2027"} className="w-24 text-xs font-bold focus:outline-none" />
                    </div>
                    <button
                        type="button"
                        onClick={handleDirectDownload}
                        disabled={downloading}
                        className="px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        <Download size={16} /> {downloading ? "Generating PDF..." : "Download SF9 (PDF)"}
                    </button>
                    <button
                        type="button"
                        onClick={saveToBackend}
                        disabled={loading}
                        className="px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        <Eye size={16} /> {loading ? "Opening..." : "Preview SF9"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                {/* General Profile Section */}
                <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <User size={14} className="text-indigo-500" /> Student Profile (SF9 Record)
                        </h2>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/80">
                            <ShieldCheck size={12} className="text-emerald-600" /> Official Record (Read Only)
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 relative z-10">
                        {/* Full Name */}
                        <div className="md:col-span-6 space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Full Name</label>
                            <div className="w-full bg-slate-100/70 border border-slate-200/70 p-3.5 rounded-2xl text-sm font-bold text-slate-800 select-none">
                                {name || "—"}
                            </div>
                        </div>

                        {/* LRN / ID */}
                        <div className="md:col-span-6 space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">LRN / Student ID</label>
                            <div className="w-full bg-slate-100/70 border border-slate-200/70 p-3.5 rounded-2xl text-sm font-mono font-bold text-slate-800 select-none">
                                {lrn || "—"}
                            </div>
                        </div>

                        {/* Grade Level */}
                        <div className="md:col-span-3 space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Grade Level</label>
                            <div className="w-full bg-slate-100/70 border border-slate-200/70 p-3.5 rounded-2xl text-sm font-bold text-slate-800 select-none">
                                {grade ? `Grade ${grade}` : (grade === "" ? "—" : grade)}
                            </div>
                        </div>

                        {/* Section */}
                        <div className="md:col-span-3 space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Section</label>
                            <div className="w-full bg-slate-100/70 border border-slate-200/70 p-3.5 rounded-2xl text-sm font-bold text-slate-800 select-none">
                                {section || "—"}
                            </div>
                        </div>

                        {/* Age */}
                        <div className="md:col-span-3 space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Age</label>
                            {hasBackendAge && age !== "" ? (
                                <div className="w-full bg-slate-100/70 border border-slate-200/70 p-3.5 rounded-2xl text-sm font-bold text-slate-800 select-none">
                                    {age} yrs old
                                </div>
                            ) : (
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Enter age"
                                    className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                                    value={age}
                                    onChange={e => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                                />
                            )}
                        </div>

                        {/* Sex */}
                        <div className="md:col-span-3 space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Sex</label>
                            {hasBackendSex && sex ? (
                                <div className="w-full bg-slate-100/70 border border-slate-200/70 p-3.5 rounded-2xl text-sm font-bold text-slate-800 select-none">
                                    {sex}
                                </div>
                            ) : (
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    value={sex}
                                    onChange={e => setSex(e.target.value)}
                                >
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            )}
                        </div>
                    </div>
                </section>

                {/* Attendance Section */}
                <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Calendar size={14} className="text-indigo-500" /> Attendance Record
                        </h2>
                        <div className="flex gap-6">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Present</p>
                                <p className="text-xl font-black text-emerald-500">{totalPresent}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Total Days</p>
                                <p className="text-xl font-black text-slate-900">{totalSchoolDays}</p>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto pb-2">
                        <table className="w-full border-separate border-spacing-x-1">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-300 uppercase">
                                    <th className="text-left px-2 pb-4">Metric</th>
                                    {months.map(m => <th key={m} className="w-14 pb-4">{m}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="text-xs font-black text-slate-500 uppercase py-2">School Days</td>
                                    {months.map((_, i) => (
                                        <td key={i}><input type="number" min="0" placeholder="0" className="w-14 h-10 bg-slate-50 border-none rounded-xl text-center font-bold text-xs focus:ring-2 focus:ring-indigo-500" value={attendance.schoolDays[i] === 0 ? "" : attendance.schoolDays[i]} onChange={e => handleAttendanceChange('schoolDays', i, e.target.value)} /></td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="text-xs font-black text-slate-500 uppercase py-2">Present</td>
                                    {months.map((_, i) => (
                                        <td key={i}><input type="number" min="0" placeholder="0" className="w-14 h-10 bg-indigo-50/50 text-indigo-600 border-none rounded-xl text-center font-bold text-xs focus:ring-2 focus:ring-indigo-500" value={attendance.present[i] === 0 ? "" : attendance.present[i]} onChange={e => handleAttendanceChange('present', i, e.target.value)} /></td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Core Values Section */}
                <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Heart size={14} className="text-rose-500" /> Observed Values
                        </h2>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {SEMESTERS.map((sem) => (
                                <button key={sem} onClick={() => setActiveSemester(sem)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeSemester === sem ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                                    {sem}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {CORE_VALUES_DATA.map(core => (
                            <div key={core.value} className="space-y-4">
                                <h4 className="text-[10px] font-black text-indigo-900/40 uppercase tracking-widest border-b pb-2">{core.value}</h4>
                                {core.statements.map((statement, i) => (
                                    <div key={i} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-xs text-slate-600 font-semibold mb-3 leading-relaxed">{statement}</p>
                                        <select
                                            value={observedValues[activeSemester]?.[core.value]?.[i] || ""}
                                            onChange={(e) => handleValueChange(core.value, i, e.target.value)}
                                            className="w-full bg-white border-none rounded-xl text-[11px] font-black uppercase p-2.5 shadow-sm focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                        >
                                            <option value="">No Rating</option>
                                            <option value="AO">Always Observed</option>
                                            <option value="SO">Sometimes Observed</option>
                                            <option value="RO">Rarely Observed</option>
                                            <option value="NO">Not Observed</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
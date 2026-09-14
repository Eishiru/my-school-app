import React, { useEffect, useState } from "react";
import { Download, ArrowLeft, Calendar, Heart, User, GraduationCap, Eye } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { generateSF9PDF } from "./ExportReportCard";

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
    
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const SEMESTERS = ["Semester 1", "Semester 2", "Semester 3"];
    const [activeSemester, setActiveSemester] = useState<string>("Semester 1");
    const passedStudent = (location.state as any)?.student || null;

    const [schoolYear, setSchoolYear] = useState("2025-2026");
    const [name, setName] = useState("");
    const [age, setAge] = useState<number | "">("");
    const [section, setSection] = useState("");
    const [sex, setSex] = useState("");
    const [lrn, setLrn] = useState("");

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
            setSection(passedStudent.section || passedStudent.Section || "");
            setLrn(passedStudent.lrn || "");
            setAge(passedStudent.age ?? "");
            setSex(passedStudent.sex || "");
        }
        const token = localStorage.getItem("access");
        if (token && studentId) {
            fetch(`http://127.0.0.1:8000/api/students/${studentId}/`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data) {
                    setName(prev => prev || `${data.first_name || ""} ${data.last_name || ""}`.trim());
                    setLrn(prev => prev || data.school_id || "");
                    setSection(prev => prev || data.section_name || "");
                    if (data.age != null && data.age !== "") setAge(prev => prev !== "" ? prev : data.age);
                    if (data.sex) setSex(prev => prev || data.sex);
                }
            })
            .catch(() => {});
        }
    }, [studentId, passedStudent]);

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
            await generateSF9PDF({
                studentId: studentId!,
                studentInfo: { name, age, section, sex, lrn, schoolYear },
                attendance,
                observedValues,
                token,
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
        const payload = { studentId, studentInfo: { name, age, section, sex, lrn, schoolYear }, attendance, observedValues };
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
                        <input type="text" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} className="w-20 text-xs font-bold focus:outline-none" />
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
                    <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <User size={14} className="text-indigo-500" /> General Profile
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 relative z-10">
                        <div className="md:col-span-7 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Full Name</label>
                            <input className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="md:col-span-5 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">LRN / ID</label>
                            <input className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500" value={lrn} onChange={e => setLrn(e.target.value)} />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Age</label>
                            <input type="number" className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500" value={age} onChange={e => setAge(e.target.value === "" ? "" : Number(e.target.value))} />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Sex</label>
                            <select className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 appearance-none" value={sex} onChange={e => setSex(e.target.value)}>
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                        <div className="md:col-span-7 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">Grade & Section</label>
                            <input className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500" value={section} onChange={e => setSection(e.target.value)} />
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
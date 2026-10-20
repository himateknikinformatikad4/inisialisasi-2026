"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import {
  Eye,
  Plus,
  Megaphone,
  FileSpreadsheet,
  Filter,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  GraduationCap,
  Search
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"rekap" | "presensi" | "evaluasi" | "tugas" | "pengumuman" | "manage">("rekap");

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [tasksMap, setTasksMap] = useState<{ [key: string]: any }>({});
  const [tasks, setTasks] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<{ [key: string]: boolean }>({});
  const [attendancePointsMap, setAttendancePointsMap] = useState<{ [key: string]: number }>({});
  const [attendancePenaltyMap, setAttendancePenaltyMap] = useState<{ [key: string]: boolean }>({});

  // State Filter Rekap
  const [filterCategory, setFilterCategory] = useState<"all" | "individu" | "kelompok" | "angkatan">("all");
  const [filterLateStatus, setFilterLateStatus] = useState<"all" | "ontime" | "late">("all");
  const [filterTaskTitle, setFilterTaskTitle] = useState<string>("all");
  const [filterKelompok, setFilterKelompok] = useState<string>("all");

  // State Filter Presensi & Pencarian
  const [filterAttendanceStatus, setFilterAttendanceStatus] = useState<"all" | "present" | "absent">("all");
  const [filterAttendanceKelompok, setFilterAttendanceKelompok] = useState<string>("all");
  const [attendanceFilterMode, setAttendanceFilterMode] = useState<"all" | "under80" | "above80">("all");
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState("");

  // State Filter Evaluasi Akhir
  const [filterEvalPoints, setFilterEvalPoints] = useState<"all" | "complete" | "incomplete">("all");
  const [filterEvalKelompok, setFilterEvalKelompok] = useState<string>("all");
  const GRADUATION_THRESHOLD = 2300;

  const [selectedSession, setSelectedSession] = useState<string>("pra-inisialisasi");
  const [sessionPoints, setSessionPoints] = useState<number | "">("");
  const [currentNim, setCurrentNim] = useState<string | null>(null);

  const [isEditAnnModalOpen, setIsEditAnnModalOpen] = useState(false);
  const [editAnnData, setEditAnnData] = useState<any>(null);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editTaskData, setEditTaskData] = useState<any>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const [taskId, setTaskId] = useState("");
  const [taskCategory, setTaskCategory] = useState("individu");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskRules, setTaskRules] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskPoints, setTaskPoints] = useState<number | "">(""); 
  
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [loading, setLoading] = useState(false);

  const [userNama, setUserNama] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  const listKelompok = [
    "LARAVEL", "ZEND", "SYMPHONY", "LUMEN", "SLIM", 
    "DART", "PHALCON", "FLUTTER", "LAMINAS", "FLIGHT"
  ];

  const [toast, setToast] = useState<{ show: boolean; isExpanded: boolean; message: string; subMessage: string; isError: boolean }>({
    show: false,
    isExpanded: false,
    message: "",
    subMessage: "",
    isError: false,
  });

  const triggerToast = (message: string, subMessage: string, isError: boolean = false) => {
    setToast({ show: true, isExpanded: false, message, subMessage, isError });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isExpanded: true }));
    }, 220);

    setTimeout(() => {
      setToast((prev) => ({ ...prev, isExpanded: false }));
      setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 350);
    }, 4200);
  };

  const formatInputToISO = (datetimeLocalVal: string) => {
    if (!datetimeLocalVal) return "";
    const localDate = new Date(datetimeLocalVal);
    return isNaN(localDate.getTime()) ? datetimeLocalVal : localDate.toISOString();
  };

  const formatISOToInput = (isoString: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const formatDateTimeWIB = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    return d.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).replace(/\./g, ":");
  };

  useEffect(() => {
    const nim = localStorage.getItem("user_nim");
    const savedNama = localStorage.getItem("user_nama");
    if (!nim) {
      router.push("/login");
      return;
    }

    if (savedNama) setUserNama(savedNama);
    setCurrentNim(nim);

    async function verifyAdmin() {
      const { data } = await supabase.from("users").select("role, nama").eq("nim", nim).single();
      if (!data || data.role !== "admin") {
        triggerToast("AKSES DITOLAK", "Halaman khusus Admin!", true);
        router.push("/panitia");
        return;
      }
      if (data.nama) {
        setUserNama(data.nama);
        localStorage.setItem("user_nama", data.nama);
      }
      setIsLoaded(true);
    }

    verifyAdmin();
    loadAllData().catch((err: any) => {
      triggerToast("GAGAL MEMUAT DATA", err.message || "Tidak dapat memuat data admin.", true);
    });
  }, []);

  const loadAllData = async () => {
    const [tasksRes, annRes, subRes, usersRes] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: true }),
      supabase.from("announcements").select("*").order("created_at", { ascending: true }),
      supabase.from("submissions").select("*, users(nama, nim, kelompok)").order("submitted_at", { ascending: false }),
      supabase.from("users").select("nim, nama, role, total_points, is_graduated, graduation_status, kelompok, status_keikutsertaan").neq("role", "admin").order("total_points", { ascending: false }),
    ]);

    if (tasksRes.error) throw tasksRes.error;
    if (annRes.error) throw annRes.error;
    if (subRes.error) throw subRes.error;
    if (usersRes.error) throw usersRes.error;

    const taskData = tasksRes.data;
    const annData = annRes.data;
    const subData = subRes.data;
    const userData = usersRes.data;

    if (taskData) {
      setTasks(taskData);
      const tMap: { [key: string]: any } = {};
      taskData.forEach((t) => (tMap[t.id] = t));
      setTasksMap(tMap);
    }
    if (annData) setAnnouncements(annData);
    if (subData) setSubmissions(subData);
    if (userData) setStudents(userData);
  };

  const loadAttendance = async () => {
    if (!currentNim) return;

    const { data, error } = await supabase
      .from("attendance")
      .select("user_nim, session_name, is_present, awarded_points, points_awarded")
      .eq("session_name", selectedSession);

    if (error) {
      triggerToast("GAGAL MEMUAT PRESENSI", error.message, true);
      setAttendanceRecords({});
      setAttendancePointsMap({});
      return;
    }

    const attMap: { [key: string]: boolean } = {};
    const ptsMap: { [key: string]: number } = {};

    (data || []).forEach((att) => {
      attMap[att.user_nim] = !!att.is_present;
      ptsMap[att.user_nim] = Number(att.awarded_points ?? att.points_awarded ?? 0);
    });

    setAttendanceRecords(attMap);
    setAttendancePointsMap(ptsMap);

    const { data: penaltyData, error: penaltyError } = await supabase
      .from("attendance_penalties")
      .select("kelompok")
      .eq("session_name", selectedSession);

    if (!penaltyError) {
      const penaltyMap: { [key: string]: boolean } = {};
      (penaltyData || []).forEach((item) => {
        penaltyMap[item.kelompok] = true;
      });
      setAttendancePenaltyMap(penaltyMap);
    }

    const firstPoints = (data || []).find(
      (item) => item.awarded_points !== null && item.awarded_points !== undefined
    );
    if (firstPoints) setSessionPoints(Number(firstPoints.awarded_points));
  };

  useEffect(() => {
    if (!currentNim) return;
    loadAttendance();
  }, [selectedSession, currentNim]);

  const getGroupAttendancePercentage = (kelompokName: string) => {
    // Saring hanya anggota aktif (mengabaikan user nonaktif)
    const activeMembers = students.filter(
      (s) => s.kelompok === kelompokName && s.status_keikutsertaan !== "nonaktif"
    );
    if (activeMembers.length === 0) return 100;
    const presentCount = activeMembers.filter((s) => !!attendanceRecords[s.nim]).length;
    return (presentCount / activeMembers.length) * 100;
  };

  const under80Groups = listKelompok.filter((kel) => getGroupAttendancePercentage(kel) < 80);
  const above80Groups = listKelompok.filter((kel) => getGroupAttendancePercentage(kel) >= 80);

  const recalculateUserTotalPoints = async (nim: string) => {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("kelompok")
      .eq("nim", nim)
      .single();

    if (userError || !userData) throw userError || new Error(`Mahasiswa ${nim} tidak ditemukan.`);

    const { data: taskAwards, error: taskError } = await supabase
      .from("task_awards")
      .select("awarded_points")
      .eq("user_nim", nim)
      .eq("is_validated", true);

    if (taskError) throw taskError;

    const { data: attPointsData, error: attError } = await supabase
      .from("attendance")
      .select("awarded_points, points_awarded")
      .eq("user_nim", nim);

    if (attError) throw attError;

    const { data: penalties, error: penaltyError } = await supabase
      .from("attendance_penalties")
      .select("penalty_points")
      .eq("kelompok", userData.kelompok);

    if (penaltyError) throw penaltyError;

    const totalTaskP = (taskAwards || []).reduce(
      (acc, curr) => acc + Number(curr.awarded_points || 0),
      0
    );

    const totalAttP = (attPointsData || []).reduce(
      (acc, curr) => acc + Number(curr.awarded_points ?? curr.points_awarded ?? 0),
      0
    );

    const totalPenalty = (penalties || []).reduce(
      (acc, curr) => acc + Number(curr.penalty_points || 0),
      0
    );

    const grandTotal = totalTaskP + totalAttP - totalPenalty;

    const { error: updateError } = await supabase
      .from("users")
      .update({ total_points: grandTotal })
      .eq("nim", nim);

    if (updateError) throw updateError;

    return grandTotal;
  };

  const recalculateManyUsers = async (nims: string[]) => {
    const uniqueNims = Array.from(new Set(nims.filter(Boolean)));
    for (const nim of uniqueNims) {
      await recalculateUserTotalPoints(nim);
    }
  };

  const handleAttendanceToggle = async (nim: string, currentIsPresent: boolean) => {
    const nextIsPresent = !currentIsPresent;
    const defaultPoints = Number(sessionPoints) || 375;
    const newPoints = nextIsPresent ? defaultPoints : 0;

    setAttendanceRecords((prev) => ({ ...prev, [nim]: nextIsPresent }));
    setAttendancePointsMap((prev) => ({ ...prev, [nim]: newPoints }));

    const { error } = await supabase
      .from("attendance")
      .upsert(
        {
          user_nim: nim,
          session_name: selectedSession,
          is_present: nextIsPresent,
          awarded_points: newPoints,
          points_awarded: newPoints,
        },
        { onConflict: "user_nim,session_name" }
      );

    if (error) {
      setAttendanceRecords((prev) => ({ ...prev, [nim]: currentIsPresent }));
      triggerToast("GAGAL UPDATE KEHADIRAN", error.message, true);
      return;
    }

    try {
      await recalculateUserTotalPoints(nim);
      triggerToast(
        nextIsPresent ? "DITANDAI HADIR" : "DITANDAI TIDAK HADIR",
        `${nim} berhasil diperbarui untuk sesi ${selectedSession}.`,
        false
      );
      await loadAllData();
    } catch (err: any) {
      triggerToast("TOTAL POIN GAGAL DIHITUNG", err.message, true);
    }
  };

  const handleAttendancePointsChange = async (nim: string, newPoints: number) => {
    const isPresent = newPoints > 0;

    setAttendancePointsMap((prev) => ({ ...prev, [nim]: newPoints }));
    setAttendanceRecords((prev) => ({ ...prev, [nim]: isPresent }));

    const { error } = await supabase
      .from("attendance")
      .upsert(
        {
          user_nim: nim,
          session_name: selectedSession,
          is_present: isPresent,
          awarded_points: newPoints,
          points_awarded: newPoints,
        },
        { onConflict: "user_nim,session_name" }
      );

    if (error) {
      triggerToast("GAGAL SIMPAN POIN", error.message, true);
      return;
    }

    try {
      await recalculateUserTotalPoints(nim);
      triggerToast("POIN DIPERBARUI", `Poin presensi ${nim} diset ke ${newPoints} poin!`, false);
      await loadAllData();
    } catch (err: any) {
      triggerToast("TOTAL POIN GAGAL DIHITUNG", err.message, true);
    }
  };

  const handleBatchPenalizeFilteredGroups = async () => {
    setLoading(true);

    try {
      let targetGroups = under80Groups;

      if (filterAttendanceKelompok !== "all") {
        if (getGroupAttendancePercentage(filterAttendanceKelompok) >= 80) {
          triggerToast(
            "KELOMPOK TIDAK MEMENUHI SYARAT",
            `${filterAttendanceKelompok} memiliki kehadiran ${getGroupAttendancePercentage(filterAttendanceKelompok).toFixed(0)}%. Penalti hanya untuk < 80%.`,
            true
          );
          return;
        }
        targetGroups = [filterAttendanceKelompok];
      }

      if (targetGroups.length === 0) {
        triggerToast("TIDAK ADA TARGET", "Tidak ada kelompok dengan kehadiran di bawah 80% pada sesi ini.", true);
        return;
      }

      const { data: existingPenalties, error: existingPenaltyError } = await supabase
        .from("attendance_penalties")
        .select("kelompok")
        .eq("session_name", selectedSession)
        .in("kelompok", targetGroups);

      if (existingPenaltyError) throw existingPenaltyError;

      const alreadyApplied = new Set((existingPenalties || []).map((row) => row.kelompok));
      const groupsToApply = targetGroups.filter((group) => !alreadyApplied.has(group));

      if (groupsToApply.length === 0) {
        triggerToast("SUDAH DITERAPKAN", `Penalti ${selectedSession} sudah pernah diterapkan pada kelompok target.`, true);
        return;
      }

      const penaltyRows = groupsToApply.map((kelompok) => ({
        session_name: selectedSession,
        kelompok,
        penalty_points: 10,
        attendance_percentage: getGroupAttendancePercentage(kelompok),
      }));

      const { error: insertPenaltyError } = await supabase
        .from("attendance_penalties")
        .insert(penaltyRows);

      if (insertPenaltyError) throw insertPenaltyError;

      const targetStudents = students.filter((stu) => groupsToApply.includes(stu.kelompok));
      await recalculateManyUsers(targetStudents.map((stu) => stu.nim));

      await loadAttendance();
      await loadAllData();

      triggerToast(
        "PENALTI BERHASIL",
        `-10 poin diterapkan ke seluruh anggota dari ${groupsToApply.length} kelompok yang kehadirannya di bawah 80%.`,
        false
      );
    } catch (err: any) {
      triggerToast("GAGAL PENALTI", err.message || "Terjadi kesalahan saat memproses penalti massal.", true);
    } finally {
      setLoading(false);
    }
  };

  const handleGraduationToggle = async (nim: string, currentGraduatedState: boolean) => {
    const nextState = !currentGraduatedState;
    const statusText = nextState ? "LULUS & DIKUKUHKAN" : "TIDAK LULUS";

    const { error } = await supabase
      .from("users")
      .update({
        is_graduated: nextState,
        graduation_status: statusText
      })
      .eq("nim", nim);

    if (error) {
      triggerToast("GAGAL EVALUASI", error.message, true);
    } else {
      triggerToast(
        nextState ? "MAHASISWA LULUS" : "STATUS DIBATALKAN",
        `Mahasiswa dengan NIM ${nim} dinyatakan ${statusText}!`,
        false
      );
      loadAllData();
    }
  };

  const handleAutoGraduateByThreshold = async () => {
    setLoading(true);
    try {
      const targetStudents = filterEvalKelompok === "all"
        ? students
        : students.filter((s) => s.kelompok === filterEvalKelompok);

      const qualifiedStudents = targetStudents.filter((s) => (s.total_points || 0) >= GRADUATION_THRESHOLD);
      
      for (const stu of qualifiedStudents) {
        await supabase
          .from("users")
          .update({
            is_graduated: true,
            graduation_status: "LULUS & DIKUKUHKAN"
          })
          .eq("nim", stu.nim);
      }

      triggerToast("BERHASIL", `Mahasiswa dengan poin >= ${GRADUATION_THRESHOLD} berhasil diluluskan secara otomatis!`, false);
      loadAllData();
    } catch (err: any) {
      triggerToast("GAGAL", err.message || "Terjadi kesalahan saat memproses kelulusan otomatis.", true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSessionPoints = async () => {
    const pointsVal = Number(sessionPoints) || 0;

    const { error } = await supabase
      .from("attendance")
      .update({
        awarded_points: pointsVal,
        points_awarded: pointsVal,
      })
      .eq("session_name", selectedSession)
      .eq("is_present", true);

    if (error) {
      triggerToast("GAGAL", error.message, true);
      return;
    }

    try {
      const presentStudents = students.filter((stu) => attendanceRecords[stu.nim]);
      await recalculateManyUsers(presentStudents.map((stu) => stu.nim));
      await loadAttendance();
      await loadAllData();
      triggerToast("POIN DIPERBARUI", `Berhasil mengatur ${pointsVal} poin untuk sesi ${selectedSession}!`, false);
    } catch (err: any) {
      triggerToast("TOTAL POIN GAGAL DIHITUNG", err.message, true);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("tasks").insert({
      id: taskId.trim(),
      category: taskCategory,
      title: taskTitle,
      rules: taskRules,
      deadline: formatInputToISO(taskDeadline),
      points: Number(taskPoints) || 0,
      is_active: true,
    });

    setLoading(false);
    if (error) {
      triggerToast("GAGAL TAMBAH TUGAS", error.message, true);
    } else {
      triggerToast("BERHASIL DITERBITKAN", "Tugas baru berhasil ditambahkan!", false);
      setTaskId(""); setTaskTitle(""); setTaskRules(""); setTaskDeadline(""); setTaskPoints("");
      loadAllData();
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("announcements").insert({
      title: annTitle,
      content: annContent,
      is_active: true,
    });

    setLoading(false);
    if (error) {
      triggerToast("GAGAL TERBITKAN", error.message, true);
    } else {
      triggerToast("BERHASIL DITERBITKAN", "Pengumuman resmi telah dipublikasikan!", false);
      setAnnTitle(""); setAnnContent("");
      loadAllData();
    }
  };

  const handleSaveEditAnn = async () => {
    if (!editAnnData) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("announcements")
        .update({
          title: editAnnData.title,
          content: editAnnData.content,
        })
        .eq("id", editAnnData.id);

      if (error) throw error;

      triggerToast("PERUBAHAN DISIMPAN", "Pengumuman berhasil diperbarui!", false);
      setIsEditAnnModalOpen(false);
      loadAllData();
    } catch (err: any) {
      triggerToast("GAGAL UPDATE", err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEditTask = async () => {
    if (!editTaskData) return;
    setLoading(true);

    try {
      const formattedRules = Array.isArray(editTaskData.rules)
        ? editTaskData.rules.join("\n")
        : (editTaskData.rules || "");

      const { error } = await supabase
        .from("tasks")
        .update({
          title: editTaskData.title,
          category: editTaskData.category,
          rules: formattedRules,
          deadline: formatInputToISO(editTaskData.deadline),
          points: Number(editTaskData.points) || 0,
        })
        .eq("id", editTaskData.id);

      if (error) throw error;

      triggerToast("PERUBAHAN DISIMPAN", "Tugas berhasil diperbarui!", false);
      setIsEditTaskModalOpen(false);
      loadAllData();
    } catch (err: any) {
      triggerToast("GAGAL UPDATE", err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTaskStatus = (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const actionText = nextStatus ? "mengaktifkan" : "menonaktifkan";

    setConfirmModal({
      isOpen: true,
      title: "KONFIRMASI STATUS TUGAS",
      description: `Apakah Anda yakin ingin ${actionText} tugas ${id}?`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        const { error } = await supabase
          .from("tasks")
          .update({ is_active: nextStatus })
          .eq("id", id);

        if (error) {
          triggerToast("GAGAL MENGUBAH STATUS", error.message, true);
        } else {
          triggerToast("STATUS DIPERBARUI", `Tugas ${id} berhasil di-${nextStatus ? "aktifkan" : "nonaktifkan"}!`, false);
          loadAllData();
        }
      },
    });
  };

  const handleToggleAnnStatus = (id: string, title: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const actionText = nextStatus ? "mengaktifkan" : "menonaktifkan";

    setConfirmModal({
      isOpen: true,
      title: "KONFIRMASI PENGUMUMAN",
      description: `Apakah Anda yakin ingin ${actionText} pengumuman "${title}"?`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        const { error } = await supabase
          .from("announcements")
          .update({ is_active: nextStatus })
          .eq("id", id);

        if (error) {
          triggerToast("GAGAL MENGUBAH STATUS", error.message, true);
        } else {
          triggerToast("STATUS DIPERBARUI", `Pengumuman berhasil di-${nextStatus ? "aktifkan" : "nonaktifkan"}!`, false);
          loadAllData();
        }
      },
    });
  };

  const getTaskPointOptions = (category: string, title: string) => {
    const lowerTitle = (title || "").toLowerCase();
    const isRangkuman = lowerTitle.includes("rangkuman") || lowerTitle.includes("resume");

    if (isRangkuman) {
      return [
        { label: "Tepat waktu (50)", points: 50 },
        { label: "Terlambat (30)", points: 30 },
        { label: "Revisi (25)", points: 25 },
        { label: "Telat & Revisi (20)", points: 20 },
        { label: "Tolak (0)", points: 0 }
      ];
    }

    if (category === "kelompok") {
      return [
        { label: "Tepat waktu (85)", points: 85 },
        { label: "Terlambat (70)", points: 70 },
        { label: "Revisi (60)", points: 60 },
        { label: "Telat & Revisi (35)", points: 35 },
        { label: "Tolak (0)", points: 0 }
      ];
    }

    if (category === "angkatan") {
      return [
        { label: "Tepat waktu (70)", points: 70 },
        { label: "Terlambat (60)", points: 60 },
        { label: "Tolak (0)", points: 0 }
      ];
    }

    return [
      { label: "Tepat waktu (100)", points: 100 },
      { label: "Terlambat (85)", points: 85 },
      { label: "Revisi (70)", points: 70 },
      { label: "Telat & Revisi (45)", points: 45 },
      { label: "Tolak (0)", points: 0 }
    ];
  };

  const handleTaskPointOptionChange = async (submissionId: string, targetNim: string, newPoints: number) => {
    const currentSub = submissions.find((s) => s.id === submissionId);
    if (!currentSub) {
      triggerToast("DATA TIDAK DITEMUKAN", "Submission yang dipilih tidak ditemukan.", true);
      return;
    }

    const targetTask = tasksMap[currentSub.task_id];
    const taskCat = String(targetTask?.category || "individu").toLowerCase();
    const targetKelompok = currentSub?.users?.kelompok;
    const isValidated = newPoints > 0;

    // Tentukan status teks untuk update UI & database
    let updatedStatusText = "Tolak (0)";
    if (newPoints > 0) {
      const isRangkuman = (targetTask?.title || "").toLowerCase().includes("rangkuman") || (targetTask?.title || "").toLowerCase().includes("resume");
      if (isRangkuman) {
        if (newPoints === 50) updatedStatusText = "Tepat waktu (50)";
        else if (newPoints === 30) updatedStatusText = "Terlambat (30)";
        else if (newPoints === 25) updatedStatusText = "Revisi (25)";
        else if (newPoints === 20) updatedStatusText = "Telat & Revisi (20)";
        else updatedStatusText = `Poin (${newPoints})`;
      } else if (taskCat === "kelompok") {
        if (newPoints === 85) updatedStatusText = "Tepat waktu (85)";
        else if (newPoints === 70) updatedStatusText = "Terlambat (70)";
        else if (newPoints === 60) updatedStatusText = "Revisi (60)";
        else if (newPoints === 35) updatedStatusText = "Telat & Revisi (35)";
        else updatedStatusText = `Poin (${newPoints})`;
      } else if (taskCat === "angkatan") {
        if (newPoints === 70) updatedStatusText = "Tepat waktu (70)";
        else if (newPoints === 60) updatedStatusText = "Terlambat (60)";
        else updatedStatusText = `Poin (${newPoints})`;
      } else {
        if (newPoints === 100) updatedStatusText = "Tepat waktu (100)";
        else if (newPoints === 85) updatedStatusText = "Terlambat (85)";
        else if (newPoints === 70) updatedStatusText = "Revisi (70)";
        else if (newPoints === 45) updatedStatusText = "Telat & Revisi (45)";
        else updatedStatusText = `Poin (${newPoints})`;
      }
    }

    setLoading(true);
    try {
      const { error: submissionError } = await supabase
        .from("submissions")
        .update({
          is_validated: isValidated,
          awarded_points: newPoints,
          status: updatedStatusText,
        })
        .eq("id", submissionId);

      if (submissionError) throw submissionError;

      let recipients = [{ nim: targetNim }];
      let distributionType = "individu";

      if (taskCat === "kelompok") {
        if (!targetKelompok) {
          throw new Error("Mahasiswa perwakilan belum memiliki kelompok.");
        }

        const { data, error } = await supabase
          .from("users")
          .select("nim")
          .eq("kelompok", targetKelompok)
          .neq("role", "admin")
          .neq("status_keikutsertaan", "nonaktif");

        if (error) throw error;
        recipients = data || [];
        distributionType = "kelompok";
      } else if (taskCat === "angkatan") {
        const { data, error } = await supabase
          .from("users")
          .select("nim")
          .neq("role", "admin")
          .neq("status_keikutsertaan", "nonaktif");

        if (error) throw error;
        recipients = data || [];
        distributionType = "angkatan";
      }

      const recipientNims = Array.from(new Set(recipients.map((item) => item.nim).filter(Boolean)));

      if (newPoints <= 0) {
        const { error: deleteAwardsError } = await supabase
          .from("task_awards")
          .delete()
          .eq("task_id", currentSub.task_id)
          .in("user_nim", recipientNims);

        if (deleteAwardsError) throw deleteAwardsError;
      } else {
        const awardRows = recipientNims.map((nim) => ({
          task_id: currentSub.task_id,
          user_nim: nim,
          awarded_points: newPoints,
          is_validated: true,
          source_submission_id: submissionId,
          distribution_type: distributionType,
          recorded_at: new Date().toISOString(),
        }));

        const { error: awardError } = await supabase
          .from("task_awards")
          .upsert(awardRows, { onConflict: "task_id,user_nim" });

        if (awardError) throw awardError;
      }

      await recalculateManyUsers(recipientNims);

      // PEMBARUAN STATE LOKAL INSTAN
      setSubmissions((prevSubmissions) =>
        prevSubmissions.map((sub) =>
          sub.id === submissionId
            ? { ...sub, is_validated: isValidated, awarded_points: newPoints, status: updatedStatusText }
            : sub
        )
      );

      await loadAllData();

      if (taskCat === "kelompok") {
        triggerToast(
          "DISTRIBUSI KELOMPOK",
          `Nilai ${newPoints} poin dari tugas ini dibagikan ke ${recipientNims.length} anggota ${targetKelompok}.`,
          false
        );
      } else if (taskCat === "angkatan") {
        triggerToast(
          "DISTRIBUSI ANGKATAN",
          `Nilai ${newPoints} poin dari tugas ini dibagikan ke ${recipientNims.length} mahasiswa.`,
          false
        );
      } else {
        triggerToast("POIN PENUGASAN DIUBAH", `Tugas ${targetNim} diset ke ${newPoints} poin!`, false);
      }
    } catch (err: any) {
      triggerToast("GAGAL DISTRIBUSI NILAI", err.message || "Terjadi kesalahan saat mendistribusikan nilai.", true);
    } finally {
      setLoading(false);
    }
  };

  const getCleanViewUrl = (rawUrl: string) => {
    if (!rawUrl) return "#";
    return rawUrl.includes("?") ? rawUrl.replace("download=", "view=") : `${rawUrl}?view=true`;
  };

  const processedSubmissions = submissions.map((sub) => {
    const task = tasksMap[sub.task_id];
    let isLate = false;
    let category = task?.category || "individu";
    let taskTitleDisplay = task?.title || sub.tugas_id || sub.task_id;
    let taskPointsValue = task?.points || 0;
    let userKelompok = sub.users?.kelompok || "-";

    if (task && task.deadline && sub.submitted_at) {
      isLate = new Date(sub.submitted_at) > new Date(task.deadline);
    }

    return { 
      ...sub, 
      isLate, 
      category,
      task_title: taskTitleDisplay,
      task_points: taskPointsValue,
      kelompok: userKelompok,
      displayNama: sub.nama || sub.users?.nama || "-",
      viewUrl: getCleanViewUrl(sub.file_url)
    };
  });

  const filteredSubmissions = processedSubmissions.filter((sub) => {
    let matchCat = true;
    if (filterCategory !== "all") {
      matchCat = sub.category?.toLowerCase() === filterCategory;
    }

    let matchStatus = true;
    if (filterLateStatus === "ontime") matchStatus = !sub.isLate;
    if (filterLateStatus === "late") matchStatus = sub.isLate;

    let matchTitle = true;
    if (filterTaskTitle !== "all") {
      matchTitle = sub.task_title === filterTaskTitle;
    }

    let matchKelompok = true;
    if (filterKelompok !== "all") {
      matchKelompok = sub.kelompok === filterKelompok;
    }

    return matchCat && matchStatus && matchTitle && matchKelompok;
  });

  // Filter Mahasiswa Aktif untuk Presensi (Mengabaikan Mahasiswa Nonaktif)
  const activeStudents = students.filter((stu) => stu.status_keikutsertaan !== "nonaktif");

  const filteredStudents = activeStudents.filter((stu) => {
    const isPresent = !!attendanceRecords[stu.nim];
    let matchStatus = true;
    if (filterAttendanceStatus === "present") matchStatus = isPresent;
    if (filterAttendanceStatus === "absent") matchStatus = !isPresent;

    let matchKelompok = true;
    if (filterAttendanceKelompok !== "all") {
      matchKelompok = stu.kelompok === filterAttendanceKelompok;
    }

    let matchAttendanceMode = true;
    if (attendanceFilterMode === "under80") {
      matchAttendanceMode = under80Groups.includes(stu.kelompok);
    } else if (attendanceFilterMode === "above80") {
      matchAttendanceMode = above80Groups.includes(stu.kelompok);
    }

    let matchSearch = true;
    if (attendanceSearchQuery.trim() !== "") {
      const q = attendanceSearchQuery.toLowerCase();
      const nameMatch = (stu.nama || "").toLowerCase().includes(q);
      const nimMatch = (stu.nim || "").toLowerCase().includes(q);
      matchSearch = nameMatch || nimMatch;
    }

    return matchStatus && matchKelompok && matchAttendanceMode && matchSearch;
  });

  const scopedEvaluationStudents = activeStudents.filter((stu) => {
    if (filterEvalKelompok !== "all") {
      return stu.kelompok === filterEvalKelompok;
    }
    return true;
  });

  const countCompleteEval = scopedEvaluationStudents.filter((s) => (s.total_points || 0) >= GRADUATION_THRESHOLD).length;
  const countIncompleteEval = scopedEvaluationStudents.length - countCompleteEval;

  const filteredEvaluationStudents = scopedEvaluationStudents.filter((stu) => {
    const points = stu.total_points || 0;
    if (filterEvalPoints === "complete") return points >= GRADUATION_THRESHOLD;
    if (filterEvalPoints === "incomplete") return points < GRADUATION_THRESHOLD;
    return true;
  });

  const countOntime = filteredSubmissions.filter((s) => !s.isLate).length;
  const countLate = filteredSubmissions.filter((s) => s.isLate).length;
  const countPresent = activeStudents.filter((s) => attendanceRecords[s.nim]).length;
  const countAbsent = activeStudents.length - countPresent;

  const availableTasks = filterCategory === "all" 
    ? tasks 
    : tasks.filter((t) => t.category?.toLowerCase() === filterCategory.toLowerCase());

  const uniqueTaskTitles = Array.from(
    new Set(availableTasks.map((t) => t.title).filter(Boolean))
  );

  return (
    <>
      {/* ===== DYNAMIC ISLAND TOAST NOTIFICATION ===== */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999999] flex justify-center pointer-events-none">
          <div
            className={`transition-all duration-500 ease-out bg-[#0A0A0C] border-2 ${
              toast.isError ? "border-rose-600/80 shadow-[0_0_30px_rgba(225,29,72,0.4)]" : "border-[#1B22A7] shadow-[0_0_30px_rgba(27,34,167,0.5)]"
            } text-[#FAFAFA] px-5 py-3 rounded-full flex items-center gap-3 backdrop-blur-md ${
              toast.isExpanded ? "scale-100 opacity-100 max-w-xl" : "scale-90 opacity-0 max-w-xs"
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full animate-ping shrink-0 ${
                toast.isError ? "bg-rose-500" : "bg-emerald-500"
              }`}
            />
            
            <div className="flex flex-col text-left">
              <span className="text-xs font-black tracking-wider uppercase">
                {toast.message}
              </span>
              {toast.subMessage && (
                <span className="text-[11px] text-zinc-400 font-medium leading-tight">
                  {toast.subMessage}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <Navbar />

      <div className="dashboard-container" style={{ maxWidth: "1360px", width: "100%", margin: "0 auto", padding: "1.5rem" }}>
        {/* TAB NAVIGATION */}
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-zinc-800 pb-3">
          <button
            onClick={() => setActiveTab("rekap")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "rekap" ? "bg-[#1B22A7] text-white shadow-lg shadow-[#1B22A7]/30" : "bg-zinc-900/80 text-zinc-400 hover:text-white"
            }`}
          >
            REKAP PENGUMPULAN
          </button>
          <button
            onClick={() => setActiveTab("presensi")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "presensi" ? "bg-[#1B22A7] text-white shadow-lg shadow-[#1B22A7]/30" : "bg-zinc-900/80 text-zinc-400 hover:text-white"
            }`}
          >
            INPUT PRESENSI
          </button>
          <button
            onClick={() => setActiveTab("evaluasi")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "evaluasi" ? "bg-[#1B22A7] text-white shadow-lg shadow-[#1B22A7]/30" : "bg-zinc-900/80 text-zinc-400 hover:text-white"
            }`}
          >
            EVALUASI AKHIR
          </button>
          <button
            onClick={() => setActiveTab("tugas")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "tugas" ? "bg-[#1B22A7] text-white shadow-lg shadow-[#1B22A7]/30" : "bg-zinc-900/80 text-zinc-400 hover:text-white"
            }`}
          >
            TAMBAH TUGAS
          </button>
          <button
            onClick={() => setActiveTab("pengumuman")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "pengumuman" ? "bg-[#1B22A7] text-white shadow-lg shadow-[#1B22A7]/30" : "bg-zinc-900/80 text-zinc-400 hover:text-white"
            }`}
          >
            BUAT PENGUMUMAN
          </button>
        </div>

        {/* TAB 1: REKAP PENGUMPULAN */}
        {activeTab === "rekap" && (
          <div className="bg-[#0A0A0C] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-black tracking-wide uppercase text-white">REKAP PENGUMPULAN</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  Tepat Waktu: {countOntime}
                </span>
                <span className="px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-400 text-xs font-bold">
                  Terlambat: {countLate}
                </span>
              </div>
            </div>

            {/* FILTER CONTROLS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Kategori Tugas</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="individu">Tugas Individu</option>
                  <option value="kelompok">Tugas Kelompok</option>
                  <option value="angkatan">Tugas Angkatan</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Judul Tugas</label>
                <select
                  value={filterTaskTitle}
                  onChange={(e) => setFilterTaskTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                >
                  <option value="all">Semua Judul Tugas</option>
                  {uniqueTaskTitles.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Kelompok</label>
                <select
                  value={filterKelompok}
                  onChange={(e) => setFilterKelompok(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                >
                  <option value="all">Semua Kelompok</option>
                  {listKelompok.map((kel) => (
                    <option key={kel} value={kel}>{kel}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Status Pengumpulan</label>
                <select
                  value={filterLateStatus}
                  onChange={(e) => setFilterLateStatus(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                >
                  <option value="all">Status ({filteredSubmissions.length})</option>
                  <option value="ontime">Tepat Waktu ({countOntime})</option>
                  <option value="late">Terlambat ({countLate})</option>
                </select>
              </div>
            </div>

            {/* TABEL REKAP SUBMISSION */}
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="p-3">NIM</th>
                    <th className="p-3">Nama</th>
                    <th className="p-3">Kelompok</th>
                    <th className="p-3">Judul Tugas</th>
                    <th className="p-3">Waktu Pengumpulan</th>
                    <th className="p-3 text-center">Berkas</th>
                    <th className="p-3 text-right">Validasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-zinc-500 italic">
                        Belum ada data pengumpulan tugas yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => {
                      const options = getTaskPointOptions(sub.category, sub.task_title);
                      return (
                        <tr key={sub.id} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="p-3 font-mono text-emerald-400 font-bold">{sub.nim || sub.users?.nim || "-"}</td>
                          <td className="p-3 text-white font-bold">{sub.displayNama}</td>
                          <td className="p-3 text-zinc-300 font-semibold">{sub.kelompok}</td>
                          <td className="p-3 text-indigo-300 font-bold max-w-xs">{sub.task_title}</td>
                          <td className="p-3 text-zinc-400">{formatDateTimeWIB(sub.submitted_at)}</td>
                          <td className="p-3 text-center">
                            <a
                              href={sub.viewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold underline"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </a>
                          </td>
                          <td className="p-3 text-right">
                            <select
                              value={sub.awarded_points ?? 0}
                              onChange={(e) =>
                                handleTaskPointOptionChange(
                                  sub.id,
                                  sub.nim || sub.users?.nim,
                                  Number(e.target.value)
                                )
                              }
                              className={`px-3 py-1.5 rounded-full border text-xs font-bold bg-zinc-950 focus:outline-none cursor-pointer transition-all ${
                                (sub.awarded_points ?? 0) > 0
                                  ? "border-emerald-500/50 text-emerald-400"
                                  : "border-rose-500/50 text-rose-400"
                              }`}
                            >
                              {options.map((opt) => (
                                <option key={opt.label} value={opt.points}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: INPUT PRESENSI */}
        {activeTab === "presensi" && (
          <div className="bg-[#0A0A0C] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-black tracking-wide uppercase text-white">INPUT PRESENSI</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  Hadir: {countPresent}
                </span>
                <span className="px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-400 text-xs font-bold">
                  Tidak Hadir: {countAbsent}
                </span>
              </div>
            </div>

            {/* PENCARIAN & FILTER PRESENSI */}
            <div className="mb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ketik nama lengkap atau NIM mahasiswa..."
                  value={attendanceSearchQuery}
                  onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#1B22A7]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Pilih Sesi Kehadiran</label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                >
                  <option value="pra-inisialisasi">Pra-Inisialisasi</option>
                  <option value="hari-1">Hari Ke-1</option>
                  <option value="hari-2">Hari Ke-2</option>
                  <option value="hari-3">Hari Ke-3</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Filter Kelompok</label>
                <select
                  value={filterAttendanceKelompok}
                  onChange={(e) => setFilterAttendanceKelompok(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                >
                  <option value="all">Semua Kelompok</option>
                  {listKelompok.map((kel) => (
                    <option key={kel} value={kel}>{kel}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Filter Status</label>
                <select
                  value={filterAttendanceStatus}
                  onChange={(e) => setFilterAttendanceStatus(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                >
                  <option value="all">Semua ({activeStudents.length})</option>
                  <option value="present">Hadir ({countPresent})</option>
                  <option value="absent">Tidak Hadir ({countAbsent})</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Poin Kehadiran Sesi</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={sessionPoints}
                    onChange={(e) => setSessionPoints(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="375"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#1B22A7]"
                  />
                  <button
                    onClick={handleSaveSessionPoints}
                    className="px-4 py-2 bg-[#1B22A7] hover:bg-[#151a82] text-white font-bold text-xs rounded-xl transition-all shrink-0"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>

            {/* BADGES FILTER KELOMPOK KEHADIRAN */}
            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/80">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Kehadiran Kelompok:</span>
              <button
                onClick={() => setAttendanceFilterMode("under80")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  attendanceFilterMode === "under80"
                    ? "bg-rose-950/80 border-rose-500 text-rose-400"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                di bawah 80% ({under80Groups.length})
              </button>
              <button
                onClick={() => setAttendanceFilterMode("above80")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  attendanceFilterMode === "above80"
                    ? "bg-emerald-950/80 border-emerald-500 text-emerald-400"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                di atas 80% ({above80Groups.length})
              </button>
              {attendanceFilterMode !== "all" && (
                <button
                  onClick={() => setAttendanceFilterMode("all")}
                  className="text-xs font-bold text-indigo-400 hover:underline ml-2"
                >
                  Reset Filter
                </button>
              )}

              <button
                onClick={handleBatchPenalizeFilteredGroups}
                disabled={loading}
                className="ml-auto px-4 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                Terapkan Penalti -10 Poin (di bawah80%)
              </button>
            </div>

            {/* TABEL PRESENSI MAHASISWA */}
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="p-3">NIM</th>
                    <th className="p-3">Nama</th>
                    <th className="p-3">Kelompok</th>
                    <th className="p-3 text-center">Status Kehadiran</th>
                    <th className="p-3 text-right">Poin Presensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-zinc-500 italic">
                        Tidak ada data mahasiswa aktif yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((stu) => {
                      const isPresent = !!attendanceRecords[stu.nim];
                      const pts = attendancePointsMap[stu.nim] ?? (isPresent ? Number(sessionPoints) || 375 : 0);

                      return (
                        <tr key={stu.nim} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="p-3 font-mono text-emerald-400 font-bold">{stu.nim}</td>
                          <td className="p-3 text-white font-bold">{stu.nama}</td>
                          <td className="p-3 text-zinc-300 font-semibold">{stu.kelompok}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleAttendanceToggle(stu.nim, isPresent)}
                              className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${
                                isPresent
                                  ? "bg-emerald-950/80 border border-emerald-500/50 text-emerald-400"
                                  : "bg-rose-950/80 border border-rose-500/50 text-rose-400"
                              }`}
                            >
                              {isPresent ? "Hadir" : "Tidak Hadir"}
                            </button>
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              value={pts}
                              onChange={(e) => handleAttendancePointsChange(stu.nim, Number(e.target.value))}
                              className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-right text-xs font-bold text-white focus:outline-none focus:border-[#1B22A7]"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: EVALUASI AKHIR */}
        {activeTab === "evaluasi" && (
          <div className="bg-[#0A0A0C] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-black tracking-wide uppercase text-white">EVALUASI KELULUSAN MAHASISWA</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  Lulus: {countCompleteEval}
                </span>
                <span className="px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-400 text-xs font-bold">
                  Belum Memenuhi: {countIncompleteEval}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Filter Kelompok</label>
                <select
                  value={filterEvalKelompok}
                  onChange={(e) => setFilterEvalKelompok(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                >
                  <option value="all">Semua Kelompok</option>
                  {listKelompok.map((kel) => (
                    <option key={kel} value={kel}>{kel}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Status Poin (Threshold: {GRADUATION_THRESHOLD})</label>
                <select
                  value={filterEvalPoints}
                  onChange={(e) => setFilterEvalPoints(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                >
                  <option value="all">Semua Mahasiswa ({scopedEvaluationStudents.length})</option>
                  <option value="complete">Poin Memenuhi ({countCompleteEval})</option>
                  <option value="incomplete">Poin Belum Memenuhi ({countIncompleteEval})</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAutoGraduateByThreshold}
                  disabled={loading}
                  className="w-full py-2 bg-[#1B22A7] hover:bg-[#151a82] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#1B22A7]/20 transition-all disabled:opacity-50"
                >
                  Luluskan Otomatis (&gt;= {GRADUATION_THRESHOLD} Poin)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="p-3">NIM</th>
                    <th className="p-3">Nama</th>
                    <th className="p-3">Kelompok</th>
                    <th className="p-3 text-right">Total Akumulasi Poin</th>
                    <th className="p-3 text-center">Status Kelulusan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {filteredEvaluationStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-zinc-500 italic">
                        Tidak ada data mahasiswa yang sesuai kriteria evaluasi.
                      </td>
                    </tr>
                  ) : (
                    filteredEvaluationStudents.map((stu) => {
                      const totalP = stu.total_points || 0;
                      const isGrad = !!stu.is_graduated;

                      return (
                        <tr key={stu.nim} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="p-3 font-mono text-emerald-400 font-bold">{stu.nim}</td>
                          <td className="p-3 text-white font-bold">{stu.nama}</td>
                          <td className="p-3 text-zinc-300 font-semibold">{stu.kelompok}</td>
                          <td className="p-3 text-right font-mono font-bold text-indigo-300">{totalP} Poin</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleGraduationToggle(stu.nim, isGrad)}
                              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                isGrad
                                  ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-400"
                                  : "bg-rose-950/80 border-rose-500/50 text-rose-400"
                              }`}
                            >
                              {isGrad ? "LULUS & DIKUKUHKAN" : "TIDAK LULUS"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TAMBAH TUGAS */}
        {activeTab === "tugas" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#0A0A0C] border border-zinc-800 rounded-2xl p-6 shadow-2xl h-fit">
              <div className="flex items-center gap-3 mb-6">
                <Plus className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-black tracking-wide uppercase text-white">BUAT TUGAS BARU</h2>
              </div>

              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">ID Tugas (Unique Code)</label>
                  <input
                    type="text"
                    required
                    placeholder="misal: TGS-IND-01"
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Kategori Tugas</label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                  >
                    <option value="individu">Individu</option>
                    <option value="kelompok">Kelompok</option>
                    <option value="angkatan">Angkatan</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Judul Tugas</label>
                  <input
                    type="text"
                    required
                    placeholder="Judul lengkap penugasan..."
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Aturan & Petunjuk (Pisahkan dengan baris baru)</label>
                  <textarea
                    rows={4}
                    placeholder="1. Buat file format PDF..."
                    value={taskRules}
                    onChange={(e) => setTaskRules(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Tenggat Waktu (Deadline)</label>
                  <input
                    type="datetime-local"
                    required
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Poin Maksimal</label>
                  <input
                    type="number"
                    required
                    placeholder="100"
                    value={taskPoints}
                    onChange={(e) => setTaskPoints(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#1B22A7] hover:bg-[#151a82] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#1B22A7]/20 transition-all disabled:opacity-50"
                >
                  Terbitkan Penugasan
                </button>
              </form>
            </div>

            {/* DAFTAR TUGAS KONTROL */}
            <div className="lg:col-span-2 bg-[#0A0A0C] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-lg font-black tracking-wide uppercase text-white mb-6">DAFTAR PENUGASAN AKTIF</h2>
              <div className="space-y-3">
                {tasks.map((t) => (
                  <div key={t.id} className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-400 uppercase">{t.category}</span>
                        <span className="font-mono text-xs text-emerald-400 font-bold">{t.id}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{t.title}</h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Deadline: {formatDateTimeWIB(t.deadline)} | Poin: {t.points}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditTaskData({
                            ...t,
                            deadline: formatISOToInput(t.deadline)
                          });
                          setIsEditTaskModalOpen(true);
                        }}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleTaskStatus(t.id, !!t.is_active)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          t.is_active ? "bg-emerald-950 border border-emerald-500/50 text-emerald-400" : "bg-rose-950 border border-rose-500/50 text-rose-400"
                        }`}
                      >
                        {t.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BUAT PENGUMUMAN */}
        {activeTab === "pengumuman" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#0A0A0C] border border-zinc-800 rounded-2xl p-6 shadow-2xl h-fit">
              <div className="flex items-center gap-3 mb-6">
                <Megaphone className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-black tracking-wide uppercase text-white">PENGUMUMAN BARU</h2>
              </div>

              <form onSubmit={handleAddAnnouncement} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Judul Pengumuman</label>
                  <input
                    type="text"
                    required
                    placeholder="Judul resmi pengumuman..."
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Isi Pesan Pengumuman</label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Sampaikan instruksi atau informasi resmi..."
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#1B22A7] hover:bg-[#151a82] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#1B22A7]/20 transition-all disabled:opacity-50"
                >
                  Publikasikan Pengumuman
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-[#0A0A0C] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-lg font-black tracking-wide uppercase text-white mb-6">PENGUMUMAN DITERBITKAN</h2>
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">{ann.title}</h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{ann.content}</p>
                      <p className="text-[10px] text-zinc-500 mt-2">Dibuat: {formatDateTimeWIB(ann.created_at)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditAnnData(ann);
                          setIsEditAnnModalOpen(true);
                        }}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleAnnStatus(ann.id, ann.title, !!ann.is_active)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          ann.is_active ? "bg-emerald-950 border border-emerald-500/50 text-emerald-400" : "bg-rose-950 border border-rose-500/50 text-rose-400"
                        }`}
                      >
                        {ann.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL EDIT PENGUMUMAN */}
        {isEditAnnModalOpen && editAnnData && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0A0A0C] border border-zinc-800 rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
              <button
                onClick={() => setIsEditAnnModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-black text-white uppercase mb-4">EDIT PENGUMUMAN</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Judul Pengumuman</label>
                  <input
                    type="text"
                    value={editAnnData.title}
                    onChange={(e) => setEditAnnData({ ...editAnnData, title: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Isi Pengumuman</label>
                  <textarea
                    rows={5}
                    value={editAnnData.content}
                    onChange={(e) => setEditAnnData({ ...editAnnData, content: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsEditAnnModalOpen(false)}
                    className="px-4 py-2 bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-700"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveEditAnn}
                    disabled={loading}
                    className="px-4 py-2 bg-[#1B22A7] text-white font-bold text-xs rounded-xl hover:bg-[#151a82]"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL EDIT TUGAS */}
        {isEditTaskModalOpen && editTaskData && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0A0A0C] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 relative shadow-2xl">
              <button
                onClick={() => setIsEditTaskModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-black text-white uppercase mb-4">EDIT TUGAS ({editTaskData.id})</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Judul Tugas</label>
                  <input
                    type="text"
                    value={editTaskData.title}
                    onChange={(e) => setEditTaskData({ ...editTaskData, title: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Kategori</label>
                  <select
                    value={editTaskData.category}
                    onChange={(e) => setEditTaskData({ ...editTaskData, category: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                  >
                    <option value="individu">Individu</option>
                    <option value="kelompok">Kelompok</option>
                    <option value="angkatan">Angkatan</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Deadline</label>
                  <input
                    type="datetime-local"
                    value={editTaskData.deadline || ""}
                    onChange={(e) => setEditTaskData({ ...editTaskData, deadline: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Poin Maksimal</label>
                  <input
                    type="number"
                    value={editTaskData.points}
                    onChange={(e) => setEditTaskData({ ...editTaskData, points: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#1B22A7]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsEditTaskModalOpen(false)}
                    className="px-4 py-2 bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-700"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveEditTask}
                    disabled={loading}
                    className="px-4 py-2 bg-[#1B22A7] text-white font-bold text-xs rounded-xl hover:bg-[#151a82]"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL KONFIRMASI STATUS */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0A0A0C] border border-zinc-800 rounded-2xl max-w-sm w-full p-6 text-center relative shadow-2xl">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="text-sm font-black text-white uppercase mb-2">{confirmModal.title}</h3>
              <p className="text-xs text-zinc-400 mb-6">{confirmModal.description}</p>

              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-700"
                >
                  Batal
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 bg-[#1B22A7] text-white font-bold text-xs rounded-xl hover:bg-[#151a82]"
                >
                  Ya, Lanjutkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
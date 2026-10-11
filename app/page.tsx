"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, 
  Search, 
  UserPlus, 
  UploadCloud, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  X, 
  FileCheck, 
  Loader2, 
  Trash2, 
  FolderOpen, 
  HeartPulse, 
  User, 
  LayoutGrid, 
  List, 
  Download, 
  PlusCircle,
  Briefcase,
  Printer,
  Sparkles,
  ShieldCheck,
  Activity,
  FileText,
  BadgeAlert,
  Zap,
  TrendingUp,
  ChevronRight,
  Eye
} from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  deleteDoc 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const AREAS_INICIALES = [
  "Servicio Comedor Industrial",
  "Servicio De Limpieza Industrial",
  "Servicio Médico"
];

interface DocumentoAdjunto {
  url: string;
  nombre: string;
  tipo: string;
}

interface ExamenesSanitarios {
  coproparasitoscopico?: string;
  reaccionesFebriles?: string;
  exudadoFaringeo?: string;
  aptitudQuimicos?: string;
  cedulaProfesional?: string;
}

interface Empleado {
  id: string;
  nombre: string;
  nss: string;
  curp: string;
  rfc: string;
  telefono: string;
  contactoEmergencia: string;
  puesto: string;
  departamento: string;
  estatusSalud: "apto" | "por_vencer" | "vencido";
  tipoSangre: string;
  alergias: string;
  cronicas: string;
  clinicaImss: string;
  fechaVencimiento: string;
  examenes?: ExamenesSanitarios;
  documentos: {
    certificadoMedico?: DocumentoAdjunto;
    actaNacimiento?: DocumentoAdjunto;
    curpDoc?: DocumentoAdjunto;
    rfcDoc?: DocumentoAdjunto;
    comprobanteDomicilio?: DocumentoAdjunto;
  };
  creadoEn?: any;
}

export default function PortalSaludPage() {
  const [busqueda, setBusqueda] = useState("");
  const [vistaActual, setVistaActual] = useState<"areas" | "tabla">("areas");
  const [areaFiltro, setAreaFiltro] = useState<string>("todas");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalFicha, setModalFicha] = useState(false);
  const [modalNuevaArea, setModalNuevaArea] = useState(false);
  const [nombreNuevaArea, setNombreNuevaArea] = useState("");
  const [catalogoAreas, setCatalogoAreas] = useState<string[]>(AREAS_INICIALES);
  const [tabActiva, setTabActiva] = useState<"personal" | "salud" | "examenes" | "documentos">("personal");
  
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<Empleado | null>(null);
  const [empleadoParaFicha, setEmpleadoParaFicha] = useState<Empleado | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  // Formulario general
  const [formData, setFormData] = useState({
    nombre: "",
    nss: "",
    curp: "",
    rfc: "",
    telefono: "",
    contactoEmergencia: "",
    puesto: "",
    departamento: AREAS_INICIALES[0],
    estatusSalud: "apto" as "apto" | "por_vencer" | "vencido",
    tipoSangre: "O+",
    alergias: "Ninguna",
    cronicas: "Ninguna",
    clinicaImss: "",
    fechaVencimiento: "",
    coproparasitoscopico: "Negativo / Apto",
    reaccionesFebriles: "Negativo",
    exudadoFaringeo: "Negativo",
    aptitudQuimicos: "Apto para manejo de solventes y EPP",
    cedulaProfesional: "",
  });

  const [archivosAsubir, setArchivosAsubir] = useState<{ [key: string]: File }>({});

  useEffect(() => {
    try {
      const q = query(collection(db, "empleados"), orderBy("creadoEn", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const lista: Empleado[] = [];
        const hoy = new Date();
        const en30Dias = new Date();
        en30Dias.setDate(hoy.getDate() + 30);

        const areasDetectadas = new Set<string>(AREAS_INICIALES);

        snapshot.forEach((docItem) => {
          const data = docItem.data() as Omit<Empleado, "id">;
          let estatus: "apto" | "por_vencer" | "vencido" = data.estatusSalud || "apto";

          if (data.fechaVencimiento) {
            const fechaExp = new Date(data.fechaVencimiento + "T00:00:00");
            if (fechaExp < hoy) {
              estatus = "vencido";
            } else if (fechaExp <= en30Dias) {
              estatus = "por_vencer";
            }
          }

          const depto = data.departamento?.trim() || "Servicio Comedor Industrial";
          areasDetectadas.add(depto);

          lista.push({ 
            id: docItem.id, 
            ...data, 
            departamento: depto,
            estatusSalud: estatus,
            documentos: data.documentos || {},
            examenes: data.examenes || {}
          });
        });

        setCatalogoAreas(Array.from(areasDetectadas));
        setEmpleados(lista);
        setCargando(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error(err);
      setCargando(false);
    }
  }, []);

  const handleArchivoChange = (clave: string, file: File | null) => {
    if (file) {
      setArchivosAsubir((prev) => ({ ...prev, [clave]: file }));
    }
  };

  const abrirModalNuevo = (areaDefault?: string) => {
    setEmpleadoSeleccionado(null);
    setFormData({
      nombre: "",
      nss: "",
      curp: "",
      rfc: "",
      telefono: "",
      contactoEmergencia: "",
      puesto: "",
      departamento: areaDefault || catalogoAreas[0] || AREAS_INICIALES[0],
      estatusSalud: "apto",
      tipoSangre: "O+",
      alergias: "Ninguna",
      cronicas: "Ninguna",
      clinicaImss: "",
      fechaVencimiento: "",
      coproparasitoscopico: "Negativo / Apto",
      reaccionesFebriles: "Negativo",
      exudadoFaringeo: "Negativo",
      aptitudQuimicos: "Apto para manejo de solventes y EPP",
      cedulaProfesional: "",
    });
    setArchivosAsubir({});
    setTabActiva("personal");
    setModalAbierto(true);
  };

  const abrirModalEditar = (emp: Empleado) => {
    setEmpleadoSeleccionado(emp);
    setFormData({
      nombre: emp.nombre || "",
      nss: emp.nss || "",
      curp: emp.curp || "",
      rfc: emp.rfc || "",
      telefono: emp.telefono || "",
      contactoEmergencia: emp.contactoEmergencia || "",
      puesto: emp.puesto || "",
      departamento: emp.departamento || catalogoAreas[0],
      estatusSalud: emp.estatusSalud || "apto",
      tipoSangre: emp.tipoSangre || "O+",
      alergias: emp.alergias || "Ninguna",
      cronicas: emp.cronicas || "Ninguna",
      clinicaImss: emp.clinicaImss || "",
      fechaVencimiento: emp.fechaVencimiento || "",
      coproparasitoscopico: emp.examenes?.coproparasitoscopico || "Negativo / Apto",
      reaccionesFebriles: emp.examenes?.reaccionesFebriles || "Negativo",
      exudadoFaringeo: emp.examenes?.exudadoFaringeo || "Negativo",
      aptitudQuimicos: emp.examenes?.aptitudQuimicos || "Apto para manejo de solventes y EPP",
      cedulaProfesional: emp.examenes?.cedulaProfesional || "",
    });
    setArchivosAsubir({});
    setTabActiva("personal");
    setModalAbierto(true);
  };

  const abrirFichaImpresion = (emp: Empleado) => {
    setEmpleadoParaFicha(emp);
    setModalFicha(true);
  };

  const agregarNuevaArea = (e: React.FormEvent) => {
    e.preventDefault();
    const areaLimpia = nombreNuevaArea.trim();
    if (!areaLimpia) return;

    if (!catalogoAreas.includes(areaLimpia)) {
      setCatalogoAreas((prev) => [...prev, areaLimpia]);
    }
    setFormData((prev) => ({ ...prev, departamento: areaLimpia }));
    setNombreNuevaArea("");
    setModalNuevaArea(false);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim() || !formData.nss.trim() || !formData.curp.trim()) {
      alert("Nombre, NSS y CURP son requeridos.");
      return;
    }

    setSubiendo(true);

    try {
      const documentosActualizados = { ...(empleadoSeleccionado?.documentos || {}) };

      for (const [clave, file] of Object.entries(archivosAsubir)) {
        const rutaStorage = `expedientes/${formData.curp}/${clave}_${Date.now()}_${file.name}`;
        const storageRef = ref(storage, rutaStorage);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        documentosActualizados[clave as keyof typeof documentosActualizados] = {
          url,
          nombre: file.name,
          tipo: file.type,
        };
      }

      const datosAguardar = {
        nombre: formData.nombre.trim(),
        nss: formData.nss.trim(),
        curp: formData.curp.trim().toUpperCase(),
        rfc: formData.rfc.trim().toUpperCase(),
        telefono: formData.telefono.trim(),
        contactoEmergencia: formData.contactoEmergencia.trim(),
        puesto: formData.puesto.trim(),
        departamento: formData.departamento.trim(),
        estatusSalud: formData.estatusSalud,
        tipoSangre: formData.tipoSangre,
        alergias: formData.alergias.trim(),
        cronicas: formData.cronicas.trim(),
        clinicaImss: formData.clinicaImss.trim(),
        fechaVencimiento: formData.fechaVencimiento,
        examenes: {
          coproparasitoscopico: formData.coproparasitoscopico,
          reaccionesFebriles: formData.reaccionesFebriles,
          exudadoFaringeo: formData.exudadoFaringeo,
          aptitudQuimicos: formData.aptitudQuimicos,
          cedulaProfesional: formData.cedulaProfesional,
        },
        documentos: documentosActualizados,
      };

      if (empleadoSeleccionado) {
        await updateDoc(doc(db, "empleados", empleadoSeleccionado.id), datosAguardar);
        alert("¡Expediente actualizado exitosamente!");
      } else {
        await addDoc(collection(db, "empleados"), {
          ...datosAguardar,
          creadoEn: serverTimestamp(),
        });
        alert("¡Nuevo colaborador guardado con éxito!");
      }

      setModalAbierto(false);
    } catch (error: any) {
      console.error(error);
      alert("Error: " + (error?.message || error));
    } finally {
      setSubiendo(false);
    }
  };

  const eliminarEmpleado = async (id: string) => {
    if (confirm("¿Eliminar este colaborador permanentemente?")) {
      await deleteDoc(doc(db, "empleados", id));
    }
  };

  const exportarCSV = () => {
    if (empleados.length === 0) return alert("No hay registros para exportar.");
    const encabezados = ["Nombre", "NSS", "CURP", "RFC", "Área", "Puesto", "Teléfono", "Contacto Emergencia", "Clínica IMSS", "Estatus Salud", "Vigencia"];
    const filas = empleados.map((e) => [
      `"${e.nombre}"`, `"${e.nss}"`, `"${e.curp}"`, `"${e.rfc || ""}"`, `"${e.departamento}"`, `"${e.puesto}"`, `"${e.telefono || ""}"`, `"${e.contactoEmergencia || ""}"`, `"${e.clinicaImss || ""}"`, `"${e.estatusSalud}"`, `"${e.fechaVencimiento}"`
    ]);
    const csvContent = "\uFEFF" + [encabezados.join(","), ...filas.map(f => f.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Reporte_AHIMET_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const empleadosFiltrados = useMemo(() => {
    return empleados.filter((emp) => {
      const matchText = (emp.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (emp.nss || "").includes(busqueda) ||
        (emp.curp || "").toLowerCase().includes(busqueda.toLowerCase());
      const matchArea = areaFiltro === "todas" || emp.departamento === areaFiltro;
      return matchText && matchArea;
    });
  }, [empleados, busqueda, areaFiltro]);

  const aptosCount = empleados.filter((e) => e.estatusSalud === "apto").length;
  const porVencerCount = empleados.filter((e) => e.estatusSalud === "por_vencer").length;
  const vencidosCount = empleados.filter((e) => e.estatusSalud === "vencido").length;
  const tasaCumplimiento = empleados.length > 0 ? Math.round((aptosCount / empleados.length) * 100) : 100;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans relative overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      {/* GLOWS DE FONDO TECH */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[#0B4F9C]/30 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="fixed bottom-1/4 right-10 w-96 h-96 bg-cyan-600/20 rounded-full blur-[150px] pointer-events-none"></div>

      {/* 1. NAVBAR FUTURISTA CON LOGO AHIMET */}
      <header className="sticky top-0 z-40 bg-[#0b1329]/80 backdrop-blur-xl border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-2xl blur opacity-70 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative bg-white px-3 py-1.5 rounded-xl flex items-center justify-center">
                <img 
                  src="/logo-ahimet.png" 
                  alt="AHIMET" 
                  className="h-9 w-auto object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>

            <div className="border-l border-slate-700/80 pl-4 hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-blue-400">
                  AHIMET OS
                </span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                  v3.2 Cloud
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Plataforma Médica & RRHH de Alto Rendimiento</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">Terminal Central Activa</span>
              <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
                FIRESTORE ONLINE
              </span>
            </div>

            <button
              onClick={() => abrirModalNuevo()}
              className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-xs sm:text-sm font-bold text-white rounded-xl group bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] transition-all cursor-pointer"
            >
              <span className="relative px-4 py-2.5 transition-all ease-in duration-75 bg-[#0a1128] rounded-[10px] group-hover:bg-opacity-0 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400 group-hover:text-white" />
                <span>+ Nuevo Colaborador</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. DASHBOARD BODY */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        
        {/* BANNER KPI FUTURISTA */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative group overflow-hidden rounded-3xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-xl shadow-xl hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Plantilla Registrada</p>
                <h3 className="text-3xl font-black text-white mt-1 font-mono">{empleados.length}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-cyan-400 font-medium">
              <Activity className="w-3.5 h-3.5" />
              <span>100% Sincronizado en tiempo real</span>
            </div>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-xl shadow-xl hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Aptos / Certificados</p>
                <h3 className="text-3xl font-black text-emerald-400 mt-1 font-mono">{aptosCount}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_#34d399]" style={{ width: `${tasaCumplimiento}%` }}></div>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">{tasaCumplimiento}%</span>
            </div>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-xl shadow-xl hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Por Vencer (&lt;30d)</p>
                <h3 className="text-3xl font-black text-amber-400 mt-1 font-mono">{porVencerCount}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-3 text-[11px] text-amber-300/80 font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Programar cita médica próxima</span>
            </div>
          </div>

          <div className="relative group overflow-hidden rounded-3xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-xl shadow-xl hover:border-rose-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Exámenes Vencidos</p>
                <h3 className="text-3xl font-black text-rose-400 mt-1 font-mono">{vencidosCount}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-3 text-[11px] text-rose-400 font-medium flex items-center gap-1">
              <BadgeAlert className="w-3.5 h-3.5" />
              <span>Atención médica requerida</span>
            </div>
          </div>
        </section>

        {/* 3. BARRA DE HERRAMIENTAS GLOW */}
        <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/60" />
              <input
                type="text"
                placeholder="Buscar por Nombre, NSS, CURP..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-2xl border border-slate-700/80 bg-slate-950/70 text-white placeholder-slate-500 focus:bg-[#0d1633] focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-sm transition-all shadow-inner"
              />
            </div>

            <select
              value={areaFiltro}
              onChange={(e) => setAreaFiltro(e.target.value)}
              className="text-sm px-4 py-2.5 rounded-2xl border border-slate-700 bg-slate-950/70 text-slate-200 focus:border-cyan-400 focus:outline-none font-bold cursor-pointer"
            >
              <option value="todas">Todas las Divisiones</option>
              {catalogoAreas.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end flex-wrap">
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setVistaActual("areas")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  vistaActual === "areas"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Módulos
              </button>
              <button
                type="button"
                onClick={() => setVistaActual("tabla")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  vistaActual === "tabla"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Lista
              </button>
            </div>

            <button
              type="button"
              onClick={exportarCSV}
              className="inline-flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-2xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Excel
            </button>

            <button
              type="button"
              onClick={() => setModalNuevaArea(true)}
              className="inline-flex items-center gap-1.5 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 px-3.5 py-2 rounded-2xl text-xs font-bold border border-cyan-700/50 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-cyan-400" />
              + Área
            </button>
          </div>
        </div>

        {/* 4. VISTA 1: MÓDULOS DE ÁREAS */}
        {vistaActual === "areas" && (
          <div className="space-y-6">
            {cargando ? (
              <div className="p-16 text-center text-slate-400 bg-slate-900/50 rounded-3xl border border-slate-800">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-cyan-400" />
                Cargando módulos de AHIMET...
              </div>
            ) : (
              catalogoAreas
                .filter((area) => areaFiltro === "todas" || area === areaFiltro)
                .map((areaNombre) => {
                  const personalEnArea = empleadosFiltrados.filter((e) => e.departamento === areaNombre);
                  const aptosArea = personalEnArea.filter((e) => e.estatusSalud === "apto").length;

                  return (
                    <div 
                      key={areaNombre} 
                      className="rounded-3xl bg-slate-900/60 border border-slate-800/90 overflow-hidden backdrop-blur-xl shadow-2xl transition-all hover:border-slate-700"
                    >
                      <div className="px-6 py-4 bg-gradient-to-r from-[#0c183a] to-[#081026] border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <div>
                            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                              {areaNombre}
                            </h2>
                            <p className="text-xs text-slate-400 font-mono">
                              {personalEnArea.length} personal activo • {aptosArea} certificados válidos
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => abrirModalNuevo(areaNombre)}
                            className="text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            + Agregar a {areaNombre.split(" ")[1] || "área"}
                          </button>
                        </div>
                      </div>

                      {personalEnArea.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs">
                          Sin personal asignado en este módulo.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                                <th className="py-3 px-6">Colaborador</th>
                                <th className="py-3 px-6">Puesto & Contacto</th>
                                <th className="py-3 px-6">Semáforo de Salud</th>
                                <th className="py-3 px-6">Documentación</th>
                                <th className="py-3 px-6 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-sans">
                              {personalEnArea.map((emp) => (
                                <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                                  <td className="py-4 px-6">
                                    <div className="font-extrabold text-white">{emp.nombre}</div>
                                    <div className="text-xs text-slate-400 font-mono">
                                      NSS: {emp.nss} • CURP: {emp.curp}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className="text-slate-300 font-medium">{emp.puesto}</span>
                                    <div className="text-[11px] text-slate-500 font-mono">
                                      {emp.telefono ? `Tel: ${emp.telefono}` : "S/Tel"}
                                      {emp.contactoEmergencia ? ` • S.O.S: ${emp.contactoEmergencia}` : ""}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    {emp.estatusSalud === "apto" && (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></span>
                                        Apto ({emp.fechaVencimiento || "Vigente"})
                                      </span>
                                    )}
                                    {emp.estatusSalud === "por_vencer" && (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                        Por Vencer (&lt;30d)
                                      </span>
                                    )}
                                    {emp.estatusSalud === "vencido" && (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.2)]">
                                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                                        Examen Vencido
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                      {emp.documentos?.certificadoMedico && (
                                        <a
                                          href={emp.documentos.certificadoMedico.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[11px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 hover:bg-blue-500/20"
                                        >
                                          Certificado
                                        </a>
                                      )}
                                      {emp.documentos?.actaNacimiento && (
                                        <a
                                          href={emp.documentos.actaNacimiento.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[11px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                                        >
                                          Acta
                                        </a>
                                      )}
                                      {emp.documentos?.curpDoc && (
                                        <a
                                          href={emp.documentos.curpDoc.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[11px] font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30"
                                        >
                                          CURP
                                        </a>
                                      )}
                                      {emp.documentos?.rfcDoc && (
                                        <a
                                          href={emp.documentos.rfcDoc.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[11px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30"
                                        >
                                          RFC
                                        </a>
                                      )}
                                      {emp.documentos?.comprobanteDomicilio && (
                                        <a
                                          href={emp.documentos.comprobanteDomicilio.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[11px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30"
                                        >
                                          Domicilio
                                        </a>
                                      )}
                                      {(!emp.documentos || Object.keys(emp.documentos).length === 0) && (
                                        <span className="text-xs text-slate-500">Sin archivos</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => abrirFichaImpresion(emp)}
                                      className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/30 transition-all cursor-pointer"
                                    >
                                      <Printer className="w-3.5 h-3.5" /> Ficha
                                    </button>
                                    <button
                                      onClick={() => abrirModalEditar(emp)}
                                      className="inline-flex items-center gap-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3 py-1.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
                                    >
                                      <FolderOpen className="w-3.5 h-3.5" /> Editar
                                    </button>
                                    <button
                                      onClick={() => eliminarEmpleado(emp.id)}
                                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-xl"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* 5. VISTA 2: TABLA GLOBAL */}
        {vistaActual === "tabla" && (
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800 overflow-hidden backdrop-blur-xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
              <h2 className="font-bold text-white text-base">Padrón Global Activo</h2>
              <span className="text-xs text-slate-400 font-mono">Total: {empleadosFiltrados.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                    <th className="py-3 px-6">Colaborador</th>
                    <th className="py-3 px-6">Área</th>
                    <th className="py-3 px-6">Puesto</th>
                    <th className="py-3 px-6">Salud</th>
                    <th className="py-3 px-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {empleadosFiltrados.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-800/40">
                      <td className="py-4 px-6 font-bold text-white">{emp.nombre}</td>
                      <td className="py-4 px-6 text-xs text-cyan-400">{emp.departamento}</td>
                      <td className="py-4 px-6 text-slate-300">{emp.puesto}</td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-bold uppercase">{emp.estatusSalud}</span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-1">
                        <button onClick={() => abrirFichaImpresion(emp)} className="text-xs text-emerald-400 px-2 py-1">Ficha</button>
                        <button onClick={() => abrirModalEditar(emp)} className="text-xs text-cyan-400 px-2 py-1">Editar</button>
                        <button onClick={() => eliminarEmpleado(emp.id)} className="text-xs text-rose-400 px-2 py-1">Borrar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* 6. MODAL DE FICHA MÉDICA IMPRIMIBLE */}
      {modalFicha && empleadoParaFicha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in print:p-0 print:bg-white">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto text-slate-900 print:max-h-none print:shadow-none">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 print:hidden">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Ficha Médica Ocupacional Oficial
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#0B4F9C] text-white text-xs font-bold hover:bg-blue-800 cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Imprimir Hoja
                </button>
                <button
                  type="button"
                  onClick={() => setModalFicha(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-6 text-slate-900">
              <div className="flex items-center justify-between border-b-2 border-[#0B4F9C] pb-4">
                <div className="flex items-center gap-3">
                  <img src="/logo-ahimet.png" alt="AHIMET" className="h-12 w-auto object-contain" />
                  <div>
                    <h2 className="text-xl font-black text-[#0B4F9C]">AHIMET</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Servicios Corporativos S de RL de CV</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-slate-800">EXPEDIENTE MÉDICO</p>
                  <p className="text-[10px] text-slate-400 font-mono">FOLIO: #{empleadoParaFicha.id.slice(0, 6).toUpperCase()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <p className="text-slate-400 font-semibold">Nombre:</p>
                  <p className="font-extrabold text-sm text-slate-900">{empleadoParaFicha.nombre}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">Área:</p>
                  <p className="font-bold text-slate-800">{empleadoParaFicha.departamento}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">NSS (IMSS):</p>
                  <p className="font-mono font-bold text-slate-800">{empleadoParaFicha.nss}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">CURP:</p>
                  <p className="font-mono font-bold text-slate-800">{empleadoParaFicha.curp}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">RFC:</p>
                  <p className="font-mono font-bold text-slate-800">{empleadoParaFicha.rfc || "No registrado"}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">Teléfono:</p>
                  <p className="font-bold text-slate-800">{empleadoParaFicha.telefono || "No registrado"}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">Contacto de Emergencia:</p>
                  <p className="font-bold text-slate-800">{empleadoParaFicha.contactoEmergencia || "No registrado"}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">Clínica IMSS / UMF:</p>
                  <p className="font-bold text-slate-800">{empleadoParaFicha.clinicaImss || "No asignada"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200">
                  <p className="text-slate-400 font-semibold">Tipo Sangre</p>
                  <p className="font-black text-slate-900 text-sm">{empleadoParaFicha.tipoSangre}</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200">
                  <p className="text-slate-400 font-semibold">Alergias</p>
                  <p className="font-bold text-slate-800">{empleadoParaFicha.alergias}</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200">
                  <p className="text-slate-400 font-semibold">Padecimientos Crónicos</p>
                  <p className="font-bold text-slate-800">{empleadoParaFicha.cronicas || "Ninguno"}</p>
                </div>
              </div>

              {empleadoParaFicha.examenes && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#0B4F9C] mb-2">
                    Pruebas Sanitarias y Ocupacionales
                  </h4>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                    <p><strong>Coproparasitoscópico:</strong> {empleadoParaFicha.examenes.coproparasitoscopico || "Negativo / Apto"}</p>
                    <p><strong>Reacciones Febriles:</strong> {empleadoParaFicha.examenes.reaccionesFebriles || "Negativo"}</p>
                    <p><strong>Exudado Faríngeo:</strong> {empleadoParaFicha.examenes.exudadoFaringeo || "Negativo"}</p>
                    <p><strong>Aptitud Químicos:</strong> {empleadoParaFicha.examenes.aptitudQuimicos || "Apto"}</p>
                    {empleadoParaFicha.examenes.cedulaProfesional && (
                      <p><strong>Cédula Profesional:</strong> {empleadoParaFicha.examenes.cedulaProfesional}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 items-end">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Dictamen Médico:</p>
                  <p className="text-sm font-black text-emerald-700">
                    {empleadoParaFicha.estatusSalud === "apto" ? "APTO PARA LABORAR" : "CON RESTRICCIONES MÉDICAS"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Vigencia hasta: <strong>{empleadoParaFicha.fechaVencimiento || "Sin fecha"}</strong>
                  </p>
                </div>
                <div className="text-center">
                  <div className="border-b border-slate-400 w-40 mx-auto mb-1"></div>
                  <p className="text-xs font-bold text-slate-800">Firma Médico Ocupacional</p>
                  <p className="text-[10px] text-slate-400">Servicios Corporativos AHIMET</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL DE EDICIÓN / ALTA COMPLETO */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1329] border border-cyan-500/30 rounded-3xl max-w-2xl w-full p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] relative max-h-[92vh] flex flex-col text-slate-100">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  {empleadoSeleccionado ? `Editar: ${empleadoSeleccionado.nombre}` : "Nuevo Expediente AHIMET"}
                </h3>
                <p className="text-xs text-slate-400">Módulo de registro en base de datos encriptada</p>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas Neón */}
            <div className="flex border-b border-slate-800 gap-2 mt-3 pt-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setTabActiva("personal")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                  tabActiva === "personal" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-500"
                }`}
              >
                1. Datos Laborales
              </button>
              <button
                type="button"
                onClick={() => setTabActiva("salud")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                  tabActiva === "salud" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-500"
                }`}
              >
                2. Perfil Clínico
              </button>
              <button
                type="button"
                onClick={() => setTabActiva("examenes")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                  tabActiva === "examenes" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-500"
                }`}
              >
                3. Exámenes de Giro
              </button>
              <button
                type="button"
                onClick={() => setTabActiva("documentos")}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                  tabActiva === "documentos" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-500"
                }`}
              >
                4. Bóveda Digital (PDF)
              </button>
            </div>

            <form onSubmit={handleGuardar} className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* PESTAÑA 1: DATOS LABORALES & PERSONALES COMPLETOS */}
              {tabActiva === "personal" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej. Roberto Sánchez Gómez"
                      className="w-full text-sm px-4 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">NSS *</label>
                      <input
                        type="text"
                        required
                        value={formData.nss}
                        onChange={(e) => setFormData({ ...formData, nss: e.target.value })}
                        placeholder="11 dígitos"
                        className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">CURP *</label>
                      <input
                        type="text"
                        required
                        value={formData.curp}
                        onChange={(e) => setFormData({ ...formData, curp: e.target.value.toUpperCase() })}
                        placeholder="18 caracteres"
                        className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">RFC</label>
                      <input
                        type="text"
                        value={formData.rfc}
                        onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                        placeholder="13 caracteres"
                        className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Área / División *</label>
                      <select
                        value={formData.departamento}
                        onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                        className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none font-bold"
                      >
                        {catalogoAreas.map((area) => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Puesto</label>
                      <input
                        type="text"
                        value={formData.puesto}
                        onChange={(e) => setFormData({ ...formData, puesto: e.target.value })}
                        placeholder="Ej. Supervisor de Comedor"
                        className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Teléfono del Colaborador</label>
                      <input
                        type="tel"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        placeholder="10 dígitos"
                        className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Contacto de Emergencia</label>
                      <input
                        type="text"
                        value={formData.contactoEmergencia}
                        onChange={(e) => setFormData({ ...formData, contactoEmergencia: e.target.value })}
                        placeholder="Ej. Esposa - 427 123 4567"
                        className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: PERFIL CLÍNICO COMPLETO */}
              {tabActiva === "salud" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Estatus Laboral</label>
                      <select
                        value={formData.estatusSalud}
                        onChange={(e) => setFormData({ ...formData, estatusSalud: e.target.value as any })}
                        className="w-full text-sm px-3 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="apto">Apto para laborar</option>
                        <option value="por_vencer">En observación / Por Vencer</option>
                        <option value="vencido">No apto / Vencido</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Tipo de Sangre</label>
                      <select
                        value={formData.tipoSangre}
                        onChange={(e) => setFormData({ ...formData, tipoSangre: e.target.value })}
                        className="w-full text-sm px-3 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none font-bold"
                      >
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Vigencia Certificado</label>
                      <input
                        type="date"
                        value={formData.fechaVencimiento}
                        onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                        className="w-full text-sm px-3 py-2 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Clínica IMSS / UMF Asignada</label>
                    <input
                      type="text"
                      value={formData.clinicaImss}
                      onChange={(e) => setFormData({ ...formData, clinicaImss: e.target.value })}
                      placeholder="Ej. UMF No. 7 / Hospital General de Zona"
                      className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Alergias Conocidas</label>
                      <input
                        type="text"
                        value={formData.alergias}
                        onChange={(e) => setFormData({ ...formData, alergias: e.target.value })}
                        placeholder="Ej. Penicilina o 'Ninguna'"
                        className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Padecimientos Crónicos</label>
                      <input
                        type="text"
                        value={formData.cronicas}
                        onChange={(e) => setFormData({ ...formData, cronicas: e.target.value })}
                        placeholder="Ej. Hipertensión o 'Ninguno'"
                        className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: EXÁMENES DE GIRO */}
              {tabActiva === "examenes" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Coproparasitoscópico (Comedor)</label>
                      <input
                        type="text"
                        value={formData.coproparasitoscopico}
                        onChange={(e) => setFormData({ ...formData, coproparasitoscopico: e.target.value })}
                        placeholder="Ej. Negativo / Apto"
                        className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Reacciones Febriles</label>
                      <input
                        type="text"
                        value={formData.reaccionesFebriles}
                        onChange={(e) => setFormData({ ...formData, reaccionesFebriles: e.target.value })}
                        placeholder="Ej. Negativo"
                        className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Exudado Faríngeo</label>
                      <input
                        type="text"
                        value={formData.exudadoFaringeo}
                        onChange={(e) => setFormData({ ...formData, exudadoFaringeo: e.target.value })}
                        placeholder="Ej. Negativo"
                        className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Aptitud Químicos (Limpieza)</label>
                      <input
                        type="text"
                        value={formData.aptitudQuimicos}
                        onChange={(e) => setFormData({ ...formData, aptitudQuimicos: e.target.value })}
                        placeholder="Ej. Apto para manejo de solventes y EPP"
                        className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Cédula Profesional (Servicio Médico)</label>
                    <input
                      type="text"
                      value={formData.cedulaProfesional}
                      onChange={(e) => setFormData({ ...formData, cedulaProfesional: e.target.value })}
                      placeholder="Ej. 12345678 (Médico / Enfermería)"
                      className="w-full text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* PESTAÑA 4: BÓVEDA DIGITAL DE ARCHIVOS COMPLETA */}
              {tabActiva === "documentos" && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Sube expedientes en PDF o fotografía legible protegidos en la nube de AHIMET.
                  </p>
                  {[
                    { key: "certificadoMedico", label: "Certificado Médico Oficial" },
                    { key: "actaNacimiento", label: "Acta de Nacimiento" },
                    { key: "curpDoc", label: "Constancia CURP Oficial" },
                    { key: "rfcDoc", label: "Constancia de Situación Fiscal (RFC)" },
                    { key: "comprobanteDomicilio", label: "Comprobante de Domicilio" },
                  ].map((docItem) => {
                    const existente = empleadoSeleccionado?.documentos?.[docItem.key as keyof typeof empleadoSeleccionado.documentos];
                    const seleccionado = archivosAsubir[docItem.key];

                    return (
                      <div key={docItem.key} className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold text-slate-300">{docItem.label}</span>
                          {existente && (
                            <a
                              href={existente.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-cyan-400 hover:underline block font-mono mt-0.5"
                            >
                              Ver archivo guardado ({existente.nombre})
                            </a>
                          )}
                          {seleccionado && (
                            <span className="text-[11px] text-emerald-400 font-bold block mt-0.5">
                              Listo: {seleccionado.name}
                            </span>
                          )}
                        </div>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => handleArchivoChange(docItem.key, e.target.files?.[0] || null)}
                          className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:text-cyan-300 cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="w-1/2 py-2.5 rounded-2xl border border-slate-700 text-slate-400 hover:bg-slate-800 text-sm font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={subiendo}
                  className="w-1/2 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] cursor-pointer"
                >
                  {subiendo ? "Guardando..." : "Guardar en Sistema"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVA ÁREA */}
      {modalNuevaArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b1329] border border-cyan-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Crear Nueva División / Área</h3>
            <form onSubmit={agregarNuevaArea} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Nombre del área nueva..."
                value={nombreNuevaArea}
                onChange={(e) => setNombreNuevaArea(e.target.value)}
                className="w-full text-sm px-4 py-2.5 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-cyan-400 focus:outline-none"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setModalNuevaArea(false)} className="w-1/2 py-2 border border-slate-700 text-slate-400 rounded-xl text-xs">Cancelar</button>
                <button type="submit" className="w-1/2 py-2 bg-cyan-500 text-black font-bold rounded-xl text-xs hover:bg-cyan-400">Crear Área</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
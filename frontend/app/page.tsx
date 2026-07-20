"use client";
import React, { useState, useEffect, useRef } from "react";
import { Plus, Menu, FileText, CheckCircle, AlertTriangle, Download, UploadCloud, User, Database, ChevronRight, Activity, Scale, MessageSquare, LogOut, ShieldAlert, BarChart3, HardDrive, Clock, Wand2, RefreshCw, Check, ArrowLeft, BookOpen, ExternalLink, Lightbulb, ShieldCheck, Eye, EyeOff, ArrowRight, Cpu, Home as HomeIcon } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ── SECURE CLOUD INITIALIZATION ──
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder");
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const BrandLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="42" height="42" rx="10" fill="#FFFBEB" stroke="#FDE68A" strokeWidth={1} />
    <path d="M21 12V30M14 16H28M12 30H30" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 16L12 24H16L14 16ZM28 16L26 24H30L28 16Z" fill="#F59E0B" fillOpacity="0.8" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // ── VIEW CONTROLLER & ROUTING HISTORY ──
  const [activeTab, setActiveTab] = useState<"landing" | "workspace" | "about">("landing");
  const [previousTab, setPreviousTab] = useState<"landing" | "workspace">("landing");

  const [activeUser, setActiveUser] = useState<{ name: string, email: string, role: string, token: string } | null>(null);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); 
  
  // ── AUTH STATE ──
  const [authStep, setAuthStep] = useState<"initial" | "forgot_password" | "verify_otp" | "create_password">("initial");
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [userPassword, setUserPassword] = useState(""); 
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [history, setHistory] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeChatTitle, setActiveChatTitle] = useState<string | null>(null);

  const [inputText, setInputText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [adminStats, setAdminStats] = useState<any>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftResult, setDraftResult] = useState<any>(null);

  const [ingestActName, setIngestActName] = useState("");
  const [ingestFile, setIngestFile] = useState<File | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestMsg, setIngestMsg] = useState<{ type: "success" | "error", text: string } | null>(null);
  const ingestFileInputRef = useRef<HTMLInputElement>(null);

  // ── NATIVE BROWSER ROUTING HANDLER ──
  const navigateTo = (newTab: "landing" | "workspace" | "about") => {
    if (newTab === "about" && activeTab !== "about") {
      setPreviousTab(activeTab as "landing" | "workspace");
    }
    setActiveTab(newTab);
    
    if (typeof window !== "undefined") {
      window.history.pushState({ tab: newTab }, "", `?view=${newTab}`);
    }
  };

  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const view = urlParams.get("view") as "landing" | "workspace" | "about";
      if (view && ["landing", "workspace", "about"].includes(view)) {
        setActiveTab(view);
        window.history.replaceState({ tab: view }, "", `?view=${view}`);
      } else {
        window.history.replaceState({ tab: "landing" }, "", `?view=landing`);
      }

      const handlePopState = (event: PopStateEvent) => {
        if (event.state && event.state.tab) {
          setActiveTab(event.state.tab);
        } else {
          setActiveTab("landing");
        }
      };
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, []);

  // ── DYNAMIC TITLE UPDATER ──
  useEffect(() => {
    if (activeTab === 'landing') {
      document.title = 'Vidhi-Vichara';
    } 
    else if (activeTab === 'about') {
      document.title = 'About Framework | Vidhi-Vichara';
    } 
    else if (activeTab === 'workspace' && result && activeChatTitle) {
      document.title = `${activeChatTitle} | Vidhi-Vichara`;
    } 
    else {
      document.title = 'Vidhi-Vichara';
    }
  }, [activeTab, result, activeChatTitle]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) restoreUserSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) restoreUserSession(session);
      else {
        setActiveUser(null);
        setHistory([]);
        setAdminStats(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const restoreUserSession = (session: any) => {
    const email = session.user.email;
    const name = session.user.user_metadata?.full_name || email.split('@')[0];
    const role = email === "admin.iitjodpur.vidhivichara2026@gmail.com" ? "Administrator" : "Verified User";
    
    setActiveUser({ name, email, role, token: session.access_token });
    
    if (role === "Administrator") fetchAdminStats();
    else fetchUserHistoryFromCloud(email);
  };

  const fetchUserHistoryFromCloud = async (email: string) => {
    try {
      const { data } = await supabase.from("user_history").select("*").eq("user_email", email).order("created_at", { ascending: false });
      if (data) setHistory(data.map((item: any) => ({ id: item.session_id, title: item.title, date: item.created_at, result: item.result_json })));
    } catch (e) { console.error(e); }
  };

  const fetchAdminStats = async () => {
    try {
      const { data: logs } = await supabase.from("global_audits").select("*").order("created_at", { ascending: false });
      if (logs) setAdminStats({
        total_audits: logs.length,
        critical_violations: logs.filter((l: any) => l.band && l.band.toLowerCase() !== "green").length,
        recent_logs: logs.map((l: any) => ({ time: l.created_at, user: l.user_email, act: l.target_act, score: parseFloat(l.vvai_score || 0), band: l.band }))
      });
    } catch (e) { console.error(e); }
  };

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return "Password must be at least 8 characters.";
    if (/\s/.test(pass)) return "Password cannot contain spaces.";
    if (!/[A-Z]/.test(pass)) return "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(pass)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return "Password must contain at least one special character.";
    return null;
  };

  const handleSignupInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.includes("@")) return setErrorMsg("Please enter a valid email address.");
    if (!authName.trim()) return setErrorMsg("Please provide your full name.");
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: authEmail, options: { data: { full_name: authName } } });
      if (error) throw error;
      setAuthStep("verify_otp");
    } catch (err: any) { setErrorMsg(err.message || "Failed to send OTP."); }
  };

  const handleForgotPasswordInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.includes("@")) return setErrorMsg("Please enter a valid email address.");
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail);
      if (error) throw error;
      setAuthStep("verify_otp");
    } catch (err: any) { setErrorMsg(err.message || "Failed to send recovery OTP."); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpToken.length < 6) return setErrorMsg("Please enter the full 6-digit OTP.");
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ 
        email: authEmail, 
        token: otpToken, 
        type: isResetting ? 'recovery' : 'email' 
      });
      if (error) throw error;
      setAuthStep("create_password");
    } catch (err: any) { setErrorMsg("Invalid or expired OTP. Please try again."); }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const passError = validatePassword(userPassword);
    if (passError) return setErrorMsg(passError);
    if (userPassword !== confirmPassword) return setErrorMsg("Passwords do not match.");
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: userPassword });
      if (error) throw error;
      closeAuthModal();
    } catch (err: any) { setErrorMsg(err.message || "Failed to set password."); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.includes("@")) return setErrorMsg("Please enter a valid email.");
    if (!userPassword) return setErrorMsg("Please enter your password.");
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: userPassword });
      if (error) throw error;
      closeAuthModal();
    } catch (err: any) { setErrorMsg("Invalid email or password."); }
  };

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setErrorMsg(error.message);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false); setIsSignUp(false); setIsResetting(false); setShowPassword(false); 
    setAuthStep("initial"); setAuthEmail(""); setAuthName(""); setOtpToken(""); setUserPassword(""); setConfirmPassword(""); setErrorMsg(null);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };
  
  const startNewAudit = () => { 
    navigateTo("workspace");
    setResult(null); 
    setFile(null); 
    setInputText(""); 
    setCurrentSessionId(null); 
    setActiveChatTitle(null);
    if (window.innerWidth < 768) setSidebarOpen(false); 
  };
  
  const loadHistoryItem = (item: any) => { 
    navigateTo("workspace");
    setResult(item.result); 
    setCurrentSessionId(item.id); 
    setActiveChatTitle(item.title);
    setInputText(""); 
    setFile(null); 
    if (window.innerWidth < 768) setSidebarOpen(false); 
  };

  const launchDraftingEngine = async () => {
    if (!result?.violating_quote) return;
    setShowDraftModal(true); setDraftLoading(true);
    try {
      const formData = new FormData();
      formData.append("flagged_clause", result.violating_quote);
      const response = await fetch(`${API_BASE_URL}/api/remediate`, { method: "POST", headers: { "Authorization": `Bearer ${activeUser?.token}` }, body: formData });
      if (!response.ok) throw new Error("Drafting engine failed.");
      setDraftResult(await response.json());
    } catch (e) { console.error(e); } 
    finally { setDraftLoading(false); }
  };

  const handleIngestAct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestActName.trim()) return setIngestMsg({ type: "error", text: "Please enter the official statute title." });
    if (!ingestFile) return setIngestMsg({ type: "error", text: "Please attach a statute file (.pdf, .docx, .txt)." });

    setIngestLoading(true); setIngestMsg(null);
    const formData = new FormData(); formData.append("act_name", ingestActName.trim()); formData.append("file", ingestFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/ingest`, { method: "POST", headers: { "Authorization": `Bearer ${activeUser?.token}` }, body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to ingest statute into vector database.");
      setIngestMsg({ type: "success", text: data.message || `Successfully ingested "${ingestActName}".` });
      setIngestActName(""); setIngestFile(null);
      if (ingestFileInputRef.current) ingestFileInputRef.current.value = '';
    } catch (err: any) { setIngestMsg({ type: "error", text: err.message || "Error ingesting statute." }); } 
    finally { setIngestLoading(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMsg("File too large. Maximum size is 5MB.");
      if (fileInputRef.current) fileInputRef.current.value = ''; 
      return;
    }
    setFile(selectedFile);
  };

  const handleAudit = async () => {
    if (!inputText.trim() && !file) return;
    setLoading(true); setErrorMsg(null);
    
    const formData = new FormData();
    formData.append("jurisdiction", "AUTO_DETECT");
    formData.append("target_act", "AUTO_DETECT");
    if (file) formData.append("file", file);
    else formData.append("file", new Blob([inputText], { type: "text/plain" }), "pasted_text.txt");

    try {
      const headers: any = {};
      if (activeUser) headers["Authorization"] = `Bearer ${activeUser.token}`;
      const response = await fetch(`${API_BASE_URL}/api/audit`, { method: "POST", headers, body: formData });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Could not process request. Ensure backend is running.");
      }

      const data = await response.json();
      const sessionResult = { prompt: inputText || `Attached Instrument: ${file?.name}`, ...data };
      setResult(sessionResult);
      
      const newSessionId = Date.now().toString();
      const detectedActTitle = data.detected_act && data.detected_act !== "Unknown" ? data.detected_act : "Unclassified Draft";
      setActiveChatTitle(detectedActTitle);

      if (activeUser) {
        await supabase.from("user_history").insert({ user_email: activeUser.email, session_id: newSessionId, title: detectedActTitle, result_json: sessionResult });
        await supabase.from("global_audits").insert({ user_email: activeUser.email, target_act: detectedActTitle, vvai_score: data.vvai_score !== undefined ? data.vvai_score : null, band: data.band || "Unknown" });
        fetchUserHistoryFromCloud(activeUser.email);
      }
      setCurrentSessionId(newSessionId); setInputText(""); setFile(null);
    } catch (error: any) { setErrorMsg(error.message || "Failed to evaluate instrument."); } 
    finally { setLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAudit(); } };

  // ── REFACTORED PDF DOWNLOAD: HEX COLORS & FORCED AUTO-FETCH ──
  const triggerPdfDownload = async () => {
    if (!activeUser) { setShowAuthModal(true); return; }
    try {
      setLoading(true);

      // --- BULLETPROOF AUTO-FETCH ---
      // If the user hasn't generated the drafting notes yet, this explicitly awaits it.
      let finalDraft = draftResult;
      if (!finalDraft && result?.violating_quote && result.violating_quote !== "None") {
        try {
          const fd = new FormData();
          fd.append("flagged_clause", result.violating_quote);
          const res = await fetch(`${API_BASE_URL}/api/remediate`, { 
            method: "POST", 
            headers: { "Authorization": `Bearer ${activeUser.token}` }, 
            body: fd 
          });
          if (res.ok) {
            finalDraft = await res.json();
            setDraftResult(finalDraft);
          }
        } catch (e) {
          console.error("Auto-fetch for Draftsman failed during PDF generation:", e);
        }
      }

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      const drawBorder = () => {
        doc.setDrawColor("#323232"); doc.setLineWidth(0.5);
        doc.rect(margin - 5, margin - 5, pageWidth - (margin * 2) + 10, pageHeight - (margin * 2) + 10);
        doc.setLineWidth(0.1); doc.rect(margin - 3, margin - 3, pageWidth - (margin * 2) + 6, pageHeight - (margin * 2) + 6);
      };

      const addHeader = (text: string, y: number) => {
        if (y > pageHeight - 30) { doc.addPage(); drawBorder(); y = margin + 10; }
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor("#646464"); doc.text(text, margin, y);
        doc.setDrawColor("#c8c8c8"); doc.line(margin, y + 3, pageWidth - margin, y + 3); return y + 12; 
      };

      drawBorder();
      doc.setFont("times", "bold"); doc.setFontSize(22); doc.setTextColor("#1e293b");
      doc.text("VIDHI-VICHARA ALIGNMENT REPORT", pageWidth / 2, 35, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor("#646464");
      doc.text("Professional Vires & Statutory Compliance Audit", pageWidth / 2, 43, { align: "center" });

      let yPos = 65; 
      yPos = addHeader("SECTION 1 · METADATA & IDENTIFICATION", yPos);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor("#000000");
      
      const idData = [
        ["Audit Reference ID:", `VVAR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`],
        ["Timestamp of Review:", new Date().toLocaleDateString('en-GB')],
        ["Governing Statute:", result.detected_act || "Pending Verification"],
        ["Target Jurisdiction:", result.detected_jurisdiction || "Auto-Detected"],
        ["Inference Pipeline:", "VVAI Constitutional LPU v1.0"]
      ];

      idData.forEach(row => {
        doc.setFont("helvetica", "bold"); doc.text(row[0], margin + 5, yPos);
        doc.setFont("helvetica", "normal");
        const wrappedValue = doc.splitTextToSize(row[1], 100);
        doc.text(wrappedValue, margin + 45, yPos);
        yPos += (wrappedValue.length * 5) + 4; 
      });

      yPos += 8; 
      yPos = addHeader("SECTION 2 · EXECUTIVE SCORING", yPos);
      doc.setFillColor("#f8fafc"); doc.setDrawColor("#e2e8f0");
      doc.rect(margin, yPos, pageWidth - (margin * 2), 32, "FD");
      
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("COMPOSITE VVAI SCORE:", margin + 5, yPos + 10);
      doc.setFontSize(14); doc.setTextColor("#d97706"); doc.text(`${result.vvai_score !== undefined ? result.vvai_score : "N/A"} / 1.00`, margin + 60, yPos + 10);
      
      doc.setFontSize(10); doc.setTextColor("#000000"); doc.text("DEVIATION BAND:", margin + 105, yPos + 10);
      const isGreen = result.band === 'Green';
      doc.setTextColor(isGreen ? "#16a34a" : "#dc2626");
      doc.text((result.band || "UNKNOWN").toUpperCase(), margin + 140, yPos + 10);

      doc.setTextColor("#000000"); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
      doc.text(`Taxonomy Code: [ ${result.deviation_type || "None"} ]   |   Severity Level: [ ${result.severity || "None"} ]`, margin + 5, yPos + 23);

      yPos += 46;

      yPos = addHeader("SECTION 3 · AUDIT & DEFECT MATRIX", yPos);
      
      // FLAGGED PASSAGE (Strict HEX Colors)
      if (result.violating_quote && result.violating_quote !== "None") {
        doc.setFillColor("#fef2f2"); // Light Red
        doc.setDrawColor("#fca5a5"); 
        doc.setLineWidth(0.5);
        const issueText = `FLAGGED PASSAGE:\n"${result.violating_quote}"\n\nDEFECT ANALYSIS:\n${result.explanation || "No explanation provided."}`;
        const issueLines = doc.splitTextToSize(issueText, pageWidth - (margin * 2) - 10);
        const boxHeight = (issueLines.length * 5) + 12;
        
        if (yPos + boxHeight > pageHeight - margin) { doc.addPage(); drawBorder(); yPos = margin + 15; }
        doc.rect(margin, yPos, pageWidth - (margin * 2), boxHeight, "FD");
        
        doc.setTextColor("#991b1b"); // Dark Red
        doc.setFontSize(9.5);
        doc.text(issueLines, margin + 5, yPos + 8, { lineHeightFactor: 1.4 });
        yPos += boxHeight + 8;
      }

      // RECOMMENDED CORRECTION (Strict HEX Colors)
      if (result.suggested_fix && result.suggested_fix !== "None") {
        doc.setFillColor("#f0fdf4"); // Light Green
        doc.setDrawColor("#86efac"); 
        doc.setLineWidth(0.5);
        const fixText = `CONSULTANT RECOMMENDED CORRECTION:\n${result.suggested_fix}`;
        const fixLines = doc.splitTextToSize(fixText, pageWidth - (margin * 2) - 10);
        const boxHeight = (fixLines.length * 5) + 12;

        if (yPos + boxHeight > pageHeight - margin) { doc.addPage(); drawBorder(); yPos = margin + 15; }
        doc.rect(margin, yPos, pageWidth - (margin * 2), boxHeight, "FD");
        
        doc.setTextColor("#166534"); // Dark Green
        doc.setFontSize(9.5);
        doc.text(fixLines, margin + 5, yPos + 8, { lineHeightFactor: 1.4 });
        yPos += boxHeight + 16;
      }

      // SECTION 4 - AUTONOMOUS REMEDIATION (Always Prints)
      yPos = addHeader("SECTION 4 · AUTONOMOUS REMEDIATION DRAFT", yPos);
      
      doc.setFillColor("#f8fafc"); // Light Blue/Gray
      doc.setDrawColor("#cbd5e1"); 
      doc.setLineWidth(0.5);
      
      let draftText = "";
      if (finalDraft) {
        draftText = `COMPLIANT DRAFT REWRITE:\n${finalDraft.compliant_draft}\n\nDRAFTING NOTES & STRATEGY:\n${finalDraft.drafting_notes}`;
      } else {
        draftText = `COMPLIANT DRAFT REWRITE:\n[Notice: The drafting engine could not automatically generate a rewrite during PDF export due to an API timeout. Please launch the Deep Draftsman AI manually in the workspace to view the compliant draft.]`;
      }
      
      const draftLines = doc.splitTextToSize(draftText, pageWidth - (margin * 2) - 10);
      const boxHeight4 = (draftLines.length * 5) + 12;

      if (yPos + boxHeight4 > pageHeight - margin) { doc.addPage(); drawBorder(); yPos = margin + 15; }
      doc.rect(margin, yPos, pageWidth - (margin * 2), boxHeight4, "FD");
      
      doc.setTextColor("#1e293b"); // Dark Slate
      doc.setFontSize(9.5);
      doc.text(draftLines, margin + 5, yPos + 8, { lineHeightFactor: 1.4 });
      yPos += boxHeight4 + 16;

      if (yPos + 60 > pageHeight - margin) { doc.addPage(); drawBorder(); yPos = margin + 15; }
      
      yPos = addHeader("APPENDIX A · STATUTORY TAXONOMY & SEVERITY LEGEND", yPos);
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor("#323232");
      doc.text("DEVIATION CODES (T):", margin, yPos);
      doc.text("SEVERITY SCALE (S):", margin + 100, yPos);
      
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor("#505050");
      const tCodes = [
        "T1: Ultra Vires (Schedule VII List Overreach)",
        "T2: Procedural Gateway Non-Compliance",
        "T3: Definitional Vagueness (Art. 14 Breach)",
        "T4: Purposive Incompatibility w/ Parent Act",
        "T5: Delegated Sanction Disproportionality"
      ];
      const sCodes = [
        "S1: Minor drafting friction (Easily curable)",
        "S2: Moderate procedural mismatch",
        "S3: High Substantive Risk (Major redraft)",
        "S4 / Critical: Incurable Constitutional Defect"
      ];

      tCodes.forEach((tc, i) => doc.text(tc, margin, yPos + 6 + (i * 5)));
      sCodes.forEach((sc, i) => doc.text(sc, margin + 100, yPos + 6 + (i * 5)));

      doc.setFontSize(8); doc.setTextColor("#969696");
      doc.text("CONFIDENTIAL - AUTOMATED VIRES ASSESSMENT", pageWidth / 2, pageHeight - 12, { align: "center" });

      doc.save(`VVAR_${result.detected_act?.substring(0, 15).replace(/[^a-zA-Z0-9]/g, "_") || "Report"}_${Date.now()}.pdf`);
    } catch (err) { alert("Failed to generate PDF."); console.error(err); } finally { setLoading(false); }
  };

  if (!isMounted) return null;

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-slate-800 font-sans overflow-hidden">
      
      {/* ── SIDEBAR NAVIGATION (Hidden on Landing Page) ── */}
      {activeTab !== "landing" && (
        <div className={`transition-all duration-300 ease-in-out border-r border-slate-200 bg-[#F8F9FA] flex flex-col flex-shrink-0 z-30 shadow-[2px_0_10px_rgba(0,0,0,0.02)] ${sidebarOpen ? 'w-64' : 'w-16'}`}>
          
          {/* Top Control Area */}
          <div className="flex flex-col border-b border-slate-200/60 pb-2 mb-2">
            <div className="flex items-center justify-between p-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500">
                <Menu className="w-5 h-5" />
              </button>
              {sidebarOpen && activeUser?.email !== "admin.iitjodpur.vidhivichara2026@gmail.com" && (
                <button onClick={startNewAudit} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500" title="New Audit"><Plus className="w-5 h-5" /></button>
              )}
            </div>
            
            {/* The Back to Home Button inside the Sidebar */}
            <div className="px-3">
              <button 
                onClick={() => navigateTo("landing")} 
                className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition text-sm font-bold text-slate-500 hover:text-amber-600 hover:bg-amber-50/50 ${!sidebarOpen && 'justify-center'}`}
                title="Return to Landing Page"
              >
                <HomeIcon className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">Home View</span>}
              </button>
            </div>
            
            {!sidebarOpen && activeUser?.email !== "admin.iitjodpur.vidhivichara2026@gmail.com" && (
              <div className="flex flex-col items-center mt-2">
                <button onClick={startNewAudit} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500" title="New Audit"><Plus className="w-5 h-5" /></button>
              </div>
            )}
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto px-3">
            {sidebarOpen && history.length > 0 && activeUser?.email !== "admin.iitjodpur.vidhivichara2026@gmail.com" && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2 mt-2">Recent Records</div>}
            {sidebarOpen && activeUser?.email !== "admin.iitjodpur.vidhivichara2026@gmail.com" && history.map((item) => (
              <button key={item.id} title={item.title} onClick={() => loadHistoryItem(item)} className={`w-full text-left px-3 py-2 rounded-lg mb-1 truncate text-sm transition-colors flex items-center gap-3 ${currentSessionId === item.id && activeTab === "workspace" ? 'bg-amber-100/50 text-amber-900 font-medium' : 'text-slate-600 hover:bg-slate-200'}`}>
                <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-50" />
                <span className="truncate">{item.title}</span>
              </button>
            ))}
          </div>
          
          {/* About Section Toggle */}
          <div className="px-3 pb-2 pt-2 border-t border-slate-200/60">
            <button 
              onClick={() => { 
                if (activeTab === "about") {
                  navigateTo(previousTab);
                } else {
                  navigateTo("about"); 
                }
                if (window.innerWidth < 768) setSidebarOpen(false); 
              }} 
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition text-sm font-bold ${activeTab === 'about' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs' : 'text-slate-600 hover:bg-slate-200/80'} ${!sidebarOpen && 'justify-center'}`}
              title="About Framework"
            >
              <BookOpen className="w-4 h-4 flex-shrink-0 text-indigo-600" />
              {sidebarOpen && <span className="truncate">About Framework</span>}
            </button>
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-slate-200">
            {activeUser ? (
              <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-inner ${activeUser.email === 'admin.iitjodpur.vidhivichara2026@gmail.com' ? 'bg-slate-800 text-amber-400' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                    {activeUser.name.charAt(0).toUpperCase()}
                  </div>
                  {sidebarOpen && (
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-bold text-slate-700 truncate">{activeUser.name}</span>
                      <span className="text-xs text-slate-500 truncate">{activeUser.role}</span>
                    </div>
                  )}
                </div>
                {sidebarOpen && <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors" title="Log Out"><LogOut className="w-4 h-4" /></button>}
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className={`flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-200 transition text-slate-600 ${!sidebarOpen && 'justify-center'}`}>
                <User className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">Sign In</span>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden items-center bg-white">
        
        {activeTab === "landing" ? (
          /* ── PREMIUM LIGHT MODE LANDING PAGE (Single Screen / No Scroll) ── */
          <div className="w-full h-full bg-[#FAFAFA] text-slate-900 flex flex-col justify-between relative overflow-hidden selection:bg-amber-500/30">
            {/* Ambient glowing background effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-400/20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-400/20 blur-[120px] rounded-full pointer-events-none"></div>
            
            {/* Navbar */}
            <nav className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative z-10 flex-shrink-0">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo("landing")}>
                <BrandLogo size={32} />
                <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-amber-800">Vidhi-Vichara</span>
              </div>
              <div className="flex items-center gap-4">
                {activeUser ? (
                  <button onClick={() => navigateTo("workspace")} className="text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800 transition active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.05)]">
                    Enter Workspace
                  </button>
                ) : (
                  <button onClick={() => setShowAuthModal(true)} className="text-xs font-bold bg-amber-500 text-white px-4 py-2 rounded-full hover:bg-amber-600 transition active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    Sign In / Register
                  </button>
                )}
              </div>
            </nav>

            {/* Hero Section */}
            <main className="w-full max-w-7xl mx-auto px-6 flex-1 flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10 my-auto">
              <div className="flex-1 flex flex-col items-start text-left animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold tracking-widest uppercase mb-4 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5" /> Enterprise Grade Compliance
                </div>
                <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-4">
                  Algorithmic Precision for <br/>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700">Indian Constitutional Law.</span>
                </h1>
                <p className="text-base lg:text-lg text-slate-600 leading-relaxed mb-6 max-w-xl font-medium">
                  Bharat's first autonomous vires verification engine. Instantly audit legislative drafts against Schedule VII, detect jurisdictional overreach, and auto-remediate statutory conflicts in seconds.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      if(!activeUser) { setShowAuthModal(true); return; }
                      navigateTo("workspace");
                    }} 
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-full text-sm font-bold transition active:scale-95 shadow-[0_4px_20px_rgba(245,158,11,0.3)]"
                  >
                    Launch Core Engine <ArrowRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => navigateTo("about")} 
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-6 py-3 rounded-full text-sm font-bold transition active:scale-95 shadow-sm"
                  >
                    Read Architecture
                  </button>
                </div>
              </div>

              {/* Decorative Visual Element */}
              <div className="flex-1 w-full max-w-md relative animate-in fade-in slide-in-from-right-8 duration-700 delay-150">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/20 to-emerald-400/20 blur-3xl rounded-full"></div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl relative z-10 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">vidhi_vichara_inference.exe</div>
                  </div>
                  <div className="font-mono text-xs space-y-2">
                    <p className="text-slate-500">&gt; Initializing Qdrant Vector Store...</p>
                    <p className="text-emerald-600 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Baseline statutes loaded [Success]</p>
                    <p className="text-slate-500">&gt; Parsing attached Draft Bill...</p>
                    <p className="text-slate-500">&gt; Cross-referencing Schedule VII (Union List)...</p>
                    <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg mt-1.5">
                      <p className="text-rose-700 font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> [T1] Ultra Vires Detection</p>
                      <p className="text-rose-600/80 text-[11px] mt-0.5">State entity attempting to legislate on Central subject.</p>
                    </div>
                    <p className="text-slate-500 mt-1.5">&gt; Engaging Remediation LPU...</p>
                    <p className="text-amber-600 flex items-center gap-1.5 animate-pulse"><Cpu className="w-3.5 h-3.5" /> Generating compliant draft...</p>
                  </div>
                </div>
              </div>
            </main>

            {/* Trust Footer */}
            <div className="w-full border-t border-slate-200 bg-white/60 backdrop-blur-md relative z-10 flex-shrink-0">
              <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
                <p>© 2026 Vidhi-Vichara Research Team</p>
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-emerald-600" /> Qdrant Vector DB</span>
                  <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-amber-600" /> Llama-3 70B Engine</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Supabase SecOps</span>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "about" ? (
          /* ── EMBEDDED ABOUT PAGE WITH DYNAMIC BACK BUTTON ── */
          <div className="w-full h-full flex flex-col">
            
            <div className="w-full border-b border-slate-200/80 bg-white/50 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              {/* Dynamic Back button: Routes user back to wherever they came from */}
              <button onClick={() => navigateTo(previousTab)} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition active:scale-95">
                <ArrowLeft className="w-4 h-4" /> Back to {previousTab === "landing" ? "Home" : "Workspace"}
              </button>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 hidden sm:block">Mission & Architecture</span>
              <div className="w-[120px] hidden sm:block"></div> 
            </div>

            <div className="flex-1 overflow-y-auto w-full flex flex-col items-center">
              <div className="w-full max-w-3xl px-6 pt-12 pb-32 animate-in fade-in duration-500">
                <div className="flex flex-col items-center text-center mb-12">
                  <div className="w-14 h-14 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm mb-6"><Scale className="w-7 h-7" /></div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight max-w-xl">Safeguarding Legislative Alignment for Bharat</h1>
                  <p className="text-slate-500 mt-4 text-[15px] md:text-base leading-relaxed max-w-2xl">Vidhi-Vichara is an automated vires verification framework and autonomous parliamentary drafting engine. Built to give lawmakers, policy researchers, and institutional consultants instantaneous constitutional auditing.</p>
                </div>

                <div className="w-full space-y-4 mb-12">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-2xs hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start md:items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-inner">VR</div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">Dr. Venkat Ram Reddy Ganuthula</h2>
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mt-0.5">Project Mentor & Domain Advisor</p>
                        <p className="text-sm text-slate-500 mt-1 leading-normal">Passionate about social impact and digital governance. Believes in leveraging advanced computing to build scalable solutions for Bharat.</p>
                      </div>
                    </div>
                    <a href="https://www.linkedin.com/in/ganuthula/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex-shrink-0 active:scale-95 self-end md:self-auto">Profile <ExternalLink className="w-3.5 h-3.5 text-slate-400" /></a>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-2xs hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start md:items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-900 text-amber-400 font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-inner">SS</div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">Suryansh Shah</h2>
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mt-0.5">Lead Full-Stack & AI Architect</p>
                        <p className="text-sm text-slate-500 mt-1 leading-normal">AI/ML Researcher specializing in deep learning architectures and computational law. Dedicated to engineering high-precision intelligence systems.</p>
                      </div>
                    </div>
                    <a href="https://www.linkedin.com/in/suryanshshah2006" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex-shrink-0 active:scale-95 self-end md:self-auto">Profile <ExternalLink className="w-3.5 h-3.5 text-slate-400" /></a>
                  </div>
                </div>

                <div className="w-full space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1 mb-2">System Pillars</p>
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs"><div className="flex items-center gap-3 mb-2"><div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold"><Scale className="w-4 h-4" /></div><h3 className="font-bold text-slate-900 text-base">Constitutory Vires Auditing</h3></div><p className="text-sm text-slate-500 leading-relaxed pl-12">Eliminating jurisdictional ambiguity by instantly cross-referencing submitted legislative instruments against Schedule VII (Union, State, and Concurrent Lists) and ingested baseline statutes.</p></div>
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs"><div className="flex items-center gap-3 mb-2"><div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold"><Lightbulb className="w-4 h-4" /></div><h3 className="font-bold text-slate-900 text-base">Autonomous Remediation</h3></div><p className="text-sm text-slate-500 leading-relaxed pl-12">Moving beyond basic flag detection. Our secondary AI engine translates complex statutory overreach into actionable, constitutionally compliant rewrites supported by parliamentary drafting strategy notes.</p></div>
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs"><div className="flex items-center gap-3 mb-2"><div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold"><ShieldCheck className="w-4 h-4" /></div><h3 className="font-bold text-slate-900 text-base">Defensive Enterprise Architecture</h3></div><p className="text-sm text-slate-500 leading-relaxed pl-12">Engineered with dual-layer payload constraints, Supabase Row-Level Security, local asymmetric JWT verification, and standardized consultant PDF cert generation.</p></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── STANDARD WORKSPACE VIEW ── */
          <div className="flex-1 overflow-y-auto w-full flex flex-col relative pb-32 pt-10 px-6 items-center">
            
            {/* ADMIN VIEW */}
            {activeUser?.email === "admin.iitjodpur.vidhivichara2026@gmail.com" ? (
              <div className="w-full max-w-5xl mt-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 mb-10 border-b border-slate-200 pb-6">
                  <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg"><ShieldAlert className="w-7 h-7 text-amber-400" /></div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">System Administration</h1>
                    <p className="text-slate-500 mt-1 font-medium text-sm">Vidhi-Vichara Core Cloud Database Logs</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-10">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4"/> Global Audits</p>
                    <p className="text-4xl font-bold text-slate-800">{adminStats?.total_audits || "0"}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-500"/> Critical Flags</p>
                    <p className="text-4xl font-bold text-rose-600">{adminStats?.critical_violations || "0"}</p>
                  </div>
                  <div className="bg-slate-800 p-6 rounded-3xl shadow-md">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><HardDrive className="w-4 h-4 text-emerald-400"/> DB Connection</p>
                    <p className="text-2xl font-bold text-emerald-400">SUPABASE SECURE</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm mb-10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100"><Database className="w-5 h-5 text-emerald-600"/></div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-800">Knowledge Base Ingestion Engine</h2>
                        <p className="text-xs text-slate-500 font-medium">Ingest new official Acts & Rules into Qdrant Vector Store</p>
                      </div>
                    </div>
                  </div>

                  {ingestMsg && (
                    <div className={`p-4 rounded-2xl mb-6 text-sm flex items-center gap-3 border ${ingestMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                      {ingestMsg.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0"/> : <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0"/>}
                      <p className="font-medium">{ingestMsg.text}</p>
                    </div>
                  )}

                  <form onSubmit={handleIngestAct} className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 w-full">
                      <input type="text" required placeholder="Official Act Title (e.g., Bharatiya Nyaya Sanhita, 2023)" value={ingestActName} onChange={(e) => setIngestActName(e.target.value)} className="w-full border border-slate-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-emerald-500 transition font-medium" />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button type="button" onClick={() => ingestFileInputRef.current?.click()} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition border border-slate-200 truncate max-w-[220px]">
                        <UploadCloud className="w-4 h-4 flex-shrink-0" /><span className="truncate">{ingestFile ? ingestFile.name : "Attach Document"}</span>
                      </button>
                      <input type="file" ref={ingestFileInputRef} className="hidden" accept=".pdf,.docx,.txt" onChange={(e) => { if (e.target.files?.[0]) setIngestFile(e.target.files[0]); }} />
                      <button type="submit" disabled={ingestLoading || !ingestActName.trim() || !ingestFile} className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition shadow-sm ${ingestLoading || !ingestActName.trim() || !ingestFile ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'}`}>
                        {ingestLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Ingesting...</> : <><Plus className="w-4 h-4" /> Add Statute</>}
                      </button>
                    </div>
                  </form>
                  {ingestFile && (
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1">
                      <span>Selected size: {(ingestFile.size / 1024).toFixed(1)} KB</span>
                      <button type="button" onClick={() => setIngestFile(null)} className="text-rose-500 hover:underline font-bold">Remove attachment</button>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-10">
                   <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                     <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Clock className="w-5 h-5 text-slate-500"/> Cloud Audit Ledger</h2>
                   </div>
                   <div className="w-full overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                       <thead>
                         <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest">
                           <th className="p-4 pl-6 font-medium">Timestamp</th>
                           <th className="p-4 font-medium">User Account</th>
                           <th className="p-4 font-medium">Target Statute</th>
                           <th className="p-4 font-medium text-center">VVAI Score</th>
                           <th className="p-4 pr-6 font-medium text-center">Band</th>
                         </tr>
                       </thead>
                       <tbody className="text-sm text-slate-700">
                         {adminStats?.recent_logs?.map((log: any, idx: number) => (
                           <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition">
                             <td className="p-4 pl-6 text-slate-500">{new Date(log.time).toLocaleString()}</td>
                             <td className="p-4 font-medium">{log.user}</td>
                             <td className="p-4 truncate max-w-xs" title={log.act}>{log.act}</td>
                             <td className="p-4 text-center font-mono font-bold">{log.score ? log.score.toFixed(2) : "N/A"}</td>
                             <td className="p-4 pr-6 text-center">
                               <span className={`px-2 py-1 rounded-md text-xs font-bold ${log.band === 'Green' ? 'bg-emerald-100 text-emerald-700' : log.band === 'Amber' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                 {log.band || "UNKNOWN"}
                               </span>
                             </td>
                           </tr>
                         )) || (<tr><td colSpan={5} className="p-8 text-center text-slate-400">No records found.</td></tr>)}
                       </tbody>
                     </table>
                   </div>
                </div>
              </div>
            ) : !result ? (
              // UPLOAD VIEW
              <div className="w-full max-w-2xl flex flex-col items-center justify-center mt-12 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex flex-col items-center mb-12 text-center">
                  <div className="mb-6"><BrandLogo size={56} /></div>
                  <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Vidhi-Vichara</h1>
                  <p className="text-slate-500 mt-2 text-[15px]">Automated alignment & vires auditing framework.</p>
                </div>
                <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm transition-all focus-within:shadow-md focus-within:border-amber-400/50 overflow-hidden relative">
                  {file && (
                    <div className="px-5 pt-4 pb-1">
                      <div className="inline-flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 max-w-sm">
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span className="text-sm text-amber-900 truncate font-medium">{file.name}</span>
                        <button onClick={() => setFile(null)} className="ml-1 text-amber-600/50 hover:text-amber-600">✕</button>
                      </div>
                    </div>
                  )}
                  <textarea 
                    value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder={file ? "Add optional context..." : "Upload a legal draft (.pdf, .docx, .txt) or paste rule text to begin evaluation..."}
                    className="w-full resize-none bg-transparent px-5 pt-5 pb-20 outline-none text-[15px] placeholder:text-slate-400 min-h-[160px] max-h-[300px] overflow-y-auto"
                  />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between bg-white pt-2">
                    <button onClick={() => { if(!activeUser) {setShowAuthModal(true); return;} fileInputRef.current?.click();}} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition border border-transparent">
                      <UploadCloud className="w-4 h-4" /> Attach File
                      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileSelect} />
                    </button>
                    <button disabled={loading || (!inputText.trim() && !file)} onClick={() => { if(!activeUser) {setShowAuthModal(true); return;} handleAudit();}} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 ${loading ? 'bg-slate-100 text-slate-400' : (inputText.trim() || file) ? 'bg-slate-800 text-white shadow-md hover:bg-slate-700 active:scale-95' : 'bg-slate-100 text-slate-400'}`}>
                      {loading ? "Analyzing..." : "Evaluate"} <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {errorMsg && <div className="mt-6 w-full p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4" />{errorMsg}</div>}
              </div>
            ) : (
              // ── PROFESSIONAL CONSULTANT RESULTS VIEW ──
              <div className="w-full max-w-4xl mt-4 animate-in fade-in duration-500 space-y-6">
                
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 flex-shrink-0 mt-0.5"><User className="w-4 h-4"/></div>
                  <p className="text-sm text-slate-700 pt-1 leading-relaxed">{result.prompt}</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden relative">
                  <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-amber-600"></div>
                  <div className="p-8">
                    
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100"><Scale className="w-5 h-5 text-amber-600"/></div>
                        <div>
                          <h2 className="text-lg font-bold text-slate-800">Framework Evaluation</h2>
                          <p className="text-xs text-slate-500 font-medium">Automated Vires Assessment</p>
                        </div>
                      </div>
                      {result.band === 'Green' ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold"><CheckCircle className="w-3.5 h-3.5"/> ALIGNED</div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold"><AlertTriangle className="w-3.5 h-3.5"/> DEVIATION FLAG</div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Database className="w-3 h-3"/> Baseline Act</p>
                        <p className="font-bold text-slate-800 leading-snug truncate">{result.detected_act}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Activity className="w-3 h-3"/> Taxonomy Code</p>
                        <p className={`font-mono font-bold ${result.band === 'Green' ? 'text-emerald-600' : 'text-amber-600'}`}>{result.deviation_type || "None"}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3"/> Severity Grading</p>
                        <p className={`font-mono font-bold ${result.band === 'Green' ? 'text-emerald-600' : 'text-rose-600'}`}>{result.severity || "None"}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Scale className="w-3 h-3"/> VVAI Score</p>
                        <p className="font-bold text-slate-800">{result.vvai_score !== undefined ? `${result.vvai_score} / 1.0` : "N/A"}</p>
                      </div>
                    </div>

                    {result.violating_quote && result.violating_quote !== "None" && (
                      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs mb-3 uppercase tracking-wider">
                              <AlertTriangle className="w-4 h-4"/> Flagged Sub-Clause
                            </div>
                            <p className="font-serif italic text-rose-950 text-sm leading-relaxed">"{result.violating_quote}"</p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-rose-200/60 text-xs text-rose-900">
                            <span className="font-bold">Defect Rationale:</span> {result.explanation}
                          </div>
                        </div>

                        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-3 uppercase tracking-wider">
                              <CheckCircle className="w-4 h-4"/> Suggested Consultant Correction
                            </div>
                            <p className="text-emerald-950 text-sm font-medium leading-relaxed">
                              {result.suggested_fix && result.suggested_fix !== "None" 
                                ? result.suggested_fix 
                                : "Re-drafting required to bring subject matter into alignment with appropriate Schedule VII legislative competence."}
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-emerald-200/60 flex justify-end">
                            <button onClick={launchDraftingEngine} className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 transition shadow-2xs active:scale-95">
                              <Wand2 className="w-3.5 h-3.5"/> Launch Deep Draftsman AI
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mb-8 bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5"/> Statutory Taxonomy & Severity Legend
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-bold text-slate-700 mb-1 block">Deviation Taxonomy (T)</span>
                          <ul className="space-y-1 text-slate-600">
                            <li><strong className="text-slate-800">T1:</strong> Ultra Vires (Schedule VII List Incompetence)</li>
                            <li><strong className="text-slate-800">T2:</strong> Procedural Gateway Non-Compliance</li>
                            <li><strong className="text-slate-800">T3:</strong> Definitional Vagueness (Art. 14 breach)</li>
                            <li><strong className="text-slate-800">T4:</strong> Purposive Incompatibility w/ Parent Act</li>
                            <li><strong className="text-slate-800">T5:</strong> Delegated Sanction Disproportionality</li>
                          </ul>
                        </div>
                        <div>
                          <span className="font-bold text-slate-700 mb-1 block">Severity Grading Scale (S)</span>
                          <ul className="space-y-1 text-slate-600">
                            <li><strong className="text-slate-800">S1:</strong> Minor drafting friction (Easily curable)</li>
                            <li><strong className="text-slate-800">S2:</strong> Moderate procedural mismatch</li>
                            <li><strong className="text-slate-800">S3:</strong> High Substantive Risk (Major redraft)</li>
                            <li><strong className="text-slate-800">S4 / Critical:</strong> Incurable Constitutional Defect</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={triggerPdfDownload} className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 px-5 py-2.5 rounded-xl transition border border-slate-200 shadow-sm active:scale-95">
                        {loading ? (
                          <><RefreshCw className="w-4 h-4 animate-spin"/> Generating Report...</>
                        ) : (
                          <><Download className="w-4 h-4"/> Export Executive PDF</>
                        )}
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-y-auto p-8 relative shadow-2xl">
            <button onClick={() => {setShowDraftModal(false); setDraftResult(null);}} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition">✕</button>
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Wand2 className="w-5 h-5"/></div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Drafting & Remediation Engine</h2>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">AI-Assisted Legislative Correction</p>
              </div>
            </div>
            {draftLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-600">Rewriting clause for constitutional compliance...</p>
              </div>
            ) : draftResult ? (
              <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100">
                    <h3 className="text-xs font-bold text-rose-800 mb-3 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5"/> ORIGINAL VIOLATION</h3>
                    <p className="text-[13px] text-rose-900 font-serif italic leading-relaxed">"{draftResult.original_clause}"</p>
                  </div>
                  <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-inner">
                    <h3 className="text-xs font-bold text-emerald-800 mb-3 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5"/> COMPLIANT DRAFT</h3>
                    <p className="text-[14px] text-emerald-950 font-medium leading-relaxed">{draftResult.compliant_draft}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest">Drafting Notes & Strategy</h3>
                  <p className="text-[13px] text-slate-700 leading-relaxed">{draftResult.drafting_notes}</p>
                </div>
                <button onClick={() => setShowDraftModal(false)} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition">Apply & Close</button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 relative overflow-hidden">
            <button onClick={closeAuthModal} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition">✕</button>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4 select-none cursor-default"><BrandLogo size={42} /></div>
              <h2 className="text-xl font-bold text-slate-800">
                {authStep === "verify_otp" ? "Check Your Email" : authStep === "create_password" ? (isResetting ? "Set New Password" : "Secure Your Account") : authStep === "forgot_password" ? "Reset Password" : isSignUp ? "Create an Account" : "Welcome back"}
              </h2>
              {authStep === "verify_otp" && <p className="text-sm text-slate-500 mt-2">We sent a code to {authEmail}</p>}
            </div>
            {errorMsg && <div className="mb-5 p-3 bg-rose-50 text-rose-600 text-sm rounded-xl flex items-center gap-2 border border-rose-100"><AlertTriangle className="w-4 h-4 flex-shrink-0"/> {errorMsg}</div>}
            
            {authStep === "initial" && (
              <div className="animate-in fade-in duration-300">
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                  <button onClick={() => {setIsSignUp(false); setErrorMsg(null);}} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${!isSignUp ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Log In</button>
                  <button onClick={() => {setIsSignUp(true); setErrorMsg(null);}} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${isSignUp ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Sign Up</button>
                </div>
                <form onSubmit={isSignUp ? handleSignupInitiate : handleLogin} className="mb-6">
                  {isSignUp && <input type="text" required placeholder="Full Name" value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-[15px] outline-none mb-3" />}
                  <input type="email" required placeholder="Email Address" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-[15px] outline-none mb-3" />
                  {!isSignUp && (
                    <>
                      <div className="relative mb-3">
                        <input type={showPassword ? "text" : "password"} required placeholder="Password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-[15px] outline-none pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition">
                          {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                        </button>
                      </div>
                      <div className="flex justify-end mb-4">
                        <button type="button" onClick={() => { setAuthStep("forgot_password"); setIsResetting(true); setErrorMsg(null); }} className="text-xs font-bold text-slate-500 hover:text-slate-800 transition">Forgot Password?</button>
                      </div>
                    </>
                  )}
                  <button type="submit" className="w-full bg-slate-800 text-white rounded-xl py-3 mt-2 font-medium hover:bg-slate-700 transition active:scale-95">{isSignUp ? "Send OTP" : "Log In"}</button>
                </form>

                {/* ── RESTORED GOOGLE AUTH BUTTON ── */}
                <div className="flex items-center my-6">
                  <div className="flex-1 border-t border-slate-100"></div>
                  <span className="px-3 text-slate-400 text-xs font-medium uppercase tracking-widest">OR</span>
                  <div className="flex-1 border-t border-slate-100"></div>
                </div>
                
                <button onClick={handleGoogleAuth} className="w-full border border-slate-200 text-slate-700 font-bold rounded-xl py-3 hover:bg-slate-50 transition active:scale-95 flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </button>
              </div>
            )}

            {authStep === "forgot_password" && (
              <form onSubmit={handleForgotPasswordInitiate} className="animate-in fade-in duration-300">
                <input type="email" required placeholder="Enter your email address" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-[15px] outline-none mb-3" />
                <button type="submit" className="w-full bg-slate-800 text-white rounded-xl py-3 mt-2 font-medium hover:bg-slate-700 transition active:scale-95">Send Recovery OTP</button>
                <button type="button" onClick={() => {setAuthStep("initial"); setIsResetting(false);}} className="w-full mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest transition flex items-center justify-center gap-1"><ArrowLeft className="w-3 h-3" /> Back to Login</button>
              </form>
            )}

            {authStep === "verify_otp" && (
              <form onSubmit={handleVerifyOtp} className="animate-in fade-in duration-300">
                <input type="text" required placeholder="Enter 6-digit OTP" maxLength={6} value={otpToken} onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))} className="w-full border rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono outline-none mb-4" />
                <button type="submit" className="w-full bg-amber-500 text-white font-bold rounded-xl py-3 hover:bg-amber-600 transition mb-3">Verify Code</button>
                <button type="button" onClick={() => setAuthStep("initial")} className="w-full text-xs font-bold text-slate-400 uppercase tracking-widest transition flex items-center justify-center gap-1"><ArrowLeft className="w-3 h-3" /> Back</button>
              </form>
            )}

            {authStep === "create_password" && (
              <form onSubmit={handleCreatePassword} className="animate-in fade-in duration-300">
                <div className="relative mb-3">
                  <input type={showPassword ? "text" : "password"} required placeholder={isResetting ? "New Password" : "Create Password"} value={userPassword} onChange={(e) => setUserPassword(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-[15px] outline-none pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition">
                    {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
                <div className="relative mb-4">
                  <input type={showPassword ? "text" : "password"} required placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-[15px] outline-none pr-10" />
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white font-bold rounded-xl py-3 hover:bg-emerald-700 transition"><CheckCircle className="w-4 h-4 inline mr-2"/> {isResetting ? "Update Password" : "Complete Setup"}</button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
import { useState, useRef, useCallback, useEffect } from "react";
import { 
  FileText, 
  Upload, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileSearch,
  Sparkles,
  ArrowRight,
  ClipboardCheck,
  Clipboard
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { cn } from "@/src/lib/utils";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check backend health on mount
  useEffect(() => {
    fetch("/api/health")
      .then(r => r.ok ? setBackendReady(true) : setBackendReady(false))
      .catch(() => setBackendReady(false));
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setError(null);
        setResult(null);
      } else {
        setError("Please upload a PDF file.");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const handleSummarize = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        
        // Try to find status code in text if possible or just show status
        if (response.status === 404) {
          throw new Error("The summarization service (API) could not be found (404). This might be a temporary routing issue. Please refresh and try again.");
        }
        throw new Error(`Server returned a non-JSON response (${response.status}). This usually means the server is restarting or encountered a critical error.`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong while processing the document.");
      }

      setResult(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#4a4a4a] font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <header className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-black/5 rounded-full shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">AI-Powered Intelligence</span>
          </motion.div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-5xl md:text-6xl font-light tracking-tight text-black leading-none">
                Docu<span className="font-semibold">Sum</span>
              </h1>
              <p className="text-lg text-[#9e9e9e]">Intelligent PDF extraction and summarization.</p>
            </div>
            <div className="hidden md:block">
              <div className="flex gap-2 text-[10px] font-mono text-[#9e9e9e] uppercase tracking-wider">
                <span>Fast</span>
                <span className="opacity-30">/</span>
                <span>Secure</span>
                <span className="opacity-30">/</span>
                <span>Smart</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="grid grid-cols-1 gap-8">
          
          {/* Upload Section */}
          <section className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5 hover:border-black/10 transition-colors">
            {!file ? (
              <div
                className={cn(
                  "relative group cursor-pointer border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 transition-all",
                  dragActive ? "border-blue-500 bg-blue-50/50" : "border-[#e5e5e5] hover:border-black/20"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
                <div className="w-16 h-16 bg-[#f5f5f5] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 opacity-40" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-lg font-medium text-black">Click or drop PDF here</p>
                  <p className="text-sm text-[#9e9e9e]">Standard PDF files up to 20MB</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-2xl border border-black/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-black/5">
                      <FileText className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-black max-w-[200px] md:max-w-md truncate">{file.name}</p>
                      <p className="text-xs text-[#9e9e9e]">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button 
                    onClick={removeFile}
                    className="p-2 hover:bg-black/5 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-[#9e9e9e]" />
                  </button>
                </div>

                <div className="flex gap-4">
                  <button
                    disabled={isUploading}
                    onClick={handleSummarize}
                    className={cn(
                      "flex-1 md:flex-none flex items-center justify-center gap-2 h-14 px-8 rounded-full font-medium transition-all shadow-sm",
                      isUploading 
                        ? "bg-[#f5f5f5] text-[#9e9e9e] cursor-not-allowed" 
                        : "bg-black text-white hover:bg-[#1a1a1a] hover:scale-[1.02] active:scale-[0.98]"
                    )}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <FileSearch className="w-5 h-5" />
                        <span>Generate Summary</span>
                      </>
                    )}
                  </button>
                  <button
                    disabled={isUploading}
                    onClick={removeFile}
                    className="h-14 px-8 rounded-full font-medium border border-[#e5e5e5] hover:bg-black/5 transition-colors hidden md:block"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Results Section */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-600"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}

            {result && (
              <motion.section
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <h2 className="text-xl font-medium text-black">Document Summary</h2>
                  </div>
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e5e5e5] rounded-full text-xs font-medium hover:bg-black/5 transition-all active:scale-95"
                  >
                    {copied ? (
                      <>
                        <ClipboardCheck className="w-4 h-4 text-green-500" />
                        <span className="text-green-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-4 h-4" />
                        <span>Copy text</span>
                      </>
                    )}
                  </button>
                </div>
                
                <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-black/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <FileSearch className="w-64 h-64" />
                  </div>
                  <div className="prose prose-slate max-w-none text-lg leading-relaxed text-[#4a4a4a]">
                    <Markdown>{result}</Markdown>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 py-8">
                  <p className="text-sm text-[#9e9e9e]">Need more detailed analysis?</p>
                  <div className="flex gap-4">
                    <button onClick={() => setFile(null)} className="group flex items-center gap-2 px-6 py-3 bg-white border border-black/5 rounded-full text-sm font-medium hover:border-black/20 transition-all">
                      Try another file
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {!file && !result && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8"
            >
              {[
                { label: "Summarize", desc: "Get condensed highlights and key takeaways from any document." },
                { label: "Analyze", desc: "Uncover deep insights and important context automatically." },
                { label: "Extract", desc: "Pull out data, dates, and names from complex layouts." }
              ].map((item, i) => (
                <div key={i} className="p-6 bg-white/50 rounded-3xl border border-black/5 space-y-2">
                  <h3 className="font-semibold text-black">{item.label}</h3>
                  <p className="text-sm text-[#9e9e9e] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>
          )}
        </main>

        {/* Footer */}
        <footer className="pt-12 pb-8 border-top border-black/5 flex flex-col items-center gap-6 opacity-40">
          <div className="flex gap-8 text-[10px] font-semibold uppercase tracking-widest">
            <a href="#" className="hover:text-black">Terms</a>
            <a href="#" className="hover:text-black">Privacy</a>
            <a href="#" className="hover:text-black">Docs</a>
          </div>
          <p className="text-[10px] font-mono tracking-tighter">© 2026 DOCUSUM INTELLIGENCE SYSTEM v1.0.42</p>
        </footer>
      </div>
    </div>
  );
}

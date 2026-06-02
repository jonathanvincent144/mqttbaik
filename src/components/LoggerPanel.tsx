import React, { useState } from "react";
import { LogEntry } from "../types";
import { Terminal, ShieldAlert, CheckCircle, Lightbulb, Thermometer, Radio, Trash2, Search, Filter } from "lucide-react";

interface LoggerPanelProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export default function LoggerPanel({ logs, onClearLogs }: LoggerPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "error":
        return <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />;
      case "success":
        return <CheckCircle className="h-3.5 w-3.5 text-[#D4AF37]" />;
      case "control":
        return <Lightbulb className="h-3.5 w-3.5 text-orange-400" />;
      case "sensor":
        return <Thermometer className="h-3.5 w-3.5 text-blue-450" />;
      case "warning":
        return <ShieldAlert className="h-3.5 w-3.5 text-yellow-500" />;
      default:
        return <Radio className="h-3.5 w-3.5 text-neutral-500" />;
    }
  };

  const getRowBgClass = (type: LogEntry["type"]) => {
    switch (type) {
      case "error":
        return "bg-rose-500/5 hover:bg-rose-500/10 border-rose-950/40";
      case "success":
        return "bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 border-[#D4AF37]/25";
      case "control":
        return "bg-orange-500/5 hover:bg-orange-500/10 border-orange-950/40";
      case "sensor":
        return "bg-cyan-500/5 hover:bg-cyan-500/10 border-cyan-950/40";
      case "warning":
        return "bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-950/40";
      default:
        return "bg-[#0A0A0A]/20 hover:bg-[#0A0A0A]/40 border-neutral-900";
    }
  };

  // Filter logs based on inputs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (log.broker && log.broker.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === "all" || log.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: undefined,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-[#222] rounded-lg p-6 text-white flex flex-col h-[480px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-5 mb-5">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-widest text-[#E0E0E0] flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[#D4AF37]" />
            Control & MQTT Activity History
          </h2>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
            LOG terminal untuk melacak semua pertukaran data sensor, perintah saklar, dan koneksi broker.
          </p>
        </div>
        
        {logs.length > 0 && (
          <button
            onClick={onClearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] uppercase font-bold bg-[#111] border border-[#222] hover:border-rose-900/40 text-neutral-400 hover:text-white transition cursor-pointer self-start"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
            Clear Log
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-600" />
          <input
            type="text"
            placeholder="Cari log atau info broker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-black border border-[#222] focus:border-[#D4AF37] rounded-sm p-2.5 pl-9 text-white placeholder-neutral-750 focus:outline-none transition uppercase tracking-wide"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-600" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full text-[10px] uppercase font-bold tracking-wider bg-black border border-[#222] focus:border-[#D4AF37] rounded-sm p-2.5 pl-9 pr-6 text-neutral-400 focus:outline-none transition appearance-none cursor-pointer"
          >
            <option value="all">Semua Tipe</option>
            <option value="control">Kontrol Relay</option>
            <option value="sensor">Telemetry DHT11</option>
            <option value="success">Sukses Koneksi</option>
            <option value="warning">Peringatan / Disconnect</option>
            <option value="error">Critical Error</option>
          </select>
        </div>
      </div>

      {/* Main Terminal Frame */}
      <div className="flex-1 bg-[#050505] rounded-sm border border-[#222] overflow-hidden flex flex-col min-h-0">
        <div className="bg-black px-4 py-2 border-b border-[#222] flex justify-between items-center text-[9px] font-mono tracking-widest text-[#E0E0E0] select-none">
          <span>TERMINAL ACTIVITY LOGS</span>
          <span className="text-[#D4AF37]">SYSTEM TIME: UTC</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-2.5 custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <Terminal className="h-6 w-6 text-[#D4AF37]/30 mb-2 animate-pulse" />
              <p className="text-neutral-600 uppercase tracking-widest text-[9px]">Tidak ada aktivitas log yang terdeteksi.</p>
              {logs.length > 0 && <p className="text-[9px] text-neutral-800 uppercase tracking-widest mt-1">Coba ubah kata kunci pencarian atau filter.</p>}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`flex gap-3 px-3 py-2 border rounded-sm transition ${getRowBgClass(log.type)}`}
              >
                <div className="flex items-center self-start mt-0.5">
                  {getLogIcon(log.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 text-[9px] text-neutral-500 font-medium font-mono uppercase tracking-wider">
                    <span className="text-gray-400 font-bold">{formatTimestamp(log.timestamp)}</span>
                    <span>•</span>
                    <span className={`font-bold ${
                      log.type === 'error' ? 'text-rose-450' :
                      log.type === 'warning' ? 'text-yellow-450' :
                      log.type === 'success' ? 'text-[#D4AF37]' :
                      log.type === 'control' ? 'text-orange-450' :
                      log.type === 'sensor' ? 'text-cyan-450' : 'text-slate-500'
                    }`}>
                      {log.type}
                    </span>
                    {log.broker && (
                      <>
                        <span>•</span>
                        <span className="text-neutral-600 truncate max-w-[150px]">{log.broker}</span>
                      </>
                    )}
                  </div>
                  <p className="text-gray-300 leading-relaxed mt-1 font-mono break-words whitespace-pre-wrap">
                    {log.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { RelayState, SensorData, BrokerConfig, LogEntry } from "../types";
import VoiceAssistant from "./VoiceAssistant";
import LoggerPanel from "./LoggerPanel";
import {
  Thermometer,
  Droplets,
  Power,
  Play,
  Square,
  Radio,
  Server,
  Zap,
  HelpCircle,
  Clock,
} from "lucide-react";

interface DashboardProps {
  relayState: RelayState;
  sensorData: SensorData;
  activeBrokerIndex: number;
  brokers: BrokerConfig[];
  connectionStatus: ("connected" | "disconnected" | "connecting" | "error")[];
  onSendCommand: (target: string, value: string, source: string) => void;
  logs: LogEntry[];
  onClearLogs: () => void;
  onTriggerSwitchBroker: (index: number) => void;
}

export default function Dashboard({
  relayState,
  sensorData,
  activeBrokerIndex,
  brokers,
  connectionStatus,
  onSendCommand,
  logs,
  onClearLogs,
  onTriggerSwitchBroker,
}: DashboardProps) {
  const activeBroker = brokers[activeBrokerIndex];
  const isVariasiActive = relayState.variasiMode !== 0;

  // Render Relay Card
  const renderRelayCard = (
    num: number,
    stateKey: "relay1" | "relay2" | "relay3" | "relay4"
  ) => {
    const isOn = relayState[stateKey];
    
    // Sophisticated Dark metallic themed color schemes for each relay
    const colors = [
      {
        glow: "shadow-[0_0_20px_rgba(212,175,55,0.15)]",
        border: "border-[#D4AF37]/45",
        bg: "bg-gradient-to-br from-[#D4AF37]/10 to-transparent",
        text: "text-[#D4AF37]",
        bead: "bg-[#D4AF37]"
      },
      {
        glow: "shadow-[0_0_20px_rgba(200,200,200,0.12)]",
        border: "border-gray-400/40",
        bg: "bg-gradient-to-br from-gray-400/5 to-transparent",
        text: "text-gray-300",
        bead: "bg-gray-300"
      },
      {
        glow: "shadow-[0_0_20px_rgba(200,125,85,0.15)]",
        border: "border-[#C87D55]/45",
        bg: "bg-gradient-to-br from-[#C87D55]/10 to-transparent",
        text: "text-[#C87D55]",
        bead: "bg-[#C87D55]"
      },
      {
        glow: "shadow-[0_0_20px_rgba(168,124,67,0.15)]",
        border: "border-[#A87C43]/45",
        bg: "bg-gradient-to-br from-[#A87C43]/10 to-transparent",
        text: "text-[#A87C43]",
        bead: "bg-[#A87C43]"
      },
    ];

    const currentTheme = colors[num - 1];

    return (
      <div
        className={`bg-[#0A0A0A] border rounded-lg p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
          isOn && !isVariasiActive
            ? `${currentTheme.border} ${currentTheme.glow} ${currentTheme.bg}`
            : "border-[#222] bg-[#0A0A0A]/40"
        } ${isVariasiActive ? "opacity-40" : ""}`}
      >
        {/* Glow bead effect or active indicator */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
              isOn && !isVariasiActive ? "bg-green-500/10" : "bg-neutral-800"
            }`}>
              <div className={`h-1.5 w-1.5 rounded-full ${
                isOn && !isVariasiActive ? "bg-green-400 animate-pulse" : "bg-neutral-600"
              }`} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              CHANNEL {num}
            </span>
          </div>

          <Zap className={`h-3.5 w-3.5 ${isOn && !isVariasiActive ? currentTheme.text : "text-[#D4AF37] opacity-20"}`} />
        </div>

        <div className="my-3">
          <h4 className="text-white font-medium text-base uppercase tracking-wider">Relay {num}</h4>
          <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
            {isVariasiActive 
              ? "Automated Variasi Mode" 
              : isOn 
                ? "Status: ACTIVE (ON)" 
                : "Status: INACTIVE (OFF)"
            }
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          {/* ON Button */}
          <button
            onClick={() => onSendCommand(stateKey, "ON", "Web Dashboard Button")}
            disabled={isVariasiActive}
            type="button"
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition cursor-pointer select-none border ${
              isOn && !isVariasiActive
                ? "bg-black text-[#D4AF37] border-[#D4AF37]/50"
                : "bg-[#0E0E0E] text-gray-500 border-[#222] hover:bg-black hover:text-white hover:border-[#333]"
            } disabled:cursor-not-allowed`}
          >
            ON
          </button>

          {/* OFF Button */}
          <button
            onClick={() => onSendCommand(stateKey, "OFF", "Web Dashboard Button")}
            disabled={isVariasiActive}
            type="button"
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition cursor-pointer select-none border ${
              !isOn && !isVariasiActive
                ? "bg-black text-rose-400 border-rose-900/50"
                : "bg-[#0E0E0E] text-gray-500 border-[#222] hover:bg-black hover:text-white hover:border-[#333]"
            } disabled:cursor-not-allowed`}
          >
            OFF
          </button>
        </div>
      </div>
    );
  };

  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return "No Connection sync";
    try {
      const now = new Date();
      const past = new Date(isoString);
      const diffMs = now.getTime() - past.getTime();
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      
      if (diffSecs < 5) return "Just synced";
      if (diffSecs < 60) return `${diffSecs}s ago`;
      return `${Math.floor(diffSecs / 60)}m ago`;
    } catch {
      return "Synced";
    }
  };

  return (
    <div className="space-y-8">
      {/* ⚠️ Warning Banner: Mod Variasi blocks Manual toggles */}
      {isVariasiActive && (
        <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/25 rounded-lg p-5 text-[#D4AF37] flex items-start gap-4 shadow-[0_0_20px_rgba(212,175,55,0.05)]">
          <HelpCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest">Variation Sequence Active</h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              Program variasi otomatis <strong>Mode {relayState.variasiMode}</strong> sedang bekerja secara sekuensial di mikrokontroler. Sesuai desain pengaman ESP32, toggle kontrol manual dinatikan sementara. Tekan tombol merah <strong>"STOP VARIASI"</strong> di bawah untuk mematikan mode otomatis dan memulihkan relay ke keadaan manual semula.
            </p>
          </div>
        </div>
      )}

      {/* Gateway Active Broker Display */}
      <div className="bg-[#0A0A0A] border border-[#222] rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-sm bg-[#111] border border-[#333] text-[#D4AF37] flex items-center justify-center shrink-0">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#E0E0E0] flex items-center gap-2">
              Kanal Gerbang ESP32 Aktif
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]"></span>
              </span>
            </h4>
            <p className="text-[11px] text-gray-500 font-mono tracking-wide mt-1">
              Broker:{" "}
              <strong className="text-[#D4AF37] uppercase">
                {activeBroker ? `${activeBrokerIndex + 1} // ${activeBroker.server}` : "Menghubungkan..."}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {brokers.map((broker, idx) => {
            const status = connectionStatus[idx];
            const isActive = idx === activeBrokerIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onTriggerSwitchBroker(idx)}
                title={isActive ? `ESP32 saat ini menggunakan Broker ${idx + 1}` : `Klik untuk mengalihkan ESP32 ke Broker ${idx + 1}`}
                className={`text-[10px] font-mono px-3 py-1.5 rounded-sm border transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] font-semibold shadow-[0_0_12px_rgba(212,175,55,0.15)] animate-pulse"
                    : "bg-[#0E0E0E] border-[#222] text-neutral-450 hover:border-[#D4AF37]/50 hover:text-[#D4AF37] hover:bg-[#111]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#D4AF37]' : 'bg-neutral-600'}`} />
                  <span>BROKER {idx + 1}: {status === "connected" ? "ONLINE" : "STANDBY"}</span>
                  {!isActive && (
                    <span className="text-[8px] opacity-40 uppercase tracking-widest font-sans ml-1 text-gray-500">
                      (Switch)
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Relays Channel Controls & System Activity Log Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kanal Kontrol Manual Relay (col-span-8) */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#D4AF37]" />
              Kanal Kontrol Manual Relay
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {renderRelayCard(1, "relay1")}
              {renderRelayCard(2, "relay2")}
              {renderRelayCard(3, "relay3")}
              {renderRelayCard(4, "relay4")}
            </div>
          </div>
        </div>

        {/* System Activity Logs (col-span-4) */}
        <div className="lg:col-span-4 flex flex-col">
          <LoggerPanel
            logs={logs}
            onClearLogs={onClearLogs}
          />
        </div>
      </div>

      {/* Telemetry Widgets: DHT11 Sensor Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Temperature Card (Suhu) */}
        <div className="bg-[#0A0A0A] border border-[#222] p-6 rounded-lg relative overflow-hidden flex flex-col justify-between h-[175px]">
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-[#D4AF37]" />
              Sensor Temperature (Suhu)
            </span>
            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1 uppercase">
              <Clock className="h-3 w-3" />
              {getRelativeTime(sensorData.lastUpdated)}
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-[48px] font-light text-white tracking-tight leading-none font-sans">
              {sensorData.suhu && sensorData.suhu !== 0 ? sensorData.suhu.toFixed(1) : "0.0"}
            </span>
            <span className="text-xl text-[#D4AF37] font-light leading-none">°C</span>
          </div>

          <div>
            <div className="w-full bg-[#111] rounded-sm h-1 mt-3 border border-[#222]">
              <div
                className="bg-[#D4AF37] h-1 rounded-sm shadow-[0_0_10px_rgba(212,175,55,0.4)] transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(0, (sensorData.suhu / 50) * 100))}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[9px] text-gray-500 font-mono mt-2 uppercase tracking-wider">
              <span>0 °C (Cold)</span>
              <span>25-30 °C (Normal)</span>
              <span>50 °C (Hot)</span>
            </div>
          </div>
        </div>

        {/* Humidity Card (Kelembaban) */}
        <div className="bg-[#0A0A0A] border border-[#222] p-6 rounded-lg relative overflow-hidden flex flex-col justify-between h-[175px]">
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Droplets className="h-4 w-4 text-[#D4AF37]" />
              Sensor Humidity (Kelembaban)
            </span>
            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1 uppercase">
              <Clock className="h-3 w-3" />
              {getRelativeTime(sensorData.lastUpdated)}
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-[48px] font-light text-white tracking-tight leading-none font-sans">
              {sensorData.kelembaban && sensorData.kelembaban !== 0 ? sensorData.kelembaban.toFixed(1) : "0.0"}
            </span>
            <span className="text-xl text-[#D4AF37] font-light leading-none">% RH</span>
          </div>

          <div>
            <div className="w-full bg-[#111] rounded-sm h-1 mt-3 border border-[#222]">
              <div
                className="bg-[#D4AF37] h-1 rounded-sm shadow-[0_0_10px_rgba(212,175,55,0.4)] transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(0, sensorData.kelembaban))}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[9px] text-gray-500 font-mono mt-2 uppercase tracking-wider">
              <span>0% (Dry)</span>
              <span>50-60% (Optimal)</span>
              <span>100% (Saturated)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Variasi Controller */}
      <div className="bg-[#0A0A0A] border border-[#222] rounded-lg p-6 relative overflow-hidden">
        
        <div className="border-b border-[#222] pb-5 mb-5">
          <h3 className="font-medium text-white uppercase text-base tracking-wider flex items-center gap-2">
            <Radio className="h-5 w-5 text-[#D4AF37]" />
            Relay Sequence Generator
          </h3>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
            Mulai mode variasi penyalaan berputar otomatis sekuensial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Variasi 1 Tab */}
          <button
            onClick={() => onSendCommand("variasi", "1", "Variasi Mode 1 Button")}
            type="button"
            className={`p-5 border rounded-sm flex flex-col items-center justify-center text-center transition cursor-pointer select-none ${
              relayState.variasiMode === 1
                ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] font-bold animate-pulse"
                : "border-[#222] bg-[#0E0E0E] text-gray-400 hover:bg-black hover:border-[#444]"
            }`}
          >
            <Play className="h-4 w-4 mb-2 text-[#D4AF37]" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Mulai Variasi 1</span>
            <span className="text-[9px] text-gray-500 mt-1 font-mono">1 &rarr; 2 &rarr; 3 &rarr; 4</span>
          </button>

          {/* Variasi 2 Tab */}
          <button
            onClick={() => onSendCommand("variasi", "2", "Variasi Mode 2 Button")}
            type="button"
            className={`p-5 border rounded-sm flex flex-col items-center justify-center text-center transition cursor-pointer select-none ${
              relayState.variasiMode === 2
                ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] font-bold animate-pulse"
                : "border-[#222] bg-[#0E0E0E] text-gray-400 hover:bg-black hover:border-[#444]"
            }`}
          >
            <Play className="h-4 w-4 mb-2 text-[#D4AF37]" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Mulai Variasi 2</span>
            <span className="text-[9px] text-gray-500 mt-1 font-mono">4 &rarr; 3 &rarr; 2 &rarr; 1</span>
          </button>

          {/* Stop Button */}
          <button
            onClick={() => onSendCommand("variasi", "STOP", "Variasi STOP Button")}
            type="button"
            className={`p-5 border rounded-sm flex flex-col items-center justify-center text-center transition cursor-pointer select-none ${
              relayState.variasiMode === 0
                ? "border-[#222] bg-[#0E0E0E]/40 text-neutral-600 cursor-not-allowed"
                : "bg-rose-500/10 border-rose-500 text-rose-400 font-bold hover:bg-rose-500/20"
            }`}
          >
            <Square className="h-4 w-4 mb-2 text-rose-505" />
            <span className="text-[10px] font-bold uppercase tracking-widest">STOP SEQUENCE</span>
            <span className="text-[9px] text-gray-500 mt-1 uppercase">Switch to Manual Mode</span>
          </button>
        </div>
      </div>

      {/* Voice Assistant Module (Hands-Free Commands) */}
      <VoiceAssistant
        onSendCommand={onSendCommand}
        logs={logs}
      />
    </div>
  );
}

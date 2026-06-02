import React, { useState, useEffect } from "react";
import { AppStatus, BrokerConfig } from "./types";
import Dashboard from "./components/Dashboard";
import BrokerConfigManager from "./components/BrokerConfigManager";
import VoiceAssistant from "./components/VoiceAssistant";
import LoggerPanel from "./components/LoggerPanel";
import {
  LayoutDashboard,
  Mic,
  Settings,
  Terminal,
  Wifi,
  CloudLightning,
  AlertCircle,
  HelpCircle,
  Cpu
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "voice" | "brokers" | "logs">("dashboard");
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [reconnectCounter, setReconnectCounter] = useState<number>(0);

  // Hook into Server-Sent Events (SSE) stream for instant server state updates
  useEffect(() => {
    let eventSource: EventSource;

    const connectSSE = () => {
      console.log("Connecting to API state stream...");
      eventSource = new EventSource("/api/stream");

      eventSource.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          setStatus(rawData);
          setIsBackendConnected(true);
        } catch (err) {
          console.error("Failed to parse SSE data:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE stream error:", err);
        setIsBackendConnected(false);
        eventSource.close();
        
        // Retry connection after 5 seconds
        setTimeout(() => {
          setReconnectCounter((prev) => prev + 1);
        }, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [reconnectCounter]);

  // Command control publisher proxy
  const handleSendCommand = async (target: string, value: string, source: string) => {
    try {
      const res = await fetch("/api/control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target, value, source }),
      });
      if (!res.ok) {
        console.error("Failed to publish command:", res.statusText);
      }
    } catch (err) {
      console.error("API error during command publication:", err);
    }
  };

  // Re-configure broker settings individual proxy
  const handleSaveConfig = async (index: number, config: BrokerConfig): Promise<boolean> => {
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ index, ...config }),
      });
      return res.ok;
    } catch (err) {
      console.error("Failed to update broker configs:", err);
      return false;
    }
  };

  // Trigger Dynamic Broker Switch on ESP32
  const handleTriggerSwitchBroker = (index: number) => {
    // Tells ESP32 to switch by publishing target "broker" with value "1", "2", "3" (1-based index)
    handleSendCommand("broker", String(index + 1), "Web Switch Broker Button");
  };

  // Reset logs logs list proxy
  const handleClearLogs = async () => {
    try {
      await fetch("/api/logs/clear", { method: "POST" });
    } catch (err) {
      console.error("Failed to clear logger:", err);
    }
  };

  if (!status) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-[#E0E0E0] font-sans p-4 border-8 border-[#1A1A1A]">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-[#111] border border-[#333] text-[#D4AF37] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(212,175,55,0.15)] animate-pulse">
            <Cpu className="h-8 w-8 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <h2 className="text-lg font-light tracking-widest uppercase">ESP32 <span className="font-bold text-[#D4AF37]">SYSTEMS</span></h2>
          <p className="text-[11px] text-gray-500 mt-2 font-mono tracking-wide leading-relaxed">
            Menghubungkan ke API server & memetakan Broker MQTT...
          </p>
          {!isBackendConnected && (
            <span className="text-[9px] text-[#D4AF37] font-mono tracking-widest uppercase mt-4 px-3 py-1 rounded bg-[#D4AF37]/5 border border-[#D4AF37]/20">
              RECONNECTING TO SERVER
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-sans flex flex-col border-8 border-[#1A1A1A] overflow-hidden">
      {/* Top Header Navigation Panel */}
      <header className="border-b border-[#222] bg-[#050505]/95 backdrop-blur-md sticky top-0 z-50 px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Hardware & App Title */}
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)] ${isBackendConnected ? "bg-green-500" : "bg-red-500"}`}></div>
            <div>
              <h1 className="text-2xl font-light tracking-widest uppercase col-span-1">
                ESP32 <span className="font-bold text-[#D4AF37]">COMMAND</span>
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">IoT control node network</p>
            </div>
          </div>

          {/* Navigation Controls and Server Status */}
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Navigation Tabs */}
            <nav className="flex items-center space-x-6 md:space-x-8">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`text-xs uppercase tracking-widest pb-1 transition-all cursor-pointer ${
                  activeTab === "dashboard"
                    ? "text-[#D4AF37] border-b border-[#D4AF37] font-medium"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                Dashboard
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("voice")}
                className={`text-xs uppercase tracking-widest pb-1 transition-all cursor-pointer ${
                  activeTab === "voice"
                    ? "text-[#D4AF37] border-b border-[#D4AF37] font-medium"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                Voice Terminal
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("brokers")}
                className={`text-xs uppercase tracking-widest pb-1 transition-all cursor-pointer ${
                  activeTab === "brokers"
                    ? "text-[#D4AF37] border-b border-[#D4AF37] font-medium"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                MQTT Configuration
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("logs")}
                className={`text-xs uppercase tracking-widest pb-1 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "logs"
                    ? "text-[#D4AF37] border-b border-[#D4AF37] font-medium"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                System Logs
                {status.logs.length > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] rounded-sm font-mono">
                    {status.logs.length}
                  </span>
                )}
              </button>
            </nav>

            <div className="hidden md:block h-6 w-[1px] bg-[#222]"></div>

            {/* Micro Stats Block */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">WiFi Net</p>
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-[11px] font-mono text-gray-300">ABCD</span>
                  <span className="text-[10px] text-[#D4AF37] font-mono">RSSI -64</span>
                </div>
              </div>
              <div className="h-8 w-[1px] bg-[#333]"></div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Active Broker</p>
                <p className="text-xs font-mono text-[#D4AF37]">
                  #{String(status.activeBrokerIndex + 1).padStart(2, '0')}{" "}
                  {status.brokers[status.activeBrokerIndex]?.server 
                    ? status.brokers[status.activeBrokerIndex].server.split('.')[0].toUpperCase()
                    : "STANDBY"}
                </p>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-8 overflow-y-auto">
        
        {/* Render Active View Tab */}
        {activeTab === "dashboard" && (
          <Dashboard
            relayState={status.relayState}
            sensorData={status.sensorData}
            activeBrokerIndex={status.activeBrokerIndex}
            brokers={status.brokers}
            connectionStatus={status.connectionStatus}
            onSendCommand={handleSendCommand}
            logs={status.logs}
            onClearLogs={handleClearLogs}
            onTriggerSwitchBroker={handleTriggerSwitchBroker}
          />
        )}

        {activeTab === "voice" && (
          <div className="space-y-6">
            <VoiceAssistant
              onSendCommand={handleSendCommand}
              logs={status.logs}
            />
            
            {/* Quick telemetry reference on voice page */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#0A0A0A] p-6 rounded-lg border border-[#222] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#D4AF37] font-semibold uppercase tracking-[0.15em] block">TELEMETRY SUHU</span>
                  <span className="text-2xl font-light mt-1 block tracking-tight">{status.sensorData.suhu?.toFixed(1) || "0.0"} <span className="text-xs text-gray-500">°C</span></span>
                </div>
                <Cpu className="h-5 w-5 text-[#D4AF37] opacity-20" />
              </div>
              <div className="bg-[#0A0A0A] p-6 rounded-lg border border-[#222] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#D4AF37] font-semibold uppercase tracking-[0.15em] block">TELEMETRY KELEMBABAN</span>
                  <span className="text-2xl font-light mt-1 block tracking-tight">{status.sensorData.kelembaban?.toFixed(1) || "0.0"}<span className="text-xs text-gray-500">% RH</span></span>
                </div>
                <Cpu className="h-5 w-5 text-[#D4AF37] opacity-20" />
              </div>
            </div>
          </div>
        )}

        {activeTab === "brokers" && (
          <BrokerConfigManager
            brokers={status.brokers}
            connectionStatus={status.connectionStatus}
            activeBrokerIndex={status.activeBrokerIndex}
            onSaveConfig={handleSaveConfig}
            onTriggerSwitchBroker={handleTriggerSwitchBroker}
          />
        )}

        {activeTab === "logs" && (
          <LoggerPanel
            logs={status.logs}
            onClearLogs={handleClearLogs}
          />
        )}

      </main>

      {/* Footer Status Bar */}
      <footer className="h-9 bg-[#111] border-t border-[#222] px-8 flex items-center justify-between text-[10px] text-gray-550 font-mono">
        <div className="flex space-x-6">
          <span>RAM: 142KB Free</span>
          <span>UPTIME: 03:49:12</span>
          <span>MTU: 512B</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-[#D4AF37] tracking-[0.05em]">ESP32-WROOM-32D</span>
          <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
        </div>
      </footer>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { AppStatus, BrokerConfig, RelayState, LogEntry } from "./types";
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
  Cpu,
  X,
  ExternalLink,
  BookOpen,
  Server,
  Play
} from "lucide-react";

// Helper to construct standard default fallback state
const getInitialStatus = (): AppStatus => {
  const localBrokers = localStorage.getItem("esp32_mqtt_brokers");
  const localRelays = localStorage.getItem("esp32_mqtt_relays");
  const localLogs = localStorage.getItem("esp32_mqtt_logs");

  const defaultBrokerConfigs: BrokerConfig[] = [
    {
      server: "kingfisher.lmq.cloudamqp.com",
      port: 8883,
      user: "lziinrjb",
      pass: "NwNopYcfW7CU8oujNwvSH5HMcDO8toQj",
      client_id: "ESP32AMQP_Web",
      vhost: "lziinrjb",
    },
    {
      server: "main.mqtt.ably.net",
      port: 8883,
      user: "2Hz50g.IkSfbw",
      pass: "zwBzMos1xeBawVKWvWDlSbcxzijDa-jQViBMPWN7HRQ",
      client_id: "ESP32Ably_Web",
      vhost: null,
    },
    {
      server: "pf-l6rvh5uuefqnek6dwyef.cedalo.cloud",
      port: 8883,
      user: "hebat2",
      pass: "a",
      client_id: "hebatwebclient2",
      vhost: null,
    },
  ];

  const brokers: BrokerConfig[] = localBrokers ? JSON.parse(localBrokers) : defaultBrokerConfigs;
  const relayState: RelayState = localRelays ? JSON.parse(localRelays) : {
    relay1: false,
    relay2: false,
    relay3: false,
    relay4: false,
    variasiMode: 0,
  };

  const logs: LogEntry[] = localLogs ? JSON.parse(localLogs) : [
    {
      id: "init-fallback",
      timestamp: new Date().toISOString(),
      type: "info",
      message: "Sistem Terhubung dalam Mode Simulasi (Client-Side). Seluruh status, logger, dan setelan broker berjalan lokal di browser karena Node.js background backend tidak diaktifkan oleh hosting statis (Vercel).",
    }
  ];

  return {
    brokers,
    connectionStatus: ["disconnected", "disconnected", "disconnected"],
    sensorData: {
      suhu: 27.5,
      kelembaban: 64.2,
      lastUpdated: new Date().toISOString(),
    },
    relayState,
    activeBrokerIndex: 0,
    logs,
  };
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "voice" | "brokers" | "logs">("dashboard");
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [reconnectCounter, setReconnectCounter] = useState<number>(0);
  const [loadingSeconds, setLoadingSeconds] = useState<number>(0);
  const [showDeployModal, setShowDeployModal] = useState<boolean>(false);

  // Connection check timer
  useEffect(() => {
    if (status) return;
    const interval = setInterval(() => {
      setLoadingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Hook into state fetch and Server-Sent Events (SSE) stream with robust standard API polling fallback for Vercel
  useEffect(() => {
    let eventSource: EventSource;
    let pollInterval: any;
    let isSseActive = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/status");
        if (res.ok) {
          const rawData = await res.json();
          // Ensure it's correct json and not html fallback
          if (rawData && rawData.brokers) {
            setStatus(rawData);
            setIsBackendConnected(true);
            return true;
          }
        }
      } catch (err) {
        console.error("Failed to fetch state via API:", err);
      }
      return false;
    };

    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(async () => {
        if (!isSseActive) {
          const success = await fetchStatus();
          if (!success) {
            setIsBackendConnected(false);
          }
        }
      }, 2500);
    };

    const connectSSE = () => {
      console.log("Connecting to API state stream...");
      eventSource = new EventSource("/api/stream");

      eventSource.onopen = () => {
        console.log("SSE Connection opened successfully. Suspending polling dynamic fallback.");
        isSseActive = true;
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          if (rawData && rawData.brokers) {
            setStatus(rawData);
            setIsBackendConnected(true);
            isSseActive = true;
          }
        } catch (err) {
          console.error("Failed to parse SSE data:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE stream error (expected on serverless hosts like Vercel), starting HTTP fallback polling:", err);
        isSseActive = false;
        setIsBackendConnected(false);
        eventSource.close();
        
        // Activate standard polling right away as fallback
        startPolling();
        
        // Retry SSE re-handshake after some delay
        setTimeout(() => {
          setReconnectCounter((prev) => prev + 1);
        }, 10000);
      };
    };

    // Perform instant initial status update
    fetchStatus().then((healthy) => {
      if (!healthy) {
        startPolling();
      }
    });

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [reconnectCounter]);

  // Hook to handle auto-entering demo/local simulation mode after 3 seconds of trying
  useEffect(() => {
    if (!status && loadingSeconds >= 3.5) {
      console.log("Auto-unlocking client-side interactive fallback mode.");
      setStatus(getInitialStatus());
    }
  }, [loadingSeconds, status]);

  // Command control publisher proxy
  const handleSendCommand = async (target: string, value: string, source: string) => {
    if (!isBackendConnected) {
      // Offline / standalone mode - locally simulate action
      setStatus((prev) => {
        if (!prev) return null;
        const newRelayState = { ...prev.relayState };
        const newLogs = [...prev.logs];
        let logMessage = "";

        if (target.startsWith("relay")) {
          const relayNum = target.substring(5);
          (newRelayState as any)[target] = value === "ON";
          logMessage = `${source || "Web UI"} mengirim kontrol Relay ${relayNum} => ${value} (Mode Simulasi)`;
        } else if (target === "variasi") {
          newRelayState.variasiMode = value === "STOP" ? 0 : parseInt(value, 10);
          logMessage = `${source || "Web UI"} mengirim kontrol Mode Variasi => ${value} (Mode Simulasi)`;
        } else if (target === "broker") {
          const idx = parseInt(value, 10) - 1;
          logMessage = `${source || "Web UI"} mengajukan pindah Broker ke => Broker ${value} (Mode Simulasi)`;
          
          // Simulasikan kedatangan status dari ESP32 beberapa saat kemudian
          setTimeout(() => {
            setStatus((current) => {
              if (!current) return null;
              const currentLogs = [...current.logs];
              currentLogs.unshift({
                id: Math.random().toString(36).substring(2, 9),
                timestamp: new Date().toISOString(),
                type: "info",
                message: `ESP32 melaporkan aktif di Broker ${value} (${current.brokers[idx]?.server || ""}) (Mode Simulasi)`,
                broker: current.brokers[idx]?.server,
              });
              return {
                ...current,
                activeBrokerIndex: idx,
                logs: currentLogs.slice(0, 100),
              };
            });
          }, 1200);
        }

        newLogs.unshift({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
          type: "control",
          message: logMessage,
        });

        const nextStatus = {
          ...prev,
          relayState: newRelayState,
          activeBrokerIndex: target === "broker" ? parseInt(value, 10) - 1 : prev.activeBrokerIndex,
          logs: newLogs.slice(0, 100),
        };

        localStorage.setItem("esp32_mqtt_relays", JSON.stringify(newRelayState));
        localStorage.setItem("esp32_mqtt_logs", JSON.stringify(nextStatus.logs));
        return nextStatus;
      });
      return;
    }

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
    if (!isBackendConnected) {
      // Local simulation config save
      setStatus((prev) => {
        if (!prev) return null;
        const nextBrokers = [...prev.brokers];
        nextBrokers[index] = config;

        const nextLogs = [...prev.logs];
        nextLogs.unshift({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
          type: "success",
          message: `Konfigurasi Broker ${index + 1} diperbarui secara lokal.`,
          broker: config.server,
        });

        const nextStatus = {
          ...prev,
          brokers: nextBrokers,
          logs: nextLogs.slice(0, 100),
        };

        localStorage.setItem("esp32_mqtt_brokers", JSON.stringify(nextBrokers));
        localStorage.setItem("esp32_mqtt_logs", JSON.stringify(nextStatus.logs));
        return nextStatus;
      });
      return true;
    }

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
    handleSendCommand("broker", String(index + 1), "Web Switch Broker Button");
  };

  // Reset logs logs list proxy
  const handleClearLogs = async () => {
    if (!isBackendConnected) {
      setStatus((prev) => {
        if (!prev) return null;
        const nextStatus = {
          ...prev,
          logs: []
        };
        localStorage.setItem("esp32_mqtt_logs", JSON.stringify([]));
        return nextStatus;
      });
      return;
    }

    try {
      await fetch("/api/logs/clear", { method: "POST" });
    } catch (err) {
      console.error("Failed to clear logger:", err);
    }
  };

  // Skip loading and force simulated dashboard
  const handleForceEnterSimulation = () => {
    setStatus(getInitialStatus());
  };

  if (!status) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-[#E0E0E0] font-sans p-6 border-8 border-[#1A1A1A]">
        <div className="flex flex-col items-center max-w-lg text-center bg-[#0C0C0C] border border-[#222] p-8 rounded-lg shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D4AF37]/50" />
          
          <div className="w-16 h-16 rounded-full bg-[#111] border border-[#333] text-[#D4AF37] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(212,175,55,0.15)] animate-pulse">
            <Cpu className="h-8 w-8 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          
          <h2 className="text-lg font-light tracking-widest uppercase">ESP32 <span className="font-bold text-[#D4AF37]">SYSTEMS</span></h2>
          <p className="text-[11.5px] text-gray-400 mt-2 font-mono tracking-wide leading-relaxed">
            Menghubungkan ke API server & memetakan Broker MQTT...
          </p>
          
          {loadingSeconds >= 2.5 && (
            <div className="mt-6 border-t border-[#222] pt-5 w-full text-left">
              <div className="flex items-start gap-2 text-amber-500 font-semibold text-[11px] font-mono tracking-wide uppercase mb-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-[1px]" />
                <span>Terdeteksi Deploy di Vercel (Mode Serverless)</span>
              </div>
              <p className="text-[11.5px] text-gray-500 leading-relaxed font-sans">
                Vercel adalah hosting statis yang <strong>tidak mendukung persistent server background Node.js</strong> untuk memelihara koneksi MQTT. backend server tidak dapat dihubungi.
              </p>
              
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleForceEnterSimulation}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#Bfa030] text-black text-[11px] font-mono uppercase tracking-widest font-bold py-2.5 px-4 rounded-sm transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="h-3 w-3 fill-black" /> Buka Mode Simulasi
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeployModal(true)}
                  className="flex-1 border border-[#333] hover:border-gray-500 text-gray-300 hover:text-white text-[11.5px] text-left py-2.5 px-4 rounded-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="h-3.5 w-3.5" /> Panduan Deploy Real-time
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Deploy Guide Modal inside Loading if opened */}
        {showDeployModal && (
          <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0C0C0C] border border-[#222] rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-[#E0E0E0] shadow-2xl">
              <div className="p-6 border-b border-[#222] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#D4AF37]">
                  <Server className="h-5 w-5" />
                  <h3 className="text-sm font-semibold uppercase tracking-widest font-mono">Panduan Deploy Backend Real-time</h3>
                </div>
                <button type="button" onClick={() => setShowDeployModal(false)} className="text-gray-500 hover:text-white cursor-pointer"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto font-sans text-xs space-y-4 leading-relaxed text-gray-350">
                <p>
                  Aplikasi ini dirancang sebagai aplikasi full-stack. Server background Node.js (<code className="text-[#D4AF37] font-mono">server.ts</code>) harus berjalan terus-menerus (24/7) untuk melakukan koneksi persistent TCP ke broker MQTT, menerima data sensor, dan mengirimkan perintah manual dari dashboard ke hardware ESP32 Anda.
                </p>
                <p className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 p-3 rounded text-amber-500 font-mono text-[11px]">
                  ⚠️ Vercel secara default hanya melayani frontend statis, sehingga Express backend Anda tidak berjalan. Ini sebabnya Anda mendapat pesan &apos;RECONNECTING TO SERVER&apos; terus-menerus.
                </p>
                
                <h4 className="text-white font-semibold uppercase tracking-wider font-mono text-[11px] pt-2">Solusi: Deploy ke Persistent Host</h4>
                <p>
                  Untuk mendapatkan fungsionalitas MQTT real-time penuh, Anda disarankan menggunakan penyedia persistent container hosting gratis / murah seperti <strong>Railway.app</strong>, <strong>Render.com</strong>, atau <strong>Koyeb.com</strong>.
                </p>
                
                <div className="bg-black/50 p-4 border border-[#222] rounded space-y-3 font-mono text-[11px]">
                  <div>
                    <span className="text-[#D4AF37]">1. Push Kode ke GitHub</span>
                    <p className="text-gray-500 ml-4 mt-0.5">Hubungkan repositori Git Anda ke GitHub.</p>
                  </div>
                  <div>
                    <span className="text-[#D4AF37]">2. Import ke Railway / Render</span>
                    <p className="text-gray-500 ml-4 mt-0.5">Pilih repositori Anda di dasbor Railway/Render.</p>
                  </div>
                  <div>
                    <span className="text-[#D4AF37]">3. Konfigurasi Scripts</span>
                    <p className="text-gray-500 ml-4 mt-0.5">Pastikan Build Script: <code className="bg-[#222] text-white px-1 py-0.5 rounded">npm run build</code></p>
                    <p className="text-gray-500 ml-4 mt-0.5">Pastikan Start Command: <code className="bg-[#222] text-white px-1 py-0.5 rounded">npm start</code></p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeployModal(false);
                      handleForceEnterSimulation();
                    }}
                    className="bg-[#D4AF37] text-black font-semibold uppercase px-4 py-2 rounded-sm cursor-pointer font-mono text-[11px] hover:bg-[#bfa030]"
                  >
                    Buka Mode Simulasi Sekarang
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-sans flex flex-col border-8 border-[#1A1A1A] overflow-hidden">
      {/* Simulation Fallback Banner */}
      {!isBackendConnected && (
        <div className="bg-[#D4AF37] text-black text-[11px] font-mono py-2 px-8 flex flex-col md:flex-row items-center justify-between gap-2 border-b border-[#D4AF37]/30 select-none">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              <strong>MODE SIMULASI AKTIF (VERCEL COMPATIBLE)</strong>: Backend server lambat / mati. Semua perintah & setelan MQTT disimulasikan lokal.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="opacity-80 text-[10px]">Perlu kendali ESP32 hardware?</span>
            <button 
              type="button"
              onClick={() => setShowDeployModal(true)}
              className="bg-[#050505] text-[#D4AF37] hover:bg-black px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider transition-colors border border-black cursor-pointer"
            >
              Panduan Deploy ⚡
            </button>
          </div>
        </div>
      )}

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

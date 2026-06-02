import React, { useState } from "react";
import { BrokerConfig } from "../types";
import { Eye, EyeOff, Save, CheckCircle, Wifi, AlertTriangle, Disc, ArrowRight } from "lucide-react";

interface BrokerConfigManagerProps {
  brokers: BrokerConfig[];
  connectionStatus: ("connected" | "disconnected" | "connecting" | "error")[];
  activeBrokerIndex: number;
  onSaveConfig: (index: number, config: BrokerConfig) => Promise<boolean>;
  onTriggerSwitchBroker: (index: number) => void;
}

export default function BrokerConfigManager({
  brokers,
  connectionStatus,
  activeBrokerIndex,
  onSaveConfig,
  onTriggerSwitchBroker,
}: BrokerConfigManagerProps) {
  // Local state for all loaded inputs
  const [formStates, setFormStates] = useState<BrokerConfig[]>(() => [...brokers]);
  const [showPassword, setShowPassword] = useState<boolean[]>([false, false, false]);
  const [savingIndices, setSavingIndices] = useState<boolean[]>([false, false, false]);
  const [successIndices, setSuccessIndices] = useState<boolean[]>([false, false, false]);

  React.useEffect(() => {
    if (brokers && brokers.length === 3) {
      setFormStates([...brokers]);
    }
  }, [brokers]);

  const handleInputChange = (index: number, field: keyof BrokerConfig, value: string | number | null) => {
    const updated = [...formStates];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setFormStates(updated);
  };

  const togglePasswordVisibility = (index: number) => {
    const updated = [...showPassword];
    updated[index] = !updated[index];
    setShowPassword(updated);
  };

  const handleSave = async (index: number) => {
    setSavingIndices((prev) => {
      const copy = [...prev];
      copy[index] = true;
      return copy;
    });

    const isSuccess = await onSaveConfig(index, formStates[index]);

    setSavingIndices((prev) => {
      const copy = [...prev];
      copy[index] = false;
      return copy;
    });

    if (isSuccess) {
      setSuccessIndices((prev) => {
        const copy = [...prev];
        copy[index] = true;
        return copy;
      });
      setTimeout(() => {
        setSuccessIndices((prev) => {
          const copy = [...prev];
          copy[index] = false;
          return copy;
        });
      }, 3000);
    }
  };

  const getStatusBadge = (status: typeof connectionStatus[0]) => {
    switch (status) {
      case "connected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] uppercase font-bold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/25 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37] animate-pulse"></span>
            ACTIVE
          </span>
        );
      case "connecting":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] uppercase font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            CONNECTING
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] uppercase font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono animate-bounce">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
            ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] uppercase font-bold bg-[#222] text-neutral-550 border border-neutral-805 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-600"></span>
            STANDBY
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-[#0A0A0A] border border-[#222] rounded-lg p-6 text-white relative overflow-hidden">
        <div>
          <h2 className="text-base font-medium text-white flex items-center gap-2 uppercase tracking-widest">
            <Wifi className="h-4 w-4 text-[#D4AF37]" />
            Broker Gateway Configuration
          </h2>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
            Sesuaikan parameter koneksi untuk ketiga Broker MQTT. Semua perubahan akan disimpan secara permanen di backend dan menghubungkan ulang client secara real-time.
          </p>
        </div>
      </div>

      {/* Side-by-Side Horizontal Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {formStates.map((config, index) => {
          if (!config) return null;
          const status = connectionStatus[index] || "disconnected";
          const isActiveOnESP = activeBrokerIndex === index;

          return (
            <div
              key={index}
              className={`bg-[#0A0A0A] border rounded-lg p-6 flex flex-col justify-between transition-all duration-300 relative ${
                isActiveOnESP
                  ? "border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.12)] bg-[#0A0A0A]/95"
                  : "border-[#222] hover:border-[#333] hover:bg-[#0A0A0A]/60"
              }`}
            >
              {/* Highlight Ribbon for Active Broker on ESP32 */}
              {isActiveOnESP && (
                <div className="absolute -top-3 right-4 bg-black border border-[#D4AF37] text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest px-3 py-1 rounded-sm shadow-md flex items-center gap-1.5">
                  <Disc className="h-2.5 w-2.5 animate-spin" />
                  ESP Active
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-5 mt-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-sm bg-[#111] border border-[#333] text-[#D4AF37] flex items-center justify-center font-bold font-mono text-xs">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-xs uppercase tracking-widest">Gate {index + 1}</h3>
                      <p className="text-[10px] text-gray-500 font-mono tracking-wide truncate max-w-[120px]">
                        {config.server ? config.server.split('.')[0].toUpperCase() : "N/A"}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(status)}
                </div>

                <div className="space-y-4 pt-2">
                  {/* Host Server */}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Server / Host IP
                    </label>
                    <input
                      type="text"
                      value={config.server || ""}
                      onChange={(e) => handleInputChange(index, "server", e.target.value)}
                      className="w-full text-xs bg-black border border-[#222] focus:border-[#D4AF37] rounded-sm p-2 text-white font-mono focus:outline-none transition uppercase tracking-wide"
                    />
                  </div>

                  {/* Port and Vhost Side by Side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                        Port
                      </label>
                      <input
                        type="number"
                        value={config.port || 8883}
                        onChange={(e) => handleInputChange(index, "port", parseInt(e.target.value, 10))}
                        className="w-full text-xs bg-black border border-[#222] focus:border-[#D4AF37] rounded-sm p-2 text-white font-mono focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                        VHost
                      </label>
                      <input
                        type="text"
                        value={config.vhost || ""}
                        placeholder="N/A"
                        onChange={(e) => handleInputChange(index, "vhost", e.target.value || null)}
                        className="w-full text-xs bg-black border border-[#222] focus:border-[#D4AF37] rounded-sm p-2 text-white font-mono focus:outline-none placeholder-neutral-800 transition"
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      value={config.user || ""}
                      onChange={(e) => handleInputChange(index, "user", e.target.value)}
                      className="w-full text-xs bg-black border border-[#222] focus:border-[#D4AF37] rounded-sm p-2 text-white font-mono focus:outline-none transition"
                    />
                  </div>

                  {/* Password with Show Password Eye Toggle */}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword[index] ? "text" : "password"}
                        value={config.pass || ""}
                        onChange={(e) => handleInputChange(index, "pass", e.target.value)}
                        className="w-full text-xs bg-black border border-[#222] focus:border-[#D4AF37] rounded-sm p-2 pr-10 text-white font-mono focus:outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(index)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-450 cursor-pointer"
                        aria-label={showPassword[index] ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showPassword[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Client ID */}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={config.client_id || ""}
                      onChange={(e) => handleInputChange(index, "client_id", e.target.value)}
                      className="w-full text-xs bg-black border border-[#222] focus:border-[#D4AF37] rounded-sm p-2 text-white font-mono focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons Column */}
              <div className="mt-6 pt-4 border-t border-[#222] space-y-2.5">
                {/* Save Button */}
                <button
                  type="button"
                  onClick={() => handleSave(index)}
                  disabled={savingIndices[index]}
                  className={`w-full py-2.5 px-4 text-[10px] uppercase font-bold tracking-widest rounded-sm flex items-center justify-center gap-2 transition cursor-pointer select-none ${
                    successIndices[index]
                      ? "bg-green-500 text-white"
                      : "bg-[#111] border border-[#333] hover:border-[#D4AF37] hover:text-[#D4AF37] text-gray-200 active:translate-y-0.5 disabled:opacity-50"
                  }`}
                >
                  {savingIndices[index] ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : successIndices[index] ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save Configuration
                    </>
                  )}
                </button>

                {/* Force Trigger ESP32 Switch Broker */}
                {!isActiveOnESP && (
                  <button
                    type="button"
                    onClick={() => onTriggerSwitchBroker(index)}
                    className="w-full py-2 px-4 text-[9px] uppercase font-bold tracking-widest text-neutral-400 hover:text-white bg-black hover:bg-[#111] border border-[#222] hover:border-[#333] rounded-sm flex items-center justify-center gap-1.5 transition cursor-pointer select-none"
                  >
                    Switch ESP to Gateway
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

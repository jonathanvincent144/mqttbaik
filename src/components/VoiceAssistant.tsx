import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, HelpCircle } from "lucide-react";

interface VoiceAssistantProps {
  onSendCommand: (target: string, value: string, source: string) => void;
  logs: any[];
}

export default function VoiceAssistant({ onSendCommand }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognizedCommand, setRecognizedCommand] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = "id-ID"; // Configured for Indonesian commands
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.continuous = false;

      rec.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
        setRecognizedCommand(null);
        setTranscript("Mendengarkan... Silakan bicara.");
      };

      rec.onresult = (event: any) => {
        const speechToText = event.results[0][0].transcript;
        setTranscript(speechToText);
        parseVoiceCommand(speechToText);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event);
        if (event.error === "no-speech") {
          setErrorMessage("Tidak ada suara yang terdeteksi.");
        } else if (event.error === "not-allowed") {
          setErrorMessage("Izin mikrofon ditolak.");
        } else {
          setErrorMessage(`Error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } else {
      setErrorMessage("Fitur Perintah Suara tidak didukung di browser ini. Gunakan Chrome atau Edge.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript("");
      setRecognizedCommand(null);
      setErrorMessage(null);
      try {
        recognitionRef.current?.start();
      } catch (err: any) {
        console.error("Failed to start speech recognition", err);
        setErrorMessage("Gagal mengaktifkan mikrofon.");
      }
    }
  };

  const parseVoiceCommand = (text: string) => {
    const rawText = text.toLowerCase().trim();
    let target = "";
    let value = "";
    let commandDesc = "";

    // 1. Check for Broker switching
    if (rawText.includes("pindah broker") || rawText.includes("broker")) {
      if (rawText.includes("satu") || rawText.includes("1")) {
        target = "broker"; value = "1"; commandDesc = "Pindah ke Broker 1";
      } else if (rawText.includes("dua") || rawText.includes("2")) {
        target = "broker"; value = "2"; commandDesc = "Pindah ke Broker 2";
      } else if (rawText.includes("tiga") || rawText.includes("3")) {
        target = "broker"; value = "3"; commandDesc = "Pindah ke Broker 3";
      }
    }

    // 2. Check for Variation Mode
    if (rawText.includes("variasi") || rawText.includes("mode")) {
      if (rawText.includes("satu") || rawText.includes("1")) {
        target = "variasi"; value = "1"; commandDesc = "Mulai Variasi Mode 1";
      } else if (rawText.includes("dua") || rawText.includes("2")) {
        target = "variasi"; value = "2"; commandDesc = "Mulai Variasi Mode 2";
      } else if (rawText.includes("stop") || rawText.includes("henti") || rawText.includes("mati") || rawText.includes("semua off")) {
        target = "variasi"; value = "STOP"; commandDesc = "Hentikan Variasi Mode";
      }
    }

    // 3. Relay 1 Commands
    if (rawText.includes("relay 1") || rawText.includes("relay satu")) {
      if (rawText.includes("hidup") || rawText.includes("nyala") || rawText.includes("on")) {
        target = "relay1"; value = "ON"; commandDesc = "Nyalakan Relay 1";
      } else if (rawText.includes("mati") || rawText.includes("off")) {
        target = "relay1"; value = "OFF"; commandDesc = "Matikan Relay 1";
      }
    }

    // 4. Relay 2 Commands
    if (rawText.includes("relay 2") || rawText.includes("relay dua")) {
      if (rawText.includes("hidup") || rawText.includes("nyala") || rawText.includes("on")) {
        target = "relay2"; value = "ON"; commandDesc = "Nyalakan Relay 2";
      } else if (rawText.includes("mati") || rawText.includes("off")) {
        target = "relay2"; value = "OFF"; commandDesc = "Matikan Relay 2";
      }
    }

    // 5. Relay 3 Commands
    if (rawText.includes("relay 3") || rawText.includes("relay tiga")) {
      if (rawText.includes("hidup") || rawText.includes("nyala") || rawText.includes("on")) {
        target = "relay3"; value = "ON"; commandDesc = "Nyalakan Relay 3";
      } else if (rawText.includes("mati") || rawText.includes("off")) {
        target = "relay3"; value = "OFF"; commandDesc = "Matikan Relay 3";
      }
    }

    // 6. Relay 4 Commands
    if (rawText.includes("relay 4") || rawText.includes("relay empat")) {
      if (rawText.includes("hidup") || rawText.includes("nyala") || rawText.includes("on")) {
        target = "relay4"; value = "ON"; commandDesc = "Nyalakan Relay 4";
      } else if (rawText.includes("mati") || rawText.includes("off")) {
        target = "relay4"; value = "OFF"; commandDesc = "Matikan Relay 4";
      }
    }

    // Global toggle / stop
    if (rawText === "matikan semua" || rawText === "semua mati") {
      onSendCommand("relay1", "OFF", "Suara (Semua Mati)");
      setTimeout(() => onSendCommand("relay2", "OFF", "Suara (Semua Mati)"), 150);
      setTimeout(() => onSendCommand("relay3", "OFF", "Suara (Semua Mati)"), 300);
      setTimeout(() => onSendCommand("relay4", "OFF", "Suara (Semua Mati)"), 450);
      setRecognizedCommand("Mematikan Semua Relay");
      return;
    }

    if (rawText === "nyalakan semua" || rawText === "semua hidup" || rawText === "hidupkan semua") {
      onSendCommand("relay1", "ON", "Suara (Semua Hidup)");
      setTimeout(() => onSendCommand("relay2", "ON", "Suara (Semua Hidup)"), 150);
      setTimeout(() => onSendCommand("relay3", "ON", "Suara (Semua Hidup)"), 300);
      setTimeout(() => onSendCommand("relay4", "ON", "Suara (Semua Hidup)"), 450);
      setRecognizedCommand("Menyalakan Semua Relay");
      return;
    }

    if (target && value) {
      setRecognizedCommand(commandDesc);
      onSendCommand(target, value, `Perintah Suara ("${text}")`);
    } else {
      setRecognizedCommand("Perintah tidak dikenali. Coba ucapkan perintah lain.");
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-[#222] rounded-lg p-6 text-white overflow-hidden relative">
      
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wider text-[#E0E0E0] flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-[#D4AF37]" />
            Voice Terminal Command
          </h3>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">
            Ucapkan perintah dalam bahasa indonesia untuk kontrol hands-free
          </p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 uppercase font-mono">
          V1.0 Live
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
        {/* Toggle Button Column */}
        <div className="md:col-span-2 flex flex-col items-center justify-center space-y-3 py-4">
          <button
            onClick={toggleListening}
            aria-label={isListening ? "Hentikan merekam suara" : "Mulai merekam suara"}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
              isListening
                ? "bg-rose-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-105 animate-pulse"
                : "bg-[#111] border border-[#333] hover:border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.15)] hover:scale-102"
            }`}
          >
            {isListening ? (
              <MicOff className="h-6 w-6 text-white" />
            ) : (
              <Mic className="h-6 w-6 text-[#D4AF37]" />
            )}
          </button>
          
          <div className="text-center">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isListening ? "text-rose-400" : "text-gray-450"}`}>
              {isListening ? "Listening Active..." : "Tap to Speak"}
            </span>
          </div>
        </div>

        {/* Console Column */}
        <div className="md:col-span-3 bg-black rounded-lg p-4 border border-[#222] min-h-[140px] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase">System Command Receiver</span>
            
            {transcript && (
              <div className="mt-2 font-mono">
                <span className="text-[10px] text-gray-500">Audio input:</span>
                <p className="text-sm text-gray-300 mt-0.5 italic">"{transcript}"</p>
              </div>
            )}

            {recognizedCommand && (
              <div className="mt-2 p-1.5 px-2 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-sm text-xs font-mono text-[#D4AF37]">
                <span className="font-bold">DECODED: </span>
                {recognizedCommand}
              </div>
            )}

            {errorMessage && (
              <div className="mt-2 p-1.5 px-2 bg-rose-500/10 border border-rose-900/40 rounded-sm text-xs text-rose-450 font-mono">
                {errorMessage}
              </div>
            )}

            {!transcript && !errorMessage && (
              <p className="text-[10px] text-gray-500 mt-2 font-mono uppercase tracking-wide leading-relaxed">
                Klik tombol mikrofon dan ucapkan perintah Anda. Contoh: "Nyalakan relay satu" atau "Variasi dua".
              </p>
            )}
          </div>
          
          <div className="pt-2 border-t border-[#1F1F1F] flex items-center justify-between text-[9px] text-[#A0A0A0] font-mono">
            <span>ENGINE: <strong className="text-gray-300 uppercase">INDONESIAN (id-ID)</strong></span>
            {isListening && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>}
          </div>
        </div>
      </div>

      {/* Guide Block */}
      <div className="mt-5 border-t border-[#222] pt-4">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
          <HelpCircle className="h-4 w-4 text-[#D4AF37]" />
          Daftar Perintah Suara Terdaftar:
        </span>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-[10px] font-mono tracking-wide text-gray-400">
          <div className="bg-[#050505] p-2 rounded border border-[#222]">
            <span className="text-[#D4AF37] font-semibold block uppercase tracking-wider mb-1">💡 Relay Manual</span>
            <span>"Nyalakan relay dua" / "Matikan relay satu"</span>
          </div>
          <div className="bg-[#050505] p-2 rounded border border-[#222]">
            <span className="text-[#D4AF37] font-semibold block uppercase tracking-wider mb-1">🔁 Sequencing</span>
            <span>"Variasi satu" / "Variasi dua" / "Stop"</span>
          </div>
          <div className="bg-[#050505] p-2 rounded border border-[#222]">
            <span className="text-[#D4AF37] font-semibold block uppercase tracking-wider mb-1">📶 Central Switch</span>
            <span>"Nyalakan semua" / "Matikan semua"</span>
          </div>
        </div>
      </div>
    </div>
  );
}

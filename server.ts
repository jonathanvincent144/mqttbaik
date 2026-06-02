import express from "express";
import path from "path";
import fs from "fs/promises";
import mqtt from "mqtt";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { BrokerConfig, RelayState, SensorData, LogEntry, AppStatus } from "./src/types.js";

// Setup ESM paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const CONFIG_FILE_PATH = path.join(process.cwd(), "config_brokers.json");

// Application state in memory
let brokerConfigs: BrokerConfig[] = [];
const clients: mqtt.MqttClient[] = [];
const connectionStatus: ("connected" | "disconnected" | "connecting" | "error")[] = [
  "disconnected",
  "disconnected",
  "disconnected"
];

let sensorData: SensorData = {
  suhu: 0,
  kelembaban: 0,
  lastUpdated: new Date().toISOString(),
};

let relayState: RelayState = {
  relay1: false,
  relay2: false,
  relay3: false,
  relay4: false,
  variasiMode: 0,
};

let activeBrokerIndex = 0; // ESP32 reported active broker (default index 0)
let logs: LogEntry[] = [];

// SSE Clients list
let sseClients: any[] = [];

// Helper to add log and notify UI
function addLog(type: LogEntry["type"], message: string, broker?: string) {
  const log: LogEntry = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    type,
    message,
    broker,
  };
  logs.unshift(log);
  // Keep logs to a maximum of 100 entries to save memory
  if (logs.length > 100) {
    logs = logs.slice(0, 100);
  }
  broadcastStateToClients();
}

// Broadcast updated state to all connected SSE clients
function broadcastStateToClients() {
  const state: AppStatus = {
    brokers: brokerConfigs,
    connectionStatus,
    sensorData,
    relayState,
    activeBrokerIndex,
    logs,
  };
  const data = JSON.stringify(state);
  sseClients.forEach((client) => {
    client.res.write(`data: ${data}\n\n`);
  });
}

// Initialise or load configuration
async function loadConfigurations() {
  try {
    const data = await fs.readFile(CONFIG_FILE_PATH, "utf8");
    brokerConfigs = JSON.parse(data);
    console.log("Loaded configurations from file:", CONFIG_FILE_PATH);
  } catch (error) {
    console.log("Configuration file not found, using default configurations.");
    brokerConfigs = [
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
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(brokerConfigs, null, 2), "utf8");
  }
}

// Initialize MQTT connection for one broker index
function connectMqttClient(index: number) {
  const config = brokerConfigs[index];
  if (!config) return;

  // If there's an existing client, end it
  if (clients[index]) {
    try {
      clients[index].end(true);
    } catch (e) {
      console.error(`Failed to close client ${index}:`, e);
    }
  }

  connectionStatus[index] = "connecting";
  addLog("info", `Menghubungkan ke Broker ${index + 1} (${config.server})...`, config.server);

  // Parse credentials
  let username = config.user;
  if (config.vhost && config.vhost.trim().length > 0) {
    username = `${config.vhost}:${config.user}`;
  }

  let clientId = `${config.client_id}_web_${Math.random().toString(16).substring(2, 6)}`;
  if (index === 2 || config.client_id === "hebatwebclient2") {
    clientId = config.client_id;
  }
  const brokerUrl = `mqtts://${config.server}:${config.port}`;

  console.log(`[MQTT ${index + 1}] Connecting to ${brokerUrl} as ${clientId}`);

  const client = mqtt.connect(brokerUrl, {
    username: username || undefined,
    password: config.pass || undefined,
    clientId,
    rejectUnauthorized: false, // Bypass certificate authorization for custom ssl configurations
    reconnectPeriod: 6000,
  });

  clients[index] = client;

  client.on("connect", () => {
    connectionStatus[index] = "connected";
    addLog("success", `Koneksi sukses ke Broker ${index + 1} (${config.server})`, config.server);
    
    // Subscribe to all topics
    client.subscribe([
      "sensor/suhu",
      "sensor/kelembaban",
      "status/broker",
      "kontrol/relay1",
      "kontrol/relay2",
      "kontrol/relay3",
      "kontrol/relay4",
      "kontrol/variasi",
      "kontrol/broker"
    ], (err) => {
      if (err) {
        console.error(`[MQTT ${index + 1}] Subscription error:`, err);
        addLog("error", `Gagal men-subscribe topic di Broker ${index + 1}: ${err.message}`, config.server);
      } else {
        console.log(`[MQTT ${index + 1}] Subscribed successfully`);
      }
    });
  });

  client.on("message", (topic, payload) => {
    const rawVal = payload.toString();
    const cleanVal = rawVal.trim();
    console.log(`[MQTT ${index + 1} RX] ${topic} => ${cleanVal}`);

    if (topic === "sensor/suhu") {
      const val = parseFloat(cleanVal);
      if (!isNaN(val)) {
        sensorData.suhu = val;
        sensorData.lastUpdated = new Date().toISOString();
        addLog("sensor", `Sensor Suhu diperbarui: ${val} °C (Broker ${index + 1})`, config.server);
      }
    } else if (topic === "sensor/kelembaban") {
      const val = parseFloat(cleanVal);
      if (!isNaN(val)) {
        sensorData.kelembaban = val;
        sensorData.lastUpdated = new Date().toISOString();
        addLog("sensor", `Sensor Kelembaban diperbarui: ${val} % (Broker ${index + 1})`, config.server);
      }
    } else if (topic === "status/broker") {
      // Format: BROKER:index|server
      // e.g.: BROKER:1|kingfisher.lmq.cloudamqp.com
      if (cleanVal.startsWith("BROKER:")) {
        const parts = cleanVal.substring(7).split("|");
        const idx = parseInt(parts[0], 10) - 1;
        if (idx >= 0 && idx < 3) {
          activeBrokerIndex = idx;
          addLog("info", `ESP32 melaporkan aktif di Broker ${idx + 1} (${parts[1] || ""})`, config.server);
        }
      }
    } else if (topic.startsWith("kontrol/relay")) {
      const relayNum = topic.substring(13); // "1", "2", "3" or "4"
      const isON = cleanVal === "ON";
      const key = `relay${relayNum}` as keyof RelayState;
      if (key in relayState) {
        (relayState as any)[key] = isON;
        addLog("control", `Status Manual Relay ${relayNum} diubah ke ${cleanVal} (Broker ${index + 1})`, config.server);
      }
    } else if (topic === "kontrol/variasi") {
      if (cleanVal === "1") {
        relayState.variasiMode = 1;
        addLog("control", `Mode Variasi 1 Aktif (1->2->3->4) (Broker ${index + 1})`, config.server);
      } else if (cleanVal === "2") {
        relayState.variasiMode = 2;
        addLog("control", `Mode Variasi 2 Aktif (4->3->2->1) (Broker ${index + 1})`, config.server);
      } else if (cleanVal === "STOP") {
        relayState.variasiMode = 0;
        addLog("control", `Mode Variasi Dihentikan. Relay dikembalikan ke mode manual. (Broker ${index + 1})`, config.server);
      }
    } else if (topic === "kontrol/broker") {
      const val = parseInt(cleanVal, 10);
      if (val >= 1 && val <= 3) {
        addLog("control", `Perintah pindah broker dikirim ke ESP32: Broker ${val} (Broker ${index + 1})`, config.server);
      }
    }
  });

  client.on("close", () => {
    // Only flag closed if we were previously connected or trying to connect
    if (connectionStatus[index] !== "disconnected") {
      connectionStatus[index] = "disconnected";
      addLog("warning", `Koneksi terputus dari Broker ${index + 1} (${config.server})`, config.server);
    }
  });

  client.on("error", (err) => {
    console.error(`[MQTT ${index + 1} Error]:`, err);
    connectionStatus[index] = "error";
    addLog("error", `Error pada Broker ${index + 1}: ${err.message}`, config.server);
  });
}

// Setup full connections
function startMqttClients() {
  for (let i = 0; i < 3; i++) {
    connectMqttClient(i);
  }
}

// Publish MQTT payload to ALL connected brokers so that the ESP32 receives it regardless of its active broker
function publishToAll(topic: string, message: string) {
  let anyPublished = false;
  clients.forEach((client, index) => {
    if (connectionStatus[index] === "connected" && client) {
      client.publish(topic, message, { qos: 1 });
      anyPublished = true;
    }
  });
  return anyPublished;
}

// Express server setup
async function startServer() {
  await loadConfigurations();
  startMqttClients();

  const app = express();
  app.use(express.json());

  // API Route: Current Status
  app.get("/api/status", (req, res) => {
    res.json({
      brokers: brokerConfigs,
      connectionStatus,
      sensorData,
      relayState,
      activeBrokerIndex,
      logs,
    });
  });

  // API Route: Send control instruction
  app.post("/api/control", (req, res) => {
    const { target, value, source } = req.body;
    let topic = "";
    let message = "";
    let logMessage = "";

    if (target.startsWith("relay")) {
      const relayNum = target.substring(5); // "1", "2", etc.
      topic = `kontrol/relay${relayNum}`;
      message = value; // "ON" or "OFF"
      logMessage = `${source || "Web UI"} mengirim kontrol Relay ${relayNum} => ${value}`;
    } else if (target === "variasi") {
      topic = "kontrol/variasi";
      message = value; // "1", "2", "STOP"
      logMessage = `${source || "Web UI"} mengirim kontrol Mode Variasi => ${value}`;
    } else if (target === "broker") {
      topic = "kontrol/broker";
      message = value; // "1", "2", "3"
      logMessage = `${source || "Web UI"} mengajukan pindah Broker ke => Broker ${value}`;
    } else {
      return res.status(400).json({ error: "Target tidak valid" });
    }

    addLog("control", logMessage);
    const ok = publishToAll(topic, message);

    res.json({ success: true, publishedToConnected: ok });
    broadcastStateToClients();
  });

  // API Route: Update broker configurations
  app.post("/api/config", async (req, res) => {
    const { index, server, port, user, pass, client_id, vhost } = req.body;

    if (index < 0 || index > 2) {
      return res.status(400).json({ error: "Index broker tidak valid (harus 0, 1, atau 2)" });
    }

    const updatedConfig: BrokerConfig = {
      server,
      port: parseInt(port, 10),
      user,
      pass,
      client_id,
      vhost: vhost || null,
    };

    brokerConfigs[index] = updatedConfig;

    try {
      await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(brokerConfigs, null, 2), "utf8");
      addLog("success", `Konfigurasi Broker ${index + 1} berhasil diperbarui.`);
      
      // Reconnect this specific client
      connectMqttClient(index);
      
      res.json({ success: true, configs: brokerConfigs });
    } catch (err: any) {
      console.error("Save config error:", err);
      res.status(500).json({ error: "Gagal menyimpan konfigurasi: " + err.message });
    }
  });

  // API Route: Reset logs
  app.post("/api/logs/clear", (req, res) => {
    logs = [];
    addLog("info", "Riwayat log dibersihkan.");
    res.json({ success: true });
  });

  // SSE (Server-Sent Events) Endpoint for Realtime Dashboard Sync
  app.get("/api/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const clientId = Math.random().toString(36).substring(2, 9);
    console.log(`[SSE] Client connected: ${clientId}`);

    // Send initial client state immediately
    const state: AppStatus = {
      brokers: brokerConfigs,
      connectionStatus,
      sensorData,
      relayState,
      activeBrokerIndex,
      logs,
    };
    res.write(`data: ${JSON.stringify(state)}\n\n`);

    const newClient = { id: clientId, res };
    sseClients.push(newClient);

    req.on("close", () => {
      console.log(`[SSE] Client disconnected: ${clientId}`);
      sseClients = sseClients.filter((client) => client.id !== clientId);
    });
  });

  // Serve Single-Page React Application (Vite integration)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});

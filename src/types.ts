export interface BrokerConfig {
  server: string;
  port: number;
  user: string;
  pass: string;
  client_id: string;
  vhost: string | null;
}

export interface RelayState {
  relay1: boolean;
  relay2: boolean;
  relay3: boolean;
  relay4: boolean;
  variasiMode: number; // 0 = off, 1 = mode 1, 2 = mode 2
}

export interface SensorData {
  suhu: number;
  kelembaban: number;
  lastUpdated: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'control' | 'sensor';
  message: string;
  broker?: string;
}

export interface AppStatus {
  brokers: BrokerConfig[];
  connectionStatus: ('connected' | 'disconnected' | 'connecting' | 'error')[];
  sensorData: SensorData;
  relayState: RelayState;
  activeBrokerIndex: number; // 0, 1, 2 (corresponds to index in list)
  logs: LogEntry[];
}

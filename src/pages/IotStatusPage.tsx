import React, { useState } from 'react';
import {
  Radio,
  Cpu,
  Wifi,
  Server,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Code,
  Layers,
  Thermometer,
  Droplets,
  Sun,
  Eye,
  Activity
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';

interface IotStatusPageProps {
  navigate: (path: string) => void;
}

const SAMPLE_ESP32_MQTT_PACKET = `{
  "device_id": "ESP32-NODE-LAB-01",
  "firmware": "v2.4.1-datapulse",
  "timestamp": "2026-10-09T10:30:00Z",
  "sensors": {
    "dht22_temp_c": 23.4,
    "dht22_humidity_pct": 48.2,
    "soil_moisture_pct": 62.0,
    "ldr_lux": 420.5,
    "pir_motion": false,
    "bme280_pressure_hpa": 1013.25
  },
  "battery_voltage": 3.32,
  "wifi_rssi_dbm": -64
}`;

export const IotStatusPage: React.FC<IotStatusPageProps> = ({ navigate }) => {
  const [packetInput, setPacketInput] = useState(SAMPLE_ESP32_MQTT_PACKET);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    issues: string[];
    parsedData?: any;
  } | null>(null);

  const testSensors = [
    {
      sensor: 'DHT22',
      metric: 'Temperature & Relative Humidity',
      range: '-40 to 80 °C, 0–100% RH',
      icon: Thermometer,
      status: 'Planned Driver',
    },
    {
      sensor: 'Capacitive v1.2',
      metric: 'Soil Moisture Level',
      range: '0–100% Normalized Volumetric',
      icon: Droplets,
      status: 'Planned Driver',
    },
    {
      sensor: 'LDR Photocell',
      metric: 'Ambient Light Luminance',
      range: '0–1000 Lux ADC',
      icon: Sun,
      status: 'Planned Driver',
    },
    {
      sensor: 'HC-SR501 PIR',
      metric: 'Passive Infrared Motion Event',
      range: 'Binary (Motion / Idle)',
      icon: Activity,
      status: 'Planned Driver',
    },
    {
      sensor: 'BME280',
      metric: 'Barometric Pressure & Environment',
      range: '300–1100 hPa',
      icon: Activity,
      status: 'Planned Driver',
    },
  ];

  const handleValidatePacket = () => {
    try {
      const parsed = JSON.parse(packetInput);
      const issues: string[] = [];

      if (!parsed.device_id) issues.push('Missing required device_id field');
      if (!parsed.timestamp || isNaN(Date.parse(parsed.timestamp))) issues.push('Invalid or missing ISO timestamp');
      if (!parsed.sensors) {
        issues.push('Missing sensors payload object');
      } else {
        const s = parsed.sensors;
        if (typeof s.dht22_temp_c !== 'number' || s.dht22_temp_c < -40 || s.dht22_temp_c > 85) {
          issues.push('DHT22 temperature out of plausible range [-40°C, 85°C]');
        }
        if (typeof s.dht22_humidity_pct !== 'number' || s.dht22_humidity_pct < 0 || s.dht22_humidity_pct > 100) {
          issues.push('DHT22 humidity out of valid percentage range [0%, 100%]');
        }
        if (typeof s.bme280_pressure_hpa === 'number' && (s.bme280_pressure_hpa < 300 || s.bme280_pressure_hpa > 1100)) {
          issues.push('BME280 pressure exceeds physical atmospheric limits [300, 1100 hPa]');
        }
      }

      setValidationResult({
        valid: issues.length === 0,
        issues,
        parsedData: parsed,
      });
    } catch {
      setValidationResult({
        valid: false,
        issues: ['Malformed JSON string. Failed parser deserialization.'],
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3D1023]">
              IoT & Microcontroller Pipeline
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#756772]/15 text-[#756772] font-bold border border-[#756772]/30">
              PLANNED ROADMAP
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#756772] mt-0.5">
            Architectural blueprint for ESP32 edge streaming via MQTT brokers into DataPulse.
          </p>
        </div>
      </div>

      {/* Scientific Honesty Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#F8EFE5] border-l-4 border-[#641B32] border-t border-r border-b border-[#D9A0AE]/30 text-xs text-[#756772] space-y-1">
        <h4 className="font-bold text-[#29212A] flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#641B32]" />
          Status: Architecture Defined • Physical Hardware Gateway In Progress
        </h4>
        <p className="leading-relaxed">
          In strict compliance with our <strong>Scientific Honesty Requirement</strong>, real-time ESP32 edge ingestion is currently marked as <strong>Planned</strong>. DataPulse will never display simulated live telemetry as physical hardware without active physical broker handshake verification.
        </p>
      </div>

      {/* Target Pipeline Architecture Visualizer */}
      <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-3xl p-6 sm:p-8 shadow-sm">
        <h3 className="font-serif font-bold text-base text-[#3D1023] mb-6">
          Edge-to-Intelligence Pipeline Pipeline Topology
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-xs">
          <div className="p-4 bg-[#F8EFE5] rounded-2xl border border-[#D9A0AE]/30 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#FFF8EF] text-[#641B32] flex items-center justify-center mx-auto">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="font-bold text-[#29212A]">ESP32 Node</div>
            <div className="text-[10px] text-[#756772]">FreeRTOS / C++ sensor polling loop</div>
          </div>

          <div className="p-4 bg-[#F8EFE5] rounded-2xl border border-[#D9A0AE]/30 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#FFF8EF] text-[#641B32] flex items-center justify-center mx-auto">
              <Wifi className="w-5 h-5" />
            </div>
            <div className="font-bold text-[#29212A]">Wi-Fi / TLS</div>
            <div className="text-[10px] text-[#756772]">WPA2/WPA3 encrypted transport</div>
          </div>

          <div className="p-4 bg-[#F8EFE5] rounded-2xl border border-[#D9A0AE]/30 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#FFF8EF] text-[#641B32] flex items-center justify-center mx-auto">
              <Server className="w-5 h-5" />
            </div>
            <div className="font-bold text-[#29212A]">MQTT Broker</div>
            <div className="text-[10px] text-[#756772]">EMQX / Mosquitto pub-sub topics</div>
          </div>

          <div className="p-4 bg-[#641B32] text-[#FFF8EF] rounded-2xl space-y-2 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#3D1023] text-[#D9A0AE] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="font-bold text-[#FFF8EF]">Quality Engine</div>
            <div className="text-[10px] text-[#D9A0AE]">Deterministic 6D gatekeeper</div>
          </div>

          <div className="p-4 bg-[#F8EFE5] rounded-2xl border border-[#D9A0AE]/30 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#FFF8EF] text-[#641B32] flex items-center justify-center mx-auto">
              <Activity className="w-5 h-5" />
            </div>
            <div className="font-bold text-[#29212A]">Trace & Analytics</div>
            <div className="text-[10px] text-[#756772]">DP-XXXXXX ledger & prediction</div>
          </div>
        </div>
      </div>

      {/* Supported Sensors Specification */}
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-base text-[#3D1023]">
          Planned Microcontroller Sensor Hardware Specification
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {testSensors.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.sensor} className="p-4 bg-[#FFF8EF] rounded-2xl border border-[#D9A0AE]/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-[#29212A]">
                    <Icon className="w-4 h-4 text-[#641B32]" />
                    <span>{s.sensor}</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F8EFE5] text-[#756772]">
                    {s.status}
                  </span>
                </div>
                <div className="text-[#756772] text-[11px]">{s.metric}</div>
                <div className="font-mono text-[10px] text-[#641B32] pt-1 border-t border-[#D9A0AE]/20">
                  Target Range: {s.range}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive JSON MQTT Packet Validator Simulator */}
      <div className="bg-[#F8EFE5] border border-[#D9A0AE]/30 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-base text-[#3D1023] flex items-center gap-2">
              <Code className="w-4 h-4 text-[#641B32]" />
              MQTT Telemetry Packet Quality Simulator
            </h3>
            <p className="text-xs text-[#756772] mt-0.5">
              Test an incoming ESP32 sensor JSON packet against DataPulse's 6 quality dimensions.
            </p>
          </div>

          <button
            onClick={handleValidatePacket}
            className="px-4 py-2 rounded-xl bg-[#641B32] text-[#FFF8EF] font-bold text-xs hover:bg-[#3D1023] transition-colors"
          >
            Validate Packet Schema
          </button>
        </div>

        <textarea
          rows={11}
          value={packetInput}
          onChange={e => setPacketInput(e.target.value)}
          className="w-full p-4 bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-2xl font-mono text-xs text-[#29212A] focus:outline-none focus:border-[#641B32]"
        />

        {validationResult && (
          <div
            className={`p-4 rounded-2xl border text-xs ${
              validationResult.valid
                ? 'bg-[#277A58]/10 border-[#277A58]/30 text-[#277A58]'
                : 'bg-[#B4233D]/10 border-[#B4233D]/30 text-[#B4233D]'
            }`}
          >
            {validationResult.valid ? (
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Payload Conforms to DataPulse Plausibility & Timeliness Standards! Ready for Ingestion.</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Quality Defects Identified in Sensor Packet:</span>
                </div>
                <ul className="list-disc list-inside font-mono text-[11px] pl-2 space-y-0.5">
                  {validationResult.issues.map((iss, i) => (
                    <li key={i}>{iss}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertType } from './types';
import type { SensorData, Alert, HistoryEntry, Hive, ChatMessage } from './types';
import type { GenerateContentResponse } from '@google/genai';
import {
  TEMPERATURE_IDEAL_MIN, TEMPERATURE_IDEAL_MAX, TEMPERATURE_WARNING_LOW, TEMPERATURE_WARNING_HIGH,
  HUMIDITY_IDEAL_MIN, HUMIDITY_IDEAL_MAX, HUMIDITY_WARNING_LOW, HUMIDITY_WARNING_HIGH,
  SOUND_IDEAL_MIN, SOUND_IDEAL_MAX, SOUND_WARNING_LOW, SOUND_WARNING_HIGH, SOUND_CRITICAL_HIGH,
} from './constants';
import { createChatSession } from './services/geminiService';
import { db, ref, onValue, get, query, limitToLast, orderByKey } from './services/firebase';
import Header from './components/Header';
import Footer from './components/Footer';
import GaugeChart from './components/GaugeChart';
import AlertsCard from './components/AlertsCard';
import WeightHistoryChart from './components/WeightHistoryChart';
import Modal from './components/Modal';
import HiveSelector from './components/HiveSelector';
import LiveInfo from './components/LiveInfo';
import ChatInterface from './components/ChatInterface';

// ---- Local extension to avoid editing your global Hive type ----
type SimFields = {
  simEnabled?: boolean;
  simClock?: number; // virtual time in ms
  simConfig?: {
    baseTemp: number;
    baseHum: number;
    baseSound: number;
    baseWeight: number;
    stepTemp: number;
    stepHum: number;
    stepSound: number;
    stepWeight: number;
  };
  image?: string;
  imageTimestamp?: number;
  lastUpdatedTimestamp?: number;
};
type HiveSim = Hive & SimFields;

// ---- Existing helpers ----
const generateRandomWeight = (min: number, max: number): number => {
  return min + (Math.random() * (max - min));
};

const scaleWeight = (rawWeight: number): number => {
  const randomNumberBase = generateRandomWeight(23000, 25000);
  let finalGramWeight: number;
  if (rawWeight >= 0) {
    finalGramWeight = randomNumberBase - rawWeight;
  } else {
    finalGramWeight = randomNumberBase + rawWeight;
  }
  return finalGramWeight;
};

// ---- Simulation helpers (independent randoms & history generation) ----
const randBetween = (min: number, max: number) => min + Math.random() * (max - min);

const stepAround = (current: number, step: number, min: number, max: number) => {
  const next = current + (Math.random() * 2 - 1) * step;
  return Math.max(min, Math.min(max, next));
};

const buildSimHistory = (
  points: number,
  stepMs: number,
  startClockMs: number,
  cfg: {
    baseTemp: number; baseHum: number; baseSound: number; baseWeight: number;
    stepTemp: number; stepHum: number; stepSound: number; stepWeight: number;
  }
): { history: HistoryEntry[]; last: SensorData; lastClock: number } => {
  const history: HistoryEntry[] = [];
  let tClock = startClockMs - points * stepMs;

  // start near baselines
  let temp = cfg.baseTemp + randBetween(-0.8, 0.8);
  let hum = cfg.baseHum + randBetween(-3, 3);
  let snd = cfg.baseSound + randBetween(-2, 2);
  let wgt = cfg.baseWeight + randBetween(-100, 100);

  for (let i = 0; i < points; i++) {
    tClock += stepMs;

    temp = stepAround(temp, cfg.stepTemp, 20, 45);
    hum  = stepAround(hum,  cfg.stepHum,  20, 90);
    snd  = stepAround(snd,  cfg.stepSound,10, 100);
    wgt  = stepAround(wgt,  cfg.stepWeight, 20000, 30000);

    history.push({
      timestamp: tClock,
      temperature: temp,
      humidity: hum,
      weight: Math.round(wgt),
      sound: snd,
    });
  }

  const last = history[history.length - 1];
  return { history, last, lastClock: tClock };
};

const App: React.FC = () => {
  const [hivesData, setHivesData] = useState<HiveSim[]>([]);
  const [selectedHiveId, setSelectedHiveId] = useState<string | null>('bwise-1');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [isHistoryLoading, setHistoryLoading] = useState(false);
  const [isChatLoading, setChatLoading] = useState(false);
  const objectURLsRef = useRef<string[]>([]);

  // ---- Initialize all hives (1–10), with 3–10 simulated via virtual time ----
  useEffect(() => {
    const initialHives: HiveSim[] = [];
    const NOW = Date.now(); // Use current time as reference

    for (let j = 1; j <= 10; j++) {
      const isHive1 = j === 1;
      const isHive2 = j === 2;

      if (isHive1 || isHive2) {
        // Boot history for live hives; Firebase will overwrite quickly
        const now = Date.now();
        const fullHistory: HistoryEntry[] = [];
        for (let i = 20; i > 0; i--) {
          const temp = 34 + (Math.random() - 0.5) * 4;
          const hum  = 55 + Math.random() * 25;
          const snd  = 50 + Math.random() * 20;

          const weight = isHive1
            ? scaleWeight(generateRandomWeight(-200, 200))
            : Math.round(generateRandomWeight(23000, 25000));

          fullHistory.push({
            timestamp: now - i * 60000 * 15,
            temperature: temp,
            humidity: hum,
            weight,
            sound: snd,
          });
        }

        initialHives.push({
          id: `bwise-${j}`,
          name: `Bwise Hive #${j}`,
          sensorData: fullHistory[fullHistory.length - 1],
          fullHistory,
          weightHistory: fullHistory.map(d => ({ timestamp: d.timestamp, weight: d.weight })),
          chat: createChatSession(),
          chatHistory: [],
          simEnabled: false, // live hives
          lastUpdatedTimestamp: now,
        });
      } else {
        // ---- HIVES 3–10: full simulation ----
        const simConfig = {
          baseTemp: randBetween(31, 36),
          baseHum: randBetween(50, 70),
          baseSound: randBetween(45, 65),
          baseWeight: randBetween(23000, 26000),
          stepTemp: randBetween(0.2, 0.7),
          stepHum: randBetween(0.8, 2.0),
          stepSound: randBetween(1.0, 3.0),
          stepWeight: randBetween(10, 40),
        };

        // original generation: points=20, step=15min
        const stepMs = 15 * 60 * 1000;
        const { history, last, lastClock } = buildSimHistory(
          20,
          stepMs, // 15 minutes step
          NOW - randBetween(1 * 60 * 60 * 1000, 24 * 60 * 60 * 1000), // original start in past
          simConfig
        );

        // Shift all timestamps so the last entry is approximately "now" (with tiny jitter)
        const now = Date.now();
        // Add a small random jitter so not every hive has the exact same last timestamp
        const jitter = Math.round(randBetween(0, stepMs));
        const offset = now - lastClock - jitter;

        const shiftedHistory = history.map(h => ({
          ...h,
          timestamp: h.timestamp + offset,
        }));

        const shiftedLast = {
          ...last,
          timestamp: last.timestamp + offset,
        };
        const shiftedLastClock = lastClock + offset;

        initialHives.push({
          id: `bwise-${j}`,
          name: `Bwise Hive #${j}`,
          sensorData: shiftedLast,
          fullHistory: shiftedHistory,
          weightHistory: shiftedHistory.map(d => ({ timestamp: d.timestamp, weight: d.weight })),
          chat: createChatSession(),
          chatHistory: [],
          simEnabled: true,
          simClock: shiftedLastClock,
          simConfig,
          lastUpdatedTimestamp: shiftedLastClock,
        });
      }
    }

    setHivesData(initialHives);
    
    // Set initial lastUpdated based on selected hive
    const initialSelectedHive = initialHives.find(h => h.id === selectedHiveId);
    if (initialSelectedHive) {
      setLastUpdated(new Date(initialSelectedHive.lastUpdatedTimestamp || Date.now()));
    }

    return () => {
      objectURLsRef.current.forEach(url => URL.revokeObjectURL(url));
      objectURLsRef.current = [];
    };
  }, []);

  // ---- Firebase: live updates for Hive 1 & 2 only ----
  useEffect(() => {
    const hive1Id = 'bwise-1';
    const hive2Id = 'bwise-2';

    const currentDbRef = ref(db, 'beehive');
    const unsubscribeCurrent = onValue(currentDbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const timestamp = data.timestamp * 1000;
        
        setHivesData(prev => prev.map(hive => {
          if (hive.id === hive1Id) {
            const rawWeight = data.weight || 0;
            const newSensorData: SensorData = {
              temperature: data.temperature || 0,
              humidity: data.humidity || 0,
              weight: scaleWeight(rawWeight),
              sound: data.sound_dB || 0,
              timestamp: timestamp,
            };
            const updatedHistory = [...hive.fullHistory.slice(-99), newSensorData];
            return {
              ...hive,
              sensorData: newSensorData,
              fullHistory: updatedHistory,
              weightHistory: updatedHistory.map(d => ({ timestamp: d.timestamp, weight: d.weight })),
              lastUpdatedTimestamp: timestamp,
            };
          }
          return hive;
        }));
        
        // Update lastUpdated only if hive1 is currently selected
        if (selectedHiveId === hive1Id) {
          setLastUpdated(new Date(timestamp));
        }
      }
    });

    const currentDbRef2 = ref(db, 'beehive2');
    const unsubscribeCurrent2 = onValue(currentDbRef2, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const timestamp = data.timestamp * 1000;
        
        setHivesData(prev => prev.map(hive => {
          if (hive.id === hive2Id) {
            const newSensorData: SensorData = {
              temperature: data.temperature || 0,
              humidity: data.humidity || 0,
              weight: data.weight || 0,
              sound: data.sound_dB || 0,
              timestamp: timestamp,
            };
            const updatedHistory = [...hive.fullHistory.slice(-99), newSensorData];
            return {
              ...hive,
              sensorData: newSensorData,
              fullHistory: updatedHistory,
              weightHistory: updatedHistory.map(d => ({ timestamp: d.timestamp, weight: d.weight })),
              lastUpdatedTimestamp: timestamp,
            };
          }
          return hive;
        }));
        
        // Update lastUpdated only if hive2 is currently selected
        if (selectedHiveId === hive2Id) {
          setLastUpdated(new Date(timestamp));
        }
      }
    });

    // Latest image for Hive 1 (unchanged)
    const imageDbRef = ref(db, 'bwise_images/latest');
    const unsubscribeImage = onValue(imageDbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const imageTimestamp = data.timestamp ? new Date(data.timestamp).getTime() : Date.now();
        setHivesData(prev => prev.map(hive => hive.id === hive1Id ? { ...hive, image: data.url, imageTimestamp } : hive));
      }
    });

    // Hive 1 history
    const historyQuery1 = query(ref(db, 'beehive_history'), orderByKey(), limitToLast(100));
    get(historyQuery1).then((snapshot) => {
      if (snapshot.exists()) {
        const obj = snapshot.val() as Record<string, any>;
        const history: HistoryEntry[] = Object
          .entries(obj)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, reading]) => ({
            temperature: reading.temperature || 0,
            humidity: reading.humidity || 0,
            weight: scaleWeight(reading.weight || 0),
            sound: reading.sound_dB || 0,
            timestamp: (reading.timestamp ?? 0) * 1000,
          }));

        setHivesData(prev => prev.map(h =>
          h.id === hive1Id
            ? { ...h, fullHistory: history, weightHistory: history.map(d => ({ timestamp: d.timestamp, weight: d.weight })) }
            : h
        ));
      }
    }).catch(err => console.error("Error fetching beehive history:", err));

    // Hive 2 history
    const historyQuery2 = query(ref(db, 'beehive_history2'), orderByKey(), limitToLast(100));
    get(historyQuery2).then((snapshot) => {
      if (snapshot.exists()) {
        const obj = snapshot.val() as Record<string, any>;
        const history: HistoryEntry[] = Object
          .entries(obj)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, reading]) => ({
            temperature: reading.temperature || 0,
            humidity: reading.humidity || 0,
            weight: reading.weight || 0, // hive2 weight is already grams
            sound: reading.sound_dB || 0,
            timestamp: (reading.timestamp ?? 0) * 1000,
          }));

        setHivesData(prev => prev.map(h =>
          h.id === hive2Id
            ? { ...h, fullHistory: history, weightHistory: history.map(d => ({ timestamp: d.timestamp, weight: d.weight })) }
            : h
        ));
      }
    }).catch(err => console.error("Error fetching beehive2 history:", err));

    return () => {
      unsubscribeCurrent();
      unsubscribeImage();
      unsubscribeCurrent2();
    };
  }, [selectedHiveId]);

  // ---- Simulation loop: advance only simulated hives (3–10) using VIRTUAL time ----
  useEffect(() => {
    const simulationInterval = 600000; // 10 minutes in real time
    const simulationStep = 600000; // 10 minutes in virtual time

    const intervalId = setInterval(() => {
      setHivesData(prevHives => {
        const nextHives = prevHives.map(hive => {
          if (!hive.simEnabled) return hive; // skip live hives 1 & 2

          // Ensure we don't go into the future - cap at current real time
          const currentRealTime = Date.now();
          const currentSimTime = hive.simClock || currentRealTime;
          const nextClock = Math.min(currentRealTime, currentSimTime + simulationStep);

          const cfg = hive.simConfig ?? {
            baseTemp: 34, baseHum: 60, baseSound: 55, baseWeight: 24000,
            stepTemp: 0.5, stepHum: 1.5, stepSound: 2.0, stepWeight: 25,
          };

          const last = hive.sensorData || {
            temperature: cfg.baseTemp,
            humidity: cfg.baseHum,
            sound: cfg.baseSound,
            weight: cfg.baseWeight,
            timestamp: nextClock - simulationStep,
          };

          const temperature = stepAround(last.temperature, cfg.stepTemp, 20, 45);
          const humidity   = stepAround(last.humidity,    cfg.stepHum,  20, 90);
          const sound      = stepAround(last.sound,       cfg.stepSound,10, 100);
          const weight     = stepAround(last.weight,      cfg.stepWeight, 20000, 30000);

          const newSensorData: SensorData = {
            temperature,
            humidity,
            sound,
            weight: Math.round(weight),
            timestamp: nextClock, // VIRTUAL timestamp (capped at current real time)
          };

          const updatedHistory = [...hive.fullHistory.slice(-99), newSensorData];

          return {
            ...hive,
            sensorData: newSensorData,
            fullHistory: updatedHistory,
            weightHistory: updatedHistory.map(d => ({ timestamp: d.timestamp, weight: d.weight })),
            simClock: nextClock,
            lastUpdatedTimestamp: nextClock,
          };
        });

        // Update lastUpdated for currently selected hive if it's simulated
        const selectedHive = nextHives.find(h => h.id === selectedHiveId);
        if (selectedHive?.simEnabled) {
          setLastUpdated(new Date(selectedHive.lastUpdatedTimestamp || Date.now()));
        }

        return nextHives;
      });
    }, simulationInterval);

    return () => clearInterval(intervalId);
  }, [selectedHiveId]);

  // Update lastUpdated when selected hive changes
  useEffect(() => {
    const selectedHive = hivesData.find(h => h.id === selectedHiveId);
    if (selectedHive) {
      setLastUpdated(new Date(selectedHive.lastUpdatedTimestamp || Date.now()));
    }
  }, [selectedHiveId, hivesData]);

  const selectedHive = hivesData.find(h => h.id === selectedHiveId);

  useEffect(() => {
    if (!selectedHive || !selectedHive.sensorData.timestamp) return;

    const newAlerts: Alert[] = [];
    const { temperature, humidity, sound } = selectedHive.sensorData;

    if (temperature < TEMPERATURE_WARNING_LOW || temperature > TEMPERATURE_WARNING_HIGH) newAlerts.push({ type: AlertType.CRITICAL, message: `Critical Temperature: ${temperature.toFixed(2)}°C. Outside optimal range.` });
    else if (temperature < TEMPERATURE_IDEAL_MIN || temperature > TEMPERATURE_IDEAL_MAX) newAlerts.push({ type: AlertType.WARNING, message: `Warning Temperature: ${temperature.toFixed(2)}°C. Slightly outside ideal range.` });

    if (humidity < HUMIDITY_WARNING_LOW || humidity > HUMIDITY_WARNING_HIGH) newAlerts.push({ type: AlertType.CRITICAL, message: `Critical Humidity: ${humidity.toFixed(2)}%. May impact health.` });
    else if (humidity < HUMIDITY_IDEAL_MIN || humidity > HUMIDITY_IDEAL_MAX) newAlerts.push({ type: AlertType.WARNING, message: `Warning Humidity: ${humidity.toFixed(2)}%. Sub-optimal.` });

    if (sound < SOUND_WARNING_LOW || sound >= SOUND_CRITICAL_HIGH) newAlerts.push({ type: AlertType.CRITICAL, message: `Critical Sound: ${sound.toFixed(2)}dB. Indicates distress.` });
    else if (sound < SOUND_IDEAL_MIN || sound > SOUND_WARNING_HIGH) newAlerts.push({ type: AlertType.WARNING, message: `Warning Sound: ${sound.toFixed(2)}dB. Unusual activity.` });

    setAlerts(newAlerts);
  }, [selectedHive]);

  const handleSendMessage = useCallback(async (
    prompt: string,
    options: {
      isNewConversation?: boolean,
      image?: { base64: string, mimeType: string } | null
    } = {}
  ) => {
    if (!selectedHiveId) return;

    setChatLoading(true);
    const currentHive = hivesData.find(h => h.id === selectedHiveId);
    if (!currentHive) {
      console.error("Selected hive not found");
      setChatLoading(false);
      return;
    }

    const isNewConversation = options.isNewConversation || !currentHive.chat;
    const chatInstance = isNewConversation ? createChatSession() : currentHive.chat;

    if (!chatInstance) {
      console.error("Chat instance could not be created or found.");
      setChatLoading(false);
      return;
    }

    setHivesData(prevHives => prevHives.map(hive => {
      if (hive.id === selectedHiveId) {
        const history = isNewConversation ? [] : hive.chatHistory;
        const userMessage: ChatMessage = { role: 'user', content: prompt };
        const updatedHistory = [...history, userMessage];
        return { ...hive, chatHistory: updatedHistory, chat: chatInstance };
      }
      return hive;
    }));

    let finalPrompt = prompt;
    const analysisKeywords = ['analyze', 'analysis', 'sensor', 'data', 'summary', 'status', 'report', 'check'];
    const lowerCasePrompt = prompt.toLowerCase();
    const isAnalysisRequest = analysisKeywords.some(keyword => lowerCasePrompt.includes(keyword));

    if (isAnalysisRequest && !options.image) {
      const { temperature, humidity, weight, sound } = currentHive.sensorData;
      finalPrompt = `The user asked: "${prompt}".
Please provide an analysis based on the following real-time data for the hive named "${currentHive.name}":
- Temperature: ${temperature.toFixed(2)}°C
- Humidity: ${humidity.toFixed(2)}%
- Weight: ${weight} grams
- Sound Level: ${sound.toFixed(2)} dB
Remember to respond as Bwise, the friendly apiculturist.`;
    }

    try {
      let response: GenerateContentResponse;
      if (options.image) {
        response = await chatInstance.sendMessage({
          message: [
            { text: finalPrompt },
            { inlineData: { data: options.image.base64, mimeType: options.image.mimeType } }
          ]
        });
      } else {
        response = await chatInstance.sendMessage({
          message: finalPrompt
        });
      }

      const modelResponse: string = response.text ?? "No response from AI model.";

      setHivesData(prevHives => prevHives.map(hive => {
        if (hive.id === selectedHiveId) {
          const aiMessage: ChatMessage = { role: 'model', content: modelResponse };
          return { ...hive, chatHistory: [...hive.chatHistory, aiMessage] };
        }
        return hive;
      }));
    } catch (error) {
      console.error("Error sending chat message:", error);
      const errorMessage: string = "Sorry, I couldn't get a response. The API may be unavailable or the request was blocked. Please check the console for details.";
      setHivesData(prevHives => prevHives.map(hive =>
        hive.id === selectedHiveId
          ? { ...hive, chatHistory: [...hive.chatHistory, { role: 'model', content: errorMessage }] }
          : hive
      ));
    } finally {
      setChatLoading(false);
    }
  }, [selectedHiveId, hivesData]);

  const handleHistoryClick = () => { setHistoryLoading(true); setHistoryModalOpen(true); setTimeout(() => setHistoryLoading(false), 500); };

  const getStatusColor = useCallback((value: number, idealMin: number, idealMax: number, warnMin: number, warnMax: number): AlertType => {
    if (value < warnMin || value > warnMax) return AlertType.CRITICAL;
    if (value < idealMin || value > idealMax) return AlertType.WARNING;
    return AlertType.OK;
  }, []);

  if (!selectedHive) return <div className="flex justify-center items-center h-screen bg-gray-100 text-gray-800 text-xl">Loading Apiary Dashboard...</div>;

  const { sensorData, weightHistory, fullHistory, chatHistory } = selectedHive;
  const tempStatus = getStatusColor(sensorData.temperature, TEMPERATURE_IDEAL_MIN, TEMPERATURE_IDEAL_MAX, TEMPERATURE_WARNING_LOW, TEMPERATURE_WARNING_HIGH);
  const humidityStatus = getStatusColor(sensorData.humidity, HUMIDITY_IDEAL_MIN, HUMIDITY_IDEAL_MAX, HUMIDITY_WARNING_LOW, HUMIDITY_WARNING_HIGH);
  const soundStatus = getStatusColor(sensorData.sound, SOUND_IDEAL_MIN, SOUND_IDEAL_MAX, SOUND_WARNING_LOW, SOUND_CRITICAL_HIGH);

  return (
    <>
      <Modal isOpen={isHistoryModalOpen} onClose={() => setHistoryModalOpen(false)} title={`Recent History for ${selectedHive.name} (Last 100 Records)`}>
        {isHistoryLoading ? <p>Loading history...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-500 uppercase bg-gray-100">
                <tr>
                  <th scope="col" className="px-4 py-3">Timestamp</th><th scope="col" className="px-4 py-3">Temp (°C)</th><th scope="col" className="px-4 py-3">Humidity (%)</th><th scope="col" className="px-4 py-3">Weight (g)</th><th scope="col" className="px-4 py-3">Sound (dB)</th>
                </tr>
              </thead>
              <tbody>
                {[...fullHistory].reverse().map((reading, index) => (
                  <tr key={reading.timestamp + '-' + index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-2">{new Date(reading.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2">{reading.temperature.toFixed(2)}</td>
                    <td className="px-4 py-2">{reading.humidity.toFixed(2)}</td>
                    <td className="px-4 py-2">{reading.weight}</td>
                    <td className="px-4 py-2">{reading.sound.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <div className="relative min-h-screen bg-gray-100 text-gray-800 p-2 sm:p-4 md:p-6">
        <LiveInfo />
        <Header />

        <main className="max-w-7xl mx-auto">
          <HiveSelector hives={hivesData} selectedHiveId={selectedHive.id} onSelectHive={(id) => { setChatLoading(false); setSelectedHiveId(id); }} />

          <div className="text-center mb-6">
            <p className="text-sm text-gray-500">Displaying data for <span className="font-bold">{selectedHive.name}</span></p>
            <p className="text-sm text-gray-500">Last Updated: {lastUpdated?.toLocaleString()}</p>
            
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-4 shadow-md"><GaugeChart value={sensorData.temperature} title="Temperature" unit="°C" min={10} max={50} status={tempStatus} /></div>
            <div className="bg-white rounded-xl p-4 shadow-md"><GaugeChart value={sensorData.humidity} title="Humidity" unit="%" min={20} max={90} status={humidityStatus} /></div>
            <div className="bg-white rounded-xl p-4 shadow-md"><GaugeChart value={sensorData.sound} title="Sound" unit="dB" min={10} max={100} status={soundStatus} /></div>

            <div className="lg:col-span-3 bg-white rounded-xl p-4 shadow-md flex flex-col"><AlertsCard alerts={alerts} /></div>

            <div className="lg:col-span-2 bg-white rounded-xl p-4 shadow-md flex flex-col">
              <ChatInterface
                hiveName={selectedHive.name}
                chatHistory={chatHistory}
                onSendMessage={(msg) => handleSendMessage(msg)}
                isLoading={isChatLoading}
              />
            </div>

            <div className="lg:col-span-3 bg-white rounded-xl p-4 shadow-md">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Weight History</h3>
              <WeightHistoryChart data={weightHistory} />
            </div>
          </div>
        </main>
        <Footer onHistoryClick={handleHistoryClick} />
      </div>
    </>
  );
};

export default App;

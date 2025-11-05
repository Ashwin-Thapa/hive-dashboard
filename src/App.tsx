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

import Header from './components/Header';
import Footer from './components/Footer';
import GaugeChart from './components/GaugeChart';
import AlertsCard from './components/AlertsCard';
import WeightHistoryChart from './components/WeightHistoryChart';
import Modal from './components/Modal';
import HiveSelector from './components/HiveSelector';
import LiveInfo from './components/LiveInfo';
import ChatInterface from './components/ChatInterface';


type SimFields = {
  simEnabled: boolean;
  simClock?: number; 
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
  nextSimUpdateTime?: number; 
  image?: string;
  imageTimestamp?: number;
  lastUpdatedTimestamp?: number; 
};
type HiveSim = Hive & SimFields;

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

  let temp = cfg.baseTemp + randBetween(-0.8, 0.8);
  let hum = cfg.baseHum + randBetween(-3, 3);
  let snd = cfg.baseSound + randBetween(-2, 2);
  let wgt = cfg.baseWeight + randBetween(-100, 100);

  for (let i = 0; i < points; i++) {
    tClock += stepMs;

    temp = stepAround(temp, cfg.stepTemp, 30, 40); 
    hum  = stepAround(hum,  cfg.stepHum,  45, 80); 
    snd  = stepAround(snd,  cfg.stepSound,30, 80); 
    wgt  = stepAround(wgt,  cfg.stepWeight, 22000, 35000); 

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

const getNextRandomUpdateTime = (currentTimestamp: number): number => {
   
    const randomDelay = randBetween(1000, 600000);
    return currentTimestamp + randomDelay;
};

const getISTHour = (): number => {
 
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { 
      hour: 'numeric', 
      hour12: false, 
      timeZone: "Asia/Kolkata" 
  };
  const istHourString = now.toLocaleString("en-US", options);
  
  return parseInt(istHourString, 10);
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


  useEffect(() => {
    const initialHives: HiveSim[] = [];
    const NOW = Date.now(); 

    for (let j = 1; j <= 10; j++) {

      const simConfig = {
        baseTemp: randBetween(33, 36), 
        baseHum: randBetween(55, 65),
        baseSound: randBetween(40, 60),
        baseWeight: randBetween(24000, 27000),
        stepTemp: randBetween(0.1, 0.5), 
        stepHum: randBetween(0.5, 1.5),
        stepSound: randBetween(0.8, 2.5),
        stepWeight: randBetween(5, 30),
      };

      const stepMs = 15 * 60 * 1000;
      const { history, last, lastClock } = buildSimHistory(
        20,
        stepMs,
        NOW - randBetween(1 * 60 * 60 * 1000, 24 * 60 * 60 * 1000), 
        simConfig
      );

      const now = Date.now();
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
      
      const nextSimUpdateTime = getNextRandomUpdateTime(shiftedLastClock);

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
        nextSimUpdateTime, 
      });
    }

    setHivesData(initialHives);
    

    const initialSelectedHive = initialHives.find(h => h.id === selectedHiveId);
    if (initialSelectedHive) {

      setLastUpdated(new Date(initialSelectedHive.lastUpdatedTimestamp ?? Date.now()));
    }

    return () => {
      objectURLsRef.current.forEach(url => URL.revokeObjectURL(url));
      objectURLsRef.current = [];
    };
  }, []);


  useEffect(() => {
    return () => {};
  }, [selectedHiveId]);


  useEffect(() => {
    const checkInterval = 60000; 
    const simulationStep = 600000; 

    const intervalId = setInterval(() => {
      const currentRealTime = Date.now();
      

      const currentHour = getISTHour(); 

 
      if (currentHour < 5 || currentHour >= 18) {
        return; 
      }
      
      setHivesData(prevHives => {
        const nextHives = prevHives.map(hive => {

          if (!hive.simEnabled || (hive.nextSimUpdateTime && currentRealTime < hive.nextSimUpdateTime)) {
              return hive;
          }

          const cfg = hive.simConfig ?? {
            baseTemp: 34, baseHum: 60, baseSound: 55, baseWeight: 24000,
            stepTemp: 0.5, stepHum: 1.5, stepSound: 2.0, stepWeight: 25,
          };

          const last = hive.sensorData || {
            temperature: cfg.baseTemp, humidity: cfg.baseHum, sound: cfg.baseSound, 
            weight: cfg.baseWeight, timestamp: currentRealTime - simulationStep,
          };

          const nextClock = currentRealTime; 

          const temperature = stepAround(last.temperature, cfg.stepTemp, 30, 40);
          const humidity  = stepAround(last.humidity, cfg.stepHum, 45, 80);
          const sound = stepAround(last.sound, cfg.stepSound,30, 80);

          let finalWeight = last.weight;
          let dailyWeightChange = 0;
          const gramChangeRate = 50; 

          if (currentHour >= 7 && currentHour < 11) {
            
            dailyWeightChange = -randBetween(0.5, 1.5) * (gramChangeRate / 10); 
          } else if (currentHour >= 11 && currentHour < 19) {
            
            dailyWeightChange = randBetween(0.5, 3.0) * (gramChangeRate / 10); 
          } else { 
             
             dailyWeightChange = -randBetween(0.1, 0.5) * (gramChangeRate / 20); 
          }

          
          const noise = randBetween(-cfg.stepWeight, cfg.stepWeight) * 0.5;

          
          finalWeight = Math.round(finalWeight + dailyWeightChange + noise);

          
          finalWeight = Math.max(22000, Math.min(35000, finalWeight));

          const newSensorData: SensorData = {
            temperature,
            humidity,
            sound,
            weight: finalWeight,
            timestamp: nextClock,
          };
          
          const updatedHistory = [...hive.fullHistory.slice(-99), newSensorData];

          
          const nextUpdate = getNextRandomUpdateTime(currentRealTime);

          return {
            ...hive,
            sensorData: newSensorData,
            fullHistory: updatedHistory,
            weightHistory: updatedHistory.map(d => ({ timestamp: d.timestamp, weight: d.weight })),
            simClock: nextClock,
            lastUpdatedTimestamp: nextClock,
            nextSimUpdateTime: nextUpdate, 
          };
        });

        
        const selectedHive = nextHives.find(h => h.id === selectedHiveId);
        if (selectedHive && selectedHive.lastUpdatedTimestamp && selectedHive.lastUpdatedTimestamp >= (currentRealTime - checkInterval)) {
          setLastUpdated(new Date(selectedHive.lastUpdatedTimestamp ?? Date.now()));
        }

        return nextHives;
      });
    }, checkInterval); 

    return () => clearInterval(intervalId);
  }, [selectedHiveId]);
  
  
  useEffect(() => {
    const selectedHive = hivesData.find(h => h.id === selectedHiveId);
    if (selectedHive) {
      
      setLastUpdated(new Date(selectedHive.lastUpdatedTimestamp ?? Date.now()));
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
          message: finalPrompt 
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
            {/* Display lastUpdated safely */}
            <p className="text-sm text-gray-500">Last Updated: {lastUpdated?.toLocaleString() ?? 'Loading...'}</p>
            
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
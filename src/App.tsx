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

const App: React.FC = () => {
  const [hivesData, setHivesData] = useState<Hive[]>([]);
  const [selectedHiveId, setSelectedHiveId] = useState<string | null>('bwise-1');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [isHistoryLoading, setHistoryLoading] = useState(false);
  const [isChatLoading, setChatLoading] = useState(false);
  const objectURLsRef = useRef<string[]>([]);

  useEffect(() => {
    const initialHives: Hive[] = [];
    const now = Date.now();

    for (let j = 1; j <= 10; j++) {
      const isHive1 = j === 1;
      let fullHistory: HistoryEntry[] = [];
      let currentWeight: number;

      if (isHive1) {
        for (let i = 20; i > 0; i--) {
          const simulatedRawWeight = generateRandomWeight(-200, 200);
          fullHistory.push({
            timestamp: now - i * 60000 * 15,
            temperature: 34 + (Math.random() - 0.5) * 4,
            humidity: 55 + Math.random() * 25,
            weight: scaleWeight(simulatedRawWeight),
            sound: 50 + Math.random() * 20,
          });
        }
        currentWeight = fullHistory[fullHistory.length - 1].weight;
      } else {
        currentWeight = generateRandomWeight(23000, 25000);
        for (let i = 20; i > 0; i--) {
          currentWeight = generateRandomWeight(23000, 25000);
          fullHistory.push({
            timestamp: now - i * 60000 * 15,
            temperature: 34 + (Math.random() - 0.5) * 4,
            humidity: 55 + Math.random() * 25,
            weight: currentWeight,
            sound: 50 + Math.random() * 20,
          });
        }
      }

      initialHives.push({
        id: `bwise-${j}`,
        name: `Bwise Hive #${j}`,
        sensorData: fullHistory[fullHistory.length - 1],
        fullHistory: fullHistory,
        weightHistory: fullHistory.map(d => ({ timestamp: d.timestamp, weight: d.weight })),
        chat: createChatSession(),
        chatHistory: [],
      });
    }
    setHivesData(initialHives);

    return () => {
      objectURLsRef.current.forEach(url => URL.revokeObjectURL(url));
      objectURLsRef.current = [];
    };
  }, []);

  // Current Firebase and History Fetch (Now only Hives 1 and 2)
useEffect(() => {
    const hive1Id = 'bwise-1';
    const hive2Id = 'bwise-2';
    // Hive 3 is now simulated

    const currentDbRef = ref(db, 'beehive');
    const unsubscribeCurrent = onValue(currentDbRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            setHivesData(prev => prev.map(hive => {
                if (hive.id === hive1Id) {
                    const rawWeight = data.weight || 0;
                    const newSensorData: SensorData = {
                        temperature: data.temperature || 0,
                        humidity: data.humidity || 0,
                        weight: scaleWeight(rawWeight),
                        sound: data.sound_dB || 0,
                        timestamp: data.timestamp * 1000,
                    };
                    const updatedHistory = [...hive.fullHistory.slice(-99), newSensorData];
                    return { ...hive, sensorData: newSensorData, fullHistory: updatedHistory, weightHistory: updatedHistory.map(d => ({ timestamp: d.timestamp, weight: d.weight })) };
                }
                return hive;
            }));
            if (selectedHiveId === hive1Id) {
            setLastUpdated(new Date(data.timestamp * 1000));
        }
      }
    });

    const currentDbRef2 = ref(db, 'beehive2');
    const unsubscribeCurrent2 = onValue(currentDbRef2, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            setHivesData(prev => prev.map(hive => {
                if (hive.id === hive2Id) {
                    const newSensorData: SensorData = {
                        temperature: data.temperature || 0,
                        humidity: data.humidity || 0,
                        weight: data.weight || 0,
                        sound: data.sound_dB || 0,
                        timestamp: data.timestamp * 1000,
                    };
                    const updatedHistory = [...hive.fullHistory.slice(-99), newSensorData];
                    return {
                        ...hive,
                        sensorData: newSensorData,
                        fullHistory: updatedHistory,
                        weightHistory: updatedHistory.map(d => ({ timestamp: d.timestamp, weight: d.weight })),
                        lastUpdatedTimestamp: data.timestamp * 1000
                    };
                }
                return hive;
            }));
            if (selectedHiveId === hive2Id) {
                setLastUpdated(new Date(data.timestamp * 1000));
            }
        }
    });
    
    // *** The currentDbRef3 block has been REMOVED here ***

    const imageDbRef = ref(db, 'bwise_images/latest');
    const unsubscribeImage = onValue(imageDbRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const imageTimestamp = data.timestamp ? new Date(data.timestamp).getTime() : Date.now();
            setHivesData(prev => prev.map(hive => hive.id === hive1Id ? { ...hive, image: data.url, imageTimestamp } : hive));
        }
    });

    // --- beehive_history (Hive 1) ---
const historyQuery = query(ref(db, 'beehive_history'), orderByKey(), limitToLast(100));
get(historyQuery).then((snapshot) => {
  if (snapshot.exists()) {
    const obj = snapshot.val() as Record<string, any>;
    const history: HistoryEntry[] = Object
      .entries(obj)
      .sort(([a], [b]) => a.localeCompare(b)) // ensure ascending order
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

// --- beehive_history2 (Hive 2) ---
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
        weight: reading.weight || 0, // note: no scaleWeight for hive2
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


    // *** The historyQuery3 block has been REMOVED here ***

    return () => { 
        unsubscribeCurrent(); 
        unsubscribeImage(); 
        unsubscribeCurrent2(); 
        // unsubscribeCurrent3 is REMOVED
    };
}, [selectedHiveId]);

  useEffect(() => {
  // 10 minutes = 600000 milliseconds
  const simulationInterval = 600000;

  const intervalId = setInterval(() => {
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= 6 && currentHour < 17) {
      const newTimestamp = Date.now();
      let shouldUpdateLastUpdated = false;

      setHivesData(prevHives => {
        const nextHives = prevHives.map(hive => {
          // Skip Firebase-controlled hives (1 & 2)
          if (hive.id === 'bwise-1' || hive.id === 'bwise-2') return hive;

          // Simulate only for 3–10
          // Basic gentle drift + noise
          const last = hive.sensorData;
          const temp = (last.temperature ?? 34) + (Math.random() - 0.5) * 0.6;
          const hum = (last.humidity ?? 60) + (Math.random() - 0.5) * 1.5;
          const sound = (last.sound ?? 55) + (Math.random() - 0.5) * 2.5;

          // Weight: small day-time change (foraging flow)
          const weight = (last.weight ?? 24000) + (Math.random() - 0.5) * 30;

          const newSensorData: SensorData = {
            temperature: Math.max(20, Math.min(45, temp)),
            humidity: Math.max(20, Math.min(90, hum)),
            sound: Math.max(10, Math.min(100, sound)),
            weight,
            timestamp: newTimestamp,
          };

          const updatedHistory = [...hive.fullHistory.slice(-99), newSensorData];

          if (hive.id === selectedHiveId) {
            shouldUpdateLastUpdated = true;
          }

          return {
            ...hive,
            sensorData: newSensorData,
            fullHistory: updatedHistory,
            weightHistory: updatedHistory.map(d => ({ timestamp: d.timestamp, weight: d.weight })),
          };
        });

        return nextHives;
      });

      if (shouldUpdateLastUpdated) {
        setLastUpdated(new Date(newTimestamp));
      }
    }
  }, simulationInterval);

  return () => clearInterval(intervalId);
}, [selectedHiveId]);


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

  useEffect(() => {
    return () => {
      objectURLsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

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

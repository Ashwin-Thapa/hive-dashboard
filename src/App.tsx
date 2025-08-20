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

const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = error => reject(error);
  });
};

const urlToBase64 = async (url: string): Promise<{ base64: string, mimeType: string }> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image. Status: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: blob.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper function to generate a random decimal weight within a range
const generateRandomWeight = (min: number, max: number): number => {
  return min + (Math.random() * (max - min));
};

// **UPDATED scaleWeight function to directly apply rawWeight to a random base**
const scaleWeight = (rawWeight: number): number => {
  // Generate a random number always between 23000 and 25000 (as per your request)
  const randomNumberBase = generateRandomWeight(23000, 25000);

  let finalGramWeight: number;

  if (rawWeight >= 0) {
    // If rawWeight is positive or zero, subtract it from the random number
    finalGramWeight = randomNumberBase - rawWeight;
  } else {
    // If rawWeight is negative, add it to the random number
    // (Adding a negative number is equivalent to subtracting its absolute value)
    finalGramWeight = randomNumberBase + rawWeight;
  }

  // IMPORTANT NOTE:
  // As per your instruction "Do not use any max or min number",
  // this function does NOT clamp the 'rawWeight' input nor the 'finalGramWeight' output.
  //
  // This means:
  // 1. If 'rawWeight' from Firebase is very large (e.g., +1000) or very small (e.g., -1000),
  //    the 'finalGramWeight' could fall significantly outside the 23000-25000 range.
  //    For instance, if randomNumberBase is 23000 and rawWeight is 500, finalGramWeight = 22500.
  //    If randomNumberBase is 23000 and rawWeight is -500, finalGramWeight = 22500.
  // 2. The charts and displays will show these potentially out-of-range values.
  //
  // If you later decide you *do* need to keep the final displayed weight strictly within
  // the 23000-25000 range, you would re-add this line at the end of the function:
  // return Math.min(Math.max(finalGramWeight, 23000), 25000);

  return finalGramWeight;
};


const App: React.FC = () => {
  const [hivesData, setHivesData] = useState<Hive[]>([]);
  const [selectedHiveId, setSelectedHiveId] = useState<string | null>('bwise-1');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const [isHistoryLoading, setHistoryLoading] = useState(false);
  const [isChatLoading, setChatLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectURLsRef = useRef<string[]>([]); // To keep track of created object URLs for cleanup

  useEffect(() => {
    const initialHives: Hive[] = [];
    const now = Date.now();
    const imageUrls = [
      'https://res.cloudinary.com/ddmsvxkdm/image/upload/v1753255472/wd3dapnnr3tco86udik5.jpg',
      'https://images.unsplash.com/photo-1616012797256-07e43684279a?q=80&w=800&h=600&fit=crop&crop=entropy',
      'https://images.unsplash.com/photo-1587770853995-d72b434a4577?q=80&w=800&h=600&fit=crop&crop=entropy',
      'https://images.unsplash.com/photo-1542155651-209045711624?q=80&w=800&h=600&fit=crop&crop=entropy',
      'https://images.unsplash.com/photo-1588675646184-f5b2a4579212?q=80&w=800&h=600&fit=crop&crop=entropy',
      'https://images.unsplash.com/photo-1590112192144-ed8407a56110?q=80&w=800&h=600&fit=crop&crop=entropy',
      'https://images.unsplash.com/photo-1601612745779-9b2f693b8608?q=80&w=800&h=600&fit=crop&crop=entropy',
      'https://images.unsplash.com/photo-1580373315357-ac88351b01a2?q=80&w=800&h=600&fit=crop&crop=entropy',
      'https://images.unsplash.com/photo-1516044733470-428654c619b9?q=80&w=800&h=600&fit=crop&crop=entropy',
      'https://images.unsplash.com/photo-1627961224352-857c0973e734?q=80&w=800&h=600&fit=crop&crop=entropy'
    ];

    for (let j = 1; j <= 10; j++) {
      const isHive1 = j === 1;
      let fullHistory: HistoryEntry[] = [];
      let currentWeight: number;

      if (isHive1) {
        // For bwise-1, simulate history with scaled random data.
        // For initial history, we'll simulate raw values, then scale them.
        for (let i = 20; i > 0; i--) {
          const simulatedRawWeight = generateRandomWeight(-200, 200); // Simulate some raw input
          fullHistory.push({
            timestamp: now - i * 60000 * 15,
            temperature: 34 + (Math.random() - 0.5) * 4,
            humidity: 55 + Math.random() * 25,
            weight: scaleWeight(simulatedRawWeight), // Use scaleWeight for bwise-1 initial history
            sound: 50 + Math.random() * 20,
          });
        }
        currentWeight = fullHistory[fullHistory.length - 1].weight; // Last history point
      } else {
        // For other hives, generate truly random decimals between 23000 and 25000 (as before)
        currentWeight = generateRandomWeight(23000, 25000);
        for (let i = 20; i > 0; i--) {
          currentWeight = generateRandomWeight(23000, 25000); // Simulate random historical weights
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
        sensorData: fullHistory[fullHistory.length - 1], // Last entry is current data
        fullHistory: fullHistory,
        weightHistory: fullHistory.map(d => ({ timestamp: d.timestamp, weight: d.weight })),
        image: imageUrls[j - 1],
        imageTimestamp: now - Math.floor(Math.random() * 24 * 60 * 60 * 1000 * 3),
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

  useEffect(() => {
    const hive1Id = 'bwise-1';
    const currentDbRef = ref(db, 'beehive');

    const unsubscribeCurrent = onValue(currentDbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setHivesData(prev => prev.map(hive => {
          if (hive.id === hive1Id) {
            const rawWeight = data.weight || 0; // Get raw weight from Firebase
            const newSensorData: SensorData = {
              temperature: data.temperature || 0,
              humidity: data.humidity || 0,
              weight: scaleWeight(rawWeight), // Use the new scaleWeight function
              sound: data.sound_dB || 0,
              timestamp: data.timestamp * 1000,
            };
            const updatedHistory = [...hive.fullHistory.slice(-99), newSensorData];
            return { ...hive, sensorData: newSensorData, fullHistory: updatedHistory, weightHistory: updatedHistory.map(d => ({ timestamp: d.timestamp, weight: d.weight })) };
          }
          return hive;
        }));
        setLastUpdated(new Date(data.timestamp * 1000));
      }
    });

    const imageDbRef = ref(db, 'bwise_images/latest');
    const unsubscribeImage = onValue(imageDbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const imageTimestamp = data.timestamp ? new Date(data.timestamp).getTime() : Date.now();
        setHivesData(prev => prev.map(hive => hive.id === hive1Id ? { ...hive, image: data.url, imageTimestamp } : hive));
      }
    });

    const historyQuery = query(ref(db, 'beehive_history'), orderByKey(), limitToLast(100));
    get(historyQuery).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const history: HistoryEntry[] = Object.values(data).map((reading: any) => ({
          temperature: reading.temperature || 0,
          humidity: reading.humidity || 0,
          weight: scaleWeight(reading.weight || 0), // Use the new scaleWeight for historical data too
          sound: reading.sound_dB || 0,
          timestamp: reading.timestamp * 1000,
        }));
        setHivesData(prev => prev.map(hive => hive.id === hive1Id ? { ...hive, fullHistory: history, weightHistory: history.map(d => ({ timestamp: d.timestamp, weight: d.weight })) } : hive));
      }
    }).catch(error => {
      console.error("Error fetching beehive history:", error);
    });

    return () => { unsubscribeCurrent(); unsubscribeImage(); };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setHivesData(prevHives => {
        const newTimestamp = Date.now();
        return prevHives.map(hive => {
          if (hive.id === 'bwise-1') return hive; // Hive 1 is handled by Firebase and scaled weight
          const newSensorData: SensorData = {
            temperature: hive.sensorData.temperature + (Math.random() - 0.5) * 0.2,
            humidity: hive.sensorData.humidity + (Math.random() - 0.5) * 2,
            weight: generateRandomWeight(23000, 25000), // Simulate random decimals for other hives
            sound: hive.sensorData.sound + (Math.random() - 0.5) * 1,
            timestamp: newTimestamp,
          };
          const newFullHistory = [...hive.fullHistory.slice(-99), newSensorData]; // Keep history trimmed
          return {
            ...hive,
            sensorData: newSensorData,
            fullHistory: newFullHistory,
            weightHistory: newFullHistory.map((d) => ({ timestamp: d.timestamp, weight: d.weight }))
          };
        });
      });
    }, 10000);
    return () => clearInterval(intervalId);
  }, []);

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

  const handleStartImageAnalysis = useCallback(async (imageSource: string) => {
    setChatLoading(true);
    try {
      const { base64, mimeType } = await urlToBase64(imageSource);
      const prompt = "Analyze this hive image for me.";
      await handleSendMessage(prompt, { isNewConversation: true, image: { base64, mimeType } });
    } catch (error) {
      console.error("Error analyzing image from source:", error);
      const errorMessage: string = "Sorry, I couldn't analyze that image. It might be due to a network issue or browser security policy (CORS). Try uploading an image instead.";
      setHivesData(prevHives => prevHives.map(hive =>
        hive.id === selectedHiveId
          ? { ...hive, chatHistory: [{ role: 'model', content: errorMessage }] }
          : hive
      ));
      setChatLoading(false);
    }
  }, [handleSendMessage, selectedHiveId]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedHiveId) return;
    const file = event.target.files?.[0];

    if (file) {
      setChatLoading(true);
      const objectURL = URL.createObjectURL(file);
      objectURLsRef.current.push(objectURL);

      setHivesData(hives => hives.map(h => h.id === selectedHiveId ? { ...h, image: objectURL, imageTimestamp: Date.now() } : h));

      try {
        const { base64, mimeType } = await fileToBase64(file);
        const prompt = "Analyze this image I've uploaded.";
        await handleSendMessage(prompt, { isNewConversation: true, image: { base64, mimeType } });
      } catch (error) {
        console.error("Error analyzing uploaded file:", error);
        const errorMessage: string = "Sorry, something went wrong while analyzing the uploaded file.";
        setHivesData(prevHives => prevHives.map(hive =>
          hive.id === selectedHiveId
            ? { ...hive, chatHistory: [{ role: 'model', content: errorMessage }] }
            : hive
        ));
        setChatLoading(false);
      } finally {
        // No specific action needed here as chatLoading is handled in try/catch
      }
    }
  };

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

  const { sensorData, weightHistory, fullHistory, image, imageTimestamp, chatHistory } = selectedHive;
  const tempStatus = getStatusColor(sensorData.temperature, TEMPERATURE_IDEAL_MIN, TEMPERATURE_IDEAL_MAX, TEMPERATURE_WARNING_LOW, TEMPERATURE_WARNING_HIGH);
  const humidityStatus = getStatusColor(sensorData.humidity, HUMIDITY_IDEAL_MIN, HUMIDITY_IDEAL_MAX, HUMIDITY_WARNING_LOW, HUMIDITY_WARNING_HIGH);
  const soundStatus = getStatusColor(sensorData.sound, SOUND_IDEAL_MIN, SOUND_IDEAL_MAX, SOUND_WARNING_LOW, SOUND_CRITICAL_HIGH);

  return (
    <>
      <Modal isOpen={isImageModalOpen} onClose={() => setImageModalOpen(false)} title="Latest Hive Image">
        <img src={image} alt="Full view of the hive" className="w-full h-auto rounded-lg" />
      </Modal>

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
                {/* Ensure key is unique and stable */}
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

            {/* <div className="lg:col-span-1 bg-white rounded-xl p-4 shadow-md flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Hive Image</h3>
              <img src={image} alt="Hive Snapshot" className="rounded-md aspect-[4/3] object-cover cursor-pointer hover:ring-2 hover:ring-bwise-yellow transition-all" onClick={() => setImageModalOpen(true)} />
              {imageTimestamp && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  Captured: {new Date(imageTimestamp).toLocaleDateString()} {new Date(imageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <button onClick={() => handleStartImageAnalysis(image)} disabled={isChatLoading} className="w-full text-sm flex-1 bg-gray-200 text-gray-800 font-semibold py-2 px-3 rounded-md hover:bg-gray-300 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors">Analyze This Image</button>
                <button onClick={() => fileInputRef.current?.click()} disabled={isChatLoading} className="w-full text-sm flex-1 bg-gray-200 text-gray-800 font-semibold py-2 px-3 rounded-md hover:bg-gray-300 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors">Upload & Analyze</button>
              </div>
            </div> */}

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
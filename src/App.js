import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, query, limitToLast, get, orderByKey } from 'firebase/database';
import Chart from 'react-apexcharts';
import './App.css';
import bwiseLogo from './assets/Bwise Le Organica Logo.png';

const GaugeChart = ({ value, title, unit, min, max, colors }) => {
  const options = {
    chart: { type: 'radialBar' },
    plotOptions: {
      radialBar: {
        hollow: { size: '70%' },
        dataLabels: {
          name: { offsetY: -10, fontSize: '22px' },
          value: { fontSize: '16px' },
          total: {
            show: true,
            label: title,
            formatter: () => `${value !== undefined ? value : 'N/A'} ${unit}`,
          },
        },
      },
    },
    fill: { colors },
    labels: [title],
    stroke: { lineCap: 'round' },
    grid: { padding: { top: -10 } },
    series: [value !== undefined ? ((value - min) / (max - min)) * 100 : 0],
  };
  return <Chart options={options} series={options.series} type="radialBar" height={300} />;
};

const ImageModal = ({ url, onClose }) => {
  if (!url) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        <img src={url} alt="Full View" className="modal-image" />
      </div>
    </div>
  );
};

const HistoryModal = ({ isOpen, onClose, data, isLoading }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        <h2>Recent Hive History (Last 20 Records)</h2>
        {isLoading ? (
          <p>Loading history...</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Temp (°C)</th>
                  <th>Humidity (%)</th>
                  <th>Weight (g)</th>
                  <th>Sound (dB)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((reading, index) => (
                  <tr key={index}>
                    <td>{new Date(reading.timestamp * 1000).toLocaleString()}</td>
                    <td>{reading.temperature}</td>
                    <td>{reading.humidity}</td>
                    <td>{reading.weight}</td>
                    <td>{reading.sound_dB}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const AlertsCard = ({ alerts }) => {
  if (alerts.length === 0) {
    return (
      <div className="grid-item grid-item-alerts">
        <div className="card alerts-card">
          <h3>Alerts</h3>
          <div className="alert alert-ok">
            <span role="img" aria-label="ok">✅</span>
            <p>Ideal Conditions. The hive is happy!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-item grid-item-alerts">
      <div className="card alerts-card">
        <h3>Alerts</h3>
        {alerts.map((alert, index) => (
          <div key={index} className={`alert alert-${alert.type}`}>
            <span role="img" aria-label={alert.type}>{alert.type === 'critical' ? '❌' : '⚠️'}</span>
            <p>{alert.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

function App() {
  const [sensorData, setSensorData] = useState({});
  const [weightHistory, setWeightHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [latestImage, setLatestImage] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullHistory, setFullHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const newAlerts = [];
    if (sensorData.temperature === undefined) return;

    const { temperature, humidity, sound } = sensorData;

    if (temperature < 30 || temperature > 37) {
      newAlerts.push({ type: 'critical', message: `Critical Temperature: ${temperature}°C` });
    } else if ((temperature >= 30 && temperature < 33) || (temperature > 36 && temperature <= 37)) {
      newAlerts.push({ type: 'warning', message: `Warning Temperature: ${temperature}°C` });
    }

    if (humidity < 40 || humidity > 75) {
      newAlerts.push({ type: 'critical', message: `Critical Humidity: ${humidity}%` });
    } else if (humidity > 70 && humidity <= 75) {
      newAlerts.push({ type: 'warning', message: `Warning Humidity: ${humidity}%` });
    }

    if (sound < 20 || sound > 40) {
      newAlerts.push({ type: 'critical', message: `Critical Sound Level: ${sound}dB` });
    } else if ((sound >= 20 && sound < 25) || (sound > 35 && sound <= 40)) {
      newAlerts.push({ type: 'warning', message: `Warning Sound Level: ${sound}dB` });
    }

    setAlerts(newAlerts);
  }, [sensorData]);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      const historyRef = ref(db, 'beehive_history');
      const historyQuery = query(historyRef, orderByKey(), limitToLast(20));
      const snapshot = await get(historyQuery);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const historicalReadings = Object.values(data).map(reading => ({
          x: new Date(reading.timestamp * 1000).getTime(),
          y: parseFloat(reading.weight)
        }));
        setWeightHistory(historicalReadings);
      }
      setIsLoading(false);
    };

    fetchHistoricalData();

    const currentRef = ref(db, 'beehive');
    const imageRef = ref(db, 'bwise_images/latest');

    const unsub1 = onValue(currentRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const processed = {
          ...data,
          temperature: parseFloat(data.temperature),
humidity: parseFloat(data.humidity),
weight: Math.max(parseFloat(data.weight), 0), // avoid negatives
sound: Math.min(Math.max(parseFloat(data.sound_dB), 10), 50), // clamp to 10–50

          timestamp: parseInt(data.timestamp, 10)
        };
        setSensorData(processed);
        setLastUpdated(new Date(processed.timestamp * 1000));

        const newPoint = {
          x: new Date(processed.timestamp * 1000).getTime(),
          y: processed.weight
        };

        setWeightHistory(prev => {
          if (prev.length > 0 && prev[prev.length - 1].x === newPoint.x) return prev;
          return [...prev.slice(-19), newPoint];
        });
      }
    });

    const unsub2 = onValue(imageRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.url) setLatestImage(data.url);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const handleHistoryButtonClick = async () => {
    setIsModalOpen(true);
    setIsHistoryLoading(true);
    const historyRef = ref(db, 'beehive_history');
    const historyQuery = query(historyRef, orderByKey(), limitToLast(20));
    const snapshot = await get(historyQuery);
    if (snapshot.exists()) {
      const data = Object.values(snapshot.val()).reverse();
      setFullHistory(data);
    }
    setIsHistoryLoading(false);
  };

  const triggerImageCapture = async () => {
    try {
      const res = await fetch('/capture');
      if (res.ok) {
        alert('📸 Image capture triggered!');
      } else {
        alert('❌ Failed to trigger capture.');
      }
    } catch (err) {
      console.error(err);
      alert('❌ Error connecting to capture endpoint.');
    }
  };

  const getTempColor = (t) => {
    if (t < 30 || t > 36.5) return '#e74c3c';
    if ((t >= 30 && t < 32) || (t > 35 && t <= 36.5)) return '#f39c12';
    return '#2ecc71';
  };
  const getHumidityColor = (h) => {
    if (h < 40 || h > 75) return '#e74c3c';
    if (h > 70 && h <= 75) return '#f39c12';
    return '#2ecc71';
  };
  const getSoundColor = (db) => {
    if (db > 40 || db < 20) return '#e74c3c';
    if ((db >= 35 && db <= 40) || (db >= 20 && db < 25)) return '#f39c12';
    return '#2ecc71';
  };

  const chartOptions = {
    chart: {
      id: 'weight-history',
      animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } },
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' },
    xaxis: { type: 'datetime' },
    yaxis: {
      title: { text: 'Weight (g)' },
      labels: { formatter: (val) => val.toFixed(2) }
    },
    colors: ['#FDB813']
  };

  if (isLoading) return <div className="loading-screen"><h1>Loading Dashboard...</h1></div>;

  return (
    <>
      <ImageModal url={imageModalOpen ? latestImage : null} onClose={() => setImageModalOpen(false)} />
      <HistoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={fullHistory} isLoading={isHistoryLoading} />
      <div className="dashboard-container">
        <header>
          <img src={bwiseLogo} alt="Bwise Logo" className="header-logo" />
          <div className="header-titles">
            <h1>Hive Monitoring Dashboard</h1>
            <p>A Bwise Le Organica Project</p>
          </div>
        </header>

        <main>
          <div className="main-actions">
            <button className="action-btn" onClick={triggerImageCapture}>📸 Capture New Image</button>
            {lastUpdated && <p className="last-updated">Last Updated: {lastUpdated.toLocaleString()}</p>}
          </div>

          <div className="grid-container">
            <div className="grid-item">
              <GaugeChart value={sensorData.temperature} title="Temperature" unit="°C" min={10} max={50} colors={[getTempColor(sensorData.temperature)]} />
            </div>
            <div className="grid-item">
              <GaugeChart value={sensorData.humidity} title="Humidity" unit="%" min={20} max={90} colors={[getHumidityColor(sensorData.humidity)]} />
            </div>
            <div className="grid-item">
              <GaugeChart value={sensorData.sound} title="Sound" unit="dB" min={10} max={50} colors={[getSoundColor(sensorData.sound)]} />
            </div>
            <AlertsCard alerts={alerts} />
            {latestImage && (
              <div className="grid-item grid-item-image">
                <div className="card">
                  <h3>Latest Hive Image</h3>
                  <img
                    src={latestImage}
                    alt="Hive Snapshot"
                    className="hive-image"
                    onClick={() => setImageModalOpen(true)}
                  />
                </div>
              </div>
            )}
            <div className="grid-item large">
              <div className="card">
                <h3>Weight History (Last 20 Readings)</h3>
                <Chart options={chartOptions} series={[{ name: 'Weight', data: weightHistory }]} type="line" height={300} />
              </div>
            </div>
          </div>
        </main>

        <footer className="footer">
          <button className="action-btn" onClick={handleHistoryButtonClick}>View Full Hive History</button>
          <p>© 2025 Bwise Le Organica - Friends of Bees</p>
        </footer>
      </div>
    </>
  );
}

export default App;

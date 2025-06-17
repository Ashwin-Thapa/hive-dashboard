import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, query, limitToLast, get, orderByKey } from 'firebase/database';
import Chart from 'react-apexcharts';
import './App.css';
import bwiseLogo from './assets/Bwise Le Organica Logo.png';

// --- MODIFIED: VideoStream now has the 4/3 aspect ratio and a className ---
const VideoStream = () => (
    <div className="video-stream-container">
      <h3>Live Hive Entrance</h3>
      <iframe 
        className="video-iframe" // Added a class for styling
        width="100%" 
        style={{ aspectRatio: "4 / 3" }} // Set to 4/3 ratio
        src="https://www.youtube.com/embed/iBgiSII2WBI?si=QZGO5cVriaodg8zx" // IMPORTANT: Use your correct embed URL
        title="YouTube video player" 
        frameBorder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowFullScreen>
      </iframe>
    </div>
);


// No changes to other components
const InfoCard = ({ title, value, unit }) => ( <div className="card"><h3>{title}</h3><p>{value} <span>{unit}</span></p></div> );
const GaugeChart = ({ value, title, unit, min, max, colors }) => { const options = { chart: { type: 'radialBar' }, plotOptions: { radialBar: { hollow: { size: '70%' }, dataLabels: { name: { offsetY: -10, fontSize: '22px' }, value: { fontSize: '16px' }, total: { show: true, label: title, formatter: () => `${value} ${unit}`, }, }, }, }, fill: { colors }, labels: [title], stroke: { lineCap: 'round' }, grid: { padding: { top: -10 } }, series: [((value - min) / (max - min)) * 100], }; return <Chart options={options} series={options.series} type="radialBar" height={350} />; };
const HistoryModal = ({ isOpen, onClose, data, isLoading }) => { if (!isOpen) return null; return ( <div className="modal-overlay" onClick={onClose}> <div className="modal-content" onClick={e => e.stopPropagation()}> <button className="modal-close-btn" onClick={onClose}>×</button> <h2>Recent Sensor History</h2> {isLoading ? ( <p>Loading history...</p> ) : ( <div className="table-container"> <table> <thead> <tr> <th>Timestamp</th> <th>Temp (°C)</th> <th>Humidity (%)</th> <th>Weight (g)</th> <th>Sound</th> </tr> </thead> <tbody> {data.map(reading => ( <tr key={reading.timestamp}> <td>{new Date(reading.timestamp).toLocaleString()}</td> <td>{reading.temperature}</td> <td>{reading.humidity}</td> <td>{reading.weight}</td> <td>{reading.sound_voltage}</td> </tr> ))} </tbody> </table> </div> )} </div> </div> ); };


function App() {
    const [sensorData, setSensorData] = useState({});
    const [weightHistory, setWeightHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fullHistory, setFullHistory] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const getSoundColor = (voltage) => {
        if (voltage >= 1.0) return '#e74c3c';
        if (voltage >= 0.5) return '#f39c12';
        return '#2ecc71';
    };

    const getTemperatureColor = (temp) => {
        if (temp > 38) return '#FF4560';
        if (temp < 32) return '#008FFB';
        return '#00E396';
    };

    const getHumidityColor = (humidity) => {
        if (humidity > 70) return '#FEB019';
        if (humidity > 65) return '#FFD700';
        if (humidity >= 50) return '#00E396';
        return '#008FFB';
    };

    useEffect(() => {
        const fetchHistoricalData = async () => { const historyRef = ref(db, 'sensor_readings'); const historyQuery = query(historyRef, orderByKey(), limitToLast(10)); const snapshot = await get(historyQuery); if (snapshot.exists()) { const data = snapshot.val(); const historicalReadings = Object.values(data).map(reading => ({ x: new Date(reading.timestamp).getTime(), y: parseFloat(reading.weight) })); setWeightHistory(historicalReadings); } setIsLoading(false); }; fetchHistoricalData(); const latestReadingRef = ref(db, 'latest_reading'); const unsubscribe = onValue(latestReadingRef, (snapshot) => { const data = snapshot.val(); if (data) { data.temperature = parseFloat(data.temperature); data.humidity = parseFloat(data.humidity); data.weight = parseFloat(data.weight); data.sound_voltage_num = parseFloat(data.sound_voltage); setSensorData(data); setWeightHistory(prevHistory => { const newPoint = { x: new Date(data.timestamp).getTime(), y: data.weight }; if (prevHistory.length > 0 && prevHistory[prevHistory.length - 1].x === newPoint.x) { return prevHistory; } const updatedHistory = [...prevHistory, newPoint]; return updatedHistory.slice(-20); }); } }); return () => unsubscribe();
    }, []);

    const handleHistoryButtonClick = async () => {
        setIsModalOpen(true); setIsHistoryLoading(true); const historyRef = ref(db, 'sensor_readings'); const historyQuery = query(historyRef, orderByKey(), limitToLast(10)); const snapshot = await get(historyQuery); if (snapshot.exists()) { const data = Object.values(snapshot.val()).reverse(); setFullHistory(data); } setIsHistoryLoading(false);
    };

    const weightChartOptions = { chart: { id: 'realtime-weight', animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } }, toolbar: { show: false }, zoom: { enabled: false }}, dataLabels: { enabled: false }, stroke: { curve: 'smooth' }, title: { text: 'Hive Weight History', align: 'left' }, markers: { size: 0 }, xaxis: { type: 'datetime' }, yaxis: { title: { text: 'Weight (g)' }, labels: { formatter: (val) => val.toFixed(2), }}, legend: { show: false }, colors: ['#FDB813'], };
    const weightChartSeries = [{ name: 'Weight', data: weightHistory }];
    const tempColor = getTemperatureColor(sensorData.temperature);
    const humidityColor = getHumidityColor(sensorData.humidity);
    const soundColor = getSoundColor(sensorData.sound_voltage_num);

    if (isLoading) {
        return <div className="loading-screen"><h1>Loading Dashboard...</h1></div>;
    }

    return (
        <>
            <HistoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={fullHistory} isLoading={isHistoryLoading}/>
            <div className="dashboard-container">
                <header>
                    <img src={bwiseLogo} alt="Bwise Le Organica Logo" className="header-logo" />
                    <div className="header-titles">
                        <h1>Hive Monitoring Dashboard</h1>
                        <p>A Bwise Le Organica Project</p>
                    </div>
                </header>

                <main>
                    <div className="main-actions">
                        <button className="history-btn" onClick={handleHistoryButtonClick}>View Full History</button>
                        {sensorData.timestamp && <p className="last-updated">Last Updated: {new Date(sensorData.timestamp).toLocaleString()}</p>}
                    </div>

                    <div className="grid-container">
                        <div className="grid-item"> {sensorData.temperature != null && ( <GaugeChart value={sensorData.temperature} title="Temperature" unit="°C" min={0} max={50} colors={[tempColor]} /> )} </div>
                        <div className="grid-item"> {sensorData.humidity != null && ( <GaugeChart value={sensorData.humidity} title="Humidity" unit="%" min={0} max={100} colors={[humidityColor]} /> )} </div>
                        <div className="grid-item"> {sensorData.sound_voltage_num != null && ( <GaugeChart value={sensorData.sound_voltage_num} title="Sound" unit="V" min={0} max={3.5} colors={[soundColor]} /> )} </div>
                        
                        <div className="grid-item large">
                            <VideoStream />
                        </div>

                        <div className="grid-item large"> <Chart options={weightChartOptions} series={weightChartSeries} type="line" height={350} /> </div>
                        <div className="grid-item"> <InfoCard title="Location" value={sensorData.location} /> </div>
                        <div className="grid-item"> <InfoCard title="Device ID" value={sensorData.device_id} /> </div>
                    </div>
                </main>
            </div>
        </>
    );
}

export default App;
// Global variables
let sensors = {};
let telemetryChart, voltageTempChart, pedalChart;
let recording = false;
const maxHistoryPoints = 50;
let sensorHistory = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    loadSensors();
    setInterval(updateSensors, 100); // Update every 100ms
    setInterval(updateCharts, 100); // Update charts every 100ms
    setupEventListeners();
});

// Initialize Chart.js charts
function initializeCharts() {
    const telemetryCtx = document.getElementById('telemetryChart').getContext('2d');
    const voltageTempCtx = document.getElementById('voltageTempChart').getContext('2d');
    const pedalCtx = document.getElementById('pedalChart').getContext('2d');

    // Telemetry chart (RPM, Speed)
    telemetryChart = new Chart(telemetryCtx, {
        type: 'line',
        data: {
            labels: Array(maxHistoryPoints).fill(''),
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0 // Disable animation for better performance
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(205, 214, 244, 0.1)' },
                    ticks: {
                        color: '#cdd6f4',
                        font: {
                            family: 'JetBrains Mono, monospace'
                        }
                    }
                },
                x: {
                    grid: { color: 'rgba(205, 214, 244, 0.1)' },
                    ticks: {
                        color: '#cdd6f4',
                        font: {
                            family: 'JetBrains Mono, monospace'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#cdd6f4',
                        font: {
                            family: 'JetBrains Mono, monospace'
                        }
                    }
                }
            }
        }
    });

    // Voltage & Temperature chart
    voltageTempChart = new Chart(voltageTempCtx, {
        type: 'line',
        data: {
            labels: Array(maxHistoryPoints).fill(''),
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(205, 214, 244, 0.1)' },
                    ticks: {
                        color: '#cdd6f4',
                        font: {
                            family: 'JetBrains Mono, monospace'
                        }
                    }
                },
                x: {
                    grid: { color: 'rgba(205, 214, 244, 0.1)' },
                    ticks: {
                        color: '#cdd6f4',
                        font: {
                            family: 'JetBrains Mono, monospace'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#cdd6f4',
                        font: {
                            family: 'JetBrains Mono, monospace'
                        }
                    }
                }
            }
        }
    });

    // Pedal inputs chart
    pedalChart = new Chart(pedalCtx, {
        type: 'line',
        data: {
            labels: Array(maxHistoryPoints).fill(''),
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(205, 214, 244, 0.1)' },
                    ticks: {
                        color: '#cdd6f4',
                        font: {
                            family: 'JetBrains Mono, monospace'
                        }
                    }
                },
                x: {
                    grid: { color: 'rgba(205, 214, 244, 0.1)' },
                    ticks: {
                        color: '#cdd6f4',
                        font: {
                            family: 'JetBrains Mono, monospace'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#cdd6f4',
                        font: {
                            family: 'JetBrains Mono, monospace'
                        }
                    }
                }
            }
        }
    });
}

// Load sensors from the server
function loadSensors() {
    fetch('/api/sensor_data')
        .then(response => response.json())
        .then(data => {
            sensors = data;
            renderSensorList();
        });

    // Load initial history data
    fetch('/api/sensor_history')
        .then(response => response.json())
        .then(data => {
            sensorHistory = data;
            updateCharts();
        });
}

// Render the sensor selection list
function renderSensorList() {
    const sensorList = document.getElementById('sensorList');
    sensorList.innerHTML = '';

    for (const [name, data] of Object.entries(sensors)) {
        const div = document.createElement('div');
        div.className = 'sensor-item';

        div.innerHTML = `
            <input type="checkbox" id="${name}" ${data.selected ? 'checked' : ''}>
            <label for="${name}">
                <span>${name}</span>
                <span class="sensor-value">${data.value}${data.unit}</span>
            </label>
        `;

        // Add change event listener
        div.querySelector('input').addEventListener('change', function() {
            updateSensorSelection(name, this.checked);
        });

        sensorList.appendChild(div);
    }
}

// Update sensor selection on the server
function updateSensorSelection(sensorName, selected) {
    fetch(`/api/update_sensor/${sensorName}/${selected}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                sensors[sensorName].selected = selected;
                updateCharts();
            }
        });
}

// Update sensor values from the server
function updateSensors() {
    fetch('/api/sensor_data')
        .then(response => response.json())
        .then(data => {
            sensors = data;
            updateSensorValues();
        });

    // Update history data
    fetch('/api/sensor_history')
        .then(response => response.json())
        .then(data => {
            sensorHistory = data;
        });
}

// Update displayed sensor values
function updateSensorValues() {
    for (const [name, data] of Object.entries(sensors)) {
        const valueElement = document.querySelector(`#${name} + label .sensor-value`);
        if (valueElement) {
            valueElement.textContent = `${data.value}${data.unit}`;
        }
    }
}

// Update charts with current sensor data
function updateCharts() {
    // Update telemetry chart (RPM, Speed)
    updateChartDataset(telemetryChart, [
        { sensor: 'RPM', color: sensors['RPM']?.color || '#FF9AA2' },
        { sensor: 'Speed (km/h)', color: sensors['Speed (km/h)']?.color || '#FFB7B2' }
    ]);

    // Update voltage & temperature chart
    updateChartDataset(voltageTempChart, [
        { sensor: 'Battery Voltage (V)', color: sensors['Battery Voltage (V)']?.color || '#C7CEEA' },
        { sensor: 'Motor Temp (°C)', color: sensors['Motor Temp (°C)']?.color || '#F8B195' }
    ]);

    // Update pedal inputs chart
    updateChartDataset(pedalChart, [
        { sensor: 'Throttle (%)', color: sensors['Throttle (%)']?.color || '#A5DEE5' },
        { sensor: 'Brake (%)', color: sensors['Brake (%)']?.color || '#D8BFD8' }
    ]);
}

// Update a specific chart dataset
function updateChartDataset(chart, sensorConfigs) {
    // Remove all existing datasets
    chart.data.datasets = [];

    // Add datasets for selected sensors
    sensorConfigs.forEach(config => {
        if (sensors[config.sensor]?.selected && sensorHistory[config.sensor]) {
            chart.data.datasets.push({
                label: config.sensor,
                data: sensorHistory[config.sensor],
                borderColor: config.color,
                backgroundColor: config.color + '80',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                pointRadius: 0 // Remove points for cleaner look
            });
        }
    });

    // Update the chart
    chart.update();
}

// Set up event listeners for buttons
function setupEventListeners() {
    document.getElementById('startBtn').addEventListener('click', startRecording);
    document.getElementById('stopBtn').addEventListener('click', stopRecording);
    document.getElementById('downloadBtn').addEventListener('click', downloadData);
}

// Start recording
function startRecording() {
    fetch('/api/recording/start')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'recording started') {
                recording = true;
                updateRecordingStatus();
            }
        });
}

// Stop recording
function stopRecording() {
    fetch('/api/recording/stop')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'recording stopped') {
                recording = false;
                updateRecordingStatus();
            }
        });
}

// Update recording status display
function updateRecordingStatus() {
    const statusElement = document.getElementById('recordingStatus');
    statusElement.textContent = recording ? 'RECORDING' : 'STOPPED';
    statusElement.className = recording ? 'recording-status recording' : 'recording-status stopped';
}

// Download recorded data
function downloadData() {
    window.location.href = '/api/download';
}

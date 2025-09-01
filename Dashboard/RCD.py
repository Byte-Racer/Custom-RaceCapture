from flask import Flask, render_template, jsonify, send_file, request
import random
import math
import time
import csv
import io
import os
from datetime import datetime
from threading import Lock
from flask_cors import CORS

# Get the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__,
            template_folder=os.path.join(current_dir, 'templates'),
            static_folder=os.path.join(current_dir, 'static'))
CORS(app)

# Create folders if they don't exist
if not os.path.exists(os.path.join(current_dir, 'templates')):
    os.makedirs(os.path.join(current_dir, 'templates'))

if not os.path.exists(os.path.join(current_dir, 'static')):
    os.makedirs(os.path.join(current_dir, 'static'))

# Global variables for sensor data and recording state
sensor_data = {
    "RPM": {"value": 0, "selected": True, "color": "#FF9AA2", "unit": "", "history": []},
    "Speed (km/h)": {"value": 0, "selected": True, "color": "#FFB7B2", "unit": "km/h", "history": []},
    "Accel X (g)": {"value": 0, "selected": True, "color": "#FFDAC1", "unit": "g", "history": []},
    "Accel Y (g)": {"value": 0, "selected": True, "color": "#E2F0CB", "unit": "g", "history": []},
    "Accel Z (g)": {"value": 0, "selected": True, "color": "#B5EAD7", "unit": "g", "history": []},
    "Battery Voltage (V)": {"value": 0, "selected": True, "color": "#C7CEEA", "unit": "V", "history": []},
    "Motor Temp (°C)": {"value": 0, "selected": True, "color": "#F8B195", "unit": "°C", "history": []},
    "Throttle (%)": {"value": 0, "selected": True, "color": "#A5DEE5", "unit": "%", "history": []},
    "Brake (%)": {"value": 0, "selected": True, "color": "#D8BFD8", "unit": "%", "history": []}
}

recording = False
recorded_data = []
data_lock = Lock()
start_time = 0
max_history_points = 50  # Number of data points to keep in history
sd_card_path = "/mnt/sdcard"  # Default SD card path


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/sensor_data')
def get_sensor_data():
    with data_lock:
        # Return only current values, not the entire history
        response_data = {}
        for key, value in sensor_data.items():
            response_data[key] = {
                "value": value["value"],
                "selected": value["selected"],
                "color": value["color"],
                "unit": value["unit"]
            }
        return jsonify(response_data)


@app.route('/api/sensor_history')
def get_sensor_history():
    with data_lock:
        # Return history data for charts
        history_data = {}
        for key, value in sensor_data.items():
            history_data[key] = value["history"]
        return jsonify(history_data)


@app.route('/api/update_sd_path', methods=['POST'])
def update_sd_path():
    global sd_card_path
    data = request.get_json()
    if data and 'path' in data:
        sd_card_path = data['path']
        return jsonify({"status": "success", "path": sd_card_path})
    return jsonify({"status": "error", "message": "No path provided"})


@app.route('/api/recording/<action>')
def control_recording(action):
    global recording, start_time, recorded_data

    with data_lock:
        if action == 'start':
            recording = True
            start_time = time.time()
            recorded_data = []
            return jsonify({"status": "recording started"})
        elif action == 'stop':
            recording = False
            return jsonify({"status": "recording stopped"})
        else:
            return jsonify({"status": "unknown action"})


@app.route('/api/download')
def download_data():
    with data_lock:
        # Create a CSV file in memory
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        headers = ['Timestamp'] + list(sensor_data.keys())
        writer.writerow(headers)

        # Write data
        for row in recorded_data:
            writer.writerow(row)

        # Prepare for download
        output.seek(0)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"racecapture_data_{timestamp}.csv"

        return send_file(
            io.BytesIO(output.getvalue().encode()),
            mimetype='text/csv',
            as_attachment=True,
            download_name=filename
        )


@app.route('/api/save_to_sd')
def save_to_sd():
    with data_lock:
        # Create a CSV file
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        headers = ['Timestamp'] + list(sensor_data.keys())
        writer.writerow(headers)

        # Write data
        for row in recorded_data:
            writer.writerow(row)

        # Prepare for saving
        output.seek(0)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"racecapture_data_{timestamp}.csv"

        # In a real application, this would write to the actual SD card path
        # For now, we'll just return the path where it would be saved
        full_path = os.path.join(sd_card_path, filename)

        return jsonify({
            "status": "success",
            "message": f"Data saved to SD card",
            "path": full_path
        })


def simulate_sensors():
    """Background task to simulate sensor data"""
    while True:
        with data_lock:
            # Update sensor values with realistic patterns
            t = time.time()

            sensor_data["RPM"]["value"] = int(1000 + 500 * math.sin(t * 0.5) + random.randint(-50, 50))
            sensor_data["Speed (km/h)"]["value"] = int(80 + 30 * math.sin(t * 0.3) + random.randint(-5, 5))
            sensor_data["Accel X (g)"]["value"] = round(0.5 * math.sin(t * 2) + random.uniform(-0.1, 0.1), 2)
            sensor_data["Accel Y (g)"]["value"] = round(0.3 * math.sin(t * 1.5) + random.uniform(-0.1, 0.1), 2)
            sensor_data["Accel Z (g)"]["value"] = round(0.8 + 0.2 * math.sin(t * 0.8) + random.uniform(-0.1, 0.1), 2)
            sensor_data["Battery Voltage (V)"]["value"] = round(
                12.0 + 0.5 * math.sin(t * 0.2) + random.uniform(-0.1, 0.1), 1)
            sensor_data["Motor Temp (°C)"]["value"] = int(70 + 10 * math.sin(t * 0.1) + random.randint(-2, 2))
            sensor_data["Throttle (%)"]["value"] = int(50 + 40 * math.sin(t * 0.4) + random.randint(-5, 5))
            sensor_data["Brake (%)"]["value"] = int(20 + 30 * math.sin(t * 0.7) + random.randint(-5, 5))

            # Update history for all sensors
            for sensor in sensor_data.values():
                sensor["history"].append(sensor["value"])
                if len(sensor["history"]) > max_history_points:
                    sensor["history"].pop(0)

            # If recording, add to data
            if recording:
                timestamp = time.time() - start_time
                row = [round(timestamp, 2)] + [sensor_data[key]["value"] for key in sensor_data]
                recorded_data.append(row)

        time.sleep(0.1)  # Update every 100ms


if __name__ == '__main__':
    # Start sensor simulation in a separate thread
    import threading

    sim_thread = threading.Thread(target=simulate_sensors, daemon=True)
    sim_thread.start()

    app.run(debug=True, threaded=True, host='0.0.0.0')
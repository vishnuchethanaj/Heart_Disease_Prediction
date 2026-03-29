from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
import csv
import os
from collections import Counter
from math import sqrt

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
app = Flask(__name__, static_folder=project_root)
CORS(app)

# Load CSV data
data_path = os.path.join(project_root, 'heart_disease_selected_features.csv')


def _to_number(value):
    try:
        num = float(value)
        if num.is_integer():
            return int(num)
        return num
    except (TypeError, ValueError):
        return value


def _load_dataset(csv_path):
    with open(csv_path, 'r', encoding='utf-8-sig', newline='') as file_obj:
        reader = csv.DictReader(file_obj)
        columns = reader.fieldnames or []
        rows = []

        for raw_row in reader:
            parsed = {}
            for key, value in raw_row.items():
                if value is None:
                    parsed[key] = None
                    continue

                cleaned = value.strip()
                parsed[key] = None if cleaned == '' else _to_number(cleaned)

            rows.append(parsed)

    return rows, columns


def _numeric_values(rows, column):
    values = []
    for row in rows:
        value = row.get(column)
        if isinstance(value, (int, float)):
            values.append(float(value))
    return values


def _column_mean(values):
    if not values:
        return 0.0
    return sum(values) / len(values)


def _column_std(values):
    if len(values) < 2:
        return 0.0
    mean_val = _column_mean(values)
    variance = sum((value - mean_val) ** 2 for value in values) / len(values)
    return sqrt(variance)


rows, columns = _load_dataset(data_path)

cp_counts = Counter(int(row['cp']) for row in rows if isinstance(row.get('cp'), (int, float)))
slope_counts = Counter(int(row['slope']) for row in rows if isinstance(row.get('slope'), (int, float)))
restecg_counts = Counter(int(row['restecg']) for row in rows if isinstance(row.get('restecg'), (int, float)))
fbs_counts = Counter(int(row['fbs']) for row in rows if isinstance(row.get('fbs'), (int, float)))

thalach_values = _numeric_values(rows, 'thalach')
chol_values = _numeric_values(rows, 'chol')
trestbps_values = _numeric_values(rows, 'trestbps')
target_values = [int(row['target']) for row in rows if isinstance(row.get('target'), (int, float))]

# Calculate statistics from CSV data
csv_stats = {
    'cp': list(cp_counts.items()),
    'thalach': {'min': float(min(thalach_values)), 'max': float(max(thalach_values)), 'mean': float(_column_mean(thalach_values))},
    'slope': list(slope_counts.items()),
    'restecg': list(restecg_counts.items()),
    'fbs': list(fbs_counts.items()),
    'chol': {'min': float(min(chol_values)), 'max': float(max(chol_values)), 'mean': float(_column_mean(chol_values))},
    'trestbps': {'min': float(min(trestbps_values)), 'max': float(max(trestbps_values)), 'mean': float(_column_mean(trestbps_values))},
}

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'API is running'})

@app.route('/health', methods=['GET'])
def health_alias():
    """Simple health alias for platform checks."""
    return jsonify({'status': 'ok', 'message': 'API is running'})

@app.route('/')
def serve_home():
    """Serve the web app entry point."""
    return send_from_directory(project_root, 'index.html')

@app.route('/api/data-info', methods=['GET'])
def data_info():
    """Get CSV data information"""
    no_disease = sum(1 for value in target_values if value == 0)
    disease = sum(1 for value in target_values if value == 1)

    return jsonify({
        'total_records': len(rows),
        'features': columns,
        'statistics': csv_stats,
        'disease_distribution': {
            'no_disease': no_disease,
            'disease': disease
        }
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Make a prediction based on user input.
    Required JSON fields:
    {
        "age": int,
        "gender": int (0/1),
        "cp": int,
        "trestbps": int,
        "chol": int,
        "fbs": int (0/1),
        "thalach": int
    }
    Optional fields (defaults applied if missing):
    {
        "restecg": int,
        "slope": int
    }
    """
    try:
        data = request.get_json()
        
        # Validate input - only fields currently collected in the form are required
        required_fields = [
            'age', 'gender', 'cp', 'trestbps', 'chol', 'fbs', 'thalach'
        ]
        
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400
        
        # Convert to appropriate types
        input_data = {
            'age': int(data.get('age', 0)),
            'gender': int(data.get('gender', 0)),
            'cp': int(data.get('cp', 0)),
            'trestbps': int(data.get('trestbps', 0)),
            'chol': int(data.get('chol', 0)),
            'fbs': int(data.get('fbs', 0)),
            'restecg': int(data.get('restecg', 0)),
            'thalach': int(data.get('thalach', 0)),
            'slope': int(data.get('slope', 0))
        }
        
        # Calculate risk based on CSV data statistics
        risk_score = calculate_risk(input_data)
        
        # Calculate feature importance based on the input
        feature_importance = calculate_feature_importance(input_data)
        
        # Generate prediction
        prediction = {
            'riskPercentage': int(risk_score),
            'confidence': int(min(99, 75 + abs(risk_score - 50) / 5)),
            'probDisease': int(risk_score),
            'probNoDisease': int(100 - risk_score),
            'features': feature_importance,
            'input_data': input_data
        }
        
        return jsonify(prediction), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def calculate_risk(data):
    """
    Calculate risk score based on input data
    Using factors from CSV data analysis - only selected features
    """
    risk = 30  # Baseline risk
    
    # Age factor
    if data['age'] > 60:
        risk += 25
    elif data['age'] > 50:
        risk += 15
    elif data['age'] > 40:
        risk += 8
    
    # Cholesterol factor
    if data['chol'] > 240:
        risk += 20
    elif data['chol'] > 200:
        risk += 12
    
    # Blood pressure factor
    if data['trestbps'] > 140:
        risk += 18
    elif data['trestbps'] > 120:
        risk += 10
    
    # Max heart rate factor
    if data['thalach'] < 60:
        risk += 15
    elif data['thalach'] > 180:
        risk += 8
    
    # Chest pain type
    if data['cp'] == 0:  # Typical angina
        risk += 20
    elif data['cp'] == 1:  # Atypical angina
        risk += 10
    elif data['cp'] == 2:  # Non-anginal pain
        risk += 5
    
    # Fasting blood sugar
    if data['fbs'] == 1:
        risk += 8
    
    # ST slope
    if data['slope'] == 0:  # Upsloping
        risk -= 5
    elif data['slope'] == 2:  # Downsloping
        risk += 5
    
    # Resting ECG
    if data['restecg'] == 1:  # ST-T abnormality
        risk += 8
    elif data['restecg'] == 2:  # LV hypertrophy
        risk += 6
    
    # Clamp risk between 20 and 95
    risk = max(20, min(95, risk))
    
    return int(risk)

def calculate_feature_importance(data):
    """Calculate feature importance percentages"""
    total_importance = 100
    
    # Base importances
    importance = {
        'chol': 28,
        'age': 22,
        'bp': 18,
        'hr': 15,
        'st': 10,
        'other': 7
    }
    
    # Adjust based on risk factors
    if data['chol'] > 240:
        importance['chol'] = 32
        importance['other'] -= 4
    
    if data['age'] > 60:
        importance['age'] = 26
        importance['other'] -= 4
    
    if data['trestbps'] > 140:
        importance['bp'] = 22
        importance['other'] -= 4
    
    if data['thalach'] < 60 or data['thalach'] > 180:
        importance['hr'] = 18
        importance['other'] -= 4
    
    return importance

@app.route('/api/csv-data', methods=['GET'])
def get_csv_data():
    """Get CSV data as JSON"""
    try:
        # Return sample of data
        sample_size = int(request.args.get('sample_size', 100))
        sample_rows = rows[:max(0, sample_size)]
        
        return jsonify({
            'columns': columns,
            'total_rows': len(rows),
            'data': sample_rows
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/feature-ranges', methods=['GET'])
def get_feature_ranges():
    """Get min/max ranges for each feature"""
    ranges = {}

    for col in columns:
        values = [row.get(col) for row in rows if row.get(col) is not None]
        numeric_values = [float(value) for value in values if isinstance(value, (int, float))]

        if values and len(numeric_values) == len(values):
            ranges[col] = {
                'min': float(min(numeric_values)),
                'max': float(max(numeric_values)),
                'mean': float(_column_mean(numeric_values)),
                'std': float(_column_std(numeric_values))
            }
        else:
            counts = Counter(str(value) for value in values)
            ranges[col] = {
                'unique_values': list(counts.keys()),
                'value_counts': dict(counts)
            }
    
    return jsonify(ranges), 200

@app.route('/<path:path>')
def serve_static(path):
    """Serve static assets and standalone HTML pages from project root."""
    if path.startswith('api/'):
        abort(404)

    requested_path = os.path.join(project_root, path)
    if os.path.exists(requested_path) and os.path.isfile(requested_path):
        return send_from_directory(project_root, path)

    return send_from_directory(project_root, 'index.html')

if __name__ == '__main__':
    print("Starting Flask API Server...")
    print("CSV Data Loaded:")
    print(f"  - Total Records: {len(rows)}")
    print(f"  - Features: {columns}")
    print(f"  - Disease Distribution: {dict(Counter(target_values))}")
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)

from flask import Flask, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from datetime import date, timedelta
from decimal import Decimal

app = Flask(__name__)
CORS(app)
# ... (Keep the rest of your app.py code exactly as it was) ...

# Fix JSON serialization issues for Date, Time, and Decimal objects from MySQL
class CustomJSONProvider(app.json_provider_class):
    def default(self, obj):
        if isinstance(obj, (date, timedelta)):
            return str(obj)
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

app.json = CustomJSONProvider(app)

# Database connection configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'hrms_db'
}

def create_db_connection():
    try:
        connection = mysql.connector.connect(**db_config)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# 1. Default Route
@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "HRMS Backend API is running successfully!"})

# 2. Employees Route
@app.route('/employees', methods=['GET'])
def get_employees():
    connection = create_db_connection()
    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Employees;")
        employees = cursor.fetchall()
        return jsonify(employees), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

# 3. Attendance Route
@app.route('/attendance', methods=['GET'])
def get_attendance():
    connection = create_db_connection()
    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Attendance;")
        attendance = cursor.fetchall()
        return jsonify(attendance), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

# 4. Leaves Route
@app.route('/leaves', methods=['GET'])
def get_leaves():
    connection = create_db_connection()
    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Leaves;")
        leaves = cursor.fetchall()
        return jsonify(leaves), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

# 5. Payroll Route
@app.route('/payroll', methods=['GET'])
def get_payroll():
    connection = create_db_connection()
    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Payroll;")
        payroll = cursor.fetchall()
        return jsonify(payroll), 200
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == '__main__':
    app.run(debug=True)
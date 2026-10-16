from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from datetime import date, timedelta
from decimal import Decimal
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
# Enable CORS to allow requests from the frontend (Live Server)
CORS(app)

# Fix JSON serialization issues for Date, Time, and Decimal objects from MySQL
class CustomJSONProvider(app.json_provider_class):
    def default(self, obj):
        if isinstance(obj, (date, timedelta)):
            return str(obj)
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

app.json = CustomJSONProvider(app)

# Database connection configuration using environment variables
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'sl_bank_hrms')
}

def create_db_connection():
    try:
        connection = mysql.connector.connect(**db_config)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# Default Route
@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "HRMS Backend API is running successfully!"})

# Employees Route (GET - Read All, POST - Create New)
@app.route('/employees', methods=['GET', 'POST'])
def handle_employees():
    connection = create_db_connection()
    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # GET: Fetch all employees
        if request.method == 'GET':
            cursor.execute("SELECT * FROM Employees;")
            employees = cursor.fetchall()
            return jsonify(employees), 200
            
        # POST: Add new employee
        elif request.method == 'POST':
            data = request.json
            
            # Validation for required fields
            required_fields = ['first_name', 'last_name', 'email']
            for field in required_fields:
                if not data.get(field):
                    return jsonify({"error": f"{field.replace('_', ' ').title()} is required!"}), 400
            
            # Validation for negative salary
            if data.get('basic_salary') and float(data.get('basic_salary')) < 0:
                return jsonify({"error": "Basic Salary cannot be negative!"}), 400

            query = """
                INSERT INTO Employees (first_name, last_name, email, phone, department, hire_date, basic_salary)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            values = (
                data.get('first_name'), data.get('last_name'), data.get('email'), 
                data.get('phone'), data.get('department'), data.get('hire_date'), data.get('basic_salary')
            )
            
            cursor.execute(query, values)
            connection.commit() 
            
            return jsonify({"message": "Employee added successfully!", "id": cursor.lastrowid}), 201

    except Error as e:
        print(f"Database error: {e}") 
        return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

# Employees Route for Specific Employee (PUT - Update, DELETE - Remove)
@app.route('/employees/<int:emp_id>', methods=['PUT', 'DELETE'])
def update_delete_employee(emp_id):
    connection = create_db_connection()
    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        cursor = connection.cursor()
        
        # DELETE: Remove an employee
        if request.method == 'DELETE':
            cursor.execute("DELETE FROM Employees WHERE emp_id = %s", (emp_id,))
            connection.commit()
            return jsonify({"message": "Employee deleted successfully!"}), 200
            
        # PUT: Update existing employee
        elif request.method == 'PUT':
            data = request.json
            
            # Validation
            required_fields = ['first_name', 'last_name', 'email']
            for field in required_fields:
                if not data.get(field):
                    return jsonify({"error": f"{field.replace('_', ' ').title()} is required!"}), 400
            
            if data.get('basic_salary') and float(data.get('basic_salary')) < 0:
                return jsonify({"error": "Basic Salary cannot be negative!"}), 400

            query = """
                UPDATE Employees 
                SET first_name=%s, last_name=%s, email=%s, phone=%s, department=%s, hire_date=%s, basic_salary=%s
                WHERE emp_id=%s
            """
            values = (
                data.get('first_name'), data.get('last_name'), data.get('email'), 
                data.get('phone'), data.get('department'), data.get('hire_date'), 
                data.get('basic_salary'), emp_id
            )
            
            cursor.execute(query, values)
            connection.commit()
            return jsonify({"message": "Employee updated successfully!"}), 200

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

# Attendance Route
@app.route('/attendance', methods=['GET'])
def get_attendance():
    connection = create_db_connection()
    if connection is None: return jsonify({"error": "DB failed"}), 500
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Attendance;")
        return jsonify(cursor.fetchall()), 200
    except Error as e: return jsonify({"error": str(e)}), 500
    finally: connection.close()

# Leaves Route
@app.route('/leaves', methods=['GET'])
def get_leaves():
    connection = create_db_connection()
    if connection is None: return jsonify({"error": "DB failed"}), 500
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Leaves;")
        return jsonify(cursor.fetchall()), 200
    except Error as e: return jsonify({"error": str(e)}), 500
    finally: connection.close()

# Payroll Route
@app.route('/payroll', methods=['GET'])
def get_payroll():
    connection = create_db_connection()
    if connection is None: return jsonify({"error": "DB failed"}), 500
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Payroll;")
        return jsonify(cursor.fetchall()), 200
    except Error as e: return jsonify({"error": str(e)}), 500
    finally: connection.close()

if __name__ == '__main__':
    # Run the Flask server on port 5000
    app.run(debug=True, port=5000)
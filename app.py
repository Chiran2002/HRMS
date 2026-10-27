from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)
CORS(app)

def create_db_connection():
    try:
        connection = mysql.connector.connect(
            host='127.0.0.1',
            user='root',
            password='',
            database='hrms_db'
        )
        return connection
    except Error as e:
        print(f"Error: {e}")
        return None

@app.route('/employees', methods=['GET', 'POST'])
def handle_employees():
    connection = create_db_connection()
    if connection is None: return jsonify({"error": "DB failed"}), 500
    try:
        cursor = connection.cursor(dictionary=True)
        if request.method == 'GET':
            cursor.execute("SELECT * FROM employees ORDER BY emp_id DESC")
            return jsonify(cursor.fetchall()), 200
        elif request.method == 'POST':
            data = request.json
            query = "INSERT INTO employees (first_name, last_name, email, phone, department, hire_date, basic_salary) VALUES (%s, %s, %s, %s, %s, %s, %s)"
            cursor.execute(query, (data.get('first_name'), data.get('last_name'), data.get('email'), data.get('phone'), data.get('department'), data.get('hire_date'), data.get('basic_salary')))
            connection.commit()
            return jsonify({"message": "Employee added successfully!"}), 201
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected(): cursor.close(); connection.close()

@app.route('/employees/<int:id>', methods=['PUT', 'DELETE'])
def update_delete_employee(id):
    connection = create_db_connection()
    if connection is None: return jsonify({"error": "DB failed"}), 500
    try:
        cursor = connection.cursor()
        if request.method == 'PUT':
            data = request.json
            query = "UPDATE employees SET first_name=%s, last_name=%s, email=%s, phone=%s, department=%s, hire_date=%s, basic_salary=%s WHERE emp_id=%s"
            cursor.execute(query, (data.get('first_name'), data.get('last_name'), data.get('email'), data.get('phone'), data.get('department'), data.get('hire_date'), data.get('basic_salary'), id))
            connection.commit()
            return jsonify({"message": "Employee updated successfully!"}), 200
        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM employees WHERE emp_id=%s", (id,))
            connection.commit()
            return jsonify({"message": "Employee deleted successfully!"}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected(): cursor.close(); connection.close()

@app.route('/attendance', methods=['GET', 'POST'])
def handle_attendance():
    connection = create_db_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        if request.method == 'GET':
            query = "SELECT a.attendance_id, a.emp_id, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, a.record_date, a.status, a.ot_hours FROM attendance a JOIN employees e ON a.emp_id = e.emp_id ORDER BY a.record_date DESC;"
            cursor.execute(query)
            return jsonify(cursor.fetchall()), 200
        elif request.method == 'POST':
            data = request.json
            query = "INSERT INTO attendance (emp_id, record_date, status, ot_hours) VALUES (%s, %s, %s, %s)"
            cursor.execute(query, (data.get('emp_id'), data.get('date'), data.get('status'), data.get('ot_hours', 0)))
            connection.commit()
            return jsonify({"message": "Attendance marked!"}), 201
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected(): cursor.close(); connection.close()

@app.route('/leaves', methods=['GET', 'POST'])
def handle_leaves():
    connection = create_db_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        if request.method == 'GET':
            query = "SELECT l.leave_id, l.emp_id, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, l.leave_type, l.start_date, l.end_date, l.status FROM leaves l JOIN employees e ON l.emp_id = e.emp_id ORDER BY l.start_date DESC;"
            cursor.execute(query)
            return jsonify(cursor.fetchall()), 200
        elif request.method == 'POST':
            data = request.json
            query = "INSERT INTO leaves (emp_id, leave_type, start_date, end_date, status) VALUES (%s, %s, %s, %s, %s)"
            cursor.execute(query, (data.get('emp_id'), data.get('leave_type'), data.get('start_date'), data.get('end_date'), data.get('status', 'Pending')))
            connection.commit()
            return jsonify({"message": "Leave applied successfully!"}), 201
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected(): cursor.close(); connection.close()

@app.route('/advances', methods=['POST'])
def add_advance():
    connection = create_db_connection()
    try:
        cursor = connection.cursor()
        data = request.json
        query = "INSERT INTO salary_advances (emp_id, date, amount) VALUES (%s, %s, %s)"
        cursor.execute(query, (data.get('emp_id'), data.get('date'), data.get('amount')))
        connection.commit()
        return jsonify({"message": "Advance added successfully!"}), 201
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected(): cursor.close(); connection.close()

@app.route('/api/calculate-salary', methods=['POST'])
def calculate_salary():
    connection = create_db_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        data = request.json
        emp_id = data.get('emp_id')
        month_year = data.get('month_year') 
        
        cursor.execute("SELECT basic_salary FROM employees WHERE emp_id = %s", (emp_id,))
        emp = cursor.fetchone()
        if not emp: return jsonify({"error": "Employee not found"}), 404
        
        cursor.execute("SELECT COUNT(attendance_id) as attended_days, SUM(ot_hours) as total_ot FROM attendance WHERE emp_id = %s AND status = 'Present' AND record_date LIKE %s", (emp_id, f"{month_year}-%"))
        attendance_data = cursor.fetchone()
        
        cursor.execute("SELECT SUM(amount) as total_advance FROM salary_advances WHERE emp_id = %s AND date LIKE %s", (emp_id, f"{month_year}-%"))
        advance_data = cursor.fetchone()

        return jsonify({
            "basic_salary": float(emp['basic_salary']),
            "attended_days": int(attendance_data['attended_days'] or 0),
            "total_ot_hours": float(attendance_data['total_ot'] or 0),
            "total_advance": float(advance_data['total_advance'] or 0)
        }), 200
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected(): cursor.close(); connection.close()

@app.route('/payroll', methods=['GET', 'POST'])
def handle_payroll():
    connection = create_db_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        if request.method == 'GET':
            query = "SELECT p.payroll_id, p.emp_id, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, p.month_year, p.basic_salary, p.attended_days, p.ot_pay, p.advances, p.deductions, p.net_salary, p.payment_date FROM payroll p JOIN employees e ON p.emp_id = e.emp_id ORDER BY p.payment_date DESC;"
            cursor.execute(query)
            return jsonify(cursor.fetchall()), 200
        elif request.method == 'POST':
            data = request.json
            query = "INSERT INTO payroll (emp_id, month_year, basic_salary, attended_days, ot_pay, advances, deductions, net_salary, payment_date) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
            cursor.execute(query, (data.get('emp_id'), data.get('month_year'), data.get('basic_salary'), data.get('attended_days'), data.get('ot_pay'), data.get('advances'), data.get('deductions'), data.get('net_salary'), data.get('payment_date')))
            connection.commit()
            return jsonify({"message": "Payroll generated successfully!"}), 201
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected(): cursor.close(); connection.close()

if __name__ == '__main__':
    app.run(port=5000, debug=True)
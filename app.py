import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
PROFILE_FOLDER = os.path.join(UPLOAD_FOLDER, 'profiles')
CV_FOLDER = os.path.join(UPLOAD_FOLDER, 'cvs')

os.makedirs(PROFILE_FOLDER, exist_ok=True)
os.makedirs(CV_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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

@app.route('/uploads/<folder>/<filename>')
def serve_file(folder, filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], folder), filename)

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
            data = request.form
            
            profile_pic = request.files.get('profile_picture')
            cv_file = request.files.get('cv_file')
            
            profile_filename = None
            cv_filename = None
            
            if profile_pic and profile_pic.filename != '':
                profile_filename = secure_filename(profile_pic.filename)
                profile_pic.save(os.path.join(PROFILE_FOLDER, profile_filename))
                
            if cv_file and cv_file.filename != '':
                cv_filename = secure_filename(cv_file.filename)
                cv_file.save(os.path.join(CV_FOLDER, cv_filename))

            hire_date = data.get('hire_date') if data.get('hire_date') != '' else None
            dob = data.get('dob') if data.get('dob') != '' else None
            basic_salary = data.get('basic_salary') if data.get('basic_salary') != '' else 0.0

            query = """INSERT INTO employees 
                       (first_name, last_name, email, phone, department, hire_date, basic_salary, nic, gender, dob, address, emergency_contact, designation, bank_name, bank_account, epf_number, employment_type, branch, reporting_manager, employee_status, blood_group, marital_status, profile_picture, cv_file) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
            cursor.execute(query, (
                data.get('first_name'), data.get('last_name'), data.get('email'), data.get('phone'), data.get('department'), 
                hire_date, basic_salary, data.get('nic'), data.get('gender'), dob, 
                data.get('address'), data.get('emergency_contact'), data.get('designation'), data.get('bank_name'), data.get('bank_account'),
                data.get('epf_number'), data.get('employment_type'), data.get('branch'), data.get('reporting_manager'), 
                data.get('employee_status'), data.get('blood_group'), data.get('marital_status'), profile_filename, cv_filename
            ))
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
        cursor = connection.cursor(dictionary=True)
        if request.method == 'PUT':
            data = request.form
            
            profile_pic = request.files.get('profile_picture')
            cv_file = request.files.get('cv_file')
            
            cursor.execute("SELECT profile_picture, cv_file FROM employees WHERE emp_id = %s", (id,))
            existing_emp = cursor.fetchone()
            
            profile_filename = existing_emp.get('profile_picture') if existing_emp else None
            cv_filename = existing_emp.get('cv_file') if existing_emp else None
            
            if profile_pic and profile_pic.filename != '':
                profile_filename = secure_filename(profile_pic.filename)
                profile_pic.save(os.path.join(PROFILE_FOLDER, profile_filename))
                
            if cv_file and cv_file.filename != '':
                cv_filename = secure_filename(cv_file.filename)
                cv_file.save(os.path.join(CV_FOLDER, cv_filename))

            hire_date = data.get('hire_date') if data.get('hire_date') != '' else None
            dob = data.get('dob') if data.get('dob') != '' else None
            basic_salary = data.get('basic_salary') if data.get('basic_salary') != '' else 0.0

            query = """UPDATE employees SET 
                       first_name=%s, last_name=%s, email=%s, phone=%s, department=%s, hire_date=%s, basic_salary=%s, 
                       nic=%s, gender=%s, dob=%s, address=%s, emergency_contact=%s, designation=%s, bank_name=%s, bank_account=%s,
                       epf_number=%s, employment_type=%s, branch=%s, reporting_manager=%s, employee_status=%s, blood_group=%s, marital_status=%s,
                       profile_picture=%s, cv_file=%s
                       WHERE emp_id=%s"""
            cursor.execute(query, (
                data.get('first_name'), data.get('last_name'), data.get('email'), data.get('phone'), data.get('department'), 
                hire_date, basic_salary, data.get('nic'), data.get('gender'), dob, 
                data.get('address'), data.get('emergency_contact'), data.get('designation'), data.get('bank_name'), data.get('bank_account'),
                data.get('epf_number'), data.get('employment_type'), data.get('branch'), data.get('reporting_manager'), 
                data.get('employee_status'), data.get('blood_group'), data.get('marital_status'), profile_filename, cv_filename, id
            ))
            connection.commit()
            return jsonify({"message": "Employee updated successfully!"}), 200
            
        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM employees WHERE emp_id=%s", (id,))
            connection.commit()
            return jsonify({"message": "Employee deleted successfully!"}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected(): cursor.close(); connection.close()

# New Unified Endpoint for Time & Attendance
@app.route('/time_attendance', methods=['GET'])
def handle_time_attendance():
    connection = create_db_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT 'Attendance' AS record_type, a.attendance_id AS id, a.emp_id, 
                   CONCAT(e.first_name, ' ', e.last_name) AS employee_name, 
                   e.profile_picture, e.email,
                   a.record_date AS date, a.status, CONCAT(a.ot_hours, ' OT Hours') AS details 
            FROM attendance a JOIN employees e ON a.emp_id = e.emp_id
            UNION ALL
            SELECT 'Leave' AS record_type, l.leave_id AS id, l.emp_id, 
                   CONCAT(e.first_name, ' ', e.last_name) AS employee_name, 
                   e.profile_picture, e.email,
                   l.start_date AS date, l.status, CONCAT(l.leave_type, ' Leave') AS details 
            FROM leaves l JOIN employees e ON l.emp_id = e.emp_id
            ORDER BY date DESC
        """
        cursor.execute(query)
        return jsonify(cursor.fetchall()), 200
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected(): cursor.close(); connection.close()

@app.route('/attendance', methods=['POST'])
def add_attendance():
    connection = create_db_connection()
    try:
        cursor = connection.cursor()
        data = request.json
        query = "INSERT INTO attendance (emp_id, record_date, status, ot_hours) VALUES (%s, %s, %s, %s)"
        cursor.execute(query, (data.get('emp_id'), data.get('date'), data.get('status'), data.get('ot_hours', 0)))
        connection.commit()
        return jsonify({"message": "Attendance marked!"}), 201
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally:
        if connection.is_connected(): cursor.close(); connection.close()

@app.route('/leaves', methods=['POST'])
def apply_leave():
    connection = create_db_connection()
    try:
        cursor = connection.cursor()
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
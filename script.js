const apiUrl = 'http://127.0.0.1:5000';
let currentEndpoint = 'employees'; 
let currentTableData = []; 
let isEditMode = false;
let editEmployeeId = null;

function loadData(endpoint, buttonElement = null) {
    currentEndpoint = endpoint;
    document.getElementById('search-input').value = '';
    const titleElement = document.getElementById('page-title');
    titleElement.textContent = endpoint.charAt(0).toUpperCase() + endpoint.slice(1) + ' Data';

    if (buttonElement) {
        document.querySelectorAll('.sidebar button').forEach(btn => btn.classList.remove('active'));
        buttonElement.classList.add('active');
    }

    const tableBody = document.getElementById('table-body');
    const tableHead = document.getElementById('table-head');
    const loader = document.getElementById('loader');
    
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    loader.classList.remove('hidden');

    fetch(`${apiUrl}/${endpoint}`)
        .then(response => {
            if (!response.ok) throw new Error('Network response error');
            return response.json();
        })
        .then(data => {
            loader.classList.add('hidden');
            currentTableData = data; 
            updateDashboardAndButtons(data); 
            renderTable(data);
        })
        .catch(error => {
            loader.classList.add('hidden');
            console.error('Fetch error:', error);
            showToast('Error fetching data.', true);
        });
}

function updateDashboardAndButtons(data) {
    const mainButton = document.getElementById('main-action-btn');
    if(!mainButton) return;
    
    document.getElementById('total-count').textContent = data.length || 0;
    
    let advBtn = document.getElementById('adv-btn');
    if(!advBtn) {
        advBtn = document.createElement('button');
        advBtn.id = 'adv-btn';
        advBtn.className = 'btn-secondary';
        advBtn.innerHTML = '<i class="fa-solid fa-hand-holding-dollar"></i> Add Advance';
        advBtn.onclick = openAdvanceModal;
        document.querySelector('.controls-bar > div:last-child').insertBefore(advBtn, mainButton);
    }
    
    advBtn.style.display = 'none';

    if (currentEndpoint === 'employees') {
        mainButton.innerHTML = '<i class="fa-solid fa-plus"></i> Add Employee';
        mainButton.onclick = openModal;
        mainButton.style.display = 'flex';
        
        const departments = new Set(data.map(emp => emp.department).filter(dep => dep && dep.trim() !== ''));
        document.getElementById('total-departments').textContent = departments.size;
        const totalSalary = data.reduce((sum, emp) => sum + (parseFloat(emp.basic_salary) || 0), 0);
        document.getElementById('total-salary').textContent = 'Rs. ' + totalSalary.toLocaleString();
        
    } else if (currentEndpoint === 'attendance') {
        mainButton.innerHTML = '<i class="fa-solid fa-clock"></i> Mark Attendance';
        mainButton.onclick = openAttendanceModal;
        mainButton.style.display = 'flex';
        document.getElementById('total-departments').textContent = '-';
        document.getElementById('total-salary').textContent = '-';
        
    } else if (currentEndpoint === 'leaves') {
        mainButton.innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Apply Leave';
        mainButton.onclick = openLeaveModal;
        mainButton.style.display = 'flex';
        document.getElementById('total-departments').textContent = '-';
        document.getElementById('total-salary').textContent = '-';
        
    } else if (currentEndpoint === 'payroll') {
        mainButton.innerHTML = '<i class="fa-solid fa-file-invoice-dollar"></i> Generate Payroll';
        mainButton.onclick = openPayrollModal;
        mainButton.style.display = 'flex';
        advBtn.style.display = 'flex';
        document.getElementById('total-departments').textContent = '-';
        document.getElementById('total-salary').textContent = '-';
    }
}

document.getElementById('search-input').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    if(!currentTableData) return;
    const filteredData = currentTableData.filter(item => {
        return Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm));
    });
    renderTable(filteredData);
});

function renderTable(data) {
    const tableHead = document.getElementById('table-head');
    const tableBody = document.getElementById('table-body');
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="100%" style="text-align:center; padding: 30px; color: #94a3b8;">No matching data found</td></tr>';
        return;
    }

    const headers = Object.keys(data[0]);
    const headerRow = document.createElement('tr');
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText.replace(/_/g, ' ').toUpperCase(); 
        headerRow.appendChild(th);
    });
    
    if(currentEndpoint === 'employees') {
        const th = document.createElement('th');
        th.textContent = 'ACTIONS';
        headerRow.appendChild(th);
    }
    tableHead.appendChild(headerRow);

    data.forEach(item => {
        const row = document.createElement('tr');
        headers.forEach(key => {
            const td = document.createElement('td');
            
            if((key === 'hire_date' || key === 'date' || key === 'record_date' || key === 'start_date' || key === 'end_date' || key === 'payment_date') && item[key]) {
                try { td.textContent = new Date(item[key]).toISOString().split('T')[0]; } 
                catch { td.textContent = item[key]; }
            } 
            else if (key === 'status') {
                let badgeClass = 'badge-info';
                const statusStr = String(item[key]).toLowerCase();
                if (statusStr.includes('present') || statusStr.includes('approved')) badgeClass = 'badge-success';
                else if (statusStr.includes('absent') || statusStr.includes('rejected')) badgeClass = 'badge-danger';
                else if (statusStr.includes('pending') || statusStr.includes('half')) badgeClass = 'badge-warning';
                
                td.innerHTML = `<span class="badge ${badgeClass}">${item[key]}</span>`;
            }
            else if (key === 'employee_name' || key === 'first_name') {
                const nameStr = key === 'employee_name' ? item[key] : `${item.first_name} ${item.last_name || ''}`.trim();
                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameStr)}&background=random&color=fff&bold=true`;
                td.innerHTML = `
                    <div class="emp-name-cell">
                        <img src="${avatarUrl}" class="emp-avatar" alt="Avatar">
                        <span>${item[key]}</span>
                    </div>
                `;
            } 
            else {
                td.textContent = item[key] !== null ? item[key] : '-'; 
            }
            row.appendChild(td);
        });

        if(currentEndpoint === 'employees') {
            const td = document.createElement('td');
            td.className = 'action-buttons';
            td.innerHTML = `
                <button class="btn-edit" onclick="editEmployee(${item.emp_id})" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="btn-delete" onclick="deleteEmployee(${item.emp_id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
            `;
            row.appendChild(td);
        }
        tableBody.appendChild(row);
    });
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.backgroundColor = isError ? '#ef4444' : '#0ea5e9'; 
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}

function exportToExcel() {
    if (!currentTableData || currentTableData.length === 0) {
        showToast('No data to export!', true);
        return;
    }
    const ws = XLSX.utils.json_to_sheet(currentTableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${currentEndpoint}_data.xlsx`);
    showToast('Excel downloaded successfully!', false);
}

function exportToPDF() {
    if (!currentTableData || currentTableData.length === 0) {
        showToast('No data to export!', true);
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`${currentEndpoint.toUpperCase()} DATA`, 14, 15);
    const headers = Object.keys(currentTableData[0]);
    const data = currentTableData.map(obj => Object.values(obj).map(val => {
        if(val === null) return '-';
        if(typeof val === 'string' && val.includes('T') && val.includes('Z')) return val.split('T')[0];
        return String(val);
    }));
    doc.autoTable({
        head: [headers.map(h => h.replace(/_/g, ' ').toUpperCase())],
        body: data,
        startY: 20,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [14, 165, 233] }
    });
    doc.save(`${currentEndpoint}_data.pdf`);
    showToast('PDF downloaded successfully!', false);
}

function openModal() {
    isEditMode = false;
    editEmployeeId = null;
    document.getElementById('modal-title').textContent = 'Add New Employee';
    document.getElementById('add-employee-form').reset();
    document.getElementById('employee-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('employee-modal').classList.add('hidden');
}

function editEmployee(id) {
    isEditMode = true;
    editEmployeeId = id;
    const employee = currentTableData.find(emp => emp.emp_id === id);
    if(!employee) return;
    document.getElementById('modal-title').textContent = 'Edit Employee';
    document.getElementById('first_name').value = employee.first_name || '';
    document.getElementById('last_name').value = employee.last_name || '';
    document.getElementById('email').value = employee.email || '';
    document.getElementById('phone').value = employee.phone || '';
    document.getElementById('department').value = employee.department || '';
    if(employee.hire_date) {
        document.getElementById('hire_date').value = new Date(employee.hire_date).toISOString().split('T')[0];
    } else { document.getElementById('hire_date').value = ''; }
    document.getElementById('basic_salary').value = employee.basic_salary || '';
    document.getElementById('employee-modal').classList.remove('hidden');
}

function deleteEmployee(id) {
    if(confirm('Are you sure you want to delete this employee?')) {
        fetch(`${apiUrl}/employees/${id}`, { method: 'DELETE' })
        .then(() => { showToast('Employee deleted successfully!', false); loadData('employees'); })
        .catch(error => console.error('Delete Error:', error));
    }
}

document.getElementById('add-employee-form').addEventListener('submit', function(e) {
    e.preventDefault(); 
    const employeeData = {
        first_name: document.getElementById('first_name').value.trim(),
        last_name: document.getElementById('last_name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        department: document.getElementById('department').value.trim(),
        hire_date: document.getElementById('hire_date').value,
        basic_salary: document.getElementById('basic_salary').value
    };
    const method = isEditMode ? 'PUT' : 'POST';
    const url = isEditMode ? `${apiUrl}/employees/${editEmployeeId}` : `${apiUrl}/employees`;
    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
    })
    .then(() => {
        showToast(isEditMode ? 'Employee updated!' : 'Employee added!', false);
        closeModal(); loadData('employees'); 
    });
});

function openLeaveModal() {
    document.getElementById('apply-leave-form').reset();
    document.getElementById('lv_start_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('leave-modal').classList.remove('hidden');
}
function closeLeaveModal() { document.getElementById('leave-modal').classList.add('hidden'); }

document.getElementById('apply-leave-form').addEventListener('submit', function(e) {
    e.preventDefault(); 
    const leaveData = {
        emp_id: document.getElementById('lv_emp_id').value,
        leave_type: document.getElementById('lv_type').value,
        start_date: document.getElementById('lv_start_date').value,
        end_date: document.getElementById('lv_end_date').value,
        status: document.getElementById('lv_status').value
    };
    fetch(`${apiUrl}/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveData)
    })
    .then(() => {
        showToast('Leave applied!', false);
        closeLeaveModal(); loadData('leaves'); 
    }).catch(() => showToast('Error applying leave.', true));
});

function openAdvanceModal() {
    document.getElementById('add-advance-form').reset();
    document.getElementById('adv_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('advance-modal').classList.remove('hidden');
}
function closeAdvanceModal() { document.getElementById('advance-modal').classList.add('hidden'); }

document.getElementById('add-advance-form').addEventListener('submit', function(e) {
    e.preventDefault();
    fetch(`${apiUrl}/advances`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            emp_id: document.getElementById('adv_emp_id').value,
            date: document.getElementById('adv_date').value,
            amount: document.getElementById('adv_amount').value
        })
    }).then(() => { showToast('Advance Added!', false); closeAdvanceModal(); });
});

function openAttendanceModal() {
    document.getElementById('add-attendance-form').reset();
    document.getElementById('att_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('attendance-modal').classList.remove('hidden');
}
function closeAttendanceModal() { document.getElementById('attendance-modal').classList.add('hidden'); }

document.getElementById('add-attendance-form').addEventListener('submit', function(e) {
    e.preventDefault(); 
    fetch(`${apiUrl}/attendance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            emp_id: document.getElementById('att_emp_id').value,
            date: document.getElementById('att_date').value,
            status: document.getElementById('att_status').value,
            ot_hours: document.getElementById('att_ot_hours').value
        })
    }).then(() => { showToast('Attendance marked!', false); closeAttendanceModal(); loadData('attendance'); });
});

function openPayrollModal() {
    document.getElementById('add-payroll-form').reset();
    const today = new Date();
    document.getElementById('pay_month_year').value = today.toISOString().slice(0, 7);
    document.getElementById('pay_date').value = today.toISOString().split('T')[0];
    document.getElementById('payroll-modal').classList.remove('hidden');
}
function closePayrollModal() { document.getElementById('payroll-modal').classList.add('hidden'); }

function fetchAutoSalaryData() {
    const empId = document.getElementById('pay_emp_id').value;
    const monthYear = document.getElementById('pay_month_year').value;
    if(!empId || !monthYear) return showToast('Enter Emp ID and Month first!', true);

    fetch(`${apiUrl}/api/calculate-salary`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emp_id: empId, month_year: monthYear })
    }).then(res => res.json()).then(data => {
        if(data.error) return showToast(data.error, true);
        
        document.getElementById('pay_basic').value = data.basic_salary;
        document.getElementById('pay_attended').value = data.attended_days;
        document.getElementById('pay_ot_hours').value = data.total_ot_hours;
        document.getElementById('pay_advances').value = data.total_advance;
        calculateFinalSalary();
        showToast('Data Fetched Successfully!', false);
    });
}

function calculateFinalSalary() {
    const basic = parseFloat(document.getElementById('pay_basic').value) || 0;
    const attended = parseInt(document.getElementById('pay_attended').value) || 0;
    const otHours = parseFloat(document.getElementById('pay_ot_hours').value) || 0;
    const otRate = parseFloat(document.getElementById('pay_ot_rate').value) || 0;
    const advances = parseFloat(document.getElementById('pay_advances').value) || 0;
    const deductions = parseFloat(document.getElementById('pay_deductions').value) || 0;

    const earnedBasic = (basic / 30) * attended;
    const otPay = otHours * otRate;
    const netSalary = (earnedBasic + otPay) - advances - deductions;
    document.getElementById('pay_net').value = netSalary.toFixed(2);
}

document.getElementById('add-payroll-form').addEventListener('submit', function(e) {
    e.preventDefault(); 
    fetch(`${apiUrl}/payroll`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            emp_id: document.getElementById('pay_emp_id').value,
            month_year: document.getElementById('pay_month_year').value,
            basic_salary: document.getElementById('pay_basic').value,
            attended_days: document.getElementById('pay_attended').value,
            ot_pay: (parseFloat(document.getElementById('pay_ot_hours').value) || 0) * (parseFloat(document.getElementById('pay_ot_rate').value) || 0),
            advances: document.getElementById('pay_advances').value,
            deductions: document.getElementById('pay_deductions').value,
            net_salary: document.getElementById('pay_net').value,
            payment_date: document.getElementById('pay_date').value
        })
    }).then(() => { showToast('Payroll generated successfully!', false); closePayrollModal(); loadData('payroll'); });
});

window.onload = () => {
    const firstBtn = document.querySelector('.sidebar button');
    loadData('employees', firstBtn);
};
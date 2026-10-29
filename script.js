const apiUrl = 'http://127.0.0.1:5000';
let currentEndpoint = 'employees'; 
let currentTableData = []; 
let currentFilteredData = [];
let isEditMode = false;
let editEmployeeId = null;
let activeCardIndex = 0; 

function getFormattedDate(dateStr) {
    if (!dateStr) return '';
    try { return new Date(dateStr).toISOString().split('T')[0]; } 
    catch(e) { return String(dateStr); }
}

function loadData(endpoint, buttonElement = null) {
    currentEndpoint = endpoint;
    activeCardIndex = 0; 
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
            currentFilteredData = data;
            updateDashboardAndButtons(data); 
            
            if(currentEndpoint !== 'time_attendance') {
                renderTable(data);
            } else {
                applyTimeAttendanceFilter(); 
            }
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

    let leaveBtn = document.getElementById('leave-btn');
    if(!leaveBtn) {
        leaveBtn = document.createElement('button');
        leaveBtn.id = 'leave-btn';
        leaveBtn.className = 'btn-secondary';
        leaveBtn.innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Apply Leave';
        leaveBtn.onclick = openLeaveModal;
        document.querySelector('.controls-bar > div:last-child').insertBefore(leaveBtn, mainButton);
    }
    leaveBtn.style.display = 'none';
    
    const dateFilterContainer = document.getElementById('date-filter-container');

    if (currentEndpoint === 'employees') {
        if(dateFilterContainer) { dateFilterContainer.classList.add('hidden'); dateFilterContainer.style.display = 'none'; }
        mainButton.innerHTML = '<i class="fa-solid fa-plus"></i> Add Employee';
        mainButton.onclick = openModal;
        mainButton.style.display = 'flex';
        
        document.getElementById('card-1-title').textContent = 'Total Employees';
        document.getElementById('card-1-value').textContent = data.length || 0;
        document.getElementById('icon-1').className = 'fa-solid fa-users';
        
        const departments = new Set(data.map(emp => emp.department).filter(dep => dep && dep.trim() !== ''));
        document.getElementById('card-2-title').textContent = 'Departments';
        document.getElementById('card-2-value').textContent = departments.size;
        document.getElementById('icon-2').className = 'fa-solid fa-building';
        
        const totalSalary = data.reduce((sum, emp) => sum + (parseFloat(emp.basic_salary) || 0), 0);
        document.getElementById('card-3-title').textContent = 'Total Monthly Salary';
        document.getElementById('card-3-value').textContent = 'Rs. ' + totalSalary.toLocaleString();
        document.getElementById('icon-3').className = 'fa-solid fa-money-bill-wave';
        
    } else if (currentEndpoint === 'time_attendance') {
        if(dateFilterContainer) {
            dateFilterContainer.classList.remove('hidden');
            dateFilterContainer.style.display = 'flex';
            if(!document.getElementById('filter-date').value) {
                document.getElementById('filter-date').value = new Date().toISOString().split('T')[0];
            }
        }
        
        mainButton.innerHTML = '<i class="fa-solid fa-clock"></i> Mark Attendance';
        mainButton.onclick = openAttendanceModal;
        mainButton.style.display = 'flex';
        leaveBtn.style.display = 'flex'; 
        
        document.getElementById('card-1-title').textContent = 'Present';
        document.getElementById('icon-1').className = 'fa-solid fa-user-check';

        document.getElementById('card-2-title').textContent = 'On Leave';
        document.getElementById('icon-2').className = 'fa-solid fa-user-minus';

        document.getElementById('card-3-title').textContent = 'Currently Out';
        document.getElementById('icon-3').className = 'fa-solid fa-person-walking-luggage';
        
    } else if (currentEndpoint === 'payroll') {
        if(dateFilterContainer) { dateFilterContainer.classList.add('hidden'); dateFilterContainer.style.display = 'none'; }
        mainButton.innerHTML = '<i class="fa-solid fa-file-invoice-dollar"></i> Generate Payroll';
        mainButton.onclick = openPayrollModal;
        mainButton.style.display = 'flex';
        advBtn.style.display = 'flex';
        
        document.getElementById('card-1-title').textContent = 'Total Payrolls';
        document.getElementById('card-1-value').textContent = data.length || 0;
        document.getElementById('icon-1').className = 'fa-solid fa-file-invoice';
        
        document.getElementById('card-2-title').textContent = '-';
        document.getElementById('card-2-value').textContent = '-';
        document.getElementById('icon-2').className = 'fa-solid fa-minus';
        
        document.getElementById('card-3-title').textContent = '-';
        document.getElementById('card-3-value').textContent = '-';
        document.getElementById('icon-3').className = 'fa-solid fa-minus';
    }
}

function applyTimeAttendanceFilter() {
    if(currentEndpoint !== 'time_attendance') return;
    const selectedDate = document.getElementById('filter-date').value;
    const dateData = currentTableData.filter(d => d.date && d.date.startsWith(selectedDate));
    
    const presentCount = dateData.filter(d => d.record_type === 'Attendance' && d.status === 'Present').length;
    const leaveCount = dateData.filter(d => d.record_type === 'Leave' && d.status === 'Approved').length;
    const outCount = dateData.filter(d => d.record_type === 'Attendance' && d.status === 'Out of Office').length;
    
    document.getElementById('card-1-value').textContent = presentCount;
    document.getElementById('card-2-value').textContent = leaveCount;
    document.getElementById('card-3-value').textContent = outCount;
    
    let filteredData = dateData;
    if (activeCardIndex === 1) {
        filteredData = dateData.filter(d => d.record_type === 'Attendance' && d.status === 'Present');
    } else if (activeCardIndex === 2) {
        filteredData = dateData.filter(d => d.record_type === 'Leave' && d.status === 'Approved');
    } else if (activeCardIndex === 3) {
        filteredData = dateData.filter(d => d.record_type === 'Attendance' && d.status === 'Out of Office');
    }
    
    for(let i=1; i<=3; i++) {
        const card = document.querySelectorAll('.dashboard-cards .card')[i-1];
        if(activeCardIndex === i) {
            card.style.borderColor = 'var(--primary-color)';
            card.style.transform = 'translateY(-3px)';
        } else {
            card.style.borderColor = 'var(--border-color)';
            card.style.transform = 'none';
        }
    }
    
    currentFilteredData = filteredData;
    renderTable(filteredData);
}

document.getElementById('filter-date').addEventListener('change', function() {
    if(currentEndpoint === 'time_attendance') {
        activeCardIndex = 0; 
        applyTimeAttendanceFilter();
    }
});

function filterByCard(cardIndex) {
    if(currentEndpoint !== 'time_attendance') return;
    
    if (activeCardIndex === cardIndex) {
        activeCardIndex = 0; 
    } else {
        activeCardIndex = cardIndex;
    }
    applyTimeAttendanceFilter();
}

document.getElementById('search-input').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    if(!currentTableData) return;
    
    let baseData = currentTableData;
    
    if (currentEndpoint === 'time_attendance') {
        const selectedDate = document.getElementById('filter-date').value;
        baseData = currentTableData.filter(d => d.date && d.date.startsWith(selectedDate));
        if (activeCardIndex === 1) baseData = baseData.filter(d => d.record_type === 'Attendance' && d.status === 'Present');
        else if (activeCardIndex === 2) baseData = baseData.filter(d => d.record_type === 'Leave' && d.status === 'Approved');
        else if (activeCardIndex === 3) baseData = baseData.filter(d => d.record_type === 'Attendance' && d.status === 'Out of Office');
    }
    
    const searchedData = baseData.filter(item => {
        return Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm));
    });
    
    currentFilteredData = searchedData;
    renderTable(searchedData);
});

function renderTable(data) {
    const tableHead = document.getElementById('table-head');
    const tableBody = document.getElementById('table-body');
    tableHead.innerHTML = ''; tableBody.innerHTML = '';

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="100%" style="text-align:center; padding: 30px; color: #94a3b8;">No matching data found</td></tr>';
        return;
    }

    let displayColumns = [];
    if (currentEndpoint === 'employees') {
        displayColumns = ['emp_id', 'first_name', 'department', 'designation', 'phone', 'employee_status'];
    } else if (currentEndpoint === 'time_attendance') {
        displayColumns = ['record_type', 'employee_name', 'date', 'status', 'details'];
    } else if (currentEndpoint === 'payroll') {
        displayColumns = ['payroll_id', 'employee_name', 'month_year', 'basic_salary', 'net_salary', 'payment_date'];
    } else {
        displayColumns = Object.keys(data[0]).filter(k => k !== 'profile_picture' && k !== 'cv_file');
    }

    const headerRow = document.createElement('tr');
    displayColumns.forEach(key => {
        const th = document.createElement('th');
        if (key === 'first_name') th.textContent = 'EMPLOYEE INFO';
        else th.textContent = key.replace(/_/g, ' ').toUpperCase(); 
        headerRow.appendChild(th);
    });
    
    if(currentEndpoint === 'employees') {
        const th = document.createElement('th'); th.textContent = 'ACTIONS'; headerRow.appendChild(th);
    }
    tableHead.appendChild(headerRow);

    data.forEach(item => {
        const row = document.createElement('tr');
        displayColumns.forEach(key => {
            const td = document.createElement('td');
            
            if(key === 'record_type') {
                const badgeClass = item[key] === 'Attendance' ? 'badge-info' : 'badge-warning';
                td.innerHTML = `<span class="badge ${badgeClass}" style="background-color: transparent; border: 1px solid currentColor;">${item[key]}</span>`;
            }
            else if((key === 'hire_date' || key === 'date' || key === 'record_date' || key === 'start_date' || key === 'end_date' || key === 'payment_date' || key === 'dob') && item[key]) {
                try { td.textContent = new Date(item[key]).toISOString().split('T')[0]; } 
                catch { td.textContent = item[key]; }
            } 
            else if (key === 'status' || key === 'employee_status') {
                let badgeClass = 'badge-info';
                const statusStr = String(item[key]).toLowerCase();
                if (statusStr.includes('present') || statusStr.includes('approved') || statusStr.includes('active')) badgeClass = 'badge-success';
                else if (statusStr.includes('absent') || statusStr.includes('rejected') || statusStr.includes('terminated')) badgeClass = 'badge-danger';
                else if (statusStr.includes('pending') || statusStr.includes('half') || statusStr.includes('resigned') || statusStr.includes('out of office')) badgeClass = 'badge-warning';
                td.innerHTML = `<span class="badge ${badgeClass}">${item[key]}</span>`;
            }
            else if (key === 'employee_name' || key === 'first_name') {
                const nameStr = key === 'employee_name' ? item[key] : `${item.first_name} ${item.last_name || ''}`.trim();
                const avatarUrl = (item.profile_picture) ? `${apiUrl}/uploads/profiles/${item.profile_picture}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(nameStr)}&background=random&color=fff&bold=true`;
                td.innerHTML = `
                    <div class="emp-name-cell">
                        <img src="${avatarUrl}" class="emp-avatar" alt="Avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(nameStr)}&background=random&color=fff&bold=true'">
                        <div>
                           <div style="font-weight: 500;">${nameStr}</div>
                           <div style="font-size: 12px; color: var(--text-muted);">${item.email || ''}</div>
                        </div>
                    </div>
                `;
            } 
            else { td.textContent = item[key] !== null ? item[key] : '-'; }
            row.appendChild(td);
        });

        if(currentEndpoint === 'employees') {
            const td = document.createElement('td');
            td.className = 'action-buttons';
            
            let cvButton = '';
            if(item.cv_file) {
                cvButton = `<a href="${apiUrl}/uploads/cvs/${item.cv_file}" target="_blank" class="btn-secondary" style="padding: 8px; border:none; margin-right:5px;" title="View CV"><i class="fa-solid fa-file-pdf"></i></a>`;
            }
            
            td.innerHTML = `
                ${cvButton}
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
    if (!currentFilteredData || currentFilteredData.length === 0) {
        showToast('No data to export!', true);
        return;
    }
    const ws = XLSX.utils.json_to_sheet(currentFilteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${currentEndpoint}_data.xlsx`);
    showToast('Excel downloaded successfully!', false);
}

function exportToPDF() {
    if (!currentFilteredData || currentFilteredData.length === 0) {
        showToast('No data to export!', true);
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`${currentEndpoint.toUpperCase()} DATA`, 14, 15);
    
    let exportColumns = [];
    if(currentEndpoint === 'employees') {
        exportColumns = ['emp_id', 'first_name', 'last_name', 'phone', 'department', 'designation', 'employee_status'];
    } else if (currentEndpoint === 'time_attendance') {
        exportColumns = ['record_type', 'employee_name', 'date', 'status', 'details'];
    } else {
        exportColumns = Object.keys(currentFilteredData[0]).filter(k => k !== 'profile_picture' && k !== 'cv_file');
    }

    const data = currentFilteredData.map(obj => {
        return exportColumns.map(key => {
            const val = obj[key];
            if(val === null) return '-';
            if(typeof val === 'string' && val.includes('T') && val.includes('Z')) return val.split('T')[0];
            return String(val);
        });
    });

    doc.autoTable({
        head: [exportColumns.map(h => h.replace(/_/g, ' ').toUpperCase())],
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
    
    const fields = ['first_name', 'last_name', 'email', 'phone', 'department', 'nic', 'gender', 'address', 'emergency_contact', 'designation', 'bank_name', 'bank_account', 'epf_number', 'employment_type', 'branch', 'reporting_manager', 'employee_status', 'blood_group', 'marital_status', 'basic_salary'];
    
    fields.forEach(field => {
        if(document.getElementById(field)) {
            document.getElementById(field).value = employee[field] || '';
        }
    });
    
    if(employee.hire_date) { document.getElementById('hire_date').value = new Date(employee.hire_date).toISOString().split('T')[0]; } else { document.getElementById('hire_date').value = ''; }
    if(employee.dob) { document.getElementById('dob').value = new Date(employee.dob).toISOString().split('T')[0]; } else { document.getElementById('dob').value = ''; }
    
    document.getElementById('profile_picture').value = '';
    document.getElementById('cv_file').value = '';
    
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
    
    const formData = new FormData();
    const fields = ['first_name', 'last_name', 'email', 'phone', 'department', 'hire_date', 'basic_salary', 'nic', 'gender', 'dob', 'address', 'emergency_contact', 'designation', 'bank_name', 'bank_account', 'epf_number', 'employment_type', 'branch', 'reporting_manager', 'employee_status', 'blood_group', 'marital_status'];
    
    fields.forEach(field => {
        formData.append(field, document.getElementById(field).value.trim());
    });
    
    const profilePic = document.getElementById('profile_picture').files[0];
    if(profilePic) formData.append('profile_picture', profilePic);
    
    const cvFile = document.getElementById('cv_file').files[0];
    if(cvFile) formData.append('cv_file', cvFile);

    const method = isEditMode ? 'PUT' : 'POST';
    const url = isEditMode ? `${apiUrl}/employees/${editEmployeeId}` : `${apiUrl}/employees`;
    
    fetch(url, {
        method: method,
        body: formData 
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
        closeLeaveModal(); 
        if(currentEndpoint === 'time_attendance') loadData('time_attendance');
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
            step_out_time: document.getElementById('att_step_out').value,
            return_time: document.getElementById('att_return').value,
            ot_hours: document.getElementById('att_ot_hours').value
        })
    }).then(() => { 
        showToast('Attendance marked!', false); 
        closeAttendanceModal(); 
        if(currentEndpoint === 'time_attendance') loadData('time_attendance');
    });
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
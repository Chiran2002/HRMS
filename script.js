const apiUrl = 'http://127.0.0.1:5000';

function loadData(endpoint) {
    const titleElement = document.getElementById('page-title');
    titleElement.textContent = endpoint.charAt(0).toUpperCase() + endpoint.slice(1) + ' Data';

    fetch(`${apiUrl}/${endpoint}`)
        .then(response => response.json())
        .then(data => {
            renderTable(data);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            alert('Error fetching data. Check console and ensure Backend is running.');
        });
}

function renderTable(data) {
    const tableHead = document.getElementById('table-head');
    const tableBody = document.getElementById('table-body');
    
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td>No data available</td></tr>';
        return;
    }

    // Generate Table Headers
    const headers = Object.keys(data[0]);
    const headerRow = document.createElement('tr');
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText.replace('_', ' ').toUpperCase();
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);

    // Generate Table Rows
    data.forEach(item => {
        const row = document.createElement('tr');
        headers.forEach(key => {
            const td = document.createElement('td');
            td.textContent = item[key];
            row.appendChild(td);
        });
        tableBody.appendChild(row);
    });
}

// Load employees data by default when page loads
window.onload = () => {
    loadData('employees');
};
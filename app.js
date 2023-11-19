// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC0FdQYiBl9aqBgTDoKjlVwFDXf4YAIDvA",
  authDomain: "dbcreate-8687b.firebaseapp.com",
  databaseURL: "https://dbcreate-8687b-default-rtdb.firebaseio.com",
  projectId: "dbcreate-8687b",
  storageBucket: "dbcreate-8687b.appspot.com",
  messagingSenderId: "781111082187",
  appId: "1:781111082187:web:991f9b970391afc5a92f4e",
  measurementId: "G-7WJ8E42D0K"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const jsPDF = window.jspdf.jsPDF;

function sanitizeKey(key) {
  return key.replace(/[\.\#\/\$\[\]]/g, '_').trim();
}




//function for import CSV file
function importCSV() {
  const fileInput = document.getElementById('csvFileInput');
  const file = fileInput.files[0];
  const errorMessageElement = document.getElementById('errorMessage');
  errorMessageElement.textContent = ''; // Clear previous error messages

  if (file) {
    const reader = new FileReader();
    reader.readAsText(file);

    reader.onload = function (e) {
      const csvData = e.target.result.split('\n');
      const headers = csvData[0].split(',');

      
      const sanitizedHeaders = headers.map(sanitizeKey);
      database.ref('columns').set(sanitizedHeaders);

      
      database.ref('students').remove();

      
      const tableHeaders = document.getElementById('studentTable').getElementsByTagName('thead')[0];
      tableHeaders.innerHTML = '';
      const headerRow = tableHeaders.insertRow();

      for (let i = 0; i < sanitizedHeaders.length; i++) {
        const cell = headerRow.insertCell();
        cell.textContent = sanitizedHeaders[i];
      }

      for (let i = 1; i < csvData.length; i++) {
        const rowData = csvData[i].split(',');

        
        if (rowData.length === sanitizedHeaders.length) {
          const studentData = {};

          for (let j = 0; j < sanitizedHeaders.length; j++) {
            const sanitizedKey = sanitizedHeaders[j];
            
            studentData[sanitizedKey] = rowData[j] !== undefined ? rowData[j].trim() : '';
          }

          
          if (Object.keys(studentData).every(key => key !== '')) {
            try {
              database.ref('students').push(studentData);
            } catch (error) {
              console.error('Error pushing data to Firebase:', error);
              console.log('Problematic key:', sanitizedKey);
            }
          } else {
            console.warn('Skipped a row due to missing or empty values:', rowData);
            continue; 
          }
        } else {
          console.warn('Skipped a row due to mismatched number of columns:', rowData);
          continue; 
        }
      }

      alert('CSV data imported successfully!');
      displayStudentRecords();
    };
  } else {
    alert('Please select a CSV file.');
  }
}


//function for display

function displayStudentRecords() {
  const tableBody = document.getElementById('tableBody');
  tableBody.innerHTML = '';

  
  database.ref('columns').once('value', function (snapshot) {
    const headers = snapshot.val();
    const headerRow = tableBody.insertRow();

    
    for (let i = 0; i < headers.length; i++) {
      const cell = headerRow.insertCell();
      cell.textContent = headers[i];
    }

    
    database.ref('students').on('value', function (snapshot) {
      snapshot.forEach(function (childSnapshot) {
        const student = childSnapshot.val();
        const row = tableBody.insertRow();
        row.id = childSnapshot.key; //row ID to the Firebase key

        for (let i = 0; i < headers.length; i++) {
          const cell = row.insertCell();
          cell.textContent = student[headers[i]];
        }

        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `<button onclick="editRecord('${childSnapshot.key}')">Edit</button> <button onclick="deleteRecord('${childSnapshot.key}')">Delete</button>`;
      });
    });
  });
}

function showEditForm() {
  const editForm = document.getElementById('editForm');
  editForm.style.display = 'block';
}

function saveEditedRecord() {
  const key = document.getElementById('editRecordKey').value;
  const recordRef = database.ref('students').child(key);

  
  const updatedRecord = {};
  database.ref('columns').once('value', function (snapshot) {
    const headers = snapshot.val();
    for (let i = 0; i < headers.length; i++) {
      updatedRecord[headers[i]] = document.getElementById(`edit${headers[i]}Input`).value;
    }

    
    recordRef.update(updatedRecord);

   
    displayStudentRecords();

    
    hideEditForm();

    alert('Record updated successfully!');
  });
}


function deleteRecord(key) {
  if (confirm('Are you sure you want to delete this record?')) {
    const recordRef = database.ref('students').child(key);
    recordRef.remove();

    
    displayStudentRecords();
    alert('Record deleted successfully!');
  }
}

function editRecord(key) {
  console.log('Editing record with key:', key);

  const recordRef = database.ref('students').child(key);

  recordRef.once('value', function (snapshot) {
    const student = snapshot.val();

    
    database.ref('columns').once('value', function (columnsSnapshot) {
      const headers = columnsSnapshot.val();

      
      const selectedRow = document.getElementById(key);

      if (selectedRow) {
        
        let editForm = document.getElementById(`editForm_${key}`);
        
        if (!editForm) {
          
          editForm = document.createElement('div');
          editForm.id = `editForm_${key}`;
          editForm.style.display = 'block';

          
          const hiddenInput = document.createElement('input');
          hiddenInput.type = 'hidden';
          hiddenInput.id = 'editRecordKey';
          hiddenInput.value = key;

          
          editForm.appendChild(hiddenInput);

          
          for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            const value = student[header];

            
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `edit${header}Input`;
            input.value = value;

           
            const label = document.createElement('label');
            label.htmlFor = `edit${header}Input`;
            label.textContent = `${header}:`;

            
            editForm.appendChild(label);
            editForm.appendChild(input);
          }

          // Save button
          const saveButton = document.createElement('button');
          saveButton.textContent = 'Save';
          saveButton.onclick = saveEditedRecord;
          editForm.appendChild(saveButton);

          editForm.appendChild(document.createTextNode(' '));

          // Cancel button
          const cancelButton = document.createElement('button');
          cancelButton.textContent = 'Cancel';
          cancelButton.onclick = function () {
            cancelEdit(key);
          };
          editForm.appendChild(cancelButton);

          
          selectedRow.parentNode.insertBefore(editForm, selectedRow.nextSibling);
        }

        
        showEditForm();
      } else {
        console.error('Selected row is null.');
      }
    });
  });
}


function cancelEdit(key) {
  hideEditForm(key);
  const editForm = document.getElementById(`editForm_${key}`);
  if (editForm) {
    editForm.parentNode.removeChild(editForm);
  }

  alert('Edit canceled.');
}


function hideEditForm(key) {
  const editForm = document.getElementById(`editForm_${key}`);
  if (editForm) {
    editForm.style.display = 'none';
  }
}
displayStudentRecords();

function exportToPDF() {
  const doc = new jsPDF();

  
  doc.text('Student Records', 10, 10);

  
  const table = document.getElementById('studentTable');
  const headers = table.getElementsByTagName('thead')[0].getElementsByTagName('td');
  const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');

  let yPosition = 20;

  
  for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i].textContent, 10 + i * 40, yPosition);
  }

  yPosition += 10;

  
  for (let i = 0; i < rows.length; i++) {
      const columns = rows[i].getElementsByTagName('td');

      for (let j = 0; j < columns.length; j++) {
          
          if (!columns[j].querySelector('button')) {
              doc.text(columns[j].textContent, 10 + j * 40, yPosition);
          }
      }

      yPosition += 10;

      
      if (yPosition >= doc.internal.pageSize.height) {
          doc.addPage();
          yPosition = 10;
      }
  }

  // Save the PDF
  doc.save('records.pdf');
}

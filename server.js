const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');


const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Replace with your MySQL username
    password: 'Abi13052005@', // Replace with your MySQL password
    database: 'user_db'
});

db.connect((err) => {
    if (err) throw err;
    console.log('MySQL connected...');
});

// Register endpoint

app.post('/register', (req, res) => {
    const { fullName, email, password, dob, gender, phone, address, category } = req.body;

    const query = 'INSERT INTO users (fullName, email, password, dob, gender, phone, address, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [fullName, email, password, dob, gender, phone, address, category], (err, result) => {
        if (err) {
            return res.status(500).send('Registration failed. Please try again.');
        }
        res.status(200).send('User registered successfully');
    });
});


// Login endpoint
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.query(query, [email, password], (err, result) => {
        if (err) {
            return res.status(500).send('Login failed. Please try again.');
        }
        if (result.length > 0) {
            res.status(200).send('Login successful');
        } else {
            res.status(401).send('Invalid email or password');
        }
    });
});

// Add new endpoints to server.js

// Get user by email
app.get('/api/user', (req, res) => {
    const email = req.query.email;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(result[0] || {});
    });
});
// Update user profile
app.put('/api/update-user', (req, res) => {
    const { fullName, email, dob, gender, phone, address, category } = req.body;
    db.query(
        `UPDATE users SET 
        fullName = ?, 
        dob = ?, 
        gender = ?, 
        phone = ?, 
        address = ?, 
        category = ? 
        WHERE email = ?`,
        [fullName, dob, gender, phone, address, category, email],
        (err) => {
            if (err) return res.status(500).json({ error: 'Update failed' });
            res.json({ message: 'Profile updated successfully' });
        }
    );
});

// POST: Save job to database
app.post('/api/jobs', (req, res) => {
    const jobData = req.body;

    // Function to format ISO date to MySQL DATETIME format
    const formatDateForMySQL = (isoDate) => {
        const date = new Date(isoDate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    // Format the dates to match MySQL's DATETIME format
    const startDate = formatDateForMySQL(jobData.startDate);
    const endDate = formatDateForMySQL(jobData.endDate);

    const query = `
        INSERT INTO jobs 
        (title, jobType, gender, contactNumber, salary, state, district, area, googleMapLink, vacancy, startDate, endDate, postedBy)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [
        jobData.title,
        jobData.jobType,
        jobData.gender,
        jobData.contactNumber,
        jobData.salary,
        jobData.state,
        jobData.district,
        jobData.area || null,         // Handle nullable fields
        jobData.googleMapLink || null, // Handle nullable fields
        jobData.vacancy,
        startDate,  // Formatted startDate
        endDate,    // Formatted endDate
        jobData.postedBy
    ], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to save job', details: err.sqlMessage || err.message });
        }
        res.json({ message: 'Job posted successfully', id: result.insertId });
    });
});




// GET: Fetch all active jobs
app.get('/api/jobs', (req, res) => {
    const query = `
        SELECT * FROM jobs 
        WHERE endDate > NOW()
        ORDER BY startDate DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch jobs' });
        res.json(results);
    });
});
// Get single job
app.get('/api/jobs/:id', (req, res) => {
    const jobId = req.params.id;
    db.query('SELECT * FROM jobs WHERE id = ?', [jobId], (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length === 0) return res.status(404).json({ error: 'Job not found' });
      res.json(results[0]);
    });
  });


// Date formatting function for MySQL DATETIME
const formatDateForMySQL = (date) => {
    const pad = (num) => (num < 10 ? '0' : '') + num;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};


// Route to get user applications
app.post('/api/applications', (req, res) => {
    const { jobId, userId, applicantName, age, gender, email, phone, address, qualification } = req.body;
    
    // Validate required fields
    if (!jobId || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const query = `
        INSERT INTO applications 
        (jobId, userId, applicantName, age, gender, email, phone, address, qualification, applicationDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    db.query(query, [jobId, userId, applicantName, age, gender, email, phone, address, qualification], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to submit application' });
        }
        res.json({ message: 'Application submitted successfully', id: result.insertId });
    });
});



// Route to get user applications
app.get('/api/applications', (req, res) => {
    const { userId, jobId } = req.query;

    db.query('SELECT * FROM applications WHERE userId = ? AND jobId = ?', [userId, jobId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// Route to update job vacancy
// server.js

// server.js
app.put('/api/jobs/:id/vacancy', (req, res) => {
    const jobId = req.params.id;

    // Decrement vacancy by 1 and prevent negative values
    db.query(
        'UPDATE jobs SET vacancy = GREATEST(vacancy - 1, 0) WHERE id = ?',
        [jobId],
        (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to update vacancy' });
            }
            res.json({ message: 'Vacancy updated successfully' });
        }
    );
});

// server.js
app.get('/api/jobs', (req, res) => {
    const searchQuery = req.query.search || '';
    const query = `
        SELECT * FROM jobs 
        WHERE endDate > NOW() 
        AND vacancy > 0  // Exclude jobs with 0 vacancies
        ORDER BY startDate DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch jobs' });
        res.json(results);
    });
});

// server.js

app.get('/api/applications', (req, res) => {
    const userId = req.query.userId;
    const query = `
        SELECT jobs.* 
        FROM applications
        INNER JOIN jobs ON applications.jobId = jobs.id
        WHERE applications.userId = ?
    `;
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});
// server.js
app.get('/api/jobs', (req, res) => {
    const query = `
        SELECT * FROM jobs WHERE endDate > NOW()
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});



app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
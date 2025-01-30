const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const bcrypt = require('bcrypt');

const pool = new Pool({
	user: process.env.PGUSER,
	host: process.env.PGHOST,
	database: process.env.PGDATABASE,
	password: process.env.PGPASSWORD,
	port: process.env.PGPORT,
	ssl: {
		rejectUnauthorized: false,
	},
});

// CRUD para Users
app.get('/api/users', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM users');
		res.json(result.rows);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Database error' });
	}
});

app.post('/api/users', async (req, res) => {
	const { name, email, phone_contact, type, password } = req.body;
	if (!name || !email || !phone_contact || !type || !password) {
		return res.status(400).json({ error: 'All fields are required' });
	}
	try {
		const hashedPassword = await bcrypt.hash(password, 10);
		const result = await pool.query(
			'INSERT INTO users (name, email, phone_contact, type, password) VALUES ($1, $2, $3, $4, $5) RETURNING *',
			[name, email, phone_contact, type, hashedPassword]
		);
		res.status(201).json(result.rows[0]);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ error: 'Database error', details: err.message });
	}
});

app.get('/api/users/barbers', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM users WHERE type = $1', ['barbeiro']);
		res.json(result.rows);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Database error' });
	}
});

app.post('/api/auth', async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ error: 'Senha e e-mail são obrigatórios' });
	}

	try {
		const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

		if (result.rows.length === 0) {
			return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
		}

		const user = result.rows[0];
		const isPasswordValid = await bcrypt.compare(password, user.password);

		if (!isPasswordValid) {
			return res.status(401).json({ error: 'Senha inválida.' });
		}

		res.status(200).json({
			authenticated: true,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				type: user.type
			}
		});
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ error: 'Database error', details: err.message });
	}
});



// CRUD para Services
app.get('/api/services', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM services');
		res.json(result.rows);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Database error' });
	}
});

app.post('/api/services', async (req, res) => {
	const { description, price, duration } = req.body;
	try {
		const result = await pool.query(
			'INSERT INTO services (description, price, duration) VALUES ($1, $2, $3) RETURNING *',
			[description, price, duration]
		);
		res.status(201).json(result.rows[0]);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Database error' });
	}
});

// CRUD para Appointments
app.get('/api/appointments', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM appointments');
		res.json(result.rows);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Database error' });
	}
});

app.get('/api/appointments/client/:id', async (req, res) => {
	const { id } = req.params;
	try {
		const result = await pool.query('SELECT * FROM appointments WHERE client_id = $1', [id]);
		res.json(result.rows);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Database error' });
	}
});

app.post('/api/appointments', async (req, res) => {
	const { client_id, barber_id, service_id, appointment_date, status, value } = req.body;
	try {
		const result = await pool.query(
			'INSERT INTO appointments (client_id, barber_id, service_id, appointment_date, status, value) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
			[client_id, barber_id, service_id, appointment_date, status, value]
		);
		res.status(201).json(result.rows[0]);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Database error' });
	}
});
app.post('/api/checkAppointmentAvailability', async (req, res) => {
	const { barber_id, appointment_date } = req.body;

	if (!barber_id || !appointment_date) {
		return res.status(400).json({ error: 'Barbeiro e data são obrigatórios' });
	}

	try {
		const result = await pool.query(
			'SELECT * FROM appointments WHERE barber_id = $1 AND appointment_date = $2',
			[barber_id, appointment_date]
		);

		if (result.rows.length > 0) {
			return res.status(409).json({
				available: false,
				message: 'Já existem atendimentos agendados para esse horário.'
			});
		}

		res.json({ available: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Database error' });
	}
});
// CRUD para Earnings
app.get('/api/earnings', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM earnings');
		res.json(result.rows);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Database error' });
	}
});

app.get('/api/earnings/barber/:id', async (req, res) => {
	const { id } = req.params;
	try {
		const result = await pool.query('SELECT * FROM earnings WHERE barber_id = $1', [id]);
		res.json(result.rows);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Database error' });
	}
});

app.post('/api/earnings', async (req, res) => {
	const { barber_id, earning_date, value, scheduling_id } = req.body;
	try {
		const result = await pool.query(
			'INSERT INTO earnings (barber_id, earning_date, value, scheduling_id) VALUES ($1, $2, $3, $4) RETURNING *',
			[barber_id, earning_date, value, scheduling_id]
		);
		res.status(201).json(result.rows[0]);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Database error' });
	}
});

app.get('/api/test-connection', async (req, res) => {
	try {
		const result = await pool.query('SELECT NOW()');
		res.json(result.rows[0]);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ error: 'Connection error', details: err.message });
	}
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
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
app.get('/api/users', async(req, res) => {
	try {
		const result = await pool.query('SELECT * from users');
		res.json(result);
	} catch (error) {
		console.error(error)
	}
});

app.get('/api/barbers', async (req, res) => {
	try{
		const result = await pool.query('SELECT * from users WHERE type = "barbeiro"');
		res.json(result);
	} catch (error){
		console.error(error);
	}
})

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
			return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
		}

		res.status(200).json({ authenticated: true });
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ error: 'Database error', details: err.message });
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


const express = require('express');
const cors = require('cors');
const pgp = require('pg-promise')();
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const db = pgp({
	user: process.env.PGUSER,
	host: process.env.PGHOST,
	database: process.env.PGDATABASE,
	password: process.env.PGPASSWORD,
	port: process.env.PGPORT,
});

app.post('/api/users', async (req, res) => {
	const { name, email } = req.body;
	try {
		const result = await db.one('INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *', [name, email]);
		res.status(201).json(result);
	} catch (err) {
		console.error('Erro ao conectar:', err.message);
		res.status(500).json({ error: 'Database error', details: err.message });
	}
});

// Teste de conexão
app.get('/api/test-connection', async (req, res) => {
	try {
		const result = await db.one('SELECT NOW()');
		res.json(result);
	} catch (err) {
		console.error('Erro ao conectar:', err.message);
		res.status(500).json({ error: 'Connection error', details: err.message });
	}
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});

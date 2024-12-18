const path = require('path');
const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const filePath = path.join(__dirname, process.env.ENTRIES_FOLDER, 'entries.txt');

const app = express();

app.use(bodyParser.json());

const extractAndVerifyToken = async (headers) => {
  if (!headers.authorization) {
    throw new Error('No token provided.');
  }
  const token = headers.authorization.split(' ')[1]; // expects Bearer TOKEN

  const response = await axios.get(`http://${process.env.AUTH_ADDRESS}:81/verify-token/` + token);
  return response.data.uid;
};

app.get('/entries', async (req, res) => {
  try {
    const uid = await extractAndVerifyToken(req.headers); // we don't really need the uid
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: 'Loading the entries failed.' });
      }
      const strData = data.toString();
      const rawEntries = strData.split('ENTRY_SPLIT');
      rawEntries.pop(); // remove last, empty entry
      const entries = rawEntries.map((json) => JSON.parse(json));
      res.status(200).json({ message: 'Entries loaded.', entries: entries });
    });
  } catch (err) {
    console.log(err);
    return res.status(401).json({ message: err.message || 'Failed to load entries.' });
  }
});

app.post('/entries', async (req, res) => {
  try {
    const uid = await extractAndVerifyToken(req.headers); // we don't really need the uid
    const text = req.body.text;
    const title = req.body.title;
    const entry = { title, text };
    const jsonEntry = JSON.stringify(entry);
    fs.appendFile(filePath, jsonEntry + 'ENTRY_SPLIT', (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: 'Storing the entry failed.' });
      }
      res.status(201).json({ message: 'Entry stored.', createdEntry: entry });
    });
  } catch (err) {
    return res.status(401).json({ message: 'Could not verify token.' });
  }
});

app.listen(8000);

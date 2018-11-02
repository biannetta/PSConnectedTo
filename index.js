require('dotenv').config();

const Express = require('express');
const bodyParser = require('body-parser');
const connectedTo = require('./connectedto');
const axios = require('axios');

const {SLACK_TOKEN: appToken, PORT: port, SPREADSHEET_ID:spreadsheetID} = process.env;
const app = new Express();

app.use(bodyParser.urlencoded({extended: true}));

app.post('/', (req, res) => {
  const {token, response_url} = req.body;
  if (token != appToken) {
    return res.json({
      color: 'error',
      text: 'Invalid Credentials. Seek Admin Help'
    });
  }

  const controller = connectedTo(spreadsheetID);
  controller(req.body)
  .then((message) => {
    axios.post(response_url, message)
    .catch((err) => {
      console.log(err);
    });
  })
  .catch((err) => {
    console.log(err);
  });

  return res.json();
});

app.listen(port, () => {
  console.log(`Listening on Port ${port}`);
});
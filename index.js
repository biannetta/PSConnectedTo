const Express = require('express');
const bodyParser = require('body-parser');
const connectedTo = require('./connectedto');

const {SLACK_TOKEN: token, PORT: port} = process.env;
const spreadsheetID = '177RJ69AnNhluzkbZCrzfgIN2-Qjt2yGRQvn7ipweun0';
const app = new Express();

app.use(bodyParser.urlencoded({extended: true}));

app.post('/', (req, res) => {
  if (req.body.token != token) {
    return res.json({
      color: 'error',
      text: 'Invalid Credentials. Seek Admin Help'
    });
  }

  const controller = connectedTo(spreadsheetID);
  controller(req.body).then((value) => {
    res.json({
      response_type: 'ephemeral',
      text: value.text,
      attachments: [{
        text: value.body,
        color: value.color
      }]
    });
  });

  return;
});

app.listen(port, () => {
  console.log(`Listening on Port ${port}`);
})
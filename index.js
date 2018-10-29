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
  switch(req.body.text) {
    case "HELP":
      return res.json(controller.DisplayInstructions());
      break;
    case "":
      return res.json(controller.DisplayInstructions());
      break;
    case "WHOIS":
      return res.json(controller.DisplayConnections());
      break;
    case "DISCONNECT":
      return res.json('Not implemented');
      // message = ClearConnection(username);
      break;
    case "CLEAR":
      return res.json('Not implemented');
      // message = ClearConnection(username);
      break;
    default:
      if (req.body.text.length == 2) {
        return res.json('Not implemented');
        // message = ConnectUser(username, args[0] + "/" + args[1]);
      } else {
        return res.json('Not implemented');
        // message = ConnectUser(username, args[0]);
      }
      break;
  }  
});

app.listen(port, () => {
  console.log(`Listening on Port ${port}`);
})
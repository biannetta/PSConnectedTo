const Express = require('express');
const bodyParser = require('body-parser');
const {SLACK_TOKEN: token, PORT: port} = process.env;

/**
* Display Help Message for Connected command
* @return: String
*/
const DisplayInstructions = () => {
  var message = "A Command to manage and update Connection Spreadsheet";
 
  // Display all available commands
  message += "\n• `/connect <Connection Name>` Marks you as connected to `<Connection Name>`";
  message += "\n• `/connect whois` Display a list of all currently connected users";
  message += "\n• `/connect disconnect` Disconnects you from your current connection and notifies anyone waiting";
  message += "\n• `/connect clear` Clear all current connections and waiting";
 
  return {
    color: 'good',
    text: message
  };
}

const app = new Express();
app.use(bodyParser.urlencoded({extended: true}));
app.post('/', (req, res) => {
  if (req.body.token != token) {
    return res.json({
      color: 'error',
      text: 'Invalid Credentials. Seek Admin Help'
    });
  }

  switch(req.body.text) {
    case "HELP":
      return res.json(DisplayInstructions());
      break;
    case "":
      return res.json(DisplayInstructions());
      break;
    case "WHOIS":
      return res.json('Not implemented');
      // message = DisplayConnections();
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
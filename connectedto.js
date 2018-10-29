/**
 * Connected To 
 * Code to allow users to connect/disconnect from the RDP spreadsheet
 */
const {google} = require('googleapis');
const auth = require('./authenticate');

// Data Column Constants
const _USERNAME_ = 0;
const _CONNECTION_ = 1;
const _WAITING_ = 2;
const _CONNECTION_TIME_ = 3;

function sendMessageToChannel(message, channel) {
  var payload = {
    "attachments":[{
      "text": message.text,
      "mrkdwn_in": ["text","pretext"],
      "color": message.color
    }]
  };

  return payload;
}

/**
 * Return the row number of passed in username from the connection sheet
 * @param: username
 * @return: Data array
 */
function getUserConnectionData (username) {
  var users = sheet.getRangeByName("users").getValues();
  var data = [];
  
  for(i in users) {
    if (users[i][0].toUpperCase() == username.toUpperCase()) {
      data = sheet.getSheetValues(Number(i), 1, 1, 4);
      break;
    }
  }
  return data;
}

/**
 * Return the username of the passed in connection
 * @param: connection
 * @return: username
 */
function whoIsConnectedTo (connection) {
  var connections = sheet.getRangeByName("connections").getValues();
  var data;
  
  for(i in connections) {
    if (connections[i][0].toUpperCase() == connection.toUpperCase()) {
      data = sheet.getSheetValues(Number(i), 1, 1, 4);
      break;
    }
  }
  
  if (data.length > 0) {
    return data[0][_USERNAME_];
  } else {
    return "";
  }  
}

/**
 * Display Help Message for Connected command
 * @return: String
 */
const DisplayInstructions = () => new Promise ((resolve, reject) => {
  var message = '';
  
  // Display all available commands
  message += "`/connect <Connection Name>` Marks you as connected to `<Connection Name>`";
  message += "\n `/connect whois` Display a list of all currently connected users";
  message += "\n `/connect disconnect` Disconnects you from your current connection and notifies anyone waiting";
  message += "\n `/connect clear` Clear all current connections and waiting";

  resolve({
    text: 'Command to manage and update Connection Spreadsheet',
    color: 'good',
    body: message
  });
});

/**
 * Display List of Users Connected in Sheet
 * @param
 * @return
 */
const DisplayConnections = (spreadsheetID, auth) => new Promise((resolve, reject) => {
  const sheets = google.sheets({version: 'v4', auth});
  var message = '';

  sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetID,
    range: 'Sheet1!A1:D'
  }, (err, results) => {
    if (err) resolve({ color: 'danger', text: `ERROR: Couldn't reach Google API`});
    
    const rows = results.data.values;
    if (rows.length == 0) resolve({ color: 'good', text: '*No one is currently connected*'});

    rows.map((row) => {
      if (row[_CONNECTION_] != undefined && row[_CONNECTION_] != '') {
        message += `\n @${row[_USERNAME_]} is connected to *${row[_CONNECTION_]}*`;
        if (row[_WAITING_] != undefined && row[_WAITING_] != '') {
          message += ` and @${row[_WAITING_]} is waiting`; 
        }
      }
    });
    resolve({ text: 'Currently Connected Users', color: 'good', body: message});
  });
});

/**
 * Clear User Connection Data and Notify any users waiting in queue
 * @param: Username
 * @return
 */
function ClearConnection (username) {
  var data;
  var connection;
  
  data = getUserConnectionData(username);
  if (data.length > 0) {
    connection = data[0][_CONNECTION_];
    if (connection == "") {
      return "You are not connected to anyone";
    } else {
      // clear sheet values
      // sheet.getRangeByName('connections').getCell(nR + 1,1).setValue("");
      // sheet.getRangeByName('connected_at').getCell(nR + 1,1).setValue("");
      
      if (data[0][_WAITING_] != "") {
        //send message to data[0][_WAITING_]
        sendMessageToChannel(data[0][_USERNAME_] + " is now disconnected from " + connection, '@' + data[0][_WAITING_]);
      }
      return "Now disconnected from " + connection;
    }
  } else {
    return "You are not connected to anyone";
  }
}

/**
 * Connect User to Connection
 * @param: Username, Connection
 * @return
 */
function ConnectUser (username, connection) {
  var data;
  
  data = getUserConnectionData(username);
  if (data.length > 0) {
    user = whoIsConnectedTo(connection);
    if (user == "") {
      // no one connected, update sheet
      
    } else {
      if (data[0][_USERNAME_].toString() == username) {
        return "You are already connected to " + connection;
      } else {
        return user + " is currently connected to " + connection;
      }
    }
  } else {
    // add username to connected sheet (probably new slack user)
  }
  
  return "Now Connected to " + connection;
}

const connectedToFactory = (spreadsheetID) => (body) => new Promise((resolve, reject) => {
  const {user_name, command, text, response_url} = body;
  const args = text.split(/[^A-Za-z]/);

  switch(args[0].toLowerCase()) {
    case "help":
      DisplayInstructions().then((message) => {
        resolve(message);
      });
      break;
    case "":
      DisplayInstructions().then((message) => {
        resolve(message);
      });
      break;
    case "whois":
      auth.authenticate().then((auth) => {
        DisplayConnections(spreadsheetID, auth).then((message) => {
          resolve(message);
        });
      });
      break;
    case "disconnect":
      // message = ClearConnection(username);
      break;
    case "clear":
      // message = ClearConnection(username);
      break;
    default:
      if (text.length == 2) {
        // message = ConnectUser(username, args[0] + "/" + args[1]);
      } else {
        // message = ConnectUser(username, args[0]);
      }
      break;
  }
});

module.exports = connectedToFactory;
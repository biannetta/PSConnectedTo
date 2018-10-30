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
function _whoIsConnectedTo (data, connection) {
  if (data.length == 0) return '';

  let user = '';
  data.map((row) => {
    if (row[_CONNECTION_] != undefined && row[_CONNECTION_] === connection) {
      user = row[_USERNAME_];
    }
  });

  return user;
}

/**
 * Display Help Message for Connected command
 * @return: Promise
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
 * @param SpreadsheetID
 * @param GoogleAuth
 * @return Promise
 */
const DisplayConnections = (spreadsheetID, auth) => new Promise((resolve, reject) => {
  const sheets = google.sheets({version: 'v4', auth});
  var message = '';

  sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetID,
    range: 'Sheet1!A1:D'
  }, (err, results) => {
    if (err) resolve({ text: 'Currently Connected Users', color: 'danger', body: `ERROR: Couldn't reach Google API`});
    
    const rows = results.data.values;
    if (rows.length == 0) resolve({ text: 'Currently Connected Users', color: 'good', body: '*No one is currently connected*'});

    rows.map((row) => {
      if (row[_CONNECTION_] != undefined && row[_CONNECTION_] != '') {
        message += `\n @${row[_USERNAME_]} is connected to *${row[_CONNECTION_]}*`;
        if (row[_WAITING_] != undefined && row[_WAITING_] != '') {
          message += ` and @${row[_WAITING_]} is waiting`; 
        }
      }
    });

    message = (message == '') ? '*No one is currently connected*' : message;  
    resolve({ text: 'Currently Connected Users', color: 'good', body: message});
  });
});

/**
 * Clear User Connection Data and Notify any users waiting in queue
 * @param: Username
 * @return
 */
const ClearConnection = (spreadsheetID, auth, username) => new Promise((resolve, reject) => {

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
});

/**
 * Check the spreadsheet for the current connection
 * @param {String} spreadsheetID 
 * @param {Object} auth 
 * @param {String} username 
 * @param {String} connection 
 */
const CheckConnections = (spreadsheetID, auth, username, connection) => new Promise((resolve, reject) => {
  const sheets = google.sheets({version: 'v4', auth});

  sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetID,
    range: 'Sheet1!A1:D'
  }, (err, results) => {
    if (err) reject({ message: 'Could not access Google API', error: err});

    const rows = results.data.values;
    if (rows.length > 0) {
      let user = '';
      let rowID = -1;
      rows.map((row, index) => {
        if (row[_CONNECTION_] != undefined && row[_CONNECTION_] === connection) {
          user = row[_USERNAME_];
          rowID = Number(index);
        }
      });
      resolve({ value: user, rowId: rowID});
    }
    resolve({ value: '', rowId: -1});
  });
});
/**
 * Connect User to Connection
 * @param: Username, Connection
 * @return
 */
const ConnectUser = (spreadsheetID, auth, username, connection) => new Promise((resolve, reject) => {
  const sheets = google.sheets({version: 'v4', auth});

  sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetID,
    range: 'Sheet1!A1:D'
  }, (err, results) => {
    if (err) resolve({ color: 'danger', body: `ERROR: Couldn't reach Google API`});

    const rows = results.data.values;
    if (rows.length > 0) {
      let user = _whoIsConnectedTo(rows, connection);
      if (user === '') {
        // no one connected, update sheet
      } else {
        if (user === username) {
          resolve({ color: 'good', body: `You are already connected to ${connection}`});
        } else {
          resolve({ color: 'good', body: `${user} is currently connected to ${connection}`});
        }
      }
    }
    // add username to connected sheet (probably new slack user)
    resolve({ color: 'good', body: `Now Connected to ${connection}`});
  });
});

const connectedToFactory = (spreadsheetID) => (body) => new Promise((resolve, reject) => {
  const {user_name, text, response_url} = body;
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
      let connection = args[0];
      if (args.length == 2) connection = args[0] + "/" + args[1];
      
      auth.authenticate().then((auth) => {
        CheckConnections(spreadsheetID, auth, user_name, connection).then((user) =>{

        })
        ConnectUser(spreadsheetID, auth, user_name, connection).then((message) => {
          console.log(message);
          resolve(message);
        });
      });
      break;
  }
});

auth.authenticate().then((auth) => {
  CheckConnections('177RJ69AnNhluzkbZCrzfgIN2-Qjt2yGRQvn7ipweun0',auth,'biannetta','test').then((user) => {
    console.log(user);
  }).catch((err) => {
    console.log(err.message);
  })
})

module.exports = connectedToFactory;
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

/**
 * format a more complex message for slack
 */
function _complexMessage(message) {
  return {
    text: message.header,
    attachments:[{
      text: message.value,
      mrkdwn_in: ["text","pretext"],
      color: message.color
    }]
  }
}

/**
 * Return a simple message for slack
 * @param {Object} data 
 */
function _simpleMessage(data) {
  return {
    'text': data
  }
}

function _errorMessage(data) {
  return {
    text: 'PSConnectedTo ERROR',
    attachments:[{
      text: data.message,
      mrkdwn_in: ["text","pretext"],
      color: 'danger'
    }]   
  }
}

/**
 * Display Help Message for Connected command
 */
const DisplayInstructions = () => {
  let message = 'Manage the Connected To Spreadsheet from Slack';
  
  message += "\n `/connect <Connection Name>` Marks you as connected to `<Connection Name>`";
  message += "\n `/connect whois` Display a list of all currently connected users";
  message += "\n `/connect disconnect` Disconnects you from your current connection and notifies anyone waiting";
  message += "\n `/connect clear` Clear all current connections and waiting";

  return _simpleMessage(message);
}

/**
 * Get array of connected users in spreadsheet 
 * @param {String} spreadsheetID 
 * @param {Object} auth 
 */
const DisplayConnections = (spreadsheetID, auth) => new Promise((resolve, reject) => {
  const sheets = google.sheets({version: 'v4', auth});
  let data = [];

  sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetID,
    range: 'Sheet1!A1:D'
  }, (err, results) => {
    if (err) reject({ text: 'Currently Connected Users', body: `ERROR: Couldn't reach Google API`, error: err});
    
    const rows = results.data.values;
    if (rows.length == 0) resolve(data);

    rows.map((row) => {
      if (row[_CONNECTION_] != undefined && row[_CONNECTION_] != '') {
        data.push(row);
      }
    });

    resolve(data);
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
 * @param {String} connection 
 */
const CheckConnections = (spreadsheetID, auth, connection) => new Promise((resolve, reject) => {
  const sheets = google.sheets({version: 'v4', auth});

  sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetID,
    range: 'Sheet1!A1:D'
  }, (err, results) => {
    if (err) reject({ message: 'Could not access Google API', error: err});

    let data = [];
    const rows = results.data.values;

    if (rows.length > 0) {
      rows.map((row, index) => {
        if (row[_CONNECTION_] != undefined && row[_CONNECTION_].toLowerCase() === connection.toLowerCase()) {
          data = row;
        }
      });
    }
    resolve(data);
  });
});

/**
 * Add connection row to spreadsheet
 * @param {String} spreadsheetID 
 * @param {Object} auth 
 * @param {String} username 
 * @param {String} connection 
 */
const ConnectUser = (spreadsheetID, auth, username, connection) => new Promise((resolve, reject) => {
  const sheets = google.sheets({version: 'v4', auth});

  sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetID,
    range: 'Sheet1',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [
        [username, connection]
      ]
    }
  }, (err, results) => {
    if (err) reject({ message: `Could not reach Google API`, error: err.message});

    resolve(`Now Connected to ${connection}`);
  });
});

const connectedToFactory = (spreadsheetID) => (body) => new Promise((resolve, reject) => {
  const {user_name, text} = body;
  const args = text.split(/[^A-Za-z]/);

  auth.authenticate().then((auth) => {
    switch(args[0].toLowerCase()) {
      case "help":
        resolve(DisplayInstructions());
        break;
      case "":
        resolve(DisplayInstructions());
        break;
      case "whois":
        DisplayConnections(spreadsheetID, auth).then((connections) => {
          let message = '';
          if (connections.length > 0) {
            connections.map((connection) => {
              message += `${connection[_USERNAME_]} is connected to *${connection[_CONNECTION_]}*`
            });
          } else {
            message = 'No one is currently connected to anyone';
          }
          resolve(_complexMessage({header: 'Who is currently connected', color: 'good', value: message}));
        });
        break;
      case "disconnect":
        // message = ClearConnection(username);
        break;
      case "clear":
        // message = ClearConnection(username);
        break;
      default:
        let connection = (args.length == 2) ? args[0] + "/" + args[1] : args[0];
        
        CheckConnections(spreadsheetID, auth, connection).then((data) => {
          if (data.length == 0) {
            // no one connect, freely connect user
            ConnectUser(spreadsheetID,auth,user_name,connection).then((message) => {
              resolve(_simpleMessage(message));
            }).catch((error) => {
              console.log(error.error);
              resolve(_errorMessage(error));
            })
          } else {
            // someone is currently connected
            resolve(_simpleMessage(`${data[_USERNAME_]} is already connected to *${connection}*`));
          }
        }).catch((error) => {
          console.log(error.error);
          resolve(_errorMessage(error));
        });
        break;
    }
  })
  .catch((err) => console.log(error.error));
});

module.exports = connectedToFactory;
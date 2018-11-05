/**
 * Connected To 
 * Code to allow users to connect/disconnect from the RDP spreadsheet
 */
const {google} = require('googleapis');
const auth = require('./authenticate');
const axios = require('axios');

// Data Column Constants
const _USERNAME_ = 0;
const _CONNECTION_ = 1;
const _CONNECTION_TIME_ = 2;
const _WAITING_ = 3;

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
    text: data
  }
}

function _errorMessage(error) {
  return {
    text: 'PSConnectedTo ERROR',
    attachments:[{
      text: error,
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
    range: 'Sheet2!A1:D'
  }, (err, results) => {
    if (err) reject({ success: false, value: err.message});
    
    const rows = results.data.values;
    if (!rows || rows.length == 0) {
      resolve(data);
    } else {
      rows.map((row) => {
        if (row[_CONNECTION_] != undefined && row[_CONNECTION_] != '') {
          data.push(row);
        }
      });
      resolve({success: true, value: data});
    }
  });
});

/**
 * Get the Row of Data for the passed in Username
 * @param {String} spreadsheetID 
 * @param {Object} auth 
 * @param {String} username 
 */
const GetConnectionInfo = (spreadsheetID, auth, username) => new Promise((resolve, reject) => {
  const sheets = google.sheets({version: 'v4', auth});
  
  sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetID,
    range: 'Sheet2!A1:D'
  }, (err, results) => {
    if (err) reject({ success: false, value: err.message});

    const rows = results.data.values;
    let res = {
      index: 0,
      data: []
    };

    if (rows && rows.length > 0) {
      rows.map((row, index) => {
        if (row[_USERNAME_].toLowerCase() === username.toLowerCase()) {
          res.data = row;
          res.index = index + 1;
        }
      });
    }
    resolve({ success: true, value: res});
  });

});

/**
 * Clear User Connection Data and Notify any users waiting in queue
 * @param {String} spreadsheetID 
 * @param {Object} auth 
 * @param {Obejct} row 
 */
const ClearConnection = (spreadsheetID, auth, row) => new Promise((resolve, reject) => {
  const sheets = google.sheets({version: 'v4', auth});
  const range = `Sheet2!B${row.index}:D${row.index}`;

  sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetID,
    valueInputOption: 'USER_ENTERED',
    range: range,
    resource: {
      values: [
        ['','','']
      ]
    }
  }, (err, results) => {
    if (err) reject({ success: false, value: err.message});
    
    resolve({success: true, value: []});
  });
});

/**
 * Update spreadsheet with array of values at given index
 * @param {String} spreadsheetID 
 * @param {Object} auth 
 * @param {Number} index 
 * @param {Array} values 
 */
const UpdateConnection = (spreadsheetID, auth, index, values) => new Promise((resolve, reject) => {
  const sheets = google.sheets({version: 'v4', auth});
  const range = `Sheet2!B${index}:D${index}`;

  sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetID,
    valueInputOption: 'USER_ENTERED',
    range: range,
    resource: {
      values: [values]
    }
  }, (err, results) => {
    if (err) reject({ success: false, value: err.message});
    
    resolve({success: true, value: values});
  });
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
    range: 'Sheet2!A1:D'
  }, (err, results) => {
    if (err) reject({ success: false, value: err.message});

    let data = [];
    const rows = results.data.values;

    if (rows && rows.length > 0) {
      rows.map((row, index) => {
        if (row[_CONNECTION_] != undefined && row[_CONNECTION_].toLowerCase() === connection.toLowerCase()) {
          data = row;
        }
      });
    }
    resolve({ success: true, value: data});
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
  const data = [username, connection.toLocaleLowerCase(), Date.now()];

  sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetID,
    range: 'Sheet2',
    valueInputOption: 'USER_ENTERED',
    resource: { values: [data] }
  }, (err, results) => {
    if (err) return reject({ success: false, value: err.message});

    resolve({ success: true, value: data});
  });
});

/**
 * 
 * @param {String} spreadsheetID 
 */
const connectedToFactory = (spreadsheetID) => (body) => new Promise((resolve, reject) => {
  const {user_id, text} = body;
  const args = text.split(/[^A-Za-z]/);

  auth.authenticate().then((auth) => {
    switch(args[0].toLowerCase()) {
      case "help":
      case "":
        resolve(DisplayInstructions());
        break;
      case "whois":
        DisplayConnections(spreadsheetID, auth).then((response) => {
          let message = '';
          let connections = response.value;

          if (connections && connections.length > 0) {
            connections.map((connection) => {
              message += `\n<@${connection[_USERNAME_]}> is connected to *${connection[_CONNECTION_]}*`
            });
          } else {
            message = 'No one is currently connected to anyone';
          }
          resolve(_complexMessage({header: 'Who is currently connected', color: 'good', value: message}));
        }).catch((err) => {
          resolve(_errorMessage(err.value));
        });
        break;
      case "disconnect":
      case "clear":
        GetConnectionInfo(spreadsheetID, auth, user_id).then((result) => {
          let connection = result.value;
          if (connection.index > -1) {
            ClearConnection(spreadsheetID, auth, connection).then((status) => {
              if (status.success) {
                let message = `Now disconnected from *${connection.data[_CONNECTION_]}*`;
                resolve(_simpleMessage(message));
              }
            })
            .catch((error) => resolve(_errorMessage(error.value)));
            // Notify anyone waiting for connection
            if (connection.data[_WAITING_] !== '' && connection.data[_WAITING_] !== undefined) {
              console.log(`${connection.data[_WAITING_]} can connect to ${connection.data[_CONNECTION_]}`);
            }
          } else {
            resolve(_simpleMessage(`You are not currently connected to anyone`));
          }
        }).catch((error) => resolve(_errorMessage(error.value)));
        break;
      default:
        let connection = (args.length == 2) ? args[0] + "/" + args[1] : args[0];
        
        CheckConnections(spreadsheetID, auth, connection).then((result) => {
          let data = result.value;
          if (data.length == 0) {
            GetConnectionInfo(spreadsheetID, auth, user_id).then((result) => {
              let row = result.value;
              if (row.index == 0) {
                // No user row found
                ConnectUser(spreadsheetID, auth, user_id, connection).then((data) => {
                  let message = `You are now connected to *${data.value[_CONNECTION_]}*`;
                  resolve(_simpleMessage(message));
                }).catch((error) => resolve(_errorMessage(error.value)));
              } else {
                UpdateConnection(spreadsheetID, auth, row.index, [connection, Date.now(),'']).then((result) => {
                  resolve(_simpleMessage(`You are now connected to ${connection}`));
                }).catch((error) => resolve(_errorMessage(error.value)));
              }
            })
            .catch((error) => {
              resolve(_errorMessage(error.value));
            });
          } else {
            // someone is currently connected
            var message = '';
            if (user_id == data[_USERNAME_]) {
              message = `You are already connected to *${connection}*`;
            } else {
              message = `<@${data[_USERNAME_]}> is currenlty connected to *${connection}*`;
            }
            
            if (data[_WAITING_] && data[_WAITING_] != '') {
              message += ` and ${data[_WAITING_]} is waiting`;
              resolve(_simpleMessage(message));
            } else {
              resolve(_simpleMessage(message));
            }
          }
        }).catch((error) => {
          resolve(_errorMessage(error.value));
        });
        break;
    }
  })
  .catch((err) => resolve(_errorMessage(err)));
});

module.exports = connectedToFactory;
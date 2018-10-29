/**
 * Connected To 
 * Code to allow users to connect/disconnect from the RDP spreadsheet
 */
const {google} = require('googleapis');
const fs = require('fs');
const readline = require('readline');

// Data Column Constants
const _USERNAME_ = 0;
const _CONNECTION_ = 1;
const _WAITING_ = 2;
const _CONNECTION_TIME_ = 3;

function authorize(credentials) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id,client_secret,redirect_uris[0]);

  fs.readFile('token.json', (err, token) => {
    if (err) return getNewToken(oAuth2Clien);
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  });
}

function getNewToken(oAuth2Client, callback) {
  const authURL = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const rl = readline.createInterface({
    input: process.stdin, 
    output: process.stdout
  });

  console.log('Authorize by visiting the following site: ', authURL);
  rl.question('Enter the code here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.log('ERROR: Trying to create token ', err);
      oAuth2Client.setCredentials(token);
      fs.writeFile('token.json', JSON.stringify(token), (err) => {
        if (err) console.log('ERROR: Storing token file', err);
      });
      return oAuth2Client;
    });
  });
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

const connectedTo = (spreadsheetID) => {

  const auth = fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('ERROR: Could not read credentials', err);
    return authorize(JSON.parse(content));
  });

  const sheets = google.sheets({version: 'v4', auth});

  return {
    /**
     * Display Help Message for Connected command
     * @return: String
     */
    DisplayInstructions: () => {
      var message = "Command to manage and update Connection Spreadsheet";
      
      // Display all available commands
      message += "\n• `/connect <Connection Name>` Marks you as connected to `<Connection Name>`";
      message += "\n• `/connect whois` Display a list of all currently connected users";
      message += "\n• `/connect disconnect` Disconnects you from your current connection and notifies anyone waiting";
      message += "\n• `/connect clear` Clear all current connections and waiting";

      return {
        color: 'good',
        text: message
      };
    },

    /**
     * Display List of Users Connected in Sheet
     * @param
     * @return
     */
    DisplayConnections: () => {
      var data = sheets.getDataRange().getValues();
      var message;
      
      message = "*Currently Connected*";
      if (data.length == 0) {
        message = "*No one is currently connected*";
      } else {
        for (i in data) {
          if (data[i][_CONNECTION_] != "") {
            message += "\n• _" + data[i][_USERNAME_] + "_ is connected to " + data[i][_CONNECTION_];
            if (data[i][_WAITING_] != "") {
              message += " and _" + data[i][_WAITING_] + "_ is waiting"; 
            }
          }
        }
      }
      return message;
    },
    /**
     * Clear User Connection Data and Notify any users waiting in queue
     * @param: Username
     * @return
     */
    ClearConnection: (username) => {
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
    },
    /**
     * Connect User to Connection
     * @param: Username, Connection
     * @return
     */
    ConnectUser: (username, connection) => {
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
  }
}

module.exports = connectedTo;
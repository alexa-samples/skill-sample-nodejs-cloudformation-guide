const _get = require('lodash.get');
const AWS = require('aws-sdk');

const config = require('./config');

if (!config.debugMode) {
  console.log = function () {};
}

module.exports = {
  saveUserData: function (userData) {
    console.log('database.saveUserData()');
    const docClient = new AWS.DynamoDB.DocumentClient();
    const parameters = {
      Item: userData,
      TableName: config.dynamoDbTableName,
    };
    console.log(`DynamoDB Put user parameters: ${JSON.stringify(parameters, null, 4)}`);
    docClient.put(
      parameters,
      (error, result) => {
        console.log(`saveUserData Result: ${JSON.stringify(result, null, 4)}`);
        if (error) {
          console.log(`saveUserData Error: ${JSON.stringify(error, null, 4)}`);
        }
      },
    );
  },

  getUserData: function (userId) {
    return new Promise((resolve, reject) => {
      console.log('database.getUserData()');
      try {
        const docClient = new AWS.DynamoDB.DocumentClient();
        const parameters = {
          TableName: config.dynamoDbTableName,
          Key: {
            userId: userId,
          },
        };
        docClient.get(
          parameters,
          (error, result) => {
            console.log(`getUserData Result: ${JSON.stringify(result, null, 4)}`);
            if (error) {
              console.log(`getUserData Error: ${JSON.stringify(error, null, 4)}`);
              return reject(error);
            }
            return resolve(
              _get(result, 'Item'),
            );
          },
        );
      } catch (e) {
        console.log(`getUserData Error: ${JSON.stringify(e, null, 4)}`);
        reject(e);
      }
    });
  },
};

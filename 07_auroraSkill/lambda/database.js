const _get = require('lodash.get');
const AWS = require('aws-sdk');

const config = require('./config');

if (!config.debugMode) {
  console.log = function () {};
}

const RDS = new AWS.RDSDataService();

module.exports = {
  createUserTable: function () {
    return new Promise((resolve, reject) => {
      try {
        const sqlStatement = `CREATE TABLE ${
          config.aurora.userData.tableName
        }(`
        + 'userId VARCHAR(256) PRIMARY KEY, '
        + 'sessionCount SMALLINT UNSIGNED '
        + ')';

        const parameters = {
          secretArn: config.aurora.secret.arn,
          resourceArn: config.aurora.cluster.arn,
          database: config.aurora.database.name,
          sql: sqlStatement,
        };
        console.log(`Executing statement: "${sqlStatement}"`);
        RDS.executeStatement(
          parameters,
          (error, results) => {
            console.log(`createUserTable Result: ${
              JSON.stringify(results, null, 4)
            }`);
            if (error) {
              console.log(`createUserTable Error: ${
                JSON.stringify(error, null, 4)
              }`);
              return reject(error);
            }
            resolve(
              results,
            );
          },
        );
      } catch (e) {
        reject(e);
      }
    });
  },

  saveUserData: function (userId, sessionCount) {
    const sqlStatement = `INSERT INTO ${
      config.aurora.userData.tableName
    } SET `
    + `userId="${userId}", `
    + `sessionCount=${sessionCount || 0} `
    + ';';

    const parameters = {
      secretArn: config.aurora.secret.arn,
      resourceArn: config.aurora.cluster.arn,
      database: config.aurora.database.name,
      sql: sqlStatement,
    };
    console.log(`Executing statement: "${sqlStatement}"`);
    RDS.executeStatement(
      parameters,
      (error, results) => {
        console.log(`saveUserData Result: ${
          JSON.stringify(results, null, 4)
        }`);
        if (error) {
          console.log(`saveUserData Error: ${
            JSON.stringify(error, null, 4)
          }`);
          return error;
        }
        return results;
      },
    );
  },

  updateUserData: function (userId, sessionCount) {
    const sqlStatement = `UPDATE ${
      config.aurora.userData.tableName
    } SET `
    + `sessionCount=${sessionCount} `
    + ' WHERE '
    + `userId="${userId}" `
    + ' ;';

    const parameters = {
      secretArn: config.aurora.secret.arn,
      resourceArn: config.aurora.cluster.arn,
      database: config.aurora.database.name,
      sql: sqlStatement,
    };
    console.log(`Executing statement: "${sqlStatement}"`);
    RDS.executeStatement(
      parameters,
      (error, results) => {
        console.log(`updateUserData Result: ${
          JSON.stringify(results, null, 4)
        }`);
        if (error) {
          console.log(`updateUserData Error: ${
            JSON.stringify(error, null, 4)
          }`);
          return error;
        }
        return results;
      },
    );
  },

  getUserSessionCount: function (userId) {
    return new Promise((resolve, reject) => {
      try {
        const sqlStatement = 'SELECT '
        + 'sessionCount '
        + `FROM ${config.aurora.userData.tableName} `
        + 'WHERE '
        + `userId="${userId}" `
        + ';';

        const parameters = {
          secretArn: config.aurora.secret.arn,
          resourceArn: config.aurora.cluster.arn,
          database: config.aurora.database.name,
          sql: sqlStatement,
        };
        console.log(`Executing statement: "${sqlStatement}"`);
        RDS.executeStatement(
          parameters,
          (error, results) => {
            console.log(`getUserData Result: ${
              JSON.stringify(results, null, 4)
            }`);
            if (error) {
              console.log(`getUserData Error: ${
                JSON.stringify(error, null, 4)
              }`);
              return reject(error);
            }
            resolve(
              _get(results, 'records[0][0].longValue'),
            );
          },
        );
      } catch (e) {
        reject(e);
      }
    });
  },
};

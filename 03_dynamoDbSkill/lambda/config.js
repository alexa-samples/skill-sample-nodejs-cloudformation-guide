module.exports = {
  projectName: process.env.PROJECT_NAME,
  dynamoDbTableName: process.env.DYNAMODB_TABLE_NAME,
  debugMode: String(process.env.DEBUG_MODE).toLowerCase().trim() === 'true',
};

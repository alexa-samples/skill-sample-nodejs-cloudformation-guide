
module.exports = {
    projectName: process.env.PROJECT_NAME,
    debugMode: String(process.env.DEBUG_MODE).toLowerCase().trim() === 'true',
    aurora: {
        secret: {
            arn: process.env.AURORA_SECRET_ARN,
        },
        cluster: {
            arn: process.env.AURORA_CLUSTER_ARN,
        },
        database: {
            name: process.env.AURORA_DATABASE_NAME,
        },
        userData: {
            tableName: 'users',
        },
    },
}


module.exports = {
    projectName: process.env.PROJECT_NAME,
    debugMode: String(process.env.DEBUG_MODE).toLowerCase().trim() === 'true',
}


module.exports = {
    projectName: process.env.PROJECT_NAME,
    debugMode: String(process.env.DEBUG_MODE).toLowerCase().trim() === 'true',
    s3BucketName: process.env.BUCKET_NAME,
    cloudFrontDistroName: process.env.DISTRO_NAME,
}

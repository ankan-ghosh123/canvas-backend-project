const ApiError = require('../utils/ApiError')
const ApiResponse = require('../utils/ApiResponse')
const ImageKit = require('@imagekit/nodejs');
//step 2
async function uploadFile(req, res, next) {
    const file = req.file
    console.log("publickey:", process.env.IMAGEKIT_PUBLIC_KEY)
    console.log("private key:", process.env.IMAGEKIT_PRIVATE_KEY)
    console.log("uri:", process.env.IMAGEKIT_URL_ENDPOINT)
    const imagekitClient = new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
    })
    console.log("hey buddy----------------")
    if (!file) {
        throw new ApiError(400, `forgot to attach image`)
    }
    try {
        const response = await imagekitClient.files.upload({
            file: file.buffer.toString("base64"),
            fileName: file.originalname,
            folder: "uploads/backgroud_posts"
        })
        if (!response) {
            throw new ApiError(400, "image upload fail")
        }
        req.imageUrl = response.url
        next()
    } catch (error) {
        next(error)
    }
}
module.exports = uploadFile
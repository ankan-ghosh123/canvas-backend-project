const express = require('express')
const router = express.Router()
const JwtVerify = require('../middleware/JwtVverify')
const authorizeRoleAccess = require('../middleware/authorizeRoles')

const admincontroller = require('../controllers/admin.upload.controller')
//step1
const multer = require('multer')
//hold imcoming files into ram not into
//  secondary disk storage
const storage = multer.memoryStorage()
//it tells where and how to hold incoming files
const upload = multer({ storage: storage })
const uploadFile = require('../services/storage.service')

console.log("entered admin router file")

//routes------------

//1.upload backgrounds done
router.post('/post/background-uploads',
    JwtVerify,
    authorizeRoleAccess,
    upload.single('background-img'),
    uploadFile,
    admincontroller.uploadBackgroundImages
)


//2.upload yt url done
router.post('/post/yt-url-upload', JwtVerify, authorizeRoleAccess, admincontroller.uploadNewYtVideo)

//3.upload yt poster done
router.post('/post/yt-poster-upload',
    JwtVerify,
    authorizeRoleAccess,
    upload.single('poster'),
    uploadFile,
    admincontroller.uploadPoster)

//4.delete yt poster done
router.delete('/:id/delete-poster', JwtVerify, authorizeRoleAccess, admincontroller.deletePoster)

//5.disable backgrounds done
router.post('/post/:background_id/disable-background', JwtVerify, authorizeRoleAccess, admincontroller.disableBackgrounds)

module.exports = router

//todo-delete backgrounds->done
//todo-fetch backgroundnds->check public router->done
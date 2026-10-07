const express = require('express')
const router = express.Router()
const JwtVerify = require('../middleware/JwtVverify')
const authorizeRoleAccess = require('../middleware/authorizeRoles')
const userPost = require('../controllers/user.post.controller')
const multer = require('multer')
const uploadFile = require('../services/storage.service')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
console.log('uploadFile:', typeof uploadFile);
console.log('uploadImagePoems:', typeof userPost.uploadImagePoems);
console.log('fetchAusersProfile:', typeof userPost.fetchAusersProfile);

//1.post typed poem
router.post('/post/typed-poem', JwtVerify, userPost.uploadTypedPoems)

//2.post image poem
router.post('/image-poem',
    JwtVerify,
    upload.single('poem-image'),
    uploadFile,
    userPost.uploadImagePoems
)

//3.delete poem
router.delete('/delete/:post_id/delete-poem', JwtVerify, userPost.deletePoem)

//4.update  caption
router.put('/put/:post_id/update-caption', JwtVerify, userPost.updateCaption)

//5.update poem name
router.put('/put/:post_id/update-poemname', JwtVerify, userPost.updatePoemName)
module.exports = router 
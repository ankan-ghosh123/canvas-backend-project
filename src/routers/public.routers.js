const express = require('express')
const router = express.Router()
const JwtVverify = require('../middleware/JwtVverify')
const authorizeRoleAccess = require('../middleware/authorizeRoles')
const publicController = require('../controllers/public.controller')

console.log("fetch-backgrounds-", typeof publicController.fetchBackgrounds)

//1.get background images
router.get('/get/fetch-backgrounds', publicController.fetchBackgrounds)

//2.get yt videos
router.get('/get/fetch-ytvideos', publicController.fetchYtVideos)

//3.get yt poster
router.get('/get/fetch-ytposter', publicController.fetchPoster)

//4.get a particuler user profile
router.get('/get/:id/posts', publicController.fetchAusersProfile)

//5.fetch all the posts
router.get('/get/feed', publicController.fetchGlobalFeed)

module.exports = router

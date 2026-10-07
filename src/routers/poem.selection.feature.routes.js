const express = require('express')
const router = express.Router()
const JwtVerify = require('../middleware/JwtVverify')
const authorizeRoleAccess = require('../middleware/authorizeRoles')
const poemSelectionController = require('../controllers/poem.selection.feature..controller')

console.log('markpoem:----', typeof poemSelectionController.markPoem)
console.log('fetch marked poems:----', typeof poemSelectionController.fetchMarkPoems)

//todo testing all the apis

//1. mark a poem ::-admin req
router.post('/:post_id/markPost', JwtVerify, authorizeRoleAccess, poemSelectionController.markPoem)
console.log('markpoem reach')
//2. fetch all the mark poems for marked poem page
//::-admin req

router.get('/get/fetch-marked-posts', JwtVerify, authorizeRoleAccess, poemSelectionController.fetchMarkPoems)

//3.unmark a poem ::-admin req
router.post('/post/:post_id/unmark-posts', JwtVerify, authorizeRoleAccess, poemSelectionController.unmarkPoems)

//4.set a poem as candidate poem ::-admin req
router.post('/post/:post_id/set-candidate', JwtVerify, authorizeRoleAccess, poemSelectionController.setCandidatePoem)

//5.remove a poem from candidate ::-admin req
router.post('/post/remove-candidate', JwtVerify, authorizeRoleAccess, poemSelectionController.removeFromCandidatePoem)

//6.set a poem as poem of week ::-admin req
router.post('/post/set-poemofweek', JwtVerify, authorizeRoleAccess, poemSelectionController.setAsPoemOfWeek)

//7.delete the poem of week ::-admin request
router.post('/remove-poemofweek', JwtVerify, authorizeRoleAccess, poemSelectionController.deletePoemOfWeek)

//8.fetch the poem of week ::-public request
router.get('/get/fetch-poemofweek', JwtVerify, poemSelectionController.fetchPoemOfweek)

module.exports = router

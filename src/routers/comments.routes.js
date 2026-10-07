const express = require('express')
const router = express.Router()
const jwtVerify = require('../middleware/JwtVverify.js')
const commentsController = require('../controllers/comments.controllers.js')
console.log("fetchCommets:--", typeof commentsController.fetchComments)
console.log("edit comment:--", typeof commentsController.editComment)
router.post('/post/:post_id/make-comment', jwtVerify, commentsController.makeAComment)

router.get('/get/:post_id/fetch-comments', jwtVerify, commentsController.fetchComments)

router.delete('/post/:comment_id/delete-comment', jwtVerify, commentsController.deleteComment)

router.put('/post/:comment_id/edit-comment', jwtVerify, commentsController.editComment)


module.exports = router
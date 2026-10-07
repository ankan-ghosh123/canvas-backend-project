const ApiError = require('../utils/ApiError')
const ApiResponse = require('../utils/ApiResponse')
const { pool } = require('../db/db')
const { base64 } = require('zod')



async function makeAComment(req, res) {
    const user_id = req.user.id
    const { post_id } = req.params
    const { comment } = req.body
    try {
        if (!post_id) {
            throw new ApiError(400, `post
         id missing`)
        }
        const get_pt_post_id =
            await pool.query(
                `select post_id from post_tracking
    where status='POEM_OF_WEEK'`)

        //check if there is actually a poem of
        //  week  actively present  
        if (get_pt_post_id.rows.length === 0) {
            throw new ApiError(400, `no active
        poem of week for commenting`)
        }

        //check if its the actual current
        //  poem of week's post_id or not not
        const pt_postid =
            get_pt_post_id.rows[0].post_id

        if (post_id !== pt_postid) {
            throw new ApiError(400,
                `comments are only allowed on the current poem of the week`)
        }

        //check if there is comment present or
        //a empty space given as comment by user
        if (!comment || comment.trim() === "") {
            throw new ApiError(400, `comment can't be empty`)
        }


        const commentInsert =
            await pool.query(
                `insert into comments
    (user_id,post_id,comment)
    values
    ($1,$2,$3) returning*`,
                [user_id, post_id, comment]
            )

        if (commentInsert.rows.length === 0) {
            throw new ApiError(400, `problem
        inserting comment`)
        }
        return res.
            status(201).
            json(new ApiResponse(
                201,
                { commentDetails: commentInsert.rows[0] },
                'comment make successfullly'
            ))

    } catch (error) {

        if (error instanceof ApiError)
            throw error

        if (error.code === '23514') {
            throw new ApiError(400,
                `comment is too long `
            )
        }

        if (error.code === '23503') {
            throw new ApiError(404, `post not
                              found`)
        }


        throw new ApiError(500, `internal
         server error `)
    }

}

async function fetchComments(req, res) {
    try {
        const { post_id } = req.params
        if (!post_id) {
            throw new ApiError(400, `post_id
        is missing`)
        }


        const limit = Math.min(Number(req.query.limit) || 15, 25)

        if (limit <= 0) {
            throw new ApiError(400, `limit must 
        a positive integer`)
        }

        const cursor = req.query.cursor
        let created_at; let comment_id


        try {

            if (cursor) {
                ({ comment_id, created_at } = JSON.parse(Buffer.from(cursor, 'base64').toString()))
            }
        } catch (error) {
            throw new ApiError(
                400,
                error.message || `invalid cursor`
            )
        }
        if (cursor) {
            if (!(comment_id && created_at)) {
                throw new ApiError(400,
                    `missing cursor property`
                )
            }
        }

        const query = cursor
            ? `select
 u.fullname,u.avatar_url,c.comment,
 c.created_at,c.comment_id,c.comment_id,c.post_id
 from 
 users u
 join 
 comments c
 on u.id=c.user_id
where c.post_id=$1 and 
(c.created_at,c.comment_id)<($2,$3)
order by c.created_at desc,c.comment_id desc
limit $4
`
            : `select
 u.fullname,u.avatar_url,c.comment,
 c.created_at,c.comment_id
 from 
 users u
 join 
 comments c
 on u.id=c.user_id
 where c.post_id=$1
order by c.created_at desc,c.comment_id desc
limit $2
`
        const parameters =
            cursor ? [post_id, created_at, comment_id, limit + 1]
                : [post_id, limit + 1]
        const result =
            await pool.query(query, parameters)
        const has_more = result.rows.length > limit
        const comments = has_more
            ? result.rows.slice(0, limit)
            : result.rows
        if (!has_more && comments.length === 0) {
            return res.
                status(200).
                json(new ApiResponse(
                    200,
                    {
                        comments: [],
                        has_more: has_more,
                        cursor: null
                    }
                ))
        }
        const lastElemnt = comments[comments.length - 1]
        const next_created_at = lastElemnt.created_at
        const next_comment_id = lastElemnt.comment_id
        const next_cursor = has_more
            ? Buffer.from(JSON.stringify(
                {
                    created_at: next_created_at,
                    comment_id: next_comment_id
                }
            )).toString('base64')
            : null

        return res.
            status(200).
            json(new ApiResponse(
                200,
                {
                    comments: comments,
                    cursor: next_cursor,
                    has_more: has_more
                },
                'comments fetch successfully'

            ))


    } catch (error) {
        if (error instanceof ApiError) throw error
        console.log('error while fetching comments:-', error.message)
        throw new ApiError(500,
            `internal server error`
        )
    }

}
async function deleteComment(req, res) {
    const { comment_id } = req.params
    try {
        if (!comment_id) {
            throw new ApiError(400, `comment id is missing`)
        }
        //before deleteing a comment if the comment
        //belong to the that user or not ,
        // a valid user and a admin can delete a comment

        const commentCheck =
            await pool.query(
                `select user_id
                    from comments 
                    where comment_id=$1`,
                [comment_id]
            )

        if (commentCheck.rows.length === 0) {
            throw new ApiError(404, "comment not found");

        }

        const isOwner =
            commentCheck.rows[0].user_id === req.user.id

        const isAdmin =
            req.user.role === 'admin'

        if (!isOwner && !isAdmin) {
            throw new ApiError(
                403, `you are not allowed
                 to delete this comment`);
        }



        const isDeleted =
            await pool.query(
                `delete from comments
                where comment_id=$1
                returning*`,
                [comment_id]
            )

        if (isDeleted.rows.length === 0) {
            return res.
                status(200).
                json(
                    new ApiResponse(200,
                        {},
                        "comment already deleted")
                );
        }

        return res.
            status(200).
            json(new ApiResponse(
                200,
                { deletedComment: isDeleted.rows[0] },
                `comment is deleted successfully`
            ))

    } catch (error) {

        if (error instanceof ApiError)
            throw error

        console.log(`error from deleting
             a comment:-`, error.message)

        throw new ApiError(500, `
                internal server eeror `)
    }
}
async function editComment(req, res) {
    const { comment_id } = req.params
    const { editedComment } = req.body
    try {
        if (!comment_id) {
            throw new ApiError(400, `
                comment id is missing`)
        }
        if (!editedComment || editedComment.trim() === "") {
            throw new ApiError(400,
                `new edited comment can't be empty`
            )
        }
        if (editedComment.length > 1000) {
            throw new ApiError(400,
                `comment is too long`
            )
        }
        if (editedComment.length > 1000) {
            throw new ApiError(400, "comment is too long");
        }
        const commentCheck =
            await pool.query(
                `select user_id
            from comments
            where comment_id=$1`,
                [comment_id])

        if (commentCheck.rows.length === 0) {
            throw new ApiError(404,
                `comment not found`
            )
        }
        const isOwner =
            commentCheck.rows[0].user_id === req.user.id;
        if (!isOwner) {
            throw new ApiError(403,
                `you are not allowed 
                to edit this comment`
            )
        }
        const edit = await pool.query(
            `update comments
            set comment=$1
            where comment_id=$2 returning*`,
            [editedComment, comment_id]
        )
        if (edit.rows.length === 0) {
            return res.
                status(200).
                json(new ApiResponse(
                    200,
                    {},
                    `comment is already edited,refresh the page`
                ))
        }
        return res.
            status(200).
            json(new ApiResponse(
                200,
                { editedComment: edit.rows[0] },
                `comment edited successfully`
            ))

    } catch (error) {
        if (error instanceof ApiError)
            throw error
        console.log(`error occour in 
            the editing the comment:-`, error.message)
        throw new ApiError(500, `internal 
                           server erro`)
    }
}
module.exports = {
    makeAComment,
    fetchComments,
    deleteComment,
    editComment
}
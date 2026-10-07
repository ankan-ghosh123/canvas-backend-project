const ApiError = require('../utils/ApiError')
const ApiResponse = require('../utils/ApiResponse')
const { pool } = require('../db/db')
const z = require('zod')
const { validate: isUUID } = require('uuid');
const TextStyleConfigSchema = z.object({
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid HEX color code"),
    fontFamily: z.string().min(1, "Font family cannot be empty"),
    fontSize: z.number().positive("Font size must be greater than 0"),
    textAlign: z.enum(["left", "center", "right"]),
    position: z.object({
        x: z.number().min(0).max(100, "X coordinate must be between 0 and 100"),
        y: z.number().min(0).max(100, "Y coordinate must be between 0 and 100"),
    }),
});
async function uploadTypedPoems(req, res, next) {
    const user_id = req.user.id //from jwtVerify
    const {
        post_type,
        poem_text,
        background_id,
        poem_name,
        text_style_config } = req.body
    let { caption } = req.body
    try {
        if (!caption || caption.trim() === "") {
            caption = null
        }
        if (!poem_name || poem_name.trim() === "") {
            throw new ApiError(400, `poem name 
                and writer name is required`)
        }
        if (!poem_text || poem_text.trim() === "") {
            throw new ApiError(400, "poem must be there")
        }
        const validationResult =
            TextStyleConfigSchema.safeParse(text_style_config)
        if (!validationResult.success) {

            throw new ApiError(400, "bad request")

        }
        const getBackground_url =
            await pool.query(`
            select image_url
            from backgrounds 
            where background_id=$1 and is_active=true`,
                [background_id])
        if (getBackground_url.rows.length === 0) {
            throw new ApiError(400, "invalid background selected");
        }
        const media_url = getBackground_url.rows[0].image_url
        const validationData = validationResult.data
        const postDetails = await pool.query(
            `insert into posts 
        (user_id,caption,post_type,poem_text,media_url,
         text_style_config,poem_name ) 
          values($1,$2,$3,$4,$5,$6,$7) returning*`,
            [user_id, caption, post_type, poem_text,
                media_url, JSON.stringify(validationData), poem_name]
        )
        if (postDetails.rows.length === 0) {
            throw new ApiError(400, "problem insering post on db")
        }
        const post = postDetails.rows[0];
        return res.status(201).json(
            new ApiResponse(201, post, "poem post successfully")
        )
    } catch (error) {
        console.log("error is here-:", error)
        if (error instanceof ApiError) throw error
        throw new ApiError(500, `something went wrong w
        while posting the poem`)
        //unreachable console->
        // console.log("error is here-:",error)
    }

}

async function uploadImagePoems(req, res, next) {
    const user_id = req.user.id
    const { post_type, poem_name } = req.body
    let { caption } = req.body
    const poemImage_url = req.imageUrl

    try {
        if (!caption || caption.trim() === "") {
            caption = null
        }
        if (!poemImage_url) {
            throw new ApiError(400, "image url not found")
        }
        if (!poem_name || poem_name.trim() === "") {
            throw new ApiError(400, `poem name 
                and writer name is required`)
        }
        const postDetails = await pool.query(
            `insert into posts(user_id,caption,
                  post_type,media_url,poem_name)
                  values($1,$2,$3,$4,$5)returning*
        `, [user_id, caption, post_type, poemImage_url, poem_name]
        )
        if (postDetails.rows.length === 0) {
            throw new ApiError(400, `problem inserting post 
            into db`)
        }
        const post = postDetails.rows[0];
        res.status(201).json(
            new ApiResponse(201, post, "post created successfully")
        )
    } catch (error) {
        console.log("error is here-:", error)
        if (error instanceof ApiError) throw error
        throw new ApiError(500, `something went wrong w
        while posting the poem`)

    }

}

async function deletePoem(req, res) {
    const { post_id } = req.params
    try {
        if (!post_id) {
            throw new ApiError(400,
                'post id is missing'
            )
        }

        if (!isUUID(post_id)) {
            throw new ApiError(400, "invalid post id")
        }
        const getUserId = await pool.query(`select user_id from
     posts where post_id=$1`, [post_id])
        if (getUserId.rows.length === 0) {
            throw new ApiError(404, `post not found`)
        }
        const isOwner = getUserId.rows[0].user_id === req.user.id
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            throw new ApiError(403, "you are not allowed to delete this post");
        }


        const deletePost = await pool.query(
            `delete from posts where 
        post_id=$1 returning*`, [post_id]
        )
        if (deletePost.rows.length === 0) {
            throw new ApiError(404, `post not found`)
        }
        return res.
            status(200).
            json(new ApiResponse(
                200,
                { deleted_post: deletePost.rows[0] },
                `post delete successfully`
            ))
    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.log("error while delete a post:-", error.message)
        throw new ApiError(500,
            `internal server errror`
        )
    }
}

async function updateCaption(req, res) {
    const { post_id } = req.params
    const { newCaption } = req.body
    const user_id = req.user.id
    try {
        if (!post_id) {
            throw new ApiError(400, "post is missing")
        }

        if (!isUUID(post_id)) {
            throw new ApiError(400, "invalid post id")
        }
        //captions can be empty 
        // if (!newCaption || newCaption.trim() === "") {
        //     throw new ApiError(400, "caption cant be empty")
        // }

        //check caption length
        if (newCaption && newCaption.length > 500) {
            throw new ApiError(400, "caption is too long")
        }
        //check if the user is right owner of the post
        const getpostsUserId = await pool.query(
            `select user_id from posts where post_id=$1`, [post_id]
        )
        if (getpostsUserId.rows.length === 0) {
            throw new ApiError(400, "post not found")
        }
        const isOwner = getpostsUserId.rows[0].user_id === user_id
        if (!isOwner) {
            throw new ApiError(403, "user is not allowed to edit caption")
        }
        const updatedCaption = await pool.query(`
            update posts
            set caption=$1
            where post_id=$2 returning*`, [newCaption, post_id])

        if (updatedCaption.rows.length === 0) {
            throw new ApiError(400, "post not found")
        }

        return res.
            status(200).
            json(new ApiResponse(200, {
                updatedCaption: updatedCaption.rows[0].caption
            },
                "caption edited successfully"
            )
            )


    } catch (error) {
        if (error instanceof ApiError) throw error
        console.log("error from updating caption", error.message)
        throw new ApiError(500, "internal server error")

    }

}
async function updatePoemName(req, res) {
    const { post_id } = req.params
    const { newPoemName } = req.body
    const user_id = req.user.id
    try {
        if (!post_id) {
            throw new ApiError(400, "post is missing")
        }

        if (!isUUID(post_id)) {
            throw new ApiError(400, "invalid post id")
        }
        //poem name can be empty 
        if (!newPoemName || newPoemName.trim() === "") {
            throw new ApiError(400, "poem name can't be empty")
        }

        //check poem name length
        if (newPoemName && newPoemName.length > 255) {
            throw new ApiError(400, "poem name  is too long")
        }

        //check if the user is right owner of the post
        const getpostsUserId = await pool.query(
            `select user_id from posts where post_id=$1`, [post_id]
        )
        if (getpostsUserId.rows.length === 0) {
            throw new ApiError(400, "post not found")
        }
        const isOwner = getpostsUserId.rows[0].user_id === user_id
        if (!isOwner) {
            throw new ApiError(403, "user is not allowed to edit caption")
        }
        const updatedpoemname = await pool.query(`
            update posts
            set poem_name=$1
            where post_id=$2 returning*`, [newPoemName, post_id])

        if (updatedpoemname.rows.length === 0) {
            throw new ApiError(400, "post not found")
        }

        return res.
            status(200).
            json(new ApiResponse(200, {
                updatedPoemName: updatedpoemname.rows[0].poem_name
            },
                "poem name edited successfully"
            )
            )


    } catch (error) {
        if (error instanceof ApiError) throw error
        console.log("error from updating caption", error.message)
        throw new ApiError(500, "internal server error")

    }

}

module.exports = {
    uploadImagePoems,
    uploadTypedPoems,
    deletePoem,
    updateCaption,
    updatePoemName
}
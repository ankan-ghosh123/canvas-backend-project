const ApiError = require('../utils/ApiError')
const ApiResponse = require('../utils/ApiResponse')
const { pool } = require('../db/db')
function extractVideoId(url) {
    const regex = /(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null
}
async function uploadBackgroundImages(req, res, next) {
    const imageUrl = req.imageUrl;
    if (!imageUrl) {
        throw new ApiError(400, "image url not found")
    }
    try {
        const background = await pool.query(
            `insert into backgrounds(image_url)
        values($1) returning *`, [imageUrl]
        )
        if (background.rows.length === 0) {
            throw new ApiError(400, `
            problem in image insering in db`)
        }
        return res.status(200).json(
            new ApiResponse(200,
                {
                    background: background.rows[0],
                    massage: "background upload successfully"

                }
            )
        )
    } catch (error) {
        if (error instanceof ApiError) throw error

        console.log("error while uploading backgrounds-", error.message)

        throw new ApiError(500, `interal server errror`)
    }
}

//todo -delete background
async function disableBackgrounds(req, res) {
    const { background_id } = req.params
    try {
        if (!background_id) {
            throw new ApiError(
                400,
                `background id is missing`
            )
        }
        const disableBackground =
            await pool.query(`update backgrounds
        set is_active=false 
        where background_id=$1 returning*`,
                [background_id])

        if (disableBackground.rows.length === 0) {
            throw new ApiError(404, "background not found");
        }
        return res.
            status(200).
            json(new ApiResponse(
                200,
                { disabled_background: disableBackground.rows[0] },
                `background disabled successfully`
            ))
    } catch (error) {
        if (error instanceof ApiError) throw error
        console.log('error while disable background-', error.message)
        throw new ApiError(500, `interal server errror`)
    }
}
async function uploadNewYtVideo(req, res) {
    //step1-get yt url and extract video_id



    const client = await pool.connect()
    try {
        const { video_url } = req.body
        if (!video_url || typeof video_url != 'string' || video_url.trim() === "") {
            throw new ApiError(400, "video_url is required");
        }
        const video_id = extractVideoId(video_url)
        if (video_id === null) {
            throw new ApiError(400, "invalid youtube url")
        }

        //this is a transaction
        await client.query('BEGIN')

        const inserNewestVideo =
            await client.query(`insert into 
                         yt_vid (vid_id)
                         values ($1) returning *`,
                [video_id])


        const limit = 5;
        await client.query(
            `delete from yt_vid
                        where id not in
                     ( select id from yt_vid
                         order by added_at desc 
                          limit $1)`,
            [limit]
        )
        await client.query('COMMIT')

        return res.status(201).json(
            new ApiResponse(
                201,
                {
                    video: inserNewestVideo.rows[0]
                },
                "video upload successfully"
            ))
    } catch (error) {
        if (error instanceof ApiError) throw error
        await client.query('ROLLBACK')
        throw new ApiError(500,
            "internal server error"
        )
    } finally {
        client.release()
    }

}
async function uploadPoster(req, res) {
    const imageUrl = req.imageUrl
    let { caption } = req.body
    try {
        if (!imageUrl) {
            throw new ApiError(400, "image url not found")
        }
        if (!caption || caption.trim() === "") {
            caption = null
        }
        //delete older posters if there                                 
        await pool.query(`delete from ytPosters`)
        //insert new poster into db
        const posterData = await pool.query(
            `insert into ytPosters(caption,image_url)
        values($1,$2)returning *`, [caption, imageUrl]
        )
        const poster = posterData.rows
        if (poster.length === 0) {
            throw new ApiError(400,
                'problem inserting into db'
            )
        }
        return res.status(201).
            json(
                new ApiResponse(
                    201,
                    { poster: poster[0] },
                    "poster uploaded successfully"
                )
            )

    } catch (error) {
        console.log("error is here-", error)
        if (error instanceof ApiError) throw error
        throw new ApiError(500, "internal server error")
    }
}
async function deletePoster(req, res) {
    const id = req.params.id
    try {
        if (!id) {
            throw new ApiError(400, "poster id missing")
        }

        const result = await pool.query(
            `delete from ytPosters 
     where poster_id=$1 returning*`, [id])
        if (result.rows.length === 0) {
            throw new ApiError(400, "poster Id is invalid")
        }
        return res.
            status(200).
            json(
                new ApiResponse(
                    200,
                    {},
                    "poster deleted successfully"
                )
            )
    } catch (error) {
        console.log("errros is :-", error.message)
        if (error instanceof ApiError) throw error
        throw new ApiError(500, "internal server error")
    }
}
module.exports = {
    uploadBackgroundImages,
    disableBackgrounds,
    uploadNewYtVideo,
    uploadPoster,
    deletePoster
}
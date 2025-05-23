import { getAllUserUrlsDao } from "../dao/user.dao.js"
import { asyncHandler } from "../utils/tryCatchWrapper.js";

export const getAllUserUrls = asyncHandler(async (req, res) => {
    try {
  
        const {_id} = req.user
       
        const urls = await getAllUserUrlsDao(_id);
        res.status(200).json({message:"success",urls})
    } catch (error) {
        return res.status(500).json({message:"Internal Server Error",error})
    }
});

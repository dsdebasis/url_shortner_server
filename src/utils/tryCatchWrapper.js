export default function wrapAsync(fn) {
    return function (req, res, next) {
      fn(req, res, next).catch(next);
    };
  };

 const asyncHandler = (reqHandler)=> async (req, res, next) => {
   try {
    return await  reqHandler(req, res, next);
   } catch (error) {
     res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
      data: error
     })
   }
 }

 export {asyncHandler}
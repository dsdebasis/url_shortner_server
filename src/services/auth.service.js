
import { findUserByEmailByPassword } from "../dao/user.dao.js"

import {signToken} from "../utils/helper.js"


export const loginUser = async (email, password) => {

   
    const user = await findUserByEmailByPassword(email)
    if(!user) throw new Error("Invalid email or password")

    const isPasswordValid = await user.comparePassword(password)
    if(!isPasswordValid) throw new Error("Invalid email or password")
    const token = signToken({id: user._id, email: user.email, name: user.name});
    return {token,user}
}


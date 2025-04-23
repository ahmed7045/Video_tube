import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import  {deleteFromCloudinary, uploadOnCLoudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { channel } from "diagnostics_channel"
import mongoose from "mongoose"


    const generateAccesAndRefreshToken = async (userId) => {
        try {
        const user = await User.findById(userId)
        // small check for user existence
    
       const accessToken =  user.generateAccesToken()
       const refreshToken =  user.generateRefreshToken()
    
       user.refreshToken = refreshToken
       await user.save({validateBeforeSave : false})
       return {accessToken , refreshToken}
} catch (error) {
    throw new ApiError(500,"Something went wrong while generating access and refresh tokens" )
}

}

const registerUser = asyncHandler(async (req , res) => {
    const { fullname , username ,email,  password} = req.body 
    //validation

    if (
        [fullname, username, email, password].some((field) => 
        field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
        
    }

   const existedUser = await User.findOne(
        {
            $or : [{username},{email}]
        }
    )

    if (existedUser) {
        throw new ApiError(400 , "User with email or username already exist")
    }

    console.warn(registerUser.files);
    
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

//     const avatar = await uploadOnCLoudinary(avatarLocalPath);
//    let coverImage = "";

//     if (coverLocalPath) {
//         coverImage = await uploadOnCLoudinary(coverLocalPath);
//     }

//After optimization
let avatar;
try {
 avatar = await uploadOnCLoudinary(avatarLocalPath) 
 console.log("Uploaded avattar", avatar)  
} catch (error) {
    console.log("Error uploading avatar", error);
    throw new ApiError(500, "Failed to upload avatar")
    
}

let coverImage;
try {
 coverImage = await uploadOnCLoudinary(coverLocalPath) 
 console.log("Uploaded coverImage", coverImage)  
} catch (error) {
    console.log("Error uploading coverImage", error);
    throw new ApiError(500, "Failed to upload coverImage")
    
}
try { const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage : coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
})

const createdUser =  await User.findById(user._id).select(
    "-password -refreshToken"
)

if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering a user")

    
}
return res 
.status(201)
.json(new ApiResponse(200, createdUser, "User registered successfully"))

    
} catch (error) {
    console.log("User creation failed");

    if(avatar){
        await deleteFromCloudinary(avatar.public_id)
    }
    if(coverImage){
        await deleteFromCloudinary(coverImage.public_id)
    }
    throw new ApiError(500, "Something went wrong while registering a user and images were deleted")

}
   })



   const loginUser = asyncHandler ( async (req, res) => {
    //get data from body

    const{email , username , password} = req.body

    // validation 

    if(!email){
        throw new ApiError(400 , "Email is required")
    }
    const user = await User.findOne(
        {
            $or : [{username},{email}]
        }
    )
if(!user){
    throw new ApiError(404, "User not found")

}

//validate password

const isPasswordValid =  await user.isPasswordCorrect(password)

if(!isPasswordValid){
    throw new ApiError(401, "Invalid credentials");
    
}

const {accessToken, refreshToken} = await
generateAccesAndRefreshToken(user._id)

const loggedInUser = await User.findById(user._id)
.select("-password -refreshToken");

const options = {
    httpOnly : true,
    secure : process.env.NODE_ENV === "production",
}
return res 
.status(200)
.cookie("accessToken", accessToken , options)

.cookie("refreshToken", refreshToken , options)
.json( new ApiResponse(
    200,
    {user : loggedInUser , accessToken,refreshToken},
    "User logged in successfully"
))
   })

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken : undefined,
            }
        },
        {new : true}
        
    )

    const options = {
        httpOnly : true,
        secure : process.env.NODE_ENV === "production",
    }

    return res
    .status(200)
.clearCookie("accessToken", options)
.clearCookie("refreshToken", options)
.json(new ApiResponse(200, {}, "User logged out successfully"))
})

   const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || 
    req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh token is required")

    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById( decodedToken._id)

        if(!user){
            throw new ApiError(401,"Invalid refresh token");
            
        }

        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Invalid refresh token");
            
        }

        const options = {
            httpOnly : true,
            secure : process.env.NODE_ENV === "production",
        }

        const {accessToken , refreshToken : newRefreshToken} =
        await generateAccesAndRefreshToken(user._id)

        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refresh", newRefreshToken , options)
        .json(
            new ApiResponse(
                200,
                {accessToken,
                     refreshToken : newRefreshToken
                    },
                "Access token refreshed successfully"
            )
        )


    } catch (error) {
throw new ApiErrorError(500,"Something went wrong while refreshing access token");

        
    }


   })

   const changeCurrentPassword = asyncHandler (async (req , res) => {
    const {oldPassword , newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid){
        throw new ApiError(401, "Old password is incorrect");
        
    }

    user.password = newPassword;

    await user.save({validateBeforeSave : false})

    return res.status(200).json(new ApiResponse(200, {}, 
        "password changed successfully"
    ))
   })

   const getCurrentUser = asyncHandler (async (req , res) => {
    return res.status(200).json(new ApiResponse(200, req.user,
        "Current user details"
    ))
   })

   const updateAccountDetails = asyncHandler (async (req , res) => {
    const{fullname , email} = req.body

    if(!fullname || !email){
        throw new ApiError(400,"Fullname and email are required");

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    fullname,
                    email : email
                }
            },
            {new: true}
        ).select("-password -refreshToken")
        return res.status(200).json(new ApiResponse(200, {}, 
            "account details changed successfully"
        ))
    }
   })

   const updateUserAvatar = asyncHandler (async (req , res) => {
    const avatarLocalPath = req.files?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"file is required");
        
    }

    const avatar = await uploadOnCLoudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(500,"Sommething went wrong while uploading avatar");
        
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar :avatar.url
            }
        },
        {new : true}
    ).select("-password -refreshToken")

      res.status(200).json(new ApiResponse(200, user,  
            "avatar updated successfully"
      ))
    })

   const updateUserCoverImage = asyncHandler (async (req , res) => {
    
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"file is required");
        
    }

    const coverImage = await uploadOnCLoudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(500,"Sommething went wrong while uploading coverImage");
        
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage :coverImage.url
            }
        },
        {new : true}
    ).select("-password -refreshToken")

      res.status(200).json(new ApiResponse(200, user,  
            "coverImage updated successfully"
      ))

   })

   const getUserChannelProfile = asyncHandler (async (req,res) => {
const {username} = req.params    
if (!username?.trim()) {
    throw new ApiError(400,"username is req");
    
    
}   

const channel = await User.aggregate(
    [
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
$lookup: {
    from : "subscriptions",
    localField : "_id",
    foreignField: "channel",
    as : "subscribers"
}
        },
        {
            $lookup: {
                from : "subscriptions",
                localField : "_id",
                foreignField: "subscriber",
                as : "subscriberedTo"
            }
                    },
                    {
                        $addFields: {
                            subscribersCount : {
                                $size : "$subscribers"
                            },
                            channelSubscribedToCount : {
                                $size : "$subscriberedTo"
                            },
                            isSubscribed:{
                                $cond: {
                                    if: { $in : [req.user?._id,"$subscribers.subscriber"] },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                 {
                    //project only necessary
                    $project: {
                        fullname:1,
                        username:1,
                        avatar:1,
                        subscribersCount:1,
                        channelSubscribedToCount:1,
                        isSubscribed:1,
                        coverImage:1,
                        email:1

                    }
                 }   

    ]
)
if(!channel?.length){
    throw new ApiError(404,"channel not found");
    
}

return res.status(200).json(new ApiResponse(200, channel[0],
    "channel profile fetched successfully"
))
})


const getWatchHistory = asyncHandler (async (req,res) => {
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField : "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, user[0],
        "Watch history fetched successfully"
    ))
    
})

export{
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    updateAccountDetails,
    changeCurrentPassword,
    updateUserAvatar,
    updateUserCoverImage,
    uploadOnCLoudinary,
    getUserChannelProfile,
    getWatchHistory
    
}
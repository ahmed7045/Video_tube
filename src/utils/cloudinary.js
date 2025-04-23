import { v2 as cloudinary } from 'cloudinary';
import { response } from 'express';
import fs from "fs"
import dotenv from "dotenv"

dotenv.config()

//config coudinary
   cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME , 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
   });
 


 const uploadOnCLoudinary = async(localFilePath) => {
    try {
        // console.log("Cloudinary COnfig:",{
        //     cloud_name: process.env.CLOUDINARY_CLOUD_NAME , 
        //     api_key: process.env.CLOUDINARY_API_KEY, 
        //     api_secret: process.env.CLOUDINARY_API_SECRET
        // });
        

        if(!localFilePath) return null
        const response = await cloudinary.uploader.upload(
            localFilePath, {
                resource_type : "auto"
            }
        )
        console.log("File uploaded on cloudinary. File src : "+ response.url)
    // once the file is uploaded , we would like to delete it from our server
    fs.unlinkSync(localFilePath)
    return response
    } catch (error) {
        console.log("Error on cloudinary", error)
        fs.unlinkSync(localFilePath)
        return null
    }
 }
const deleteFromCloudinary = async (publicId) => {
    try{
        const result = await cloudinary.uploader.destroy(publicId)
        console.log("deleted from ccloudinary . public id :", publicId);
        g
    }catch(error){
        console.log("Error deleting from cloudinary", error);
        return null
        
    }
    
}

 export {uploadOnCLoudinary, deleteFromCloudinary}
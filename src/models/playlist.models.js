

import mongoose, {Schema} from "mongoose";

    const playListSchema = new Schema(
        {
            name :{
                type : string ,// cloudinary
                required : true
            } ,
            description : {
                type : string ,
                required : true
            },
         videos :{
                type : Schema.Types.ObjectId,
                ref: "Video"
            } ,
            
          Owner :{
            type: Schema.Types.ObjectId,
            ref: "User"
          }
            



        },{timestamps: true}
    )
        export const playList = mongoose.model("playList", playListSchema)
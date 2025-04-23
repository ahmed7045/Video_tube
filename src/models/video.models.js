/*id string `pk`
  owner ObjectId users
  videoFile string
  thumbnail string
  title string
  description string
  duration number
  views number
  isPublished boolean
  createdAt Date
  updatedAt Date
*/

import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

    const userSchema = new Schema(
        {
            videoFile :{
                type : string ,// cloudinary
                required : true
            } ,
         thumbnail :{
                type : string ,// cloudinary
                required : true
            } ,
            title : {
                type : string ,// cloudinary
                required : true
            },
            description : {
                type : string ,
                required : true
            },
            views : {
                type : numbers,
                default : 0
            },
         duration : {
                type : numbers,
                required : true
            },
          isPublished : {
                type : Boolean,
                default : true
            },
          Owner :{
            type: Schema.Types.ObjectId,
            ref: "User"
          }



        },{timestamps: true}
    )

    videoSchema.plugin(mongooseAggregatePaginate)
        export const Video = mongoose.model("Video", videoSchema)
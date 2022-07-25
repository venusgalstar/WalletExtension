require("dotenv").config();

module.exports = {
    url: process.env.MONGODB_URI || "mongodb://localhost:27017/iglooWallet"
    // url: "mongodb+srv://root:rootroot@cluster0.okeov.mongodb.net/pink?retryWrites=true&w=majority"
    // url: "https://data.mongodb-api.com/app/data-rfucc/endpoint/data/v1"
}

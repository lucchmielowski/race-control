import * as express from 'express'

const port = process.env.SERVER_PORT
const app = express();

app.set("port", port);

app.get("/", function(req,res) {
    res.sendFile(__dirname, "index.html")
});

export default app

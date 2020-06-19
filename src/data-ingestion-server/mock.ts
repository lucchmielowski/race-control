import * as express from "express";
import {Server as IOServer, Namespace as IONamespace} from 'socket.io';
import { setInterval } from "timers";
import { DTO } from "./src/data-ingestion/dto";
import * as httpLib from 'http'

const app: any = express();
app.set("port", process.env.PORT || 3000);
const http: any = new httpLib.Server(app);

let io: IOServer = require("socket.io")(http);

app.get("/", function(req: any, res: any): void {
    res.sendFile(__dirname, "index.html");
});

const receiver: IONamespace =
    io.of("receiver")
        .on("connection", (socket: any) => {
            console.log("a transmitter connected");
        });

const web: IONamespace =
    io.of("web")
        .on("connection", (socket: any) => {
            console.log("a user connected");
        });

http.listen(3000, function(): void {
    console.log("listening on *:3000");
});

let i = 0;
let up = true;
setInterval(() => {
    const dto = new DTO();
    dto.values.Throttle = i/100;
    dto.values.Brake = (100-i)/100;
    dto.values.SteeringWheelAngle = i;
    io.of("web").emit("telemetry_message", dto);
    if(up) {
        if(i === 100) {
            up = false;
            i -= 10;
        } else {
            i += 10;
        }
    }else {
        if(i === 0) {
            up = true;
            i += 10;
        } else {
            i -= 10;
        }
    }
}, 100);

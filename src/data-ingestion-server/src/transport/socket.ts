import * as http from 'http'
import * as socketio from 'socket.io';
import DTO from "../data-ingestion/dto";
import Timing from "../data-ingestion/timing";
import {TelemetryObj} from "../data-ingestion/telemetry";
import { TelemetryMessage } from '../types'

interface SocketServerInjector {
    http: http.Server;
    dto: DTO
    timing: Timing
}

export default class socketioServer {
    private io: socketio.Socket;
    private receiver: socketio.Namespace;
    private sessions: any[] = [];
    private dto: DTO;
    private timing: Timing;

    constructor({http, dto, timing}: SocketServerInjector) {
        this.io = socketio(http);
        this.dto = dto;
        this.timing = timing
    }

    public startReceiving() {
        this.receiver = this.io.of("receiver").on("connection", (socket) => {
            console.log("Transmitter connected")

            socket.on("telemetry", (msg: TelemetryMessage) => {
                const driverId = Number(msg.driver_id);
                let isActiveDriver = this.timing.IsActiveDriver(driverId)
                if (isActiveDriver) {
                    const data = msg.data;
                    this.io.of("web").emit("timing_message", this.timing.GetTimingObjArray(data));
                }
            });

            socket.on("session", (msg: any) => {
                const session = msg.data;
                const driverId = msg.driverId;

                // if driver is active use their sessions' data
                let activeDriver = false
                for (let i=0; i < session.data.DriverInfo.Drivers.length; i++) {
                    if (Number(driverId) === session.data.DriverInfo.Drivers[i].UserID) {
                        activeDriver = true;
                        break;
                    }
                }

                if (activeDriver) {
                    if (this.sessions !== session.data.SessionInfo.Sessions) {
                        this.sessions = session.data.SessionInfo.Sessions;
                    }
                    this.timing.SetDataFromSession(session)
                }
            });
        });
    }
}

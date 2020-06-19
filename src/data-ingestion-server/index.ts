import * as http from 'http';

import SocketIOServer from './src/transport/socket';
import DTO from './src/data-ingestion/dto';
import Timing from './src/data-ingestion/timing';
import app from './src/transport/server'

const dto = new DTO();
const timing = new Timing();

const port = process.env.SERVER_PORT;

const server = new http.Server(app);
const ioServer = new SocketIOServer({ http: server, dto, timing })
    .startReceiving();

server.listen(port, function(): void {
    console.log(`listening on *:${port}`);
});

import http from "http";
import { Server } from "socket.io";
import { EventEmitter } from "node:events";
import { TRANSFORM } from "@rayconnect/realtime/src/core/transform";
import { useRayconnectRealtimeEvent } from "@rayconnect/realtime/src/core/event";
import { RayconnectRealtimeEventSubscribtion } from "@rayconnect/types/event";
import {
  RayconnectRealtimeTransporter,
  RayconnectRealtimeTransporterPublishParam,
} from "../types/transporter";

export class RayconnectRealtimeTransporterSocketIOServerAbstract extends RayconnectRealtimeTransporter<RayconnectRealtimeTransporterSocketIOServerContext> {
  constructor(context: RayconnectRealtimeTransporterSocketIOServerContext) {
    super(context);
  }

  subscribe<NEXT_DATA = any, ERROR_DATA = any>(
    event: string,
    subscription: RayconnectRealtimeEventSubscribtion<NEXT_DATA, ERROR_DATA>
  ): void {
    if (subscription.start) subscription.start();

    this.context.event.on(event, (data) => {
      const { context, params } = data;
      const json = TRANSFORM.parse(params);
      useRayconnectRealtimeEvent(json, subscription, context);
    });
  }

  publish<DATA_TYPE = any>(
    param: RayconnectRealtimeTransporterPublishParam<DATA_TYPE>
  ): void {
    if (param.options && param.options.room) {
      this.context.io
        .to(param.options.room)
        .emit(param.event, TRANSFORM.convert(param));
    }
  }
}

export interface RayconnectRealtimeTransporterSocketIOServerContext {
  io: Server;
  event: EventEmitter;
}

export const RayconnectRealtimeTransporterSocketIOServer = (
  config: RayconnectRealtimeTransporterSocketIOServerConfig
) => {
  const server = http.createServer();

  class SocketIOEmitter extends EventEmitter {}

  server.listen(config.port, config.host);

  const io = new Server(server);
  const events = new SocketIOEmitter();

  io.on("connection", (socket) => {
    console.log("connect");

    socket.onAny((event, data) => {
      events.emit(event, {
        context: socket,
        params: data,
      });
    });
  });

  return new RayconnectRealtimeTransporterSocketIOServerAbstract({
    io,
    event: events,
  });
};

export interface RayconnectRealtimeTransporterSocketIOServerConfig {
  port: number;
  host: string;
}

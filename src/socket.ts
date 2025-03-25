import { Server,Socket } from "socket.io";

interface CustomSocket extends Socket{
  room?:string;
}

export function setupSocket(io:Server){

  io.use((socket:CustomSocket,next)=>{
    const room = socket.handshake.auth.room || socket.handshake.headers.room;
    if(!room){
      return next(new Error("Invalid Room"));
    }
    socket.room = room;
    next();
  })

  io.on("connection",(socket:CustomSocket)=>{
    // join the room
    socket.join(socket.room!);
    
    socket.on("MESSAGE",(data)=>{
      console.log("server side message: " ,data);
      io.to(socket.room!).emit("MESSAGE",data);
    })
    socket.on("disconnect",()=>{
      console.log("a user disconnected : ",socket.id);
    });

  });


}
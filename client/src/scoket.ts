
import {io} from "socket.io-client"

const Url = "http://localhost:5000"

export const socket = io(Url,{
    autoConnect:false,
})
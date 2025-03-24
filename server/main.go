package main

import (
	"fmt"
	"net/http"
	"server/roomManager"
	"server/socketServer"

	"golang.org/x/net/websocket"
)


func main() {
	rm := roomManager.NewRoomManager()

	myServer := socketServer.NewServer(rm,rm.OnMessage,rm.OnClose)
	
	http.Handle("/ws",websocket.Handler(myServer.HandleWebSocketConnection))
	fmt.Println("Server listening on 8080")
	http.ListenAndServe("0.0.0.0:8080",nil)
}
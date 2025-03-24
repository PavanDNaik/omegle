package room

import (
	"fmt"

	"golang.org/x/net/websocket"
)

type Room struct {
	Client1 *websocket.Conn
	Client2 *websocket.Conn
	status string
}

func CreateRoom(ws1 *websocket.Conn,ws2 *websocket.Conn) Room{
	return Room{
		Client1: ws1,
		Client2: ws2,
		status: "ROOM_CREATED",
	}
}

func(r *Room) Init(){
	if(r.Client1 != nil && r.Client2 != nil){
		r.Client1.Write([]byte ("found room 1"))
		r.Client2.Write([]byte ("found room 0"))
	}else{
		fmt.Println("Unexpected Room with 1 or 0 clients")
	}
}

func(r *Room) CloseWithIgnore(ws *websocket.Conn){
	if ws != r.Client1 {
		r.Client1.Write([]byte ("room closed"))
	}else{
		r.Client2.Write([]byte ("room closed"))
	}
}


func(r *Room) Close(){
	r.Client1.Write([]byte ("room closed"))
	r.Client2.Write([]byte ("room closed"))
}


func(r *Room) HandleMessage(ws1 *websocket.Conn, msg string){
	if(r.Client1==ws1){
		// fmt.Println("Sending Client 1");
		r.Client2.Write([]byte (msg))
		}else{
		// fmt.Println("Sending Client 2");
		r.Client1.Write([]byte (msg))
	}
}

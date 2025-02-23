package roomManager

import (
	"fmt"
	"server/room"
	"strings"
	"sync"

	"golang.org/x/net/websocket"
)



type RoomManager struct {
	wsToRoom map[*websocket.Conn]room.Room
	waiting map[*websocket.Conn]bool
	mutex sync.Mutex
}

func(rm *RoomManager) isInRoom(ws *websocket.Conn) ( room.Room,bool) {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()
	room,ok := rm.wsToRoom[ws]

	return room,ok
}

func(rm *RoomManager) OnMessage(ws *websocket.Conn,msg []byte){
	message := string(msg)

	if strings.HasPrefix(message,"RTC"){
		existingRoom,ok := rm.isInRoom(ws)

		if ok {
			existingRoom.HandleMessage(ws,message)
		}else {
			rm.waiting[ws] = false
			ws.Write([]byte ("room closed"))
		}

	}else{
		switch message{
			case "new":rm.findMatch(ws)
			default: fmt.Println(message)
		}
	}

}

func(rm *RoomManager) findMatch(requestedClient *websocket.Conn){
	
	existingRoom, ok := rm.isInRoom(requestedClient)

	if ok {
		go existingRoom.Close()
		rm.clean(&existingRoom)
	}else{
		rm.mutex.Lock()
		defer rm.mutex.Unlock()

		var waitingClient *websocket.Conn

		for k,v := range rm.waiting {
			if v {
				waitingClient = k
				break
			}
		}

		if waitingClient == nil {
			rm.waiting[requestedClient] = true
		} else {
			newRoom := room.CreateRoom(requestedClient,waitingClient)

			rm.waiting[waitingClient] = false
			rm.waiting[requestedClient] = false

			rm.wsToRoom[requestedClient] = newRoom
			rm.wsToRoom[waitingClient] = newRoom

			// init webrtc
			newRoom.Init()
		}
		
	}

}

func(rm *RoomManager) clean(room *room.Room){

	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	delete(rm.wsToRoom,room.Client1)
	delete(rm.wsToRoom,room.Client2)

	rm.waiting[room.Client1] = true
	rm.waiting[room.Client2] = true

}

func(rm *RoomManager) OnClose(ws *websocket.Conn,err error){
	// disconnect logic
	existingRoom, ok := rm.isInRoom(ws)
	if ok {
		go existingRoom.CloseWithIgnore(ws)
		rm.clean(&existingRoom)
	}
	
}

func NewRoomManager() *RoomManager{
	var rm *RoomManager =  &RoomManager{
		waiting: make(map[*websocket.Conn]bool),
		wsToRoom: make(map[*websocket.Conn]room.Room),
	}

	return rm
}
package roomManager

import (
	"fmt"
	"math/rand/v2"
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
	room,ok := rm.wsToRoom[ws]
	rm.mutex.Unlock()

	return room,ok
}

func(rm *RoomManager) OnMessage(ws *websocket.Conn,msg []byte){
	message := string(msg)

	if strings.HasPrefix(message,"RTC_"){
		existingRoom,ok := rm.isInRoom(ws)

		if ok {
			existingRoom.HandleMessage(ws,message)
		} else {
			rm.mutex.Lock()
			rm.waiting[ws] = false
			rm.mutex.Unlock()
			ws.Write([]byte ("room closed"))
		}

	}else{
		switch message{
			case "new":rm.findMatch(ws)
			default: {
				fmt.Println("Unknown message")
				// fmt.Println(message)
			}
		}
	}

}

func(rm *RoomManager) findMatch(requestedClient *websocket.Conn){
	
	existingRoom, ok := rm.isInRoom(requestedClient)
	var prevRoommate *websocket.Conn;

	if ok {
		if(existingRoom.Client1==requestedClient){
			prevRoommate = existingRoom.Client2
		}else{
			prevRoommate = existingRoom.Client1
		}
	
		existingRoom.Close()
		rm.clean(&existingRoom)
	}

	
	someWaitingClients := make([]*websocket.Conn,0)
	count := 0
	
	rm.mutex.Lock()
	
	for k,v := range rm.waiting {
		
		if (v && k != prevRoommate && k != requestedClient) {
			someWaitingClients = append(someWaitingClients, k)
			count++
		}
		
		if(count==100){
			break;
		}
	}
	
	// fmt.Println(count)

	if count==0 {
		rm.waiting[requestedClient] = true
		requestedClient.Write([]byte ("Waiting.."))
	} else {
		waitingClient := someWaitingClients[rand.IntN(count)]
		// fmt.Println(waitingClient)
		// fmt.Println(someWaitingClients)
		newRoom := room.CreateRoom(requestedClient,waitingClient)

		rm.waiting[waitingClient] = false
		rm.waiting[requestedClient] = false

		rm.wsToRoom[requestedClient] = newRoom
		rm.wsToRoom[waitingClient] = newRoom

		// init webrtc
		newRoom.Init()
	}
		
	rm.mutex.Unlock()

}

func(rm *RoomManager) clean(room *room.Room){

	rm.mutex.Lock()
	

	delete(rm.wsToRoom,room.Client1)
	delete(rm.wsToRoom,room.Client2)

	rm.waiting[room.Client1] = true
	rm.waiting[room.Client2] = true

	rm.mutex.Unlock()
}

func(rm *RoomManager) OnClose(ws *websocket.Conn,err error){
	// disconnect logic
	existingRoom, ok := rm.isInRoom(ws)
	if ok {
		rm.clean(&existingRoom)
		existingRoom.CloseWithIgnore(ws)
	}

	rm.mutex.Lock()
	delete(rm.waiting,ws);
	delete(rm.wsToRoom,ws);
	rm.mutex.Unlock()
	
}

func NewRoomManager() *RoomManager{
	var rm *RoomManager =  &RoomManager{
		waiting: make(map[*websocket.Conn]bool),
		wsToRoom: make(map[*websocket.Conn]room.Room),
	}

	return rm
}
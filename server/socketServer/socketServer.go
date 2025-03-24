package socketServer

import (
	"fmt"
	"io"
	"server/roomManager"
	"sync"

	"golang.org/x/net/websocket"
)

type Server struct{
	conns map[*websocket.Conn]bool
	mutex sync.Mutex
	onMessage func(ws *websocket.Conn,msg []byte)
	onClose func(ws *websocket.Conn,err error)
}


func (s *Server) HandleWebSocketConnection(ws *websocket.Conn){
	fmt.Println("New Connection")
	s.conns[ws] = true
	s.readLoop(ws)
}


func (s *Server) readLoop(ws *websocket.Conn) {
	var msg []byte

	buf := make([]byte,4096)
	for {
		// fmt.Println("Waiting to read from WebSocket...");
		n, err := ws.Read(buf)

		if err != nil {

			if err == io.EOF {
				if s.onClose != nil {
					s.onClose(ws,err)
				}else{
					fmt.Println("Disconnected",err)
				}
				break
			}

			if s.onClose != nil {
				s.onClose(ws,err)
			}else{
				fmt.Println("read Error",err)
			}

			break
		}

		s.mutex.Lock()
		msg = append(msg, buf[:n]...)
		s.mutex.Unlock()

		// fmt.Println(n)

		if(n<4088){
			// fmt.Println(string(msg));
			if(s.onMessage != nil){
				s.onMessage(ws,msg)
			}else{
				fmt.Println("No Message handler! found a message :")
				fmt.Println(string(msg));
			}
			msg = msg[:0]
		}

	}
}

func NewServer(rm *roomManager.RoomManager,onMessage func(ws *websocket.Conn,msg []byte),onClose func(ws *websocket.Conn,err error)) *Server{
	return &Server{
		conns: make(map[*websocket.Conn]bool),
		onMessage: onMessage,
		onClose: onClose,
	}
}

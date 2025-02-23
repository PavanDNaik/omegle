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
	// fmt.Print("New Connection",ws.RemoteAddr())
	s.conns[ws] = true
	s.readLoop(ws)
}


func (s *Server) readLoop(ws *websocket.Conn) {

	buf := make([]byte,2048)

	for {
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
		msg := buf[:n]
		s.mutex.Unlock()

		if(s.onMessage != nil){
			s.onMessage(ws,msg)
		}else{
			fmt.Println("No Message handler! found a message :")
			fmt.Println(string(msg));
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

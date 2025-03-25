package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"server/roomManager"
	"server/socketServer"

	"github.com/robfig/cron"
	"golang.org/x/net/websocket"
)

// onyl for render
func aliveHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("alive"))
}

func cronJob(){
	if (os.Getenv("KEEP_ME_ALIVE")=="YES"){
		// set up cron of 14 min
		c := cron.New()

		c.AddFunc("@every 14m", func() {
			fmt.Println("Every 14min request");
			resp,err := http.Get(os.Getenv("SERVER_URL")+"/alive")

			if err != nil {
				fmt.Println("Error making request:", err)
				return
			}
			defer resp.Body.Close()
		
			body, err := io.ReadAll(resp.Body)

			if err != nil {
				fmt.Println("Error reading response:", err)
				return
			}
		
			fmt.Println("Response from /alive:", string(body))
		})

		c.Start()
	}
}

func main() {
	rm := roomManager.NewRoomManager()

	myServer := socketServer.NewServer(rm,rm.OnMessage,rm.OnClose)
	http.Handle("/ws",websocket.Handler(myServer.HandleWebSocketConnection))
	http.HandleFunc("/alive", aliveHandler)
	
	cronJob()
	
	fmt.Println("Server listening on 8080")
	http.ListenAndServe("0.0.0.0:8080",nil)
}
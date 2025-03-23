import React, { useCallback, useEffect, useRef, useState } from 'react'


function Cam() {
    const query = new URLSearchParams(window.location.search);
    const userName = query.get('name');

    const socketRef = useRef();
    const peerConnection = useRef();

    const [isConnected,setConnected] = useState(false);
    const [initiator ,setInitiator ] = useState(false);

    const localStream = useRef();
    const remoteStream = useRef();
    const localVideo = useRef();
    const remoteVideo = useRef();

    async function initiatUserMedia(){
        const mediaStream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
        localStream.current = mediaStream;
        localVideo.current.srcObject = mediaStream;
    }
    
    useEffect(()=>{
        let conn;
        initiatUserMedia().then(()=>{
            conn = new WebSocket("ws://localhost:8080/ws");
            socketRef.current = conn;
    
            conn.onopen = (e)=>{
                setConnected(true);
                setTimeout(() => {
                    conn.send("new");
                }, 2000);
            };
    
            conn.onmessage = async (e)=>{
                console.log(e.data);
                switch(e.data){
                    case "found room 1":{
                        setInitiator(true);
                        const pConn = await createPeerConnection();
                        await createOffer(pConn);
                        break;
                    }
                    case "found room 0":{
                        setInitiator(false);
                        const pConn = await createPeerConnection();
                        break;
                    }
                    default:{
                        if(e.data.startsWith("RTC_ICE_")){
                            // console.log(e.data.split("RTC_ICE_"))
                            console.log(e.data.split("RTC_ICE_")[1])
                            console.log(e.data.split("RTC_ICE_")[0])
                            if(peerConnection.current){
                                peerConnection.current.addIceCandidate(JSON.parse(e.data.split("RTC_ICE_")[1]));
                            }
                        }else if(e.data.startsWith("RTC_OFFER_")){
                            peerConnection.current.setRemoteDescription(JSON.parse(e.data.split("RTC_OFFER_")[1]));
                            // localStream.current.getTracks().forEach(track => {
                            //     peerConnection.current.addTrack(track,localStream.current);
                            // });
                            await createAnswer(peerConnection.current);
                        }else if(e.data.startsWith("RTC_ANSWER_")){
                            if(peerConnection.current){
                                peerConnection.current.setRemoteDescription(JSON.parse(e.data.split("RTC_ANSWER_")[1]));
                            }else{
                                console.log("PEER connection not avaialable!");
                            }
                        }
                    }
                }
            };

        })



        return ()=>{
            if(conn.OPEN){
                conn.close();
            }
        }
    },[])

    async function createPeerConnection() {
        const pConn = new RTCPeerConnection({
            iceServers:[
                {
                    urls:[
                        "stun:stun.l.google.com:19302",
                        "stun:stun1.l.google.com:19302"
                    ]
                }
            ]
        });

        pConn.addEventListener("signalingstatechange",(e)=>{
            console.log("signalingstatechange",e);
        });

        pConn.addEventListener("icecandidate",(e)=>{
            console.log("send it to server ICE",e);
            if(e.candidate){
                socketRef.current.send("RTC_ICE_"+JSON.stringify(e.candidate));
            }
        });
        
        pConn.addEventListener("track",e=>{
            console.log("track from pconn",e);
            e.streams[0].getTracks().forEach(track=>{
                remoteStream.current.addTrack(track);
            })
        });
        
        peerConnection.current = pConn;
        
        const tempRemoteMediaStream = new MediaStream();
        remoteStream.current = tempRemoteMediaStream;
        remoteVideo.current.srcObject = tempRemoteMediaStream;
        localStream.current.getTracks().forEach(track => {
            peerConnection.current.addTrack(track,localStream.current);
        });

        return pConn;
    }
    
    const createOffer = async (pConn) => {
    
        if (!socketRef.current) {
            console.error("Socket is not initialized yet.");
            return;
        }
    
        if (pConn) {
            console.log("Creating offer...");
            const offerObj = await pConn.createOffer({});
            await pConn.setLocalDescription(offerObj);
            socketRef.current.send("RTC_OFFER_" + JSON.stringify(offerObj));
        }
    };
    
    const createAnswer = async (pConn) => {
    
        if (!socketRef.current) {
            console.error("Socket is not initialized yet.");
            return;
        }
    
        if (pConn) {
            console.log("Creating answer...");
            const offerObj = await pConn.createAnswer({});
            await pConn.setLocalDescription(offerObj);
            socketRef.current.send("RTC_ANSWER_" + JSON.stringify(offerObj));
        }
    };

  return (
    <div>
        <div>Welcome </div>
        <div>
            <video ref={localVideo} autoPlay playsInline></video>
        </div>
        <div>
            <video ref={remoteVideo} autoPlay playsInline></video>
        </div>
    </div>
  )
}

export default Cam
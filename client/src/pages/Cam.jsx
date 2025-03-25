import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom';
// import.meta.env.VIT
const SOCKET_URL = import.meta.env.VITE_APP_SOCKET_BASE_URL
function Cam() {
    const query = new URLSearchParams(window.location.search);
    const userName = query.get('name');
    const navigate = useNavigate();
    const socketRef = useRef();
    const peerConnection = useRef();

    const [isConnected,setConnected] = useState(false);
    const [initiator ,setInitiator ] = useState(false);
    const [audio,setAudio] = useState(true);
    const [video,setVideo] = useState(true);
    const [remoteUserName,setRemoteUserName] = useState("WAITING...");

    const localStream = useRef();
    const remoteStream = useRef();
    const localVideo = useRef();
    const remoteVideo = useRef();

    const peerState = useRef(0);
    const myICE = useRef([]);

    async function initiatUserMedia(){
        const mediaStream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
        localStream.current = mediaStream;
        localVideo.current.srcObject = mediaStream;
    }
    
    useEffect(()=>{
        if(!userName || userName.length<3 || userName.length>20){
            navigate("/");
        }
        
        let conn;
        initiatUserMedia().then(()=>{
            conn = new WebSocket(`${SOCKET_URL}/ws`);
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
                        socketRef.current.send(`RTC_NAME_${userName}`);
                        break;
                    }
                    case "found room 0":{
                        setInitiator(false);
                        const pConn = await createPeerConnection();
                        socketRef.current.send(`RTC_NAME_${userName}`);
                        break;
                    }
                    case "room closed":{
                        peerState.current = 0;
                        myICE.current = [];
                        if(peerConnection.current){
                            peerConnection.current.close();
                            peerConnection.current = null;
                        }
                        setRemoteUserName("WAITING...");
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
                            peerState.current = 1;
                            setTimeout(()=>{
                                for(const ice of myICE.current){
                                    socketRef.current.send(ice);
                                }
                            },2000);
                        }else if(e.data.startsWith("RTC_ANSWER_")){
                            if(peerConnection.current){
                                peerConnection.current.setRemoteDescription(JSON.parse(e.data.split("RTC_ANSWER_")[1]));
                                peerState.current = 1;
                                for(const ice of myICE.current){
                                    socketRef.current.send(ice);
                                }
                            }else{
                                console.log("PEER connection not avaialable!");
                            }
                        }else if(e.data.startsWith("RTC_NAME_")){
                            setRemoteUserName(e.data.split("RTC_NAME_")[1]);
                        }
                    }
                }
            };

        })



        return ()=>{
            if(conn.OPEN){

                if(peerConnection.current){
                    peerConnection.current.close();
                }

                if(socketRef.current){
                    socketRef.current.close()
                }

                peerConnection.current = null;
                socketRef.current = null;
            }
            
            peerState.current = 0;
            myICE.current = [];
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
                },
                { 
                    urls:[ import.meta.env.VITE_APP_TURN_SERVER_URL], 
                    username: import.meta.env.VITE_APP_TURN_SERVER_USER_NAME, 
                    credential: import.meta.env.VITE_APP_TURN_SERVER_USER_CRED
                }
            ]
        });

        pConn.addEventListener("signalingstatechange",(e)=>{
            console.log("signalingstatechange",e);
        });

        pConn.addEventListener("icecandidate",(e)=>{
            console.log("send it to server ICE",e);
            if(e.candidate){
                if(peerState.current>0){
                    socketRef.current.send("RTC_ICE_"+JSON.stringify(e.candidate));
                }else{
                    myICE.current.push("RTC_ICE_"+JSON.stringify(e.candidate));
                }
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
            if(peerConnection.current){
                peerConnection.current.addTrack(track,localStream.current); 
            }
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
    <div className='container'>
        <div className='remote-user-name'>{remoteUserName}</div>
        <div className='video-cover'>
            <div className='local-video-container'>
                <video ref={localVideo} autoPlay playsInline className='local-video' muted="true"></video>
            </div>
            <div className='remote-video-container'>
                <video ref={remoteVideo} autoPlay playsInline className='remote-video'> </video>
            </div>
        </div>
        <div className='Button cover'>
            <div className='mut-unmute'>
                    <button onClick={()=>{
                        if(localStream.current){
                            localStream.current.getAudioTracks()[0].enabled = !(localStream.current.getAudioTracks()[0].enabled);
                            setAudio(!audio);
                        }
                    }}>
                        {audio?"Mute Audio":"Start Audio"}
                        </button>

                    <button onClick={()=>{
                        if(localStream.current){
                            localStream.current.getVideoTracks()[0].enabled = !(localStream.current.getVideoTracks()[0].enabled);
                            setVideo(!video);
                        }
                    }}>
                        {video?"Mute video":"Start video"}
                    </button>

            </div>
            <button className='next-button' onClick={(e)=>{
                if(socketRef.current){
                    socketRef.current.send("new");
                }
            }}>New</button>
        </div>
    </div>
  )
}

export default Cam
import React, { useState } from 'react'
import { useNavigate } from "react-router";

function Entry() {
    const [name, setName] = useState("")
    const navigate = useNavigate();
  
    return (
      <div>
        <input type="text" onChange={(e)=>{
          setName(e.target.value);
        }}/>
  
        <button onClick={(e)=>{
          if(name){
            navigate(`/cam?name=${name}`)
          }
        }}>Start</button>
  
      </div>
    )
}

export default Entry
import React, { useState } from 'react';
import { useNavigate } from "react-router";

function Entry() {
    const [name, setName] = useState("");
    const navigate = useNavigate();
  
    return (
      <div className="entry-container">
        <h1 className="title">Omegle Clone</h1>

        <input 
          type="text" 
          className="name-input"
          placeholder="Enter your name... (min 3 char)"
          onChange={(e) => setName(e.target.value)}
        />

        <button 
          className="start-button"
          onClick={() => {
            if (name && name.length>3 && name.length<20) {
              navigate(`/cam?name=${name}`);
            }
          }}
        >
          Start
        </button>
      </div>
    );
}

export default Entry;

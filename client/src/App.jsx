import { useState, useEffect } from 'react'
import api from './services/api'

function App() {

  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/")
      .then((response) => {
        setMessage(response.data.message);
      })
      .catch((error) => {
        console.error("Error fetching message:", error);
      });
  }, []);

  return (
    <>
      <h1>{message}</h1>
    </>
  )
}

export default App

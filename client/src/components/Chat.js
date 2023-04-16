import styles from '../pages/Room/Room.module.css';
import menos from '../assets/menos.png'
import pointer from '../assets/pointer.png'
import React, { useState, useEffect, useRef, useContext } from 'react';
import { SocketContext } from '../context/Socket';
import { toast } from 'react-hot-toast';


function ChatClient() {

    const socket = useContext(SocketContext)

    const [isActive, setActive] = useState("false");
    const [messageList, setMessageList] = useState([]);
    const messageRef = useRef();
    const bottomRef = useRef();


    const handleToggle = () => {
        setActive(!isActive);
    };

    function handleKeyDown(event) {
        if (event.keyCode === 13) { // código da tecla Enter é 13
            handleSubmit();
        }
    }

    const handleSubmit = () => {
        const message = messageRef.current.value;
        if (!message.trim()) return;

        socket.emit('message', message);
        clearInput()
        focusInput()
    }

    const clearInput = () => {
        messageRef.current.value = "";
    }

    const focusInput = () => {
        messageRef.current.focus();
    }

    const autoScroll = () => {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }

    const userMsg = (msg) => {
        toast(msg, {
            icon: 'ℹ',
        })
        console.log("CHAT: ", msg)
    }

    useEffect(() => {
        autoScroll()
    }, [messageList]);

    useEffect(() => {

        socket.on('responseMessage', data => {
            setMessageList((current) => [...current, data])
        })

        socket.on('userLeaveMsg', userMsg)

        socket.on('userJoinedMsg', userMsg)
        //Parece que o socket entra aqui duas vezes pois o socket é sofre alguma modificação que faz ele entrar aqui talvez

        //libera os listeners para que não aconteça de ser acionado mais de uma vez, informaçao duplicada
        return () => {
            socket.off('responseMessage')
            socket.off('userJoinedMsg', userMsg)
            socket.off('userLeaveMsg', userMsg)
        }
    }, [socket]);

    return (
        <div className={styles.chat}>
            <div className={styles.chatHeader} onClick={handleToggle}>
                <h3>Chat</h3>
                <img src={menos} alt="close" />
            </div>
            <div className={`${styles.chatBody} ${isActive ? styles.hide : ""}`}>
                {
                    messageList.map((message, index) => (
                        <div className={`${styles["messageContainer"]} ${message.id === socket.id && styles["myMessage"]}`} key={index}>
                            <div className={styles.messageAuthor}><strong>{message.username}</strong></div>
                            <div>{message.text}</div>
                            <div className={styles.messageTimestamp}>{message.timestamp}</div>
                        </div>
                    ))
                }
                <div ref={bottomRef} />
            </div>
            <div className={`${styles.chatContainerInput} ${isActive ? styles.hide : ""}`}>
                <div className={styles.chatInput}>
                    <input type="text" ref={messageRef} placeholder="Send a message" onKeyDown={handleKeyDown}></input>
                    <button onClick={handleSubmit} >

                        <img src={pointer} alt="send" />

                    </button>
                </div>
            </div>
        </div>
    )
}

export default ChatClient;
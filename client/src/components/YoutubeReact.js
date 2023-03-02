import React, { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import socketIOClient from "socket.io-client"

const SYNCPLAYER_ENDPOINT = "http://localhost:4001/sync-player"

//pre-definições do player
const opts = {
    height: '585',
    width: '100%',
    playerVars: {
        autoplay: 0,
    },
};

function YoutubeReact({ url }) {
    // variaveis para o gerenciamento do estado do player
    const [playing, setPlaying] = useState(false)
    const [prevPlaying, setPrevPlaying] = useState(false)

    const [seeked, setSeeked] = useState(0)
    const [isSeeked, setIsSeeked] = useState(true)

    const [sequence, setSequence] = useState([])
    const [timer, setTimer] = useState(null)
    const playerRef = useRef(null)



    // Variaveis para gerenciamento do estado da conexao socket
    const [socket, setSocket] = useState(null)
    const [connected, setConnected] = useState(false)

    const onPlayerStateChange = (event) => handleEvent(event.data)

    const handleEvent = type => {
        setSequence([...sequence, type])

        if (type === 1 && isSubArrayEnd(sequence, [2, 3])) {

            console.log("seekTo mouse")
            handleSeek() //Mouse seek
            setSequence([])
        } else if (type === 1 && isSubArrayEnd(sequence, [3])) {
            console.log("seekTo arrow")
            handleSeek() //arrow seek
            setSequence([])
        } else {
            clearTimeout(timer) // cancela os eventos anteriores
            if (type !== 3) {
                let timeout = setTimeout(() => {
                    if (type === 1) { // PLAY
                        //console.log("entrou event play")
                        setPrevPlaying(false)
                        handlePlay()
                    }
                    else if (type === 2) { // PAUSE
                        //console.log("entrou event pause")
                        setPrevPlaying(true)
                        handlePause()
                    }
                    setSequence([])
                }, 250);
                setTimer(timeout)
            }
        }
    }

    // Vai checar se B é SubArray de A e se encontra no fim de A.
    // eventos de "seek" acionam 2 tipos de sequencias diferentes
    // 1. O mouse seek aciona eventos pausa, buffer, play (2, 3, 1), nessa ordem.
    // 2. Arrow seek aciona eventos buffer, play (3, 1), nessa ordem.
    // esse metodo vai checar se ocorre essa sequencia
    const isSubArrayEnd = (A, B) => {
        if (A.length < B.length)
            return false;
        let i = 0;
        while (i < B.length) {
            if (A[A.length - i - 1] !== B[B.length - i - 1])
                return false;
            i++;
        }
        return true;
    };

    //funcao que recebe um tempo em segundo e busca no video
    const handleSeekTo = (seconds) => {
        setIsSeeked(false)
        playerRef.current.seekTo(seconds)

    }

    const handlePlay = () => {

        setSeeked(playerRef.current.getCurrentTime())
        setPlaying(true)
        console.log("Play!")
        playerRef.current.playVideo()
        
    }

    const handlePause = () => {
        setSeeked(playerRef.current.getCurrentTime())
        setPlaying(false)
        console.log("Pause!")
        playerRef.current.pauseVideo()
    }

    const handleBuffer = () => { console.log("Buffer!") }
    const handleSeek = () => {
        
        setSeeked(playerRef.current.getCurrentTime())
        
        if (socket && isSeeked) {
            console.log("Seek!")
            console.log("current Time: ", seeked)
            console.log("Emitindo seekSync, client: ", socket.id)
            socket.emit("seekSync", { "play": playing, "seek": playerRef.current.getCurrentTime(), "client": socket.id })
            
        }else{
            console.log("seekTo: ", seeked)
        }
        
        setIsSeeked(true)

    }

    // quando o player estiver pronto o objeto event daquele player é vinculado ao playerRef
    // com isso podemos usar as funçoes do event.target sem precisar se limitar
    // ao eventos disponibilizado
    const handlePlayerOnReady = (event) => {
        playerRef.current = event.target
        console.log("onReady\n", playerRef.current)
        //console.log("current time", playerRef.current.getCurrentTime())
    }

    // Cria o socket uma vez quando o componente é montado
    useEffect(() => {
        const newSocket = socketIOClient(SYNCPLAYER_ENDPOINT);

        newSocket.on('connect', () => {
            console.log("Client: Connect!")
            setConnected(true)
        })

        newSocket.on('disconnect', () => {
            console.log("Client: Disconnect")
            setConnected(false)
        })

        setSocket(newSocket);

        // Retorna uma função de limpeza que desconecta o socket quando o componente é desmontado
        return () => {
            newSocket.disconnect();
            setSocket(null);
            setConnected(false);
        };
    }, []);

    // Usa o socket criado anteriormente para enviar
    useEffect(() => {

        
        if (socket && prevPlaying !== playing) {
            console.log("Emitindo playPauseSync, client: ", socket.id)
            socket.emit("playPauseSync", { "play": playing, "seek": seeked, "client": socket.id });

        } 
    }, [playing, socket]);

    // Usa o socket criado anteriormente para receber mensagens
    useEffect(() => {

        if (socket) {
            socket.on('responsePlayPauseSync', (data) => {
                
                if (data["play"] === true) {
                    setPrevPlaying(true)
                    handlePlay()
                    handleSeekTo(data["seek"])

                } else if (data["play"] === false) {
                    setPrevPlaying(false)
                    handlePause()
                    handleSeekTo(data["seek"])
                }
                

            });

            socket.on('responseSeekSync', (data) => {
                console.log("SeekSync Resposta: ", data["seek"])

                handleSeekTo(data["seek"])
            })

        }
    }, [socket]);



    return (
        <YouTube
            videoId={url}
            ref={playerRef}
            opts={opts}
            onReady={handlePlayerOnReady}
            onStateChange={onPlayerStateChange}
        />
    );
}

export default YoutubeReact